import type { FishType, FoodType, HelperCreatureType, Price, Rarity, Wallet } from "../../types/mechanics";

export type StoreDecorationSize = "xs" | "s" | "m" | "l" | "xl";

export type StoreTankCosmeticCard = {
  kind: "tankCosmetic";
  id: string;
  category: "background" | "seabed";
  name: string;
  owned: boolean;
  active: boolean;
  price: Price;
  previewUrl?: string;
  tint: string;
  blueTintIntensity: number;
};

export type StoreTankDecorationCard = {
  kind: "tankDecoration";
  id: string;
  name: string;
  rarity: Rarity;
  texture: string;
  happinessBonus: number;
  price: Price;
  owned: boolean;
  variants: Array<{
    size: StoreDecorationSize;
    label: string;
    owned: number;
    price: Price;
  }>;
};

export type StoreTankUtilityCard = {
  kind: "tankUtility";
  id: string;
  name: string;
  description: string;
  durationLabel?: string;
  icon: string;
  owned: boolean;
  price: Price;
};

export type StoreOverlayState = {
  wallet: Wallet;
  wealth: number;
  activeTankName: string;
  activeTankLevel: number;
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
  fishCount: number;
  fishCapacity: number;
  fishOwned: Record<string, number>;
  fishRequiredLevels: Record<string, number>;
  foodOwned: Record<string, number>;
  helperOwned: Record<string, number>;
  tankCosmeticCards: StoreTankCosmeticCard[];
  tankDecorationCards: StoreTankDecorationCard[];
  tankUtilityCards: StoreTankUtilityCard[];
};

export type StoreCatalogItem =
  | FishType
  | FoodType
  | HelperCreatureType
  | StoreTankCosmeticCard
  | StoreTankDecorationCard
  | StoreTankUtilityCard;
