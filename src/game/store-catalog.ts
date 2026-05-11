import { decorationTypes, fishTypes, foodTypes, helperCreatureTypes } from "../data/content";
import type { StoreOverlayState, StoreTankCosmeticCard, StoreTankDecorationCard, StoreTankUtilityCard } from "../ui/StoreOverlay";
import type { DecorationType, FoodType, Price, Wallet } from "../types/mechanics";

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
  fishCount: number;
  fishCapacity: number;
  maxOwnedTanks: number;
  maxPurchasableTankLevel: number;
  tankStarterWallets: Record<number, Wallet>;
  getFishOwned: (fishTypeId: string) => number;
  getFoodOwned: (foodType: FoodType) => number;
  getHelperOwned: (helperTypeId: string) => number;
  getTankName: (level: number) => string;
  tankDisplayLevel: (level?: number) => number;
  hasTankLevel: (level: number) => boolean;
  fishInTankCount: (level: number) => number;
  helpersInTankCount: (level: number) => number;
  maxFishCapacityForLevel: (level?: number) => number;
  calculateTankNetWorth: (level?: number) => number;
  tankPriceForLevel: (level: number) => Price;
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

const emptyWallet = (): Wallet => ({ common: 0, rare: 0, superRare: 0 });

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
    fishCount: input.fishCount,
    fishCapacity: input.fishCapacity,
    fishOwned: Object.fromEntries(fishTypes.map((fishType) => [fishType.id, input.getFishOwned(fishType.id)])),
    foodOwned: Object.fromEntries(foodTypes.map((foodType) => [foodType.id, input.getFoodOwned(foodType)])),
    helperOwned: Object.fromEntries(helperCreatureTypes.map((creatureType) => [creatureType.id, input.getHelperOwned(creatureType.id)])),
    tankCards: Array.from(
      { length: input.developerGodMode ? input.maxOwnedTanks : input.maxPurchasableTankLevel },
      (_unused, index) => buildTankCard(input, index + 1)
    ),
    tankCosmeticCards: buildStoreTankCosmeticCards(input),
    tankDecorationCards: buildStoreTankDecorationCards(input),
    tankUtilityCards: buildStoreTankUtilityCards(input.utilityDefinitions)
  };
}

function buildTankCard(input: BuildStoreOverlayStateInput, level: number): StoreOverlayState["tankCards"][number] {
  return {
    level,
    name: input.getTankName(level),
    displayLevel: input.tankDisplayLevel(level),
    owned: input.hasTankLevel(level),
    active: level === input.activeTankSlot,
    fishCount: input.fishInTankCount(level),
    fishCapacity: input.maxFishCapacityForLevel(level),
    helperCount: input.helpersInTankCount(level),
    worth: input.calculateTankNetWorth(level),
    price: input.tankPriceForLevel(level),
    includedWallet: input.tankStarterWallets[level] ?? emptyWallet()
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
