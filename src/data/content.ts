import fishTypeData from "./fish-types.json";
import foodTypeData from "./food-types.json";
import decorationTypeData from "./decoration-types.json";
import helperCreatureTypeData from "./helper-creature-types.json";
import { maximumMealCaloriesNeed } from "../game/economy-model";
import type { CoinType, DecorationType, FishType, FoodType, HelperCreatureType, Price, Rarity } from "../types/mechanics";

const baselineCommonFishPrice = 60;
const fishShopTierSize = 8;
const foodShopTierSize = 4;
const decorationShopTierSize = 8;
const helperCreatureShopTierSize = 2;
const activeFishProductionSlots = 4;
const minTargetActiveHours = 2;
const maxTargetActiveHours = 2.5;
const baseFishProductionLevelThreshold = 250;

const fishCommonPriceByShopLevel = new Map<number, number>();

const fishFoodFamilies = [
  { id: "micro", name: "Micro Food", assetId: "micro" },
  { id: "basic", name: "Basic Food", assetId: "basic" },
  { id: "herb", name: "Herb Flakes", assetId: "herb" },
  { id: "premium", name: "Premium Food", assetId: "premium" },
  { id: "protein", name: "Protein Bites", assetId: "protein" },
  { id: "coral", name: "Coral Dust", assetId: "coral" },
  { id: "event", name: "Event Treat", assetId: "event" }
] as const;
const fishFoodSizeVariants = [
  { suffix: "", label: "Small", densityLevel: 1 },
  { suffix: "Medium", label: "Medium", densityLevel: 2 },
  { suffix: "Large", label: "Large", densityLevel: 3 },
  { suffix: "XL", label: "XL", densityLevel: 4 }
] as const;
const foodEconomy: Partial<Record<FoodType["id"], { calories: number; price: Price; densityLevel: number; rarity?: Rarity }>> = {
  medicine: { calories: 10, price: { coinType: "common", amount: 10 }, densityLevel: 1 },
  ageBoost: { calories: 1, price: { coinType: "common", amount: 1000 }, densityLevel: 1 },
  productionBoost: { calories: 1, price: { coinType: "common", amount: 250 }, densityLevel: 1 },
  creature: { calories: 58, price: { coinType: "common", amount: 12 }, densityLevel: 1 }
};
const supplyFoodAssetIdById: Partial<Record<FoodType["id"], string>> = {
  productionBoost: "medicine"
};
const supplyFoodIds = new Set<string>(Object.keys(foodEconomy));
const foodAssetIdById = new Map<string, string>();

function foodVariantId(baseId: string, suffix: string): string {
  return `${baseId}${suffix}`;
}

function roundFoodCalories(value: number): number {
  if (value < 100) {
    return Math.round(value);
  }
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = magnitude / 10;
  return Math.max(1, Math.round(value / step) * step);
}

function supplyFoodPrice(foodTypeId: FoodType["id"]): Price {
  if (foodTypeId === "medicine") {
    return { coinType: "common", amount: roundEconomyCommonPrice(fishProductionDeltaForShopLevel(1) * 0.04) };
  }
  if (foodTypeId === "productionBoost") {
    return { coinType: "common", amount: roundEconomyCommonPrice(fishProductionDeltaForShopLevel(1) * 0.6) };
  }
  if (foodTypeId === "ageBoost") {
    return { coinType: "common", amount: roundEconomyCommonPrice(fishProductionDeltaForShopLevel(2) * 0.8) };
  }
  return { coinType: "common", amount: roundEconomyCommonPrice(fishProductionDeltaForShopLevel(1) * 0.05) };
}

function tokenPriceForRarity(rarity: Rarity, index: number): Pick<Price, "rareAmount" | "superRareAmount"> {
  if (rarity === "rare") {
    return { rareAmount: Math.max(1, 1 + Math.floor(index / 12)) };
  }
  if (rarity === "superRare") {
    return { superRareAmount: Math.max(1, 1 + Math.floor(index / 8)) };
  }
  return {};
}

function fishShopLevelForCatalogIndex(index: number): number {
  return Math.max(1, Math.floor(Math.max(0, index) / fishShopTierSize) + 1);
}

function targetActiveHoursForShopLevel(shopLevel: number): number {
  return Math.min(maxTargetActiveHours, minTargetActiveHours + (Math.max(1, shopLevel) - 1) * 0.1);
}

