import Phaser from "phaser";
import { tankBounds } from "../game/constants";
import type { AgeStage, CoinProduction, FishState, FishType } from "../types/mechanics";
import { FoodPellet } from "./FoodPellet";

const ageStageOrder: AgeStage[] = ["baby", "juvenile", "adult", "elder", "master"];

export class Fish {
  public sprite: Phaser.GameObjects.Sprite;
  public state: FishState = "happy";
  public ageStage: AgeStage = "baby";
  public ageSeconds = 0;
  public hunger = 12;
  public health = 100;
  public target = new Phaser.Math.Vector2();
  public nextCoinDropAt = 0;
  public facing = 1;

  public constructor(
    private scene: Phaser.Scene,
    public readonly type: FishType,
    x: number,
    y: number
  ) {
    this.sprite = scene.add.sprite(x, y, "fish-base");
    this.sprite.setTint(type.tint);
    this.sprite.setScale(type.ageCurve.baby.scale);
    this.sprite.setDepth(8);
    this.pickWanderTarget();
  }

  public update(deltaSeconds: number, foods: FoodPellet[]): FoodPellet | undefined {
    this.ageSeconds += deltaSeconds;
    this.updateAgeStage();

    this.hunger = Phaser.Math.Clamp(
      this.hunger + this.type.hungerPerSecond * this.currentAgeCurve().hungerMultiplier * deltaSeconds,
      0,
      100
    );

    if (this.hunger > 86) {
      this.health = Phaser.Math.Clamp(this.health - 4.5 * deltaSeconds, 0, 100);
    } else {
      this.health = Phaser.Math.Clamp(this.health + 2.5 * deltaSeconds, 0, 100);
    }

    this.state = this.health < 35 ? "ill" : this.hunger > 58 ? "hungry" : "happy";
    this.sprite.setScale(
      Math.min(this.type.maxScale, this.sprite.scaleX + this.type.growthPerSecond * deltaSeconds)
    );
    this.sprite.setAlpha(this.state === "ill" ? 0.62 : 1);

    const closestFood = this.findClosestFood(foods);
    if (closestFood && this.state !== "ill") {
      this.target.set(closestFood.sprite.x, closestFood.sprite.y);
    } else if (Phaser.Math.Distance.BetweenPoints(this.sprite, this.target) < 16) {
      this.pickWanderTarget();
    }

    const speedMultiplier = this.state === "ill" ? 0.45 : this.state === "hungry" ? 1.22 : 1;
    this.moveTowardTarget(deltaSeconds, this.type.speed * speedMultiplier);
    this.setStateTint();

    if (closestFood && Phaser.Math.Distance.BetweenPoints(this.sprite, closestFood.sprite) < 24) {
      this.hunger = Phaser.Math.Clamp(this.hunger - closestFood.nutrition, 0, 100);
      this.health = Phaser.Math.Clamp(this.health + 12, 0, 100);
      return closestFood;
    }

    return undefined;
  }

  public canDropCoin(now: number): boolean {
    return this.state === "happy" && now >= this.nextCoinDropAt;
  }

  public markCoinDropped(now: number): void {
    this.nextCoinDropAt = now + this.primaryProduction().intervalSeconds * 1000;
  }

  public primaryProduction(): CoinProduction {
    return this.currentAgeCurve().production[0] ?? {
      coinType: "common",
      amount: this.type.coinValue,
      intervalSeconds: this.type.coinDropSeconds,
      chance: 1
    };
  }

  public getSellValue(): number {
    const ageMultiplierByStage: Record<AgeStage, number> = {
      baby: 1,
      juvenile: 1.35,
      adult: 1.85,
      elder: 2.35,
      master: 3
    };
    const conditionMultiplier = Phaser.Math.Clamp((this.health + (100 - this.hunger)) / 200, 0.35, 1);
    return Math.max(1, Math.floor(this.type.sellBaseValue.amount * ageMultiplierByStage[this.ageStage] * conditionMultiplier));
  }

  public destroy(): void {
    this.sprite.destroy();
  }

  private currentAgeCurve() {
    return this.type.ageCurve[this.ageStage];
  }

  private updateAgeStage(): void {
    let remainingAge = this.ageSeconds;
    let nextStage: AgeStage = "baby";

    for (const stage of ageStageOrder) {
      nextStage = stage;
      const duration = this.type.ageCurve[stage].durationSeconds;
      if (duration === 0 || remainingAge < duration) {
        break;
      }
      remainingAge -= duration;
    }

    this.ageStage = nextStage;
  }

  private findClosestFood(foods: FoodPellet[]): FoodPellet | undefined {
    if (foods.length === 0 || this.state !== "hungry") {
      return undefined;
    }

    return foods.reduce((closest, food) => {
      const closestDistance = Phaser.Math.Distance.BetweenPoints(this.sprite, closest.sprite);
      const foodDistance = Phaser.Math.Distance.BetweenPoints(this.sprite, food.sprite);
      return foodDistance < closestDistance ? food : closest;
    });
  }

  private moveTowardTarget(deltaSeconds: number, speed: number): void {
    const direction = new Phaser.Math.Vector2(
      this.target.x - this.sprite.x,
      this.target.y - this.sprite.y
    );

    if (direction.lengthSq() < 4) {
      return;
    }

    direction.normalize();
    this.sprite.x += direction.x * speed * deltaSeconds;
    this.sprite.y += direction.y * speed * deltaSeconds;
    this.sprite.x = Phaser.Math.Clamp(this.sprite.x, tankBounds.left + 28, tankBounds.right - 28);
    this.sprite.y = Phaser.Math.Clamp(this.sprite.y, tankBounds.top + 26, tankBounds.bottom - 26);

    const nextFacing = direction.x >= 0 ? 1 : -1;
    if (nextFacing !== this.facing) {
      this.facing = nextFacing;
      this.sprite.setFlipX(nextFacing < 0);
    }

    this.sprite.rotation = direction.y * 0.08;
  }

  private pickWanderTarget(): void {
    this.target.set(
      Phaser.Math.Between(tankBounds.left + 48, tankBounds.right - 48),
      Phaser.Math.Between(tankBounds.top + 46, tankBounds.bottom - 56)
    );
  }

  private setStateTint(): void {
    if (this.state === "ill") {
      this.sprite.setTint(0x95a1a6);
      return;
    }

    if (this.state === "hungry") {
      this.sprite.setTint(Phaser.Display.Color.GetColor(255, 206, 88));
      return;
    }

    this.sprite.setTint(this.type.tint);
  }
}

