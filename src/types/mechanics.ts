export type Rarity = "common" | "rare" | "superRare";
export type CoinType = "common" | "rare" | "superRare";
export type AgeStage = "baby" | "juvenile" | "adult" | "elder" | "master";
export type FishState = "hungry" | "ill" | "happy";
export type FoodTypeId =
  | "micro"
  | "basic"
  | "premium"
  | "herb"
  | "protein"
  | "coral"
  | "medicine"
  | "evolve"
  | "event";

export type FishGender = "M" | "F";

export type Price = {
  coinType: CoinType;
  amount: number;
};

export type Wallet = Record<CoinType, number>;

export type CoinProduction = {
  coinType: CoinType;
  amount: number;
  intervalSeconds: number;
  chance: number;
};

export type AgeCurveStage = {
  durationSeconds: number;
  scale: number;
  hungerMultiplier: number;
  moodCycleSeconds: number;
  production: CoinProduction[];
};

export type FishType = {
  id: string;
  name: string;
  speciesFamily: string;
  tankLevel: number;
  rarity: Rarity;
  price: Price;
  acquisitionSources: string[];
  sellBaseValue: Price;
  requiredFoodTypes: FoodTypeId[];
  preferredFoodTypes: FoodTypeId[];
  habitatTags: string[];
  compatibleSpecies: string[];
  incompatibleSpecies: string[];
  waterRequirement: string;
  illnessResistance: number;
  ageCurve: Record<AgeStage, AgeCurveStage>;
  baseScale: number;
  maxScale: number;
  growthPerSecond: number;
  speed: number;
  hungerPerSecond: number;
  coinDropSeconds: number;
  coinValue: number;
  tint: number;
};

export type FoodType = {
  id: FoodTypeId;
  name: string;
  rarity: Rarity;
  price: Price;
  nutrition: number;
  acceptedByDefault: boolean;
};

export type DecorationType = {
  id: string;
  name: string;
  rarity: Rarity;
  price: Price;
  texture: string;
  habitatTags: string[];
  happinessBonus: number;
};

export type HelperCreatureType = {
  id: string;
  name: string;
  rarity: Rarity;
  price: Price;
  texture: string;
  speed: number;
  coinCollectSeconds: number;
  cleanupSeconds: number;
  feedSeconds?: number;
  habitatTags: string[];
  description: string;
};

export type StoreTab = "fish" | "food" | "decor" | "creature";