function fishProductionDeltaForShopLevel(shopLevel: number): number {
  if (shopLevel <= 1) {
    return baseFishProductionLevelThreshold;
  }
  const previousThreshold = baseFishProductionLevelThreshold * Math.pow(5, shopLevel - 2);
  const nextThreshold = baseFishProductionLevelThreshold * Math.pow(5, shopLevel - 1);
  return nextThreshold - previousThreshold;
}

function economyLevelForCatalogIndex(index: number, tierSize: number): number {
  return Math.max(1, Math.floor(Math.max(0, index) / Math.max(1, tierSize)) + 1);
}

function economyTierRatio(index: number, tierSize: number): number {
  const safeTierSize = Math.max(1, tierSize);
  return safeTierSize <= 1 ? 0 : (Math.max(0, index) % safeTierSize) / Math.max(1, safeTierSize - 1);
}

function productionPerPriceOverHours(hours: number): number {
  const safeHours = Math.max(0, hours);
  if (safeHours <= 3) {
    return 0.15 * safeHours * safeHours + safeHours / 3;
  }
  return 0.865 + 0.165 * safeHours * safeHours;
}

function averageFishCommonPriceForShopLevel(shopLevel: number): number {
  const level = Math.max(1, shopLevel);
  const cached = fishCommonPriceByShopLevel.get(level);
  if (cached !== undefined) {
    return cached;
  }

  if (level === 1) {
    fishCommonPriceByShopLevel.set(level, baselineCommonFishPrice);
    return baselineCommonFishPrice;
  }

  const previousAveragePrice = averageFishCommonPriceForShopLevel(level - 1);
  const targetProduction = fishProductionDeltaForShopLevel(level);
  const targetHours = targetActiveHoursForShopLevel(level);
  const productionPerPrice = Math.max(0.001, productionPerPriceOverHours(targetHours));
  const targetTotalFishPrice = targetProduction / productionPerPrice;
  const replacementAdjustedPrice = targetTotalFishPrice - previousAveragePrice * (activeFishProductionSlots - 1);
  const averagePrice = Math.max(
    Math.ceil(previousAveragePrice * 1.45),
    Math.round(replacementAdjustedPrice)
  );
  fishCommonPriceByShopLevel.set(level, averagePrice);
  return averagePrice;
}

function roundFishCommonPrice(value: number): number {
  if (value < 100) {
    return Math.max(1, Math.round(value / 5) * 5);
  }
  if (value < 1000) {
    return Math.round(value / 10) * 10;
  }
  if (value < 10000) {
    return Math.round(value / 50) * 50;
  }
  if (value < 100000) {
    return Math.round(value / 100) * 100;
  }
  return Math.round(value / 1000) * 1000;
}

function roundEconomyCommonPrice(value: number): number {
  if (value < 100) {
    return Math.max(1, Math.round(value / 5) * 5);
  }
  if (value < 1000) {
    return Math.round(value / 10) * 10;
  }
  if (value < 10000) {
    return Math.round(value / 50) * 50;
  }
  if (value < 100000) {
    return Math.round(value / 100) * 100;
  }
  return Math.round(value / 1000) * 1000;
}

function economyTokenPriceForLevel(level: number): Pick<Price, "rareAmount" | "superRareAmount"> {
  if (level >= 5) {
    return { superRareAmount: Math.max(1, level - 4) };
  }
  if (level >= 3) {
    return { rareAmount: Math.max(1, Math.floor((level - 2) / 2)) };
  }
  return {};
}

function fishFoodPriceForCatalogIndex(index: number): Price {
  const level = economyLevelForCatalogIndex(index, foodShopTierSize);
  const ratio = economyTierRatio(index, foodShopTierSize);
  const productionDelta = fishProductionDeltaForShopLevel(level);
  return {
    coinType: "common",
    amount: roundEconomyCommonPrice(productionDelta * (0.018 + ratio * 0.042))
  };
}

function fishCommonPriceForCatalogIndex(index: number): number {
  const shopLevel = fishShopLevelForCatalogIndex(index);
  const averagePrice = averageFishCommonPriceForShopLevel(shopLevel);
  const positionInTier = index % fishShopTierSize;
  const tierRatio = fishShopTierSize <= 1 ? 0.5 : positionInTier / (fishShopTierSize - 1);
  const rangeMultiplier = 0.85 + tierRatio * 0.3;
  return Math.max(1, roundFishCommonPrice(averagePrice * rangeMultiplier));
}

