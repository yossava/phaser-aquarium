import { basicFood, decorationTypes, fishTypes, foodTypes } from "../data/content";
import { formatNumber } from "./economy";
import { hiddenFoodTypeIds, supplyFoodTypeIds } from "./food-system";
import type { PrizeSpinPrize } from "./prize-machine";
import { prizeWheelIconTextureKeys, type PrizeWheelSegment } from "./prize-machine-wheel";
import { decorationSizeOrder, decorationSizes, type DecorationSize } from "./tank-catalog";
import type { DecorationType, FishType, FoodType, FoodTypeId, Price } from "../types/mechanics";

const minimumCommonSpinPrize = 0.1;
const commonSpinPrizeStep = 0.1;

export type PreparedPrizeMachineReward =
  | { kind: "rare"; amount: number; segmentIndex: number }
  | { kind: "superRare"; amount: number; segmentIndex: number }
  | { kind: "rareFish"; fishType: FishType; segmentIndex: number }
  | { kind: "premiumCommon"; amount: number; segmentIndex: number }
  | { kind: "food"; foodType: FoodType; quantity: number; segmentIndex: number }
  | { kind: "decoration"; decorationType: DecorationType; size: DecorationSize; segmentIndex: number }
  | { kind: "common"; amount: number; segmentIndex: number };

type PrizeSegmentCandidate = {
  key: string;
  segment: PrizeWheelSegment;
  value: number;
};

export type PrizeWheelPlannerInput = {
  selectedBetAmount: number;
  recentPrizeKeys: readonly string[];
  rareCoinWealthValue: number;
  superRareCoinWealthValue: number;
  ownedFishTypeIds: () => Set<string>;
  textureExists: (textureKey: string) => boolean;
  isDroppableFood: (foodTypeId: FoodTypeId) => boolean;
  isCalorieTrackedFood: (foodTypeId: FoodTypeId) => boolean;
  foodTextureKey: (foodTypeId: FoodTypeId) => string;
  foodSellValue: (foodType: FoodType, storedAmount?: number) => number;
  decorationSellValue: (decorationType: DecorationType, size: DecorationSize, count?: number) => number;
  decorationVariantPrice: (decorationType: DecorationType, size: DecorationSize) => Price;
  priceWealth: (price: Price) => number;
  coinSellValue: (coinType: "rare" | "superRare", count?: number) => number;
  storedFishSellValue: (fishType: FishType) => number;
  sanitizeDecorationSize: (size: string | undefined) => DecorationSize;
};

export class PrizeWheelPlanner {
  public constructor(private readonly input: PrizeWheelPlannerInput) {}

  public createSegments(): PrizeWheelSegment[] {
    const betAmount = this.input.selectedBetAmount;
    const targetMultipliers = [0.5, 0.58, 0.66, 0.74, 0.82, 0.9, 1.1, 1.18, 1.26, 1.34, 1.42, 1.5];
    const usedKeys = new Set<string>();

    return targetMultipliers.map((multiplier, index) => {
      const lane: "loss" | "win" = multiplier < 1 ? "loss" : "win";
      const rawTargetValue = betAmount * multiplier;
      const targetValue = lane === "loss"
        ? Math.max(minimumCommonSpinPrize, Math.min(betAmount - commonSpinPrizeStep, rawTargetValue))
        : Math.max(betAmount + 1, Math.round(rawTargetValue));
      if (index === 10) {
        const fishCandidate = this.fishCandidateForTarget(targetValue, lane);
        usedKeys.add(fishCandidate.key);
        return fishCandidate.segment;
      }

      const candidates = this.candidatesForTarget(targetValue, lane, index);
      const candidate = this.chooseSegmentCandidate(candidates, targetValue, index, usedKeys);
      usedKeys.add(candidate.key);
      return candidate.segment;
    });
  }

  public fishPrizePool(): FishType[] {
    const ownedFishIds = this.input.ownedFishTypeIds();
    const rarityPool = this.input.selectedBetAmount < this.input.rareCoinWealthValue
      ? fishTypes.filter((fishType) => fishType.rarity === "common")
      : fishTypes.filter((fishType) => fishType.rarity !== "common");
    const basePool = rarityPool.length > 0 ? rarityPool : fishTypes;
    const unowned = basePool.filter((fishType) => !ownedFishIds.has(fishType.id));
    return unowned.length > 0 ? unowned : basePool;
  }

