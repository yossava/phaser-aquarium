import Phaser from "phaser";
import { gameHeight, gameWidth, tankBounds } from "../game/constants";
import { gameFontFamily } from "../game/fonts";
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
const minimumHungerToEatMore = 3;
const veryBigScaleMultiplier = 1.55;
const secondsPerFishMonth = 60 * 60;
const monthsPerFishYear = 12;
const secondsPerFishYear = monthsPerFishYear * secondsPerFishMonth;
const daysPerFishMonth = 30;
const growthCapYears = 50;
const earlyVisualGrowthDays = 7;
const earlyVisualGrowthMultiplier = 3;
const oneMonthGrowthSeconds = secondsPerFishMonth;
const adultGrowthSeconds = 12 * secondsPerFishMonth;
const hatchlingTankWidthRatio = 0.16;
const oneMonthTankWidthRatio = 0.23;
const sixMonthTankWidthRatio = 0.39;
const readyToMoveTankWidthRatio = 0.5;
const veryBigTankWidthRatio = 0.78;
const maximumFishScreenWidthRatio = 0.7;
const minimumGrowthWidthRatio = maximumFishScreenWidthRatio;
const maximumGrowthWidthRatio = maximumFishScreenWidthRatio;
const happyEmojiDurationMs = 3200;
const missedFoodEmojiDurationMs = 1000;
const dragLoveEmojiDurationMs = 2600;
const dragLoveEmojiCooldownMs = 30_000;
const onboardingCoinDropCount = 3;
const maxCoinDropIntervalSeconds = 10;
const firstOnboardingCoinDelayMs = 5000;
const minOnboardingCoinDelayMs = 8000;
const maxOnboardingCoinDelayMs = maxCoinDropIntervalSeconds * 1000;
const hungryBubbleFullnessThreshold = 0.7;
const statusIndicatorUpdateIntervalSeconds = 0.16;
const minimumMealCalorieRatio = 0.55;
const fishLengthDisplayMultiplier = 10;
const baselineMealCalories = 46;
const baseTextureWidth = 64;
const baseTextureHeight = 48;
const idleSwimFrequency = 3.4;
const chaseSwimFrequency = 7.2;
const fishMovementSpeedMultiplier = 0.62;
const fishRestChanceAtTarget = 0.42;
const minFishRestMs = 1800;
const maxFishRestMs = 5200;
const minPlayChaseDelayMs = 30000;
const maxPlayChaseDelayMs = 45000;
const minPlayChaseDurationMs = 3600;
const maxPlayChaseDurationMs = 6200;
const playChaseSpeedMultiplier = 1.9;
const restDriftSpeedMultiplier = 0.08;
const restDriftVerticalRatio = 0.35;
const directionFlipDeadzone = 18;
const directionFlipTransitionMs = 520;
const directionFlipSqueezeStrength = 0.14;
const directionFlipSwapProgress = 0.58;
const swimPathSwayRatio = 0.035;
const swimKickPulseStrength = 0.24;
const overfullHungerFloor = -10000;
export const fatalCareSeconds = 24 * 60 * 60;

export class Fish {
  public sprite: Phaser.GameObjects.Sprite;
  public state: FishState = "happy";
  public ageStage: AgeStage = "baby";
  public ageSeconds = 0;
  public hunger = 12;
  public health = 100;
  public target = new Phaser.Math.Vector2();
  public nextCoinDropAt = 0;
  public nextMegaCoinDropAt = 0;
  public facing = 1;
  public medicatedUntil = 0;
  public fatalCareSeconds = 0;
  public gender: FishGender;
  public tankLevel: number;
  private statusBars: Phaser.GameObjects.Graphics;
  private tailMark: Phaser.GameObjects.Graphics;
  private stateBubble: Phaser.GameObjects.Graphics;
  private stateEmoji: Phaser.GameObjects.Text;
  private productionProgress = new Map<string, number>();
  private onboardingCoinDropsRemaining = 0;
  private happyEmojiUntil = 0;
  private missedFoodEmojiUntil = 0;
  private dragLoveEmojiUntil = 0;
  private nextDragLoveEmojiAt = 0;
  private visualWorldScale = 1;
  private swimPhase: number;
  private velocity = new Phaser.Math.Vector2();
  private restUntil = 0;
  private hasRestedAtTarget = false;
  private nextPlayChaseAt = 0;
  private playChaseUntil = 0;
  private playChaseTarget?: Fish;
  private pendingFacing?: number;
  private flipTransitionStartedAt = 0;
  private manuallyDragging = false;
  private usesCustomTexture: boolean;
  private textureAspectRatio: number;
  private statusIndicatorElapsed = Phaser.Math.FloatBetween(0, statusIndicatorUpdateIntervalSeconds);
  private lastAppliedWorldScale = 0;
  private lastAppliedStretchX = 0;
  private lastAppliedStretchY = 0;

