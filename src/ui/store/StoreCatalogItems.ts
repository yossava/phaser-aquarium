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
    return [...fishTypes].sort((first, second) => tierOrder(storeItemTier(first.rarity, first.price)) - tierOrder(storeItemTier(second.rarity, second.price)));
  }
  if (activeTab === "food") {
    return foodTypes
      .filter((food) => !hiddenFoodTypeIds.has(food.id) && !supplyFoodTypeIds.has(food.id))
      .sort((first, second) => first.calories - second.calories);
  }
  if (activeTab === "supply") {
    return foodTypes
      .filter((food) => !hiddenFoodTypeIds.has(food.id) && supplyFoodTypeIds.has(food.id))
      .sort((first, second) => tierOrder(storeItemTier(first.rarity, first.price)) - tierOrder(storeItemTier(second.rarity, second.price)));
  }
  if (activeTab === "creature") {
    return [...helperCreatureTypes].sort((first, second) => tierOrder(storeItemTier(first.rarity, first.price)) - tierOrder(storeItemTier(second.rarity, second.price)));
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
      .sort((first, second) => tierOrder(storeItemTier("common", first.price)) - tierOrder(storeItemTier("common", second.price)));
  }
  return tankItemsByCategory[tankCategory];
}

export function storeItemTier(rarity: Rarity, price: Price): CoinType {
  if (price.superRareAmount && price.superRareAmount > 0) {
    return "superRare";
  }
  if (price.rareAmount && price.rareAmount > 0) {
    return "rare";
  }
  return rarity === "superRare" ? "superRare" : rarity === "rare" ? "rare" : "common";
}

function tierOrder(tier: CoinType): number {
  return tier === "common" ? 0 : tier === "rare" ? 1 : 2;
}
