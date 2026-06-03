import type { MakeupPanelResult } from "./MakeupPanel";
import { clamp } from "../game/math";

type Point = {
  x: number;
  y: number;
};

export function createMakeupOverlay(onOutsidePointerDown: () => void): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.className = "aq-makeup-overlay aq-texture-noise";
  overlay.addEventListener("pointerdown", onOutsidePointerDown);
  document.body.appendChild(overlay);
  return overlay;
}

export function syncMakeupOverlay(input: {
  active: boolean;
  overlay: HTMLDivElement | undefined;
  createOverlay: () => HTMLDivElement;
  createPanel: () => MakeupPanelResult;
  setDecorationSettingsElement: (element: HTMLElement | undefined) => void;
  updateDecorationSettingsPosition: () => void;
}): HTMLDivElement | undefined {
  if (!input.active) {
    input.overlay?.classList.add("hidden");
    input.setDecorationSettingsElement(undefined);
    return input.overlay;
  }

  const overlay = input.overlay ?? input.createOverlay();
  overlay.classList.remove("hidden");
  const { panel, decorationSettings } = input.createPanel();
  input.setDecorationSettingsElement(decorationSettings);
  overlay.replaceChildren(panel);
  if (decorationSettings) {
    window.requestAnimationFrame(input.updateDecorationSettingsPosition);
  }
  return overlay;
}

export function positionMakeupDecorationSettings(input: {
  settings: HTMLElement | undefined;
  selectedTankPoint: Point | undefined;
  tankToScreenPoint: (x: number, y: number) => Point;
  gameWidth: number;
  gameHeight: number;
  verticalOffset?: number;
}): boolean {
  if (!input.settings || !input.selectedTankPoint) {
    return false;
  }

  const position = input.tankToScreenPoint(input.selectedTankPoint.x, input.selectedTankPoint.y);
  const leftPercent = clamp((position.x / input.gameWidth) * 100, 14, 86);
  const topPercent = clamp(((position.y - (input.verticalOffset ?? 88)) / input.gameHeight) * 100, 14, 82);
  input.settings.style.left = `${leftPercent}%`;
  input.settings.style.top = `${topPercent}%`;
  return true;
}
