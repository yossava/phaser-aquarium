import Phaser from "phaser";
import { tankBounds } from "../game/constants";
import type { CoinDrop } from "./CoinDrop";
import type { Fish } from "./Fish";
import type { FoodPellet } from "./FoodPellet";
import type { HelperCreatureType } from "../types/mechanics";

export type HelperCreatureAction =
  | { kind: "coin"; coin: CoinDrop }
  | { kind: "food"; food: FoodPellet }
  | { kind: "tankClean" };

const helperBottomY = () => tankBounds.bottom - 36;
const creatureFoodTypeId = "creature";
const helperDisplayWidths: Record<string, number> = {
  "helper-shrimp": 60,
  "helper-shell": 52,
  "helper-crab": 54,
  "helper-feeder-snail": 62,
  "helper-auto-cleaner": 56
};
const reversedFacingHelperTextures = new Set(["helper-auto-cleaner"]);

export class HelperCreature {
  public readonly sprite: Phaser.GameObjects.Image;
  public tankLevel: number;
  private targetX: number;
  private coinCooldown = 0;
  private cleanupCooldown = 0;
  private tankCleanCooldown = 0;
  private wanderCooldown = 0;

  public constructor(
    private readonly scene: Phaser.Scene,
    public readonly type: HelperCreatureType,
    x: number,
    y = helperBottomY(),
    options: { tankLevel?: number } = {}
  ) {
    this.tankLevel = Math.max(1, Math.floor(options.tankLevel ?? 1));
    const startX = x;
    const startY = y;
    this.sprite = scene.add.image(startX, startY, type.texture);
    this.fitSpriteToGameplayScale();
    this.sprite.setDepth(8);
    this.sprite.setInteractive({ useHandCursor: true });
    this.targetX = startX;
  }

  public addToContainer(container: Phaser.GameObjects.Container): void {
    container.add(this.sprite);
  }

  public setTankVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
  }

  public update(deltaSeconds: number, coins: CoinDrop[], foods: FoodPellet[], fish: Fish[] = []): HelperCreatureAction | undefined {
    this.coinCooldown = Math.max(0, this.coinCooldown - deltaSeconds);
    this.cleanupCooldown = Math.max(0, this.cleanupCooldown - deltaSeconds);
    this.tankCleanCooldown = Math.max(0, this.tankCleanCooldown - deltaSeconds);
    this.wanderCooldown = Math.max(0, this.wanderCooldown - deltaSeconds);

    const coin = this.closestSettledCoin(coins);
    const food = this.closestWastedFood(foods);
    const target = this.canWork() ? coin ?? food : undefined;

    if (target) {
      this.targetX = target.sprite.x;
    } else if (this.wanderCooldown <= 0) {
      this.targetX = Phaser.Math.Between(tankBounds.left + 34, tankBounds.right - 34);
      this.wanderCooldown = Phaser.Math.FloatBetween(2.2, 4.8);
    }

    this.crawl(deltaSeconds);

    if (this.canWork() && this.type.tankCleanSeconds && this.tankCleanCooldown <= 0) {
      this.tankCleanCooldown = this.type.tankCleanSeconds;
      return { kind: "tankClean" };
    }

    if (this.canWork() && coin && this.coinCooldown <= 0 && Math.abs(this.sprite.x - coin.sprite.x) <= 16) {
      this.coinCooldown = this.type.coinCollectSeconds;
      return { kind: "coin", coin };
    }

    if (this.canWork() && food && this.cleanupCooldown <= 0 && Math.abs(this.sprite.x - food.sprite.x) <= 16) {
      this.cleanupCooldown = this.type.cleanupSeconds;
      return { kind: "food", food };
    }

    return undefined;
  }

  public restoreProgress(targetX: number): void {
    this.targetX = Phaser.Math.Clamp(targetX, tankBounds.left + 24, tankBounds.right - 24);
  }

  public getTargetX(): number {
    return this.targetX;
  }

  public destroy(): void {
    this.sprite.destroy();
  }

  private canWork(): boolean {
    return this.type.id !== "feeder-snail";
  }

  private crawl(deltaSeconds: number): void {
    const distance = this.targetX - this.sprite.x;
    const step = Math.sign(distance) * Math.min(Math.abs(distance), this.type.speed * deltaSeconds);
    this.sprite.x = Phaser.Math.Clamp(this.sprite.x + step, tankBounds.left + 24, tankBounds.right - 24);
    this.sprite.y = helperBottomY();
    if (Math.abs(step) > 0.1) {
      const shouldFaceLeft = step < 0;
      this.sprite.setFlipX(reversedFacingHelperTextures.has(this.type.texture) ? !shouldFaceLeft : shouldFaceLeft);
    }
  }

  private closestSettledCoin(coins: CoinDrop[]): CoinDrop | undefined {
    return this.closestByX(coins.filter((coin) => coin.atBottom));
  }

  private closestWastedFood(foods: FoodPellet[]): FoodPellet | undefined {
    return this.closestByX(foods.filter((food) => food.foodType.id !== creatureFoodTypeId && food.sprite.y >= tankBounds.bottom - 24));
  }

  private closestByX<T extends { sprite: Phaser.GameObjects.Image }>(items: T[]): T | undefined {
    let closest: T | undefined;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const item of items) {
      const distance = Math.abs(item.sprite.x - this.sprite.x);
      if (distance < closestDistance) {
        closest = item;
        closestDistance = distance;
      }
    }
    return closest;
  }

  private fitSpriteToGameplayScale(): void {
    const displayWidth = helperDisplayWidths[this.type.texture] ?? Math.min(62, this.sprite.width);
    const aspectRatio = this.sprite.height / Math.max(1, this.sprite.width);
    this.sprite.setDisplaySize(displayWidth, displayWidth * aspectRatio);
  }
}
