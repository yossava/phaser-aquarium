import type Phaser from "phaser";
import type { DecorationSize } from "./tank-catalog";

export type PlacedDecoration = {
  typeId: string;
  size: DecorationSize;
  image: Phaser.GameObjects.Image;
  tankLevel: number;
  bubbleCooldown?: number;
};
