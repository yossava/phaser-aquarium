import type { DecorationType, Price } from "../types/mechanics";
import type { TankCosmeticCategory } from "./tank-state";

export type DecorationSize = "s" | "m" | "l" | "xl";

export type TankCosmetic = {
  id: string;
  name: string;
  category: TankCosmeticCategory;
  textureKey: string;
  price: Price;
  tint: number;
};

export const aquariumFloorTextureKey = "aquarium-floor";
export const aquariumFloorAssetPath = "/assets/backgrounds/aquarium-floor.webp";
export const aquariumBackgroundTextureKey = "aquarium-background";
export const aquariumBackgroundAssetPath = "/assets/backgrounds/tank-background.webp";
export const tankThumbnailBaseTextureKey = "tank-thumbnail-base";
export const tankThumbnailBaseAssetPath = "/assets/backgrounds/tank-thumbnail-base.webp";

const tankThemeIds = ["lagoon", "coral", "kelp", "crystal", "abyss", "sunset"] as const;
export const tankThemeTexturePairs = tankThemeIds.map((themeId) => ({
  id: themeId,
  backgroundKey: `tank-theme-${themeId}-bg`,
  backgroundPath: `/assets/backgrounds/theme-${themeId}-bg.webp`,
  floorKey: `tank-theme-${themeId}-floor`,
  floorPath: `/assets/backgrounds/theme-${themeId}-floor.webp`
}));
export type TankThemeTexturePair = (typeof tankThemeTexturePairs)[number];

const generatedTankBackgrounds = [
  ["lagoon_depth", "Lagoon Depth"],
  ["coral_garden", "Coral Garden"],
  ["kelp_forest", "Kelp Forest"],
  ["crystal_cavern", "Crystal Cavern"],
  ["abyss_blue", "Abyss Blue"],
  ["sunset_shallows", "Sunset Shallows"],
  ["freshwater_plants", "Freshwater Plants"],
  ["misty_ruins", "Misty Ruins"],
  ["mangrove_roots", "Mangrove Roots"],
  ["volcanic_reef", "Volcanic Reef"],
  ["glowing_plankton", "Glowing Plankton"],
  ["arctic_glass", "Arctic Glass"],
  ["jade_grotto", "Jade Grotto"],
  ["pearl_cave", "Pearl Cave"],
  ["distant_shipwreck", "Distant Shipwreck"],
  ["lily_freshwater", "Lily Freshwater"],
  ["moonlit_reef", "Moonlit Reef"],
  ["opal_cavern", "Opal Cavern"],
  ["golden_shallows", "Golden Shallows"],
  ["deep_temple", "Deep Temple"],
  ["pink_coral_lagoon", "Pink Coral Lagoon"],
  ["blue_crystal_reef", "Blue Crystal Reef"],
  ["purple_moon_grotto", "Purple Moon Grotto"],
  ["green_kelp_garden", "Green Kelp Garden"],
  ["golden_sunlit_shallows", "Golden Sunlit Shallows"],
  ["red_volcanic_glow", "Red Volcanic Glow"],
  ["white_pearl_cove", "White Pearl Cove"],
  ["black_abyss_neon", "Black Abyss Neon"],
  ["orange_sunset_reef", "Orange Sunset Reef"],
  ["mint_freshwater_spring", "Mint Freshwater Spring"],
  ["cyan_ice_cavern", "Cyan Ice Cavern"],
  ["rose_jelly_glow", "Rose Jelly Glow"],
  ["emerald_mangrove_shade", "Emerald Mangrove Shade"],
  ["lavender_dream_reef", "Lavender Dream Reef"],
  ["teal_rainforest_pool", "Teal Rainforest Pool"],
  ["bronze_ancient_ruins", "Bronze Ancient Ruins"],
  ["rainbow_opal_cavern", "Rainbow Opal Cavern"],
  ["deep_navy_trench", "Deep Navy Trench"],
  ["peach_sakura_reef", "Peach Sakura Reef"],
  ["lime_lagoon", "Lime Lagoon"],
  ["magenta_twilight_cave", "Magenta Twilight Cave"],
  ["sky_blue_open_ocean", "Sky Blue Open Ocean"],
  ["turquoise_bubble_palace", "Turquoise Bubble Palace"],
  ["amber_kelp_sunset", "Amber Kelp Sunset"],
  ["silver_rain_aquarium", "Silver Rain Aquarium"],
  ["candy_aqua_reef", "Candy Aqua Reef"],
  ["royal_sapphire_temple", "Royal Sapphire Temple"],
  ["coral_pink_nursery", "Coral Pink Nursery"],
  ["mystic_indigo_biolume", "Mystic Indigo Biolume"],
  ["pastel_rainbow_lagoon", "Pastel Rainbow Lagoon"]
] as const;

