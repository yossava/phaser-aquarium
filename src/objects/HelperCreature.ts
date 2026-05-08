import Phaser from "phaser";
import { tankBounds } from "../game/constants";
import { gameFontFamily } from "../game/fonts";
import type { CoinDrop } from "./CoinDrop";
import type { Fish } from "./Fish";
import type { FoodPellet } from "./FoodPellet";
import type { HelperCreatureType } from "../types/mechanics";

export type HelperCreatureAction =
  | { kind: "coin"; coin: CoinDrop }
  | { kind: "food"; food: FoodPellet }
  | { kind: "creatureFood"; food: FoodPellet }
  | { kind: "feed"; fish: Fish }
  | { kind: "tankClean" };

const helperBottomY = () => tankBounds.bottom - 36;
const creatureFoodTypeId = "creature";
const helperFatalCareSeconds = 60 * 60;
const helperHungerPerSecond = 0.35;
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
  public hunger = 16;
  public health = 100;
  public fatalCareSeconds = 0;
  private targetX: number;
  private stateBubble: Phaser.GameObjects.Graphics;
  private stateEmoji: Phaser.GameObjects.Text;
  private coinCooldown = 0;
  private cleanupCooldown = 0;
  private feedCooldown = 0;
  private tankCleanCooldown = 0;
  private feedWindup = 0;
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
    this.stateBubble = scene.add.graphics().setDepth(12);
    this.stateEmoji = scene.add
      .text(startX, startY, "", {
        fontFamily: gameFontFamily,
        fontSize: "16px",
        stroke: "#061725",
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(13);
    this.targetX = startX;
    this.updateStatusIndicator();
  }

  public addToContainer(container: Phaser.GameObjects.Container): void {
    container.add([this.sprite, this.stateBubble, this.stateEmoji]);
  }

  public setTankVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.stateBubble.setVisible(visible);
    this.stateEmoji.setVisible(visible);
  }

  public update(deltaSeconds: number, coins: CoinDrop[], foods: FoodPellet[], fish: Fish[] = []): HelperCreatureAction | undefined {
    this.updateVitals(deltaSeconds);
    this.coinCooldown = Math.max(0, this.coinCooldown - deltaSeconds);
    this.cleanupCooldown = Math.max(0, this.cleanupCooldown - deltaSeconds);
    this.feedCooldown = Math.max(0, this.feedCooldown - deltaSeconds);
    this.tankCleanCooldown = Math.max(0, this.tankCleanCooldown - deltaSeconds);
    this.wanderCooldown = Math.max(0, this.wanderCooldown - deltaSeconds);

    if (this.isFeeder()) {
      return this.updateFeeder(deltaSeconds, foods, fish);
    }

    const creatureFood = this.closestCreatureFood(foods);
    const coin = this.closestSettledCoin(coins);
    const food = this.closestWastedFood(foods);
    const target = creatureFood ?? coin ?? food;

    if (target) {
      this.targetX = target.sprite.x;
    } else if (this.wanderCooldown <= 0) {
      this.targetX = Phaser.Math.Between(tankBounds.left + 34, tankBounds.right - 34);
      this.wanderCooldown = Phaser.Math.FloatBetween(2.2, 4.8);
    }

    this.crawl(deltaSeconds);
    this.updateStatusIndicator();

    if (creatureFood && Math.abs(this.sprite.x - creatureFood.sprite.x) <= 16) {
      return { kind: "creatureFood", food: creatureFood };
    }

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

  public restoreVitals(hunger: number, health: number, fatalCareSecondsValue = 0): void {
    this.hunger = Phaser.Math.Clamp(hunger, 0, 100);
    this.health = Phaser.Math.Clamp(health, 0, 100);
    this.fatalCareSeconds = this.isInFatalCareState() ? Phaser.Math.Clamp(fatalCareSecondsValue, 0, helperFatalCareSeconds) : 0;
    this.updateStatusIndicator();
  }

  public isInFatalCareState(): boolean {
    return this.health < 35 || this.hunger > 72;
  }

  public isDeadFromNeglect(): boolean {
    return this.fatalCareSeconds >= helperFatalCareSeconds;
  }

  public fatalCareRemainingSeconds(): number {
    return Math.max(0, helperFatalCareSeconds - this.fatalCareSeconds);
  }

  public addFatalCareSeconds(seconds: number): void {
    this.fatalCareSeconds = this.isInFatalCareState()
      ? Phaser.Math.Clamp(this.fatalCareSeconds + Math.max(0, seconds), 0, helperFatalCareSeconds)
      : 0;
    this.updateStatusIndicator();
  }

  public destroy(): void {
    this.sprite.destroy();
    this.stateBubble.destroy();
    this.stateEmoji.destroy();
  }

  private updateVitals(deltaSeconds: number): void {
    this.hunger = Phaser.Math.Clamp(this.hunger + helperHungerPerSecond * deltaSeconds, 0, 100);
    if (this.hunger > 94) {
      this.health = Phaser.Math.Clamp(this.health - 3.2 * deltaSeconds, 0, 100);
    } else {
      this.health = Phaser.Math.Clamp(this.health + 1.6 * deltaSeconds, 0, 100);
    }

    this.fatalCareSeconds = this.isInFatalCareState()
      ? Phaser.Math.Clamp(this.fatalCareSeconds + deltaSeconds, 0, helperFatalCareSeconds)
      : 0;
  }

  public wantsCreatureFood(): boolean {
    return this.health < 35 || this.hunger > 62;
  }

  public consumeCreatureFood(calories: number): void {
    this.hunger = Phaser.Math.Clamp(this.hunger - calories, 0, 100);
    this.health = Phaser.Math.Clamp(this.health + 14, 0, 100);
    this.fatalCareSeconds = 0;
    this.updateStatusIndicator();
  }

  private canWork(): boolean {
    return this.health >= 24 && this.hunger < 96;
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

  private updateFeeder(deltaSeconds: number, foods: FoodPellet[], fish: Fish[]): HelperCreatureAction | undefined {
    const creatureFood = this.closestCreatureFood(foods);
    const feedTarget = creatureFood ? undefined : this.closestHungryFish(fish);
    if (creatureFood) {
      this.feedWindup = 0;
      this.targetX = creatureFood.sprite.x;
    } else if (feedTarget) {
      this.feedWindup += deltaSeconds;
      this.targetX = Phaser.Math.Clamp(feedTarget.sprite.x, tankBounds.left + 34, tankBounds.right - 34);
    } else if (this.wanderCooldown <= 0) {
      this.feedWindup = 0;
      this.targetX = Phaser.Math.Between(tankBounds.left + 34, tankBounds.right - 34);
      this.wanderCooldown = Phaser.Math.FloatBetween(2.2, 4.8);
    }

    this.crawl(deltaSeconds);
    this.updateStatusIndicator();

    if (creatureFood && Math.abs(this.sprite.x - creatureFood.sprite.x) <= 16) {
      return { kind: "creatureFood", food: creatureFood };
    }

    if (this.canWork() && feedTarget && this.feedCooldown <= 0 && (Math.abs(this.sprite.x - feedTarget.sprite.x) <= 92 || this.feedWindup >= 2.4)) {
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
    return this.closestByX(foods.filter((food) => food.foodType.id !== creatureFoodTypeId && food.sprite.y >= tankBounds.bottom - 24));
  }

  private closestCreatureFood(foods: FoodPellet[]): FoodPellet | undefined {
    if (!this.wantsCreatureFood()) {
      return undefined;
    }

    return this.closestByX(foods.filter((food) => food.foodType.id === creatureFoodTypeId));
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

  private updateStatusIndicator(): void {
    this.stateBubble.clear();
    this.stateEmoji.setText("");
    this.stateEmoji.setPosition(this.sprite.x, this.sprite.y - this.sprite.displayHeight / 2 - 20);

    if (this.health < 35 || this.hunger >= 99.5) {
      const emoji = this.health < 35 ? "+" : "!";
      this.stateBubble.fillStyle(this.health < 35 ? 0xff8f9a : 0xffd15c, 0.94);
      this.stateBubble.fillCircle(this.sprite.x, this.sprite.y - this.sprite.displayHeight / 2 - 25, 9);
      this.stateEmoji.setText(emoji);
      this.stateEmoji.setColor("#ffffff");
    }
  }

}
