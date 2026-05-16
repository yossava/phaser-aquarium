import { decorationTypes, fishTypes, foodTypes, helperCreatureTypes } from "../data/content";
import type { StoreOverlayState, StoreTankCosmeticCard, StoreTankDecorationCard, StoreTankUtilityCard } from "../ui/store/StoreTypes";
import type { DecorationType, FishType, FoodType, Price, Wallet } from "../types/mechanics";

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