  public choosePreparedReward(segments: PrizeWheelSegment[]): PreparedPrizeMachineReward {
    const candidates = segments.map((segment, segmentIndex) => {
      const reward = this.prepareSegmentReward(segment, segmentIndex);
      return {
        reward,
        value: this.rewardResaleValue(reward),
        key: this.rewardKey(reward)
      };
    });
    const recentPrizeKeys = new Set(this.input.recentPrizeKeys);
    const filteredCandidates = this.filterRepeatCandidates(candidates, recentPrizeKeys);
    const pool = filteredCandidates.length > 0 ? filteredCandidates : candidates;
    return pool[Math.floor(Math.random() * pool.length)]?.reward ?? { kind: "common", amount: 10, segmentIndex: 0 };
  }

  public rewardResaleValue(reward: PreparedPrizeMachineReward): number {
    if (reward.kind === "rare") {
      return this.input.coinSellValue("rare", reward.amount);
    }
    if (reward.kind === "superRare") {
      return this.input.coinSellValue("superRare", reward.amount);
    }
    if (reward.kind === "rareFish") {
      return this.input.storedFishSellValue(reward.fishType);
    }
    if (reward.kind === "premiumCommon" || reward.kind === "common") {
      return reward.amount;
    }
    if (reward.kind === "decoration") {
      return this.input.decorationSellValue(reward.decorationType, reward.size, 1);
    }
    return this.input.foodSellValue(reward.foodType, (this.input.isCalorieTrackedFood(reward.foodType.id) ? reward.foodType.calories : 1) * reward.quantity);
  }

  public rewardKey(reward: PreparedPrizeMachineReward): string {
    if (reward.kind === "food") {
      return `food:${reward.foodType.id}:${reward.quantity}`;
    }
    if (reward.kind === "common" || reward.kind === "premiumCommon") {
      return `${reward.kind}:C${reward.amount}`;
    }
    if (reward.kind === "rareFish") {
      return `rareFish:${reward.fishType.id}`;
    }
    if (reward.kind === "decoration") {
      return `decoration:${reward.decorationType.id}:${reward.size}`;
    }
    return `${reward.kind}:${reward.amount}`;
  }

  private candidatesForTarget(targetValue: number, lane: "loss" | "win", slotIndex: number): PrizeSegmentCandidate[] {
    const betAmount = this.input.selectedBetAmount;
    const candidates = [
      this.commonCandidate(targetValue, slotIndex),
      ...this.foodCandidates(targetValue, lane, slotIndex),
      ...this.decorationCandidates(targetValue, lane, slotIndex),
      ...this.rareCoinCandidates(targetValue, lane),
      ...this.superRareCoinCandidates(targetValue, lane),
      ...this.rareFishCandidates(targetValue, lane)
    ].filter((candidate) => this.valueMatchesLane(candidate.value, lane, betAmount));

    return candidates.length > 0 ? candidates : [this.commonCandidate(targetValue, slotIndex)];
  }

  private commonCandidate(targetValue: number, slotIndex: number): PrizeSegmentCandidate {
    const commonColors = [0x0c8fb3, 0x136f96, 0x1ba8c9, 0x0b7f8c, 0x2e9fc0, 0x0f5f7f];
    const amount = targetValue < 1
      ? Math.max(minimumCommonSpinPrize, Math.round(targetValue / commonSpinPrizeStep) * commonSpinPrizeStep)
      : Math.max(1, Math.round(targetValue));
    return {
      key: `common:${amount}`,
      value: amount,
      segment: {
        kind: "common",
        label: `C${formatNumber(amount)}`,
        iconTextureKey: prizeWheelIconTextureKeys.common,
        color: commonColors[slotIndex % commonColors.length],
        commonAmount: amount
      }
    };
  }

