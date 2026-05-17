import {
  autoFoodBuyerInventoryKey,
  coinMagnetInventoryKey,
  foodDispenserInventoryKey,
  type TankUtilityId
} from "./dispenser-system";
import { fishCommonPrice } from "./economy-model";
import {
  coinSellValue,
  decorationSellValue,
  foodSellValue,
  quantityPrice,
  storedFishSellValue,
  tankUtilitySellValue
} from "./economy-values";
import type { DecorationType, FishType, FoodType, FoodTypeId, Price } from "../types/mechanics";
import type { DecorationSize } from "./tank-catalog";

export type FishPurchasePlan = {
  buyQuantity: number;
  totalPrice: Price;
  tankDeliveryQuantity: number;
  inventoryQuantity: number;
};

export type FoodPurchasePlan = {
  buyQuantity: number;
  totalPrice: Price;
  addedFoodInventory: number;
};

export type StoredFishSalePlan = {
  sellQuantity: number;
  sellValue: number;
  nextInventoryCount: number;
};

export type FoodInventorySalePlan = {
  sellQuantity: number;
  sellAmount: number;
  sellValue: number;
  nextInventoryAmount: number;
};

export type TankUtilityPurchasePlan = {
  inventoryKey: string;
  inventoryValue: number;
  dailyQuestAction: string;
  toast: string;
  activatesCoinMagnet: boolean;
  activatesAutoFoodBuyer: boolean;
};

export function clampStoreQuantity(quantity: number, maxQuantity: number): number {
  return clampInt(quantity, 1, Math.max(1, maxQuantity));
}

export function planFishPurchase(input: {
  fishType: FishType;
  requestedQuantity: number;
  maxFishBuyQuantity: number;
  remainingHourlyBuys: number;
  fishCapacity: number;
  activeFishCount: number;
  pendingTankDeliveries: number;
}): FishPurchasePlan {
  const buyQuantity = clampStoreQuantity(
    input.requestedQuantity,
    Math.min(input.maxFishBuyQuantity, input.remainingHourlyBuys)
  );
  const tankSlotsAvailable = Math.max(0, input.fishCapacity - input.activeFishCount - input.pendingTankDeliveries);
  const tankDeliveryQuantity = Math.min(buyQuantity, tankSlotsAvailable);
  return {
    buyQuantity,
    totalPrice: quantityPrice(input.fishType.price, buyQuantity),
    tankDeliveryQuantity,
    inventoryQuantity: buyQuantity - tankDeliveryQuantity
  };
}

export function planFoodPurchase(input: {
  foodType: FoodType;
  requestedQuantity: number;
  maxFoodBuyQuantity: number;
  isCalorieTrackedFood: (foodTypeId: FoodTypeId) => boolean;
}): FoodPurchasePlan {
  const buyQuantity = input.foodType.id === "ageBoost"
    ? 1
    : clampStoreQuantity(input.requestedQuantity, input.maxFoodBuyQuantity);
  return {
    buyQuantity,
    totalPrice: quantityPrice(input.foodType.price, buyQuantity),
    addedFoodInventory: input.isCalorieTrackedFood(input.foodType.id) ? input.foodType.calories * buyQuantity : buyQuantity
  };
}

export function growthTonicPriceForFishType(fishType: FishType): Price {
  return {
    coinType: "common",
    amount: clampInt(Math.round(fishCommonPrice(fishType) * 0.15), 100, 15000)
  };
}

export function productionBoostPriceForFishType(fishType: FishType): Price {
  return {
    coinType: "common",
    amount: clampInt(Math.round(fishCommonPrice(fishType) * 0.08), 25, 5000)
  };
}

export function nextStoredFishInventoryCount(current: number, quantity = 1): number {
  return Math.max(0, current - Math.max(1, Math.floor(quantity)));
}

