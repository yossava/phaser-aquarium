import {
  fishProductionThresholdForLevel,
  maxDynamicProductionPaceMultiplier,
  targetActiveHoursForDisplayLevel,
  targetProductionPerMinuteForLevel
} from "../../game/level-progression";
import { coinComboMaxProductionMultiplier } from "./aquarium-scene-config";
import type { Fish } from "../../objects/Fish";
import type { TankRuntimeState } from "../../game/tank-state";

/**
 * Owns active-production accounting and the dynamic "catch-up" pace multiplier:
 * accumulating fish production toward level thresholds, projecting per-minute
 * output, and total/per-tank wealth. Memoizes the pace multiplier per frame.
 * The scene keeps thin wrappers so existing callers are unaffected.
 */
export type AquariumProductionControllerHost = {
  tankLevel: () => number;
  ensureTankState: (level: number) => TankRuntimeState;
  activeFish: () => Fish[];
  sortedOwnedTankLevels: () => number[];
  updateFrameKey: () => number;
  awardLevelCompletionRewards: (level: number, previousProduction: number, nextProduction: number) => boolean;
  calculateTankNetWorth: (level: number) => number;
  tankDisplayLevel: (level?: number) => number;
};

export class AquariumProductionController {
  private activeProductionPaceMultiplierFrame = -1;
  private activeProductionPaceMultiplierValue = 1;

  public constructor(private readonly host: AquariumProductionControllerHost) {}

  public addFishProductionTotal(level: number, amount: number): boolean {
    const production = Math.max(0, Math.round(amount * 10) / 10);
    if (production <= 0) {
      return false;
    }
    const state = this.host.ensureTankState(level);
    const previousProduction = Math.max(0, state.fishProductionTotal ?? 0);
    const nextProduction = Math.round((previousProduction + production) * 10) / 10;
    state.fishProductionTotal = nextProduction;
    return this.host.awardLevelCompletionRewards(level, previousProduction, nextProduction);
  }

  public fishProductionTotal(level = this.host.tankLevel()): number {
    return Math.max(0, this.host.ensureTankState(level).fishProductionTotal ?? 0);
  }

  public calculateTotalWealth(): number {
    return this.host.sortedOwnedTankLevels().reduce((total, level) => total + this.host.calculateTankNetWorth(level), 0);
  }

  public projectedActiveProductionPerMinute(): number {
    return this.host.activeFish()
      .filter((fish) => fish.state !== "ill" && fish.health >= 35 && fish.currentFullnessCalories() > 0)
      .reduce((total, fish) => total + fish.projectedProductionPerMinute(), 0);
  }

  public activeProductionPaceMultiplier(): number {
    const frame = this.host.updateFrameKey();
    if (this.activeProductionPaceMultiplierFrame === frame) {
      return this.activeProductionPaceMultiplierValue;
    }

    const projectedPerMinute = this.projectedActiveProductionPerMinute();
    if (projectedPerMinute <= 0) {
      this.activeProductionPaceMultiplierFrame = frame;
      this.activeProductionPaceMultiplierValue = 1;
      return 1;
    }

    const displayLevel = this.host.tankDisplayLevel();
    const targetPerMinute = targetProductionPerMinuteForLevel(displayLevel);
    const baseMultiplier = targetPerMinute / (projectedPerMinute * coinComboMaxProductionMultiplier);
    const currentThreshold = fishProductionThresholdForLevel(displayLevel);
    const nextThreshold = fishProductionThresholdForLevel(displayLevel + 1);
    const productionRatio = Phaser.Math.Clamp(
      (this.fishProductionTotal(this.host.tankLevel()) - currentThreshold) / Math.max(1, nextThreshold - currentThreshold),
      0,
      1
    );
    const targetSeconds = targetActiveHoursForDisplayLevel(displayLevel) * 3600;
    const oldestActiveAgeSeconds = this.host.activeFish().reduce((oldest, fish) => Math.max(oldest, fish.ageSeconds), 0);
    const activeAgeWithinLevelSeconds = targetSeconds > 0 ? oldestActiveAgeSeconds % targetSeconds : 0;
    const expectedRatio = Phaser.Math.Clamp(activeAgeWithinLevelSeconds / Math.max(1, targetSeconds), 0, 1);
    const catchUpMultiplier = expectedRatio > productionRatio
      ? Phaser.Math.Clamp(expectedRatio / Math.max(0.02, productionRatio), 1, maxDynamicProductionPaceMultiplier)
      : 1;
    const multiplier = Phaser.Math.Clamp(baseMultiplier * catchUpMultiplier, 1, maxDynamicProductionPaceMultiplier);
    this.activeProductionPaceMultiplierFrame = frame;
    this.activeProductionPaceMultiplierValue = multiplier;
    return multiplier;
  }
}
