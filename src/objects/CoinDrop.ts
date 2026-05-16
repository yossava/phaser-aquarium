import Phaser from "phaser";
import { gameWidth, tankBounds } from "../game/constants";
import { formatNumber } from "../game/economy";
import { gameFontFamily } from "../game/fonts";
import type { CoinType } from "../types/mechanics";

const coinDisplaySize = Math.round(gameWidth * 0.12);
const coinTapTargetSize = Math.round(gameWidth * 0.16);
const coinValueTextOffset = Math.round(gameWidth * 0.04);
const coinValueFontSize = Math.round(gameWidth * 0.03);
const coinBottomPadding = Math.round(gameWidth * 0.2);
const coinSeabedDepthBand = Math.round(gameWidth * 0.08);
const coinShimmerTextureKey = "coin-shimmer-sparkle";
const coinShimmerTextureSize = 40;

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

function ensureCoinShimmerTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(coinShimmerTextureKey)) {
    return;
  }

  const size = coinShimmerTextureSize;
  const center = size * 0.5;
  const graphics = scene.add.graphics({ x: 0, y: 0 });

  graphics.lineStyle(4, 0xffffff, 0.82);
  graphics.beginPath();
  graphics.moveTo(center, 3);
  graphics.lineTo(center, size - 3);
  graphics.moveTo(3, center);
  graphics.lineTo(size - 3, center);
  graphics.strokePath();

  graphics.lineStyle(2, 0xdfffff, 0.6);
  graphics.beginPath();
  graphics.moveTo(center - 10, center - 10);
  graphics.lineTo(center + 10, center + 10);
  graphics.moveTo(center + 10, center - 10);
  graphics.lineTo(center - 10, center + 10);
  graphics.strokePath();

  graphics.fillStyle(0xffffff, 0.9);
  graphics.fillCircle(center, center, 3);

  graphics.generateTexture(coinShimmerTextureKey, size, size);
  graphics.destroy();
}

export class CoinDrop {
  public sprite: Phaser.GameObjects.Image;
  public shimmer: Phaser.GameObjects.Sprite;
  public hitZone: Phaser.GameObjects.Zone;
  public valueText: Phaser.GameObjects.Text;
  public readonly bottomY: number;
  public readonly visual: CoinVisual;
  public readonly sinkSpeed: number;
  public readonly landingX: number;
  public hasTouchedSand: boolean;
  private tankViewScale = 1;
  private shimmerTime = Phaser.Math.FloatBetween(0, 1.8);

