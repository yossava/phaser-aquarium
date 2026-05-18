import Phaser from "phaser";
import { tankViewportBounds, toastX, toastY } from "../game/constants";
import type { DecorationSize } from "../game/tank-catalog";
import type { CoinDrop } from "../objects/CoinDrop";
import type { DecorationType, FishType } from "../types/mechanics";

type TankPointerPlacementMode =
  | { kind: "none" }
  | { kind: "fish"; fishTypeId: string }
  | { kind: "decoration"; decorationTypeId: string; size: DecorationSize }
  | { kind: "food"; foodTypeId: string };

export function handleTankPointer(input: {
  pointer: Phaser.Input.Pointer;
  activeScreen: string;
  modalOpen: boolean;
  placementMode: TankPointerPlacementMode;
  pointerDesignPoint: (pointer: Phaser.Input.Pointer) => Phaser.Math.Vector2;
  screenToTankPoint: (designX: number, designY: number) => Phaser.Math.Vector2;
  coinAtPointer: (designX: number, designY: number) => CoinDrop | undefined;
  collectCoin: (coin: CoinDrop, automated: boolean) => void;
  fishTypeById: (id: string) => FishType | undefined;
  decorationTypeById: (id: string) => DecorationType | undefined;
  fishInventory: (id: string) => number;
  decorationInventory: (id: string, size: DecorationSize) => number;
  activeFishCount: () => number;
  maxFishCapacity: () => number;
  activeFishAtTankPoint: (x: number, y: number) => unknown;
  floatText: (message: string, x: number, y: number, color: string) => void;
  placeFishWithCompatibility: (type: FishType, x: number, y: number) => void;
  placeDecorationFromInventory: (decoration: DecorationType, size: DecorationSize, x: number, y: number) => void;
}): void {
  if (input.activeScreen !== "tank" || input.modalOpen) {
    return;
  }

  const pointerPoint = input.pointerDesignPoint(input.pointer);
  if (!tankViewportBounds.contains(pointerPoint.x, pointerPoint.y)) {
    return;
  }

  const tappedCoin = input.coinAtPointer(pointerPoint.x, pointerPoint.y);
  if (tappedCoin) {
    input.collectCoin(tappedCoin, false);
    return;
  }

  const mode = input.placementMode;
  const tankPoint = input.screenToTankPoint(pointerPoint.x, pointerPoint.y);

  if (mode.kind === "fish") {
    const type = input.fishTypeById(mode.fishTypeId);
    if (!type || input.fishInventory(type.id) <= 0) {
      return;
    }

    if (input.activeFishCount() >= input.maxFishCapacity() && !input.activeFishAtTankPoint(tankPoint.x, tankPoint.y)) {
      input.floatText("Active tank full", toastX, toastY, "#ffb0a8");
      return;
    }

    input.placeFishWithCompatibility(type, tankPoint.x, tankPoint.y);
    return;
  }

  if (mode.kind === "decoration") {
    const decoration = input.decorationTypeById(mode.decorationTypeId);
    if (!decoration || input.decorationInventory(decoration.id, mode.size) <= 0) {
      return;
    }

    input.placeDecorationFromInventory(decoration, mode.size, tankPoint.x, tankPoint.y);
  }
}
