import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";

const root = process.cwd();
const gameWidth = 430;
const gameHeight = 844;
const artifactDir = path.join(root, "artifacts");
const secondsPerFishMonth = 60 * 60;
const secondsPerFishYear = secondsPerFishMonth * 12;
const fourMonthAgeSeconds = secondsPerFishMonth * 4;
const goldfishAdultAgeSeconds = secondsPerFishYear;
const fullyGrownAgeSeconds = secondsPerFishYear * 50;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") {
          resolve(address.port);
        } else {
          reject(new Error("Could not allocate a local port."));
        }
      });
    });
  });
}

async function waitForHttp(url, timeoutMs = 10000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response;
      }
    } catch {
      // Server is still coming up.
    }

    await delay(100);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function findChrome() {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
  ].filter(Boolean);

  const chrome = candidates.find((candidate) => existsSync(candidate));
  if (!chrome) {
    throw new Error("Could not find Chrome. Set CHROME_BIN to a Chromium-compatible browser.");
  }

  return chrome;
}

class CdpClient {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();

    ws.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);

      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);

        if (message.error) {
          reject(new Error(message.error.message));
        } else {
          resolve(message.result);
        }

        return;
      }

      const listeners = this.listeners.get(message.method) ?? [];
      for (const listener of listeners) {
        listener(message.params);
      }
    });
  }

  send(method, params = {}) {
    const id = this.nextId;
    this.nextId += 1;
    this.ws.send(JSON.stringify({ id, method, params }));

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }

  once(method, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timed out waiting for ${method}`));
      }, timeoutMs);

      const listener = (params) => {
        clearTimeout(timer);
        const listeners = this.listeners.get(method) ?? [];
        this.listeners.set(
          method,
          listeners.filter((candidate) => candidate !== listener)
        );
        resolve(params);
      };

      const listeners = this.listeners.get(method) ?? [];
      this.listeners.set(method, [...listeners, listener]);
    });
  }
}

async function connectToChrome(debugPort) {
  await waitForHttp(`http://127.0.0.1:${debugPort}/json/version`);
  const targets = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((response) =>
    response.json()
  );
  const pageTarget = targets.find((target) => target.type === "page");
  assert(pageTarget?.webSocketDebuggerUrl, "Chrome did not expose a page target.");

  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  return new CdpClient(ws);
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });

  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text);
  }

  return result.result.value;
}

async function snapshot(cdp) {
  return JSON.parse(await evaluate(cdp, "JSON.stringify(window.__aquariumTest.getSnapshot())"));
}

async function waitFor(cdp, predicate, message, timeoutMs = 5000) {
  const startedAt = Date.now();
  let lastState;

  while (Date.now() - startedAt < timeoutMs) {
    const current = await snapshot(cdp);
    lastState = current;
    if (predicate(current)) {
      return current;
    }

    await delay(100);
  }

  throw new Error(`${message} Last state: ${JSON.stringify({
    activeScreen: lastState?.activeScreen,
    fishCount: lastState?.fishCount,
    coinDropCount: lastState?.coinDropCount,
    tankLevel: lastState?.tankLevel,
    tankViewScale: lastState?.tankViewScale,
    foodCount: lastState?.foodCount,
    foodInventoryByType: lastState?.foodInventoryByType,
    helperCreatures: lastState?.helperCreatures,
    foods: lastState?.foods,
    fish: lastState?.fish?.map((fish) => ({
      typeId: fish.typeId,
      state: fish.state,
      hunger: Math.round(fish.hunger),
      health: Math.round(fish.health),
      fatalCareSeconds: Math.round(fish.fatalCareSeconds ?? 0),
      x: Math.round(fish.x),
      y: Math.round(fish.y),
      nextCoinDropInMs: Math.round(fish.nextCoinDropInMs)
    }))
  })}`);
}

async function waitForTestHook(cdp, timeoutMs = 10000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const isReady = await evaluate(cdp, "Boolean(window.__aquariumTest)").catch(() => false);
    if (isReady) {
      return;
    }

    await delay(100);
  }

  throw new Error("Aquarium test hook did not become available.");
}

async function canvasPoint(cdp, gameX, gameY) {
  const rect = await evaluate(
    cdp,
    `(() => {
      const canvas = document.querySelector("canvas");
      const rect = canvas.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    })()`
  );

  return {
    x: rect.left + (gameX / gameWidth) * rect.width,
    y: rect.top + (gameY / gameHeight) * rect.height
  };
}

async function clickGame(cdp, gameX, gameY) {
  const point = await canvasPoint(cdp, gameX, gameY);
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    button: "left",
    buttons: 1,
    clickCount: 1,
    x: point.x,
    y: point.y
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    button: "left",
    buttons: 0,
    clickCount: 1,
    x: point.x,
    y: point.y
  });
  await delay(80);
}

async function dragGame(cdp, fromGameX, fromGameY, toGameX, toGameY) {
  const from = await canvasPoint(cdp, fromGameX, fromGameY);
  const to = await canvasPoint(cdp, toGameX, toGameY);
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseMoved",
    x: from.x,
    y: from.y
  });
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    button: "left",
    buttons: 1,
    clickCount: 1,
    x: from.x,
    y: from.y
  });

  const steps = 10;
  for (let step = 1; step <= steps; step += 1) {
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      buttons: 1,
      x: from.x + ((to.x - from.x) * step) / steps,
      y: from.y + ((to.y - from.y) * step) / steps
    });
    await delay(20);
  }

  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    button: "left",
    buttons: 0,
    clickCount: 1,
    x: to.x,
    y: to.y
  });
  await delay(120);
}

async function reloadApp(cdp, url) {
  const loadEvent = cdp.once("Page.loadEventFired").catch(() => undefined);
  await cdp.send("Page.navigate", { url });
  await loadEvent;
  await waitForTestHook(cdp);
  await delay(250);
}

async function captureNamedScreenshot(cdp, fileName) {
  await mkdir(artifactDir, { recursive: true });
  const screenshot = await cdp.send("Page.captureScreenshot", { format: "png" });
  await writeFile(path.join(artifactDir, fileName), Buffer.from(screenshot.data, "base64"));
  return path.join("artifacts", fileName);
}