  private foodCandidates(targetValue: number, lane: "loss" | "win", slotIndex: number): PrizeSegmentCandidate[] {
    const foodColors = [0x55b987, 0x6fc6aa, 0x78ad72, 0x2c9c8d, 0x76b8c8, 0x4f9a6b];
    return foodTypes
      .filter((foodType) => !hiddenFoodTypeIds.has(foodType.id) && !supplyFoodTypeIds.has(foodType.id) && this.input.isDroppableFood(foodType.id))
      .map((foodType, index) => {
        const unitStoredAmount = this.input.isCalorieTrackedFood(foodType.id) ? foodType.calories : 1;
        const unitValue = this.input.foodSellValue(foodType, unitStoredAmount);
        const quantity = this.quantityForTarget(unitValue, targetValue, lane);
        const storedAmount = unitStoredAmount * quantity;
        const value = this.input.foodSellValue(foodType, storedAmount);
        const marketValue = this.input.priceWealth(foodType.price) * quantity;
        const label = `${prizeWheelFoodLabel(foodType)}${quantity > 1 ? ` x${formatNumber(quantity)}` : ""}`;
        return {
          key: `food:${foodType.id}:${quantity}`,
          value,
          segment: {
            kind: "food" as const,
            label,
            resultLabel: label,
            resultMarketLabel: `(Worth C${formatNumber(marketValue)})`,
            iconTextureKey: this.input.foodTextureKey(foodType.id),
            color: foodColors[(slotIndex + index) % foodColors.length],
            foodTypeId: foodType.id,
            foodQuantity: quantity
          }
        };
      });
  }

  private decorationCandidates(targetValue: number, lane: "loss" | "win", slotIndex: number): PrizeSegmentCandidate[] {
    const decorationColors = [0xc58c4a, 0xa76ee6, 0x26b8a6, 0xe0a13a, 0x6fa8dc, 0xd47f6a];
    return decorationTypes
      .flatMap((decorationType, decorationIndex) =>
        decorationSizeOrder.map((size, sizeIndex) => {
          const unitValue = this.input.decorationSellValue(decorationType, size, 1);
          const price = this.input.decorationVariantPrice(decorationType, size);
          return {
            decorationType,
            size,
            value: unitValue,
            marketValue: this.input.priceWealth(price),
            color: decorationColors[(slotIndex + decorationIndex + sizeIndex) % decorationColors.length]
          };
        })
      )
      .filter((candidate) => this.valueMatchesLane(candidate.value, lane))
      .sort((first, second) => Math.abs(first.value - targetValue) - Math.abs(second.value - targetValue))
      .slice(0, 8)
      .map((candidate) => {
        const sizeLabel = decorationSizes[candidate.size].label;
        const label = `${candidate.decorationType.name} ${sizeLabel}`;
        return {
          key: `decoration:${candidate.decorationType.id}:${candidate.size}`,
          value: candidate.value,
          segment: {
            kind: "decoration" as const,
            label,
            resultLabel: label,
            resultMarketLabel: `(Worth C${formatNumber(candidate.marketValue)})`,
            iconTextureKey: this.input.textureExists(candidate.decorationType.texture) ? candidate.decorationType.texture : prizeWheelIconTextureKeys.food,
            color: candidate.color,
            decorationTypeId: candidate.decorationType.id,
            decorationSize: candidate.size
          }
        };
      });
  }

  private rareCoinCandidates(targetValue: number, lane: "loss" | "win"): PrizeSegmentCandidate[] {
    const unitValue = this.input.coinSellValue("rare");
    const amount = this.coinAmountForTarget("rare", unitValue, targetValue, lane);
    const value = this.input.coinSellValue("rare", amount);
    return [{
      key: `rare:${amount}`,
      value,
      segment: {
        kind: "rare",
        label: `R${formatNumber(amount)}`,
        resultLabel: `R${formatNumber(amount)}`,
        resultMarketLabel: `(Worth C${formatNumber(this.input.rareCoinWealthValue * amount)})`,
        iconTextureKey: prizeWheelIconTextureKeys.rare,
        color: 0x89d5e8,
        rareAmount: amount
      }
    }];
  }

