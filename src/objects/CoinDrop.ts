import Phaser from "phaser";
import type { CoinType } from "../types/mechanics";

const coinTintByType: Record<CoinType, number> = {
  common: 0xffd74a,
  rare: 0x8bd7ff,
  superRare: 0xf39cff
};

export class CoinDrop {
  public sprite: Phaser.GameObjects.Image;
  public valueText: Phaser.GameObjects.Text;

  public constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    public readonly value: number,
    public readonly coinType: CoinType
  ) {
    this.sprite = scene.add.image(x, y, "coin");
    this.sprite.setTint(coinTintByType[coinType]);
    this.sprite.setDepth(12);
    this.sprite.setInteractive({ useHandCursor: true });
    this.valueText = scene.add
      .text(x, y + 20, `+${value}`, {
        fontFamily: "Arial",
        fontSize: "13px",
        color: "#ffe67a",
        stroke: "#423307",
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(13);
  }

  public destroy(): void {
    this.sprite.destroy();
    this.valueText.destroy();
  }
}

