import { priceComponents } from "./economy";
import type { CoinProduction, CoinType, FishType, Price } from "../types/mechanics";

export const baselineCommonFishPrice = 60;
export const commonPerCalorie = 0.03;
export const fishRoiSeconds = 3 * 60 * 60;
export const mealsToFull = 4;
export const minimumFullCaloriesNeed = 60;
export const maximumMealCaloriesNeed = 1_000_000_000_000;
export const maximumFullCaloriesNeed = maximumMealCaloriesNeed * mealsToFull;
export const fishCoinProductionMinDelayMs = 2000;
export const fishCoinProductionMaxDelayMs = 8000;
export const fishCoinProductionAverageDelaySeconds = 5;
export const minimumFishCoinDropValue = 0.1;
export const fishPowerLevelSeconds = 12 * 60 * 60;
const fishPowerLevelPriceGrowth = 1.75;
const coinWealthValue: Record<CoinType, number> = {
  common: 1,
  rare: 1000,
  superRare: 10000
};

export type FishCoinDropPlanInput = {
  fullnessCalories: number;
  fullCaloriesNeed: number;
  valuePerCalorie: number;
  pendingValue: number;
  windowSeconds: number;
  calorieVariance: number;
  capMultiplier: number;
};

export type FishCoinDropPlan = {
  producedValueMax: number;
  caloriesSpentPerCoin: number;
  nextPendingValueIfNoDrop: number;
  nextPendingValueAfterDropBase: number;
};

function floorToDropUnit(value: number): number {
  return Math.floor(Math.max(0, value) / minimumFishCoinDropValue) * minimumFishCoinDropValue;
}

export function fishCommonPrice(fishType: FishType): number {
  return fishType.price.coinType === "common" ? Math.max(1, fishType.price.amount) : baselineCommonFishPrice;
}

export function fishPowerPrice(price: Price): number {
  return Math.max(1, priceComponents(price).reduce((total, [coinType, amount]) => total + amount * coinWealthValue[coinType], 0));
}

export function fishPowerPriceForType(fishType: FishType): number {
  return fishPowerPrice(fishType.price);
}

export function fishPowerLevelForPrice(fishType: FishType): number {
  const priceRatio = Math.max(1, fishPowerPriceForType(fishType) / baselineCommonFishPrice);
  return Math.max(1, Math.floor(Math.log(priceRatio) / Math.log(fishPowerLevelPriceGrowth)) + 1);
}

export function fishPowerAgeSecondsForLevel(level: number): number {
  return (Math.max(1, Math.floor(level)) - 1) * fishPowerLevelSeconds;
}

export function fishPowerLevelForAgeSeconds(ageSeconds: number): number {
  return Math.max(1, Math.floor(Math.max(0, ageSeconds) / fishPowerLevelSeconds) + 1);
}

export function fishPowerValueForAgeSeconds(ageSeconds: number): number {
  const powerLevel = fishPowerLevelForAgeSeconds(ageSeconds);
  return Math.max(baselineCommonFishPrice, baselineCommonFishPrice * Math.pow(fishPowerLevelPriceGrowth, powerLevel - 1));
}

export function fishPowerResaleValue(ageSeconds: number): number {
  return fishPowerValueForAgeSeconds(ageSeconds);
}

export function fishValueMultiplier(_fishType: FishType, ageSeconds = 0): number {
  return Math.max(1, fishPowerValueForAgeSeconds(ageSeconds) / baselineCommonFishPrice);
}

export function fishFullCaloriesNeed(fishType: FishType, ageSeconds: number): number {
  return clamp(Math.max(minimumFullCaloriesNeed, baselineCommonFishPrice * fishValueMultiplier(fishType, ageSeconds)), minimumFullCaloriesNeed, maximumFullCaloriesNeed);
}

export function fishTargetMealCalories(fishType: FishType, ageSeconds: number): number {
  return fishFullCaloriesNeed(fishType, ageSeconds) / mealsToFull;
}

