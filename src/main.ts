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
  await initAuth();
  await syncServerTime();
  const saveData = await migrateLocalSaveIfExists();
  setBootstrappedSave(saveData);

  startPhaser();
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
