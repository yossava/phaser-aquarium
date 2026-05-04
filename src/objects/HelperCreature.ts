import Phaser from "phaser";
import { tankBounds } from "../game/constants";
import type { CoinDrop } from "./CoinDrop";
import type { Fish } from "./Fish";
import type { FoodPellet } from "./FoodPellet";
import type { HelperCreatureType } from "../types/mechanics";

export type HelperCreatureAction =
  | { kind: "coin"; coin: CoinDrop }
  | { kind: "food"; food: FoodPellet }
  | { kind: "feed"; fish: Fish };

const helperBottomY = () => tankBounds.bottom - 36;
const helperDisplayWidths: Record<string, number> = {
  "helper-shrimp": 48,
  "helper-shell": 52,
  "helper-crab": 54,
  "helper-feeder-snail": 62,
};

export class HelperCreature {
  public readonly sprite: Phaser.GameObjects.Image;
  private targetX: number;
  private coinCooldown = 0;
  private cleanupCooldown = 0;
  private feedCooldown = 0;
  private feedWindup = 0;
  private wanderCooldown = 0;

  public constructor(
    private readonly scene: Phaser.Scene,
    public readonly type: HelperCreatureType,
    x: number,
    y = helperBottomY()
  ) {
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

  public update(deltaSeconds: number, coins: CoinDrop[], foods: FoodPellet[], fish: Fish[] = []): HelperCreatureAction | undefined {
    this.coinCooldown = Math.max(0, this.coinCooldown - deltaSeconds);
    this.cleanupCooldown = Math.max(0, this.cleanupCooldown - deltaSeconds);
    this.feedCooldown = Math.max(0, this.feedCooldown - deltaSeconds);
    this.wanderCooldown = Math.max(0, this.wanderCooldown - deltaSeconds);

    if (this.isFeeder()) {
      return this.updateFeeder(deltaSeconds, fish);
    }

    const coin = this.closestSettledCoin(coins);
    const food = this.closestWastedFood(foods);
    const target = coin ?? food;

    if (target) {
      this.targetX = target.sprite.x;
    } else if (this.wanderCooldown <= 0) {
      this.targetX = Phaser.Math.Between(tankBounds.left + 34, tankBounds.right - 34);
      this.wanderCooldown = Phaser.Math.FloatBetween(2.2, 4.8);
    }

    this.crawl(deltaSeconds);

    if (coin && this.coinCooldown <= 0 && Math.abs(this.sprite.x - coin.sprite.x) <= 16) {
      this.coinCooldown = this.type.coinCollectSeconds;
      return { kind: "coin", coin };
    }

    if (food && this.cleanupCooldown <= 0 && Math.abs(this.sprite.x - food.sprite.x) <= 16) {
      this.cleanupCooldown = this.type.cleanupSeconds;
      return { kind: "food", food };
    }

    return undefined;
  }

  public restoreProgress(targetX: number): void {
    if (this.isFeeder()) {
      this.targetX = Phaser.Math.Clamp(targetX, tankBounds.left + 24, tankBounds.right - 24);
      this.sprite.x = this.targetX;
      this.sprite.y = helperBottomY();
      return;
    }

    this.targetX = Phaser.Math.Clamp(targetX, tankBounds.left + 24, tankBounds.right - 24);
  }

  public getTargetX(): number {
    return this.targetX;
  }

  public destroy(): void {
    this.sprite.destroy();
  }

  private crawl(deltaSeconds: number): void {
    const distance = this.targetX - this.sprite.x;
    const step = Math.sign(distance) * Math.min(Math.abs(distance), this.type.speed * deltaSeconds);
    this.sprite.x = Phaser.Math.Clamp(this.sprite.x + step, tankBounds.left + 24, tankBounds.right - 24);
    this.sprite.y = helperBottomY() + Math.sin(this.scene.time.now / 280 + this.sprite.x / 24) * 2;
    this.sprite.setFlipX(step < -0.1);
  }

  private updateFeeder(deltaSeconds: number, fish: Fish[]): HelperCreatureAction | undefined {
    const feedTarget = this.closestHungryFish(fish);
    if (feedTarget) {
      this.feedWindup += deltaSeconds;
      this.targetX = Phaser.Math.Clamp(feedTarget.sprite.x, tankBounds.left + 34, tankBounds.right - 34);
    } else if (this.wanderCooldown <= 0) {
      this.feedWindup = 0;
      this.targetX = Phaser.Math.Between(tankBounds.left + 34, tankBounds.right - 34);
      this.wanderCooldown = Phaser.Math.FloatBetween(2.2, 4.8);
    }

    this.crawl(deltaSeconds);

    if (feedTarget && this.feedCooldown <= 0 && (Math.abs(this.sprite.x - feedTarget.sprite.x) <= 92 || this.feedWindup >= 2.4)) {
      this.feedCooldown = this.type.feedSeconds ?? 5;
      this.feedWindup = 0;
      return { kind: "feed", fish: feedTarget };
    }

    return undefined;
  }

  private closestSettledCoin(coins: CoinDrop[]): CoinDrop | undefined {
    return this.closestByX(coins.filter((coin) => coin.atBottom));
  }

  private closestWastedFood(foods: FoodPellet[]): FoodPellet | undefined {
    return this.closestByX(foods.filter((food) => food.sprite.y >= tankBounds.bottom - 24));
  }

  private closestHungryFish(fish: Fish[]): Fish | undefined {
    if (!this.type.feedSeconds) {
      return undefined;
    }

    return this.closestByX(fish.filter((currentFish) => currentFish.health >= 35 && currentFish.hunger >= 50));
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

  private isFeeder(): boolean {
    return this.isFeederType(this.type);
  }

  private isFeederType(type: HelperCreatureType): boolean {
    return Boolean(type.feedSeconds);
  }

  private fitSpriteToGameplayScale(): void {
    const displayWidth = helperDisplayWidths[this.type.texture] ?? Math.min(62, this.sprite.width);
    const aspectRatio = this.sprite.height / Math.max(1, this.sprite.width);
    this.sprite.setDisplaySize(displayWidth, displayWidth * aspectRatio);
  }

}
