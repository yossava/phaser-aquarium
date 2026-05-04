import Phaser from "phaser";

export const gameWidth = 430;
export const gameHeight = 844;
export const maxRenderScale = 2;
export const tankViewportBounds = new Phaser.Geom.Rectangle(0, 0, gameWidth, gameHeight);
export const tankBounds = new Phaser.Geom.Rectangle(0, 0, gameWidth, gameHeight);
export const controlPanelTop = 62;
export const toastX = gameWidth / 2;
export const toastY = 100;

export function setTankWorldScale(scale: number): void {
  const safeScale = Phaser.Math.Clamp(scale, 0.5, 1);
  const worldWidth = gameWidth / safeScale;
  const worldHeight = gameHeight / safeScale;
  tankBounds.setTo((gameWidth - worldWidth) / 2, (gameHeight - worldHeight) / 2, worldWidth, worldHeight);
}