async function runRegression(cdp, appUrl) {
  await waitFor(
    cdp,
    (state) => state.wallet.common === 120 && state.wallet.rare === 0 && state.wallet.superRare === 0 && state.foodInventory === 3,
    "Initial HUD state did not load."
  );
  let state = await snapshot(cdp);
  assert(state.numberFormatSamples.small === "999", "Small numbers should render without a suffix.");
  assert(state.numberFormatSamples.thousand === "24.7K", "Thousands should render with one K digit.");
  assert(state.numberFormatSamples.million === "67.8M", "Millions should render with one M digit.");
  assert(state.numberFormatSamples.billion === "1.2B", "Billions should render with one B digit.");
  assert(state.tankHudText.includes("W:"), "Tank HUD should expose wallet and total wealth.");
  assert(state.tankStatusText.includes("Tank L1") && state.tankStatusText.includes("Fish"), "Tank status should visibly expose tank level and fish capacity.");
  assert(state.tankCareText.includes("Clean") && state.tankCareText.includes("Happy"), "Tank care status should visibly expose cleanliness and happiness.");

  await evaluate(cdp, "window.__aquariumTest.setScreen('store')");
  state = await waitFor(
    cdp,
    (current) => current.activeScreen === "store" && current.activeTab === "fish" && current.storeCoinFilter === "common" && current.visibleStoreCatalogCount === 10,
    "Store should open on the common fish lane."
  );
  await captureNamedScreenshot(cdp, "store-buy-only-fish-catalog.png");
  await evaluate(cdp, "window.__aquariumTest.setStoreCoinFilter('rare')");
  state = await waitFor(
    cdp,
    (current) => current.activeTab === "fish" && current.storeCoinFilter === "rare" && current.visibleStoreCatalogCount === 0,
    "Fish store rare lane should filter the current tank level."
  );
  await evaluate(cdp, "window.__aquariumTest.setStoreTab('food')");
  state = await waitFor(
    cdp,
    (current) => current.activeTab === "food" && current.storeCoinFilter === "rare" && current.visibleStoreCatalogCount === 4,
    "Food store rare lane should show rare foods."
  );
  await evaluate(cdp, "window.__aquariumTest.setStoreCoinFilter('superRare')");
  state = await waitFor(
    cdp,
    (current) => current.activeTab === "food" && current.storeCoinFilter === "superRare" && current.visibleStoreCatalogCount === 1,
    "Food store super rare lane should show super rare food."
  );
  await evaluate(cdp, "window.__aquariumTest.setStoreTab('decor')");
  state = await waitFor(
    cdp,
    (current) => current.activeTab === "decor" && current.storeCoinFilter === "superRare" && current.visibleStoreCatalogCount === 1,
    "Decoration store super rare lane should show premium decoration."
  );
  await evaluate(cdp, "window.__aquariumTest.setStoreTab('creature')");
  await evaluate(cdp, "window.__aquariumTest.setStoreCoinFilter('common')");
  state = await waitFor(
    cdp,
    (current) => current.activeTab === "creature" && current.storeCoinFilter === "common" && current.visibleStoreCatalogCount === 2,
    "Helper store common lane should show starter and feeder helpers."
  );
  await evaluate(cdp, "window.__aquariumTest.setStoreCoinFilter('rare')");
  state = await waitFor(
    cdp,
    (current) => current.activeTab === "creature" && current.storeCoinFilter === "rare" && current.visibleStoreCatalogCount === 1,
    "Helper store rare lane should show rare helper."
  );
  await evaluate(cdp, "window.__aquariumTest.setStoreCoinFilter('superRare')");
  state = await waitFor(
    cdp,
    (current) => current.activeTab === "creature" && current.storeCoinFilter === "superRare" && current.visibleStoreCatalogCount === 1,
    "Helper store super rare lane should show super rare helper."
  );
  await evaluate(cdp, "window.__aquariumTest.setStoreTab('fish')");
  await evaluate(cdp, "window.__aquariumTest.setStoreCoinFilter('common')");
  await evaluate(cdp, "window.__aquariumTest.buyFish('goldfish')");
  state = await waitFor(
    cdp,
    (current) => current.wallet.common === 85 && current.fishCount === 1 && current.placementMode === "none",
    "Buying a goldfish should add it directly to the tank."
  );
  assert(state.maxFishCapacity === 10, "Level 1 tank should support 10 fish slots.");
  assert(
    state.tankLevel === 1 &&
      state.maxTankLevel === null &&
      state.tankCanUpgradeIndefinitely &&
      state.fishCatalogMaxLevel === 5,
    "Fresh tank should start at level 1 with indefinite upgrade support and five fish catalog tiers."
  );
  assert(state.nextTankUpgradePrice?.coinType === "common" && state.nextTankUpgradePrice.amount === 100, "Fresh tank should expose the level-2 upgrade price.");
  assert(state.tankViewScale === 1, "Level 1 tank should use the default close tank view.");
  assert(state.tankWorldBounds.width === gameWidth && state.tankWorldBounds.height === gameHeight, "Level 1 tank world should match the portrait viewport.");
  assert(
    Math.abs(state.tankScreenEdges.left) < 1 &&
      Math.abs(state.tankScreenEdges.top) < 1 &&
      Math.abs(state.tankScreenEdges.right - gameWidth) < 1 &&
      Math.abs(state.tankScreenEdges.bottom - gameHeight) < 1,
    "Level 1 tank should fill the portrait screen edges."
  );
  assert(state.tankPattern.id === "lagoon-ripples", "Level 1 tank should use the lagoon ripple background pattern.");
  assert(state.fishTypeCount === 50, "Fish catalog should include 50 fish types.");
  assert(state.visibleFishCatalogCount === 10, "Fish catalog should show 10 fish for the selected tank level.");
  assert(state.totalWealth > state.wallet.common, "Total wealth should include wallet and owned tank assets.");
  assert(state.fish[0].state === "happy", "New fish should start happy.");
  assert(state.fish[0].typeId === "goldfish" && state.fish[0].typeName === "Goldfish", "Fish snapshot should expose type identity for stats pages.");
  assert(state.fish[0].gender === "M" || state.fish[0].gender === "F", "New fish should receive a gender.");
  assert(state.fish[0].ageStage === undefined && state.fish[0].ageCategory === undefined, "Fish snapshot should not expose size or age-stage categories.");
  assert(state.fish[0].ageLabel === "0d", "New fish should expose fish-time age days instead of real seconds.");
  assert(state.fish[0].ageMonths < 0.01 && state.fish[0].growthCapAgeYears === 50, "Fish age should use 1 real hour per fish month and cap growth at 50 years.");
  assert(state.fish[0].lengthCm > 0 && state.fish[0].weightGrams > 0, "Fish snapshot should expose age-rooted length and weight.");
  assert(state.fish[0].lengthCm >= 20, "Fish length labels should use the larger 10x fantasy centimeter scale.");
  assert(state.fish[0].lengthLabel.endsWith(" cm") && / (g|kg)$/.test(state.fish[0].weightLabel), "Fish size labels should use readable metric units.");
  assert(state.fish[0].evolutionStage === 0, "New fish should start at evolution stage zero.");
  assert(state.fish[0].statusBars.visible, "Fish hunger and mood bars should be visible.");
  assert(state.fish[0].statusBars.y < state.fish[0].y, "Fish hunger and mood bars should sit above the fish.");
  assert(state.fish[0].statusBars.fullnessRatio > 0.8 && state.fish[0].statusBars.moodRatio > 0.9, "Fish status bars should show full as good for fullness and mood.");
  assert(state.fish[0].statusBars.tailTint === 0xffb13b, "Goldfish tail should use the same visual color as its preferred basic food.");
  assert(state.fish[0].statusBars.rarityStars === 1, "Common fish should render a one-star rarity badge.");
  assert(!state.fish[0].statusBars.fullyGrown, "New fish should not show the fully grown marker.");
  assert(!state.fish[0].statusBars.emojiVisible && !state.fish[0].statusBars.emojiBubbleVisible, "Happy emoji should not show until the fish eats.");
  const freshMovementSizeMultiplier = state.fish[0].movementSizeMultiplier;
  assert(freshMovementSizeMultiplier > 0.95, "New fish should move at nearly full size-based speed.");
  const freshScale = state.fish[0].scale;
  const freshLengthCm = state.fish[0].lengthCm;
  const freshWeightGrams = state.fish[0].weightGrams;
  const freshCalorieNeedMultiplier = state.fish[0].calorieNeedMultiplier;
  const freshMealCaloriesNeeded = state.fish[0].mealCaloriesNeeded;
  assert(freshCalorieNeedMultiplier > 0 && freshMealCaloriesNeeded > 0, "Fresh fish should expose a size-based food calorie need.");
  const freshSellValue = state.fish[0].sellValue;
  assert(freshSellValue < 35, "Freshly bought fish should sell below purchase price.");

  await evaluate(cdp, `window.__aquariumTest.forceFishAge(0, ${fourMonthAgeSeconds})`);
  state = await waitFor(
    cdp,
    (current) =>
      current.fish[0].ageLabel === "4mo" &&
      Math.round(current.fish[0].ageMonths) === 4 &&
      current.fish[0].scale > freshScale * 1.3 &&
      current.fish[0].lengthCm > freshLengthCm * 1.3 &&
      current.fish[0].weightGrams > freshWeightGrams * 2,
    "Four-month fish should look visibly larger than a new fish and expose larger age-rooted size stats."
  );
  assert(state.fish[0].calorieNeedMultiplier > freshCalorieNeedMultiplier, "Larger fish should need more food calories than age-zero fish.");
  await evaluate(cdp, "window.__aquariumTest.setScreen('tank')");
  state = await waitFor(cdp, (current) => current.activeScreen === "tank", "Returning to tank for 4-month age visual failed.");
  await delay(1200);
  await captureNamedScreenshot(cdp, "fish-age-4mo-growth.png");

  await evaluate(cdp, `window.__aquariumTest.forceFishAge(0, ${goldfishAdultAgeSeconds})`);
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 10, 100)");
  state = await waitFor(
    cdp,
    (current) =>
      current.fish[0].ageStage === undefined &&
      current.fish[0].ageCategory === undefined &&
      current.fish[0].ageLabel === "1y" &&
      Math.round(current.fish[0].ageMonths) === 12 &&
      current.fish[0].scale > freshScale + 0.005 &&
      current.fish[0].sellValue > freshSellValue * 1.8,
    "Grown healthy fish sell value did not scale up with real-time age attributes."
  );
  const grownHealthySellValue = state.fish[0].sellValue;
  await evaluate(cdp, `window.__aquariumTest.forceFishAge(0, ${fullyGrownAgeSeconds})`);
  state = await waitFor(
    cdp,
    (current) =>
      current.fish[0].ageStage === undefined &&
      current.fish[0].ageCategory === undefined &&
      current.fish[0].ageLabel === "50y" &&
      current.fish[0].growthBlockedByTank &&
      current.fish[0].statusBars.growthBlockedByTank &&
      !current.fish[0].statusBars.fullyGrown &&
      current.fish[0].naturalAgeScale > current.fish[0].tankGrowthScaleCap &&
      Math.abs(current.fish[0].scale - current.fish[0].tankGrowthScaleCap) < 0.02 &&
      current.tankNeedIndicator.includes("needs L2") &&
      current.fish[0].statusBars.emoji === "😣" &&
      current.fish[0].statusBars.emojiBubbleVisible &&
      current.fish[0].lengthCm > freshLengthCm * 3 &&
      current.fish[0].weightGrams > freshWeightGrams * 20 &&
      current.fish[0].mealCaloriesNeeded > freshMealCaloriesNeeded * 3 &&
      current.fish[0].movementSizeMultiplier < freshMovementSizeMultiplier * 0.7,
    "Oversized fish should stop growing when the current tank is too small and ask for a tank upgrade."
  );
  await evaluate(cdp, "window.__aquariumTest.setScreen('tank')");
  state = await waitFor(cdp, (current) => current.activeScreen === "tank", "Returning to tank for blocked growth visual failed.");
  await delay(1200);
  await captureNamedScreenshot(cdp, "fish-growth-blocked-tank.png");
  await evaluate(cdp, `window.__aquariumTest.forceFishAge(0, ${goldfishAdultAgeSeconds})`);

  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 95, 20)");
  state = await waitFor(
    cdp,
    (current) => current.fish[0].sellValue < grownHealthySellValue * 0.75,
    "Poor fish condition did not reduce attribute-based sell value."
  );
  await evaluate(cdp, "window.__aquariumTest.forceFishAge(0, 0)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 12, 100)");

  await evaluate(cdp, "window.__aquariumTest.setStoreTab('food')");
  state = await waitFor(cdp, (current) => current.activeTab === "food", "Food tab did not activate.");
  assert(state.foodBuyQuantities.basic === 1, "Food buy quantity should default to one.");
  await evaluate(cdp, "window.__aquariumTest.addWallet('rare', 4)");
  await evaluate(cdp, "window.__aquariumTest.buyFood('evolve')");
  state = await waitFor(
    cdp,
    (current) => current.foodInventoryByType.evolve === 1 && current.wallet.rare === 2 && current.placementMode === "none",
    "Buying an evolve pill should add stock without activating tank drop mode."
  );

  await evaluate(cdp, "window.__aquariumTest.setFoodBuyQuantity('basic', 3)");
  state = await waitFor(cdp, (current) => current.foodBuyQuantities.basic === 3, "Food buy quantity did not update.");
  await evaluate(cdp, "window.__aquariumTest.setFoodBuyQuantity('basic', 0)");
  await evaluate(cdp, "window.__aquariumTest.addFoodBuyQuantity('basic', 1)");
  await evaluate(cdp, "window.__aquariumTest.addFoodBuyQuantity('basic', 1)");
  await evaluate(cdp, "window.__aquariumTest.addFoodBuyQuantity('basic', 1)");
  await evaluate(cdp, "window.__aquariumTest.addFoodBuyQuantity('basic', 1)");
  await evaluate(cdp, "window.__aquariumTest.addFoodBuyQuantity('basic', 1)");
  state = await waitFor(cdp, (current) => current.foodBuyQuantities.basic === 5, "Tapping x1 five times should build a quantity of five.");
  await evaluate(cdp, "window.__aquariumTest.setFoodBuyQuantity('basic', 0)");
  await evaluate(cdp, "window.__aquariumTest.addFoodBuyQuantity('basic', 10)");
  await evaluate(cdp, "window.__aquariumTest.addFoodBuyQuantity('basic', 10)");
  await evaluate(cdp, "window.__aquariumTest.addFoodBuyQuantity('basic', 10)");
  await evaluate(cdp, "window.__aquariumTest.addFoodBuyQuantity('basic', 10)");
  await evaluate(cdp, "window.__aquariumTest.addFoodBuyQuantity('basic', 10)");
  state = await waitFor(cdp, (current) => current.foodBuyQuantities.basic === 50, "Tapping x10 five times should build a quantity of fifty.");
  await evaluate(cdp, "window.__aquariumTest.resetFoodBuyQuantity('basic')");
  state = await waitFor(cdp, (current) => current.foodBuyQuantities.basic === 1, "Resetting food bulk quantity should return the card to x1.");
  await evaluate(cdp, "window.__aquariumTest.setFoodBuyQuantity('basic', 30)");
  state = await waitFor(cdp, (current) => current.foodBuyQuantities.basic === 30, "Food bulk quantity catalog setup did not update to 30.");
  await captureNamedScreenshot(cdp, "food-bulk-buy-catalog.png");
  await evaluate(cdp, "window.__aquariumTest.setFoodBuyQuantity('basic', 1)");

  await evaluate(cdp, "window.__aquariumTest.buyFood('basic')");
  state = await waitFor(cdp, (current) => current.wallet.common === 80 && current.foodInventoryByType.basic === 4 && current.placementMode === "food", "Buying food failed.");

  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 218, 248)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 92, 100)");
  await evaluate(cdp, "window.__aquariumTest.setScreen('tank')");
  state = await waitFor(
    cdp,
    (current) =>
      current.fish[0].state === "hungry" &&
      current.fish[0].statusBars.emoji === "😫" &&
      current.fish[0].statusBars.emojiVisible &&
      current.fish[0].statusBars.emojiBubbleVisible,
    "Hungry fish should show a persistent hungry chat bubble until eating."
  );
  await captureNamedScreenshot(cdp, "fish-hungry-bubble.png");
  await clickGame(cdp, 260, 250);
  state = await waitFor(
    cdp,
    (current) =>
      current.foodInventoryByType.basic === 3 &&
      current.foodCount === 0 &&
      current.fish[0].hunger < 70 &&
      current.fish[0].statusBars.emoji === "😊" &&
      current.fish[0].statusBars.emojiBubbleVisible,
    "Hungry fish did not eat dropped food."
  );
  const freshBasicFedHunger = state.fish[0].hunger;
  await captureNamedScreenshot(cdp, "fish-happy-after-eat-bubble.png");
  await delay(3600);
  state = await waitFor(
    cdp,
    (current) => current.fish[0].state === "happy" && !current.fish[0].statusBars.emojiVisible && !current.fish[0].statusBars.emojiBubbleVisible,
    "Happy emoji should disappear a few seconds after eating."
  );

  await evaluate(cdp, "window.__aquariumTest.clearFoods()");
  await evaluate(cdp, `window.__aquariumTest.forceFishAge(0, ${fullyGrownAgeSeconds})`);
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 218, 248)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 92, 100)");
  await evaluate(cdp, "window.__aquariumTest.dropFoodForTest('basic', 218, 248)");
  state = await waitFor(
    cdp,
    (current) =>
      current.foodCount === 0 &&
      current.fish[0].calorieNeedMultiplier > freshCalorieNeedMultiplier * 3 &&
      current.fish[0].hunger > freshBasicFedHunger + 35,
    "Same basic food should satisfy a very large fish much less than an age-zero fish."
  );
  await evaluate(cdp, "window.__aquariumTest.forceFishAge(0, 0)");

  await evaluate(cdp, "window.__aquariumTest.addFood('basic', 1)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 110, 248)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 18, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFoodTool('basic')");
  await clickGame(cdp, 330, 248);
  state = await waitFor(
    cdp,
    (current) => current.foodInventoryByType.basic === 3 && current.foodCount === 0 && current.fish[0].hunger <= 4,
    "Partly full fish did not aggressively chase and eat compatible food.",
    4200
  );

  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 42, 20)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 225, 810)");
  await evaluate(cdp, "window.__aquariumTest.forceCoinReady(0)");
  state = await waitFor(
    cdp,
    (current) =>
      current.fish[0].state === "ill" &&
      current.coinDropCount === 1 &&
      current.coinsWaiting[0]?.value === 1 &&
      current.fish[0].statusBars.emoji === "🤒" &&
      current.fish[0].statusBars.emojiBubbleVisible &&
      current.fish[0].nextCoinDropInMs >= 20000,
    "Ill fish did not produce a slower reduced +1 coin."
  );
  assert(state.fish[0].bodyTint !== 0x95a1a6, "Ill fish should keep a desaturated body color instead of turning colorless gray.");
  assert(state.fish[0].statusBars.tailTint === 0xffb13b, "Ill fish should keep its preferred-food tail color.");
  await captureNamedScreenshot(cdp, "fish-sick-emoji.png");
  state = await waitFor(
    cdp,
    (current) => current.coinsWaiting[0]?.atBottom && current.coinsWaiting[0].y >= current.coinsWaiting[0].bottomY - 0.5,
    "Coin did not sink all the way to the tank bottom.",
    7000
  );
  await captureNamedScreenshot(cdp, "coin-bottom.png");
  await clickGame(cdp, state.coinsWaiting[0].x, state.coinsWaiting[0].y);
  state = await waitFor(cdp, (current) => current.wallet.common === 81 && current.coinDropCount === 0, "Collecting an ill fish coin failed.");

  await evaluate(cdp, "window.__aquariumTest.addFood('medicine', 1)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 72, 22)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 120, 248)");
  await evaluate(cdp, "window.__aquariumTest.setFoodTool('medicine')");
  await clickGame(cdp, 330, 248);
  state = await waitFor(
    cdp,
    (current) =>
      current.foodInventoryByType.medicine === undefined &&
      current.foodCount === 1 &&
      current.foods[0]?.foodType === "medicine" &&
      current.foods[0]?.textureKey === "medicine-pill" &&
      current.foods[0]?.visualTint === 0x43d66f &&
      current.fish[0].health < 82,
    "Medicine should drop as a pellet before healing the fish."
  );
  state = await waitFor(
    cdp,
    (current) =>
      current.foodCount === 0 &&
      current.foodInventoryByType.medicine === undefined &&
      current.fish[0].health >= 82 &&
      current.fish[0].hunger <= 36,
    "Fish did not eat medicine and recover.",
    8000
  );
  await delay(12000);
  state = await snapshot(cdp);
  assert(state.fish[0].state !== "ill", "Medicine should keep a treated fish stable instead of relapsing immediately.");
  assert(state.fish[0].health > 70, "Medicine recovery should preserve health for more than a few seconds.");

  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 80, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFishFatalCareSeconds(0, 3599)");
  state = await waitFor(
    cdp,
    (current) => current.fishCount === 1 && current.fish[0].fatalCareSeconds >= 3599,
    "Hungry fish fatal-care timer setup failed."
  );
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 20, 100)");
  state = await waitFor(
    cdp,
    (current) => current.fishCount === 1 && current.fish[0].fatalCareSeconds === 0,
    "Recovering from hunger should reset the 60-minute death timer."
  );
  await delay(1200);
  state = await snapshot(cdp);
  assert(state.fishCount === 1, "Recovered fish should not die from a cleared hunger timer.");

  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 80, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFishFatalCareSeconds(0, 3599.4)");
  state = await waitFor(cdp, (current) => current.fishCount === 0, "Fish hungry for 60 minutes should die.", 3000);

  await evaluate(cdp, "window.__aquariumTest.addFishForTest('goldfish', 225, 420)");
  state = await waitFor(cdp, (current) => current.fishCount === 1, "Adding a fish for sickness death coverage failed.");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 20, 20)");
  await evaluate(cdp, "window.__aquariumTest.setFishFatalCareSeconds(0, 3599.4)");
  state = await waitFor(cdp, (current) => current.fishCount === 0, "Fish sick for 60 minutes should die.", 3000);

  await evaluate(cdp, "window.__aquariumTest.addFishForTest('goldfish', 225, 420)");
  state = await waitFor(cdp, (current) => current.fishCount === 1, "Adding a fish for offline death coverage failed.");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 80, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFishFatalCareSeconds(0, 3599)");
  await evaluate(cdp, "window.__aquariumTest.backdateSave(3600)");
  await reloadApp(cdp, appUrl);
  state = await waitFor(
    cdp,
    (current) => current.offlineProgress.elapsedSeconds >= 3500 && current.fishCount === 0,
    "Already-hungry fish should die if its saved 60-minute timer finishes offline."
  );
  await evaluate(cdp, "window.__aquariumTest.closeModal()");

  await evaluate(cdp, "window.__aquariumTest.addFishForTest('goldfish', 225, 420)");
  state = await waitFor(cdp, (current) => current.fishCount === 1, "Adding a replacement fish after death coverage failed.");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 80, 100)");
  await evaluate(cdp, "window.__aquariumTest.clearCoins()");
  state = await waitFor(cdp, (current) => current.coinDropCount === 0, "Death coverage should leave an empty coin stack for happy coin coverage.");

  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 20, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 225, 810)");
  await evaluate(cdp, "window.__aquariumTest.forceCoinReady(0)");
  state = await waitFor(cdp, (current) => current.fish[0].state === "happy" && current.coinDropCount === 1, "Happy fish did not drop a coin.");
  assert(state.coinsWaiting[0].coinType === "common", "Goldfish should produce common coins.");
  assert(state.fish[0].nextCoinDropInMs < 10000, "Happy fish coin timer should stay faster than sick fish timer.");
  state = await waitFor(
    cdp,
    (current) => current.coinsWaiting.some((coin) => coin.atBottom && coin.y >= coin.bottomY - 0.5),
    "Happy fish coin did not sink all the way to the tank bottom.",
    7000
  );
  const walletBeforeHappyCoinCollection = state.wallet.common;
  const settledHappyCoin = state.coinsWaiting.find((coin) => coin.atBottom && coin.y >= coin.bottomY - 0.5) ?? state.coinsWaiting[0];
  await clickGame(cdp, settledHappyCoin.x, settledHappyCoin.y);
  state = await waitFor(cdp, (current) => current.wallet.common === walletBeforeHappyCoinCollection + settledHappyCoin.value, "Collecting a coin failed.");
  await evaluate(cdp, "window.__aquariumTest.clearCoins()");
  state = await waitFor(cdp, (current) => current.coinDropCount === 0, "Happy coin cleanup failed.");
  const walletAfterHappyCoinCollection = state.wallet.common;

  await evaluate(cdp, "window.__aquariumTest.saveNow()");
  await reloadApp(cdp, appUrl);
  state = await waitFor(
    cdp,
    (current) => current.saved && current.fishCount === 1 && current.wallet.common === walletAfterHappyCoinCollection && current.foodInventoryByType.basic === 3 && current.foodInventoryByType.evolve === 1,
    "Saved tank state did not restore after reload."
  );
  assert(state.fish[0].ageLabel === "0d", "Reloaded fish should retain its fish-time age label without stage categories.");

  await evaluate(cdp, "window.__aquariumTest.backdateSave(3600)");
  await reloadApp(cdp, appUrl);
  state = await waitFor(
    cdp,
    (current) => current.offlineProgress.elapsedSeconds >= 3500 && current.wallet.common > walletAfterHappyCoinCollection && current.fishCount === 1,
    "Offline return progress did not apply after a backdated save."
  );
  assert(state.offlineProgress.earned.common > 0, "Offline progress should award common coins for a happy goldfish.");
  await evaluate(cdp, "window.__aquariumTest.closeModal()");

  const walletBeforeRentals = state.wallet.common;
  await evaluate(cdp, "window.__aquariumTest.addFood('basic', 1)");
  await evaluate(cdp, "window.__aquariumTest.addFood('protein', 1)");
  await evaluate(cdp, "window.__aquariumTest.addFishForTest('koi', 318, 250)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 62, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(1, 66, 100)");
  await evaluate(cdp, "window.__aquariumTest.setRentalMinutes('feeder', 99)");
  await evaluate(cdp, "window.__aquariumTest.setRentalMinutes('collector', 99)");
  state = await waitFor(
    cdp,
    (current) =>
      current.rentals.autoFeederMinutes === 60 &&
      current.rentals.autoCollectorMinutes === 60 &&
      current.rentals.autoFeederPrice === 1080 &&
      current.rentals.autoCollectorPrice === 1320,
    "Rental duration controls should clamp at 60 minutes."
  );
  await evaluate(cdp, "window.__aquariumTest.setRentalMinutes('feeder', 2)");
  await evaluate(cdp, "window.__aquariumTest.rentAutoFeeder()");
  state = await waitFor(
    cdp,
    (current) =>
      current.rentals.autoFeederActive &&
      current.rentals.autoFeederMinutes === 2 &&
      current.rentals.autoFeederPrice === 36 &&
      current.rentals.autoFeederRemainingMs > 115_000 &&
      current.wallet.common === walletBeforeRentals - 36,
    "Renting the auto feeder failed."
  );
  const feederRemainingAfterFirstRent = state.rentals.autoFeederRemainingMs;
  await evaluate(cdp, "window.__aquariumTest.setRentalMinutes('feeder', 1)");
  await evaluate(cdp, "window.__aquariumTest.rentAutoFeeder()");
  state = await waitFor(
    cdp,
    (current) =>
      current.rentals.autoFeederActive &&
      current.rentals.autoFeederRemainingMs > feederRemainingAfterFirstRent + 50_000 &&
      current.wallet.common === walletBeforeRentals - 54,
    "Renting an active auto feeder should add duration."
  );
  await evaluate(cdp, "window.__aquariumTest.clearFoods()");
  await evaluate(cdp, "window.__aquariumTest.addFood('basic', 1)");
  await evaluate(cdp, "window.__aquariumTest.addFood('protein', 1)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 62, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(1, 66, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 110, 760)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(1, 318, 760)");
  state = await waitFor(
    cdp,
    (current) => (current.foodInventoryByType.basic ?? 0) >= 1 && (current.foodInventoryByType.protein ?? 0) >= 1,
    "Auto feeder setup food stock failed."
  );
  const basicBeforeAutoFeed = state.foodInventoryByType.basic ?? 0;
  const proteinBeforeAutoFeed = state.foodInventoryByType.protein ?? 0;
  const totalFoodBeforeAutoFeed = state.foodInventory;
  await evaluate(cdp, "window.__aquariumTest.runAutoFeederNow()");
  state = await waitFor(
    cdp,
    (current) =>
      (current.foodInventoryByType.basic ?? 0) === basicBeforeAutoFeed - 1 &&
      (current.foodInventoryByType.protein ?? 0) === proteinBeforeAutoFeed - 1 &&
      current.foodInventory === totalFoodBeforeAutoFeed - 2 &&
      current.foods.every((food) => food.y >= 138 && food.y <= 260) &&
      current.foods.every((food) => food.calories > 0 && food.densityLevel >= 1),
    "Auto feeder did not drop each needed fish food type from the top while decrementing inventory.",
    3500
  );
  const foodSinkSpeed = state.foods[0]?.sinkSpeed ?? 18;
  await evaluate(cdp, "window.__aquariumTest.clearFoods()");
  await evaluate(cdp, "window.__aquariumTest.removeFishAt(1)");

  const walletBeforeCollector = state.wallet.common;
  await evaluate(cdp, "window.__aquariumTest.clearCoins()");
  await evaluate(cdp, "window.__aquariumTest.setRentalMinutes('collector', 3)");
  await evaluate(cdp, "window.__aquariumTest.rentAutoCollector()");
  state = await waitFor(
    cdp,
    (current) =>
      current.rentals.autoCollectorActive &&
      current.rentals.autoCollectorMinutes === 3 &&
      current.rentals.autoCollectorPrice === 66 &&
      current.rentals.autoCollectorRemainingMs > 175_000 &&
      current.wallet.common === walletBeforeCollector - 66,
    "Renting the auto coin collector failed."
  );
  const collectorRemainingAfterFirstRent = state.rentals.autoCollectorRemainingMs;
  await evaluate(cdp, "window.__aquariumTest.setRentalMinutes('collector', 1)");
  await evaluate(cdp, "window.__aquariumTest.rentAutoCollector()");
  state = await waitFor(
    cdp,
    (current) =>
      current.rentals.autoCollectorActive &&
      current.rentals.autoCollectorRemainingMs > collectorRemainingAfterFirstRent + 50_000 &&
      current.wallet.common === walletBeforeCollector - 88,
    "Renting an active auto coin collector should add duration."
  );
  const walletAfterCollectorCleared = state.wallet.common;
  await evaluate(cdp, "window.__aquariumTest.addCoin('common', 3, 215, 828)");
  state = await waitFor(
    cdp,
    (current) => current.wallet.common >= walletAfterCollectorCleared + 3 && current.coinDropCount === 0,
    "Auto coin collector did not collect settled coins.",
    4000
  );
  await evaluate(cdp, "window.__aquariumTest.expireRentals()");
  state = await waitFor(
    cdp,
    (current) => !current.rentals.autoFeederActive && !current.rentals.autoCollectorActive,
    "Expiring rentals for regression setup failed."
  );
  const walletBeforeProgressionTopUp = state.wallet.common;
  await evaluate(cdp, "window.__aquariumTest.addWallet('common', 220)");
  state = await waitFor(
    cdp,
    (current) => current.wallet.common >= walletBeforeProgressionTopUp + 220,
    "Progression setup wallet top-up failed."
  );

  await evaluate(cdp, "window.__aquariumTest.setScreen('store')");
  await evaluate(cdp, "window.__aquariumTest.setFishCatalogLevel(2)");
  await evaluate(cdp, "window.__aquariumTest.setStoreCoinFilter('rare')");
  const commonBeforeLockedBuy = state.wallet.common;
  const rareBeforeLockedBuy = state.wallet.rare;
  await evaluate(cdp, "window.__aquariumTest.buyFish('angelfish')");
  state = await waitFor(
    cdp,
    (current) =>
      current.fishCount === 1 &&
      current.wallet.common === commonBeforeLockedBuy &&
      current.wallet.rare === rareBeforeLockedBuy &&
      current.tankLevel === 1 &&
      current.fishCatalogLevel === 2 &&
      current.tankNeedIndicator.includes("upgrade"),
    "Higher-level fish purchase should require a tank upgrade first."
  );
  await evaluate(cdp, "window.__aquariumTest.upgradeTank()");
  state = await waitFor(
    cdp,
    (current) => current.tankLevel === 2 && current.fishCatalogLevel === 2 && current.wallet.common === commonBeforeLockedBuy - 100,
    "Tank upgrade to level 2 failed."
  );
  assert(state.tankViewScale < 1, "Upgraded tank should zoom the tank view out.");
  assert(state.tankWorldBounds.width > gameWidth && state.tankWorldBounds.height > gameHeight, "Upgraded tank should expand the world instead of shrinking the viewport.");
  assert(
    Math.abs(state.tankScreenEdges.left) < 1 &&
      Math.abs(state.tankScreenEdges.top) < 1 &&
      Math.abs(state.tankScreenEdges.right - gameWidth) < 1 &&
      Math.abs(state.tankScreenEdges.bottom - gameHeight) < 1,
    "Upgraded tank background, floor, and interaction space should still reach the screen edges."
  );
  assert(state.tankPattern.id === "kelp-stripes", "Level 2 tank should switch to the kelp stripe background pattern.");
  assert(state.maxFishCapacity === 14, "Level 2 tank should increase fish capacity.");
  await evaluate(cdp, "window.__aquariumTest.addWallet('rare', 2)");
  state = await waitFor(cdp, (current) => current.wallet.rare >= rareBeforeLockedBuy + 2, "Rare fish purchase setup failed.");
  const rareBeforeMixedBuy = state.wallet.rare;
  await evaluate(cdp, "window.__aquariumTest.buyFish('angelfish')");
  state = await waitFor(
    cdp,
    (current) =>
      current.fishCount === 2 &&
      current.wallet.rare === rareBeforeMixedBuy - 1 &&
      current.compatibilityScore === 100 &&
      !current.modalTitle,
    "Mixed level-2 species purchase should auto-add after the tank is upgraded."
  );

  const sellValue = state.fish[0].sellValue;
  await evaluate(cdp, "window.__aquariumTest.setStoreTab('fish')");
  state = await waitFor(cdp, (current) => current.activeTab === "fish", "Fish tab did not activate before selling.");
  await evaluate(cdp, "window.__aquariumTest.openSellOldest()");
  state = await waitFor(cdp, (current) => current.modalTitle === "Sell Fish", "Common fish sell confirmation did not open.");
  await evaluate(cdp, "window.__aquariumTest.sellFishAt(0)");
  state = await waitFor(
    cdp,
    (current) => current.fishCount === 1 && current.wallet.common === state.wallet.common + sellValue,
    "Selling a placed fish failed."
  );

  await evaluate(cdp, "window.__aquariumTest.addFishForTest('goldfish', 350, 420)");
  state = await waitFor(cdp, (current) => current.fishCount === 2 && !current.modalTitle, "Adding a second fish for rare-sale coverage failed.");

  const rareSellValue = state.fish[0].sellValue;
  const rareWalletBeforeSale = state.wallet.rare;
  await evaluate(cdp, "window.__aquariumTest.setScreen('store')");
  await evaluate(cdp, "window.__aquariumTest.openSellOldest()");
  state = await waitFor(cdp, (current) => current.modalTitle === "Sell Rare Fish", "Rare fish sell confirmation did not open.");
  await evaluate(cdp, "window.__aquariumTest.sellFishAt(0)");
  state = await waitFor(
    cdp,
    (current) => current.fishCount === 1 && current.wallet.rare === rareWalletBeforeSale + rareSellValue,
    "Selling a rare placed fish failed."
  );

  await evaluate(cdp, "window.__aquariumTest.openSellOldest()");
  state = await waitFor(cdp, (current) => current.modalTitle === "Starter Protected" && current.fishCount === 1, "Final fish protection did not trigger.");
  await evaluate(cdp, "window.__aquariumTest.closeModal()");
  state = await waitFor(cdp, (current) => current.fishCount === 1 && !current.modalTitle, "Final fish protection modal did not close.");

  await evaluate(cdp, "window.__aquariumTest.setScreen('album')");
  state = await waitFor(cdp, (current) => current.activeScreen === "album", "Fish stats page did not open from the album screen.");
  assert(state.fish[0].lengthLabel.endsWith(" cm") && / (g|kg)$/.test(state.fish[0].weightLabel), "Book fish stats should have readable length and weight labels.");
  await captureNamedScreenshot(cdp, "book-fish-length-weight.png");
  await evaluate(cdp, "window.__aquariumTest.addFood('evolve', 1)");
  const evolutionFee = state.fish[0].evolutionFee;
  await evaluate(cdp, `window.__aquariumTest.addWallet('${evolutionFee.coinType}', ${evolutionFee.amount})`);
  state = await waitFor(
    cdp,
    (current) => current.foodInventoryByType.evolve >= 2 && current.wallet[evolutionFee.coinType] >= evolutionFee.amount,
    "Evolution setup did not add pill stock and fee."
  );
  const walletBeforeEvolution = state.wallet[evolutionFee.coinType];
  await evaluate(cdp, "window.__aquariumTest.forceFishAge(0, 10000)");
  await evaluate(cdp, "window.__aquariumTest.evolveFishAt(0, 'success')");
  state = await waitFor(
    cdp,
    (current) =>
      current.fishCount === 1 &&
      current.fish[0].evolutionStage === 1 &&
      current.fish[0].ageLabel === "0d" &&
      current.fish[0].ageMonths < 0.01 &&
      current.wallet[evolutionFee.coinType] === walletBeforeEvolution - evolutionFee.amount,
    "Successful evolution should spend pill and fee, raise evolution, and reset age to zero."
  );

  await evaluate(cdp, "window.__aquariumTest.addFishForTest('goldfish', 350, 420)");
  await evaluate(cdp, "window.__aquariumTest.setFishGender(0, 'M')");
  await evaluate(cdp, "window.__aquariumTest.setFishGender(1, 'F')");
  state = await waitFor(
    cdp,
    (current) => current.fishCount === 2 && current.fish[0].gender === "M" && current.fish[1].gender === "F",
    "Breed setup should contain an M/F same-species pair."
  );
  await evaluate(cdp, "window.__aquariumTest.breedFishAt(0, 'same')");
  state = await waitFor(
    cdp,
    (current) =>
      current.fishCount === 3 &&
      current.fish.some((fish) => fish.typeId === "goldfish" && fish.ageLabel === "0d" && fish.evolutionStage === 0),
    "Breeding an M/F same-species pair should create a new age-zero fish."
  );
  const statsSellValue = state.fish[1].sellValue;
  const walletBeforeStatsSell = state.wallet.common;
  await evaluate(cdp, "window.__aquariumTest.sellFishAt(1)");
  state = await waitFor(
    cdp,
    (current) => current.activeScreen === "album" && current.fishCount === 2 && current.wallet.common === walletBeforeStatsSell + statsSellValue,
    "Fish stats page should allow selling owned fish."
  );
  await evaluate(cdp, "window.__aquariumTest.closeModal()");
  await evaluate(cdp, "window.__aquariumTest.addFood('evolve', 1)");
  const deathFee = state.fish[0].evolutionFee;
  await evaluate(cdp, `window.__aquariumTest.addWallet('${deathFee.coinType}', ${deathFee.amount})`);
  state = await waitFor(
    cdp,
    (current) => current.foodInventoryByType.evolve >= 1 && current.wallet[deathFee.coinType] >= deathFee.amount,
    "Forced evolution failure setup did not add pill stock and fee."
  );
  await evaluate(cdp, "window.__aquariumTest.evolveFishAt(0, 'death')");
  state = await waitFor(cdp, (current) => current.fishCount === 1, "Failed evolution should remove the fish.");
  await evaluate(cdp, "window.__aquariumTest.setScreen('tank')");
  const walletAfterSelling = state.wallet.common;

  await evaluate(cdp, "window.__aquariumTest.setStoreTab('decor')");
  state = await waitFor(cdp, (current) => current.activeTab === "decor", "Decor tab did not activate.");

  await evaluate(cdp, "window.__aquariumTest.buyDecoration('plant')");
  state = await waitFor(cdp, (current) => current.wallet.common === walletAfterSelling - 20 && current.placementMode === "decoration", "Buying plant decoration failed.");

  await clickGame(cdp, 215, 476);
  state = await waitFor(cdp, (current) => current.decorationCount === 1 && current.placementMode === "none", "Placing plant decoration failed.");
  assert(state.decorations[0]?.typeId === "plant", "Placed decoration snapshot should expose the decoration type.");
  await dragGame(cdp, state.decorations[0].x, state.decorations[0].y, 292, 560);
  state = await waitFor(
    cdp,
    (current) =>
      current.decorationCount === 1 &&
      Math.abs(current.decorations[0].x - 292) < 8 &&
      Math.abs(current.decorations[0].y - 560) < 8,
    "Dragging a placed decoration should reposition it in the tank."
  );
  await captureNamedScreenshot(cdp, "decoration-repositioned.png");

  await evaluate(cdp, "window.__aquariumTest.setScreen('tank')");
  await evaluate(cdp, "window.__aquariumTest.clearCoins()");
  state = await waitFor(cdp, (current) => current.coinDropCount === 0, "Coin stack setup should start from an empty tank floor.");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 20, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 225, 760)");
  for (let expectedCoins = 1; expectedCoins <= state.maxCoinDrops; expectedCoins += 1) {
    await evaluate(cdp, "window.__aquariumTest.forceCoinReady(0)");
    state = await waitFor(
      cdp,
      (current) => current.fish[0].state === "happy" && current.coinDropCount === expectedCoins,
      `Coin stack did not reach ${expectedCoins}.`
    );
  }
  await evaluate(cdp, "window.__aquariumTest.forceCoinReady(0)");
  await delay(500);
  state = await snapshot(cdp);
  assert(state.coinDropCount === state.maxCoinDrops, "Uncollected coin stack should cap at 5.");
  assert(state.fish[0].nextCoinDropInMs === 0, "Fish should keep production ready while coin stack is capped.");
  await captureNamedScreenshot(cdp, "coin-stack-cap.png");

  for (let attempts = 0; attempts < state.maxCoinDrops + 2; attempts += 1) {
    state = await snapshot(cdp);
    if (state.coinDropCount === 0) {
      break;
    }
    await clickGame(cdp, state.coinsWaiting[0].x, state.coinsWaiting[0].y);
  }
  state = await waitFor(cdp, (current) => current.coinDropCount === 0, "Collecting capped coin stack failed.");

  await evaluate(cdp, "window.__aquariumTest.addCoin('common', 1, 130, 720)");
  await evaluate(cdp, "window.__aquariumTest.addCoin('rare', 1, 215, 720)");
  await evaluate(cdp, "window.__aquariumTest.addCoin('superRare', 1, 300, 720)");
  await delay(300);
  state = await snapshot(cdp);
  assert(state.coinDropCount === 3, "Coin color sample should create three coin drops.");
  assert(
    new Set(state.coinsWaiting.map((coin) => coin.coinType)).size === 3,
    "Coin color sample should include common, rare, and super rare coins."
  );
  assert(new Set(state.coinsWaiting.map((coin) => coin.tint)).size === 3, "Each coin type should use a distinct tint.");
  assert(
    state.coinsWaiting.every((coin) => coin.sinkSpeed > foodSinkSpeed),
    "Coin drops should sink faster than food."
  );
  assert(
    new Set(state.coinsWaiting.map((coin) => coin.textColor)).size === 3,
    "Each coin type should use a distinct label color."
  );
  await captureNamedScreenshot(cdp, "coin-colors.png");
  for (let attempts = 0; attempts < 5; attempts += 1) {
    state = await snapshot(cdp);
    if (state.coinDropCount === 0) {
      break;
    }
    await clickGame(cdp, state.coinsWaiting[0].x, state.coinsWaiting[0].y);
  }
  state = await waitFor(cdp, (current) => current.coinDropCount === 0, "Collecting color sample coins failed.");

  const tankPatternIds = [state.tankPattern.id];
  await evaluate(cdp, "window.__aquariumTest.addWallet('common', 500)");
  await evaluate(cdp, "window.__aquariumTest.upgradeTank()");
  state = await waitFor(cdp, (current) => current.tankLevel === 3, "Tank upgrade to level 3 failed.");
  tankPatternIds.push(state.tankPattern.id);
  await evaluate(cdp, "window.__aquariumTest.addWallet('rare', 10)");
  await evaluate(cdp, "window.__aquariumTest.upgradeTank()");
  state = await waitFor(cdp, (current) => current.tankLevel === 4, "Tank upgrade to level 4 failed.");
  tankPatternIds.push(state.tankPattern.id);
  await evaluate(cdp, "window.__aquariumTest.addWallet('superRare', 5)");
  await evaluate(cdp, "window.__aquariumTest.upgradeTank()");
  state = await waitFor(cdp, (current) => current.tankLevel === 5, "Tank upgrade to level 5 failed.");
  tankPatternIds.push(state.tankPattern.id);
  assert(state.maxFishCapacity === 30, "Level 5 tank should expose the largest fish capacity.");
  assert(
    state.tankWorldBounds.width > gameWidth &&
      Math.abs(state.tankScreenEdges.left) < 1 &&
      Math.abs(state.tankScreenEdges.right - gameWidth) < 1,
    "Level 5 tank should show a larger world while keeping the aquarium full-width."
  );
  await evaluate(cdp, `window.__aquariumTest.forceFishAge(0, ${fullyGrownAgeSeconds})`);
  state = await waitFor(
    cdp,
    (current) =>
      current.tankLevel === 5 &&
      current.fish[0].ageLabel === "50y" &&
      !current.fish[0].growthBlockedByTank &&
      current.fish[0].scale >= current.fish[0].veryBigScaleCap - 0.02 &&
      current.fish[0].statusBars.fullyGrown,
    "Level 5 tank should let a 50-year fish reach the very-big cap."
  );
  await captureNamedScreenshot(cdp, "fish-age-50y-growth.png");
  await evaluate(cdp, "window.__aquariumTest.forceFishAge(0, 0)");
  assert(
    new Set(["lagoon-ripples", "kelp-stripes", ...tankPatternIds]).size === state.fishCatalogMaxLevel,
    "Each tank level should expose a distinct background pattern."
  );
  await captureNamedScreenshot(cdp, "tank-level-5-pattern.png");
  assert(state.nextTankUpgradePrice?.coinType === "superRare" && state.nextTankUpgradePrice.amount === 5, "Level 5 tank should still expose the level-6 upgrade price.");
  const superRareBeforeInfiniteUpgrade = state.wallet.superRare;
  await evaluate(cdp, "window.__aquariumTest.addWallet('superRare', 5)");
  await evaluate(cdp, "window.__aquariumTest.upgradeTank()");
  state = await waitFor(
    cdp,
    (current) =>
      current.tankLevel === 6 &&
      current.maxTankLevel === null &&
      current.tankCanUpgradeIndefinitely &&
      current.maxFishCapacity === 36 &&
      current.wallet.superRare === superRareBeforeInfiniteUpgrade &&
      current.nextTankUpgradePrice?.coinType === "superRare" &&
      current.nextTankUpgradePrice.amount === 8,
    "Tank should upgrade beyond level 5 with formula prices and growing capacity."
  );
  await captureNamedScreenshot(cdp, "tank-level-6-infinite-upgrade.png");
  assert(state.decorations.length === 1, "Decoration should still be available before trash drag coverage.");
  await dragGame(
    cdp,
    state.decorations[0].x,
    state.decorations[0].y,
    state.decorationTrashTarget.x,
    state.decorationTrashTarget.y
  );
  state = await waitFor(cdp, (current) => current.decorationCount === 0, "Dragging a decoration to the trash target should remove it.");
  await captureNamedScreenshot(cdp, "decoration-trashed.png");

  await evaluate(cdp, "window.__aquariumTest.setScreen('store')");
  await evaluate(cdp, "window.__aquariumTest.setStoreTab('creature')");
  state = await waitFor(
    cdp,
    (current) => current.activeScreen === "store" && current.activeTab === "creature" && current.helperCreatureTypeCount === 4,
    "Helper creature store tab did not open."
  );
  await evaluate(cdp, "window.__aquariumTest.setScreen('tank')");
  const walletBeforeHelper = state.wallet.common;
  await evaluate(cdp, "window.__aquariumTest.buyHelperCreature('shrimp')");
  state = await waitFor(
    cdp,
    (current) =>
      current.helperCreatureCount === 1 &&
      current.maxHelperCreatures === 5 &&
      current.wallet.common === walletBeforeHelper - 80 &&
      current.helperCreatures[0]?.typeId === "shrimp",
    "Buying a helper creature should auto-add it to the tank floor."
  );
  await evaluate(cdp, "window.__aquariumTest.setHelperCreaturePosition(0, 215)");
  await evaluate(cdp, "window.__aquariumTest.clearCoins()");
  const walletBeforeHelperCoin = state.wallet.common;
  await evaluate(cdp, `window.__aquariumTest.addCoin('common', 4, 215, ${state.tankWorldBounds.bottom - 16})`);
  state = await waitFor(
    cdp,
    (current) => current.wallet.common >= walletBeforeHelperCoin + 4 && current.coinDropCount === 0,
    "Helper creature should collect settled coins from the bottom.",
    4500
  );
  const cleanlinessBeforeHelperFood = state.cleanliness;
  await evaluate(cdp, "window.__aquariumTest.addFood('basic', 1)");
  await evaluate(cdp, "window.__aquariumTest.setFoodTool('basic')");
  await clickGame(cdp, 215, 828);
  state = await waitFor(
    cdp,
    (current) => current.foodCount === 0 && current.cleanliness >= cleanlinessBeforeHelperFood - 2,
    "Helper creature should clean wasted food from the bottom.",
    5000
  );
  await captureNamedScreenshot(cdp, "helper-creature-cleanup.png");
  await evaluate(cdp, "window.__aquariumTest.setScreen('album')");
  state = await waitFor(
    cdp,
    (current) =>
      current.activeScreen === "album" &&
      current.helperCreatureCount === 1 &&
      current.helperCreatures[0]?.typeId === "shrimp" &&
      current.helperCreatures[0]?.sellPrice?.coinType === "common" &&
      current.helperCreatures[0]?.sellPrice?.amount === 52,
    "Book should show owned helper creatures with sell value."
  );
  await captureNamedScreenshot(cdp, "book-helper-creatures.png");
  const walletBeforeHelperSale = state.wallet.common;
  await evaluate(cdp, "window.__aquariumTest.sellHelperCreatureAt(0)");
  state = await waitFor(
    cdp,
    (current) => current.activeScreen === "album" && current.helperCreatureCount === 0 && current.wallet.common === walletBeforeHelperSale + 52,
    "Selling a helper from Book should remove it from the tank and pay its cleanup value."
  );
  await evaluate(cdp, "window.__aquariumTest.setScreen('tank')");
  await evaluate(cdp, "window.__aquariumTest.clearHelperCreatures()");
  await evaluate(cdp, "window.__aquariumTest.clearFoods()");
  await evaluate(cdp, "window.__aquariumTest.addFood('basic', 1)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 62, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 300, 720)");
  state = await waitFor(cdp, (current) => (current.foodInventoryByType.basic ?? 0) >= 1, "Feeder helper food stock setup failed.");
  await evaluate(cdp, "window.__aquariumTest.addCoin('common', 5, 32, 828)");
  state = await waitFor(cdp, (current) => current.coinDropCount >= 1, "Feeder helper nearby coin setup failed.");
  const feederFoodBefore = state.foodInventoryByType.basic ?? 0;
  await evaluate(cdp, "window.__aquariumTest.addHelperCreatureForTest('feeder-snail', 10)");
  state = await waitFor(
    cdp,
    (current) =>
      current.helperCreatureCount === 1 &&
      current.helperCreatures[0]?.typeId === "feeder-snail" &&
      current.helperCreatures[0]?.feedSeconds === 5 &&
      (current.foodInventoryByType.basic ?? 0) === feederFoodBefore - 1 &&
      current.coinDropCount >= 1 &&
      current.foodCount > 0 &&
      Math.hypot(current.foods[0].x - current.fish[0].x, current.foods[0].y - current.fish[0].y) > 70,
    "Feeder helper should climb the wall and throw food for fish to chase before collecting nearby coins.",
    10000
  );
  await captureNamedScreenshot(cdp, "helper-creature-feeding.png");
  await evaluate(cdp, "window.__aquariumTest.clearHelperCreatures()");
  await evaluate(cdp, "window.__aquariumTest.clearFoods()");
  state = await waitFor(cdp, (current) => current.helperCreatureCount === 0, "Helper creature cleanup for final regression state failed.");
  await evaluate(cdp, "window.__aquariumTest.setScreen('care')");
  state = await waitFor(
    cdp,
    (current) => current.activeScreen === "care" && current.tankLevel === 6 && current.maxFishCapacity === 36,
    "Care screen should show the upgraded tank capacity."
  );
  await captureNamedScreenshot(cdp, "tank-level-6-capacity.png");
  await evaluate(cdp, "window.__aquariumTest.setScreen('tank')");
  state = await waitFor(cdp, (current) => current.activeScreen === "tank", "Returning to tank after capacity screenshot failed.");

  return state;
}