export function planStoredFishSale(input: {
  fishType: FishType;
  current: number;
  requestedQuantity: number;
}): StoredFishSalePlan {
  const sellQuantity = clampInt(Math.floor(input.requestedQuantity), 1, input.current);
  return {
    sellQuantity,
    sellValue: storedFishSellValue(input.fishType) * sellQuantity,
    nextInventoryCount: nextStoredFishInventoryCount(input.current, sellQuantity)
  };
}

export function planFoodInventorySale(input: {
  foodType: FoodType;
  current: number;
  requestedQuantity: number;
  maxDisplayQuantity: number;
  isCalorieTrackedFood: (foodTypeId: FoodTypeId) => boolean;
}): FoodInventorySalePlan {
  const sellQuantity = clampInt(
    Math.floor(input.requestedQuantity),
    1,
    Math.max(1, input.maxDisplayQuantity)
  );
  const sellAmount = input.isCalorieTrackedFood(input.foodType.id)
    ? Math.min(input.current, sellQuantity * Math.max(1, input.foodType.calories))
    : Math.min(input.current, sellQuantity);
  return {
    sellQuantity,
    sellAmount,
    sellValue: foodSellValue({
      foodType: input.foodType,
      storedAmount: sellAmount,
      isCalorieTrackedFood: input.isCalorieTrackedFood
    }),
    nextInventoryAmount: Math.max(0, input.current - sellAmount)
  };
}

export function clampSellQuantity(quantity: number | undefined, count: number): number {
  return clampInt(Math.floor(quantity ?? count), 1, count);
}

export function planCoinInventorySale(coinType: "rare" | "superRare", count: number, quantity?: number): {
  sellQuantity: number;
  sellValue: number;
  nextCount: number;
} {
  const sellQuantity = clampSellQuantity(quantity, count);
  return {
    sellQuantity,
    sellValue: coinSellValue(coinType, sellQuantity),
    nextCount: Math.max(0, count - sellQuantity)
  };
}

export function planTankUtilityPurchase(utilityId: TankUtilityId, now: number, durations: {
  coinMagnetDurationMs: number;
  autoFoodBuyerDurationMs: number;
}): TankUtilityPurchasePlan {
  if (utilityId === "food-dispenser") {
    return {
      inventoryKey: foodDispenserInventoryKey,
      inventoryValue: 1,
      dailyQuestAction: "buy-dispenser",
      toast: "Food Dispenser installed",
      activatesCoinMagnet: false,
      activatesAutoFoodBuyer: false
    };
  }

  if (utilityId === "coin-magnet") {
    return {
      inventoryKey: coinMagnetInventoryKey,
      inventoryValue: now + durations.coinMagnetDurationMs,
      dailyQuestAction: "buy-coin-magnet",
      toast: "Coin Magnet active 30m",
      activatesCoinMagnet: true,
      activatesAutoFoodBuyer: false
    };
  }

  return {
    inventoryKey: autoFoodBuyerInventoryKey,
    inventoryValue: now + durations.autoFoodBuyerDurationMs,
    dailyQuestAction: "buy-auto-food-buyer",
    toast: "Auto Buyer active 30m",
    activatesCoinMagnet: false,
    activatesAutoFoodBuyer: true
  };
}

export function tankUtilityAlreadyOwnedToast(input: {
  utilityId: TankUtilityId;
  hasFoodDispenser: boolean;
  hasCoinMagnet: boolean;
  hasAutoFoodBuyer: boolean;
}): string | undefined {
  if (input.utilityId === "food-dispenser" && input.hasFoodDispenser) {
    return "Already installed";
  }

  if (input.utilityId === "coin-magnet" && input.hasCoinMagnet) {
    return "Already owned";
  }

  if (input.utilityId === "auto-food-buyer" && input.hasAutoFoodBuyer) {
    return "Already owned";
  }

  return undefined;
}

export function decorationSaleValue(input: {
  decorationType: DecorationType;
  size: DecorationSize;
  count: number;
  decorationVariantPrice: (decorationType: DecorationType, size: DecorationSize) => Price;
}): number {
  return decorationSellValue(input);
}

export function utilitySaleValue(price: Price): number {
  return tankUtilitySellValue(price);
}

function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(value)));
}
