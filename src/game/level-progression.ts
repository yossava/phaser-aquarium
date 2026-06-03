import { clamp } from "./math";

export const baseFishProductionLevelThreshold = 250;
export const minTargetActiveLevelHours = 0.5;
export const maxTargetActiveLevelHours = 2.5;
export const maxDynamicProductionPaceMultiplier = 50;

export type LevelProgress = {
  level: number;
  ratio: number;
  percent: number;
};

export function rawTankDisplayLevelFromProduction(production: number): number {
  const totalProduction = Math.max(0, Math.floor(production));
  let level = 1;
  let nextThreshold = baseFishProductionLevelThreshold;
  while (totalProduction >= nextThreshold) {
    level += 1;
    nextThreshold *= 5;
  }
  return level;
}

export function fishProductionThresholdForLevel(level: number): number {
  const displayLevel = Math.max(1, Math.floor(level));
  if (displayLevel <= 1) {
    return 0;
  }
  return baseFishProductionLevelThreshold * Math.pow(5, displayLevel - 2);
}

export function targetActiveHoursForDisplayLevel(level: number): number {
  return Math.min(maxTargetActiveLevelHours, minTargetActiveLevelHours + (Math.max(1, Math.floor(level)) - 1) * 0.1);
}

export function targetProductionPerMinuteForLevel(level: number): number {
  const currentLevel = Math.max(1, Math.floor(level));
  const currentThreshold = fishProductionThresholdForLevel(currentLevel);
  const nextThreshold = fishProductionThresholdForLevel(currentLevel + 1);
  const targetMinutes = targetActiveHoursForDisplayLevel(currentLevel) * 60;
  return Math.max(1, (nextThreshold - currentThreshold) / Math.max(1, targetMinutes));
}

export function levelProgressToNext(level: number, production: number): LevelProgress {
  const currentLevel = Math.max(1, Math.floor(level));
  const currentThreshold = fishProductionThresholdForLevel(currentLevel);
  const nextThreshold = fishProductionThresholdForLevel(currentLevel + 1);
  const ratio = clamp(
    (Math.max(0, production) - currentThreshold) / Math.max(1, nextThreshold - currentThreshold),
    0,
    1
  );
  return {
    level: currentLevel,
    ratio,
    percent: Math.floor(ratio * 100)
  };
}
