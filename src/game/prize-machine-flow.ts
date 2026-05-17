import Phaser from "phaser";
import type { Fish } from "../objects/Fish";
import type { DecorationType, FishType, FoodType, FoodTypeId, Price, Rarity } from "../types/mechanics";
import { fishTypes } from "../data/content";
import { formatNumber } from "./economy";
import { coinWealthValue } from "./economy-values";
import {
  prizeMachineConfigForBet,
  setPrizeMachineBet,
  type PrizeMachineBetAmount,
  type PrizeMachineConfig,
  type PrizeMachineState,
  type PrizeSpinPrize
} from "./prize-machine";
import { PrizeWheelPlanner, type PreparedPrizeMachineReward } from "./prize-wheel-planner";
import type { DecorationSize } from "./tank-catalog";

export type PrizeMachineBetSyncResult = {
  state: PrizeMachineState;
  selectedBetAmount: PrizeMachineBetAmount;
};

export function currentPrizeBetIndex(
  state: PrizeMachineState,
  betAmounts: readonly PrizeMachineBetAmount[],
  selectedBetIndex?: number
): number {
  if (betAmounts.length === 0) {
    return 0;
  }

  if (selectedBetIndex !== undefined) {
    return Phaser.Math.Clamp(selectedBetIndex, 0, betAmounts.length - 1);
  }

  const selected = Math.max(1, Math.floor(state.selectedBetAmount));
  return betAmounts.reduce((closestIndex, bet, index) => {
    const closest = betAmounts[closestIndex] ?? bet;
    return Math.abs(bet - selected) < Math.abs(closest - selected) ? index : closestIndex;
  }, 0);
}

export function currentPrizeBetAmount(
  state: PrizeMachineState,
  betAmounts: readonly PrizeMachineBetAmount[],
  selectedBetIndex?: number
): PrizeMachineBetAmount {
  return betAmounts[currentPrizeBetIndex(state, betAmounts, selectedBetIndex)] ?? betAmounts[0] ?? 1;
}

export function syncPrizeBetAmount(
  state: PrizeMachineState,
  betAmounts: readonly PrizeMachineBetAmount[],
  selectedBetIndex?: number
): PrizeMachineBetSyncResult {
  const selectedBetAmount = currentPrizeBetAmount(state, betAmounts, selectedBetIndex);
  if (state.selectedBetAmount === selectedBetAmount) {
    return { state, selectedBetAmount };
  }
  return {
    state: {
      ...state,
      selectedBetAmount
    },
    selectedBetAmount
  };
}

export function selectPrizeBetAmount(
  state: PrizeMachineState,
  betAmounts: readonly PrizeMachineBetAmount[],
  betAmount: PrizeMachineBetAmount
): PrizeMachineBetSyncResult & { selectedBetIndex?: number } {
  const selectedBetIndex = betAmounts.indexOf(betAmount);
  return {
    ...syncPrizeBetAmount(setPrizeMachineBet(state, betAmount), betAmounts, selectedBetIndex >= 0 ? selectedBetIndex : undefined),
    selectedBetIndex: selectedBetIndex >= 0 ? selectedBetIndex : undefined
  };
}

export function currentPrizeMachineConfig(
  state: PrizeMachineState,
  betAmounts: readonly PrizeMachineBetAmount[],
  selectedBetIndex?: number
): PrizeMachineConfig {
  return prizeMachineConfigForBet(currentPrizeBetAmount(state, betAmounts, selectedBetIndex));
}

export type PrizeWheelPlannerAdapterInput = {
  prizeMachine: PrizeMachineState;
  fish: readonly Fish[];
  fishInventory: ReadonlyMap<string, number>;
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

export function createPrizeWheelPlannerForAquarium(input: PrizeWheelPlannerAdapterInput): PrizeWheelPlanner {
  return new PrizeWheelPlanner({
    selectedBetAmount: input.prizeMachine.selectedBetAmount,
    recentPrizeKeys: input.prizeMachine.recentPrizeKeys,
    rareCoinWealthValue: coinWealthValue.rare,
    superRareCoinWealthValue: coinWealthValue.superRare,
    ownedFishTypeIds: () => ownedPrizeFishTypeIds(input.fish, input.fishInventory),
    textureExists: input.textureExists,
    isDroppableFood: input.isDroppableFood,
    isCalorieTrackedFood: input.isCalorieTrackedFood,
    foodTextureKey: input.foodTextureKey,
    foodSellValue: input.foodSellValue,
    decorationSellValue: input.decorationSellValue,
    decorationVariantPrice: input.decorationVariantPrice,
    priceWealth: input.priceWealth,
    coinSellValue: input.coinSellValue,
    storedFishSellValue: input.storedFishSellValue,
    sanitizeDecorationSize: input.sanitizeDecorationSize
  });
}

export type PrizeMachineRewardAwarders = {
  rare: (amount: number) => void;
  superRare: (amount: number) => void;
  rareFish: (fishType: FishType) => void;
  common: (amount: number) => void;
  food: (foodType: FoodType, quantity: number) => void;
  decoration: (decorationType: DecorationType, size: DecorationSize) => void;
};

export function awardPreparedPrizeMachineReward(
  reward: PreparedPrizeMachineReward,
  awarders: PrizeMachineRewardAwarders
): void {
  if (reward.kind === "rare") {
    awarders.rare(reward.amount);
    return;
  }
  if (reward.kind === "superRare") {
    awarders.superRare(reward.amount);
    return;
  }
  if (reward.kind === "rareFish") {
    awarders.rareFish(reward.fishType);
    return;
  }
  if (reward.kind === "premiumCommon") {
    awarders.common(reward.amount);
    return;
  }
  if (reward.kind === "food") {
    awarders.food(reward.foodType, reward.quantity);
    return;
  }
  if (reward.kind === "decoration") {
    awarders.decoration(reward.decorationType, reward.size);
    return;
  }
  awarders.common(reward.amount);
}

export function setPrizeMachineResultState(
  state: PrizeMachineState,
  kind: PrizeSpinPrize,
  title: string,
  detail: string,
  at = Date.now()
): PrizeMachineState {
  return {
    ...state,
    lastResult: { kind, title, detail, at }
  };
}

export function foodPrizeInventoryAmount(foodType: FoodType, quantity: number, isCalorieTrackedFood: (foodTypeId: FoodTypeId) => boolean): number {
  return (isCalorieTrackedFood(foodType.id) ? foodType.calories : 1) * Math.max(1, quantity);
}

export function commonPrizeResult(amount: number): { title: string; detail: string } {
  return {
    title: `Common Prize C${formatNumber(amount)}`,
    detail: `+C${formatNumber(amount)} from the wheel.`
  };
}

export function nextPrizeFishForRarity(
  rarity: Rarity,
  fish: readonly Fish[],
  fishInventory: ReadonlyMap<string, number>
): FishType {
  const ownedFishIds = ownedPrizeFishTypeIds(fish, fishInventory);
  const rarityPool = fishTypes.filter((fishType) => fishType.rarity === rarity);
  const unowned = rarityPool.filter((fishType) => !ownedFishIds.has(fishType.id));
  const pool = unowned.length > 0 ? unowned : rarityPool;
  return Phaser.Utils.Array.GetRandom(pool.length > 0 ? pool : fishTypes);
}

function ownedPrizeFishTypeIds(fish: readonly Fish[], fishInventory: ReadonlyMap<string, number>): Set<string> {
  return new Set([
    ...fish.map((ownedFish) => ownedFish.type.id),
    ...[...fishInventory.entries()].filter(([, count]) => count > 0).map(([fishTypeId]) => fishTypeId)
  ]);
}