const generatedTankSeabeds = [
  ["lagoon_sand", "Lagoon Sand"],
  ["coral_rubble", "Coral Rubble"],
  ["kelp_mud", "Kelp Mud"],
  ["crystal_gravel", "Crystal Gravel"],
  ["abyss_black_sand", "Abyss Black Sand"],
  ["sunset_sand", "Sunset Sand"],
  ["freshwater_pebbles", "Freshwater Pebbles"],
  ["ruin_tiles", "Ruin Tiles"],
  ["mangrove_silt", "Mangrove Silt"],
  ["volcanic_basalt", "Volcanic Basalt"],
  ["glowing_plankton_sand", "Glowing Plankton Sand"],
  ["arctic_pale_gravel", "Arctic Pale Gravel"],
  ["jade_moss_stone", "Jade Moss Stone"],
  ["pearl_shell_sand", "Pearl Shell Sand"],
  ["shipwreck_planks", "Shipwreck Planks"],
  ["lily_pond_mud", "Lily Pond Mud"],
  ["moonlit_silver_sand", "Moonlit Silver Sand"],
  ["opal_crystal_gravel", "Opal Crystal Gravel"],
  ["golden_rippled_sand", "Golden Rippled Sand"],
  ["deep_temple_stone", "Deep Temple Stone"]
] as const;

export const generatedTankBackgroundTexturePairs = generatedTankBackgrounds.map(([themeId, name], index) => ({
  id: `generated-bg-${String(index + 1).padStart(2, "0")}-${themeId.replaceAll("_", "-")}`,
  name,
  textureKey: `tank-generated-bg-${String(index + 1).padStart(2, "0")}`,
  path: `/assets/backgrounds/generated-bg/tank-bg-${String(index + 1).padStart(2, "0")}-${themeId}.webp`
}));

export const generatedTankSeabedTexturePairs = generatedTankSeabeds.map(([themeId, name], index) => ({
  id: `generated-seabed-${String(index + 1).padStart(2, "0")}-${themeId.replaceAll("_", "-")}`,
  name,
  textureKey: `tank-generated-seabed-${String(index + 1).padStart(2, "0")}`,
  path: `/assets/backgrounds/generated-seabed/tank-seabed-${String(index + 1).padStart(2, "0")}-${themeId}.webp`
}));

export const tankTextureAssetPathByKey = new Map<string, string>([
  [aquariumBackgroundTextureKey, aquariumBackgroundAssetPath],
  [aquariumFloorTextureKey, aquariumFloorAssetPath],
  ...tankThemeTexturePairs.flatMap((theme) => [
    [theme.backgroundKey, theme.backgroundPath] as const,
    [theme.floorKey, theme.floorPath] as const
  ]),
  ...generatedTankBackgroundTexturePairs.map((theme) => [theme.textureKey, theme.path] as const),
  ...generatedTankSeabedTexturePairs.map((theme) => [theme.textureKey, theme.path] as const)
]);

const generatedSeabedCropTops = [
  194, 206, 194, 197, 195, 216, 215, 354, 416, 291, 338, 498, 225, 186, 292, 223, 197, 300, 274, 442
] as const;

const themeFloorCropTopById = new Map<string, number>([
  ["abyss", 133],
  ["coral", 277],
  ["crystal", 188],
  ["kelp", 227],
  ["lagoon", 177],
  ["sunset", 94]
]);

export const tankFloorTextureCropTopByKey = new Map<string, number>([
  ...generatedTankSeabedTexturePairs.map((theme, index) => [theme.textureKey, generatedSeabedCropTops[index] ?? 0] as const),
  ...tankThemeTexturePairs.map((theme) => [theme.floorKey, themeFloorCropTopById.get(theme.id) ?? 0] as const)
]);

function tankCosmeticPrice(index: number, baseCommon: number): Price {
  if (index >= 16) {
    return { coinType: "common", amount: Math.round(baseCommon * 6), superRareAmount: 1 + Math.floor((index - 16) / 4) };
  }
  if (index >= 8) {
    return { coinType: "common", amount: Math.round(baseCommon * 3), rareAmount: 1 + Math.floor((index - 8) / 4) };
  }
  return { coinType: "common", amount: Math.round(baseCommon) };
}

