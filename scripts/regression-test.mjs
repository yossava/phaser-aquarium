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

  while (Date.now() - startedAt < timeoutMs) {
    const current = await snapshot(cdp);
    if (predicate(current)) {
      return current;
    }

    await delay(100);
  }

  throw new Error(message);
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

  await evaluate(cdp, "window.__aquariumTest.setScreen('store')");
  await evaluate(cdp, "window.__aquariumTest.buyFish('goldfish')");
  let state = await waitFor(
    cdp,
    (current) => current.wallet.common === 85 && current.fishCount === 1 && current.placementMode === "none",
    "Buying a goldfish should add it directly to the tank."
  );
  assert(state.maxFishCapacity === 10, "Tank should support 10 fish slots.");
  assert(state.tankLevel === 1 && state.maxTankLevel === 5, "Fresh tank should start at level 1 of 5.");
  assert(state.fishTypeCount === 50, "Fish catalog should include 50 fish types.");
  assert(state.visibleFishCatalogCount === 10, "Fish catalog should show 10 fish for the selected tank level.");
  assert(state.totalWealth > state.wallet.common, "Total wealth should include wallet and owned tank assets.");
  assert(state.fish[0].state === "happy", "New fish should start happy.");
  assert(state.fish[0].ageStage === "baby", "New fish should start as a baby.");
  assert(state.fish[0].statusBars.visible, "Fish hunger and mood bars should be visible.");
  assert(state.fish[0].statusBars.y < state.fish[0].y, "Fish hunger and mood bars should sit above the fish.");
  assert(state.fish[0].statusBars.fullnessRatio > 0.8 && state.fish[0].statusBars.moodRatio > 0.9, "Fish status bars should show full as good for fullness and mood.");
  assert(state.fish[0].statusBars.tailTint === 0xffb13b, "Goldfish tail should use the same visual color as its preferred basic food.");
  assert(state.fish[0].statusBars.rarityStars === 1, "Common fish should render a one-star rarity badge.");
  assert(!state.fish[0].statusBars.fullyGrown, "Baby fish should not show the fully grown marker.");
  const babySellValue = state.fish[0].sellValue;
  assert(babySellValue < 35, "Freshly bought baby fish should sell below purchase price.");

  await evaluate(cdp, "window.__aquariumTest.forceFishAge(0, 720)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 10, 100)");
  state = await waitFor(
    cdp,
    (current) => current.fish[0].ageStage === "adult" && current.fish[0].sellValue > babySellValue * 1.8,
    "Grown healthy fish sell value did not scale up with attributes."
  );
  const grownHealthySellValue = state.fish[0].sellValue;
  await evaluate(cdp, "window.__aquariumTest.forceFishAge(0, 10000)");
  state = await waitFor(
    cdp,
    (current) => current.fish[0].ageStage === "master" && current.fish[0].statusBars.fullyGrown,
    "Fully grown fish should show a max-growth marker."
  );
  await evaluate(cdp, "window.__aquariumTest.forceFishAge(0, 720)");

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

  await evaluate(cdp, "window.__aquariumTest.buyFood('basic')");
  state = await waitFor(cdp, (current) => current.wallet.common === 80 && current.foodInventory === 4 && current.placementMode === "food", "Buying food failed.");

  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 218, 248)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 92, 100)");
  await evaluate(cdp, "window.__aquariumTest.setScreen('tank')");
  await clickGame(cdp, 260, 250);
  state = await waitFor(
    cdp,
    (current) => current.foodInventory === 3 && current.foodCount === 0 && current.fish[0].hunger < 70,
    "Hungry fish did not eat dropped food."
  );

  await evaluate(cdp, "window.__aquariumTest.addFood('basic', 1)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 110, 248)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 18, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFoodTool('basic')");
  await clickGame(cdp, 330, 248);
  state = await waitFor(
    cdp,
    (current) => current.foodInventory === 3 && current.foodCount === 0 && current.fish[0].hunger <= 4,
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
      current.fish[0].nextCoinDropInMs >= 20000,
    "Ill fish did not produce a slower reduced +1 coin."
  );
  assert(state.fish[0].bodyTint !== 0x95a1a6, "Ill fish should keep a desaturated body color instead of turning colorless gray.");
  assert(state.fish[0].statusBars.tailTint === 0xffb13b, "Ill fish should keep its preferred-food tail color.");
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
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 300, 248)");
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

  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 20, 100)");
  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 225, 810)");
  await evaluate(cdp, "window.__aquariumTest.forceCoinReady(0)");
  state = await waitFor(cdp, (current) => current.fish[0].state === "happy" && current.coinDropCount === 1, "Happy fish did not drop a coin.");
  assert(state.coinsWaiting[0].coinType === "common", "Goldfish should produce common coins.");
  assert(state.fish[0].nextCoinDropInMs < 10000, "Happy fish coin timer should stay faster than sick fish timer.");
  state = await waitFor(
    cdp,
    (current) => current.coinsWaiting[0]?.atBottom && current.coinsWaiting[0].y >= current.coinsWaiting[0].bottomY - 0.5,
    "Happy fish coin did not sink all the way to the tank bottom.",
    7000
  );
  await clickGame(cdp, state.coinsWaiting[0].x, state.coinsWaiting[0].y);
  state = await waitFor(cdp, (current) => current.wallet.common === 86 && current.coinDropCount === 0, "Collecting a coin failed.");

  await evaluate(cdp, "window.__aquariumTest.saveNow()");
  await reloadApp(cdp, appUrl);
  state = await waitFor(
    cdp,
    (current) => current.saved && current.fishCount === 1 && current.wallet.common === 86 && current.foodInventory === 3,
    "Saved tank state did not restore after reload."
  );
  assert(state.fish[0].ageStage === "baby", "Reloaded fish should retain its baby age stage.");

  await evaluate(cdp, "window.__aquariumTest.backdateSave(3600)");
  await reloadApp(cdp, appUrl);
  state = await waitFor(
    cdp,
    (current) => current.offlineProgress.elapsedSeconds >= 3500 && current.wallet.common > 86 && current.fishCount === 1,
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
  await evaluate(cdp, "window.__aquariumTest.runAutoFeederNow()");
  state = await waitFor(
    cdp,
    (current) =>
      current.foodInventoryByType.basic === 3 &&
      current.foodInventoryByType.protein === undefined &&
      current.foodInventory === 3 &&
      current.foods.every((food) => food.y >= 138 && food.y <= 238),
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

  await evaluate(cdp, "window.__aquariumTest.setScreen('store')");
  await evaluate(cdp, "window.__aquariumTest.setFishCatalogLevel(2)");
  const commonBeforeLockedBuy = state.wallet.common;
  await evaluate(cdp, "window.__aquariumTest.buyFish('angelfish')");
  state = await waitFor(
    cdp,
    (current) =>
      current.fishCount === 1 &&
      current.wallet.common === commonBeforeLockedBuy &&
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
  const commonBeforeMixedBuy = state.wallet.common;
  await evaluate(cdp, "window.__aquariumTest.buyFish('angelfish')");
  state = await waitFor(
    cdp,
    (current) =>
      current.fishCount === 2 &&
      current.wallet.common === commonBeforeMixedBuy - 72 &&
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
  await evaluate(cdp, "window.__aquariumTest.setScreen('store')");
  await evaluate(cdp, "window.__aquariumTest.openSellOldest()");
  state = await waitFor(cdp, (current) => current.modalTitle === "Sell Rare Fish", "Rare fish sell confirmation did not open.");
  await evaluate(cdp, "window.__aquariumTest.sellFishAt(0)");
  state = await waitFor(
    cdp,
    (current) => current.fishCount === 1 && current.wallet.common === state.wallet.common + rareSellValue,
    "Selling a rare placed fish failed."
  );

  await evaluate(cdp, "window.__aquariumTest.openSellOldest()");
  state = await waitFor(cdp, (current) => current.modalTitle === "Starter Protected" && current.fishCount === 1, "Final fish protection did not trigger.");
  await evaluate(cdp, "window.__aquariumTest.closeModal()");
  state = await waitFor(cdp, (current) => current.fishCount === 1 && !current.modalTitle, "Final fish protection modal did not close.");
  const walletAfterSelling = state.wallet.common;

  await evaluate(cdp, "window.__aquariumTest.setStoreTab('decor')");
  state = await waitFor(cdp, (current) => current.activeTab === "decor", "Decor tab did not activate.");

  await evaluate(cdp, "window.__aquariumTest.buyDecoration('plant')");
  state = await waitFor(cdp, (current) => current.wallet.common === walletAfterSelling - 20 && current.placementMode === "decoration", "Buying plant decoration failed.");

  await clickGame(cdp, 215, 476);
  state = await waitFor(cdp, (current) => current.decorationCount === 1 && current.placementMode === "none", "Placing plant decoration failed.");

  await evaluate(cdp, "window.__aquariumTest.setScreen('tank')");
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
    await rm(profileDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
