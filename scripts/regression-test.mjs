import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";

const root = process.cwd();
const gameWidth = 430;
const gameHeight = 760;
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

async function runRegression(cdp) {
  await waitFor(cdp, (state) => state.coins === 120 && state.foodInventory === 3, "Initial HUD state did not load.");

  await clickGame(cdp, 145, 629);
  let state = await waitFor(cdp, (current) => current.coins === 85 && current.placementMode === "fish", "Buying a goldfish failed.");
  assert(state.fishCount === 0, "Fish should stay in inventory until placed.");

  await clickGame(cdp, 215, 260);
  state = await waitFor(cdp, (current) => current.fishCount === 1 && current.placementMode === "none", "Placing a fish failed.");
  assert(state.fish[0].state === "happy", "New fish should start happy.");

  await clickGame(cdp, 215, 586);
  state = await waitFor(cdp, (current) => current.activeTab === "food", "Food tab did not activate.");

  await clickGame(cdp, 114, 642);
  state = await waitFor(cdp, (current) => current.coins === 80 && current.foodInventory === 4 && current.placementMode === "food", "Buying food failed.");

  await evaluate(cdp, "window.__aquariumTest.setFishPosition(0, 218, 248)");
  await evaluate(cdp, "window.__aquariumTest.setFishVitals(0, 92, 100)");
  await clickGame(cdp, 220, 250);
  state = await waitFor(
    cdp,
    (current) => current.foodInventory === 3 && current.foodCount === 0 && current.fish[0].hunger < 70,
    "Hungry fish did not eat dropped food."
  );

  await evaluate(cdp, "window.__aquariumTest.forceCoinReady(0)");
  state = await waitFor(cdp, (current) => current.coinDropCount === 1, "Happy fish did not drop a coin.");
  await clickGame(cdp, state.coinsWaiting[0].x, state.coinsWaiting[0].y);
  state = await waitFor(cdp, (current) => current.coins === 85 && current.coinDropCount === 0, "Collecting a coin failed.");

  await clickGame(cdp, 349, 586);
  state = await waitFor(cdp, (current) => current.activeTab === "decor", "Decor tab did not activate.");

  await clickGame(cdp, 145, 629);
  state = await waitFor(cdp, (current) => current.coins === 65 && current.placementMode === "decoration", "Buying plant decoration failed.");

  await clickGame(cdp, 215, 476);
  state = await waitFor(cdp, (current) => current.decorationCount === 1 && current.placementMode === "none", "Placing plant decoration failed.");

  return state;
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

    const finalState = await runRegression(cdp);
    const screenshot = await cdp.send("Page.captureScreenshot", { format: "png" });
    await mkdir(artifactDir, { recursive: true });
    await writeFile(path.join(artifactDir, "regression-smoke.png"), Buffer.from(screenshot.data, "base64"));

    console.log("Regression smoke test passed.");
    console.log(
      JSON.stringify(
        {
          finalState,
          screenshot: path.join("artifacts", "regression-smoke.png")
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
