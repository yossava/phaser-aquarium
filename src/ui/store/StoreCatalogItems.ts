import { fishTypes, foodTypes, helperCreatureTypes } from "../../data/content";
import { hiddenFoodTypeIds, supplyFoodTypeIds } from "../../game/food-system";
import type { CoinType, Price, Rarity, StoreTab } from "../../types/mechanics";
import type { StoreCatalogItem, StoreOverlayState, StoreTankCard, StoreTankCosmeticCard, StoreTankDecorationCard, StoreTankUtilityCard } from "./StoreTypes";
import type { TankStoreCategory } from "./StoreNavigation";

export function currentStoreItems(
  state: StoreOverlayState,
  activeTab: StoreTab,
  tankCategory: TankStoreCategory,
  coinFilter: CoinType
): StoreCatalogItem[] {
  if (activeTab === "fish") {
    return fishTypes.filter((fish) => storeItemTier(fish.rarity, fish.price) === coinFilter);
  }
  if (activeTab === "food") {
    return foodTypes
      .filter((food) => !hiddenFoodTypeIds.has(food.id) && !supplyFoodTypeIds.has(food.id))
      .sort((first, second) => first.calories - second.calories);
  }
  if (activeTab === "supply") {
    return foodTypes.filter((food) => !hiddenFoodTypeIds.has(food.id) && supplyFoodTypeIds.has(food.id) && storeItemTier(food.rarity, food.price) === coinFilter);
  }
  if (activeTab === "creature") {
    return helperCreatureTypes.filter((creature) => storeItemTier(creature.rarity, creature.price) === coinFilter);
  }

  const tankItemsByCategory: Record<TankStoreCategory, Array<StoreTankCard | StoreTankCosmeticCard | StoreTankDecorationCard | StoreTankUtilityCard>> = {
    tank: state.tankCards,
    background: state.tankCosmeticCards.filter((item) => item.category === "background"),
    seabed: state.tankCosmeticCards.filter((item) => item.category === "seabed"),
    tools: state.tankUtilityCards,
    decorations: state.tankDecorationCards
  };
  if (tankCategory === "tank") {
    return state.tankCards.filter((tank) => !tank.owned);
  }
  if (tankCategory === "background" || tankCategory === "seabed") {
    return tankItemsByCategory[tankCategory].filter((item) => !item.owned && storeItemTier("common", item.price) === coinFilter);
  }
  return tankItemsByCategory[tankCategory].filter((item) => item.owned || storeItemTier("common", item.price) === coinFilter);
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
