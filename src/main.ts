import Phaser from "phaser";
import "./styles.css";
import { gameHeight, gameWidth, renderScaleForDevice, shouldUseLowPowerMode } from "./game/constants";
import { loadGameFonts } from "./game/fonts";
import { AquariumScene } from "./scenes/AquariumScene";
import { BubblePopScene } from "./scenes/BubblePopScene";
import { ReefDropScene } from "./scenes/ReefDropScene";
import { initAuth } from "./services/auth";
import { syncServerTime } from "./services/server-time";
import { initConnectionMonitor } from "./services/connection-monitor";
import { setBootstrappedSave } from "./services/bootstrap";
import { loadServerSave } from "./services/sync-service";
import { migrateLocalSaveIfExists } from "./services/migration";

try {
  await loadGameFonts();
} catch {
  // Continue without blocking boot — font fallbacks in CSS handle the rest.
}

function setInitialViewportCssVars(): void {
  const viewport = window.visualViewport;
  const height = Math.ceil(viewport?.height ?? window.innerHeight) + 1;
  const width = Math.ceil(viewport?.width ?? window.innerWidth);
  document.documentElement.style.setProperty("--aq-viewport-height", `${height}px`);
  document.documentElement.style.setProperty("--aq-viewport-width", `${width}px`);
}

setInitialViewportCssVars();

initConnectionMonitor();

async function boot(): Promise<void> {
  try {
    await initAuth();
    await syncServerTime();
    const saveData = await migrateLocalSaveIfExists();
    setBootstrappedSave(saveData);
  } catch (err) {
    console.error("[Boot] Fatal startup error:", err);
    showBootError(err);
    return;
  }

  startPhaser();
}

function showBootError(err: unknown): void {
  const message = err instanceof Error ? err.message : "Something went wrong";
  const container = document.getElementById("app");
  if (!container) return;
  container.innerHTML = `
    <style>
      .boot-error {
        position: fixed; inset: 0; z-index: 9999;
        background: linear-gradient(180deg, #0b3a4d 0%, #071b2a 100%);
        display: flex; align-items: center; justify-content: center;
        font-family: 'Nunito', sans-serif; color: #e4f2f9;
      }
      .boot-error-card {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.12);
        border-radius: 16px; padding: 32px 28px;
        text-align: center; max-width: 360px; margin: 16px;
      }
      .boot-error-card button {
        padding: 10px 24px; border: none; border-radius: 8px;
        background: #3ea6d6; color: #fff; font-size: 14px;
        font-weight: 700; cursor: pointer; margin-top: 16px;
      }
    </style>
    <div class="boot-error">
      <div class="boot-error-card">
        <h1 style="margin:0 0 8px">Connection Error</h1>
        <p style="font-size:13px;color:rgba(255,255,255,0.5);margin:0 0 8px">${message}</p>
        <button onclick="location.reload()">Retry</button>
      </div>
    </div>
  `;
}

function startPhaser(): void {
  const renderScale = renderScaleForDevice();
  const lowPowerMode = shouldUseLowPowerMode();

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: "app",
    width: Math.round(gameWidth * renderScale),
    height: Math.round(gameHeight * renderScale),
    backgroundColor: "#071b2a",
    antialias: !lowPowerMode,
    antialiasGL: !lowPowerMode,
    pixelArt: false,
    roundPixels: lowPowerMode,
    fps: {
      target: lowPowerMode ? 45 : 60,
      min: 20
    },
    scene: [AquariumScene, ReefDropScene, BubblePopScene],
    physics: {
      default: "arcade",
      matter: {
        debug: false
      }
    },
    scale: {
      mode: Phaser.Scale.ENVELOP,
      autoCenter: Phaser.Scale.CENTER_BOTH
    }
  });

  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) {
        return;
      }
      refreshing = true;
      window.location.reload();
    });

    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => registration.update())
        .catch(() => undefined);
    });
  }
}

boot();
