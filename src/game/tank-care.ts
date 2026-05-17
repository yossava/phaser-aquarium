import { decorationTypes } from "../data/content";
import type { PlacedDecoration } from "./tank-entities";

export const tankCleaningRatePerSecond = 50;
export const maxTankDirtPerSecond = 28 / (60 * 60);
export const baseTankDirtPerSecond = maxTankDirtPerSecond * 0.22;
export const fishTankDirtPerSecond = maxTankDirtPerSecond * 0.075;
export const looseFoodTankDirtPerSecond = maxTankDirtPerSecond * 0.11;

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

export function tankStatusLine(input: {
  displayLevel: number;
  productionTotal: number;
  formatNumber: (value: number) => string;
  compact?: boolean;
}): string {
  return input.compact
    ? `Lv${input.formatNumber(input.displayLevel)} Produced ${input.formatNumber(input.productionTotal)}`
    : `Tank Lv${input.formatNumber(input.displayLevel)} | Produced ${input.formatNumber(input.productionTotal)}`;
}

export function tankNeedIndicator(input: {
  activeFishCount: number;
  totalFoodInventory: number;
  hasHungryFish: boolean;
  coinDropCount: number;
  maxCoinDrops: number;
  displayLevel: number;
  productionTotal: number;
  formatNumber: (value: number) => string;
  compact?: boolean;
}): string {
  if (input.compact && input.totalFoodInventory === 0 && input.hasHungryFish) {
    return "Need food";
  }
  if (!input.compact && input.activeFishCount > 0 && input.totalFoodInventory === 0 && input.hasHungryFish) {
    return "Tank needs food purchase";
  }
  if (input.coinDropCount >= input.maxCoinDrops) {
    return input.compact ? "Collect coins" : "Tank needs coin collection";
  }
  return tankStatusLine(input);
}

export function calculateTankHappiness(input: {
  activeFishCount: number;
  activeDecorations: PlacedDecoration[];
  cleanliness: number;
}): number {
  const decorationBonus = input.activeDecorations.reduce((total, placedDecoration) => {
    const decoration = decorationTypes.find((item) => item.id === placedDecoration.typeId);
    return total + (decoration?.happinessBonus ?? 0);
  }, 0);
  const crowdingPenalty = Math.max(0, input.activeFishCount - 4) * 8 +
    Math.max(0, input.activeDecorations.length - 6) * 4;
  const cleanlinessPenalty = Math.max(0, 75 - input.cleanliness) * 0.55;
  return clampPercent(68 + decorationBonus - crowdingPenalty - cleanlinessPenalty);
}

export function tankDirtRatePerSecond(input: {
  activeFishCount: number;
  looseFoodCount: number;
}): number {
  return Math.min(
    maxTankDirtPerSecond,
    baseTankDirtPerSecond +
      input.activeFishCount * fishTankDirtPerSecond +
      input.looseFoodCount * looseFoodTankDirtPerSecond
  );
}

export function nextTankCleanliness(input: {
  cleanliness: number;
  deltaSeconds: number;
  cleaning: boolean;
  activeFishCount: number;
  looseFoodCount: number;
}): number {
  if (input.cleaning) {
    return clampPercent(input.cleanliness + tankCleaningRatePerSecond * input.deltaSeconds);
  }
  return clampPercent(input.cleanliness - tankDirtRatePerSecond(input) * input.deltaSeconds);
}

export function isTankDirty(cleanliness: number): boolean {
  return Math.round(cleanliness) < 100;
}