export const tankBackgroundCosmetics: TankCosmetic[] = [
  { id: "home", name: "Home Reef", category: "background", textureKey: aquariumBackgroundTextureKey, price: { coinType: "common", amount: 0 }, tint: 0xffffff },
  ...generatedTankBackgroundTexturePairs.map((theme, index): TankCosmetic => ({
    id: theme.id,
    name: theme.name,
    category: "background",
    textureKey: theme.textureKey,
    price: tankCosmeticPrice(index, 900 + index * 420),
    tint: 0xffffff
  })),
  ...tankThemeTexturePairs.map((theme, index): TankCosmetic => ({
    id: theme.id,
    name: `${theme.id[0].toUpperCase()}${theme.id.slice(1)} Water`,
    category: "background",
    textureKey: theme.backgroundKey,
    price: tankCosmeticPrice(index, [1600, 3200, 5200, 8400, 18000, 30000][index] ?? 1600),
    tint: 0xffffff
  }))
];

export const tankSeabedCosmetics: TankCosmetic[] = [
  { id: "home", name: "Home Sand", category: "seabed", textureKey: aquariumFloorTextureKey, price: { coinType: "common", amount: 0 }, tint: 0xffffff },
  ...generatedTankSeabedTexturePairs.map((theme, index): TankCosmetic => ({
    id: theme.id,
    name: theme.name,
    category: "seabed",
    textureKey: theme.textureKey,
    price: tankCosmeticPrice(index, 750 + index * 320),
    tint: 0xffffff
  })),
  ...tankThemeTexturePairs.map((theme, index): TankCosmetic => ({
    id: theme.id,
    name: `${theme.id[0].toUpperCase()}${theme.id.slice(1)} Bed`,
    category: "seabed",
    textureKey: theme.floorKey,
    price: tankCosmeticPrice(index, [1200, 2600, 4600, 7600, 16000, 26000][index] ?? 1200),
    tint: 0xffffff
  }))
];

export const decorationSizes: Record<DecorationSize, { label: string; scale: number; priceMultiplier: number }> = {
  s: { label: "S", scale: 0.78, priceMultiplier: 0.7 },
  m: { label: "M", scale: 1, priceMultiplier: 1 },
  l: { label: "L", scale: 1.28, priceMultiplier: 1.65 },
  xl: { label: "XL", scale: 1.62, priceMultiplier: 2.6 }
};

export const decorationSizeOrder: DecorationSize[] = ["s", "m", "l", "xl"];

export function tankCosmetics(category: TankCosmeticCategory): TankCosmetic[] {
  return category === "background" ? tankBackgroundCosmetics : tankSeabedCosmetics;
}

export function tankCosmeticImageUrl(asset: TankCosmetic): string | undefined {
  if (asset.textureKey === aquariumBackgroundTextureKey) {
    return aquariumBackgroundAssetPath;
  }
  if (asset.textureKey === aquariumFloorTextureKey) {
    return aquariumFloorAssetPath;
  }
  const generatedBackground = generatedTankBackgroundTexturePairs.find((theme) => theme.textureKey === asset.textureKey);
  if (generatedBackground) {
    return generatedBackground.path;
  }
  const generatedSeabed = generatedTankSeabedTexturePairs.find((theme) => theme.textureKey === asset.textureKey);
  if (generatedSeabed) {
    return generatedSeabed.path;
  }
  const theme = tankThemeTexturePairs.find((item) => item.backgroundKey === asset.textureKey || item.floorKey === asset.textureKey);
  return theme ? asset.category === "background" ? theme.backgroundPath : theme.floorPath : undefined;
}

export function decorationVariantPrice(decorationType: DecorationType, size: DecorationSize): Price {
  const multiplier = decorationSizes[size].priceMultiplier;
  return {
    coinType: decorationType.price.coinType,
    amount: Math.max(1, Math.round(decorationType.price.amount * multiplier)),
    rareAmount: decorationType.price.rareAmount
      ? Math.max(1, Math.round(decorationType.price.rareAmount * multiplier))
      : undefined,
    superRareAmount: decorationType.price.superRareAmount
      ? Math.max(1, Math.round(decorationType.price.superRareAmount * multiplier))
      : undefined
  };
}
