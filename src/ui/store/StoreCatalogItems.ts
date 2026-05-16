import { fishTypes, foodTypes, helperCreatureTypes } from "../../data/content";
import { hiddenFoodTypeIds, supplyFoodTypeIds } from "../../game/food-system";
import type { CoinType, Price, Rarity, StoreTab } from "../../types/mechanics";
import type { StoreCatalogItem, StoreOverlayState, StoreTankCosmeticCard, StoreTankDecorationCard, StoreTankUtilityCard } from "./StoreTypes";
import type { TankStoreCategory } from "./StoreNavigation";

export function currentStoreItems(
  state: StoreOverlayState,
  activeTab: StoreTab,
  tankCategory: TankStoreCategory
): StoreCatalogItem[] {
  if (activeTab === "fish") {
    return fishTypes;
  }
  if (activeTab === "food") {
    return foodTypes
      .filter((food) => !hiddenFoodTypeIds.has(food.id) && !supplyFoodTypeIds.has(food.id))
      .sort((first, second) => first.calories - second.calories);
  }
  if (activeTab === "supply") {
    return foodTypes
      .filter((food) => !hiddenFoodTypeIds.has(food.id) && supplyFoodTypeIds.has(food.id))
      .sort(compareStoreItemPrice);
  }
  if (activeTab === "creature") {
    return [...helperCreatureTypes].sort(compareStoreItemPrice);
  }

  const tankItemsByCategory: Record<TankStoreCategory, Array<StoreTankCosmeticCard | StoreTankDecorationCard | StoreTankUtilityCard>> = {
    background: state.tankCosmeticCards.filter((item) => item.category === "background"),
    seabed: state.tankCosmeticCards.filter((item) => item.category === "seabed"),
    tools: state.tankUtilityCards,
    decorations: state.tankDecorationCards
  };
  if (tankCategory === "background" || tankCategory === "seabed") {
    return tankItemsByCategory[tankCategory]
      .filter((item) => !item.owned)
      .sort(compareStoreCardPrice);
  }
  return tankItemsByCategory[tankCategory];
}

export function storeItemTier(rarity: Rarity, price: Price): CoinType {
  if (rarity === "superRare" || (price.superRareAmount && price.superRareAmount > 0)) {
    return "superRare";
  }
  if (rarity === "rare" || (price.rareAmount && price.rareAmount > 0)) {
    return "rare";
  }
  return "common";
}

function tierOrder(tier: CoinType): number {
  return tier === "common" ? 0 : tier === "rare" ? 1 : 2;
}

function priceWealth(price: Price): number {
  const baseAmount = price.coinType === "common" ? price.amount : price.coinType === "rare" ? price.amount * 1000 : price.amount * 10000;
  return baseAmount + (price.rareAmount ?? 0) * 1000 + (price.superRareAmount ?? 0) * 10000;
}

function compareStoreItemPrice(first: { rarity: Rarity; price: Price }, second: { rarity: Rarity; price: Price }): number {
  return tierOrder(storeItemTier(first.rarity, first.price)) - tierOrder(storeItemTier(second.rarity, second.price)) || priceWealth(first.price) - priceWealth(second.price);
}

function compareStoreCardPrice(first: StoreTankCosmeticCard | StoreTankDecorationCard | StoreTankUtilityCard, second: StoreTankCosmeticCard | StoreTankDecorationCard | StoreTankUtilityCard): number {
  return tierOrder(storeItemTier("common", first.price)) - tierOrder(storeItemTier("common", second.price)) || priceWealth(first.price) - priceWealth(second.price);
}