  public constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    public readonly value: number,
    public readonly coinType: CoinType,
    public readonly isMega = false,
    options: { landingX?: number; bottomY?: number; sinkSpeed?: number } = {}
  ) {
    const horizontalPadding = coinTapTargetSize * 0.5;
    this.landingX = options.landingX ?? Phaser.Math.Between(
      Math.round(tankBounds.left + horizontalPadding),
      Math.round(tankBounds.right - horizontalPadding)
    );
    this.bottomY = options.bottomY ?? Phaser.Math.Between(
      Math.round(tankBounds.bottom - coinBottomPadding - coinSeabedDepthBand),
      Math.round(tankBounds.bottom - coinBottomPadding)
    );
    this.sinkSpeed = Math.max(1, options.sinkSpeed ?? 82);
    this.hasTouchedSand = y >= this.bottomY - 0.5;
    this.visual = coinVisualsByType[coinType];
    ensureCoinShimmerTexture(scene);
    const customTextureKey = coinTextureKeyByType[coinType];
    const textureKey = scene.textures.exists(customTextureKey) ? customTextureKey : "coin";
    this.sprite = scene.add.image(x, y, textureKey);
    this.sprite.setTint(isMega ? 0x7bffdf : textureKey === "coin" ? this.visual.tint : 0xffffff);
    this.sprite.setDisplaySize(coinDisplaySize, coinDisplaySize);
    this.sprite.setDepth(12);
    this.shimmer = scene.add
      .sprite(x, y, coinShimmerTextureKey)
      .setOrigin(0.5)
      .setTint(isMega ? 0xa8fff0 : 0xffffff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(13);
    this.hitZone = scene.add.zone(x, y, coinTapTargetSize, coinTapTargetSize).setOrigin(0.5).setDepth(14).setInteractive({ useHandCursor: true });
    this.sprite.setInteractive({ useHandCursor: true });
    this.valueText = scene.add
      .text(x, y + coinValueTextOffset, `${isMega ? "mega coin " : ""}+${formatNumber(value)}`, {
        fontFamily: gameFontFamily,
        fontSize: `${coinValueFontSize * (isMega ? 0.82 : 1)}px`,
        color: isMega ? "#a8fff0" : this.visual.textColor,
        stroke: isMega ? "#064b4d" : this.visual.strokeColor,
        strokeThickness: isMega ? 3 : 2
      })
      .setOrigin(0.5)
      .setDepth(13);
    this.setWorldScaleCompensation(1);
  }

  public update(deltaSeconds: number): boolean {
    const hadTouchedSand = this.hasTouchedSand;
    this.sprite.y = Math.min(this.bottomY, this.sprite.y + this.sinkSpeed * deltaSeconds);
    if (this.atBottom) {
      this.hasTouchedSand = true;
    }
    if (!this.atBottom) {
      this.sprite.x = Phaser.Math.Linear(this.sprite.x, this.landingX, Math.min(1, deltaSeconds * 1.4));
    }
    this.hitZone.setPosition(this.sprite.x, this.sprite.y);
    this.updateShimmer(deltaSeconds);
    this.valueText.setPosition(this.sprite.x, Math.min(this.sprite.y + this.valueTextOffset(), tankBounds.bottom - 8));
    return !hadTouchedSand && this.hasTouchedSand;
  }

  public addToContainer(container: Phaser.GameObjects.Container): void {
    container.add([this.hitZone, this.sprite, this.shimmer, this.valueText]);
  }

  public setWorldScaleCompensation(tankViewScale: number): void {
    this.tankViewScale = Math.max(0.01, tankViewScale);
    const displaySize = coinDisplaySize / this.tankViewScale;
    const tapTargetSize = coinTapTargetSize / this.tankViewScale;
    this.sprite.setDisplaySize(displaySize, displaySize);
    this.hitZone.setSize(tapTargetSize, tapTargetSize);
    this.hitZone.setPosition(this.sprite.x, this.sprite.y);
    this.updateShimmer(0);
    this.valueText.setFontSize(`${(coinValueFontSize * (this.isMega ? 0.82 : 1)) / this.tankViewScale}px`);
    this.valueText.setPosition(this.sprite.x, Math.min(this.sprite.y + this.valueTextOffset(), tankBounds.bottom - 8));
  }

  public get atBottom(): boolean {
    return this.sprite.y >= this.bottomY - 0.5;
  }

  public destroy(): void {
    this.hitZone.destroy();
    this.shimmer.destroy();
    this.sprite.destroy();
    this.valueText.destroy();
  }

  private updateShimmer(deltaSeconds: number): void {
    this.shimmerTime += deltaSeconds;
    const cycle = (this.shimmerTime % 1.25) / 1.25;
    const displaySize = coinDisplaySize / this.tankViewScale;
    const fade = Math.sin(cycle * Math.PI);
    const shimmerSize = displaySize * (this.isMega ? 0.46 : 0.34);
    this.shimmer
      .setPosition(this.sprite.x + displaySize * 0.11, this.sprite.y - displaySize * 0.16)
      .setAlpha(fade * (this.isMega ? 0.74 : 0.5))
      .setAngle(cycle * 105)
      .setDisplaySize(shimmerSize * (0.58 + fade * 0.42), shimmerSize * (0.58 + fade * 0.42));
  }

  private valueTextOffset(): number {
    return coinValueTextOffset / this.tankViewScale;
  }
}
