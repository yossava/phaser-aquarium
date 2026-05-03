import Phaser from "phaser";
import { gameWidth, tankBounds } from "../game/constants";
import { fishFoodTintFor, rarityStarCount, rarityTintFor } from "../game/visuals";
import type { AgeStage, CoinProduction, FishGender, FishState, FishType } from "../types/mechanics";
import { FoodPellet } from "./FoodPellet";

const ageStageOrder: AgeStage[] = ["baby", "juvenile", "adult", "elder", "master"];
const minimumHungerToEatMore = 3;
const veryBigScaleMultiplier = 1.55;
const secondsPerFishMonth = 60 * 60;
const monthsPerFishYear = 12;
const daysPerFishMonth = 30;
const growthCapYears = 50;
const growthCapSeconds = growthCapYears * monthsPerFishYear * secondsPerFishMonth;
const earlyGrowthSeconds = 6 * secondsPerFishMonth;
const minimumGrowthWidthRatio = 0.24;
const maximumGrowthWidthRatio = 0.5;
export const fatalCareSeconds = 60 * 60;

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
  public fatalCareSeconds = 0;
  public gender: FishGender;
  public evolutionStage: number;
  private statusBars: Phaser.GameObjects.Graphics;
  private tailMark: Phaser.GameObjects.Graphics;

  public constructor(
    private scene: Phaser.Scene,
    public readonly type: FishType,
    x: number,
    y: number,
    options: { gender?: FishGender; evolutionStage?: number } = {}
  ) {
    this.gender = options.gender ?? (Phaser.Math.Between(0, 1) === 0 ? "M" : "F");
    this.evolutionStage = Phaser.Math.Clamp(Math.floor(options.evolutionStage ?? 0), 0, 3);
    this.sprite = scene.add.sprite(x, y, "fish-base");
    this.sprite.setTint(this.bodyTint());
    this.sprite.setScale(this.desiredAgeScale());
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
    this.updateFatalCareTimer(deltaSeconds);
    this.sprite.setScale(this.desiredAgeScale());
    this.sprite.setAlpha(this.state === "ill" ? 0.62 : 1);

    const closestFood = this.findClosestFood(foods);
    if (closestFood) {
      this.target.set(closestFood.sprite.x, closestFood.sprite.y);
    } else if (Phaser.Math.Distance.BetweenPoints(this.sprite, this.target) < 16) {
      this.pickWanderTarget();
    }

    const speedMultiplier = closestFood ? this.foodChaseSpeedMultiplier() : this.state === "ill" ? 0.45 : this.state === "hungry" ? 1.22 : 1;
    this.moveTowardTarget(deltaSeconds, this.type.speed * speedMultiplier * this.movementSizeMultiplier());
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
      this.state = this.health < 35 ? "ill" : this.hunger > 68 ? "hungry" : "happy";
      if (!this.isInFatalCareState()) {
        this.fatalCareSeconds = 0;
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

  public restoreProgress(ageSeconds: number, hunger: number, health: number, nextCoinDropAt: number, fatalCareSecondsValue = 0): void {
    this.setAgeSeconds(ageSeconds);
    this.hunger = Phaser.Math.Clamp(hunger, 0, 100);
    this.health = Phaser.Math.Clamp(health, 0, 100);
    this.nextCoinDropAt = Math.max(0, nextCoinDropAt);
    this.state = this.health < 35 ? "ill" : this.hunger > 68 ? "hungry" : "happy";
    this.fatalCareSeconds = this.isInFatalCareState() ? Phaser.Math.Clamp(fatalCareSecondsValue, 0, fatalCareSeconds) : 0;
  }

  public setAgeSeconds(ageSeconds: number): void {
    this.ageSeconds = Math.max(0, ageSeconds);
    this.updateAgeStage();
    this.sprite.setScale(this.desiredAgeScale());
    this.updateStatusBars();
  }

  public applyMedicine(now: number): void {
    this.health = Phaser.Math.Clamp(Math.max(this.health + 55, 82), 0, 100);
    this.hunger = Phaser.Math.Clamp(Math.min(this.hunger, 35), 0, 100);
    this.medicatedUntil = now + 45000;
    this.fatalCareSeconds = 0;
    this.updateStatusBars();
  }

  public refreshStatusBars(): void {
    this.updateStatusBars();
  }

  public addToContainer(container: Phaser.GameObjects.Container): void {
    container.add([this.sprite, this.tailMark, this.statusBars]);
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
    const sizeMultiplier = 0.92 + Phaser.Math.Clamp(this.sprite.scaleX / this.veryBigScaleCap(), 0, 1) * 0.2;
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
      (1 + this.evolutionStage * 0.42) *
      productionMultiplier *
      sizeMultiplier *
      resilienceMultiplier *
      conditionMultiplier;
    const babyResaleCap = Math.floor(this.type.price.amount * 0.82);
    const cappedValue = this.ageStage === "baby" ? Math.min(rawValue, babyResaleCap) : rawValue;
    return Math.max(1, Math.floor(cappedValue));
  }

  public movementSizeMultiplier(): number {
    const ageZeroScale = this.visibleToWorldScale(this.type.ageCurve.baby.scale);
    const growthRange = Math.max(0.01, this.veryBigScaleCap() - ageZeroScale);
    const growthRatio = Phaser.Math.Clamp((this.sprite.scaleX - ageZeroScale) / growthRange, 0, 1);
    return Phaser.Math.Linear(1, 0.46, growthRatio);
  }

  public canEvolve(): boolean {
    return this.evolutionStage < 3;
  }

  public evolve(): void {
    if (!this.canEvolve()) {
      return;
    }

    this.evolutionStage += 1;
    this.setAgeSeconds(0);
    this.hunger = 12;
    this.health = 100;
    this.medicatedUntil = 0;
    this.fatalCareSeconds = 0;
    this.updateStatusBars();
  }

  public isInFatalCareState(): boolean {
    return this.health < 35 || this.hunger > 68;
  }

  public fatalCareRemainingSeconds(): number {
    return Math.max(0, fatalCareSeconds - this.fatalCareSeconds);
  }

  public addFatalCareSeconds(seconds: number): void {
    this.fatalCareSeconds = this.isInFatalCareState()
      ? Phaser.Math.Clamp(this.fatalCareSeconds + Math.max(0, seconds), 0, fatalCareSeconds)
      : 0;
  }

  public isDeadFromNeglect(): boolean {
    return this.fatalCareSeconds >= fatalCareSeconds;
  }

  public ageLabel(): string {
    const totalMonths = this.ageMonths();
    const wholeMonths = Math.floor(totalMonths);

    if (wholeMonths >= monthsPerFishYear) {
      const years = Math.floor(wholeMonths / monthsPerFishYear);
      const months = wholeMonths % monthsPerFishYear;
      return months > 0 ? `${years}y ${months}mo` : `${years}y`;
    }

    if (wholeMonths > 0) {
      const days = Math.floor((totalMonths - wholeMonths) * daysPerFishMonth);
      return days > 0 ? `${wholeMonths}mo ${days}d` : `${wholeMonths}mo`;
    }

    return `${Math.floor(totalMonths * daysPerFishMonth)}d`;
  }

  public ageMonths(): number {
    return Math.max(0, this.ageSeconds / secondsPerFishMonth);
  }

  public ageYears(): number {
    return this.ageMonths() / monthsPerFishYear;
  }

  public growthCapAgeYears(): number {
    return growthCapYears;
  }

  public veryBigScaleCap(): number {
    return this.visibleToWorldScale(this.type.maxScale * veryBigScaleMultiplier);
  }

  public naturalAgeScale(): number {
    return this.uncappedAgeScale();
  }

  public tankGrowthScaleCap(): number {
    const inferredTankViewScale = this.currentTankViewScale();
    const tankProgress = Phaser.Math.Clamp((1 - inferredTankViewScale) / 0.24, 0, 1);
    const visibleWidthRatio = Phaser.Math.Linear(minimumGrowthWidthRatio, maximumGrowthWidthRatio, tankProgress);
    const maxVisibleWidth = gameWidth * visibleWidthRatio;
    const maxWorldWidth = maxVisibleWidth / inferredTankViewScale;
    return Math.max(this.visibleToWorldScale(this.type.ageCurve.baby.scale), maxWorldWidth / Math.max(1, this.sprite.width));
  }

  public isGrowthLimitedByTank(): boolean {
    return this.naturalAgeScale() > this.tankGrowthScaleCap() + 0.01;
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
    growthBlockedByTank: boolean;
  } {
    return {
      visible: this.statusBars.visible,
      x: this.statusBars.x,
      y: this.statusBars.y,
      fullnessRatio: this.currentFullnessRatio(),
      moodRatio: this.currentMoodRatio(),
      tailTint: this.tailTint(),
      rarityStars: rarityStarCount(this.type.rarity),
      fullyGrown: this.isFullyGrown(),
      growthBlockedByTank: this.isGrowthLimitedByTank()
    };
  }

  private currentAgeCurve() {
    return this.type.ageCurve[this.ageStage];
  }

  private desiredAgeScale(): number {
    return Math.min(this.uncappedAgeScale(), this.tankGrowthScaleCap());
  }

  private uncappedAgeScale(): number {
    const ageSeconds = Math.max(0, this.ageSeconds);
    if (ageSeconds <= earlyGrowthSeconds) {
      return Phaser.Math.Linear(
        this.visibleToWorldScale(this.type.ageCurve.baby.scale),
        this.visibleToWorldScale(this.type.ageCurve.adult.scale),
        Phaser.Math.Clamp(ageSeconds / earlyGrowthSeconds, 0, 1)
      );
    }

    return Phaser.Math.Linear(
      this.visibleToWorldScale(this.type.ageCurve.adult.scale),
      this.veryBigScaleCap(),
      Phaser.Math.Clamp((ageSeconds - earlyGrowthSeconds) / Math.max(1, growthCapSeconds - earlyGrowthSeconds), 0, 1)
    );
  }

  private currentTankViewScale(): number {
    return Phaser.Math.Clamp(gameWidth / Math.max(1, tankBounds.width), 0.5, 1);
  }

  private visibleToWorldScale(visibleScale: number): number {
    return visibleScale / this.currentTankViewScale();
  }

  private updateAgeStage(): void {
    let remainingAge = this.ageSeconds;
    let nextStage: AgeStage = "baby";

    for (const stage of ageStageOrder) {
      nextStage = stage;
      const duration = this.ageStageDurationSeconds(stage);
      if (duration === 0 || remainingAge < duration) {
        break;
      }
      remainingAge -= duration;
    }

    this.ageStage = nextStage;
  }

  private ageStageDurationSeconds(stage: AgeStage): number {
    const oldTuningSeconds = this.type.ageCurve[stage].durationSeconds;
    if (oldTuningSeconds === 0) {
      return 0;
    }

    return oldTuningSeconds * 60;
  }

  private updateFatalCareTimer(deltaSeconds: number): void {
    if (this.isInFatalCareState()) {
      this.fatalCareSeconds = Phaser.Math.Clamp(this.fatalCareSeconds + deltaSeconds, 0, fatalCareSeconds);
      return;
    }

    this.fatalCareSeconds = 0;
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
    const fullyGrown = this.isFullyGrown();
    const growthBlocked = this.isGrowthLimitedByTank();
    const hasGrowthMarker = fullyGrown || growthBlocked;
    const yOffset = hasGrowthMarker ? 24 : 16;
    const y = Math.round(Math.max(tankBounds.top + yOffset, this.sprite.y - this.sprite.displayHeight / 2 - yOffset));
    const fullnessRatio = this.currentFullnessRatio();
    const moodRatio = this.currentMoodRatio();
    const fullnessColor = fullnessRatio < 0.35 ? 0xff6d75 : fullnessRatio < 0.68 ? 0xffd15c : 0x62f2a8;
    const moodColor = moodRatio < 0.35 ? 0xff6d75 : moodRatio < 0.68 ? 0xffd15c : 0x62f2a8;
    const barY = hasGrowthMarker ? 8 : 0;

    this.statusBars.clear();
    this.statusBars.setPosition(x, y);

    if (fullyGrown) {
      this.statusBars.fillStyle(0x10283a, 0.86);
      this.statusBars.fillRoundedRect(3, -3, 28, 8, 3);
      this.statusBars.lineStyle(1, 0x62f2a8, 0.85);
      this.statusBars.strokeRoundedRect(3, -3, 28, 8, 3);
      this.statusBars.fillStyle(0x62f2a8, 1);
      this.statusBars.fillRect(8, 0, 18, 2);
    } else if (growthBlocked) {
      this.statusBars.fillStyle(0x3a2410, 0.9);
      this.statusBars.fillRoundedRect(4, -3, 26, 8, 3);
      this.statusBars.lineStyle(1, 0xffd15c, 0.9);
      this.statusBars.strokeRoundedRect(4, -3, 26, 8, 3);
      this.statusBars.fillStyle(0xffd15c, 1);
      this.statusBars.fillRect(8, 0, 18, 2);
      this.statusBars.fillTriangle(25, -1, 29, 1, 25, 3);
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
    return !this.isGrowthLimitedByTank() && this.sprite.scaleX >= this.veryBigScaleCap() - 0.01;
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