export function fishCurrentFullnessCalories(hunger: number, fullCaloriesNeed: number): number {
  return Math.max(0, ((100 - hunger) / 100) * fullCaloriesNeed);
}

export function fishHungerReductionFromCalories(calories: number, fullCaloriesNeed: number): number {
  return (Math.max(0, calories) / Math.max(1, fullCaloriesNeed)) * 100;
}

export function fishRoiProgressRatio(ageSeconds: number): number {
  return clamp(ageSeconds / fishRoiSeconds, 0, 1);
}

export function fishPostRoiHourlyNet(fullCaloriesNeed: number): number {
  return fullCaloriesNeed * commonPerCalorie * 0.1;
}

export function fishCoinValuePerFullnessCalorie(fishType: FishType, ageSeconds: number, fullCaloriesNeed: number): number {
  if (ageSeconds >= fishRoiSeconds) {
    return commonPerCalorie * 1.1;
  }

  return commonPerCalorie + (fishPowerValueForAgeSeconds(ageSeconds) * 3600) / Math.max(1, fishRoiSeconds * fullCaloriesNeed);
}

export function fishCoinProductionValueForCalories(
  fishType: FishType,
  ageSeconds: number,
  fullCaloriesNeed: number,
  calories: number
): number {
  return Math.max(0, calories) * fishCoinValuePerFullnessCalorie(fishType, ageSeconds, fullCaloriesNeed);
}

export function fishPrimaryProduction(fishType: FishType, ageSeconds: number, fullCaloriesNeed: number): CoinProduction {
  return {
    coinType: "common",
    amount: Math.max(1, Math.ceil(fullCaloriesNeed * fishCoinValuePerFullnessCalorie(fishType, ageSeconds, fullCaloriesNeed) * (fishCoinProductionAverageDelaySeconds / 3600))),
    intervalSeconds: Math.round(fishCoinProductionAverageDelaySeconds),
    chance: 1
  };
}

export function fishCoinDropPlan(input: FishCoinDropPlanInput): FishCoinDropPlan | undefined {
  const fullnessCalories = Math.max(0, input.fullnessCalories);
  const valuePerCalorie = Math.max(0.0001, input.valuePerCalorie);
  if (fullnessCalories <= 0) {
    return undefined;
  }

  const targetCalories = Math.min(
    fullnessCalories,
    Math.max(0, input.fullCaloriesNeed) * (Math.max(0, input.windowSeconds) / 3600) * Math.max(0, input.calorieVariance)
  );
  const availableValue = targetCalories * valuePerCalorie + Math.max(0, input.pendingValue);
  let flooredValue = Math.floor(availableValue);

  if (flooredValue <= 0) {
    const fractionalValue = floorToDropUnit(availableValue);
    if (fractionalValue >= minimumFishCoinDropValue) {
      return {
        producedValueMax: fractionalValue,
        caloriesSpentPerCoin: 1 / valuePerCalorie,
        nextPendingValueIfNoDrop: availableValue,
        nextPendingValueAfterDropBase: availableValue
      };
    }

    return {
      producedValueMax: 0,
      caloriesSpentPerCoin: 1 / valuePerCalorie,
      nextPendingValueIfNoDrop: availableValue,
      nextPendingValueAfterDropBase: availableValue
    };
  }

  const maximumAffordableValue = Math.max(1, Math.floor(fullnessCalories * valuePerCalorie + Math.max(0, input.pendingValue)));
  const primaryAmount = Math.max(1, Math.ceil(Math.max(0, input.fullCaloriesNeed) * valuePerCalorie * (fishCoinProductionAverageDelaySeconds / 3600)));
  const randomCap = Math.max(1, Math.ceil(primaryAmount * Math.max(0, input.capMultiplier)));
  return {
    producedValueMax: Math.min(maximumAffordableValue, Math.max(flooredValue, randomCap)),
    caloriesSpentPerCoin: 1 / valuePerCalorie,
    nextPendingValueIfNoDrop: availableValue,
    nextPendingValueAfterDropBase: availableValue
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
