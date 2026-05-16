import type { DecorationType, Price } from "../types/mechanics";
import type { TankCosmeticCategory } from "./tank-state";
import generatedTankBackgroundData from "../data/tank-background-types.json";
import generatedTankSeabedData from "../data/tank-seabed-types.json";

export type DecorationSize = "xs" | "s" | "m" | "l" | "xl";

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

type GeneratedTankCosmeticDefinition = { assetIndex: number; themeId: string; name: string };

export const generatedTankBackgrounds = generatedTankBackgroundData as GeneratedTankCosmeticDefinition[];
export const generatedTankSeabeds = generatedTankSeabedData as GeneratedTankCosmeticDefinition[];

export const generatedTankBackgroundTexturePairs = generatedTankBackgrounds.map(({ assetIndex, themeId, name }) => ({
  id: `generated-bg-${String(assetIndex).padStart(2, "0")}-${themeId.replaceAll("_", "-")}`,
  name,
  textureKey: `tank-generated-bg-${String(assetIndex).padStart(2, "0")}`,
  path: `/assets/backgrounds/generated-bg/tank-bg-${String(assetIndex).padStart(2, "0")}-${themeId}.webp`
}));

export const generatedTankSeabedTexturePairs = generatedTankSeabeds.map(({ assetIndex, themeId, name }) => ({
  id: `generated-seabed-${String(assetIndex).padStart(2, "0")}-${themeId.replaceAll("_", "-")}`,
  name,
  textureKey: `tank-generated-seabed-${String(assetIndex).padStart(2, "0")}`,
  path: `/assets/backgrounds/generated-seabed/tank-seabed-${String(assetIndex).padStart(2, "0")}-${themeId}.webp`
}));

const imagegenTankBackgroundTexturePairs = [
  {
    id: "imagegen-bg-51-toy-reef-wall",
    name: "Toy Reef Wall",
    textureKey: "tank-imagegen-bg-51",
    path: "/assets/backgrounds/generated-bg/tank-bg-51-toy_reef_wall.png"
  }
] as const;

const imagegenTankSeabedTexturePairs = [] as const;

const allTankBackgroundTexturePairs = [
  ...generatedTankBackgroundTexturePairs,
  ...imagegenTankBackgroundTexturePairs
];

const allTankSeabedTexturePairs = [
  ...generatedTankSeabedTexturePairs,
  ...imagegenTankSeabedTexturePairs
];

export const tankTextureAssetPathByKey = new Map<string, string>([
  [aquariumBackgroundTextureKey, aquariumBackgroundAssetPath],
  [aquariumFloorTextureKey, aquariumFloorAssetPath],
  ...tankThemeTexturePairs.flatMap((theme) => [
    [theme.backgroundKey, theme.backgroundPath] as const,
    [theme.floorKey, theme.floorPath] as const
  ]),
  ...allTankBackgroundTexturePairs.map((theme) => [theme.textureKey, theme.path] as const),
  ...allTankSeabedTexturePairs.map((theme) => [theme.textureKey, theme.path] as const)
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
  ...generatedTankSeabedTexturePairs.map((theme) => {
    const match = theme.textureKey.match(/(\d+)$/);
    const sourceIndex = match ? Number(match[1]) - 1 : 0;
    return [theme.textureKey, generatedSeabedCropTops[sourceIndex] ?? 0] as const;
  }),
  ...tankThemeTexturePairs.map((theme) => [theme.floorKey, themeFloorCropTopById.get(theme.id) ?? 0] as const)
]);

const baseFishProductionLevelThreshold = 250;

function productionDeltaForEconomyTier(tier: number): number {
  const level = Math.max(1, Math.floor(tier));
  if (level <= 1) {
    return baseFishProductionLevelThreshold;
  }
  return baseFishProductionLevelThreshold * Math.pow(5, level - 1) - baseFishProductionLevelThreshold * Math.pow(5, level - 2);
}

function roundTankCosmeticPrice(value: number): number {
  if (value < 1000) {
    return Math.max(1, Math.round(value / 10) * 10);
  }
  if (value < 10000) {
    return Math.round(value / 50) * 50;
  }
  if (value < 100000) {
    return Math.round(value / 100) * 100;
  }
  return Math.round(value / 1000) * 1000;
}

function tankCosmeticPrice(index: number, category: TankCosmeticCategory): Price {
  const economyTier = Math.floor(index / 8) + 1;
  const tierProgress = (index % 8) / 7;
  const productionDelta = productionDeltaForEconomyTier(economyTier);
  const lowRate = category === "background" ? 0.45 : 0.35;
  const highRate = category === "background" ? 0.9 : 0.7;
  const amount = roundTankCosmeticPrice(productionDelta * (lowRate + (highRate - lowRate) * tierProgress));
  return {
    coinType: "common",
    amount,
    rareAmount: economyTier >= 3 && economyTier < 5 ? economyTier - 2 : undefined,
    superRareAmount: economyTier >= 5 ? economyTier - 4 : undefined
  };
}

export const tankBackgroundCosmetics: TankCosmetic[] = [
  { id: "home", name: "Home Reef", category: "background", textureKey: aquariumBackgroundTextureKey, price: { coinType: "common", amount: 0 }, tint: 0xffffff },
  ...allTankBackgroundTexturePairs.map((theme, index): TankCosmetic => ({
    id: theme.id,
    name: theme.name,
    category: "background",
    textureKey: theme.textureKey,
    price: tankCosmeticPrice(index, "background"),
    tint: 0xffffff
  })),
  ...tankThemeTexturePairs.map((theme, index): TankCosmetic => ({
    id: theme.id,
    name: `${theme.id[0].toUpperCase()}${theme.id.slice(1)} Water`,
    category: "background",
    textureKey: theme.backgroundKey,
    price: tankCosmeticPrice(index, "background"),
    tint: 0xffffff
  }))
];

export const tankSeabedCosmetics: TankCosmetic[] = [
  { id: "home", name: "Home Sand", category: "seabed", textureKey: aquariumFloorTextureKey, price: { coinType: "common", amount: 0 }, tint: 0xffffff },
  ...allTankSeabedTexturePairs.map((theme, index): TankCosmetic => ({
    id: theme.id,
    name: theme.name,
    category: "seabed",
    textureKey: theme.textureKey,
    price: tankCosmeticPrice(index, "seabed"),
    tint: 0xffffff
  })),
  ...tankThemeTexturePairs.map((theme, index): TankCosmetic => ({
    id: theme.id,
    name: `${theme.id[0].toUpperCase()}${theme.id.slice(1)} Bed`,
    category: "seabed",
    textureKey: theme.floorKey,
    price: tankCosmeticPrice(index, "seabed"),
    tint: 0xffffff
  }))
];

export const decorationSizes: Record<DecorationSize, { label: string; scale: number; priceMultiplier: number }> = {
  xs: { label: "XS", scale: 0.56, priceMultiplier: 0.45 },
  s: { label: "S", scale: 0.78, priceMultiplier: 0.7 },
  m: { label: "M", scale: 1, priceMultiplier: 1 },
  l: { label: "L", scale: 1.28, priceMultiplier: 1.65 },
  xl: { label: "XL", scale: 1.62, priceMultiplier: 2.6 }
};

export const decorationSizeOrder: DecorationSize[] = ["xs", "s", "m", "l", "xl"];

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
  const generatedBackground = allTankBackgroundTexturePairs.find((theme) => theme.textureKey === asset.textureKey);
  if (generatedBackground) {
    return generatedBackground.path;
  }
  const generatedSeabed = allTankSeabedTexturePairs.find((theme) => theme.textureKey === asset.textureKey);
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
