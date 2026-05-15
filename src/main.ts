import Phaser from "phaser";
import "./styles.css";
import { gameHeight, gameWidth, renderScaleForDevice, shouldUseLowPowerMode } from "./game/constants";
import { loadGameFonts } from "./game/fonts";
import { AquariumScene } from "./scenes/AquariumScene";
import { ShellBalanceScene } from "./scenes/ShellBalanceScene";

await loadGameFonts();

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
  scene: [AquariumScene, ShellBalanceScene],
  physics: {
    default: "arcade",
    matter: {
      debug: false
    }
  },
  scale: {
    mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY
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
