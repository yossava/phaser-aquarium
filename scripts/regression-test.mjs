import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";

const root = process.cwd();
const gameWidth = 430;
const gameHeight = 844;
const artifactDir = path.join(root, "artifacts");
const fishCatalog = JSON.parse(readFileSync(path.join(root, "src", "data", "fish-types.json"), "utf8"));
const foodCatalog = JSON.parse(readFileSync(path.join(root, "src", "data", "food-types.json"), "utf8"));
const decorationCatalog = JSON.parse(readFileSync(path.join(root, "src", "data", "decoration-types.json"), "utf8"));
const helperCatalog = JSON.parse(readFileSync(path.join(root, "src", "data", "helper-creature-types.json"), "utf8"));
const supplyFoodIds = new Set(["medicine", "ageBoost", "productionBoost", "timeCurrent"]);
const hiddenFoodIds = new Set(["creature"]);
const catalogCountByCoin = (items, coinType) => items.filter((item) => item.price.coinType === coinType).length;
const visibleFishFoodCatalogCount = 7 * 4;
const catalogItemById = (items, id) => {
  const item = items.find((candidate) => candidate.id === id);
  assert(item, `Missing catalog item ${id}`);
  return item;
};
const secondsPerFishMonth = 60 * 60;
const secondsPerFishYear = secondsPerFishMonth * 12;
const twentyDayAgeSeconds = secondsPerFishMonth * (20 / 30);
const fourMonthAgeSeconds = secondsPerFishMonth * 4;
const sevenMonthAgeSeconds = secondsPerFishMonth * 7;
const goldfishAdultAgeSeconds = secondsPerFishYear;
const fullyGrownAgeSeconds = secondsPerFishYear * 50;
const runtimeBasicFoodPrice = 20;
const runtimeBasicFoodCalories = 1200;

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
      ageLabel: fish.ageLabel,
      scale: Number(fish.scale?.toFixed?.(3) ?? fish.scale),
      naturalAgeScale: Number(fish.naturalAgeScale?.toFixed?.(3) ?? fish.naturalAgeScale),
      tankGrowthScaleCap: Number(fish.tankGrowthScaleCap?.toFixed?.(3) ?? fish.tankGrowthScaleCap),
      displayWidth: Number(fish.displayWidth?.toFixed?.(1) ?? fish.displayWidth),
      fullyGrown: fish.statusBars?.fullyGrown,
      growthBlockedByTank: fish.growthBlockedByTank,
      statusGrowthBlockedByTank: fish.statusBars?.growthBlockedByTank,
      emoji: fish.statusBars?.emoji,
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
  const canvasResolution = await evaluate(
    cdp,
    `(() => {
      const canvas = document.querySelector("canvas");
      const rect = canvas.getBoundingClientRect();
      return { width: canvas.width, height: canvas.height, cssWidth: rect.width, cssHeight: rect.height, devicePixelRatio: window.devicePixelRatio };
    })()`
  );
  assert(state.renderScale >= 2, "High-DPI render scale should use the capped device pixel ratio in mobile portrait tests.");
  assert(canvasResolution.width >= gameWidth * 2 && canvasResolution.height >= gameHeight * 2, "Canvas backing resolution should be at least 2x the design size.");
  assert(Math.round(canvasResolution.cssWidth) === gameWidth && Math.round(canvasResolution.cssHeight) === gameHeight, "Canvas CSS size should stay at the portrait design size.");
  assert(state.numberFormatSamples.small === "999", "Small numbers should render without a suffix.");
  assert(state.numberFormatSamples.thousand === "24.7K", "Thousands should render with one K digit.");
  assert(state.numberFormatSamples.million === "67.8M", "Millions should render with one M digit.");
  assert(state.numberFormatSamples.billion === "1.2B", "Billions should render with one B digit.");
  assert(state.tankHudText.includes("W:"), "Tank HUD should expose wallet and total wealth.");
  assert(state.tankStatusText.includes("Lv1") && !state.tankStatusText.includes("Fish") && !state.tankStatusText.includes("Coin"), "Tank status should expose tank level without fish or coin capacity text.");
  assert(state.tankCareText.includes("Clean") && state.tankCareText.includes("Happy"), "Tank care status should visibly expose cleanliness and happiness.");
  assert(
    state.assetCoverage.fish < state.fishTypeCount,
    "Fish texture assets should be lazy-loaded instead of preloading the whole catalog."
  );
  assert(state.assetCoverage.food >= 12, "All food, medicine, and supply types should have loaded custom asset textures.");
  assert(state.assetCoverage.decorations >= 12, "Decoration catalog should have the expanded custom asset set.");
  assert(state.assetCoverage.coins === 3, "All three coin types should have loaded custom asset textures.");
  assert(state.assetCoverage.uiIcons >= 9, "All menu icons and shared prompt-pack HUD/button UI skin textures should load.");
  assert(state.assetCoverage.helpers === 5, "All helper creatures should have loaded custom asset textures.");
  assert(state.assetCoverage.backgrounds >= 2, "The prompt-pack sand floor and underwater background assets should load.");
  assert(!state.dirtyTankOverlay.visible && state.dirtyTankOverlay.alpha === 0, "Dirty tank overlay should stay hidden while the tank is clean.");
  await evaluate(cdp, "window.__aquariumTest.setCleanliness(19)");
  state = await waitFor(
    cdp,
    (current) => current.dirtyTankOverlay.visible && current.dirtyTankOverlay.alpha > 0,
    "Dirty tank tint should appear once cleanliness drops below the dirty-water threshold."
  );
  assert(state.dirtyTankOverlay.displayWidth === gameWidth && state.dirtyTankOverlay.displayHeight === gameHeight, "Dirty tank tint should cover the portrait tank screen.");
  await captureNamedScreenshot(cdp, "dirty-tank-tint.png");
  await evaluate(cdp, "window.__aquariumTest.setCleanliness(73)");
  state = await waitFor(
    cdp,
    (current) => !current.dirtyTankOverlay.visible && current.dirtyTankOverlay.alpha === 0,
    "Dirty tank overlay should hide above the dirty-water threshold."
  );

  await evaluate(cdp, "window.__aquariumTest.setScreen('store')");
  state = await waitFor(
    cdp,
    (current) =>
      current.activeScreen === "store" &&
      current.activeTab === "fish" &&
      current.storeCoinFilter === "common" &&
      current.visibleStoreCatalogCount === catalogCountByCoin(fishCatalog, "common"),
    "Store should open on the common fish lane."
  );
  await captureNamedScreenshot(cdp, "store-buy-only-fish-catalog.png");
  await evaluate(cdp, "window.__aquariumTest.setStoreCoinFilter('rare')");
  state = await waitFor(
    cdp,
    (current) =>
      current.activeTab === "fish" &&
      current.storeCoinFilter === "rare" &&
      current.visibleStoreCatalogCount === catalogCountByCoin(fishCatalog, "rare"),
    "Fish store rare lane should show all rare fish without tank-level gating."
  );
  await evaluate(cdp, "window.__aquariumTest.setStoreTab('food')");
  state = await waitFor(
    cdp,
    (current) =>
      current.activeTab === "food" &&
      current.storeCoinFilter === "rare" &&
      current.visibleStoreCatalogCount === visibleFishFoodCatalogCount,
    "Food store should show every fish food without rarity filtering."
  );
  await evaluate(cdp, "window.__aquariumTest.setStoreCoinFilter('superRare')");
  state = await waitFor(
    cdp,
    (current) =>
      current.activeTab === "food" &&
      current.storeCoinFilter === "superRare" &&
      current.visibleStoreCatalogCount === visibleFishFoodCatalogCount,
    "Food store super rare filter should not hide common-priced food."
  );
  await evaluate(cdp, "window.__aquariumTest.setStoreTab('decor')");
  state = await waitFor(
    cdp,
    (current) =>
      current.activeTab === "decor" &&
      current.storeCoinFilter === "superRare" &&
      current.visibleStoreCatalogCount === catalogCountByCoin(decorationCatalog, "superRare"),
    "Decoration store super rare lane should show premium decorations."
  );
  await captureNamedScreenshot(cdp, "decor-asset-catalog.png");
  await evaluate(cdp, "window.__aquariumTest.setStoreTab('creature')");
  await evaluate(cdp, "window.__aquariumTest.setStoreCoinFilter('common')");
  state = await waitFor(
    cdp,
    (current) =>
      current.activeTab === "creature" &&
      current.storeCoinFilter === "common" &&
      current.visibleStoreCatalogCount === catalogCountByCoin(helperCatalog, "common"),
    "Helper store common lane should show starter and feeder helpers."
  );
  await evaluate(cdp, "window.__aquariumTest.setStoreCoinFilter('rare')");
  state = await waitFor(
    cdp,
    (current) =>
      current.activeTab === "creature" &&
      current.storeCoinFilter === "rare" &&
      current.visibleStoreCatalogCount === catalogCountByCoin(helperCatalog, "rare"),
    "Helper store rare lane should show rare helpers."
  );
  await evaluate(cdp, "window.__aquariumTest.setStoreCoinFilter('superRare')");
  state = await waitFor(
    cdp,
    (current) =>
      current.activeTab === "creature" &&
      current.storeCoinFilter === "superRare" &&
      current.visibleStoreCatalogCount === catalogCountByCoin(helperCatalog, "superRare"),
    "Helper store super rare lane should show super rare helper."
  );
  await evaluate(cdp, "window.__aquariumTest.setStoreTab('fish')");
  await evaluate(cdp, "window.__aquariumTest.setStoreCoinFilter('common')");
  const goldfishWalletBefore = state.wallet.common;
  await evaluate(cdp, "window.__aquariumTest.buyFish('goldfish')");
  await evaluate(cdp, "window.__aquariumTest.placeFishFromInventory('goldfish', 215, 450)");
  state = await waitFor(
    cdp,
    (current) => current.wallet.common < goldfishWalletBefore && current.fishCount === 1 && current.placementMode === "none",
    "Buying a goldfish should add it directly to the tank."
  );
  state = await waitFor(
    cdp,
    (current) => current.fish[0]?.textureKey?.startsWith("fish-goldfish"),
    "Bought goldfish texture did not finish lazy-loading."
  );
  const goldfishPrice = goldfishWalletBefore - state.wallet.common;
  assert(state.maxFishCapacity === 4, "Level 1 tank should support 4 fish slots.");
  assert(
      state.tankLevel === 1 &&
      state.activeTankSlot === 1 &&
      state.ownedTankCount === 1 &&
      state.maxOwnedTanks === 1 &&
      state.tankSlotsAreIsolated &&
      !state.tankCanUpgradeIndefinitely,
    "Fresh game should start in the active tank slot with isolated tank progression."
  );
  assert(state.nextTankUpgradePrice?.coinType === "common" && state.nextTankUpgradePrice.amount === 0, "Fresh tank should not expose another tank-slot purchase price.");
  assert(state.tankViewScale === 1, "Tank slots should use the fixed full-screen tank view.");
  assert(state.tankWorldBounds.width === gameWidth && state.tankWorldBounds.height === gameHeight, "Level 1 tank world should match the portrait viewport.");
  assert(
    Math.abs(state.tankScreenEdges.left) < 1 &&
      Math.abs(state.tankScreenEdges.top) < 1 &&
      Math.abs(state.tankScreenEdges.right - gameWidth) < 1 &&
      Math.abs(state.tankScreenEdges.bottom - gameHeight) < 1,
    "Level 1 tank should fill the portrait screen edges."
  );
  assert(state.fishTypeCount >= 90, "Fish catalog should include the expanded generated fish set.");
  assert(state.visibleFishCatalogCount >= 30, "Common fish catalog should show the expanded common fish set.");
  const visibleFishPreviewStates = state.visibleFishCatalogPreviewStates ?? [];
  const revealedFishPreviewStates = visibleFishPreviewStates.filter((preview) => preview.revealed);
  const lockedFishPreviewStates = visibleFishPreviewStates.filter((preview) => !preview.revealed);
  assert(
    visibleFishPreviewStates.length === state.visibleFishCatalogCount &&
      visibleFishPreviewStates[0]?.id === "goldfish" &&
      revealedFishPreviewStates.length === 8 &&
      revealedFishPreviewStates.every((preview) => preview.textureKey.startsWith("fish-")) &&
      lockedFishPreviewStates.every((preview) => preview.requiredLevel > state.tankLevel),
    "Current tank level fish should resolve to real previews while higher-level fish remain gated."
  );
  await captureNamedScreenshot(cdp, "fish-store-card-images.png");
  assert(state.totalWealth > state.wallet.common, "Total wealth should include wallet and owned tank assets.");
  assert(state.fish[0].state === "happy", "New fish should start happy.");
  assert(state.fish[0].typeId === "goldfish" && state.fish[0].typeName === "Goldfish", "Fish snapshot should expose type identity for stats pages.");
  assert(state.fish[0].textureKey.startsWith("fish-goldfish"), "Goldfish should use the custom fish asset texture.");
  assert(state.fish[0].gender === "M" || state.fish[0].gender === "F", "New fish should receive a gender.");
  assert(state.fish[0].ageStage === undefined && state.fish[0].ageCategory === undefined, "Fish snapshot should not expose size or age-stage categories.");
  assert(state.fish[0].ageLabel === "0d", "New fish should expose fish-time age days instead of real seconds.");
  assert(state.fish[0].ageMonths < 0.01 && state.fish[0].growthCapAgeYears === 50, "Fish age should use 1 real hour per fish month and cap growth at 50 years.");
  assert(state.fish[0].lengthCm > 0 && state.fish[0].weightGrams > 0, "Fish snapshot should expose age-rooted length and weight.");
  assert(state.fish[0].lengthCm >= 20, "Fish length labels should use the larger 10x fantasy centimeter scale.");
  assert(state.fish[0].lengthLabel.endsWith(" cm") && / (g|kg)$/.test(state.fish[0].weightLabel), "Fish size labels should use readable metric units.");
  assert(!state.fish[0].statusBars.careBarsVisible, "Fish care bars should stay hidden while fullness and health are both above 50%.");
  assert(state.fish[0].statusBars.y < state.fish[0].y, "Fish alert markers should sit above the fish when shown.");
  assert(state.fish[0].statusBars.fullnessRatio > 0.8 && state.fish[0].statusBars.moodRatio > 0.9, "Fish status bars should show full as good for fullness and mood.");
  assert(state.fish[0].statusBars.tailTint === 0xffb13b, "Goldfish tail should use the same visual color as its preferred basic food.");
  assert(state.fish[0].statusBars.rarityStars === 0, "Fish should not render above-fish rarity star badges in the tank.");
  assert(!state.fish[0].statusBars.fullyGrown, "New fish should not show the fully grown marker.");
  assert(!state.fish[0].statusBars.emojiVisible && !state.fish[0].statusBars.emojiBubbleVisible, "Happy emoji should not show until the fish eats.");
  await evaluate(cdp, "window.__aquariumTest.addFood('timeCurrent', 1)");
  state = await waitFor(
    cdp,
    (current) => current.foodInventoryByType.timeCurrent === 1,
    "Time Current should be stored as an inventory supply."
  );
  const boostedAgeBefore = state.fish[0].ageSeconds;
  await evaluate(cdp, "window.__aquariumTest.useTimeCurrentForTest()");
  state = await waitFor(
    cdp,
    (current) =>
      current.tankActivitySpeedMultiplier === 2 &&
      current.timeCurrentRemainingSeconds > 590 &&
      current.foodInventoryByType.timeCurrent === undefined,
    "Using Time Current should consume one item and activate x2 tank speed."
  );
  await delay(500);
  state = await snapshot(cdp);
  assert(state.fish[0].ageSeconds - boostedAgeBefore > 0.7, "Time Current should speed up active fish age progression.");
  const prizeFishInventoryBefore = state.fishInventoryByType.angelfish ?? 0;
  const prizeFishBubbleCountBefore = state.fishDeliveryBubbleCount;
  await evaluate(cdp, "window.__aquariumTest.awardPrizeFishForTest('angelfish')");
  state = await waitFor(
    cdp,
    (current) =>
      (current.fishInventoryByType.angelfish ?? 0) === prizeFishInventoryBefore + 1 &&
      current.fishDeliveryBubbleCount === prizeFishBubbleCountBefore &&
      current.fishCount === 1,
    "Prize fish reward should be stored in inventory without a delivery bubble."
  );
  const swimSampleA = {
    x: state.fish[0].x,
    y: state.fish[0].y,
    displayWidth: state.fish[0].displayWidth,
    displayHeight: state.fish[0].displayHeight,
    rotation: state.fish[0].rotation
  };
  await delay(450);
  state = await snapshot(cdp);
  assert(
    Math.hypot(state.fish[0].x - swimSampleA.x, state.fish[0].y - swimSampleA.y) > 0.25,
    "Fish should visibly swim through the tank instead of staying frozen in place."
  );
  assert(
    !state.fish[0].tailAnimation.visible,
    "Raster fish should not draw an extra tail overlay."
  );
  await evaluate(cdp, "window.__aquariumTest.addFishForTest('angelfish', 210, 355)");
  await evaluate(cdp, "window.__aquariumTest.addFishForTest('celestial-koi', 250, 470)");
  await evaluate(cdp, "window.__aquariumTest.clearCoins()");
  await evaluate(cdp, "window.__aquariumTest.clearFoods()");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 280, 610)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(1, 215, 330)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(2, 250, 455)");
  state = await waitFor(
    cdp,
    (current) =>
      current.fishCount === 3 &&
      current.fish.some((fish) => fish.typeId === "angelfish" && fish.textureKey.startsWith("fish-angelfish")) &&
      current.fish.some((fish) => fish.typeId === "celestial-koi" && fish.textureKey.startsWith("fish-celestial-koi")),
    "The three trial fish asset textures should render for common, rare, and super rare fish."
  );
  await evaluate(cdp, "window.__aquariumTest.setScreen('tank')");
  state = await waitFor(cdp, (current) => current.activeScreen === "tank" && current.fishCount === 3, "Trial fish asset screenshot should capture the tank view.");
  await delay(1500);
  await captureNamedScreenshot(cdp, "fish-asset-trial-pack.png");
  await evaluate(cdp, "window.__aquariumTest.removeFishAt(2)");
  await evaluate(cdp, "window.__aquariumTest.removeFishAt(1)");
  state = await waitFor(cdp, (current) => current.fishCount === 1, "Trial fish cleanup should return the tank to one goldfish.");
  assert(
    state.fish[0].productionOptions.every((production) => production.coinType === "common"),
    "Common fish should keep common-coin production; rare currency now comes from higher-rarity fish, quests, and rewarded ads."
  );
  await captureNamedScreenshot(cdp, "common-fish-production.png");
  const freshMovementSizeMultiplier = state.fish[0].movementSizeMultiplier;
  assert(freshMovementSizeMultiplier > 0.95, "New fish should move at nearly full size-based speed.");
  const freshScale = state.fish[0].scale;
  const freshLengthCm = state.fish[0].lengthCm;
  const freshWeightGrams = state.fish[0].weightGrams;
  const freshCalorieNeedMultiplier = state.fish[0].calorieNeedMultiplier;
  const freshMealCaloriesNeeded = state.fish[0].mealCaloriesNeeded;
  assert(freshCalorieNeedMultiplier > 0 && freshMealCaloriesNeeded > 0, "Fresh fish should expose a size-based food calorie need.");
  const freshSellValue = state.fish[0].sellValue;
  assert(freshSellValue < goldfishPrice, "Freshly bought fish should sell below purchase price.");
  await evaluate(cdp, `window.__aquariumTest.forceFishAge(0, ${sevenMonthAgeSeconds})`);
  await evaluate(cdp, "window.__aquariumTest.addFishForTest('angelfish', 165, 420)");
  await evaluate(cdp, `window.__aquariumTest.forceFishAge(1, ${twentyDayAgeSeconds})`);
  state = await waitFor(
    cdp,
    (current) => {
      const sevenMonthGoldfish = current.fish.find((fish) => fish.typeId === "goldfish");
      const twentyDayAngelfish = current.fish.find((fish) => fish.typeId === "angelfish");
      return (
        current.fishCount === 2 &&
        Math.round(sevenMonthGoldfish?.ageMonths ?? 0) === 7 &&
        Math.round((twentyDayAngelfish?.ageMonths ?? 0) * 30) === 20 &&
        (sevenMonthGoldfish?.displayWidth ?? 0) > (twentyDayAngelfish?.displayWidth ?? Number.POSITIVE_INFINITY) * 1.6 &&
        (sevenMonthGoldfish?.displayHeight ?? 0) > (twentyDayAngelfish?.displayHeight ?? Number.POSITIVE_INFINITY) * 1.08
      );
    },
    "A seven-month goldfish should read clearly larger than a twenty-day angelfish."
  );
  await evaluate(cdp, "window.__aquariumTest.setScreen('tank')");
  await delay(900);
  await captureNamedScreenshot(cdp, "fish-age-comparison-7mo-vs-20d.png");
  await evaluate(cdp, "window.__aquariumTest.removeFishAt(1)");
  await evaluate(cdp, "window.__aquariumTest.forceFishAge(0, 0)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 12, 100)");

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
  assert(
    state.fish[0].mealCaloriesNeeded > freshMealCaloriesNeeded,
    "Larger fish should need larger meals as its calorie needs increase."
  );
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
      !current.fish[0].growthBlockedByTank &&
      !current.fish[0].statusBars.growthBlockedByTank &&
      current.fish[0].statusBars.fullyGrown &&
      current.fish[0].naturalAgeScale > current.fish[0].tankGrowthScaleCap &&
      Math.abs(current.fish[0].scale - current.fish[0].tankGrowthScaleCap) < 0.02 &&
      !current.tankNeedIndicator.includes("L2") &&
      current.fish[0].statusBars.emoji !== "😣" &&
      current.fish[0].lengthCm > freshLengthCm * 3 &&
      current.fish[0].weightGrams > freshWeightGrams * 20 &&
      current.fish[0].mealCaloriesNeeded > freshMealCaloriesNeeded * 3,
    "Very old fish should respect the screen-size cap without asking for a larger tank."
  );
  await evaluate(cdp, "window.__aquariumTest.setScreen('tank')");
  state = await waitFor(cdp, (current) => current.activeScreen === "tank", "Returning to tank for screen-cap growth visual failed.");
  await delay(1200);
  await captureNamedScreenshot(cdp, "fish-growth-screen-cap.png");
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

  const foodBeforeBuy = state.foodInventoryByType.basic ?? 0;
  const commonBeforeFoodBuy = state.wallet.common;
  const basicFoodPrice = runtimeBasicFoodPrice;
  await evaluate(cdp, "window.__aquariumTest.buyFood('basic')");
  state = await waitFor(
    cdp,
    (current) => current.wallet.common === commonBeforeFoodBuy - basicFoodPrice && current.foodInventoryByType.basic === foodBeforeBuy + runtimeBasicFoodCalories,
    "Buying food failed."
  );

  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 218, 248)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 92, 100)");
  await evaluate(cdp, "window.__aquariumTest.setScreen('tank')");
  state = await waitFor(
    cdp,
    (current) =>
      current.fish[0].state === "hungry" &&
      current.fish[0].hunger >= 90,
    "Hungry fish should enter the hungry state before eating."
  );
  const hungryBeforeFeeding = state.fish[0].hunger;
  await evaluate(cdp, "window.__aquariumTest.setFishContinuousHungerSeconds(0, 299)");
  state = await waitFor(cdp, (current) => current.fish[0].state === "hungry", "Fish should not become sick before five continuous hungry minutes.");
  await evaluate(cdp, "window.__aquariumTest.setFishContinuousHungerSeconds(0, 300)");
  state = await waitFor(cdp, (current) => current.fish[0].state === "ill", "Fish should become sick after five continuous hungry minutes.");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 92, 100)");
  await captureNamedScreenshot(cdp, "fish-hungry-bubble.png");
  const basicCaloriesBeforeFeeding = state.foodInventoryByType.basic ?? 0;
  await evaluate(cdp, "window.__aquariumTest.dropStockedFoodForTest('basic', 260, 250)");
  state = await waitFor(
    cdp,
    (current) =>
      (current.foodInventoryByType.basic ?? 0) < basicCaloriesBeforeFeeding &&
      (current.foodInventoryByType.basic ?? 0) >= basicCaloriesBeforeFeeding - runtimeBasicFoodCalories &&
      current.foodCount === 0 &&
      current.fish[0].hunger < 70,
    "Hungry fish did not eat dropped food."
  );
  const freshBasicFedHunger = state.fish[0].hunger;
  await captureNamedScreenshot(cdp, "fish-happy-after-eat-bubble.png");
  await delay(500);
  state = await snapshot(cdp);
  assert(state.fish[0].hunger < hungryBeforeFeeding, "Fish hunger should improve after eating.");
  assert(state.fish[0].state !== "ill", "Fish should not remain sick after eating compatible food.");

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
	      current.fish[0].hunger > 85 &&
	      current.fish[0].statusBars.emoji.startsWith("need "),
	    "Same basic food should satisfy a very large fish much less than an age-zero fish and show the needed calories."
	  );
  await evaluate(cdp, "window.__aquariumTest.forceFishAge(0, 0)");

  await evaluate(cdp, "window.__aquariumTest.addFood('basic', 1)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 110, 248)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 18, 100)");
  await evaluate(cdp, "window.__aquariumTest.dropFoodForTest('basic', 330, 248)");
  state = await waitFor(
    cdp,
    (current) => current.foodCount === 0 && current.fish[0].hunger < 18,
    "Partly full fish did not aggressively chase and eat compatible food.",
    4200
  );

  await evaluate(cdp, "window.__aquariumTest.clearCoins()");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 42, 20)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 225, 810)");
  state = await waitFor(cdp, (current) => current.fishCount === 1 && current.coinDropCount === 0, "Sick/hungry production setup should start without passive coins.");
  await captureNamedScreenshot(cdp, "fish-sick-emoji.png");
  await evaluate(cdp, "window.__aquariumTest.addCoin('common', 1, 225, 760)");
  state = await waitFor(
    cdp,
    (current) => current.coinsWaiting.some((coin) => coin.atBottom && coin.y >= coin.bottomY - 0.5),
    "Coin did not sink all the way to the tank bottom.",
    7000
  );
  await captureNamedScreenshot(cdp, "coin-bottom.png");
  const commonBeforeCoin = state.wallet.common;
  const settledCoin = state.coinsWaiting.find((coin) => coin.atBottom && coin.y >= coin.bottomY - 0.5) ?? state.coinsWaiting[0];
  await clickGame(cdp, settledCoin.x, settledCoin.y);
  state = await waitFor(cdp, (current) => current.wallet.common >= commonBeforeCoin + settledCoin.value, "Collecting a settled coin failed.");
  await evaluate(cdp, "window.__aquariumTest.clearCoins()");

  await evaluate(cdp, "window.__aquariumTest.addFood('medicine', 1)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 72, 22)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 120, 248)");
  await evaluate(cdp, "window.__aquariumTest.dropStockedFoodForTest('medicine', 330, 248)");
  state = await waitFor(
    cdp,
    (current) =>
      current.foodInventoryByType.medicine === undefined &&
      current.foodCount === 1 &&
      current.foods[0]?.foodType === "medicine" &&
      current.foods[0]?.textureKey === "food-medicine" &&
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

	  await evaluate(cdp, "window.__aquariumTest.addFoodDispenserForTest()");
	  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 360, 260)");
	  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 92, 100)");
	  await evaluate(cdp, "window.__aquariumTest.setFishContinuousHungerSeconds(0, 300)");
	  await evaluate(cdp, "window.__aquariumTest.clearFoods()");
	  await evaluate(cdp, "window.__aquariumTest.addFood('medicine', 1)");
	  state = await waitFor(cdp, (current) => current.fish[0].state === "ill", "Dispenser medicine setup should make the fish sick.");
	  state = await waitFor(
	    cdp,
	    (current) =>
	      current.foodCount === 1 &&
	      current.foods[0]?.foodType === "medicine" &&
	      current.foods[0]?.x < gameWidth * 0.22 &&
	      current.foods[0]?.y > gameHeight * 0.7 &&
	      current.foodInventoryByType.medicine === undefined,
	    "Food dispenser should release medicine from the rendered dispenser outlet when a fish is sick."
	  );
	  await delay(1200);
	  state = await waitFor(cdp, (current) => current.foodCount === 1 && current.foods[0]?.foodType === "medicine", "Food dispenser should wait for its active pellet to be eaten before releasing another.");
	  await captureNamedScreenshot(cdp, "food-dispenser-medicine.png");
	  await evaluate(cdp, "window.__aquariumTest.clearFoods()");
	  await evaluate(cdp, "window.__aquariumTest.removeFoodDispenserForTest()");
	  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 20, 100)");

	  const fatalCareLimitSeconds = 24 * 60 * 60;
  const almostFatalCareLimitSeconds = fatalCareLimitSeconds - 1;

  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 80, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFishContinuousHungerSeconds(0, 300)");
  await evaluate(cdp, `window.__aquariumTest.setFishFatalCareSeconds(0, ${almostFatalCareLimitSeconds})`);
  state = await waitFor(
    cdp,
    (current) => current.fishCount === 1 && current.fish[0].fatalCareSeconds >= 86399,
    "Sick fish fatal-care timer setup failed."
  );
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 20, 100)");
  state = await waitFor(
    cdp,
    (current) => current.fishCount === 1 && current.fish[0].fatalCareSeconds === 0,
    "Recovering from hunger should reset the 24-hour death timer."
  );
  await delay(1200);
  state = await snapshot(cdp);
  assert(state.fishCount === 1, "Recovered fish should not die from a cleared hunger timer.");

  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 80, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFishContinuousHungerSeconds(0, 300)");
  await evaluate(cdp, `window.__aquariumTest.setFishFatalCareSeconds(0, ${fatalCareLimitSeconds - 0.6})`);
  state = await waitFor(cdp, (current) => current.fishCount === 0, "Fish sick for 24 hours should die.", 3000);

  await evaluate(cdp, "window.__aquariumTest.addFishForTest('goldfish', 225, 420)");
  state = await waitFor(cdp, (current) => current.fishCount === 1, "Adding a fish for offline death coverage failed.");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 80, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFishContinuousHungerSeconds(0, 300)");
  await evaluate(cdp, `window.__aquariumTest.setFishFatalCareSeconds(0, ${fatalCareLimitSeconds - 1})`);
  await evaluate(cdp, "window.__aquariumTest.backdateSave(3600)");
  await reloadApp(cdp, appUrl);
  state = await waitFor(
    cdp,
    (current) => current.offlineProgress.elapsedSeconds >= 3500 && current.fishCount === 0,
    "Already-sick fish should die if its saved 24-hour timer finishes offline."
  );
  await evaluate(cdp, "window.__aquariumTest.closeModal()");

  await evaluate(cdp, "window.__aquariumTest.addFishForTest('goldfish', 225, 420)");
  state = await waitFor(cdp, (current) => current.fishCount === 1, "Adding a replacement fish after death coverage failed.");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 80, 100)");
  await evaluate(cdp, "window.__aquariumTest.clearCoins()");
  state = await waitFor(cdp, (current) => current.coinDropCount === 0, "Death coverage should leave an empty coin stack for happy coin coverage.");

  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 20, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 225, 810)");
  await evaluate(cdp, "window.__aquariumTest.addCoin('common', 1, 225, 760)");
  state = await waitFor(cdp, (current) => current.fish[0].state === "happy" && current.coinDropCount >= 1, "Happy coin sample did not appear.");
  assert(state.coinsWaiting[0].coinType === "common", "Goldfish should produce common coins.");
  state = await waitFor(
    cdp,
    (current) => current.coinsWaiting.some((coin) => coin.atBottom && coin.y >= coin.bottomY - 0.5),
    "Happy coin sample did not sink all the way to the tank bottom.",
    7000
  );
  const walletBeforeHappyCoinCollection = state.wallet.common;
  const settledHappyCoin = state.coinsWaiting.find((coin) => coin.atBottom && coin.y >= coin.bottomY - 0.5) ?? state.coinsWaiting[0];
  await clickGame(cdp, settledHappyCoin.x, settledHappyCoin.y);
  state = await waitFor(cdp, (current) => current.wallet.common === walletBeforeHappyCoinCollection + settledHappyCoin.value, "Collecting a coin failed.");
  await evaluate(cdp, "window.__aquariumTest.clearCoins()");
  state = await waitFor(cdp, (current) => current.coinDropCount === 0, "Happy coin cleanup failed.");
  const walletAfterHappyCoinCollection = state.wallet.common;
  const basicFoodBeforeSave = state.foodInventoryByType.basic;

  await evaluate(cdp, "window.__aquariumTest.saveNow()");
  await reloadApp(cdp, appUrl);
  state = await waitFor(
    cdp,
    (current) =>
      current.saved &&
      current.fishCount === 1 &&
      current.wallet.common === walletAfterHappyCoinCollection &&
      current.foodInventoryByType.basic === basicFoodBeforeSave,
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

  await evaluate(cdp, "window.__aquariumTest.clearFoods()");
  state = await snapshot(cdp);
  const walletBeforeProgressionTopUp = state.wallet.common;
  await evaluate(cdp, "window.__aquariumTest.addWallet('common', 2000)");
  state = await waitFor(
    cdp,
    (current) => current.wallet.common >= walletBeforeProgressionTopUp + 2000,
    "Progression setup wallet top-up failed."
  );

  await evaluate(cdp, "window.__aquariumTest.setScreen('store')");
  await evaluate(cdp, "window.__aquariumTest.setStoreTab('fish')");
  await evaluate(cdp, "window.__aquariumTest.setFishCatalogLevel(2)");
  await evaluate(cdp, "window.__aquariumTest.setStoreCoinFilter('common')");
  state = await waitFor(
    cdp,
    (current) =>
      current.storeCoinFilter === "common" &&
      current.visibleStoreCatalogCount === catalogCountByCoin(fishCatalog, "common"),
    "Common fish cards should use generated preview assets without fish-catalog level paging."
  );
  await captureNamedScreenshot(cdp, "common-fish-store-card-images.png");
  await evaluate(cdp, "window.__aquariumTest.setStoreCoinFilter('rare')");
  await evaluate(cdp, "window.__aquariumTest.addFishForTest('angelfish', 245, 470)");
  state = await waitFor(
    cdp,
    (current) =>
      current.fishCount === 2 &&
      current.activeFishCount === 2 &&
      current.tankLevel === 1 &&
      current.compatibilityScore === 100 &&
      !current.modalTitle,
    "Mixed species purchase should auto-add without tank-level gating."
  );
  assert(state.tankLevel === 1 && state.activeTankSlot === 1 && state.ownedTankCount === 1, "Current progression should stay in the single active tank slot.");
  assert(state.tankViewScale === 1, "Tank progression should not zoom the tank view.");
  assert(state.tankWorldBounds.width === gameWidth && state.tankWorldBounds.height === gameHeight, "Tank progression should keep the portrait world fixed.");
  assert(
    Math.abs(state.tankScreenEdges.left) < 1 &&
      Math.abs(state.tankScreenEdges.top) < 1 &&
      Math.abs(state.tankScreenEdges.right - gameWidth) < 1 &&
      Math.abs(state.tankScreenEdges.bottom - gameHeight) < 1,
    "Tank background, floor, and interaction space should still reach the screen edges."
  );
  assert(state.maxFishCapacity === 4, "The active tank should keep the four-fish capacity cap.");

  const sellValue = state.fish[0].sellValue;
  await evaluate(cdp, "window.__aquariumTest.setStoreTab('fish')");
  state = await waitFor(cdp, (current) => current.activeTab === "fish", "Fish tab did not activate before selling.");
  await evaluate(cdp, "window.__aquariumTest.sellFishAt(0)");
  state = await waitFor(
    cdp,
    (current) => current.fishCount === 1 && current.wallet.common >= state.wallet.common + sellValue,
    "Selling a placed fish failed."
  );

  await evaluate(cdp, "window.__aquariumTest.addFishForTest('goldfish', 350, 420)");
  state = await waitFor(cdp, (current) => current.fishCount === 2 && !current.modalTitle, "Adding a second fish for rare-sale coverage failed.");

  const rareSellValue = state.fish[0].sellValue;
  const commonWalletBeforeRareSale = state.wallet.common;
  await evaluate(cdp, "window.__aquariumTest.setScreen('store')");
  await evaluate(cdp, "window.__aquariumTest.sellFishAt(0)");
  state = await waitFor(
    cdp,
    (current) => current.fishCount === 1 && current.wallet.common >= commonWalletBeforeRareSale + rareSellValue,
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
      current.fish.some((fish) => fish.typeId === "goldfish" && fish.ageLabel === "0d"),
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
  await evaluate(cdp, "window.__aquariumTest.setScreen('tank')");
  const walletAfterSelling = state.wallet.common;

  await evaluate(cdp, "window.__aquariumTest.setStoreTab('decor')");
  state = await waitFor(cdp, (current) => current.activeTab === "decor", "Decor tab did not activate.");

  const plantDecorationPrice = 55;
  await evaluate(cdp, `window.__aquariumTest.addWallet('common', ${plantDecorationPrice})`);
  state = await waitFor(cdp, (current) => current.wallet.common >= walletAfterSelling + plantDecorationPrice, "Decoration purchase wallet top-up failed.");
  await evaluate(cdp, "window.__aquariumTest.buyDecoration('plant')");
  state = await waitFor(cdp, (current) => current.wallet.common === walletAfterSelling && current.placementMode === "decoration", "Buying plant decoration failed.");

  await clickGame(cdp, 215, 476);
  state = await waitFor(cdp, (current) => current.decorationCount === 1 && current.placementMode === "none", "Placing plant decoration failed.");
  assert(state.decorations[0]?.typeId === "plant", "Placed decoration snapshot should expose the decoration type.");
  const placedDecorationPosition = { x: state.decorations[0].x, y: state.decorations[0].y };
  await dragGame(cdp, state.decorations[0].x, state.decorations[0].y, 292, 560);
  state = await waitFor(
    cdp,
    (current) =>
      current.decorationCount === 1 &&
      Math.abs(current.decorations[0].x - placedDecorationPosition.x) < 2 &&
      Math.abs(current.decorations[0].y - placedDecorationPosition.y) < 2,
    "Dragging a placed decoration in the main tank should leave it in place."
  );
  await captureNamedScreenshot(cdp, "decoration-main-tank-locked.png");

  await evaluate(cdp, "window.__aquariumTest.setScreen('tank')");
  await evaluate(cdp, "window.__aquariumTest.clearCoins()");
  state = await waitFor(cdp, (current) => current.coinDropCount === 0, "Coin stack setup should start from an empty tank floor.");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 20, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 225, 760)");
  for (let expectedCoins = 1; expectedCoins <= state.maxCoinDrops; expectedCoins += 1) {
    const coinX = 90 + (expectedCoins % 8) * 32;
    const coinY = 690 + (expectedCoins % 5) * 18;
    await evaluate(cdp, `window.__aquariumTest.addCoin('common', 1, ${coinX}, ${coinY})`);
    state = await waitFor(
      cdp,
      (current) => current.coinDropCount === expectedCoins,
      `Coin stack did not reach ${expectedCoins}.`
    );
  }
  await delay(500);
  state = await snapshot(cdp);
  assert(state.coinDropCount === state.maxCoinDrops, "Uncollected coin stack should respect the max coin cap.");
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
    state.coinsWaiting.every((coin) => coin.textureKey.startsWith("ui-icon-") && coin.textureKey.includes("coin")),
    "Each dropped coin should use the coin asset family shared with the statistic HUD."
  );
  assert(
    state.coinsWaiting.every((coin) => coin.sinkSpeed > 18),
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

  await evaluate(cdp, "window.__aquariumTest.addWallet('common', 1_000_000)");
  state = await waitFor(
    cdp,
    (current) => current.tankLevel === 1 && current.maxFishCapacity === 4,
    "Wallet top-up should not change the active tank slot or four-fish capacity."
  );
  await evaluate(cdp, "window.__aquariumTest.addWallet('common', 1000000)");
  await evaluate(cdp, "window.__aquariumTest.addWallet('rare', 1000)");
  await evaluate(cdp, "window.__aquariumTest.addWallet('superRare', 100)");
  state = await waitFor(
    cdp,
    (current) => current.ownedTankCount === 1 && current.maxTankLevel === 1 && !current.tankCanUpgradeIndefinitely,
    "Tank progression should remain bounded to the single active tank slot."
  );
  state = await waitFor(cdp, (current) => current.tankLevel === 1 && current.activeFishCount >= 1, "Active tank state was lost.");
  assert(
    state.tankWorldBounds.width === gameWidth &&
      Math.abs(state.tankScreenEdges.left) < 1 &&
      Math.abs(state.tankScreenEdges.right - gameWidth) < 1,
    "All tank slots should keep the same fixed full-width world."
  );
  await evaluate(cdp, `window.__aquariumTest.forceFishAge(0, ${fullyGrownAgeSeconds})`);
  state = await waitFor(
    cdp,
    (current) =>
      current.tankLevel === 1 &&
      current.fish[0].ageLabel === "50y" &&
      current.fish[0].displayWidth <= gameWidth * 0.71 &&
      current.fish[0].statusBars.fullyGrown,
    "A 50-year fish should reach the long-term growth state while respecting the screen-size cap."
  );
  await captureNamedScreenshot(cdp, "fish-age-50y-growth.png");
  await evaluate(cdp, "window.__aquariumTest.forceFishAge(0, 0)");
  await captureNamedScreenshot(cdp, "net-worth-tank-level-raster-background.png");
  state = await waitFor(
    cdp,
    (current) =>
      current.ownedTankCount === 1 &&
      current.maxTankLevel === 1 &&
      current.tankCanUpgradeIndefinitely === false,
    "Tank slot progression should remain capped to the single active tank."
  );
  await captureNamedScreenshot(cdp, "single-tank-slot-cap.png");
  await evaluate(cdp, "window.__aquariumTest.clearFoods()");
  await evaluate(cdp, "window.__aquariumTest.clearCoins()");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 0, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(1, 0, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 90, 720)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(1, 340, 720)");
  await evaluate(cdp, "window.__aquariumTest.dropFoodForTest('basic', 184, 260)");
  await evaluate(cdp, "window.__aquariumTest.addCoin('common', 1, 248, 260)");
  state = await waitFor(
    cdp,
    (current) =>
      current.tankLevel === 1 &&
      current.foods[0]?.displayWidth >= gameWidth * 0.055 &&
      current.foods[0]?.displayWidth <= gameWidth * 0.065 &&
      current.coinsWaiting[0]?.displayWidth >= gameWidth * 0.115 &&
      current.coinsWaiting[0]?.displayWidth <= gameWidth * 0.125 &&
      current.coinsWaiting[0]?.labelFontSize >= gameWidth * 0.027 &&
      current.coinsWaiting[0]?.labelFontSize <= gameWidth * 0.033,
    "Food and coin drops should keep their screen size in the fixed tank viewport."
  );
  await captureNamedScreenshot(cdp, "fixed-tank-pickup-size.png");
  await evaluate(cdp, "window.__aquariumTest.clearFoods()");
  await evaluate(cdp, "window.__aquariumTest.clearCoins()");
  assert(state.decorations.length === 1, "Decoration should still be available before trash drag coverage.");
  const trashDragDecorationPosition = { x: state.decorations[0].x, y: state.decorations[0].y };
  await dragGame(
    cdp,
    state.decorations[0].x,
    state.decorations[0].y,
    state.decorationTrashTarget.x,
    state.decorationTrashTarget.y
  );
  state = await waitFor(
    cdp,
    (current) =>
      current.decorationCount === 1 &&
      Math.abs(current.decorations[0].x - trashDragDecorationPosition.x) < 2 &&
      Math.abs(current.decorations[0].y - trashDragDecorationPosition.y) < 2,
    "Main tank decoration drag-to-trash should stay disabled."
  );
  await captureNamedScreenshot(cdp, "decoration-main-tank-trash-disabled.png");

  await evaluate(cdp, "window.__aquariumTest.setScreen('store')");
  await evaluate(cdp, "window.__aquariumTest.setStoreTab('creature')");
  state = await waitFor(
    cdp,
    (current) => current.activeScreen === "store" && current.activeTab === "creature" && current.helperCreatureTypeCount >= 5,
    "Helper creature store tab did not open."
  );
  await evaluate(cdp, "window.__aquariumTest.setScreen('tank')");
  const shrimpHelperPrice = 140;
  const shrimpHelperSellPrice = 91;
  await evaluate(cdp, `window.__aquariumTest.addWallet('common', ${shrimpHelperPrice})`);
  state = await waitFor(cdp, (current) => current.wallet.common >= state.wallet.common + shrimpHelperPrice, "Helper purchase wallet top-up failed.");
  const walletBeforeHelper = state.wallet.common;
  await evaluate(cdp, "window.__aquariumTest.buyHelperCreature('shrimp')");
  state = await waitFor(
    cdp,
    (current) =>
      current.helperCreatureCount === 0 &&
      current.maxHelperCreatures === 5 &&
      current.wallet.common === walletBeforeHelper - shrimpHelperPrice &&
      current.creatureInventoryByType?.shrimp === 1,
    "Buying a helper creature should add it to the dock inventory."
  );
  await evaluate(cdp, "window.__aquariumTest.addHelperCreatureForTest('shrimp', 215)");
  state = await waitFor(
    cdp,
    (current) => current.helperCreatureCount === 1 && current.helperCreatures[0]?.typeId === "shrimp",
    "Test helper creature placement failed."
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
	      current.helperCreatures[0]?.sellPrice?.amount === shrimpHelperSellPrice,
    "Book should show owned helper creatures with sell value."
  );
  await captureNamedScreenshot(cdp, "book-helper-creatures.png");
  const walletBeforeHelperSale = state.wallet.common;
  await evaluate(cdp, "window.__aquariumTest.sellHelperCreatureAt(0)");
  state = await waitFor(
    cdp,
    (current) => current.activeScreen === "album" && current.helperCreatureCount === 0 && current.wallet.common === walletBeforeHelperSale + shrimpHelperSellPrice,
    "Selling a helper from Book should remove it from the tank and pay its cleanup value."
  );
  await evaluate(cdp, "window.__aquariumTest.setScreen('tank')");
  await evaluate(cdp, "window.__aquariumTest.clearHelperCreatures()");
  await evaluate(cdp, "window.__aquariumTest.clearFoods()");
  await evaluate(cdp, "window.__aquariumTest.addFood('basic', 1)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 62, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 300, 720)");
  state = await waitFor(cdp, (current) => (current.foodInventoryByType.basic ?? 0) >= 1, "Food dispenser stock setup failed.");
  await evaluate(cdp, "window.__aquariumTest.addCoin('common', 5, 32, 828)");
  state = await waitFor(cdp, (current) => current.coinDropCount >= 1, "Helper nearby coin setup failed.");
  const feederFoodBefore = state.foodInventoryByType.basic ?? 0;
  await evaluate(cdp, "window.__aquariumTest.addHelperCreatureForTest('feeder-snail', 10)");
  state = await waitFor(
    cdp,
    (current) =>
      current.helperCreatureCount === 1 &&
      current.helperCreatures[0]?.typeId === "feeder-snail" &&
      Math.abs((current.helperCreatures[0]?.speed ?? 0) - 20 * current.tankViewScale) < 0.2 &&
      (current.foodInventoryByType.basic ?? 0) === feederFoodBefore &&
      current.coinDropCount >= 1,
    "Feeder snail should be a normal pet and should not consume food stock or collect coins.",
    2500
  );
  await delay(1600);
  state = await waitFor(
    cdp,
    (current) => (current.foodInventoryByType.basic ?? 0) === feederFoodBefore && current.coinDropCount >= 1,
    "Feeder snail should stay passive after placement."
  );
  await captureNamedScreenshot(cdp, "helper-creature-pet-snail.png");
  await evaluate(cdp, "window.__aquariumTest.clearHelperCreatures()");
  await evaluate(cdp, "window.__aquariumTest.clearFoods()");
  state = await waitFor(cdp, (current) => current.helperCreatureCount === 0, "Helper creature cleanup for final regression state failed.");
  state = await waitFor(
    cdp,
    (current) => current.tankLevel === 1 && current.maxFishCapacity === 4,
    "Four-fish active tank capacity should remain available after helper coverage."
  );
  await captureNamedScreenshot(cdp, "active-tank-capacity.png");
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
        "--no-sandbox",
        "--disable-gpu",
        "--disable-dev-shm-usage",
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
      deviceScaleFactor: 2,
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
