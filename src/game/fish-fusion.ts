import { fishTypes } from "../data/content";
import { formatNumber } from "./economy";
import type { Fish } from "../objects/Fish";
import type { FishType, Price } from "../types/mechanics";

export const fishFusionMaxPremiumChance = 1 / 3;
export const fishFusionMinPremiumChance = 0.05;
export const fishFusionPremiumChanceLossPerAgeGapMonth = 0.02;
export const fishFusionCostRate = 0.5;
export const fishFusionDurationMs = 3000;

export type FishFusionSource =
  | { key: string; kind: "active"; type: FishType; ageSeconds: number; activeIndex: number; label: string }
  | { key: string; kind: "stored"; type: FishType; ageSeconds: number; storedAgeIndex?: number; label: string };

export type FishFusionChances = {
  normal: number;
  premium: number;
};

export function createFishFusionSources(input: {
  activeFish: Fish[];
  fishInventory: Map<string, number>;
  storedFishAgesFor: (fishTypeId: string) => number[];
}): FishFusionSource[] {
  const activeSources = input.activeFish.map((fish, index) => ({
    key: `active:${index}`,
    kind: "active" as const,
    type: fish.type,
    ageSeconds: fish.ageSeconds,
    activeIndex: index,
    label: "Tank"
  }));
  const storedSources = fishTypes.flatMap((fishType) => {
    const count = input.fishInventory.get(fishType.id) ?? 0;
    const ages = input.storedFishAgesFor(fishType.id);
    return Array.from({ length: count }, (_, index): FishFusionSource => ({
      key: `stored:${fishType.id}:${index}`,
      kind: "stored",
      type: fishType,
      ageSeconds: ages[index] ?? 0,
      storedAgeIndex: index < ages.length ? index : undefined,
      label: "Inventory"
    }));
  });
  return [...activeSources, ...storedSources];
}

export function fishFusionSourceSellValue(
  source: FishFusionSource,
  input: {
    activeFish: Fish[];
    activeFishSellValue: (fish: Fish) => number;
    storedFishSellValue: (fishType: FishType) => number;
  }
): number {
  if (source.kind === "active") {
    const fish = input.activeFish[source.activeIndex];
    if (fish && fish.type.id === source.type.id) {
      return input.activeFishSellValue(fish);
    }
  }
  return input.storedFishSellValue(source.type);
}

export function fishFusionResultTypes(input: {
  sources: FishFusionSource[];
  ownedFishTypeIds: Set<string>;
  activeFish: Fish[];
  activeFishSellValue: (fish: Fish) => number;
  storedFishSellValue: (fishType: FishType) => number;
  priceWealth: (price: Price) => number;
}): { normal?: FishType; premium?: FishType } {
  const normal = fishFusionResultType(input);
  if (!normal) {
    return {};
  }

  const premium = fishFusionResultType({
    ...input,
    targetValueOverride: input.priceWealth(normal.price) * 2,
    excludedIds: new Set([normal.id])
  });
  return { normal, premium };
}

export function fishFusionResultType(input: {
  sources: FishFusionSource[];
  ownedFishTypeIds: Set<string>;
  activeFish: Fish[];
  activeFishSellValue: (fish: Fish) => number;
  storedFishSellValue: (fishType: FishType) => number;
  priceWealth: (price: Price) => number;
  targetValueOverride?: number;
  excludedIds?: Set<string>;
}): FishType | undefined {
  const excludedIds = input.excludedIds ?? new Set<string>();
  const unowned = fishTypes.filter((fishType) => !input.ownedFishTypeIds.has(fishType.id) && !excludedIds.has(fishType.id));
  if (unowned.length === 0) {
    return undefined;
  }

  const combinedSellValue = input.sources.reduce(
    (total, source) => total + fishFusionSourceSellValue(source, input),
    0
  );
  const targetValue = input.targetValueOverride ?? combinedSellValue * 1.08;
  const minimumValue = input.targetValueOverride ? targetValue * 0.72 : combinedSellValue * 0.95;
  const higherOrSimilar = unowned.filter((fishType) => input.priceWealth(fishType.price) >= minimumValue);
  const pool = higherOrSimilar.length > 0 ? higherOrSimilar : unowned;
  return [...pool].sort((first, second) => {
    const firstDistance = Math.abs(input.priceWealth(first.price) - targetValue);
    const secondDistance = Math.abs(input.priceWealth(second.price) - targetValue);
    return firstDistance - secondDistance || input.priceWealth(first.price) - input.priceWealth(second.price);
  })[0];
}

export function fishFusionCostFor(
  sources: FishFusionSource[],
  sourceSellValue: (source: FishFusionSource) => number
): Price {
  const combinedSellValue = sources.reduce((total, source) => total + sourceSellValue(source), 0);
  return { coinType: "common", amount: Math.max(1, Math.round(combinedSellValue * fishFusionCostRate)) };
}

export function fishFusionChancesFor(sources: FishFusionSource[], hasPremium: boolean): FishFusionChances {
  const ages = sources.map((source) => source.ageSeconds);
  const ageGapMonths = sources.length >= 2 ? Math.abs(Math.max(...ages) - Math.min(...ages)) / 3600 : 0;
  const premium = hasPremium
    ? Math.max(
      fishFusionMinPremiumChance,
      Math.min(fishFusionMaxPremiumChance, fishFusionMaxPremiumChance - ageGapMonths * fishFusionPremiumChanceLossPerAgeGapMonth)
    )
    : 0;
  return {
    normal: 1 - premium,
    premium
  };
}

export function fusionAgeLabel(ageSeconds: number): string {
  const months = Math.max(0, Math.floor(ageSeconds / 3600));
  if (months >= 12) {
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    const yearLabel = `${formatNumber(years)} ${years === 1 ? "year" : "years"}`;
    const monthLabel = remainingMonths > 0 ? `${formatNumber(remainingMonths)} ${remainingMonths === 1 ? "month" : "months"}` : "";
    return monthLabel ? `${yearLabel} ${monthLabel}` : yearLabel;
  }
  return months > 0 ? `${formatNumber(months)} ${months === 1 ? "month" : "months"}` : "new";
}
