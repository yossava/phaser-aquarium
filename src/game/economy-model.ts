import type { FishType } from "../types/mechanics";

export const baselineCommonFishPrice = 60;
export const commonPerCalorie = 0.03;
export const fishRoiSeconds = 3 * 60 * 60;
export const mealsToFull = 4;
export const minimumFullCaloriesNeed = 60;

export function fishCommonPrice(fishType: FishType): number {
  return fishType.price.coinType === "common" ? Math.max(1, fishType.price.amount) : baselineCommonFishPrice;
}

export function fishValueMultiplier(fishType: FishType): number {
  return Math.max(1, fishCommonPrice(fishType) / baselineCommonFishPrice);
}

export function fishFullCaloriesNeed(fishType: FishType, ageSeconds: number): number {
  const ageMinutes = Math.max(1, ageSeconds / 60);
  return Math.max(minimumFullCaloriesNeed, ageMinutes * 10 * fishValueMultiplier(fishType));
}

export function fishTargetMealCalories(fishType: FishType, ageSeconds: number): number {
  return fishFullCaloriesNeed(fishType, ageSeconds) / mealsToFull;
}