  private superRareCoinCandidates(targetValue: number, lane: "loss" | "win"): PrizeSegmentCandidate[] {
    const unitValue = this.input.coinSellValue("superRare");
    const amount = this.coinAmountForTarget("superRare", unitValue, targetValue, lane);
    const value = this.input.coinSellValue("superRare", amount);
    return [{
      key: `superRare:${amount}`,
      value,
      segment: {
        kind: "superRare",
        label: `SR${formatNumber(amount)}`,
        resultLabel: `SR${formatNumber(amount)}`,
        resultMarketLabel: `(Worth C${formatNumber(this.input.superRareCoinWealthValue * amount)})`,
        iconTextureKey: prizeWheelIconTextureKeys.superRare,
        color: 0x7d73dd,
        superRareAmount: amount
      }
    }];
  }

  private rareFishCandidates(targetValue: number, lane: "loss" | "win"): PrizeSegmentCandidate[] {
    return this.fishPrizePool()
      .map((fishType) => this.fishCandidate(fishType))
      .filter((candidate) => this.valueMatchesLane(candidate.value, lane))
      .sort((first, second) => Math.abs(first.value - targetValue) - Math.abs(second.value - targetValue))
      .slice(0, 4);
  }

  private fishCandidateForTarget(targetValue: number, lane: "loss" | "win"): PrizeSegmentCandidate {
    const candidates = this.fishPrizePool().map((fishType) => this.fishCandidate(fishType));
    const fittingCandidates = candidates.filter((candidate) => this.valueMatchesLane(candidate.value, lane));
    const saneCandidates = candidates.filter((candidate) => candidate.value <= Math.max(1, Math.ceil(this.input.selectedBetAmount * 1.5)));
    const pool = fittingCandidates.length > 0
      ? fittingCandidates
      : saneCandidates.length > 0
        ? saneCandidates
        : candidates;
    return [...pool].sort((first, second) => Math.abs(first.value - targetValue) - Math.abs(second.value - targetValue))[0] ?? this.fishCandidate(fishTypes[0]);
  }

  private fishCandidate(fishType: FishType): PrizeSegmentCandidate {
    const label = fishType.rarity === "common" ? "C Fish" : fishType.rarity === "rare" ? "R Fish" : "SR Fish";
    const value = this.input.storedFishSellValue(fishType);
    return {
      key: `rareFish:${fishType.id}`,
      value,
      segment: {
        kind: "rareFish",
        label,
        iconTextureKey: this.input.textureExists(`fish-${fishType.id}`) ? `fish-${fishType.id}` : prizeWheelIconTextureKeys.fish,
        color: 0xf28f6b,
        resultLabel: fishType.name,
        resultMarketLabel: `(Worth C${formatNumber(this.input.priceWealth(fishType.price))})`,
        fishTypeId: fishType.id
      }
    };
  }

  private quantityForTarget(unitValue: number, targetValue: number, lane: "loss" | "win"): number {
    const safeUnitValue = Math.max(1, unitValue);
    const estimatedQuantity = Math.max(1, Math.round(targetValue / safeUnitValue));
    const betAmount = this.input.selectedBetAmount;
    const quantities = Array.from({ length: 9 }, (_, offset) => Math.max(1, estimatedQuantity - 4 + offset));
    const sorted = [...new Set(quantities)].sort((first, second) => {
      const firstValue = first * safeUnitValue;
      const secondValue = second * safeUnitValue;
      const firstValid = this.valueMatchesLane(firstValue, lane, betAmount) ? 0 : 1;
      const secondValid = this.valueMatchesLane(secondValue, lane, betAmount) ? 0 : 1;
      return firstValid - secondValid || Math.abs(firstValue - targetValue) - Math.abs(secondValue - targetValue);
    });
    return sorted[0] ?? estimatedQuantity;
  }

