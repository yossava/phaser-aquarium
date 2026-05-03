import Phaser from "phaser";
import { tankBounds } from "../game/constants";
import type { CoinType } from "../types/mechanics";

export const coinVisualsByType: Record<CoinType, { tint: number; textColor: string; strokeColor: string }> = {
  common: { tint: 0xffd24f, textColor: "#ffe67a", strokeColor: "#423307" },
  rare: { tint: 0x56d8ff, textColor: "#9eeeff", strokeColor: "#04364a" },
  superRare: { tint: 0xd87cff, textColor: "#f5b6ff", strokeColor: "#3b0c4d" }
};

type CoinVisual = (typeof coinVisualsByType)[CoinType];

export class CoinDrop {
  public sprite: Phaser.GameObjects.Image;
  public valueText: Phaser.GameObjects.Text;
  public readonly bottomY = tankBounds.bottom - 16;
  public readonly visual: CoinVisual;
  public readonly sinkSpeed = 34;

  public constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    public readonly value: number,
    public readonly coinType: CoinType
  ) {
    this.visual = coinVisualsByType[coinType];
    this.sprite = scene.add.image(x, y, "coin");
    this.sprite.setTint(this.visual.tint);
    this.sprite.setDepth(12);
    this.sprite.setInteractive({ useHandCursor: true });
    this.valueText = scene.add
      .text(x, y + 20, `+${value}`, {
        fontFamily: "Arial",
        fontSize: "13px",
        color: this.visual.textColor,
        stroke: this.visual.strokeColor,
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(13);
  }

  public update(deltaSeconds: number): void {
    this.sprite.y = Math.min(this.bottomY, this.sprite.y + this.sinkSpeed * deltaSeconds);
    this.valueText.setPosition(this.sprite.x, Math.min(this.sprite.y + 20, tankBounds.bottom - 8));
  }

  public get atBottom(): boolean {
    return this.sprite.y >= this.bottomY - 0.5;
  }

  public destroy(): void {
    this.sprite.destroy();
    this.valueText.destroy();
  }
}
