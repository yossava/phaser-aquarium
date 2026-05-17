import Phaser from "phaser";
import type { PlacedDecoration } from "../game/tank-entities";
import type { Fish } from "../objects/Fish";

export function nearestFishAtTankPoint(input: {
  fish: readonly Fish[];
  x: number;
  y: number;
  tankViewScale: number;
  minimumRadius: number;
  widthFactor: number;
  heightFactor: number;
}): Fish | undefined {
  const minimumRadius = input.minimumRadius / Math.max(0.01, input.tankViewScale);
  let nearestFish: Fish | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const fish of input.fish) {
    const radius = Math.max(
      minimumRadius,
      fish.sprite.displayWidth * input.widthFactor,
      fish.sprite.displayHeight * input.heightFactor
    );
    const distance = Phaser.Math.Distance.Between(input.x, input.y, fish.sprite.x, fish.sprite.y);
    if (distance <= radius && distance < nearestDistance) {
      nearestFish = fish;
      nearestDistance = distance;
    }
  }

  return nearestFish;
}

export function decorationAtTankPoint(
  decorations: readonly PlacedDecoration[],
  x: number,
  y: number
): PlacedDecoration | undefined {
  return decorations
    .filter((decoration) => {
      const radiusX = Math.max(34, decoration.image.displayWidth * 0.58);
      const radiusY = Math.max(34, decoration.image.displayHeight * 0.58);
      return Math.abs(x - decoration.image.x) <= radiusX && Math.abs(y - decoration.image.y) <= radiusY;
    })
    .sort((first, second) => second.image.depth - first.image.depth || second.image.y - first.image.y)[0];
}