  private coinAmountForTarget(coinType: "rare" | "superRare", unitValue: number, targetValue: number, lane: "loss" | "win"): number {
    const safeUnitValue = Math.max(1, unitValue);
    const estimatedAmount = Math.max(1, Math.round(targetValue / safeUnitValue));
    const amounts = Array.from({ length: 11 }, (_, offset) => Math.max(1, estimatedAmount + offset - 5));
    const sorted = [...new Set(amounts)].sort((first, second) => {
      const firstValue = this.input.coinSellValue(coinType, first);
      const secondValue = this.input.coinSellValue(coinType, second);
      const firstValid = this.valueMatchesLane(firstValue, lane) ? 0 : 1;
      const secondValid = this.valueMatchesLane(secondValue, lane) ? 0 : 1;
      return firstValid - secondValid || Math.abs(firstValue - targetValue) - Math.abs(secondValue - targetValue);
    });
    return sorted[0] ?? estimatedAmount;
  }

  private valueMatchesLane(value: number, lane: "loss" | "win", betAmount = this.input.selectedBetAmount): boolean {
    const safeBet = Math.max(1, betAmount);
    if (lane === "loss") {
      return value >= Math.max(minimumCommonSpinPrize, safeBet * 0.5) && value < safeBet;
    }
    return value > safeBet && value <= Math.max(safeBet + 1, Math.ceil(safeBet * 1.5));
  }

  private chooseSegmentCandidate(
    candidates: PrizeSegmentCandidate[],
    targetValue: number,
    slotIndex: number,
    usedKeys: Set<string>
  ): PrizeSegmentCandidate {
    const preferredKinds: PrizeSpinPrize[] = ["common", "food", "decoration", "food", "common", "rare", "decoration", "food", "rare", "food", "rareFish", "superRare"];
    const unusedCandidates = candidates.filter((candidate) => !usedKeys.has(candidate.key));
    const availableCandidates = unusedCandidates.length > 0 ? unusedCandidates : candidates;
    const preferredKind = preferredKinds[slotIndex % preferredKinds.length];
    const preferredCandidates = availableCandidates.filter((candidate) => candidate.segment.kind === preferredKind);
    const pool = preferredCandidates.length > 0 ? preferredCandidates : availableCandidates;
    return [...pool].sort((first, second) => Math.abs(first.value - targetValue) - Math.abs(second.value - targetValue))[0] ?? candidates[0];
  }

  private filterRepeatCandidates<T extends { key: string }>(candidates: T[], recentPrizeKeys: Set<string>): T[] {
    const filtered = candidates.filter((candidate) => !recentPrizeKeys.has(candidate.key));
    return filtered.length >= 3 ? filtered : candidates;
  }

  private prepareSegmentReward(segment: PrizeWheelSegment, segmentIndex: number): PreparedPrizeMachineReward {
    if (segment.kind === "rare") {
      return { kind: "rare", amount: Math.max(1, Math.floor(segment.rareAmount ?? 1)), segmentIndex };
    }
    if (segment.kind === "superRare") {
      return { kind: "superRare", amount: Math.max(1, Math.floor(segment.superRareAmount ?? 1)), segmentIndex };
    }
    if (segment.kind === "rareFish") {
      const fishType = fishTypes.find((candidate) => candidate.id === segment.fishTypeId) ?? fishTypes[0];
      return { kind: "rareFish", fishType, segmentIndex };
    }
    if (segment.kind === "premiumCommon") {
      return { kind: "premiumCommon", amount: segment.commonAmount ?? 500, segmentIndex };
    }
    if (segment.kind === "food") {
      const foodType = foodTypes.find((candidate) => candidate.id === segment.foodTypeId) ?? basicFood;
      return { kind: "food", foodType, quantity: Math.max(1, segment.foodQuantity ?? 1), segmentIndex };
    }
    if (segment.kind === "decoration") {
      const decorationType = decorationTypes.find((candidate) => candidate.id === segment.decorationTypeId) ?? decorationTypes[0];
      return {
        kind: "decoration",
        decorationType,
        size: this.input.sanitizeDecorationSize(segment.decorationSize),
        segmentIndex
      };
    }
    return { kind: "common", amount: segment.commonAmount ?? 10, segmentIndex };
  }
}

function prizeWheelFoodLabel(foodType: FoodType): string {
  if (foodType.id === "ageBoost") {
    return "Growth";
  }
  if (foodType.id === "medicine") {
    return "Meds";
  }
  return foodType.name;
}
