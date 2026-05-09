import type { FishType, FoodTypeId, Rarity } from "../types/mechanics";

export const foodVisualsByType: Record<FoodTypeId, { tint: number; label: string }> = {
  micro: { tint: 0x62f2a8, label: "Micro" },
  basic: { tint: 0xffb13b, label: "Basic S" },
  basicMedium: { tint: 0xf4e45b, label: "Basic M" },
  basicLarge: { tint: 0xff7a45, label: "Basic L" },
  basicXL: { tint: 0xc879ff, label: "Basic XL" },
  premium: { tint: 0x56a8ff, label: "Premium" },
  herb: { tint: 0x78d957, label: "Herb" },
  protein: { tint: 0xff5b5b, label: "Protein" },
  coral: { tint: 0x35d6d0, label: "Coral" },
  medicine: { tint: 0x43d66f, label: "Medicine" },
  creature: { tint: 0x76e68a, label: "Creature" },
  event: { tint: 0xf39cff, label: "Event" }
};

export const rarityVisualsByType: Record<Rarity, { stars: number; tint: number; label: string }> = {
  common: { stars: 1, tint: 0xffe67a, label: "C" },
  rare: { stars: 2, tint: 0x8bd7ff, label: "R" },
  superRare: { stars: 3, tint: 0xf39cff, label: "SR" }
};

export function foodTintFor(foodTypeId: FoodTypeId): number {
  return foodVisualsByType[foodTypeId].tint;
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
