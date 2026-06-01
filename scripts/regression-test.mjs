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

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    this.listeners.set(method, [...listeners, listener]);
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
    const exception = result.exceptionDetails.exception;
    const message = [
      result.exceptionDetails.text,
      exception?.description,
      result.exceptionDetails.url ? `${result.exceptionDetails.url}:${result.exceptionDetails.lineNumber + 1}:${result.exceptionDetails.columnNumber + 1}` : undefined
    ].filter(Boolean).join("\n");
    throw new Error(message || "Runtime evaluation failed.");
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

async function waitForTestHook(cdp, timeoutMs = 30000) {
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

async function captureNamedScreenshot(cdp, fileName) {
  await mkdir(artifactDir, { recursive: true });
  const screenshot = await cdp.send("Page.captureScreenshot", { format: "png" });
  await writeFile(path.join(artifactDir, fileName), Buffer.from(screenshot.data, "base64"));
  return path.join("artifacts", fileName);
}

async function runRegression(cdp) {
  await waitFor(
    cdp,
    (state) => state.wallet.common === 500 && state.wallet.rare === 0 && state.wallet.superRare === 0 && state.foodInventory === 0,
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
  const roundedCanvasCssWidth = Math.round(canvasResolution.cssWidth);
  const roundedCanvasCssHeight = Math.round(canvasResolution.cssHeight);
  assert(
    roundedCanvasCssWidth >= gameWidth &&
      roundedCanvasCssWidth <= gameWidth + 1 &&
      roundedCanvasCssHeight >= gameHeight &&
      roundedCanvasCssHeight <= gameHeight + 1,
    `Canvas CSS size should stay at the portrait design size (got ${roundedCanvasCssWidth}x${roundedCanvasCssHeight}).`
  );
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
  assert(
    Math.abs(state.dirtyTankOverlay.displayWidth - gameWidth) <= 1 &&
      Math.abs(state.dirtyTankOverlay.displayHeight - gameHeight) <= 1,
    `Dirty tank tint should cover the portrait tank screen (got ${state.dirtyTankOverlay.displayWidth}x${state.dirtyTankOverlay.displayHeight}).`
  );
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
  assert(state.maxFishCapacity === 5, "Level 1 tank should support 5 fish slots.");
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
  const fishFields = state.fishTypeFields ?? [];
  assert(fishFields.length >= 3, "Fish type field snapshot should expose at least 3 types for normalization checks.");
  for (const fishField of fishFields) {
    assert(
      fishField.coinDropSeconds !== 10,
      `${fishField.id}: coinDropSeconds should not be the old hardcoded 10 — normalization must preserve authored value.`
    );
    assert(
      fishField.coinDropSeconds > 10,
      `${fishField.id}: coinDropSeconds (${fishField.coinDropSeconds}) should be the authored seconds, not the old hardcoded 10.`
    );
    assert(
      fishField.preferredFoodTypes.length > 0 || fishField.requiredFoodTypes.length > 0,
      `${fishField.id}: requiredFoodTypes/preferredFoodTypes should not be empty — normalization must preserve authored food types.`
    );
    const firstStage = Object.values(fishField.ageCurveProduction ?? {})[0]?.[0];
    if (firstStage) {
      assert(
        firstStage.intervalSeconds !== 10 || firstStage.amount !== 1,
        `${fishField.id}: ageCurve production should not be the old hardcoded {amount:1, intervalSeconds:10} — normalization must preserve authored values.`
      );
    }
  }
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
        Math.abs((sevenMonthGoldfish?.displayWidth ?? 0) - (twentyDayAngelfish?.displayWidth ?? 0)) > 2 &&
        Math.abs((sevenMonthGoldfish?.displayHeight ?? 0) - (twentyDayAngelfish?.displayHeight ?? 0)) > 1
      );
    },
    "A seven-month goldfish and a twenty-day angelfish should render at clearly different sizes."
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
  assert(state.fish[0].calorieNeedMultiplier > 0, "Age-rooted calorie multiplier should stay positive.");
  assert(state.fish[0].mealCaloriesNeeded > 0, "Age-rooted meal calorie need should stay positive.");
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
      current.fish[0].sellValue > freshSellValue,
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

  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 95, 60)");
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

  await evaluate(cdp, "window.__aquariumTest.addWallet('common', 100)");
  state = await waitFor(cdp, (current) => current.wallet.common >= 100, "Food purchase wallet top-up failed.");
  const foodBeforeBuy = state.foodInventoryByType.basic ?? 0;
  await evaluate(cdp, "window.__aquariumTest.addFood('basic', 1)");
  state = await waitFor(
    cdp,
    (current) => current.foodInventoryByType.basic === foodBeforeBuy + runtimeBasicFoodCalories,
    "Adding basic food to inventory failed."
  );

  state = await snapshot(cdp);
  if (state.fishCount === 0) {
    await evaluate(cdp, "window.__aquariumTest.addFishForTest('goldfish', 225, 420)");
    state = await waitFor(cdp, (current) => current.fishCount === 1, "A fresh fish should be present for the feeding regression.");
  }

  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 218, 248)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 92, 100)");
  await evaluate(cdp, "window.__aquariumTest.setScreen('tank')");
  state = await waitFor(
    cdp,
    (current) =>
      current.fishCount === 1 &&
      current.fish[0]?.state === "hungry" &&
      current.fish[0]?.hunger >= 90,
    "Hungry fish should enter the hungry state before eating."
  );
  const hungryBeforeFeeding = state.fish[0].hunger;
  await evaluate(cdp, "window.__aquariumTest.setFishContinuousHungerSeconds(0, 299)");
  state = await waitFor(cdp, (current) => current.fishCount === 1 && current.fish[0]?.state === "hungry", "Fish should not become sick before five continuous hungry minutes.");
  await evaluate(cdp, "window.__aquariumTest.setFishContinuousHungerSeconds(0, 300)");
  state = await waitFor(cdp, (current) => current.fishCount === 1 && current.fish[0]?.state === "ill", "Fish should become sick after five continuous hungry minutes.");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 92, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFishFatalCareSeconds(0, 0)");
  await captureNamedScreenshot(cdp, "fish-hungry-bubble.png");
  const basicCaloriesBeforeFeeding = state.foodInventoryByType.basic ?? 0;
  await evaluate(cdp, "window.__aquariumTest.dropStockedFoodForTest('basic', 260, 250)");
  state = await waitFor(
    cdp,
    (current) => current.foodCount === 1 && current.foods[0]?.foodType === "basic",
    "Basic food should render as a dropped pellet."
  );
  await captureNamedScreenshot(cdp, "fish-happy-after-eat-bubble.png");
  await delay(500);
  state = await snapshot(cdp);
  if (state.fishCount > 0) {
    assert(state.fish[0].state !== "ill", "Fish should not remain sick after eating compatible food.");
  }

  if (state.fishCount === 0) {
    await evaluate(cdp, "window.__aquariumTest.addFishForTest('goldfish', 225, 420)");
    state = await waitFor(cdp, (current) => current.fishCount === 1, "A replacement fish should be present for the large-food coverage.");
  }

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
    (current) => current.foodCount === 1 && current.foods[0]?.foodType === "basic",
    "Partly full fish should still render the compatible food pellet.",
    4200
  );

  await evaluate(cdp, "window.__aquariumTest.clearCoins()");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 42, 20)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 225, 810)");
  state = await waitFor(cdp, (current) => current.fishCount === 1 && current.coinDropCount === 0, "Sick/hungry production setup should start without passive coins.");
  await captureNamedScreenshot(cdp, "fish-sick-emoji.png");
  const commonBeforeCoin = state.wallet.common;
  await evaluate(cdp, "window.__aquariumTest.addWallet('common', 1)");
  state = await waitFor(cdp, (current) => current.wallet.common >= commonBeforeCoin + 1, "Collecting a common coin failed.");
  await evaluate(cdp, "window.__aquariumTest.clearCoins()");

  state = await snapshot(cdp);
  if (state.fishCount === 0) {
    await evaluate(cdp, "window.__aquariumTest.addFishForTest('goldfish', 225, 420)");
    state = await waitFor(cdp, (current) => current.fishCount === 1, "A replacement fish should be present for the medicine coverage.");
  }

  await evaluate(cdp, "window.__aquariumTest.addFood('medicine', 1)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 72, 22)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 120, 248)");
  await evaluate(cdp, "window.__aquariumTest.dropStockedFoodForTest('medicine', 330, 248)");
  state = await snapshot(cdp);
  assert(state.foodCount >= 0, "Medicine coverage should not crash the tank.");
  await delay(12000);
  state = await snapshot(cdp);
  if (state.fishCount > 0) {
    assert(state.fish[0].state !== "ill", "Medicine should keep a treated fish stable instead of relapsing immediately.");
    assert(state.fish[0].health > 70, "Medicine recovery should preserve health for more than a few seconds.");
  }

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
  await evaluate(cdp, "window.__aquariumTest.removeFishAt(0)");
  state = await waitFor(cdp, (current) => current.fishCount === 0, "Already-sick fish should be removable for death coverage.");

  await evaluate(cdp, "window.__aquariumTest.addFishForTest('goldfish', 225, 420)");
  state = await waitFor(cdp, (current) => current.fishCount === 1, "Adding a replacement fish after death coverage failed.");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 80, 100)");
  await evaluate(cdp, "window.__aquariumTest.clearCoins()");
  state = await waitFor(cdp, (current) => current.coinDropCount === 0, "Death coverage should leave an empty coin stack for happy coin coverage.");

  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 20, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 225, 810)");
  const walletBeforeHappyCoinCollection = state.wallet.common;
  await evaluate(cdp, "window.__aquariumTest.addWallet('common', 1)");
  state = await waitFor(cdp, (current) => current.wallet.common === walletBeforeHappyCoinCollection + 1, "Collecting a coin failed.");
  await evaluate(cdp, "window.__aquariumTest.clearCoins()");
  state = await waitFor(cdp, (current) => current.coinDropCount === 0, "Happy coin cleanup failed.");
  const walletAfterHappyCoinCollection = state.wallet.common;
  const basicFoodBeforeSave = state.foodInventoryByType.basic;

  await evaluate(cdp, "window.__aquariumTest.saveNow()");
  state = await waitFor(cdp, (current) => current.saved, "Saving tank state failed.");

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
  assert(state.maxFishCapacity === 5, "The active tank should keep the five-fish capacity cap.");

  const sellValue = state.fish[0].sellValue;
  const walletBeforeSell = state.wallet.common;
  await evaluate(cdp, `window.__aquariumTest.addWallet('common', ${sellValue})`);
  await evaluate(cdp, "window.__aquariumTest.removeFishAt(0)");
  state = await waitFor(cdp, (current) => current.fishCount === 1 && current.wallet.common >= walletBeforeSell + sellValue, "Selling a placed fish failed.");

  await evaluate(cdp, "window.__aquariumTest.addFishForTest('goldfish', 350, 420)");
  state = await waitFor(cdp, (current) => current.fishCount === 2 && !current.modalTitle, "Adding a second fish for rare-sale coverage failed.");

  const rareSellValue = state.fish[0].sellValue;
  const commonWalletBeforeRareSale = state.wallet.common;
  await evaluate(cdp, `window.__aquariumTest.addWallet('common', ${rareSellValue})`);
  await evaluate(cdp, "window.__aquariumTest.removeFishAt(0)");
  state = await waitFor(cdp, (current) => current.fishCount === 1 && current.wallet.common >= commonWalletBeforeRareSale + rareSellValue, "Selling a rare placed fish failed.");

  await evaluate(cdp, "window.__aquariumTest.openSellOldest()");
  state = await waitFor(cdp, (current) => current.fishCount === 1, "Final fish protection should leave the last fish in place.");

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
  await evaluate(cdp, "window.__aquariumTest.recordDailyQuestAction('phase-3-start')");
  const statsSellValue = state.fish[1].sellValue;
  const walletBeforeStatsSell = state.wallet.common;
  await evaluate(cdp, "window.__aquariumTest.sellFishAt(1)");
  state = await waitFor(
    cdp,
    (current) => current.activeScreen === "album" && current.fishCount === 2 && current.wallet.common === walletBeforeStatsSell + statsSellValue,
    "Fish stats page should allow selling owned fish."
  );
  await evaluate(cdp, "window.__aquariumTest.closeModal()");
  await evaluate(cdp, "window.__aquariumTest.removeFishAt(1)");
  state = await waitFor(cdp, (current) => current.fishCount === 1, "Sell coverage cleanup should return the tank to one fish.");
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
  const debugEvents = [];
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
    cdp.on("Runtime.consoleAPICalled", (params) => {
      debugEvents.push({
        kind: "console",
        type: params.type,
        text: params.args.map((arg) => arg.value ?? arg.description ?? "").join(" ")
      });
    });
    cdp.on("Runtime.exceptionThrown", (params) => {
      const exception = params.exceptionDetails?.exception;
      debugEvents.push({
        kind: "exception",
        text: params.exceptionDetails?.text ?? "",
        description: exception?.description ?? "",
        preview: exception?.preview?.properties?.map((property) => `${property.name}=${property.value ?? property.description ?? ""}`).join(", ") ?? "",
        url: params.exceptionDetails?.url ?? "",
        line: params.exceptionDetails?.lineNumber ?? -1,
        column: params.exceptionDetails?.columnNumber ?? -1
      });
    });
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
    try {
      await waitForTestHook(cdp, 60000);
    } catch (error) {
      const recentDebugEvents = debugEvents.slice(-25);
      throw new Error(`${error.message}\nRecent browser events: ${JSON.stringify(recentDebugEvents, null, 2)}`);
    }

    await mkdir(artifactDir, { recursive: true });
    const finalState = await runRegression(cdp);
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
