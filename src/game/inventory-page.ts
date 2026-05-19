import { decorationTypes, fishTypes, foodAssetPath, foodTypes } from "../data/content";
import { hiddenFoodTypeIds } from "./food-system";
import { foodCssFilterFor } from "./visuals";
import { decorationSizeOrder, decorationSizes, type DecorationSize } from "./tank-catalog";
import type { Fish } from "../objects/Fish";
import type { DecorationType, FishType, FoodType, FoodTypeId } from "../types/mechanics";

export type DecorationInventoryEntry = {
  decorationType: DecorationType;
  size: DecorationSize;
};

export type StoredFishInventoryRowData = {
  fishType: FishType;
  count: number;
  sellValue: number;
  ageCopy: string;
  rarityLabel: string;
};

export type FoodInventoryRowData = {
  foodType: FoodType;
  countLabel: string;
  sellValue: number;
  imageUrl: string;
  imageFilter: string;
};

export type CoinInventoryRowData = {
  coinType: "rare" | "superRare";
  count: number;
  value: number;
  icon: string;
};

export type DecorationInventoryRowData = {
  decorationType: DecorationType;
  size: DecorationSize;
  sizeLabel: string;
  storedCount: number;
  placedCount: number;
  sellValue: number;
};

export function storedFishTypes(getFishInventory: (fishTypeId: string) => number): FishType[] {
  return fishTypes.filter((fishType) => getFishInventory(fishType.id) > 0);
}

export function ownedFoodTypes(getFoodInventory: (foodTypeId: FoodTypeId) => number): FoodType[] {
  return foodTypes.filter((foodType) => !hiddenFoodTypeIds.has(foodType.id) && getFoodInventory(foodType.id) > 0);
}

export function ownedDecorationEntries(
  getOwnedDecorationCount: (decorationTypeId: string, size: DecorationSize) => number
): DecorationInventoryEntry[] {
  return decorationTypes.flatMap((decorationType) =>
    decorationSizeOrder
      .filter((size) => getOwnedDecorationCount(decorationType.id, size) > 0)
      .map((size) => ({ decorationType, size }))
  );
}

export function storedFishInventoryRowData(input: {
  fishType: FishType;
  count: number;
  sellValue: number;
  storedAges: number[];
  rarityLabel: string;
  ageLabel: (seconds: number) => string;
}): StoredFishInventoryRowData {
  const ageCopy = input.storedAges.length > 0 ? ` | Power ${input.ageLabel(input.storedAges[0])}` : "";
  return {
    fishType: input.fishType,
    count: input.count,
    sellValue: input.sellValue,
    ageCopy,
    rarityLabel: input.rarityLabel
  };
}

export function foodInventoryRowData(input: {
  foodType: FoodType;
  countLabel: string;
  sellValue: number;
}): FoodInventoryRowData {
  return {
    foodType: input.foodType,
    countLabel: input.countLabel,
    sellValue: input.sellValue,
    imageUrl: foodAssetPath(input.foodType.id),
    imageFilter: foodCssFilterFor(input.foodType.id)
  };
}

export function coinInventoryRowData(input: {
  coinType: "rare" | "superRare";
  count: number;
  value: number;
}): CoinInventoryRowData {
  return {
    ...input,
    icon: input.coinType === "rare" ? "/assets/ui/shop/coin_icon_rare.png" : "/assets/ui/shop/coin_icon_super_rare.png"
  };
}

export function decorationInventoryRowData(input: {
  decorationType: DecorationType;
  size: DecorationSize;
  storedCount: number;
  placedCount: number;
  sellValue: number;
}): DecorationInventoryRowData {
  return {
    ...input,
    sizeLabel: decorationSizes[input.size].label
  };
}

export function fishHappinessPercent(fish: Fish): number {
  const fullness = Math.max(0, Math.min(1, fish.fullnessRatio())) * 100;
  return Math.round(Math.max(0, Math.min(100, fish.health * 0.68 + fullness * 0.32)));
}

export function compactDurationLabel(seconds: number, formatNumber: (value: number) => string): string {
  const rounded = Math.max(0, Math.floor(seconds));
  if (rounded < 60) {
    return `${formatNumber(rounded)}s`;
  }

  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${formatNumber(minutes)}m ${formatNumber(remainingSeconds)}s` : `${formatNumber(minutes)}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${formatNumber(hours)}h ${formatNumber(remainingMinutes)}m` : `${formatNumber(hours)}h`;
}
