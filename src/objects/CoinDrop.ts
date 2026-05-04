import Phaser from "phaser";
import { tankBounds } from "../game/constants";
import { formatNumber } from "../game/economy";
import type { CoinType } from "../types/mechanics";

const coinDisplaySize = 32;
const coinValueTextOffset = 13;

export const coinVisualsByType: Record<CoinType, { tint: number; textColor: string; strokeColor: string }> = {
  common: { tint: 0xffd24f, textColor: "#ffe67a", strokeColor: "#423307" },
  rare: { tint: 0x56d8ff, textColor: "#9eeeff", strokeColor: "#04364a" },
  superRare: { tint: 0xd87cff, textColor: "#f5b6ff", strokeColor: "#3b0c4d" }
};

export const coinTextureKeyByType: Record<CoinType, string> = {
  common: "ui-icon-common-coin",
  rare: "ui-icon-rare-coin",
  superRare: "ui-icon-super-rare-coin"
};

type CoinVisual = (typeof coinVisualsByType)[CoinType];

export class CoinDrop {
  public sprite: Phaser.GameObjects.Image;
  public valueText: Phaser.GameObjects.Text;
  public readonly bottomY = tankBounds.bottom - 16;
  public readonly visual: CoinVisual;
  public readonly sinkSpeed = 34;
  private tankViewScale = 1;

  public constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    public readonly value: number,
    public readonly coinType: CoinType
  ) {
    this.visual = coinVisualsByType[coinType];
    const customTextureKey = coinTextureKeyByType[coinType];
    const textureKey = scene.textures.exists(customTextureKey) ? customTextureKey : "coin";
    this.sprite = scene.add.image(x, y, textureKey);
    if (textureKey === "coin") {
      this.sprite.setTint(this.visual.tint);
    }
    this.sprite.setDisplaySize(coinDisplaySize, coinDisplaySize);
    this.sprite.setDepth(12);
    this.sprite.setInteractive({ useHandCursor: true });
    this.valueText = scene.add
      .text(x, y + coinValueTextOffset, `+${formatNumber(value)}`, {
        fontFamily: "Arial",
        fontSize: "10px",
        color: this.visual.textColor,
        stroke: this.visual.strokeColor,
        strokeThickness: 2
      })
      .setOrigin(0.5)
      .setDepth(13);
    this.setWorldScaleCompensation(1);
  }

  public update(deltaSeconds: number): void {
    this.sprite.y = Math.min(this.bottomY, this.sprite.y + this.sinkSpeed * deltaSeconds);
    this.valueText.setPosition(this.sprite.x, Math.min(this.sprite.y + this.valueTextOffset(), tankBounds.bottom - 8));
  }

  public addToContainer(container: Phaser.GameObjects.Container): void {
    container.add([this.sprite, this.valueText]);
  }

  public setWorldScaleCompensation(tankViewScale: number): void {
    this.tankViewScale = Math.max(0.01, tankViewScale);
    const displaySize = coinDisplaySize / this.tankViewScale;
    this.sprite.setDisplaySize(displaySize, displaySize);
    this.valueText.setFontSize(`${10 / this.tankViewScale}px`);
    this.valueText.setPosition(this.sprite.x, Math.min(this.sprite.y + this.valueTextOffset(), tankBounds.bottom - 8));
  }

  public get atBottom(): boolean {
    return this.sprite.y >= this.bottomY - 0.5;
  }

  public destroy(): void {
    this.sprite.destroy();
    this.valueText.destroy();
  }

  private valueTextOffset(): number {
    return coinValueTextOffset / this.tankViewScale;
  }
}
