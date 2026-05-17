import Phaser from "phaser";
import { tankBounds } from "./constants";
import { decorationSizes, type DecorationSize } from "./tank-catalog";
import type { DecorationType, HelperCreatureType } from "../types/mechanics";

export type PendingHelperCreatureDropPlacement = {
  type: HelperCreatureType;
  sprite: Phaser.GameObjects.Image;
  tankLevel: number;
  targetX: number;
};

export function randomFishPlacement(): Phaser.Math.Vector2 {
  return new Phaser.Math.Vector2(
    Phaser.Math.Between(tankBounds.left + 70, tankBounds.right - 70),
    Phaser.Math.Between(tankBounds.top + 150, tankBounds.bottom - 120)
  );
}

export function tankDecorationDepthFromOrder(index: number): number {
  return 3 + Math.min(39, Math.max(0, index)) * 0.05;
}

export function defaultDecorationDepth(y: number): number {
  return y > tankBounds.bottom - 80 ? 5 : 3;
}

export function fitDecorationDisplay(
  image: Phaser.GameObjects.Image,
  decoration: DecorationType,
  size: DecorationSize = "m"
): void {
  const maxWidthByRarity: Record<DecorationType["rarity"], number> = {
    common: 68,
    rare: 76,
    superRare: 84
  };
  const maxHeightByRarity: Record<DecorationType["rarity"], number> = {
    common: 58,
    rare: 66,
    superRare: 74
  };
  const sizeScale = decorationSizes[size].scale;
  const maxWidth = maxWidthByRarity[decoration.rarity] * sizeScale;
  const maxHeight = maxHeightByRarity[decoration.rarity] * sizeScale;
  const sourceWidth = Math.max(1, image.width);
  const sourceHeight = Math.max(1, image.height);
  const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
  image.setDisplaySize(sourceWidth * scale, sourceHeight * scale);
}

export function moveDecorationWithinTank(
  decoration: { image: Phaser.GameObjects.Image },
  x: number,
  y: number,
  isDragging: boolean
): void {
  decoration.image.setPosition(
    Phaser.Math.Clamp(x, tankBounds.left + 24, tankBounds.right - 24),
    Phaser.Math.Clamp(y, tankBounds.top + 118, tankBounds.bottom - 30)
  );
  decoration.image.setDepth(isDragging ? 9 : defaultDecorationDepth(decoration.image.y));
}

export function helperCreatureDropSpawn(input: {
  creatureType: HelperCreatureType;
  x: number;
  y: number;
  tankLevel: number;
  seabedY: number;
  createImage: (x: number, y: number, texture: string) => Phaser.GameObjects.Image;
}): PendingHelperCreatureDropPlacement {
  const x = Phaser.Math.Clamp(input.x, tankBounds.left + 24, tankBounds.right - 24);
  return {
    type: input.creatureType,
    sprite: input.createImage(
      x,
      Phaser.Math.Clamp(input.y, tankBounds.top + 40, input.seabedY),
      input.creatureType.texture
    ),
    tankLevel: input.tankLevel,
    targetX: x
  };
}

export function fitPendingHelperCreatureDrop(
  drop: PendingHelperCreatureDropPlacement,
  tankViewScale: number,
  displayWidths: Record<string, number>
): void {
  const displayWidth = (displayWidths[drop.type.texture] ?? Math.min(62, drop.sprite.width)) / Math.max(0.01, tankViewScale);
  const aspectRatio = drop.sprite.height / Math.max(1, drop.sprite.width);
  drop.sprite.setDisplaySize(displayWidth, displayWidth * aspectRatio);
}

export function activeHelperCreatureCountWithPending(input: {
  helpers: readonly { tankLevel: number }[];
  pendingDrops: readonly PendingHelperCreatureDropPlacement[];
  tankLevel: number;
}): number {
  return input.helpers.length + input.pendingDrops.filter((drop) => drop.tankLevel === input.tankLevel).length;
}
