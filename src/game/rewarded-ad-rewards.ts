import { basicFood, fishTypes, foodAssetPath, foodTypes, helperCreatureTypes } from "../data/content";
import type { FishType, FoodType, HelperCreatureType, Price } from "../types/mechanics";
import { formatPrice } from "./economy";
import { priceWealth } from "./economy-values";
import { rewardedAdOptions, type RewardedAdOption } from "./quest-system";

export type RewardedAdRewardSet = {
  common: Price;
  food: FoodType;
  fish: FishType;
  helper: HelperCreatureType;
};

export type RewardedAdRewardInput = {
  commonReward: Price;
  mealCaloriesNeeded: number[];
  ownedFishTypeIds: Iterable<string>;
  ownedHelperCreatureTypeIds: Iterable<string>;
  tankLevel: number;
  isCalorieTrackedFood: (foodTypeId: FoodType["id"]) => boolean;
  isDroppableFood: (foodTypeId: FoodType["id"]) => boolean;
};

export function selectRewardedAdFoodReward(input: {
  mealCaloriesNeeded: number[];
  isCalorieTrackedFood: (foodTypeId: FoodType["id"]) => boolean;
  isDroppableFood: (foodTypeId: FoodType["id"]) => boolean;
}): FoodType {
  const candidates = foodTypes.filter((foodType) => input.isCalorieTrackedFood(foodType.id) && input.isDroppableFood(foodType.id));
  const targetCalories = [...input.mealCaloriesNeeded].sort((first, second) => second - first)[0] ?? basicFood.calories;
  const sorted = [...candidates].sort((first, second) => {
    const firstShortfall = first.calories >= targetCalories ? 0 : targetCalories - first.calories;
    const secondShortfall = second.calories >= targetCalories ? 0 : targetCalories - second.calories;
    return firstShortfall - secondShortfall || first.calories - second.calories;
  });
  return sorted[0] ?? basicFood;
}

export function selectRewardedAdFishReward(input: {
  ownedFishTypeIds: Iterable<string>;
  tankLevel: number;
}): FishType {
  const ownedFishIds = new Set(input.ownedFishTypeIds);
  const availableCommon = fishTypes
    .filter((fishType) => fishType.rarity === "common" && fishType.tankLevel <= input.tankLevel)
    .sort((first, second) => first.tankLevel - second.tankLevel || priceWealth(first.price) - priceWealth(second.price));
  return availableCommon.find((fishType) => !ownedFishIds.has(fishType.id)) ?? availableCommon[0] ?? fishTypes[0];
}

export function selectRewardedAdHelperReward(input: {
  ownedHelperCreatureTypeIds: Iterable<string>;
}): HelperCreatureType {
  const ownedHelperIds = new Set(input.ownedHelperCreatureTypeIds);
  const availableCommon = helperCreatureTypes
    .filter((creatureType) => creatureType.rarity === "common")
    .sort((first, second) => priceWealth(first.price) - priceWealth(second.price));
  return availableCommon.find((creatureType) => !ownedHelperIds.has(creatureType.id)) ?? availableCommon[0] ?? helperCreatureTypes[0];
}

export function buildRewardedAdRewardSet(input: RewardedAdRewardInput): RewardedAdRewardSet {
  return {
    common: input.commonReward,
    food: selectRewardedAdFoodReward(input),
    fish: selectRewardedAdFishReward(input),
    helper: selectRewardedAdHelperReward(input)
  };
}

export function rewardedAdOptionsForRewards(input: {
  rewards: RewardedAdRewardSet;
  commonCoinIcon: string;
}): RewardedAdOption[] {
  return rewardedAdOptions({
    common: {
      detail: formatPrice(input.rewards.common),
      icon: input.commonCoinIcon
    },
    food: {
      detail: input.rewards.food.name,
      icon: foodAssetPath(input.rewards.food.id)
    },
    fish: {
      detail: input.rewards.fish.name,
      icon: `/assets/fish/${input.rewards.fish.id}.png`
    },
    helper: {
      detail: input.rewards.helper.name,
      icon: `/assets/helpers/${input.rewards.helper.id}.png`
    }
  });
}