  public constructor(
    private scene: Phaser.Scene,
    public readonly type: FishType,
    x: number,
    y: number,
    options: { gender?: FishGender; tankLevel?: number } = {}
  ) {
    this.gender = options.gender ?? (Phaser.Math.Between(0, 1) === 0 ? "M" : "F");
    this.tankLevel = Math.max(1, Math.floor(options.tankLevel ?? 1));
    this.swimPhase = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const textureKey = this.customTextureKey();
    this.usesCustomTexture = textureKey !== "fish-base";
    this.sprite = scene.add.sprite(x, y, textureKey);
    this.playSwimAnimation();
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
        fontFamily: gameFontFamily,
        fontSize: "18px",
        stroke: "#061725",
        strokeThickness: 3
      })
      .setOrigin(0.5)
      .setDepth(13);
    this.pickWanderTarget();
    this.scheduleNextPlayChase();
    this.updateTailMark();
    this.updateStatusBars(true);
  }

  public update(deltaSeconds: number, foods: FoodPellet[], tankFish: Fish[] = []): { food: FoodPellet; accepted: boolean; reason?: "tooSmall" } | undefined {
    this.ageSeconds += deltaSeconds;
    this.updateAgeStage();

    const isMedicated = this.scene.time.now < this.medicatedUntil;
    const hungerGrowthMultiplier = isMedicated ? 0.35 : 1;
    this.hunger = Phaser.Math.Clamp(
      this.hunger + this.hungerPerSecond() * hungerGrowthMultiplier * deltaSeconds,
      overfullHungerFloor,
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
    this.statusIndicatorElapsed += deltaSeconds;

    if (this.manuallyDragging) {
      this.velocity.set(0, 0);
      this.target.set(this.sprite.x, this.sprite.y);
      this.setStateTint();
      this.animateSwimming(deltaSeconds, 0, false, true);
      this.updateStatusBars(true);
      return undefined;
    }

    const closestFood = this.findClosestFood(foods);
    const chaseTarget = closestFood ? undefined : this.updatePlayChase(tankFish);
    let resting = false;
    if (closestFood) {
      this.restUntil = 0;
      this.hasRestedAtTarget = false;
      this.target.set(closestFood.sprite.x, closestFood.sprite.y);
    } else if (chaseTarget) {
      this.restUntil = 0;
      this.hasRestedAtTarget = false;
      this.target.set(chaseTarget.sprite.x, chaseTarget.sprite.y);
    } else if (Phaser.Math.Distance.BetweenPoints(this.sprite, this.target) < 16) {
      resting = this.updateIdleRest();
    }

    const speedMultiplier = closestFood ? this.foodChaseSpeedMultiplier() : chaseTarget ? playChaseSpeedMultiplier : this.state === "ill" ? 0.45 : this.state === "hungry" ? 1.22 : 1;
    const moveSpeed = this.type.speed * speedMultiplier * this.movementSizeMultiplier() * fishMovementSpeedMultiplier;
    if (resting) {
      this.driftWhileResting(deltaSeconds, moveSpeed);
    } else {
      this.moveTowardTarget(deltaSeconds, moveSpeed);
    }
    this.setStateTint();
    this.animateSwimming(deltaSeconds, resting ? moveSpeed * 0.16 : moveSpeed, closestFood !== undefined || chaseTarget !== undefined, resting);

    if (closestFood && Phaser.Math.Distance.BetweenPoints(this.sprite, closestFood.sprite) < 24) {
      const tooSmall = this.isFoodTooSmall(closestFood);
      const accepted = this.acceptsFood(closestFood) && !tooSmall;
      if (accepted) {
        this.hunger = Phaser.Math.Clamp(this.hunger - this.hungerReductionFromFood(closestFood), overfullHungerFloor, 100);
        this.health = Phaser.Math.Clamp(this.health + 12, 0, 100);
        this.happyEmojiUntil = this.scene.time.now + happyEmojiDurationMs;
      } else {
        this.hunger = Phaser.Math.Clamp(this.hunger + 8, overfullHungerFloor, 100);
        this.health = Phaser.Math.Clamp(this.health - 8, 0, 100);
      }
      this.state = this.health < 35 ? "ill" : this.hunger > 68 ? "hungry" : "happy";
      if (!this.isInFatalCareState()) {
        this.fatalCareSeconds = 0;
      }
      this.updateStatusBars(true);
      return { food: closestFood, accepted, reason: tooSmall ? "tooSmall" : undefined };
    }

    this.maybeUpdateStatusBars();
    return undefined;
  }

  public canDropCoin(now: number): boolean {
    return (this.state === "happy" || this.state === "ill") && now >= this.nextCoinDropAt;
  }

  public markCoinDropped(now: number): void {
    this.nextCoinDropAt = now + this.activeProduction().intervalSeconds * 1000;
  }

  public markCoinDroppedForProduction(now: number, production: CoinProduction): void {
    if (this.onboardingCoinDropsRemaining > 0) {
      this.onboardingCoinDropsRemaining -= 1;
      if (this.onboardingCoinDropsRemaining > 0) {
        this.nextCoinDropAt = now + Phaser.Math.Between(minOnboardingCoinDelayMs, maxOnboardingCoinDelayMs);
        return;
      }
    }

    this.nextCoinDropAt = now + production.intervalSeconds * 1000;
  }

  public canDropMegaCoin(now: number): boolean {
    return (this.ageStage === "elder" || this.ageStage === "master") && now >= this.nextMegaCoinDropAt;
  }

  public markMegaCoinDropped(now: number): void {
    this.nextMegaCoinDropAt = now + 60 * 1000;
  }

  public primeOnboardingCoinDrops(now: number): void {
    this.onboardingCoinDropsRemaining = onboardingCoinDropCount;
    this.nextCoinDropAt = now + firstOnboardingCoinDelayMs;
  }

  public restoreProgress(ageSeconds: number, hunger: number, health: number, nextCoinDropAt: number, fatalCareSecondsValue = 0): void {
    this.setAgeSeconds(ageSeconds);
    this.hunger = Phaser.Math.Clamp(hunger, overfullHungerFloor, 100);
    this.health = Phaser.Math.Clamp(health, 0, 100);
    this.nextCoinDropAt = Math.max(0, nextCoinDropAt);
    this.nextMegaCoinDropAt = this.ageStage === "elder" || this.ageStage === "master" ? this.scene.time.now + 60 * 1000 : 0;
    this.state = this.health < 35 ? "ill" : this.hunger > 68 ? "hungry" : "happy";
    this.fatalCareSeconds = this.isInFatalCareState() ? Phaser.Math.Clamp(fatalCareSecondsValue, 0, fatalCareSeconds) : 0;
  }

  public resumeAfterOfflineProgress(): void {
    this.state = this.health < 35 ? "ill" : this.hunger > 68 ? "hungry" : "happy";
    this.restUntil = 0;
    this.hasRestedAtTarget = false;
    this.playChaseTarget = undefined;
    this.playChaseUntil = 0;
    this.scheduleNextPlayChase();
    this.velocity.set(0, 0);
    this.target.set(this.sprite.x, this.sprite.y);
    this.setStateTint();
    this.updateStatusBars(true);
  }

  public refreshTextureIfAvailable(): void {
    const textureKey = this.customTextureKey();
    if (this.sprite.texture.key === textureKey) {
      this.playSwimAnimation();
      return;
    }

    this.sprite.setTexture(textureKey);
    this.usesCustomTexture = textureKey !== "fish-base";
    this.textureAspectRatio = this.usesCustomTexture ? this.sprite.height / Math.max(1, this.sprite.width) : baseTextureHeight / baseTextureWidth;
    this.playSwimAnimation();
    this.lastAppliedWorldScale = 0;
    this.lastAppliedStretchX = 0;
    this.lastAppliedStretchY = 0;
    this.setStateTint();
    this.setVisualScale(this.visualWorldScale);
    this.updateTailMark();
    this.updateStatusBars(true);
  }

  public setAgeSeconds(ageSeconds: number): void {
    this.ageSeconds = Math.max(0, ageSeconds);
    this.updateAgeStage();
    this.setVisualScale(this.desiredAgeScale());
    this.updateStatusBars(true);
  }

  public applyMedicine(now: number): void {
    this.health = Phaser.Math.Clamp(Math.max(this.health + 55, 82), 0, 100);
    this.hunger = Phaser.Math.Clamp(Math.min(this.hunger, 35), overfullHungerFloor, 100);
    this.medicatedUntil = now + 45000;
    this.fatalCareSeconds = 0;
    this.updateStatusBars(true);
  }

  public applyAgeBoost(months = 3): void {
    this.setAgeSeconds(this.ageSeconds + Math.max(0, months) * secondsPerFishMonth);
    this.health = Phaser.Math.Clamp(this.health + 8, 0, 100);
    this.hunger = Phaser.Math.Clamp(Math.min(this.hunger, 58), overfullHungerFloor, 100);
    this.happyEmojiUntil = this.scene.time.now + happyEmojiDurationMs;
    this.updateStatusBars(true);
  }

  public showMissedFoodEmoji(now = this.scene.time.now): void {
    this.missedFoodEmojiUntil = now + missedFoodEmojiDurationMs;
    this.updateStatusBars(true);
  }

  public isInterestedInFood(food: FoodPellet): boolean {
    return this.willChaseFood(food);
  }

  public canChaseFood(food: FoodPellet): boolean {
    if (food.foodType.id === "ageBoost") {
      return true;
    }

    const willingToEat = this.state === "hungry" || this.state === "ill" || this.hunger > minimumHungerToEatMore;
    return willingToEat && this.willChaseFood(food);
  }

  public fullnessRatio(): number {
    return this.currentFullnessRatio();
  }

  public refreshStatusBars(): void {
    this.updateStatusBars(true);
  }

  public beginManualDrag(): void {
    this.manuallyDragging = true;
    this.velocity.set(0, 0);
    this.target.set(this.sprite.x, this.sprite.y);
    this.showDragLoveEmoji();
    this.updateStatusBars(true);
  }

  public moveManuallyTo(x: number, y: number): void {
    this.sprite.setPosition(
      Phaser.Math.Clamp(x, tankBounds.left + 28, tankBounds.right - 28),
      Phaser.Math.Clamp(y, tankBounds.top + 26, tankBounds.bottom - 26)
    );
    this.target.set(this.sprite.x, this.sprite.y);
    this.velocity.set(0, 0);
    this.updateStatusBars(true);
  }

  public endManualDrag(): void {
    this.manuallyDragging = false;
    this.velocity.set(0, 0);
    this.target.set(this.sprite.x, this.sprite.y);
    this.updateStatusBars(true);
  }

  public addToContainer(container: Phaser.GameObjects.Container): void {
    container.add([this.sprite, this.tailMark, this.statusBars, this.stateBubble, this.stateEmoji]);
  }

  public setTankVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
    this.tailMark.setVisible(visible);
    this.statusBars.setVisible(visible);
    if (visible) {
      this.updateStatusBars(true);
    } else {
      this.hideStateEmoji();
    }
  }

  public primaryProduction(): CoinProduction {
    const production = this.currentAgeCurve().production[0] ?? {
      coinType: "common",
      amount: this.type.coinValue,
      intervalSeconds: this.type.coinDropSeconds,
      chance: 1
    };
    return this.scaleProductionForCareCost(production, 0);
  }

  public productionOptions(): CoinProduction[] {
    const production = this.currentAgeCurve().production;
    const rawProduction =
      production.length > 0
        ? production
        : [
            {
              coinType: "common" as const,
              amount: this.type.coinValue,
              intervalSeconds: this.type.coinDropSeconds,
              chance: 1
            }
          ];
    return this.withProgressionBridge(rawProduction).map((entry, index) => this.scaleProductionForCareCost(entry, index));
  }

  public activeProduction(): CoinProduction {
    const production = this.primaryProduction();
    if (this.state === "ill") {
      return { ...production, amount: 1, intervalSeconds: Math.min(maxCoinDropIntervalSeconds, production.intervalSeconds * 3) };
    }
    return production;
  }

  public rollActiveProduction(): CoinProduction {
    const production = this.rollProduction();
    if (this.state === "ill") {
      return { ...production, amount: 1, intervalSeconds: Math.min(maxCoinDropIntervalSeconds, production.intervalSeconds * 3) };
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
    const medicineMultiplier = foodType.id === "medicine" ? 0.55 : foodType.id === "ageBoost" ? 0 : 1;
    return (foodType.calories * preferredMultiplier * medicineMultiplier) / this.calorieNeedMultiplier();
  }

  public isFoodTooSmall(food: FoodPellet | FoodType): boolean {
    const foodType = food instanceof FoodPellet ? food.foodType : food;
    if (foodType.id === "medicine" || foodType.id === "ageBoost" || foodType.id === "creature") {
      return false;
    }

    return this.acceptsFoodType(foodType) && foodType.calories < this.mealCaloriesNeeded() * minimumMealCalorieRatio;
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

  public ageRequiredTankLevel(): number {
    return Math.max(1, Math.floor(this.ageYears()) + 1);
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
    return this.visibleToWorldScale(this.maxGrowthScale());
  }

  public naturalAgeScale(): number {
    return this.uncappedAgeScale();
  }

  public tankGrowthScaleCap(): number {
    const maxVisibleWidth = gameWidth * maximumFishScreenWidthRatio;
    const maxVisibleHeight = gameHeight * maximumFishScreenWidthRatio;
    const maxScale = Math.min(maxVisibleWidth / this.logicalTextureWidth(), maxVisibleHeight / this.logicalTextureHeight());
    return Math.max(this.visibleToWorldScale(this.hatchlingScale()), maxScale);
  }

  public isGrowthLimitedByTank(): boolean {
    return false;
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

  public hudStatusLabel(): string {
    if (this.scene.time.now < this.dragLoveEmojiUntil) {
      return "love";
    }
    if (this.state === "ill") {
      return "sick";
    }
    if (this.scene.time.now < this.missedFoodEmojiUntil) {
      return "mad";
    }
    if (this.scene.time.now < this.happyEmojiUntil) {
      return "smile";
    }
    if (this.shouldShowHungryBubble()) {
      return "hungry";
    }
    return this.state === "happy" ? "smile" : this.state;
  }

  public hudStatusIcon(): string {
    const iconByStatus: Record<string, string> = {
      love: "♥",
      sick: "+",
      mad: "!",
      smile: "☺",
      hungry: "..."
    };
    return iconByStatus[this.hudStatusLabel()] ?? "☺";
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
      wag: 0,
      fan: 1,
      alpha: this.tailMark.alpha,
      visible: this.tailMark.visible
    };
  }

  private currentAgeCurve() {
    return this.type.ageCurve[this.ageStage];
  }

  private withProgressionBridge(production: CoinProduction[]): CoinProduction[] {
    return production;
  }

  private productionCareMultiplier(): number {
    return Math.max(1, this.calorieNeedMultiplier());
  }

  private scaleProductionForCareCost(production: CoinProduction, index: number): CoinProduction {
    const calorieMultiplier = this.productionCareMultiplier();
    const primaryMultiplier = index === 0
      ? Phaser.Math.Clamp(Math.pow(calorieMultiplier, 1.15), 1, 6)
      : Phaser.Math.Clamp(Math.pow(calorieMultiplier, 0.75), 1, 3.25);
    const intervalBoost = Phaser.Math.Linear(1, 1.12, Phaser.Math.Clamp((calorieMultiplier - 1) / 3, 0, 1));
    return {
      ...production,
      amount: Math.max(1, Math.ceil(production.amount * primaryMultiplier)),
      intervalSeconds: Phaser.Math.Clamp(
        Math.round(production.intervalSeconds / intervalBoost),
        4,
        maxCoinDropIntervalSeconds
      )
    };
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
    this.applySpriteScale(worldScale, 1, 1);
  }

  private applySpriteScale(worldScale: number, stretchX: number, stretchY: number): void {
    if (
      Math.abs(worldScale - this.lastAppliedWorldScale) < 0.0008 &&
      Math.abs(stretchX - this.lastAppliedStretchX) < 0.0008 &&
      Math.abs(stretchY - this.lastAppliedStretchY) < 0.0008
    ) {
      return;
    }

    this.lastAppliedWorldScale = worldScale;
    this.lastAppliedStretchX = stretchX;
    this.lastAppliedStretchY = stretchY;
    if (this.usesCustomTexture) {
      this.sprite.setDisplaySize(baseTextureWidth * worldScale * stretchX, baseTextureWidth * this.textureAspectRatio * worldScale * stretchY);
      return;
    }

    this.sprite.setScale(worldScale * stretchX, worldScale * stretchY);
  }

  private currentVisualWorldScale(): number {
    return this.visualWorldScale;
  }

  private logicalTextureWidth(): number {
    return this.usesCustomTexture ? baseTextureWidth : Math.max(1, this.sprite.width);
  }

  private logicalTextureHeight(): number {
    return this.usesCustomTexture ? baseTextureWidth * this.textureAspectRatio : Math.max(1, this.sprite.height);
  }

  private adultLengthCm(): number {
    const speciesScaleRatio = Phaser.Math.Clamp((this.type.maxScale - 1.17) / 0.56, 0, 1);
    return Phaser.Math.Linear(8, 32, speciesScaleRatio) * fishLengthDisplayMultiplier;
  }

  private biologicalGrowthRatio(): number {
    const babyScale = this.hatchlingScale();
    const maxScale = this.maxGrowthScale();
    return Phaser.Math.Clamp((this.rawUncappedAgeScale() - babyScale) / Math.max(0.01, maxScale - babyScale), 0, 1);
  }

  private rawUncappedAgeScale(): number {
    return this.rawUncappedAgeScaleAt(this.ageSeconds);
  }

  private rawUncappedAgeScaleAt(ageSecondsValue: number): number {
    const ageSeconds = Math.max(0, ageSecondsValue);
    const hatchlingScale = this.hatchlingScale();
    const oneMonthScale = this.oneMonthScale();
    const oneYearScale = this.oneYearScale();

    if (ageSeconds <= oneMonthGrowthSeconds) {
      return Phaser.Math.Linear(
        hatchlingScale,
        oneMonthScale,
        this.smoothGrowthRatio(ageSeconds / oneMonthGrowthSeconds)
      );
    }

    if (ageSeconds <= adultGrowthSeconds / 2) {
      return Phaser.Math.Linear(
        oneMonthScale,
        this.sixMonthScale(),
        this.smoothGrowthRatio((ageSeconds - oneMonthGrowthSeconds) / (adultGrowthSeconds / 2 - oneMonthGrowthSeconds))
      );
    }

    if (ageSeconds <= adultGrowthSeconds) {
      return Phaser.Math.Linear(
        this.sixMonthScale(),
        oneYearScale,
        this.smoothGrowthRatio((ageSeconds - adultGrowthSeconds / 2) / (adultGrowthSeconds / 2))
      );
    }

    return this.slowAdultGrowthScale(oneYearScale, this.maxGrowthScale(), ageSeconds);
  }

  private uncappedAgeScale(): number {
    return this.uncappedAgeScaleAt(this.visualAgeSecondsInCurrentTank());
  }

  private uncappedAgeScaleAt(ageSecondsValue: number): number {
    const ageSeconds = Math.max(0, ageSecondsValue);
    const hatchlingScale = this.visibleToWorldScale(this.hatchlingScale());
    const oneMonthScale = this.visibleToWorldScale(this.oneMonthScale());
    const sixMonthScale = this.visibleToWorldScale(this.sixMonthScale());
    const oneYearScale = this.visibleToWorldScale(this.oneYearScale());

    if (ageSeconds <= oneMonthGrowthSeconds) {
      return Phaser.Math.Linear(
        hatchlingScale,
        oneMonthScale,
        this.smoothGrowthRatio(ageSeconds / oneMonthGrowthSeconds)
      );
    }

    if (ageSeconds <= adultGrowthSeconds / 2) {
      return Phaser.Math.Linear(
        oneMonthScale,
        sixMonthScale,
        this.smoothGrowthRatio((ageSeconds - oneMonthGrowthSeconds) / (adultGrowthSeconds / 2 - oneMonthGrowthSeconds))
      );
    }

    if (ageSeconds <= adultGrowthSeconds) {
      return Phaser.Math.Linear(
        sixMonthScale,
        oneYearScale,
        this.smoothGrowthRatio((ageSeconds - adultGrowthSeconds / 2) / (adultGrowthSeconds / 2))
      );
    }

    return this.slowAdultGrowthScale(oneYearScale, this.veryBigScaleCap(), ageSeconds);
  }

  private hatchlingScale(): number {
    return this.scaleForTankWidthRatio(hatchlingTankWidthRatio + this.speciesWidthBonus() * 0.03);
  }

  private oneMonthScale(): number {
    return this.scaleForTankWidthRatio(oneMonthTankWidthRatio + this.speciesWidthBonus() * 0.04);
  }

  private sixMonthScale(): number {
    return this.scaleForTankWidthRatio(sixMonthTankWidthRatio + this.speciesWidthBonus() * 0.05);
  }

  private oneYearScale(): number {
    return this.scaleForTankWidthRatio(readyToMoveTankWidthRatio + this.speciesWidthBonus() * 0.06);
  }

  private maxGrowthScale(): number {
    return this.scaleForTankWidthRatio(veryBigTankWidthRatio + this.speciesWidthBonus() * 0.08);
  }

  private scaleForTankWidthRatio(widthRatio: number): number {
    return (gameWidth * widthRatio) / this.logicalTextureWidth();
  }

  private speciesWidthBonus(): number {
    return Phaser.Math.Clamp((this.type.maxScale - 1.17) / (1.73 - 1.17), 0, 1);
  }

  private smoothGrowthRatio(value: number): number {
    const clamped = Phaser.Math.Clamp(value, 0, 1);
    return clamped * clamped * (3 - 2 * clamped);
  }

  private slowAdultGrowthScale(startScale: number, capScale: number, ageSeconds: number): number {
    const adultYears = Math.max(0, (ageSeconds - adultGrowthSeconds) / secondsPerFishYear);
    const totalAdultYears = Math.max(1, growthCapYears - 1);
    const slowRatio = Math.log1p(adultYears * 2.2) / Math.log1p(totalAdultYears * 2.2);
    return Phaser.Math.Linear(startScale, capScale, Phaser.Math.Clamp(slowRatio, 0, 1));
  }

  private currentTankViewScale(): number {
    return Phaser.Math.Clamp(gameWidth / Math.max(1, tankBounds.width), 0.5, 1);
  }

  private visibleToWorldScale(visibleScale: number): number {
    return visibleScale / this.currentTankViewScale();
  }

  private visualAgeSecondsInCurrentTank(): number {
    const earlyVisualGrowthSeconds = (secondsPerFishMonth / daysPerFishMonth) * earlyVisualGrowthDays;
    if (this.ageSeconds <= earlyVisualGrowthSeconds) {
      return this.ageSeconds * earlyVisualGrowthMultiplier;
    }

    if (this.ageSeconds < oneMonthGrowthSeconds) {
      const visualAgeAtEarlyCutoff = earlyVisualGrowthSeconds * earlyVisualGrowthMultiplier;
      const taperRatio = (this.ageSeconds - earlyVisualGrowthSeconds) / Math.max(1, oneMonthGrowthSeconds - earlyVisualGrowthSeconds);
      return Phaser.Math.Linear(visualAgeAtEarlyCutoff, oneMonthGrowthSeconds, this.smoothGrowthRatio(taperRatio));
    }

    return this.ageSeconds;
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
    const hasCareBooster = edibleFoods.some((food) => food.foodType.id === "ageBoost");
    if (edibleFoods.length === 0 || (!willingToEat && !hasCareBooster)) {
      return undefined;
    }

    return edibleFoods.reduce((closest, food) => {
      const closestDistance = Phaser.Math.Distance.BetweenPoints(this.sprite, closest.sprite);
      const foodDistance = Phaser.Math.Distance.BetweenPoints(this.sprite, food.sprite);
      return foodDistance < closestDistance ? food : closest;
    });
  }

  private acceptsFood(food: FoodPellet): boolean {
    return this.acceptsFoodType(food.foodType);
  }

  private acceptsFoodType(foodType: FoodType): boolean {
    return (
      foodType.acceptedByDefault ||
      this.type.requiredFoodTypes.includes(foodType.id) ||
      this.type.preferredFoodTypes.includes(foodType.id)
    );
  }

  private willChaseFood(food: FoodPellet): boolean {
    if (food.foodType.id === "creature") {
      return false;
    }

    if (food.foodType.id === "ageBoost") {
      return true;
    }

    if (food.foodType.id === "medicine") {
      return this.health < 82;
    }

    if (this.state === "ill") {
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
      this.velocity.scale(Phaser.Math.Clamp(1 - deltaSeconds * 2.6, 0, 1));
      return;
    }

    direction.normalize();
    const kickPulse = 1 + Math.max(0, Math.sin(this.swimPhase * 1.9)) * swimKickPulseStrength;
    const swaySpeed = Math.sin(this.swimPhase * 0.82) * speed * swimPathSwayRatio;
    this.steerTowardVelocity(
      direction.x * speed * kickPulse - direction.y * swaySpeed,
      direction.y * speed * kickPulse + direction.x * swaySpeed,
      deltaSeconds,
      3.8
    );
    this.sprite.x = Phaser.Math.Clamp(this.sprite.x, tankBounds.left + 28, tankBounds.right - 28);
    this.sprite.y = Phaser.Math.Clamp(this.sprite.y, tankBounds.top + 26, tankBounds.bottom - 26);

    const horizontalDistance = this.target.x - this.sprite.x;
    if (Math.abs(horizontalDistance) > directionFlipDeadzone) {
      const nextFacing = horizontalDistance >= 0 ? 1 : -1;
      this.requestFacing(nextFacing);
    }
  }

  private updateIdleRest(): boolean {
    const now = this.scene.time.now;
    if (now < this.restUntil) {
      return true;
    }

    if (!this.hasRestedAtTarget && Phaser.Math.FloatBetween(0, 1) < fishRestChanceAtTarget) {
      this.restUntil = now + Phaser.Math.Between(minFishRestMs, maxFishRestMs);
      this.hasRestedAtTarget = true;
      return true;
    }

    this.hasRestedAtTarget = false;
    this.pickWanderTarget();
    return false;
  }

  private updatePlayChase(tankFish: Fish[]): Fish | undefined {
    const now = this.scene.time.now;
    if (this.playChaseTarget && now < this.playChaseUntil && this.isValidPlayChaseTarget(this.playChaseTarget, tankFish)) {
      return this.playChaseTarget;
    }

    if (this.playChaseTarget) {
      this.playChaseTarget = undefined;
      this.playChaseUntil = 0;
      this.scheduleNextPlayChase();
      return undefined;
    }

    if (now < this.nextPlayChaseAt) {
      return undefined;
    }

    const candidates = tankFish.filter((fish) => this.isValidPlayChaseTarget(fish, tankFish));
    if (candidates.length === 0) {
      this.scheduleNextPlayChase();
      return undefined;
    }

    this.playChaseTarget = Phaser.Utils.Array.GetRandom(candidates);
    this.playChaseUntil = now + Phaser.Math.Between(minPlayChaseDurationMs, maxPlayChaseDurationMs);
    return this.playChaseTarget;
  }

  private isValidPlayChaseTarget(fish: Fish, tankFish: Fish[]): boolean {
    return fish !== this && tankFish.includes(fish) && fish.sprite.active && fish.sprite.visible;
  }

  private scheduleNextPlayChase(): void {
    this.nextPlayChaseAt = this.scene.time.now + Phaser.Math.Between(minPlayChaseDelayMs, maxPlayChaseDelayMs);
  }

  private driftWhileResting(deltaSeconds: number, speed: number): void {
    const driftSpeed = Math.max(1.2, speed * restDriftSpeedMultiplier);
    this.steerTowardVelocity(
      Math.cos(this.swimPhase * 0.28) * driftSpeed * this.facing,
      Math.sin(this.swimPhase * 0.22 + 0.7) * driftSpeed * restDriftVerticalRatio,
      deltaSeconds,
      1.4
    );
    this.sprite.x = Phaser.Math.Clamp(this.sprite.x, tankBounds.left + 28, tankBounds.right - 28);
    this.sprite.y = Phaser.Math.Clamp(this.sprite.y, tankBounds.top + 26, tankBounds.bottom - 26);
  }

  private animateSwimming(deltaSeconds: number, moveSpeed: number, chasingFood: boolean, resting: boolean): void {
    const speedRatio = Phaser.Math.Clamp(moveSpeed / Math.max(1, this.type.speed), 0.25, 2.6);
    const baseFrequency = resting ? idleSwimFrequency * 0.42 : chasingFood ? chaseSwimFrequency : idleSwimFrequency;
    const frequency = baseFrequency * Phaser.Math.Linear(0.72, 1.18, speedRatio / 2.6);
    this.swimPhase += deltaSeconds * frequency;

    const flipStretchX = this.updateFlipTransition();
    this.applySpriteScale(this.visualWorldScale, flipStretchX, 1);
    this.sprite.setRotation(0);
  }

  private requestFacing(nextFacing: number): void {
    if (nextFacing === this.facing || nextFacing === this.pendingFacing) {
      return;
    }

    this.pendingFacing = nextFacing;
    this.flipTransitionStartedAt = this.scene.time.now;
  }

  private updateFlipTransition(): number {
    if (this.pendingFacing === undefined) {
      return 1;
    }

    const progress = Phaser.Math.Clamp(
      (this.scene.time.now - this.flipTransitionStartedAt) / directionFlipTransitionMs,
      0,
      1
    );

    if (progress >= directionFlipSwapProgress && this.facing !== this.pendingFacing) {
      this.facing = this.pendingFacing;
      this.sprite.setFlipX(this.facing < 0);
    }

    if (progress >= 1) {
      this.pendingFacing = undefined;
      return 1;
    }

    return 1 - Math.sin(progress * Math.PI) * directionFlipSqueezeStrength;
  }

  private steerTowardVelocity(targetVelocityX: number, targetVelocityY: number, deltaSeconds: number, responsiveness: number): void {
    const smoothing = Phaser.Math.Clamp(deltaSeconds * responsiveness, 0, 1);
    this.velocity.x = Phaser.Math.Linear(this.velocity.x, targetVelocityX, smoothing);
    this.velocity.y = Phaser.Math.Linear(this.velocity.y, targetVelocityY, smoothing);
    this.sprite.x += this.velocity.x * deltaSeconds;
    this.sprite.y += this.velocity.y * deltaSeconds;
  }

  private pickWanderTarget(): void {
    this.target.set(
      Phaser.Math.Between(tankBounds.left + 48, tankBounds.right - 48),
      Phaser.Math.Between(tankBounds.top + 46, tankBounds.bottom - 56)
    );
  }

  private setStateTint(): void {
    if (this.state === "ill") {
      this.sprite.setTint(this.desaturatedTint(this.usesCustomTexture ? 0xffffff : this.bodyTint(), 0.46));
      this.sprite.setAlpha(0.72);
      return;
    }

    this.sprite.setAlpha(1);
    if (this.usesCustomTexture) {
      this.sprite.clearTint();
      return;
    }

    this.sprite.setTint(this.bodyTint());
  }

  private maybeUpdateStatusBars(): void {
    if (this.statusIndicatorElapsed < statusIndicatorUpdateIntervalSeconds) {
      return;
    }

    this.updateStatusBars(true);
  }

  private updateStatusBars(force = false): void {
    if (!force && this.statusIndicatorElapsed < statusIndicatorUpdateIntervalSeconds) {
      return;
    }

    this.statusIndicatorElapsed = 0;
    const barWidth = 34;
    const barHeight = 3;
    const gap = 2;
    const x = Math.round(this.sprite.x - barWidth / 2);
    const yOffset = 16;
    const y = Math.round(Math.max(tankBounds.top + yOffset, this.sprite.y - this.sprite.displayHeight / 2 - yOffset));
    const fullnessRatio = this.currentFullnessRatio();
    const moodRatio = this.currentMoodRatio();
    const fullnessColor = fullnessRatio < 0.35 ? 0xff6d75 : fullnessRatio < 0.68 ? 0xffd15c : 0x62f2a8;
    const moodColor = moodRatio < 0.35 ? 0xff6d75 : moodRatio < 0.68 ? 0xffd15c : 0x62f2a8;
    const barY = 0;
    const showCareBars = this.shouldShowCareBars(fullnessRatio, moodRatio);

    this.statusBars.clear();
    this.statusBars.setPosition(x, y);

    if (showCareBars && !this.shouldShowHungryBubble()) {
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

  private updateStateEmoji(_statusY: number): void {
    this.hideStateEmoji();
  }

  private hideStateEmoji(): void {
    this.stateEmoji.setText("");
    this.stateEmoji.setVisible(false);
    this.stateBubble.clear();
    this.stateBubble.setVisible(false);
  }

  private showDragLoveEmoji(now = this.scene.time.now): void {
    if (now < this.nextDragLoveEmojiAt) {
      return;
    }

    this.dragLoveEmojiUntil = now + dragLoveEmojiDurationMs;
    this.nextDragLoveEmojiAt = now + dragLoveEmojiCooldownMs;
    this.updateStatusBars(true);
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

  private shouldShowHungryBubble(): boolean {
    return this.currentFullnessRatio() < hungryBubbleFullnessThreshold;
  }

  private tailTint(): number {
    return fishFoodTintFor(this.type);
  }

  private bodyTint(): number {
    return this.type.tint;
  }

  private customTextureKey(): string {
    const animatedTexture = `fish-${this.type.id}-swim`;
    if (this.scene.textures.exists(animatedTexture)) {
      return animatedTexture;
    }

    const textureKey = `fish-${this.type.id}`;
    return this.scene.textures.exists(textureKey) ? textureKey : "fish-base";
  }

  private playSwimAnimation(): void {
    const animationKey = `fish-${this.type.id}-swim-idle`;
    if (this.scene.anims.exists(animationKey)) {
      this.sprite.play(animationKey);
    }
  }

  private isFullyGrown(): boolean {
    return this.currentVisualWorldScale() >= this.tankGrowthScaleCap() - 0.01;
  }

  private updateTailMark(): void {
    if (this.usesCustomTexture) {
      if (!this.tailMark.visible) {
        return;
      }

      this.tailMark.setVisible(false);
      this.tailMark.clear();
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
    const tailHalfHeight = (this.usesCustomTexture ? 10.5 : 13) * scale;
    const tailWag = 0;
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

  private mixColor(from: number, to: number, amount: number): number {
    const ratio = Phaser.Math.Clamp(amount, 0, 1);
    const fromRed = (from >> 16) & 0xff;
    const fromGreen = (from >> 8) & 0xff;
    const fromBlue = from & 0xff;
    const toRed = (to >> 16) & 0xff;
    const toGreen = (to >> 8) & 0xff;
    const toBlue = to & 0xff;
    return Phaser.Display.Color.GetColor(
      Math.round(Phaser.Math.Linear(fromRed, toRed, ratio)),
      Math.round(Phaser.Math.Linear(fromGreen, toGreen, ratio)),
      Math.round(Phaser.Math.Linear(fromBlue, toBlue, ratio))
    );
  }
}
