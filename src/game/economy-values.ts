import { priceComponents } from "./economy";
import { fishPowerResaleValue } from "./economy-model";
import type { Fish } from "../objects/Fish";
import type { CoinType, DecorationType, FishType, FoodType, HelperCreatureType, Price, Wallet } from "../types/mechanics";
import type { DecorationSize } from "./tank-catalog";

export const coinWealthValue: Record<CoinType, number> = {
  common: 1,
  rare: 1000,
  superRare: 10000
};

export const inventorySellRate = 0.7;

export function walletWealth(wallet: Wallet): number {
  return wallet.common * coinWealthValue.common +
    wallet.rare * coinWealthValue.rare +
    wallet.superRare * coinWealthValue.superRare;
}

export function priceWealth(price: Price): number {
  return priceComponents(price).reduce((total, [coinType, amount]) => total + amount * coinWealthValue[coinType], 0);
}

export function quantityPrice(price: Price, quantity: number): Price {
  const multiplier = Math.max(1, Math.min(99, Math.floor(quantity)));
  return {
    coinType: price.coinType,
    amount: price.amount * multiplier,
    rareAmount: (price.rareAmount ?? 0) * multiplier || undefined,
    superRareAmount: (price.superRareAmount ?? 0) * multiplier || undefined
  };
}

export function activeFishSellValue(fish: Fish): number {
  return Math.max(1, Math.floor(fishPowerResaleValue(fish.ageSeconds) * inventorySellRate * fish.resaleAdjustmentMultiplier()));
}

export function storedFishSellValue(_fishType: FishType, ageSeconds = 0): number {
  return Math.max(1, Math.floor(fishPowerResaleValue(ageSeconds) * inventorySellRate));
}

export function foodSellQuantityMultiplier(input: {
  foodType: FoodType;
  storedAmount: number;
  isCalorieTrackedFood: (foodTypeId: FoodType["id"]) => boolean;
}): number {
  if (!input.isCalorieTrackedFood(input.foodType.id)) {
    return Math.max(0, input.storedAmount);
  }

  return Math.max(0, input.storedAmount) / Math.max(1, input.foodType.calories);
}

export function foodSellValue(input: {
  foodType: FoodType;
  storedAmount: number;
  isCalorieTrackedFood: (foodTypeId: FoodType["id"]) => boolean;
}): number {
  return Math.max(
    1,
    Math.floor(priceWealth(input.foodType.price) * inventorySellRate * foodSellQuantityMultiplier(input))
  );
}

export function decorationSellValue(input: {
  decorationType: DecorationType;
  size: DecorationSize;
  count: number;
  decorationVariantPrice: (decorationType: DecorationType, size: DecorationSize) => Price;
}): number {
  return Math.max(
    1,
    Math.floor(priceWealth(input.decorationVariantPrice(input.decorationType, input.size)) * inventorySellRate * Math.max(0, input.count))
  );
}

export function tankUtilitySellValue(price: Price): number {
  return Math.max(1, Math.floor(priceWealth(price) * inventorySellRate));
}

export function coinSellValue(coinType: "rare" | "superRare", count = 1): number {
  return Math.max(1, Math.floor(coinWealthValue[coinType] * inventorySellRate * Math.max(0, count)));
}

export function helperSellPrice(creatureType: HelperCreatureType): HelperCreatureType["price"] {
  return {
    coinType: "common",
    amount: Math.max(1, Math.floor(priceWealth(creatureType.price) * 0.65))
  };
}
