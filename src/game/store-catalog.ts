import { decorationTypes, fishTypes, foodTypes, helperCreatureTypes } from "../data/content";
import type { StoreOverlayState, StoreTankCosmeticCard, StoreTankDecorationCard, StoreTankUtilityCard } from "../ui/store/StoreTypes";
import { hiddenFoodTypeIds, supplyFoodTypeIds } from "./food-system";
import type { CoinType, DecorationType, FishType, FoodType, HelperCreatureType, Price, Wallet } from "../types/mechanics";

export type StoreDecorationSize = StoreTankDecorationCard["variants"][number]["size"];

export type TankCosmeticAsset = {
  id: string;
  name: string;
  category: StoreTankCosmeticCard["category"];
  textureKey: string;
  price: Price;
  tint: number;
};

export type StoreUtilityDefinition = Omit<StoreTankUtilityCard, "kind">;

export type BuildStoreOverlayStateInput = {
  wallet: Wallet;
  wealth: number;
  activeTankName: string;
  activeTankLevel: number;
  activeTankSlot: number;
  developerGodMode: boolean;
  fishPurchasesInWindow: number;
  fishPurchaseHourlyLimit: number;
  fishPurchaseRestockLabel: string;
  ageBoostPurchaseAvailable: boolean;
  ageBoostRestockLabel: string;
  productionBoostPurchaseAvailable: boolean;
  productionBoostRestockLabel: string;
  timeCurrentPurchaseAvailable: boolean;
  timeCurrentRestockLabel: string;
  phaseOneShopLimitActive: boolean;
  fishCount: number;
  fishCapacity: number;
  getFishOwned: (fishTypeId: string) => number;
  getFoodOwned: (foodType: FoodType) => number;
  getHelperOwned: (helperTypeId: string) => number;
  tankCosmetics: Record<StoreTankCosmeticCard["category"], TankCosmeticAsset[]>;
  ownsTankCosmetic: (asset: TankCosmeticAsset) => boolean;
  selectedTankCosmeticId: (category: StoreTankCosmeticCard["category"]) => string;
  tankCosmeticImageUrl: (asset: TankCosmeticAsset) => string | undefined;
  colorToHex: (color: number) => string;
  tankCosmeticBlueTintIntensity: (category: StoreTankCosmeticCard["category"], id: string) => number;
  decorationSizeOrder: StoreDecorationSize[];
  decorationSizeLabel: (size: StoreDecorationSize) => string;
  getDecorationInventory: (decorationTypeId: string, size: StoreDecorationSize) => number;
  decorationVariantPrice: (decorationType: DecorationType, size: StoreDecorationSize) => Price;
  utilityDefinitions: StoreUtilityDefinition[];
};

export function fishShopRequiredLevel(fishType: Pick<FishType, "id">): number {
  const catalogIndex = fishTypes.findIndex((catalogFish) => catalogFish.id === fishType.id);
  return Math.max(1, Math.floor(Math.max(0, catalogIndex) / 8) + 1);
}

export type StoreTabKey = "fish" | "food" | "supply" | "decor" | "tank" | "creature";

export function matchesStoreCoinFilter(price: Price, rarity: FishType["rarity"] = "common", storeCoinFilter: CoinType): boolean {
  if (rarity === "superRare" || (price.superRareAmount && price.superRareAmount > 0)) {
    return storeCoinFilter === "superRare";
  }

  if (rarity === "rare" || (price.rareAmount && price.rareAmount > 0)) {
    return storeCoinFilter === "rare";
  }

  return storeCoinFilter === "common";
}

export function visibleFishCatalog(storeCoinFilter: CoinType): FishType[] {
  return fishTypes.filter((fishType) => matchesStoreCoinFilter(fishType.price, fishType.rarity, storeCoinFilter));
}

export function visibleFoodCatalog(): FoodType[] {
  return foodTypes.filter((foodType) => !hiddenFoodTypeIds.has(foodType.id) && !supplyFoodTypeIds.has(foodType.id));
}

export function isPhaseOneStoreFish(fishType: Pick<FishType, "id">): boolean {
  return fishTypes.slice(0, 2).some((candidate) => candidate.id === fishType.id);
}

export function isPhaseOneStoreFood(foodType: Pick<FoodType, "id">): boolean {
  return [...visibleFoodCatalog()]
    .sort((first, second) => first.calories - second.calories)
    .slice(0, 2)
    .some((candidate) => candidate.id === foodType.id);
}

export function visibleSupplyCatalog(storeCoinFilter: CoinType): FoodType[] {
  return foodTypes.filter(
    (foodType) => !hiddenFoodTypeIds.has(foodType.id) && supplyFoodTypeIds.has(foodType.id) && matchesStoreCoinFilter(foodType.price, foodType.rarity, storeCoinFilter)
  );
}

export function visibleTankCatalogLevels(maxOwnedTanks: number): number[] {
  return Array.from({ length: Math.max(0, Math.floor(maxOwnedTanks)) }, (_unused, index) => index + 1);
}

