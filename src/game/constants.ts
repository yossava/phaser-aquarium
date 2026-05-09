import Phaser from "phaser";

export const gameWidth = 430;
export const gameHeight = 844;
export const maxRenderScale = 2;
export const tankViewportBounds = new Phaser.Geom.Rectangle(0, 0, gameWidth, gameHeight);
export const tankBounds = new Phaser.Geom.Rectangle(0, 0, gameWidth, gameHeight);
export const controlPanelTop = 62;
export const toastX = gameWidth / 2;
export const toastY = 100;

export function deviceMemoryGb(): number | undefined {
  if (typeof navigator === "undefined") {
    return undefined;
  }

  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return Number.isFinite(memory) ? memory : undefined;
}

export function shouldUseLowPowerMode(): boolean {
  const memory = deviceMemoryGb();
  if (memory !== undefined && memory <= 4) {
    return true;
  }

  return typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function renderScaleForDevice(devicePixelRatio = typeof window === "undefined" ? 1 : window.devicePixelRatio): number {
  const memory = deviceMemoryGb();
  const deviceCap = memory !== undefined && memory <= 2 ? 1 : shouldUseLowPowerMode() ? 1.5 : maxRenderScale;
  return Math.min(deviceCap, maxRenderScale, Math.max(1, devicePixelRatio || 1));
}

export function setTankWorldScale(scale: number): void {
  const safeScale = Phaser.Math.Clamp(scale, 0.5, 1);
  const worldWidth = gameWidth / safeScale;
  const worldHeight = gameHeight / safeScale;
  tankBounds.setTo((gameWidth - worldWidth) / 2, (gameHeight - worldHeight) / 2, worldWidth, worldHeight);
}