function normalizeFishTypes(source: FishType[]): FishType[] {
  const rarityIndex: Record<Rarity, number> = { common: 0, rare: 0, superRare: 0 };
  return source.map((fishType, catalogIndex) => {
    const index = rarityIndex[fishType.rarity]++;
    const commonAmount = fishCommonPriceForCatalogIndex(catalogIndex);
    const price: Price = {
      coinType: "common",
      amount: commonAmount,
      ...tokenPriceForRarity(fishType.rarity, index)
    };
    return {
      ...fishType,
      price,
      sellBaseValue: { coinType: "common", amount: Math.max(1, Math.floor(commonAmount * 0.7)) },
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

function normalizeSupplyFoodTypes(source: FoodType[]): FoodType[] {
  return source.filter((foodType) => supplyFoodIds.has(foodType.id)).map((foodType) => {
    const economy = foodEconomy[foodType.id];
    const assetId = supplyFoodAssetIdById[foodType.id];
    if (assetId) {
      foodAssetIdById.set(foodType.id, assetId);
    }
    if (!economy) {
      return foodType;
    }
    return {
      ...foodType,
      rarity: economy.rarity ?? foodType.rarity,
      price: supplyFoodPrice(foodType.id),
      calories: economy.calories,
      densityLevel: economy.densityLevel,
      acceptedByDefault: true
    };
  });
}

function normalizeFishFoodTypes(): FoodType[] {
  const variantCount = fishFoodFamilies.length * fishFoodSizeVariants.length;
  const calorieGrowth = (maximumMealCaloriesNeed / 34) ** (1 / Math.max(1, variantCount - 1));
  let index = 0;
  return fishFoodFamilies.flatMap((family) =>
    fishFoodSizeVariants.map((size): FoodType => {
      const catalogIndex = index;
      const id = foodVariantId(family.id, size.suffix);
      const calories = catalogIndex === 0
        ? 34
        : catalogIndex === variantCount - 1
          ? maximumMealCaloriesNeed
          : roundFoodCalories(34 * calorieGrowth ** catalogIndex);
      index += 1;
      foodAssetIdById.set(id, family.assetId);
      return {
        id,
        name: `${family.name} ${size.label}`,
        rarity: "common",
        price: fishFoodPriceForCatalogIndex(catalogIndex),
        nutrition: calories,
        calories,
        densityLevel: size.densityLevel,
        acceptedByDefault: true
      };
    })
  );
}

function normalizeDecorationTypes(source: DecorationType[]): DecorationType[] {
  return source.map((decoration, index) => {
    const level = economyLevelForCatalogIndex(index, decorationShopTierSize);
    const ratio = economyTierRatio(index, decorationShopTierSize);
    const productionDelta = fishProductionDeltaForShopLevel(level);
    const commonAmount = roundEconomyCommonPrice(productionDelta * (0.22 + ratio * 0.58));
    return {
      ...decoration,
      price: {
        coinType: "common",
        amount: commonAmount,
        ...economyTokenPriceForLevel(level)
      }
    };
  });
}

function normalizeHelperCreatureTypes(source: HelperCreatureType[]): HelperCreatureType[] {
  return source.map((creature, index) => {
    const level = economyLevelForCatalogIndex(index, helperCreatureShopTierSize);
    const ratio = economyTierRatio(index, helperCreatureShopTierSize);
    const productionDelta = fishProductionDeltaForShopLevel(level);
    const commonAmount = roundEconomyCommonPrice(productionDelta * (0.55 + ratio * 0.65));
    return {
      ...creature,
      price: {
        coinType: "common",
        amount: commonAmount,
        ...economyTokenPriceForLevel(level)
      }
    };
  });
}

export const fishTypes = normalizeFishTypes(fishTypeData as FishType[]);
export const foodTypes = [...normalizeFishFoodTypes(), ...normalizeSupplyFoodTypes(foodTypeData as FoodType[])];
export const decorationTypes = normalizeDecorationTypes(decorationTypeData as DecorationType[]);
export const helperCreatureTypes = normalizeHelperCreatureTypes(helperCreatureTypeData as HelperCreatureType[]);

export const basicFood = foodTypes.find((foodType) => foodType.id === "basic") ?? foodTypes[0];

export function foodAssetId(foodTypeId: FoodType["id"]): string {
  return foodAssetIdById.get(foodTypeId) ?? foodTypeId;
}

export function foodAssetPath(foodTypeId: FoodType["id"]): string {
  return `/assets/food/${foodAssetId(foodTypeId)}.png`;
}