async function capturePortraitLayouts(cdp) {
  const layouts = [
    { width: 390, height: 844 },
    { width: 393, height: 852 },
    { width: 412, height: 915 },
    { width: 430, height: 932 }
  ];
  const screenshots = [];

  for (const layout of layouts) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: layout.width,
      height: layout.height,
      deviceScaleFactor: 1,
      mobile: true
    });
    await delay(250);
    const screenshot = await cdp.send("Page.captureScreenshot", { format: "png" });
    const fileName = `portrait-${layout.width}x${layout.height}.png`;
    await writeFile(path.join(artifactDir, fileName), Buffer.from(screenshot.data, "base64"));
    screenshots.push(path.join("artifacts", fileName));
  }

  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: gameWidth,
    height: gameHeight,
    deviceScaleFactor: 1,
    mobile: true
  });

  return screenshots;
}

async function main() {
  const appPort = await getFreePort();
  const debugPort = await getFreePort();
  const profileDir = await mkdtemp(path.join(tmpdir(), "aquarium-chrome-"));
  const viteBin = path.join(root, "node_modules", ".bin", "vite");
  const chromeBin = findChrome();
  const appUrl = `http://127.0.0.1:${appPort}/`;

  const vite = spawn(viteBin, ["--host", "127.0.0.1", "--port", String(appPort), "--strictPort"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"]
  });

  let chrome;
  try {
    await waitForHttp(appUrl);

    chrome = spawn(
      chromeBin,
      [
        "--headless=new",
        `--remote-debugging-port=${debugPort}`,
        `--user-data-dir=${profileDir}`,
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-networking",
        `--window-size=${gameWidth},${gameHeight}`,
        appUrl
      ],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    const cdp = await connectToChrome(debugPort);
    await cdp.send("Runtime.enable");
    await cdp.send("Page.enable");
    await cdp.send("Input.setIgnoreInputEvents", { ignore: false });
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: gameWidth,
      height: gameHeight,
      deviceScaleFactor: 1,
      mobile: true
    });

    const loadEvent = cdp.once("Page.loadEventFired").catch(() => undefined);
    await cdp.send("Page.navigate", { url: appUrl });
    await loadEvent;
    await waitForTestHook(cdp);

    await mkdir(artifactDir, { recursive: true });
    const finalState = await runRegression(cdp, appUrl);
    await captureNamedScreenshot(cdp, "regression-smoke.png");
    const portraitScreenshots = await capturePortraitLayouts(cdp);

    console.log("Regression smoke test passed.");
    console.log(
      JSON.stringify(
        {
          finalState,
          screenshot: path.join("artifacts", "regression-smoke.png"),
          portraitScreenshots
        },
        null,
        2
      )
    );
  } finally {
    chrome?.kill("SIGTERM");
    vite.kill("SIGTERM");
    await rm(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
