import Phaser from "phaser";
import "./styles.css";
import { gameHeight, gameWidth, maxRenderScale } from "./game/constants";
import { loadGameFonts } from "./game/fonts";
import { AquariumScene } from "./scenes/AquariumScene";

export function renderScaleForDevice(devicePixelRatio = window.devicePixelRatio): number {
  return Math.min(maxRenderScale, Math.max(1, devicePixelRatio || 1));
}

await loadGameFonts();

new Phaser.Game({
  type: Phaser.AUTO,
  parent: "app",
  width: gameWidth * renderScaleForDevice(),
  height: gameHeight * renderScaleForDevice(),
  backgroundColor: "#071b2a",
  antialias: true,
  antialiasGL: true,
  pixelArt: false,
  roundPixels: false,
  scene: [AquariumScene],
  scale: {
    mode: Phaser.Scale.ENVELOP,
    autoCenter: Phaser.Scale.CENTER_HORIZONTALLY
  }
});
