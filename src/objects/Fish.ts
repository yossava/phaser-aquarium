import Phaser from "phaser";
import { gameWidth, tankBounds } from "../game/constants";
import { fishFoodTintFor } from "../game/visuals";
import type { AgeStage, CoinProduction, FishGender, FishState, FishType, FoodType } from "../types/mechanics";
import { FoodPellet } from "./FoodPellet";

const ageStageOrder: AgeStage[] = ["baby", "juvenile", "adult", "elder", "master"];
const coinTypeWeight: Record<CoinProduction["coinType"], number> = {
  common: 1,
  rare: 3,
  superRare: 8
};
const coinTypeLabel: Record<CoinProduction["coinType"], string> = {
  common: "Common",
  rare: "Rare",
  superRare: "Super Rare"
};
const bridgeChanceByStage: Record<AgeStage, number> = {
  baby: 0.05,
  juvenile: 0.08,
  adult: 0.12,
  elder: 0.16,
  master: 0.22
};
const minimumHungerToEatMore = 3;
const veryBigScaleMultiplier = 1.55;
const secondsPerFishMonth = 60 * 60;
const monthsPerFishYear = 12;
const daysPerFishMonth = 30;
const growthCapYears = 50;
const growthCapSeconds = growthCapYears * monthsPerFishYear * secondsPerFishMonth;
const oneMonthGrowthSeconds = secondsPerFishMonth;
const youngGrowthSeconds = 6 * secondsPerFishMonth;
const adultGrowthSeconds = 12 * secondsPerFishMonth;
const hatchlingAdultScaleRatio = 0.34;
const oneMonthAdultScaleRatio = 0.48;
const youngAdultScaleRatio = 0.78;
const minimumGrowthWidthRatio = 0.24;
const maximumGrowthWidthRatio = 0.5;
const happyEmojiDurationMs = 3200;
const fishLengthDisplayMultiplier = 10;
const baselineMealCalories = 46;
const baseTextureWidth = 64;
const baseTextureHeight = 48;
const idleSwimFrequency = 3.4;
const chaseSwimFrequency = 7.2;
const idleSwimBobPixels = 0.28;
const chaseSwimBobPixels = 0.62;
const idleTailWagPixels = 5.4;
const chaseTailWagPixels = 9.2;
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
  private stateBubble: Phaser.GameObjects.Graphics;
  private stateEmoji: Phaser.GameObjects.Text;
  private productionProgress = new Map<string, number>();
  private happyEmojiUntil = 0;
  private visualWorldScale = 1;
  private swimPhase: number;
  private swimYOffset = 0;
  private swimRotationBase = 0;
  private tailWag = 0;
  private tailFan = 1;
  private readonly usesCustomTexture: boolean;
  private readonly textureAspectRatio: number;

  public constructor(
    private scene: Phaser.Scene,
    public readonly type: FishType,
    x: number,
    y: number,
    options: { gender?: FishGender; evolutionStage?: number } = {}
  ) {
    this.gender = options.gender ?? (Phaser.Math.Between(0, 1) === 0 ? "M" : "F");
    this.evolutionStage = Phaser.Math.Clamp(Math.floor(options.evolutionStage ?? 0), 0, 3);
    this.swimPhase = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const textureKey = this.customTextureKey();
    this.usesCustomTexture = textureKey !== "fish-base";
    this.sprite = scene.add.sprite(x, y, textureKey);
    this.textureAspectRatio = this.usesCustomTexture ? this.sprite.height / Math.max(1, this.sprite.width) : baseTextureHeight / baseTextureWidth;
    this.setStateTint();
    this.setVisualScale(this.desiredAgeScale());
    this.sprite.setDepth(8);
    this.tailMark = scene.add.graphics();
    this.tailMark.setDepth(9);
    this.statusBars = scene.add.graphics();
    this.statusBars.setDepth(12);
    this.stateBubble = scene.add.graphics();
    this.stateBubble.setDepth(12);
    this.stateEmoji = scene.add
      .text(x, y, "", {
        fontFamily: "Arial",
        fontSize: "18px",
        stroke: "#061725",
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(13);
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
      this.hunger + this.hungerPerSecond() * hungerGrowthMultiplier * deltaSeconds,
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
    this.setVisualScale(this.desiredAgeScale());
    this.sprite.setAlpha(this.state === "ill" ? 0.62 : 1);

    const closestFood = this.findClosestFood(foods);
    if (closestFood) {
      this.target.set(closestFood.sprite.x, closestFood.sprite.y);
    } else if (Phaser.Math.Distance.BetweenPoints(this.sprite, this.target) < 16) {
      this.pickWanderTarget();
    }

    const speedMultiplier = closestFood ? this.foodChaseSpeedMultiplier() : this.state === "ill" ? 0.45 : this.state === "hungry" ? 1.22 : 1;
    const moveSpeed = this.type.speed * speedMultiplier * this.movementSizeMultiplier();
    this.moveTowardTarget(deltaSeconds, moveSpeed);
    this.animateSwimming(deltaSeconds, moveSpeed, closestFood !== undefined);
    this.setStateTint();

    if (closestFood && Phaser.Math.Distance.BetweenPoints(this.sprite, closestFood.sprite) < 24) {
      const accepted = this.acceptsFood(closestFood);
      if (accepted) {
        this.hunger = Phaser.Math.Clamp(this.hunger - this.hungerReductionFromFood(closestFood), 0, 100);
        this.health = Phaser.Math.Clamp(this.health + 12, 0, 100);
        this.happyEmojiUntil = this.scene.time.now + happyEmojiDurationMs;
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

  public markCoinDroppedForProduction(now: number, production: CoinProduction): void {
    this.nextCoinDropAt = now + production.intervalSeconds * 1000;
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
    this.setVisualScale(this.desiredAgeScale());
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
    container.add([this.sprite, this.tailMark, this.statusBars, this.stateBubble, this.stateEmoji]);
  }

  public primaryProduction(): CoinProduction {
    return this.currentAgeCurve().production[0] ?? {
      coinType: "common",
      amount: this.type.coinValue,
      intervalSeconds: this.type.coinDropSeconds,
      chance: 1
    };
  }

  public productionOptions(): CoinProduction[] {
    const production = this.currentAgeCurve().production;
    return this.withProgressionBridge(production.length > 0 ? production : [this.primaryProduction()]);
  }

  public activeProduction(): CoinProduction {
    const production = this.primaryProduction();
    if (this.state === "ill") {
      return { ...production, amount: 1, intervalSeconds: production.intervalSeconds * 3 };
    }
    return production;
  }

  public rollActiveProduction(): CoinProduction {
    const production = this.rollProduction();
    if (this.state === "ill") {
      return { ...production, amount: 1, intervalSeconds: production.intervalSeconds * 3 };
    }
    return production;
  }

  public productionSummary(): string {
    const options = this.productionOptions();
    const mainProduction = options[0] ?? this.primaryProduction();
    const bonus = options
      .slice(1)
      .sort((a, b) => coinTypeWeight[b.coinType] - coinTypeWeight[a.coinType])
      .find((production) => production.coinType !== mainProduction.coinType);

    if (!bonus) {
      return `${mainProduction.amount} ${coinTypeLabel[mainProduction.coinType]} / ${mainProduction.intervalSeconds}s`;
    }

    return `${mainProduction.amount} ${coinTypeLabel[mainProduction.coinType]} / ${mainProduction.intervalSeconds}s + ${coinTypeLabel[bonus.coinType]} bonus`;
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
    const productionPerMinute = this.productionOptions().reduce((total, production) => {
      const coinWeight = coinTypeWeight[production.coinType];
      return total + (production.amount * coinWeight * production.chance * 60) / production.intervalSeconds;
    }, 0);
    const productionMultiplier = 1 + Phaser.Math.Clamp(productionPerMinute / 90, 0, 1) * 0.34;
    const sizeMultiplier = 0.92 + Phaser.Math.Clamp(this.currentVisualWorldScale() / this.veryBigScaleCap(), 0, 1) * 0.2;
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
    const ageZeroScale = this.visibleToWorldScale(this.hatchlingScale());
    const growthRange = Math.max(0.01, this.veryBigScaleCap() - ageZeroScale);
    const growthRatio = Phaser.Math.Clamp((this.currentVisualWorldScale() - ageZeroScale) / growthRange, 0, 1);
    return Phaser.Math.Linear(1, 0.46, growthRatio);
  }

  public calorieNeedMultiplier(): number {
    const speciesSizeRatio = Phaser.Math.Clamp((this.adultLengthCm() / fishLengthDisplayMultiplier - 8) / 24, 0, 1);
    const speciesMultiplier = Phaser.Math.Linear(0.95, 1.18, speciesSizeRatio);
    return Phaser.Math.Linear(0.72, 3.8, this.biologicalGrowthRatio()) * speciesMultiplier;
  }

  public hungerPerSecond(): number {
    return this.type.hungerPerSecond * this.currentAgeCurve().hungerMultiplier * this.calorieNeedMultiplier();
  }

  public mealCaloriesNeeded(): number {
    return baselineMealCalories * this.calorieNeedMultiplier();
  }

  public hungerReductionFromFood(food: FoodPellet | FoodType): number {
    const foodType = food instanceof FoodPellet ? food.foodType : food;
    const preferredMultiplier = this.type.preferredFoodTypes.includes(foodType.id) ? 1.08 : 1;
    const medicineMultiplier = foodType.id === "medicine" ? 0.55 : 1;
    return (foodType.calories * preferredMultiplier * medicineMultiplier) / this.calorieNeedMultiplier();
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

  public lengthCm(): number {
    const adultLengthCm = this.adultLengthCm();
    const startingLengthCm = adultLengthCm * 0.25;
    return Phaser.Math.Linear(startingLengthCm, adultLengthCm * veryBigScaleMultiplier, this.biologicalGrowthRatio());
  }

  public weightGrams(): number {
    const maxLengthCm = this.adultLengthCm() * veryBigScaleMultiplier;
    const lengthRatio = Phaser.Math.Clamp(this.lengthCm() / Math.max(1, maxLengthCm), 0, 1);
    const maxWeightGrams = Math.pow(maxLengthCm, 3) * 0.012;
    return Math.max(0.1, maxWeightGrams * Math.pow(lengthRatio, 3));
  }

  public lengthLabel(): string {
    return `${this.lengthCm().toFixed(1)} cm`;
  }

  public weightLabel(): string {
    const grams = this.weightGrams();
    if (grams >= 1000) {
      return `${(grams / 1000).toFixed(1)} kg`;
    }

    return `${grams.toFixed(1)} g`;
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
    return Math.max(this.visibleToWorldScale(this.hatchlingScale()), maxWorldWidth / this.logicalTextureWidth());
  }

  public isGrowthLimitedByTank(): boolean {
    return this.naturalAgeScale() > this.tankGrowthScaleCap() + 0.01;
  }

  public destroy(): void {
    this.tailMark.destroy();
    this.statusBars.destroy();
    this.stateBubble.destroy();
    this.stateEmoji.destroy();
    this.sprite.destroy();
  }

  public textureKey(): string {
    return this.sprite.texture.key;
  }

  public visualScale(): number {
    return this.currentVisualWorldScale();
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
    emoji: string;
    emojiVisible: boolean;
    emojiX: number;
    emojiY: number;
    emojiBubbleVisible: boolean;
    careBarsVisible: boolean;
  } {
    const fullnessRatio = this.currentFullnessRatio();
    const moodRatio = this.currentMoodRatio();
    return {
      visible: this.statusBars.visible,
      x: this.statusBars.x,
      y: this.statusBars.y,
      fullnessRatio,
      moodRatio,
      tailTint: this.tailTint(),
      rarityStars: 0,
      fullyGrown: this.isFullyGrown(),
      growthBlockedByTank: this.isGrowthLimitedByTank(),
      emoji: this.stateEmoji.text,
      emojiVisible: this.stateEmoji.visible,
      emojiX: this.stateEmoji.x,
      emojiY: this.stateEmoji.y,
      emojiBubbleVisible: this.stateBubble.visible,
      careBarsVisible: this.shouldShowCareBars(fullnessRatio, moodRatio)
    };
  }

  public getTailAnimationSnapshot(): { wag: number; fan: number; alpha: number; visible: boolean } {
    return {
      wag: this.tailWag,
      fan: this.tailFan,
      alpha: this.tailMark.alpha,
      visible: this.tailMark.visible
    };
  }

  private currentAgeCurve() {
    return this.type.ageCurve[this.ageStage];
  }

  private withProgressionBridge(production: CoinProduction[]): CoinProduction[] {
    const options = production.map((entry) =>
      this.type.rarity === "rare" && entry.coinType === "rare" && entry.chance < 0.55
        ? { ...entry, chance: 0.55 }
        : entry
    );
    const primary = options[0] ?? this.primaryProduction();

    if (this.type.rarity === "common") {
      return [
        ...options,
        {
          coinType: "rare",
          amount: 1,
          intervalSeconds: Math.max(primary.intervalSeconds + 10, 18),
          chance: bridgeChanceByStage[this.ageStage]
        }
      ];
    }

    if (this.type.rarity === "rare") {
      const rareOptions: CoinProduction[] = options.some((entry) => entry.coinType === "rare")
        ? options
        : [
            ...options,
            {
              coinType: "rare",
              amount: Math.max(1, Math.floor(primary.amount / 10)),
              intervalSeconds: Math.max(primary.intervalSeconds + 8, 20),
              chance: 0.65
            }
          ];

      return [
        ...rareOptions,
        {
          coinType: "superRare",
          amount: 1,
          intervalSeconds: Math.max(primary.intervalSeconds + 18, 32),
          chance: bridgeChanceByStage[this.ageStage] * 0.55
        }
      ];
    }

    return options;
  }

  private rollProduction(): CoinProduction {
    const options = this.productionOptions();
    const primary = options[0] ?? this.primaryProduction();
    const bonusOptions = options
      .slice(1)
      .sort((a, b) => coinTypeWeight[b.coinType] - coinTypeWeight[a.coinType] || b.chance - a.chance);

    for (const option of bonusOptions) {
      const key = `${option.coinType}:${option.amount}:${option.intervalSeconds}`;
      const progress = (this.productionProgress.get(key) ?? 0) + Math.max(0, option.chance);
      if (progress >= 1) {
        this.productionProgress.set(key, progress - 1);
        return option;
      }
      this.productionProgress.set(key, progress);
    }

    return primary;
  }

  private desiredAgeScale(): number {
    return Math.min(this.uncappedAgeScale(), this.tankGrowthScaleCap());
  }

  private setVisualScale(worldScale: number): void {
    this.visualWorldScale = worldScale;
    if (this.usesCustomTexture) {
      this.sprite.setDisplaySize(baseTextureWidth * worldScale, baseTextureWidth * this.textureAspectRatio * worldScale);
      return;
    }

    this.sprite.setScale(worldScale);
  }

  private currentVisualWorldScale(): number {
    return this.visualWorldScale;
  }

  private logicalTextureWidth(): number {
    return this.usesCustomTexture ? baseTextureWidth : Math.max(1, this.sprite.width);
  }

  private adultLengthCm(): number {
    const speciesScaleRatio = Phaser.Math.Clamp((this.type.maxScale - 1.17) / 0.56, 0, 1);
    return Phaser.Math.Linear(8, 32, speciesScaleRatio) * fishLengthDisplayMultiplier;
  }

  private biologicalGrowthRatio(): number {
    const babyScale = this.hatchlingScale();
    const maxScale = this.type.maxScale * veryBigScaleMultiplier;
    return Phaser.Math.Clamp((this.rawUncappedAgeScale() - babyScale) / Math.max(0.01, maxScale - babyScale), 0, 1);
  }

  private rawUncappedAgeScale(): number {
    const ageSeconds = Math.max(0, this.ageSeconds);
    const hatchlingScale = this.hatchlingScale();
    const oneMonthScale = this.oneMonthScale();
    const youngScale = this.youngScale();
    const adultScale = this.adultScale();

    if (ageSeconds <= oneMonthGrowthSeconds) {
      return Phaser.Math.Linear(
        hatchlingScale,
        oneMonthScale,
        this.smoothGrowthRatio(ageSeconds / oneMonthGrowthSeconds)
      );
    }

    if (ageSeconds <= youngGrowthSeconds) {
      return Phaser.Math.Linear(
        oneMonthScale,
        youngScale,
        this.smoothGrowthRatio((ageSeconds - oneMonthGrowthSeconds) / (youngGrowthSeconds - oneMonthGrowthSeconds))
      );
    }

    if (ageSeconds <= adultGrowthSeconds) {
      return Phaser.Math.Linear(
        youngScale,
        adultScale,
        this.smoothGrowthRatio((ageSeconds - youngGrowthSeconds) / (adultGrowthSeconds - youngGrowthSeconds))
      );
    }

    return Phaser.Math.Linear(
      adultScale,
      this.type.maxScale * veryBigScaleMultiplier,
      Phaser.Math.Clamp((ageSeconds - adultGrowthSeconds) / Math.max(1, growthCapSeconds - adultGrowthSeconds), 0, 1)
    );
  }

  private uncappedAgeScale(): number {
    const ageSeconds = Math.max(0, this.ageSeconds);
    const hatchlingScale = this.visibleToWorldScale(this.hatchlingScale());
    const oneMonthScale = this.visibleToWorldScale(this.oneMonthScale());
    const youngScale = this.visibleToWorldScale(this.youngScale());
    const adultScale = this.visibleToWorldScale(this.adultScale());

    if (ageSeconds <= oneMonthGrowthSeconds) {
      return Phaser.Math.Linear(
        hatchlingScale,
        oneMonthScale,
        this.smoothGrowthRatio(ageSeconds / oneMonthGrowthSeconds)
      );
    }

    if (ageSeconds <= youngGrowthSeconds) {
      return Phaser.Math.Linear(
        oneMonthScale,
        youngScale,
        this.smoothGrowthRatio((ageSeconds - oneMonthGrowthSeconds) / (youngGrowthSeconds - oneMonthGrowthSeconds))
      );
    }

    if (ageSeconds <= adultGrowthSeconds) {
      return Phaser.Math.Linear(
        youngScale,
        adultScale,
        this.smoothGrowthRatio((ageSeconds - youngGrowthSeconds) / (adultGrowthSeconds - youngGrowthSeconds))
      );
    }

    return Phaser.Math.Linear(
      adultScale,
      this.veryBigScaleCap(),
      Phaser.Math.Clamp((ageSeconds - adultGrowthSeconds) / Math.max(1, growthCapSeconds - adultGrowthSeconds), 0, 1)
    );
  }

  private hatchlingScale(): number {
    return this.adultScale() * hatchlingAdultScaleRatio;
  }

  private oneMonthScale(): number {
    return this.adultScale() * oneMonthAdultScaleRatio;
  }

  private youngScale(): number {
    return this.adultScale() * youngAdultScaleRatio;
  }

  private adultScale(): number {
    return this.type.ageCurve.adult.scale;
  }

  private smoothGrowthRatio(value: number): number {
    const clamped = Phaser.Math.Clamp(value, 0, 1);
    return clamped * clamped * (3 - 2 * clamped);
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

    this.swimRotationBase = direction.y * 0.08;
  }

  private animateSwimming(deltaSeconds: number, moveSpeed: number, chasingFood: boolean): void {
    const speedRatio = Phaser.Math.Clamp(moveSpeed / Math.max(1, this.type.speed), 0.25, 2.6);
    const frequency = (chasingFood ? chaseSwimFrequency : idleSwimFrequency) * Phaser.Math.Linear(0.72, 1.18, speedRatio / 2.6);
    this.swimPhase += deltaSeconds * frequency;

    const wave = Math.sin(this.swimPhase);
    const secondaryWave = Math.sin(this.swimPhase * 2.05 + 0.8);
    const chaseBoost = chasingFood ? 1.65 : 1;
    const illnessDampener = this.state === "ill" ? 0.42 : 1;
    const amplitude = chaseBoost * illnessDampener;
    const stretchX = 1 + wave * 0.024 * amplitude;
    const stretchY = 1 - wave * 0.018 * amplitude;
    const bobBasePixels = chasingFood ? chaseSwimBobPixels : idleSwimBobPixels;
    const bob = secondaryWave * bobBasePixels * illnessDampener;
    const bobDelta = bob - this.swimYOffset;
    const wagRotation = wave * 0.035 * amplitude * (this.facing >= 0 ? 1 : -1);
    const tailWagBasePixels = chasingFood ? chaseTailWagPixels : idleTailWagPixels;
    this.tailWag = wave * tailWagBasePixels * amplitude;
    this.tailFan = 1 + Math.abs(secondaryWave) * (chasingFood ? 0.18 : 0.1) * illnessDampener;

    if (this.usesCustomTexture) {
      this.sprite.setDisplaySize(
        baseTextureWidth * this.visualWorldScale * stretchX,
        baseTextureWidth * this.textureAspectRatio * this.visualWorldScale * stretchY
      );
    } else {
      this.sprite.setScale(this.visualWorldScale * stretchX, this.visualWorldScale * stretchY);
    }

    this.swimYOffset = bob;
    this.sprite.setRotation(this.swimRotationBase + wagRotation);
    this.sprite.y = Phaser.Math.Clamp(this.sprite.y + bobDelta, tankBounds.top + 26, tankBounds.bottom - 26);
  }

  private pickWanderTarget(): void {
    this.target.set(
      Phaser.Math.Between(tankBounds.left + 48, tankBounds.right - 48),
      Phaser.Math.Between(tankBounds.top + 46, tankBounds.bottom - 56)
    );
  }

  private setStateTint(): void {
    if (this.state === "ill") {
      this.sprite.setTint(this.usesCustomTexture ? 0xb9c5bd : this.desaturatedTint(this.bodyTint(), 0.46));
      return;
    }

    if (this.usesCustomTexture) {
      this.sprite.clearTint();
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
    const showCareBars = this.shouldShowCareBars(fullnessRatio, moodRatio);

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

    if (showCareBars) {
      this.statusBars.fillStyle(0x061725, 0.72);
      this.statusBars.fillRoundedRect(-1, barY - 1, barWidth + 2, barHeight * 2 + gap + 2, 2);
      this.statusBars.fillStyle(0x19364a, 0.95);
      this.statusBars.fillRoundedRect(0, barY, barWidth, barHeight, 1);
      this.statusBars.fillRoundedRect(0, barY + barHeight + gap, barWidth, barHeight, 1);
      this.statusBars.fillStyle(fullnessColor, 1);
      this.statusBars.fillRoundedRect(0, barY, Math.max(2, barWidth * fullnessRatio), barHeight, 1);
      this.statusBars.fillStyle(moodColor, 1);
      this.statusBars.fillRoundedRect(0, barY + barHeight + gap, Math.max(2, barWidth * moodRatio), barHeight, 1);
      this.statusBars.lineStyle(1, 0xd7f4ff, 0.28);
      this.statusBars.strokeRoundedRect(-1, barY - 1, barWidth + 2, barHeight * 2 + gap + 2, 2);
    }

    this.updateStateEmoji(y);
    this.updateTailMark();
  }

  private updateStateEmoji(statusY: number): void {
    const emoji = this.currentStateEmoji();
    const visible = emoji.length > 0;
    this.stateEmoji.setText(emoji);
    this.stateEmoji.setVisible(visible);
    this.stateBubble.setVisible(visible);
    this.stateEmoji.setPosition(
      Math.round(this.sprite.x),
      Math.round(Math.max(tankBounds.top + 16, statusY - 18))
    );

    this.drawStateBubble();
  }

  private currentStateEmoji(): string {
    if (this.isGrowthLimitedByTank()) {
      return "😣";
    }

    if (this.state === "ill") {
      return "🤒";
    }

    if (this.scene.time.now < this.happyEmojiUntil) {
      return "😊";
    }

    if (this.state === "hungry") {
      return "😫";
    }

    return "";
  }

  private drawStateBubble(): void {
    this.stateBubble.clear();
    if (!this.stateBubble.visible) {
      return;
    }

    this.stateBubble.setPosition(this.stateEmoji.x, this.stateEmoji.y);
    this.stateBubble.fillStyle(0xf7fbff, 0.92);
    this.stateBubble.fillRoundedRect(-16, -15, 32, 25, 8);
    this.stateBubble.fillTriangle(-5, 8, 0, 15, 6, 8);
    this.stateBubble.lineStyle(1, 0x0c3144, 0.46);
    this.stateBubble.strokeRoundedRect(-16, -15, 32, 25, 8);
    this.stateBubble.lineBetween(-5, 8, 0, 15);
    this.stateBubble.lineBetween(0, 15, 6, 8);
  }

  private currentMoodRatio(): number {
    return Phaser.Math.Clamp(this.health / 100, 0, 1);
  }

  private currentFullnessRatio(): number {
    return Phaser.Math.Clamp(1 - this.hunger / 100, 0, 1);
  }

  private shouldShowCareBars(fullnessRatio = this.currentFullnessRatio(), moodRatio = this.currentMoodRatio()): boolean {
    return fullnessRatio < 0.5 || moodRatio < 0.5;
  }

  private tailTint(): number {
    return fishFoodTintFor(this.type);
  }

  private bodyTint(): number {
    return this.type.tint;
  }

  private customTextureKey(): string {
    const textureKey = `fish-${this.type.id}`;
    return this.scene.textures.exists(textureKey) ? textureKey : "fish-base";
  }

  private isFullyGrown(): boolean {
    return !this.isGrowthLimitedByTank() && this.currentVisualWorldScale() >= this.veryBigScaleCap() - 0.01;
  }

  private updateTailMark(): void {
    if (this.usesCustomTexture) {
      this.tailMark.clear();
      this.tailMark.setVisible(false);
      return;
    }

    this.tailMark.setVisible(true);
    const scale = Math.max(0.01, Math.abs(this.sprite.scaleX));
    const tailSide = this.facing >= 0 ? -1 : 1;
    const tailEdgeInset = this.usesCustomTexture ? 4 : 1;
    const tailJoinInset = this.usesCustomTexture ? 18 : 13;
    const tailEdgeX = tailSide * (this.sprite.displayWidth / 2 - tailEdgeInset * scale);
    const tailJoinX = tailSide * (this.sprite.displayWidth / 2 - tailJoinInset * scale);
    const tailCenterX = tailSide * (this.sprite.displayWidth / 2 - (this.usesCustomTexture ? 7 : 3) * scale);
    const tailHalfHeight = (this.usesCustomTexture ? 10.5 : 13) * scale * this.tailFan;
    const tailWag = this.tailWag * scale;
    const points = [
      new Phaser.Math.Vector2(tailJoinX, 0),
      new Phaser.Math.Vector2(tailCenterX, -tailHalfHeight * 0.74 + tailWag * 0.42),
      new Phaser.Math.Vector2(tailEdgeX, tailWag),
      new Phaser.Math.Vector2(tailCenterX, tailHalfHeight * 0.74 + tailWag * 0.42)
    ];

    this.tailMark.clear();
    this.tailMark.setPosition(this.sprite.x, this.sprite.y);
    this.tailMark.setRotation(this.sprite.rotation);
    this.tailMark.setAlpha(this.state === "ill" ? 0.58 : this.usesCustomTexture ? 0.72 : 0.95);
    this.tailMark.fillStyle(this.tailTint(), 1);
    this.tailMark.fillPoints(points, true);
    this.tailMark.lineStyle(1, 0x061725, 0.24);
    this.tailMark.strokePoints(points, true);

    const ribAlpha = this.usesCustomTexture ? 0.22 : 0.34;
    this.tailMark.lineStyle(1, 0xf7fbff, ribAlpha);
    this.tailMark.lineBetween(tailJoinX, 0, tailEdgeX, tailWag);
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
