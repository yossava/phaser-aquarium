import type { FishType, FoodType, HelperCreatureType, Price, Rarity, Wallet } from "../../types/mechanics";

export type StoreDecorationSize = "xs" | "s" | "m" | "l" | "xl";

export type StoreTankCard = {
  level: number;
  name: string;
  displayLevel: number;
  owned: boolean;
  active: boolean;
  fishCount: number;
  fishCapacity: number;
  helperCount: number;
  worth: number;
  price: Price;
  includedWallet: Wallet;
};

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
  fishCount: number;
  fishCapacity: number;
  fishOwned: Record<string, number>;
  foodOwned: Record<string, number>;
  helperOwned: Record<string, number>;
  tankCards: StoreTankCard[];
  tankCosmeticCards: StoreTankCosmeticCard[];
  tankDecorationCards: StoreTankDecorationCard[];
  tankUtilityCards: StoreTankUtilityCard[];
};

export type StoreCatalogItem =
  | FishType
  | FoodType
  | HelperCreatureType
  | StoreTankCard
  | StoreTankCosmeticCard
  | StoreTankDecorationCard
  | StoreTankUtilityCard;
