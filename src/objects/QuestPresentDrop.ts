import Phaser from "phaser";
import { gameWidth, tankBounds } from "../game/constants";
import { gameFontFamily } from "../game/fonts";

const presentDisplaySize = Math.round(gameWidth * 0.14);
const presentTapTargetSize = Math.round(gameWidth * 0.32);
const presentLabelOffset = Math.round(gameWidth * 0.055);
const presentLabelFontSize = Math.round(gameWidth * 0.028);
const presentBottomPadding = Math.round(gameWidth * 0.18);
const presentSeabedDepthBand = Math.round(gameWidth * 0.08);

export const questPresentTextureKey = "ui-present-prize-icon";
export const questPresentAssetPath = "/assets/ui/prizes/present_prize_icon.png";

export type QuestPresentDropOptions = {
  landingX?: number;
  bottomY?: number;
  sinkSpeed?: number;
};

export class QuestPresentDrop {
  public readonly sprite: Phaser.GameObjects.Image;
  public readonly hitZone: Phaser.GameObjects.Zone;
  public readonly labelText: Phaser.GameObjects.Text;
  public bottomY: number;
  public landingX: number;
  public readonly sinkSpeed: number;
  public hasTouchedSand: boolean;
  private tankViewScale = 1;
  private bobTime = Phaser.Math.FloatBetween(0, 1.8);
  private travelY: number;

  public constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    public readonly id: string,
    public readonly questId: string,
    public readonly rewardLabel: string,
    options: QuestPresentDropOptions = {}
  ) {
    const horizontalPadding = presentTapTargetSize * 0.5;
    this.landingX = options.landingX ?? Phaser.Math.Between(
      Math.round(tankBounds.left + horizontalPadding),
      Math.round(tankBounds.right - horizontalPadding)
    );
    this.bottomY = options.bottomY ?? Phaser.Math.Between(
      Math.round(tankBounds.bottom - presentBottomPadding - presentSeabedDepthBand),
      Math.round(tankBounds.bottom - presentBottomPadding)
    );
    this.sinkSpeed = Math.max(1, options.sinkSpeed ?? 74);
    this.hasTouchedSand = y >= this.bottomY - 0.5;
    this.travelY = y;

    const textureKey = scene.textures.exists(questPresentTextureKey) ? questPresentTextureKey : "__DEFAULT";
    this.sprite = scene.add.image(x, y, textureKey).setDepth(12);
    this.hitZone = scene.add.zone(x, y, presentTapTargetSize, presentTapTargetSize).setOrigin(0.5).setDepth(14).setInteractive({ useHandCursor: true });
    this.sprite.setInteractive({ useHandCursor: true });
    this.labelText = scene.add
      .text(x, y + presentLabelOffset, "Prize", {
        fontFamily: gameFontFamily,
        fontSize: `${presentLabelFontSize}px`,
        color: "#fff4ad",
        stroke: "#533506",
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(13);
    this.setWorldScaleCompensation(1);
  }

  public update(deltaSeconds: number): void {
    this.bobTime += deltaSeconds;
    this.travelY = Math.min(this.bottomY, this.travelY + this.sinkSpeed * deltaSeconds);
    if (this.atBottom) {
      this.hasTouchedSand = true;
    }
    if (!this.atBottom) {
      this.sprite.x = Phaser.Math.Linear(this.sprite.x, this.landingX, Math.min(1, deltaSeconds * 1.25));
    }
    const bob = this.hasTouchedSand ? Math.sin(this.bobTime * 2.8) * (1.4 / this.tankViewScale) : 0;
    this.sprite.setY(this.travelY + bob);
    this.hitZone.setPosition(this.sprite.x, this.sprite.y);
    this.labelText.setPosition(this.sprite.x, Math.min(this.sprite.y + this.labelOffset(), tankBounds.bottom - 8));
  }

  public addToContainer(container: Phaser.GameObjects.Container): void {
    container.add([this.hitZone, this.sprite, this.labelText]);
  }

  public setWorldScaleCompensation(tankViewScale: number): void {
    this.tankViewScale = Math.max(0.01, tankViewScale);
    const displaySize = presentDisplaySize / this.tankViewScale;
    const tapTargetSize = presentTapTargetSize / this.tankViewScale;
    this.sprite.setDisplaySize(displaySize, displaySize);
    this.hitZone.setSize(tapTargetSize, tapTargetSize);
    this.hitZone.setPosition(this.sprite.x, this.sprite.y);
    this.labelText.setFontSize(`${presentLabelFontSize / this.tankViewScale}px`);
    this.labelText.setPosition(this.sprite.x, Math.min(this.sprite.y + this.labelOffset(), tankBounds.bottom - 8));
  }

  public fitWithinVisibleBounds(bounds: Phaser.Geom.Rectangle, maxBottomY: number): void {
    const horizontalPadding = presentTapTargetSize * 0.5 / this.tankViewScale;
    const minX = Math.max(tankBounds.left + horizontalPadding, bounds.left + horizontalPadding);
    const maxX = Math.min(tankBounds.right - horizontalPadding, bounds.right - horizontalPadding);
    const fallbackX = Phaser.Math.Clamp(bounds.centerX || tankBounds.centerX, tankBounds.left + horizontalPadding, tankBounds.right - horizontalPadding);
    const clampX = (x: number) => (minX <= maxX ? Phaser.Math.Clamp(x, minX, maxX) : fallbackX);

    this.landingX = clampX(this.landingX);
    this.bottomY = Phaser.Math.Clamp(this.bottomY, tankBounds.top + 80, maxBottomY);
    this.travelY = Phaser.Math.Clamp(this.travelY, bounds.top + 24, this.bottomY);
    this.sprite.setPosition(clampX(this.sprite.x), this.travelY);
    this.hitZone.setPosition(this.sprite.x, this.sprite.y);
    this.labelText.setPosition(this.sprite.x, Math.min(this.sprite.y + this.labelOffset(), bounds.bottom - 8));
  }

  public get atBottom(): boolean {
    return this.travelY >= this.bottomY - 0.5;
  }

  public destroy(): void {
    this.hitZone.destroy();
    this.sprite.destroy();
    this.labelText.destroy();
  }

  private labelOffset(): number {
    return presentLabelOffset / this.tankViewScale;
  }
}