export function visibleDecorationCatalog(storeCoinFilter: CoinType): DecorationType[] {
  return decorationTypes.filter((decorationType) => matchesStoreCoinFilter(decorationType.price, decorationType.rarity, storeCoinFilter));
}

export function visibleHelperCreatureCatalog(storeCoinFilter: CoinType): HelperCreatureType[] {
  return helperCreatureTypes.filter((creatureType) => matchesStoreCoinFilter(creatureType.price, creatureType.rarity, storeCoinFilter));
}

export function visibleStoreCatalogCount(input: {
  activeTab: StoreTabKey;
  storeCoinFilter: CoinType;
  maxOwnedTanks: number;
}): number {
  if (input.activeTab === "fish") {
    return visibleFishCatalog(input.storeCoinFilter).length;
  }

  if (input.activeTab === "food") {
    return visibleFoodCatalog().length;
  }

  if (input.activeTab === "supply") {
    return visibleSupplyCatalog(input.storeCoinFilter).length;
  }

  if (input.activeTab === "decor") {
    return visibleDecorationCatalog(input.storeCoinFilter).length;
  }

  if (input.activeTab === "tank") {
    return visibleTankCatalogLevels(input.maxOwnedTanks).length;
  }

  return visibleHelperCreatureCatalog(input.storeCoinFilter).length;
}

export function buildStoreOverlayState(input: BuildStoreOverlayStateInput): StoreOverlayState {
  return {
    wallet: { ...input.wallet },
    wealth: input.wealth,
    activeTankName: input.activeTankName,
    activeTankLevel: input.activeTankLevel,
    developerGodMode: input.developerGodMode,
    fishPurchasesInWindow: input.fishPurchasesInWindow,
    fishPurchaseHourlyLimit: input.fishPurchaseHourlyLimit,
    fishPurchaseRestockLabel: input.fishPurchaseRestockLabel,
    ageBoostPurchaseAvailable: input.ageBoostPurchaseAvailable,
    ageBoostRestockLabel: input.ageBoostRestockLabel,
    productionBoostPurchaseAvailable: input.productionBoostPurchaseAvailable,
    productionBoostRestockLabel: input.productionBoostRestockLabel,
    timeCurrentPurchaseAvailable: input.timeCurrentPurchaseAvailable,
    timeCurrentRestockLabel: input.timeCurrentRestockLabel,
    phaseOneShopLimitActive: input.phaseOneShopLimitActive,
    fishCount: input.fishCount,
    fishCapacity: input.fishCapacity,
    fishOwned: Object.fromEntries(fishTypes.map((fishType) => [fishType.id, input.getFishOwned(fishType.id)])),
    fishRequiredLevels: Object.fromEntries(fishTypes.map((fishType) => [fishType.id, fishShopRequiredLevel(fishType)])),
    foodOwned: Object.fromEntries(foodTypes.map((foodType) => [foodType.id, input.getFoodOwned(foodType)])),
    helperOwned: Object.fromEntries(helperCreatureTypes.map((creatureType) => [creatureType.id, input.getHelperOwned(creatureType.id)])),
    tankCosmeticCards: buildStoreTankCosmeticCards(input),
    tankDecorationCards: buildStoreTankDecorationCards(input),
    tankUtilityCards: buildStoreTankUtilityCards(input.utilityDefinitions)
  };
}

function buildStoreTankCosmeticCards(input: BuildStoreOverlayStateInput): StoreTankCosmeticCard[] {
  const categories: Array<StoreTankCosmeticCard["category"]> = ["background", "seabed"];
  return categories.flatMap((category) =>
    input.tankCosmetics[category]
      .filter((asset) => asset.price.amount > 0 || input.ownsTankCosmetic(asset))
      .map((asset) => ({
        kind: "tankCosmetic" as const,
        id: asset.id,
        category: asset.category,
        name: asset.name,
        owned: input.ownsTankCosmetic(asset),
        active: input.selectedTankCosmeticId(asset.category) === asset.id,
        price: asset.price,
        previewUrl: input.tankCosmeticImageUrl(asset),
        tint: input.colorToHex(asset.tint),
        blueTintIntensity: input.tankCosmeticBlueTintIntensity(asset.category, asset.id)
      }))
  );
}

function buildStoreTankDecorationCards(input: BuildStoreOverlayStateInput): StoreTankDecorationCard[] {
  return decorationTypes.map((decorationType) => {
    const variants = input.decorationSizeOrder.map((size) => ({
      size,
      label: input.decorationSizeLabel(size),
      owned: input.getDecorationInventory(decorationType.id, size),
      price: input.decorationVariantPrice(decorationType, size)
    }));
    return {
      kind: "tankDecoration" as const,
      id: decorationType.id,
      name: decorationType.name,
      rarity: decorationType.rarity,
      texture: decorationType.texture,
      happinessBonus: decorationType.happinessBonus,
      price: decorationType.price,
      owned: variants.some((variant) => variant.owned > 0),
      variants
    };
  });
}

function buildStoreTankUtilityCards(definitions: StoreUtilityDefinition[]): StoreTankUtilityCard[] {
  return definitions.map((definition) => ({
    kind: "tankUtility" as const,
    ...definition
  }));
}
