import fishTypeData from "./fish-types.json";
import foodTypeData from "./food-types.json";
import decorationTypeData from "./decoration-types.json";
import helperCreatureTypeData from "./helper-creature-types.json";
import type { CoinType, DecorationType, FishType, FoodType, HelperCreatureType, Price, Rarity } from "../types/mechanics";

const baselineCommonFishPrice = 60;

const fishCommonPriceByRarity: Record<Rarity, (index: number, original: number) => number> = {
  common: (index, original) => Math.max(baselineCommonFishPrice, Math.round(original * (1 + index * 0.035))),
  rare: (index, original) => Math.max(1000, Math.round(original * 24 + index * 320)),
  superRare: (index, original) => Math.max(12000, Math.round(original * 900 + index * 18000))
};

const foodEconomy: Partial<Record<FoodType["id"], { calories: number; price: Price; densityLevel: number; rarity?: Rarity }>> = {
  micro: { calories: 34, price: { coinType: "common", amount: 1 }, densityLevel: 1 },
  basic: { calories: 100, price: { coinType: "common", amount: 3 }, densityLevel: 1 },
  basicMedium: { calories: 500, price: { coinType: "common", amount: 15 }, densityLevel: 2 },
  basicLarge: { calories: 2500, price: { coinType: "common", amount: 75 }, densityLevel: 3 },
  basicXL: { calories: 10000, price: { coinType: "common", amount: 300 }, densityLevel: 4 },
  herb: { calories: 250, price: { coinType: "common", amount: 8 }, densityLevel: 2 },
  premium: { calories: 100000, price: { coinType: "common", amount: 3000 }, densityLevel: 5, rarity: "rare" },
  protein: { calories: 500000, price: { coinType: "common", amount: 15000 }, densityLevel: 5, rarity: "rare" },
  coral: { calories: 6500000, price: { coinType: "common", amount: 195000 }, densityLevel: 5, rarity: "rare" },
  event: { calories: 25000000, price: { coinType: "common", amount: 750000 }, densityLevel: 5, rarity: "superRare" },
  medicine: { calories: 10, price: { coinType: "common", amount: 10 }, densityLevel: 1 },
  ageBoost: { calories: 1, price: { coinType: "common", amount: 1000 }, densityLevel: 1 },
  creature: { calories: 58, price: { coinType: "common", amount: 12 }, densityLevel: 1 }
};

function tokenPriceForRarity(rarity: Rarity, index: number): Pick<Price, "rareAmount" | "superRareAmount"> {
  if (rarity === "rare") {
    return { rareAmount: Math.max(1, 1 + Math.floor(index / 12)) };
  }
  if (rarity === "superRare") {
    return { superRareAmount: Math.max(1, 1 + Math.floor(index / 8)) };
  }
  return {};
}

function normalizeFishTypes(source: FishType[]): FishType[] {
  const rarityIndex: Record<Rarity, number> = { common: 0, rare: 0, superRare: 0 };
  return source.map((fishType) => {
    const index = rarityIndex[fishType.rarity]++;
    const commonAmount = fishCommonPriceByRarity[fishType.rarity](index, fishType.price.amount);
    const price: Price = {
      coinType: "common",
      amount: commonAmount,
      ...tokenPriceForRarity(fishType.rarity, index)
    };
    return {
      ...fishType,
      price,
      sellBaseValue: { coinType: "common", amount: Math.max(1, Math.floor(commonAmount * 0.45)) },
      requiredFoodTypes: [],
      preferredFoodTypes: [],
      ageCurve: Object.fromEntries(
        Object.entries(fishType.ageCurve).map(([stage, curve]) => [
          stage,
          {
            ...curve,
            production: [{ coinType: "common" as CoinType, amount: 1, intervalSeconds: 10, chance: 1 }]
          }
        ])
      ) as FishType["ageCurve"],
      coinDropSeconds: 10,
      coinValue: 1
    };
  });
}

function normalizeFoodTypes(source: FoodType[]): FoodType[] {
  return source.map((foodType) => {
    const economy = foodEconomy[foodType.id];
    if (!economy) {
      return foodType;
    }
    return {
      ...foodType,
      rarity: economy.rarity ?? foodType.rarity,
      price: economy.price,
      calories: economy.calories,
      densityLevel: economy.densityLevel,
      acceptedByDefault: true
    };
  });
}

function normalizeCompositePrice(price: Price, rarity: Rarity, index: number, commonMultiplier: number): Price {
  const commonAmount = Math.max(1, Math.round(price.amount * commonMultiplier));
  return {
    coinType: "common",
    amount: commonAmount,
    ...tokenPriceForRarity(rarity, index)
  };
}

function normalizeDecorationTypes(source: DecorationType[]): DecorationType[] {
  const rarityIndex: Record<Rarity, number> = { common: 0, rare: 0, superRare: 0 };
  return source.map((decoration) => {
    const index = rarityIndex[decoration.rarity]++;
    const multiplier = decoration.rarity === "common" ? 5 : decoration.rarity === "rare" ? 140 : 1200;
    return {
      ...decoration,
      price: normalizeCompositePrice(decoration.price, decoration.rarity, index, multiplier)
    };
  });
}

function normalizeHelperCreatureTypes(source: HelperCreatureType[]): HelperCreatureType[] {
  const rarityIndex: Record<Rarity, number> = { common: 0, rare: 0, superRare: 0 };
  return source.map((creature) => {
    const index = rarityIndex[creature.rarity]++;
    const multiplier = creature.rarity === "common" ? 8 : creature.rarity === "rare" ? 450 : 2500;
    return {
      ...creature,
      price: normalizeCompositePrice(creature.price, creature.rarity, index, multiplier)
    };
  });
}

export const fishTypes = normalizeFishTypes(fishTypeData as FishType[]);
export const foodTypes = normalizeFoodTypes(foodTypeData as FoodType[]);
export const decorationTypes = normalizeDecorationTypes(decorationTypeData as DecorationType[]);
export const helperCreatureTypes = normalizeHelperCreatureTypes(helperCreatureTypeData as HelperCreatureType[]);

export const basicFood = foodTypes.find((foodType) => foodType.id === "basic") ?? foodTypes[0];
