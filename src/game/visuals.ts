import { foodAssetId } from "../data/content";
import type { FishType, FoodTypeId, Rarity } from "../types/mechanics";

export const foodVisualsByType: Record<string, { tint: number; label: string }> = {
  micro: { tint: 0x62f2a8, label: "Micro" },
  basic: { tint: 0xffb13b, label: "Basic S" },
  basicMedium: { tint: 0x76e66e, label: "Basic M" },
  basicLarge: { tint: 0xff7a45, label: "Basic L" },
  basicXL: { tint: 0xc879ff, label: "Basic XL" },
  premium: { tint: 0x56a8ff, label: "Premium" },
  herb: { tint: 0x78d957, label: "Herb" },
  protein: { tint: 0xff5b5b, label: "Protein" },
  coral: { tint: 0x35d6d0, label: "Coral" },
  medicine: { tint: 0x43d66f, label: "Medicine" },
  ageBoost: { tint: 0x9d6bff, label: "Growth" },
  productionBoost: { tint: 0xff6ad5, label: "Boost" },
  creature: { tint: 0x76e68a, label: "Creature" },
  event: { tint: 0xf39cff, label: "Event" }
};

const baseFoodCssFilter = "drop-shadow(0 6px 6px rgba(0, 0, 0, 0.32)) saturate(1.04) brightness(1.02)";
const foodCssFilterByType: Record<string, string> = {
  micro: "drop-shadow(0 6px 6px rgba(0, 0, 0, 0.32)) hue-rotate(64deg) saturate(1.22) brightness(1.06)",
  basic: baseFoodCssFilter,
  premium: "drop-shadow(0 6px 6px rgba(0, 0, 0, 0.32)) hue-rotate(166deg) saturate(1.35) brightness(1.04)",
  herb: "drop-shadow(0 6px 6px rgba(0, 0, 0, 0.32)) hue-rotate(74deg) saturate(1.28) brightness(1.03)",
  protein: "drop-shadow(0 6px 6px rgba(0, 0, 0, 0.32)) hue-rotate(-22deg) saturate(1.45) brightness(1.03)",
  coral: "drop-shadow(0 6px 6px rgba(0, 0, 0, 0.32)) hue-rotate(128deg) saturate(1.36) brightness(1.04)",
  event: "drop-shadow(0 6px 6px rgba(0, 0, 0, 0.32)) hue-rotate(238deg) saturate(1.45) brightness(1.08)",
  medicine: "drop-shadow(0 6px 6px rgba(0, 0, 0, 0.32)) hue-rotate(76deg) saturate(1.2) brightness(1.05)",
  ageBoost: "drop-shadow(0 6px 6px rgba(0, 0, 0, 0.32)) hue-rotate(238deg) saturate(1.45) brightness(1.08)",
  productionBoost: "drop-shadow(0 6px 6px rgba(0, 0, 0, 0.32)) hue-rotate(292deg) saturate(1.7) brightness(1.08)",
  creature: "drop-shadow(0 6px 6px rgba(0, 0, 0, 0.32)) hue-rotate(74deg) saturate(1.2) brightness(1.04)"
};

const foodSizeTintBySuffix: Array<[string, number]> = [
  ["XL", 0xc879ff],
  ["Large", 0xff7a45],
  ["Medium", 0x76e66e]
];
const foodSizeCssFilterBySuffix: Array<[string, string]> = [
  ["XL", "drop-shadow(0 6px 6px rgba(0, 0, 0, 0.32)) hue-rotate(238deg) saturate(1.5) brightness(1.08)"],
  ["Large", "drop-shadow(0 6px 6px rgba(0, 0, 0, 0.32)) hue-rotate(-18deg) saturate(1.42) brightness(1.05)"],
  ["Medium", "drop-shadow(0 6px 6px rgba(0, 0, 0, 0.32)) hue-rotate(74deg) saturate(1.42) brightness(1.05)"]
];

export const rarityVisualsByType: Record<Rarity, { stars: number; tint: number; label: string }> = {
  common: { stars: 1, tint: 0xffe67a, label: "C" },
  rare: { stars: 2, tint: 0x8bd7ff, label: "R" },
  superRare: { stars: 3, tint: 0xf39cff, label: "SR" }
};

export function foodTintFor(foodTypeId: FoodTypeId): number {
  const directTint = foodVisualsByType[foodTypeId]?.tint;
  if (directTint !== undefined) {
    return directTint;
  }
  const assetId = foodAssetId(foodTypeId);
  const baseTint = foodVisualsByType[assetId]?.tint ?? 0xffb13b;
  const sizeTint = foodSizeTintBySuffix.find(([suffix]) => foodTypeId.endsWith(suffix))?.[1];
  return sizeTint ?? baseTint;
}

export function foodCssFilterFor(foodTypeId: FoodTypeId): string {
  const directFilter = foodCssFilterByType[foodTypeId];
  if (directFilter) {
    return directFilter;
  }
  const assetId = foodAssetId(foodTypeId);
  const sizeFilter = foodSizeCssFilterBySuffix.find(([suffix]) => foodTypeId.endsWith(suffix))?.[1];
  return sizeFilter ?? foodCssFilterByType[assetId] ?? baseFoodCssFilter;
}

export function fishFoodTintFor(fishType: FishType): number {
  const preferredFood = fishType.preferredFoodTypes[0] ?? fishType.requiredFoodTypes[0] ?? "basic";
  return foodTintFor(preferredFood);
}

export function rarityStarCount(rarity: Rarity): number {
  return rarityVisualsByType[rarity].stars;
}

export function rarityTintFor(rarity: Rarity): number {
  return rarityVisualsByType[rarity].tint;
}
