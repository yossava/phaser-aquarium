import Phaser from "phaser";
import { tankBounds } from "../game/constants";
import { fishFoodTintFor, rarityStarCount, rarityTintFor } from "../game/visuals";
import type { AgeStage, CoinProduction, FishState, FishType } from "../types/mechanics";
import { FoodPellet } from "./FoodPellet";

const ageStageOrder: AgeStage[] = ["baby", "juvenile", "adult", "elder", "master"];
const minimumHungerToEatMore = 3;

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
  public medicatedUntil = 0;
  private statusBars: Phaser.GameObjects.Graphics;
  private tailMark: Phaser.GameObjects.Graphics;

  public constructor(
    private scene: Phaser.Scene,
    public readonly type: FishType,
    x: number,
    y: number
  ) {
    this.sprite = scene.add.sprite(x, y, "fish-base");
    this.sprite.setTint(this.bodyTint());
    this.sprite.setScale(type.ageCurve.baby.scale);
    this.sprite.setDepth(8);
    this.tailMark = scene.add.graphics();
    this.tailMark.setDepth(9);
    this.statusBars = scene.add.graphics();
    this.statusBars.setDepth(12);
    this.pickWanderTarget();
    this.updateTailMark();
    this.updateStatusBars();
  }

  public update(deltaSeconds: number, foods: FoodPellet[]): { food: FoodPellet; accepted: boolean } | undefined {
    this.ageSeconds += deltaSeconds;
    this.updateAgeStage();

    const isMedicated = this.scene.time.now < this.medicatedUntil;
    const hungerGrowthMultiplier = isMedicated ? 0.35 : 1;
    this.hunger = Phaser.Math.Clamp(
      this.hunger + this.type.hungerPerSecond * this.currentAgeCurve().hungerMultiplier * hungerGrowthMultiplier * deltaSeconds,
      0,
      100
    );

    if (this.hunger > 94 && !isMedicated) {
      this.health = Phaser.Math.Clamp(this.health - 4.5 * deltaSeconds, 0, 100);
    } else {
      this.health = Phaser.Math.Clamp(this.health + (isMedicated ? 4 : 2.5) * deltaSeconds, 0, 100);
    }

    this.state = this.health < 35 ? "ill" : this.hunger > 68 ? "hungry" : "happy";
    this.sprite.setScale(
      Math.min(this.type.maxScale, this.sprite.scaleX + this.type.growthPerSecond * deltaSeconds)
    );
    this.sprite.setAlpha(this.state === "ill" ? 0.62 : 1);

    const closestFood = this.findClosestFood(foods);
    if (closestFood) {
      this.target.set(closestFood.sprite.x, closestFood.sprite.y);
    } else if (Phaser.Math.Distance.BetweenPoints(this.sprite, this.target) < 16) {
      this.pickWanderTarget();
    }

    const speedMultiplier = closestFood ? this.foodChaseSpeedMultiplier() : this.state === "ill" ? 0.45 : this.state === "hungry" ? 1.22 : 1;
    this.moveTowardTarget(deltaSeconds, this.type.speed * speedMultiplier);
    this.setStateTint();

    if (closestFood && Phaser.Math.Distance.BetweenPoints(this.sprite, closestFood.sprite) < 24) {
      const accepted = this.acceptsFood(closestFood);
      if (accepted) {
        this.hunger = Phaser.Math.Clamp(this.hunger - closestFood.nutrition, 0, 100);
        this.health = Phaser.Math.Clamp(this.health + 12, 0, 100);
      } else {
        this.hunger = Phaser.Math.Clamp(this.hunger + 8, 0, 100);
        this.health = Phaser.Math.Clamp(this.health - 8, 0, 100);
      }
      this.updateStatusBars();
      return { food: closestFood, accepted };
    }

    this.updateStatusBars();
    return undefined;
  }

  public canDropCoin(now: number): boolean {
    return (this.state === "happy" || this.state === "ill") && now >= this.nextCoinDropAt;
  }

  public markCoinDropped(now: number): void {
    this.nextCoinDropAt = now + this.activeProduction().intervalSeconds * 1000;
  }

  public restoreProgress(ageSeconds: number, hunger: number, health: number, nextCoinDropAt: number): void {
    this.setAgeSeconds(ageSeconds);
    this.hunger = Phaser.Math.Clamp(hunger, 0, 100);
    this.health = Phaser.Math.Clamp(health, 0, 100);
    this.nextCoinDropAt = Math.max(0, nextCoinDropAt);
  }

  public setAgeSeconds(ageSeconds: number): void {
    this.ageSeconds = Math.max(0, ageSeconds);
    this.updateAgeStage();
    this.sprite.setScale(Math.min(this.type.maxScale, this.currentAgeCurve().scale));
    this.updateStatusBars();
  }

  public applyMedicine(now: number): void {
    this.health = Phaser.Math.Clamp(Math.max(this.health + 55, 82), 0, 100);
    this.hunger = Phaser.Math.Clamp(Math.min(this.hunger, 35), 0, 100);
    this.medicatedUntil = now + 45000;
    this.updateStatusBars();
  }

  public refreshStatusBars(): void {
    this.updateStatusBars();
  }

  public primaryProduction(): CoinProduction {
    return this.currentAgeCurve().production[0] ?? {
      coinType: "common",
      amount: this.type.coinValue,
      intervalSeconds: this.type.coinDropSeconds,
      chance: 1
    };
  }

  public activeProduction(): CoinProduction {
    const production = this.primaryProduction();
    if (this.state === "ill") {
      return { ...production, amount: 1, intervalSeconds: production.intervalSeconds * 3 };
    }
    return production;
  }

  public getSellValue(): number {
    const ageMultiplierByStage: Record<AgeStage, number> = {
      baby: 0.82,
      juvenile: 1.25,
      adult: 1.85,
      elder: 2.45,
      master: 3.25
    };
    const rarityMultiplier: Record<FishType["rarity"], number> = {
      common: 1,
      rare: 1.12,
      superRare: 1.28
    };
    const productionPerMinute = this.currentAgeCurve().production.reduce((total, production) => {
      const coinWeight = production.coinType === "superRare" ? 8 : production.coinType === "rare" ? 3 : 1;
      return total + (production.amount * coinWeight * production.chance * 60) / production.intervalSeconds;
    }, 0);
    const productionMultiplier = 1 + Phaser.Math.Clamp(productionPerMinute / 90, 0, 1) * 0.34;
    const sizeMultiplier = 0.92 + Phaser.Math.Clamp(this.currentAgeCurve().scale / this.type.maxScale, 0, 1) * 0.2;
    const resilienceMultiplier = 0.96 + this.type.illnessResistance * 0.1;
    const conditionMultiplier = Phaser.Math.Clamp(
      0.55 + (this.health / 100) * 0.4 + ((100 - this.hunger) / 100) * 0.17,
      0.55,
      1.12
    );
    const rawValue =
      this.type.sellBaseValue.amount *
      ageMultiplierByStage[this.ageStage] *
      rarityMultiplier[this.type.rarity] *
      productionMultiplier *
      sizeMultiplier *
      resilienceMultiplier *
      conditionMultiplier;
    const babyResaleCap = Math.floor(this.type.price.amount * 0.82);
    const cappedValue = this.ageStage === "baby" ? Math.min(rawValue, babyResaleCap) : rawValue;
    return Math.max(1, Math.floor(cappedValue));
  }

  public destroy(): void {
    this.tailMark.destroy();
    this.statusBars.destroy();
    this.sprite.destroy();
  }

  public getStatusBarsSnapshot(): {
    visible: boolean;
    x: number;
    y: number;
    fullnessRatio: number;
    moodRatio: number;
    tailTint: number;
    rarityStars: number;
    fullyGrown: boolean;
  } {
    return {
      visible: this.statusBars.visible,
      x: this.statusBars.x,
      y: this.statusBars.y,
      fullnessRatio: this.currentFullnessRatio(),
      moodRatio: this.currentMoodRatio(),
      tailTint: this.tailTint(),
      rarityStars: rarityStarCount(this.type.rarity),
      fullyGrown: this.isFullyGrown()
    };
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
    if (foods.length === 0) {
      return undefined;
    }

    const edibleFoods = foods.filter((food) => this.willChaseFood(food));
    const willingToEat = this.state === "hungry" || this.state === "ill" || this.hunger > minimumHungerToEatMore;
    if (edibleFoods.length === 0 || !willingToEat) {
      return undefined;
    }

    return edibleFoods.reduce((closest, food) => {
      const closestDistance = Phaser.Math.Distance.BetweenPoints(this.sprite, closest.sprite);
      const foodDistance = Phaser.Math.Distance.BetweenPoints(this.sprite, food.sprite);
      return foodDistance < closestDistance ? food : closest;
    });
  }

  private acceptsFood(food: FoodPellet): boolean {
    return (
      food.foodType.acceptedByDefault ||
      this.type.requiredFoodTypes.includes(food.foodType.id) ||
      this.type.preferredFoodTypes.includes(food.foodType.id)
    );
  }

  private willChaseFood(food: FoodPellet): boolean {
    if (this.state === "ill") {
      return food.foodType.id === "medicine";
    }

    if (food.foodType.id === "medicine") {
      return false;
    }

    if (this.acceptsFood(food)) {
      return this.hunger > minimumHungerToEatMore;
    }

    return this.state === "hungry";
  }

  private foodChaseSpeedMultiplier(): number {
    if (this.state === "ill") {
      return 1.05;
    }

    return this.state === "hungry" ? 2.15 : 1.85;
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
      this.sprite.setTint(this.desaturatedTint(this.bodyTint(), 0.46));
      return;
    }

    this.sprite.setTint(this.bodyTint());
  }

  private updateStatusBars(): void {
    const barWidth = 34;
    const barHeight = 3;
    const gap = 2;
    const x = Math.round(this.sprite.x - barWidth / 2);
    const yOffset = this.isFullyGrown() ? 24 : 16;
    const y = Math.round(Math.max(tankBounds.top + yOffset, this.sprite.y - this.sprite.displayHeight / 2 - yOffset));
    const fullnessRatio = this.currentFullnessRatio();
    const moodRatio = this.currentMoodRatio();
    const fullnessColor = fullnessRatio < 0.35 ? 0xff6d75 : fullnessRatio < 0.68 ? 0xffd15c : 0x62f2a8;
    const moodColor = moodRatio < 0.35 ? 0xff6d75 : moodRatio < 0.68 ? 0xffd15c : 0x62f2a8;
    const barY = this.isFullyGrown() ? 8 : 0;

    this.statusBars.clear();
    this.statusBars.setPosition(x, y);

    if (this.isFullyGrown()) {
      this.statusBars.fillStyle(0x10283a, 0.86);
      this.statusBars.fillRoundedRect(3, -3, 28, 8, 3);
      this.statusBars.lineStyle(1, 0x62f2a8, 0.85);
      this.statusBars.strokeRoundedRect(3, -3, 28, 8, 3);
      this.statusBars.fillStyle(0x62f2a8, 1);
      this.statusBars.fillRect(8, 0, 18, 2);
    }

    this.statusBars.fillStyle(0x061725, 0.72);
    this.statusBars.fillRoundedRect(-1, barY - 1, barWidth + 2 + rarityStarCount(this.type.rarity) * 6, barHeight * 2 + gap + 2, 2);
    this.statusBars.fillStyle(0x19364a, 0.95);
    this.statusBars.fillRoundedRect(0, barY, barWidth, barHeight, 1);
    this.statusBars.fillRoundedRect(0, barY + barHeight + gap, barWidth, barHeight, 1);
    this.statusBars.fillStyle(fullnessColor, 1);
    this.statusBars.fillRoundedRect(0, barY, Math.max(2, barWidth * fullnessRatio), barHeight, 1);
    this.statusBars.fillStyle(moodColor, 1);
    this.statusBars.fillRoundedRect(0, barY + barHeight + gap, Math.max(2, barWidth * moodRatio), barHeight, 1);
    this.statusBars.lineStyle(1, 0xd7f4ff, 0.28);
    this.statusBars.strokeRoundedRect(-1, barY - 1, barWidth + 2 + rarityStarCount(this.type.rarity) * 6, barHeight * 2 + gap + 2, 2);
    this.drawRarityStars(barWidth + 5, barY + 4);
    this.updateTailMark();
  }

  private currentMoodRatio(): number {
    return Phaser.Math.Clamp(this.health / 100, 0, 1);
  }

  private currentFullnessRatio(): number {
    return Phaser.Math.Clamp(1 - this.hunger / 100, 0, 1);
  }

  private tailTint(): number {
    return fishFoodTintFor(this.type);
  }

  private bodyTint(): number {
    return this.type.tint;
  }

  private isFullyGrown(): boolean {
    return this.ageStage === "master" || this.sprite.scaleX >= this.type.maxScale - 0.01;
  }

  private drawRarityStars(x: number, y: number): void {
    const stars = rarityStarCount(this.type.rarity);
    const tint = rarityTintFor(this.type.rarity);

    for (let index = 0; index < stars; index += 1) {
      this.drawStar(x + index * 6, y, 2.5, tint);
    }
  }

  private drawStar(x: number, y: number, radius: number, tint: number): void {
    const points: Phaser.Math.Vector2[] = [];
    for (let index = 0; index < 10; index += 1) {
      const angle = -Math.PI / 2 + (index * Math.PI) / 5;
      const pointRadius = index % 2 === 0 ? radius : radius * 0.48;
      points.push(new Phaser.Math.Vector2(x + Math.cos(angle) * pointRadius, y + Math.sin(angle) * pointRadius));
    }

    this.statusBars.fillStyle(tint, 1);
    this.statusBars.fillPoints(points, true);
    this.statusBars.lineStyle(1, 0x061725, 0.55);
    this.statusBars.strokePoints(points, true);
  }

  private updateTailMark(): void {
    const scale = this.sprite.scaleX;
    const tailSide = this.facing >= 0 ? -1 : 1;
    const tailEdgeX = tailSide * (this.sprite.displayWidth / 2 - 1 * scale);
    const tailJoinX = tailSide * (this.sprite.displayWidth / 2 - 13 * scale);
    const tailHalfHeight = 13 * scale;
    const points = [
      new Phaser.Math.Vector2(tailJoinX, 0),
      new Phaser.Math.Vector2(tailEdgeX, -tailHalfHeight),
      new Phaser.Math.Vector2(tailEdgeX, tailHalfHeight)
    ];

    this.tailMark.clear();
    this.tailMark.setPosition(this.sprite.x, this.sprite.y);
    this.tailMark.setRotation(this.sprite.rotation);
    this.tailMark.setAlpha(this.state === "ill" ? 0.72 : 0.95);
    this.tailMark.fillStyle(this.tailTint(), 1);
    this.tailMark.fillPoints(points, true);
    this.tailMark.lineStyle(1, 0x061725, 0.24);
    this.tailMark.strokePoints(points, true);
  }

  private desaturatedTint(tint: number, amount: number): number {
    const red = (tint >> 16) & 0xff;
    const green = (tint >> 8) & 0xff;
    const blue = tint & 0xff;
    const gray = red * 0.3 + green * 0.59 + blue * 0.11;
    const mix = (channel: number) => Math.round(channel * (1 - amount) + gray * amount);
    return Phaser.Display.Color.GetColor(mix(red), mix(green), mix(blue));
  }
}
