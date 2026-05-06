import Phaser from "phaser";
import { basicFood, decorationTypes, fishTypes, foodTypes, helperCreatureTypes } from "../data/content";
import { controlPanelTop, gameHeight, gameWidth, maxRenderScale, setTankWorldScale, tankBounds, tankViewportBounds, toastX, toastY } from "../game/constants";
import { canAfford, createWallet, earn, formatNumber, formatPrice, formatPriceLong, formatWallet, spend } from "../game/economy";
import {
  calculateOfflineSeconds,
  clearSave,
  createEmptyWallet,
  loadGame,
  mapToRecord,
  recordToMap,
  SAVE_VERSION,
  saveGame,
  type OfflineProgress,
  type SavedGame
} from "../game/save";
import { fishFoodTintFor, foodTintFor, rarityStarCount } from "../game/visuals";
import { CoinDrop, coinTextureKeyByType } from "../objects/CoinDrop";
import { Fish } from "../objects/Fish";
import { FoodPellet } from "../objects/FoodPellet";
import { HelperCreature } from "../objects/HelperCreature";
import type { CoinType, DecorationType, FishGender, FishState, FishType, FoodType, FoodTypeId, HelperCreatureType, Price, StoreTab, Wallet } from "../types/mechanics";

type AppScreen = "tank" | "store" | "care" | "album" | "tanks" | "goals" | "settings";

type PlacementMode =
  | { kind: "none" }
  | { kind: "fish"; fishTypeId: string }
  | { kind: "food"; foodTypeId: FoodTypeId }
  | { kind: "decoration"; decorationTypeId: string; size: DecorationSize };

type DecorationSize = "s" | "m" | "l" | "xl";
type TankCosmeticCategory = "background" | "seabed";

type PlacedDecoration = {
  typeId: string;
  size: DecorationSize;
  image: Phaser.GameObjects.Image;
  tankLevel: number;
};

type TankRuntimeState = {
  wallet: Wallet;
  foodInventory: Map<FoodTypeId, number>;
  fishInventory: Map<string, number>;
  decorationInventory: Map<string, number>;
  creatureInventory: Map<string, number>;
  backgroundInventory: Map<string, number>;
  seabedInventory: Map<string, number>;
  selectedBackgroundId: string;
  selectedSeabedId: string;
  cleanliness: number;
  cleanedAt: number;
};

type CompatibilitySummary = {
  score: number;
  level: "good";
  warnings: string[];
  incompatibleNames: string[];
};

type HudChipId = "common" | "rare" | "superRare" | "wealth";
type HudRect = { x: number; y: number; width: number; height: number };
type HudBadgeLayout = { x: number; y: number; size: number };
type HudLayout = {
  levelBadge: HudBadgeLayout;
  rightFrame: HudRect;
  chips: Record<HudChipId, HudRect>;
};

const maxCoinDrops = 5;
const fishCapacityByCatalogTankLevel: Record<number, number> = {
  1: 10,
  2: 14,
  3: 18,
  4: 22,
  5: 30
};
const maxDecorations = 8;
const maxHelperCreatures = 5;
const maxFishCatalogLevel = 5;
const maxOwnedTanks = 5;
const rentalMinuteMs = 60_000;
const minRentalMinutes = 1;
const maxRentalMinutes = 60;
const decorationTrashZone = new Phaser.Geom.Rectangle(gameWidth / 2 - 48, gameHeight - 88, 96, 60);
const autoFeederPrice: FishType["price"] = { coinType: "common", amount: 18 };
const autoCollectorPrice: FishType["price"] = { coinType: "common", amount: 22 };
const evolvePillFoodTypeId: FoodTypeId = "evolve";
const maxEvolutionStage = 3;
const maxFoodBuyQuantity = 99_999;
const overfullHungerFloor = -10000;
const foodBulkBuyQuantities = [1, 10, 100, 500, 1000];
const fishStatsCardHeight = 96;
const fishStatsCardRowHeight = 104;
const maxPurchasableTankLevel = maxOwnedTanks;
const tankShopPageSize = 10;
const tankUpgradePrices: Record<number, FishType["price"]> = {
  2: { coinType: "common", amount: 100 },
  3: { coinType: "common", amount: 420 },
  4: { coinType: "rare", amount: 8 },
  5: { coinType: "superRare", amount: 3 }
};
const tankFallbackBaseColor = 0x0b7097;
const coinWealthValue: Record<CoinType, number> = {
  common: 1,
  rare: 100,
  superRare: 1000
};
const coinAssetPathByType: Record<CoinType, string> = {
  common: "/assets/ui/icon-common-coin.png",
  rare: "/assets/ui/icon-rare-coin.png",
  superRare: "/assets/ui/icon-super-rare-coin.png"
};
const menuIconTextureByScreen: Record<Exclude<AppScreen, "tank">, string> = {
  store: "ui-shop",
  care: "ui-care",
  album: "ui-book",
  tanks: "ui-care",
  goals: "ui-goals",
  settings: "ui-settings"
};
const menuIconAssetPathByKey: Record<string, string> = {
  "ui-shop": "/assets/ui/shop.png",
  "ui-care": "/assets/ui/care.png",
  "ui-book": "/assets/ui/book.png",
  "ui-goals": "/assets/ui/goals.png",
  "ui-settings": "/assets/ui/settings.png"
};
const hudIconAssetPathByKey: Record<string, string> = {
  "ui-icon-common-coin": "/assets/ui/icon-common-coin.png",
  "ui-icon-rare-coin": "/assets/ui/icon-rare-coin.png",
  "ui-icon-super-rare-coin": "/assets/ui/icon-super-rare-coin.png",
  "ui-icon-total-wealth": "/assets/ui/icon-total-wealth.png",
  "ui-icon-food-status": "/assets/ui/icon-food-status.png",
  "ui-icon-clean-status": "/assets/ui/icon-clean-status.png",
  "ui-icon-happy-status": "/assets/ui/icon-happy-status.png"
};
const aquariumFloorTextureKey = "aquarium-floor";
const aquariumFloorAssetPath = "/assets/backgrounds/aquarium-floor.png";
const aquariumBackgroundTextureKey = "aquarium-background";
const aquariumBackgroundAssetPath = "/assets/backgrounds/tank-background.png";
const distantSilhouetteTextureKey = "aquarium-distant-silhouettes";
const distantSilhouetteAssetPath = "/assets/backgrounds/distant-silhouettes.png";
const dirtyTankOverlayTextureKey = "dirty-tank-overlay";
const dirtyTankOverlayAssetPath = "/assets/backgrounds/dirty-tank-overlay.png";
const tankThumbnailBaseTextureKey = "tank-thumbnail-base";
const tankThumbnailBaseAssetPath = "/assets/backgrounds/tank-thumbnail-base.png";
const tankThemeIds = ["lagoon", "coral", "kelp", "crystal", "abyss", "sunset"] as const;
const tankThemeTexturePairs = tankThemeIds.map((themeId) => ({
  id: themeId,
  backgroundKey: `tank-theme-${themeId}-bg`,
  backgroundPath: `/assets/backgrounds/theme-${themeId}-bg.png`,
  floorKey: `tank-theme-${themeId}-floor`,
  floorPath: `/assets/backgrounds/theme-${themeId}-floor.png`
}));
type TankThemeTexturePair = (typeof tankThemeTexturePairs)[number];
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
  ["deep_temple", "Deep Temple"]
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
const generatedTankBackgroundTexturePairs = generatedTankBackgrounds.map(([themeId, name], index) => ({
  id: `generated-bg-${String(index + 1).padStart(2, "0")}-${themeId.replaceAll("_", "-")}`,
  name,
  textureKey: `tank-generated-bg-${String(index + 1).padStart(2, "0")}`,
  path: `/assets/backgrounds/generated-bg/tank-bg-${String(index + 1).padStart(2, "0")}-${themeId}.png`
}));
const generatedTankSeabedTexturePairs = generatedTankSeabeds.map(([themeId, name], index) => ({
  id: `generated-seabed-${String(index + 1).padStart(2, "0")}-${themeId.replaceAll("_", "-")}`,
  name,
  textureKey: `tank-generated-seabed-${String(index + 1).padStart(2, "0")}`,
  path: `/assets/backgrounds/generated-seabed/tank-seabed-${String(index + 1).padStart(2, "0")}-${themeId}.png`
}));
type TankCosmetic = {
  id: string;
  name: string;
  category: TankCosmeticCategory;
  textureKey: string;
  price: Price;
  tint: number;
};
const tankBackgroundCosmetics: TankCosmetic[] = [
  { id: "home", name: "Home Reef", category: "background", textureKey: aquariumBackgroundTextureKey, price: { coinType: "common", amount: 0 }, tint: 0xffffff },
  ...generatedTankBackgroundTexturePairs.map((theme, index): TankCosmetic => ({
    id: theme.id,
    name: theme.name,
    category: "background" as const,
    textureKey: theme.textureKey,
    price: { coinType: index < 8 ? "common" : index < 16 ? "rare" : "superRare", amount: index < 8 ? 360 + index * 90 : index < 16 ? 26 + (index - 8) * 8 : 3 + (index - 16) * 2 },
    tint: 0xffffff
  })),
  ...tankThemeTexturePairs.map((theme, index): TankCosmetic => ({
    id: theme.id,
    name: `${theme.id[0].toUpperCase()}${theme.id.slice(1)} Water`,
    category: "background" as const,
    textureKey: theme.backgroundKey,
    price: { coinType: index < 2 ? "common" : index < 4 ? "rare" : "superRare", amount: [220, 420, 24, 42, 2, 4][index] },
    tint: 0xffffff
  }))
];
const tankSeabedCosmetics: TankCosmetic[] = [
  { id: "home", name: "Home Sand", category: "seabed", textureKey: aquariumFloorTextureKey, price: { coinType: "common", amount: 0 }, tint: 0xffffff },
  ...generatedTankSeabedTexturePairs.map((theme, index): TankCosmetic => ({
    id: theme.id,
    name: theme.name,
    category: "seabed" as const,
    textureKey: theme.textureKey,
    price: { coinType: index < 8 ? "common" : index < 16 ? "rare" : "superRare", amount: index < 8 ? 240 + index * 70 : index < 16 ? 18 + (index - 8) * 6 : 2 + (index - 16) * 2 },
    tint: 0xffffff
  })),
  ...tankThemeTexturePairs.map((theme, index): TankCosmetic => ({
    id: theme.id,
    name: `${theme.id[0].toUpperCase()}${theme.id.slice(1)} Bed`,
    category: "seabed" as const,
    textureKey: theme.floorKey,
    price: { coinType: index < 2 ? "common" : index < 4 ? "rare" : "superRare", amount: [160, 320, 18, 34, 1, 3][index] },
    tint: 0xffffff
  }))
];
const decorationSizes: Record<DecorationSize, { label: string; scale: number; priceMultiplier: number }> = {
  s: { label: "S", scale: 0.78, priceMultiplier: 0.7 },
  m: { label: "M", scale: 1, priceMultiplier: 1 },
  l: { label: "L", scale: 1.28, priceMultiplier: 1.65 },
  xl: { label: "XL", scale: 1.62, priceMultiplier: 2.6 }
};
const decorationSizeOrder: DecorationSize[] = ["s", "m", "l", "xl"];
const bubbleButtonFrameTextureKey = "ui-reusable-glass-bubble-button";
const bubbleButtonFrameAssetPath = "/assets/ui/reusable-glass-bubble-button.png";
const coinGlowTextureKey = "coin-glow";
const coinGlowAssetPath = "/assets/ui/coin-glow.png";
const bubbleButtonPressedTextureKey = "ui-reusable-glass-bubble-button-pressed";
const bubbleButtonPressedAssetPath = "/assets/ui/reusable-glass-bubble-button-pressed.png";
const tankLevelBadgeTextureKeys = Array.from(
  { length: 10 },
  (_, index) => `ui-tank-level-badge-${String(index + 1).padStart(2, "0")}`
);
const tankLevelBadgeAssetPaths = tankLevelBadgeTextureKeys.map(
  (_, index) => `/assets/ui/tank-level-badge-${String(index + 1).padStart(2, "0")}.png`
);
const hudTopAssetPathByKey: Record<string, string> = {
  "ui-hud-level-medallion": "/assets/ui/hud-level-medallion.png",
  "ui-hud-main-long-frame": "/assets/ui/hud-main-long-frame.png"
};
const hudChipIconSize = 24;
const hudSuperRareChipIconSize = 18;
const hudChipIconCenterOffsetX = 18;
const hudChipTextOffsetX = 38;
const defaultHudLayout: HudLayout = {
  levelBadge: { x: 64, y: 71.5, size: 92 },
  rightFrame: { x: 260, y: 67.5, width: 309, height: 160 },
  chips: {
    common: { x: 160, y: 39, width: 96, height: 26 },
    rare: { x: 267, y: 39, width: 96, height: 26 },
    superRare: { x: 160, y: 71, width: 96, height: 26 },
    wealth: { x: 267, y: 71, width: 96, height: 26 }
  }
};
const dirtyTankOverlayThreshold = 20;
const dirtyTankOverlayMaxAlpha = 0.64;

type AquariumTestSnapshot = {
  coins: number;
  wallet: Wallet;
  foodInventory: number;
  foodInventoryByType: Record<string, number>;
  foodBuyQuantities: Record<string, number>;
  activeScreen: AppScreen;
  activeTab: StoreTab;
  storeCoinFilter: CoinType;
  fishCatalogLevel: number;
  placementMode: PlacementMode["kind"];
  fishCount: number;
  activeFishCount: number;
  maxFishCapacity: number;
  helperCreatureCount: number;
  activeHelperCreatureCount: number;
  maxHelperCreatures: number;
  tankLevel: number;
  activeTankSlot: number;
  ownedTankLevels: number[];
  ownedTankCount: number;
  maxOwnedTanks: number;
  tankDisplayLevel: number;
  maxTankLevel: number;
  renderScale: number;
  tankCanUpgradeIndefinitely: boolean;
  tankSlotsAreIsolated: boolean;
  fishCatalogMaxLevel: number;
  tankViewScale: number;
  tankWorldBounds: { left: number; top: number; right: number; bottom: number; width: number; height: number };
  tankScreenEdges: { left: number; top: number; right: number; bottom: number };
  totalWealth: number;
  tankWorth: number;
  tankNeedIndicator: string;
  tankHudText: string;
  tankStatusText: string;
  tankCareText: string;
  fishTypeCount: number;
  helperCreatureTypeCount: number;
  visibleFishCatalogCount: number;
  visibleFishCatalogPreviewTextures: string[];
  visibleStoreCatalogCount: number;
  assetCoverage: {
    fish: number;
    food: number;
    decorations: number;
    coins: number;
    uiIcons: number;
    helpers: number;
    backgrounds: number;
  };
  dirtyTankOverlay: {
    visible: boolean;
    alpha: number;
    textureKey?: string;
    displayWidth: number;
    displayHeight: number;
  };
  nextTankUpgradePrice?: FishType["price"];
  numberFormatSamples: {
    small: string;
    thousand: string;
    million: string;
    billion: string;
  };
  foodCount: number;
  coinDropCount: number;
  decorationCount: number;
  decorations: Array<{ typeId: string; size: DecorationSize; x: number; y: number; depth: number }>;
  decorationTrashTarget: { visible: boolean; x: number; y: number };
  cleanliness: number;
  happiness: number;
  compatibilityScore: number;
  modalTitle?: string;
  saved: boolean;
  offlineProgress: OfflineProgress;
  rentals: {
    autoFeederRemainingMs: number;
    autoCollectorRemainingMs: number;
    autoFeederActive: boolean;
    autoCollectorActive: boolean;
    autoFeederMinutes: number;
    autoCollectorMinutes: number;
    autoFeederPrice: number;
    autoCollectorPrice: number;
  };
  fish: Array<{
    typeId: string;
    typeName: string;
    textureKey: string;
    state: FishState;
    ageLabel: string;
    ageSeconds: number;
    ageMonths: number;
    ageYears: number;
    growthCapAgeYears: number;
    lengthCm: number;
    weightGrams: number;
    lengthLabel: string;
    weightLabel: string;
    naturalAgeScale: number;
    tankGrowthScaleCap: number;
    growthBlockedByTank: boolean;
    gender: FishGender;
    evolutionStage: number;
    fatalCareSeconds: number;
    fatalCareRemainingSeconds: number;
    evolutionFee: FishType["price"];
    hunger: number;
    health: number;
    x: number;
    y: number;
    scale: number;
    rotation: number;
    displayWidth: number;
    displayHeight: number;
    veryBigScaleCap: number;
    movementSizeMultiplier: number;
    calorieNeedMultiplier: number;
    hungerPerSecond: number;
    mealCaloriesNeeded: number;
    productionSummary: string;
    productionOptions: Array<{
      coinType: CoinType;
      amount: number;
      intervalSeconds: number;
      chance: number;
    }>;
    bodyTint: number;
    sellValue: number;
    nextCoinDropInMs: number;
    statusBars: {
      visible: boolean;
      x: number;
      y: number;
      fullnessRatio: number;
      moodRatio: number;
      tailTint: number;
      rarityStars: number;
      fullyGrown: boolean;
      growthBlockedByTank: boolean;
      emoji: string;
      emojiVisible: boolean;
      emojiX: number;
      emojiY: number;
      emojiBubbleVisible: boolean;
      careBarsVisible: boolean;
    };
    tailAnimation: {
      wag: number;
      fan: number;
      alpha: number;
      visible: boolean;
    };
  }>;
  foods: Array<{ x: number; y: number; displayWidth: number; foodType: FoodTypeId; textureKey: string; visualTint: number; sinkSpeed: number; calories: number; densityLevel: number }>;
  helperCreatures: Array<{ typeId: string; typeName: string; x: number; y: number; speed: number; sellPrice: FishType["price"]; feedSeconds?: number }>;
  maxCoinDrops: number;
  coinsWaiting: Array<{
    x: number;
    y: number;
    value: number;
    coinType: CoinType;
    textureKey: string;
    tint: number;
    textColor: string;
    sinkSpeed: number;
    displayWidth: number;
    labelFontSize: number;
    bottomY: number;
    atBottom: boolean;
  }>;
};

declare global {
  interface Window {
    __aquariumTest?: {
      getSnapshot: () => AquariumTestSnapshot;
      setFishVitals: (index: number, hunger: number, health: number) => void;
      setFishFatalCareSeconds: (index: number, seconds: number) => void;
      setFishPosition: (index: number, x: number, y: number) => void;
      addFishForTest: (fishTypeId: string, x: number, y: number) => void;
      setFishGender: (index: number, gender: FishGender) => void;
      removeFishAt: (index: number) => void;
      forceCoinReady: (index: number) => void;
      forceProductionDrop: (index: number) => void;
      forceFishAge: (index: number, ageSeconds: number) => void;
      saveNow: () => void;
      clearSave: () => void;
      backdateSave: (seconds: number) => void;
      closeModal: () => void;
      setScreen: (screen: AppScreen) => void;
      setStoreTab: (tab: StoreTab) => void;
      setStoreCoinFilter: (coinType: CoinType) => void;
      setFishCatalogLevel: (level: number) => void;
      upgradeTank: () => void;
      switchTank: (level: number) => void;
      buyTank: (level: number) => void;
      buyFish: (fishTypeId: string) => void;
      buyFood: (foodTypeId?: FoodTypeId) => void;
      setFoodBuyQuantity: (foodTypeId: FoodTypeId, quantity: number) => void;
      addFoodBuyQuantity: (foodTypeId: FoodTypeId, quantity: number) => void;
      resetFoodBuyQuantity: (foodTypeId: FoodTypeId) => void;
      buyDecoration: (decorationTypeId: string) => void;
      buyHelperCreature: (creatureTypeId: string) => void;
      addHelperCreatureForTest: (creatureTypeId: string, x: number) => void;
      setHelperCreaturePosition: (index: number, x: number) => void;
      clearHelperCreatures: () => void;
      sellHelperCreatureAt: (index: number) => void;
      evolveFishAt: (index: number, force?: "success" | "death") => void;
      breedFishAt: (index: number, force?: "same" | "rare") => void;
      setFoodTool: (foodTypeId: FoodTypeId) => void;
      openSellOldest: () => void;
      sellFishAt: (index: number) => void;
      addFood: (foodTypeId: FoodTypeId, count: number) => void;
      dropFoodForTest: (foodTypeId: FoodTypeId, x: number, y: number) => void;
      dropStockedFoodForTest: (foodTypeId: FoodTypeId, x: number, y: number) => void;
      addWallet: (coinType: CoinType, amount: number) => void;
      addCoin: (coinType: CoinType, value: number, x: number, y: number) => void;
      clearCoins: () => void;
      clearFoods: () => void;
      rentAutoFeeder: () => void;
      rentAutoCollector: () => void;
      setRentalMinutes: (rental: "feeder" | "collector", minutes: number) => void;
      setCleanliness: (cleanliness: number) => void;
      runAutoFeederNow: () => void;
      expireRentals: () => void;
    };
  }
}

export class AquariumScene extends Phaser.Scene {
  private wallet = createWallet(120, 0, 0);
  private foodInventory = new Map<FoodTypeId, number>([[basicFood.id, 3]]);
  private foodBuyQuantities = new Map<FoodTypeId, number>();
  private fishInventory = new Map<string, number>();
  private decorationInventory = new Map<string, number>();
  private creatureInventory = new Map<string, number>();
  private fish: Fish[] = [];
  private foods: FoodPellet[] = [];
  private coinDrops: CoinDrop[] = [];
  private helperCreatures: HelperCreature[] = [];
  private placementMode: PlacementMode = { kind: "none" };
  private activeScreen: AppScreen = "tank";
  private activeTab: StoreTab = "fish";
  private storeCoinFilter: CoinType = "common";
  private selectedFoodTypeId: FoodTypeId = basicFood.id;
  private placedDecorations: PlacedDecoration[] = [];
  private offlineProgress: OfflineProgress = { elapsedSeconds: 0, earned: createEmptyWallet() };
  private autosaveElapsed = 0;
  private cleanliness = 100;
  private cleanedAt = Date.now();
  private settings = { sound: true, music: true, reducedMotion: false, notifications: false };
  private dailyGoals = { date: this.localDateKey(), claimed: [] as string[] };
  private autoFeederEndsAt = 0;
  private autoCollectorEndsAt = 0;
  private nextAutoFeedAt = 0;
  private nextAutoCollectAt = 0;
  private autoFeederMinutes = 1;
  private autoCollectorMinutes = 1;
  private tankLevel = 1;
  private ownedTankLevels = new Set<number>([1]);
  private tankNames = new Map<number, string>([[1, "Home Reef"]]);
  private tankStates = new Map<number, TankRuntimeState>();
  private tankCatalogPage = 1;
  private tankDecorPage = 1;
  private tankCosmeticPages: Record<TankCosmeticCategory, number> = { background: 1, seabed: 1 };
  private fishCatalogLevel = 1;
  private selectedFishIndex?: number;
  private tankLayer!: Phaser.GameObjects.Container;
  private tankBackground!: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private tankDistantOverlay?: Phaser.GameObjects.Image;
  private tankSand?: Phaser.GameObjects.Image;
  private dirtyTankOverlay?: Phaser.GameObjects.Image;
  private decorationTrashTarget!: Phaser.GameObjects.Container;
  private decorationTrashBackground!: Phaser.GameObjects.Rectangle;
  private decorationTrashText!: Phaser.GameObjects.Text;
  private draggedDecoration?: PlacedDecoration;
  private hudLayout: HudLayout = this.cloneHudLayout(defaultHudLayout);
  private hudFrameImage!: Phaser.GameObjects.Image;
  private hudPanel!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private hudIconImages!: Record<HudChipId, Phaser.GameObjects.Image>;
  private hudCommonText!: Phaser.GameObjects.Text;
  private hudRareText!: Phaser.GameObjects.Text;
  private hudSuperRareText!: Phaser.GameObjects.Text;
  private hudWealthText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private modeText!: Phaser.GameObjects.Text;
  private hudFoodStatusText!: Phaser.GameObjects.Text;
  private hudCleanStatusText!: Phaser.GameObjects.Text;
  private hudHappyStatusText!: Phaser.GameObjects.Text;
  private hudNeedText!: Phaser.GameObjects.Text;
  private tankLevelBadgeHueOverlay!: Phaser.GameObjects.Graphics;
  private tankLevelBadgeImage!: Phaser.GameObjects.Image;
  private tankLevelBadgeText!: Phaser.GameObjects.Text;
  private pagePanel?: Phaser.GameObjects.Container;
  private screenButtons: Phaser.GameObjects.Container[] = [];
  private foodButtons: Phaser.GameObjects.Container[] = [];
  private foodDragGhosts = new Set<Phaser.GameObjects.Image>();
  private tabButtons: Phaser.GameObjects.Container[] = [];
  private tabControls: Phaser.GameObjects.Container[] = [];
  private modal?: Phaser.GameObjects.Container;
  private modalTitle?: string;

  public constructor() {
    super("AquariumScene");
  }

  public preload(): void {
    fishTypes.forEach((fishType) => {
      this.load.image(`fish-${fishType.id}`, `/assets/fish/${fishType.id}.png`);
    });
    foodTypes.forEach((foodType) => {
      this.load.image(this.foodTextureKey(foodType.id), `/assets/food/${foodType.id}.png`);
    });
    decorationTypes.forEach((decorationType) => {
      this.load.image(decorationType.texture, `/assets/decorations/${decorationType.id}.png`);
    });
    helperCreatureTypes.forEach((creatureType) => {
      this.load.image(creatureType.texture, `/assets/helpers/${creatureType.id}.png`);
    });
    (Object.keys(coinAssetPathByType) as CoinType[]).forEach((coinType) => {
      this.load.image(coinTextureKeyByType[coinType], coinAssetPathByType[coinType]);
    });
    Object.entries(menuIconAssetPathByKey).forEach(([textureKey, assetPath]) => {
      this.load.image(textureKey, assetPath);
    });
    Object.entries(hudIconAssetPathByKey).forEach(([textureKey, assetPath]) => {
      this.load.image(textureKey, assetPath);
    });
    this.load.image(aquariumFloorTextureKey, aquariumFloorAssetPath);
    this.load.image(aquariumBackgroundTextureKey, aquariumBackgroundAssetPath);
    this.load.image(distantSilhouetteTextureKey, distantSilhouetteAssetPath);
    this.load.image(dirtyTankOverlayTextureKey, dirtyTankOverlayAssetPath);
    this.load.image(tankThumbnailBaseTextureKey, tankThumbnailBaseAssetPath);
    tankThemeTexturePairs.forEach((theme) => {
      this.load.image(theme.backgroundKey, theme.backgroundPath);
      this.load.image(theme.floorKey, theme.floorPath);
    });
    generatedTankBackgroundTexturePairs.forEach((theme) => {
      this.load.image(theme.textureKey, theme.path);
    });
    generatedTankSeabedTexturePairs.forEach((theme) => {
      this.load.image(theme.textureKey, theme.path);
    });
    this.load.image(bubbleButtonFrameTextureKey, bubbleButtonFrameAssetPath);
    this.load.image(bubbleButtonPressedTextureKey, bubbleButtonPressedAssetPath);
    this.load.image(coinGlowTextureKey, coinGlowAssetPath);
    tankLevelBadgeTextureKeys.forEach((textureKey, index) => {
      this.load.image(textureKey, tankLevelBadgeAssetPaths[index]);
    });
    Object.entries(hudTopAssetPathByKey).forEach(([textureKey, assetPath]) => {
      this.load.image(textureKey, assetPath);
    });
  }

  public create(): void {
    this.configureCameraForHighDpi();
    this.createTextures();
    this.createWorld();
    this.createUi();
    this.restoreSavedGame();
    this.updateDirtyTankOverlay();
    this.installTestHooks();
    this.refreshUi();

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.handleTankPointer(pointer);
    });
  }

  public update(_time: number, delta: number): void {
    const deltaSeconds = delta / 1000;
    const now = this.time.now;

    this.foods.forEach((food) => food.update(deltaSeconds));
    this.removeExpiredFood();
    this.coinDrops.forEach((coin) => coin.update(deltaSeconds));
    this.updateHelperCreatures(deltaSeconds);
    this.updateRentals();
    this.cleanliness = Phaser.Math.Clamp(
      this.cleanliness - (0.05 + this.activeFish().length * 0.018 + this.foods.length * 0.045) * deltaSeconds,
      0,
      100
    );
    this.updateDirtyTankOverlay();
    const fishToRemove: Fish[] = [];
    for (const currentFish of this.activeFish()) {
      const previousAgeStage = currentFish.ageStage;
      const eatenFood = currentFish.update(deltaSeconds, this.foodsAssignedToFish(currentFish));
      if (currentFish.ageStage !== previousAgeStage) {
        this.saveNow();
      }

      if (eatenFood) {
        const ateMedicine = eatenFood.accepted && eatenFood.food.foodType.id === "medicine";
        if (eatenFood.accepted && eatenFood.food.foodType.id !== "medicine") {
          this.showMissedFoodEmotes(eatenFood.food, currentFish);
        }
        this.removeFood(eatenFood.food);
        if (ateMedicine) {
          currentFish.applyMedicine(this.time.now);
          this.floatTankText("Healed", currentFish.sprite.x, currentFish.sprite.y - 26, "#a8ffb0");
        } else {
          this.floatTankText(eatenFood.accepted ? "Yum" : "Nope", currentFish.sprite.x, currentFish.sprite.y - 26, eatenFood.accepted ? "#f7ff9a" : "#ffb0a8");
        }
        if (!eatenFood.accepted) {
          this.cleanliness = Phaser.Math.Clamp(this.cleanliness - 4, 0, 100);
        }
        this.saveNow();
      }

      if (currentFish.canDropCoin(now) && this.coinDrops.length < maxCoinDrops) {
        const production = currentFish.rollActiveProduction();
        currentFish.markCoinDroppedForProduction(now, production);
        this.dropCoin(currentFish, production);
      }

      if (this.cleanliness < 35 && currentFish.hunger > 72) {
        currentFish.health = Phaser.Math.Clamp(currentFish.health - 1.8 * deltaSeconds, 0, 100);
      }

      if (currentFish.isDeadFromNeglect()) {
        fishToRemove.push(currentFish);
      }
    }

    if (fishToRemove.length > 0) {
      for (const deadFish of fishToRemove) {
        const index = this.fish.indexOf(deadFish);
        if (index < 0) {
          continue;
        }
        const x = deadFish.sprite.x;
        const y = deadFish.sprite.y;
        const name = deadFish.type.name;
        this.removeFishAt(index);
        this.floatTankText(`${name} died`, x, y - 30, "#ff8f9a");
      }
      this.closeModal();
      this.renderTabControls();
      this.refreshUi();
      this.saveNow();
    }

    this.updateAutoCollector();

    this.autosaveElapsed += deltaSeconds;
    if (this.autosaveElapsed >= 5) {
      this.autosaveElapsed = 0;
      this.saveNow();
    }

    this.refreshStatus();
  }

  private configureCameraForHighDpi(): void {
    const renderScale = this.currentRenderScale();
    this.cameras.main.setOrigin(0, 0);
    this.cameras.main.setZoom(renderScale);
    this.cameras.main.setScroll(0, 0);
    this.cameras.main.setBackgroundColor("#071b2a");
  }

  private currentRenderScale(): number {
    return Phaser.Math.Clamp(this.scale.gameSize.width / gameWidth, 1, maxRenderScale);
  }

  private createWorld(): void {
    this.cameras.main.setBackgroundColor("#071b2a");

    this.add.rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0x071b2a);
    this.add
      .rectangle(
        tankViewportBounds.centerX,
        tankViewportBounds.centerY,
        tankViewportBounds.width,
        tankViewportBounds.height,
        0xd7f4ff,
        0.18
      )
      .setStrokeStyle(0, 0xffffff, 0);
    this.tankLayer = this.add.container(0, 0).setDepth(2);
    this.tankBackground = this.createTankBackground();
    this.tankLayer.add(this.tankBackground);
    this.tankDistantOverlay = this.createOptionalTankOverlay(distantSilhouetteTextureKey, 0.5);
    if (this.tankDistantOverlay) {
      this.tankLayer.add(this.tankDistantOverlay);
    }
    this.applyTankViewScale();
    this.tankSand = this.createTankFloor();
    this.tankLayer.add(this.tankSand);
    this.layoutTankFloor();
    this.dirtyTankOverlay = this.createDirtyTankOverlay();

    for (let i = 0; i < 18; i += 1) {
      const bubble = this.add.circle(
        Phaser.Math.Between(tankBounds.left + 20, tankBounds.right - 20),
        Phaser.Math.Between(tankBounds.top + 20, tankBounds.bottom - 40),
        Phaser.Math.Between(2, 6),
        0xd7f4ff,
        0.28
      );
      this.tankLayer.add(bubble);
      this.tweens.add({
        targets: bubble,
        y: tankBounds.top + Phaser.Math.Between(8, 60),
        alpha: 0,
        duration: Phaser.Math.Between(3500, 7600),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3500),
        onRepeat: () => {
          bubble.x = Phaser.Math.Between(tankBounds.left + 20, tankBounds.right - 20);
          bubble.y = tankBounds.bottom - Phaser.Math.Between(30, 90);
          bubble.alpha = 0.28;
        }
      });
    }
  }

  private createUi(): void {
    this.hudLayout = this.cloneHudLayout(defaultHudLayout);
    this.hudFrameImage = this.add.image(0, 0, "ui-hud-main-long-frame").setDepth(19);
    this.hudPanel = this.add.graphics().setDepth(21);
    this.drawHudPanel();

    this.hudText = this.add.text(24, 44, "", {
      fontFamily: "Arial",
      fontSize: "10px",
      color: "#fff1a6",
      fontStyle: "bold",
      fixedWidth: 292
    }).setDepth(24).setVisible(false);

    this.hudIconImages = {
      common: this.add.image(0, 0, "ui-icon-common-coin").setDisplaySize(hudChipIconSize, hudChipIconSize).setDepth(23),
      rare: this.add.image(0, 0, "ui-icon-rare-coin").setDisplaySize(hudChipIconSize, hudChipIconSize).setDepth(23),
      superRare: this.add.image(0, 0, "ui-icon-super-rare-coin").setDisplaySize(hudSuperRareChipIconSize, hudSuperRareChipIconSize).setDepth(23),
      wealth: this.add.image(0, 0, "ui-icon-total-wealth").setDisplaySize(hudChipIconSize, hudChipIconSize).setDepth(23)
    };

    this.hudCommonText = this.add.text(0, 0, "", {
      fontFamily: "Arial",
      fontSize: "15px",
      color: "#fff1a6",
      fontStyle: "bold",
      fixedWidth: 58,
      stroke: "#3a2400",
      strokeThickness: 3
    }).setOrigin(0, 0.5).setDepth(24);

    this.hudRareText = this.add.text(0, 0, "", {
      fontFamily: "Arial",
      fontSize: "15px",
      color: "#d7f8ff",
      fontStyle: "bold",
      fixedWidth: 58,
      stroke: "#04273d",
      strokeThickness: 3
    }).setOrigin(0, 0.5).setDepth(24);

    this.hudSuperRareText = this.add.text(0, 0, "", {
      fontFamily: "Arial",
      fontSize: "15px",
      color: "#ffd9ff",
      fontStyle: "bold",
      fixedWidth: 58,
      stroke: "#2d073d",
      strokeThickness: 3
    }).setOrigin(0, 0.5).setDepth(24);

    this.hudWealthText = this.add.text(0, 0, "", {
      fontFamily: "Arial",
      fontSize: "15px",
      color: "#ffffff",
      fontStyle: "bold",
      fixedWidth: 58,
      stroke: "#062235",
      strokeThickness: 3
    }).setOrigin(0, 0.5).setDepth(24);

    this.statusText = this.add.text(34, 65, "", {
      fontFamily: "Arial",
      fontSize: "13px",
      color: "#eaf9ff",
      fontStyle: "bold",
      fixedWidth: 356,
      stroke: "#061826",
      strokeThickness: 2
    }).setOrigin(0, 0.5).setDepth(24).setVisible(false);

    this.modeText = this.add.text(36, 84, "", {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#bfeeff",
      fontStyle: "bold",
      fixedWidth: 356
    }).setDepth(24).setVisible(false);

    this.add.image(48, 88, "ui-icon-food-status").setDisplaySize(20, 20).setDepth(23).setVisible(false);
    this.add.image(178, 88, "ui-icon-clean-status").setDisplaySize(20, 20).setDepth(23).setVisible(false);
    this.add.image(307, 88, "ui-icon-happy-status").setDisplaySize(20, 20).setDepth(23).setVisible(false);

    this.hudFoodStatusText = this.add.text(64, 89, "", {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#fff4dc",
      fontStyle: "bold",
      fixedWidth: 94,
      stroke: "#061826",
      strokeThickness: 2
    }).setOrigin(0, 0.5).setDepth(24).setVisible(false);

    this.hudCleanStatusText = this.add.text(194, 89, "", {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#dff8ff",
      fontStyle: "bold",
      fixedWidth: 94,
      stroke: "#061826",
      strokeThickness: 2
    }).setOrigin(0, 0.5).setDepth(24).setVisible(false);

    this.hudHappyStatusText = this.add.text(323, 89, "", {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#e8ffd5",
      fontStyle: "bold",
      fixedWidth: 70,
      stroke: "#061826",
      strokeThickness: 2
    }).setOrigin(0, 0.5).setDepth(24).setVisible(false);

    this.hudNeedText = this.add.text(34, 111, "", {
      fontFamily: "Arial",
      fontSize: "10px",
      color: "#ffe39a",
      fontStyle: "bold",
      fixedWidth: 356
    }).setOrigin(0, 0.5).setDepth(24).setVisible(false);

    this.tankLevelBadgeImage = this.add
      .image(0, 0, "ui-hud-level-medallion")
      .setDepth(22);
    this.tankLevelBadgeHueOverlay = this.add.graphics().setDepth(23);

    this.tankLevelBadgeText = this.add.text(0, 0, "", {
      fontFamily: "Arial",
      fontSize: "30px",
      color: "#fff8d2",
      fontStyle: "bold",
      stroke: "#315467",
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(24);

    this.createScreenNav();
    this.createFoodDock();
    this.createDecorationTrashTarget();
    this.createTabs();
    this.renderTabControls();
    this.applyHudLayout();
  }

  private drawHudPanel(): void {
    this.hudPanel.clear();
    const { chips, rightFrame } = this.hudLayout;
    this.hudPanel.fillStyle(0x76e7ff, 0.12);
    this.hudPanel.fillRoundedRect(rightFrame.x - rightFrame.width / 2 + 16, rightFrame.y - rightFrame.height / 2 + 20, rightFrame.width - 32, rightFrame.height - 48, 14);
    this.hudPanel.fillStyle(0xffffff, 0.1);
    this.hudPanel.fillRoundedRect(rightFrame.x - rightFrame.width / 2 + 24, rightFrame.y - rightFrame.height / 2 + 25, rightFrame.width - 48, 12, 8);

    const chipRects = [
      { ...chips.common, fill: 0xd3a331, line: 0xffef9a },
      { ...chips.rare, fill: 0x0f8fca, line: 0x90eaff },
      { ...chips.superRare, fill: 0x8b2cc1, line: 0xf4b9ff },
      { ...chips.wealth, fill: 0x107fa4, line: 0x9df2ff }
    ];

    for (const chip of chipRects) {
      this.hudPanel.fillStyle(chip.fill, 0.58);
      this.hudPanel.fillRoundedRect(chip.x, chip.y, chip.width, chip.height, 12);
      this.hudPanel.fillStyle(0xffffff, 0.16);
      this.hudPanel.fillRoundedRect(chip.x + 5, chip.y + 3, chip.width - 10, 6, 4);
      this.hudPanel.lineStyle(2, chip.line, 0.72);
      this.hudPanel.strokeRoundedRect(chip.x, chip.y, chip.width, chip.height, 12);
    }
  }

  private applyHudLayout(): void {
    const { levelBadge, rightFrame, chips } = this.hudLayout;
    this.hudFrameImage.setPosition(rightFrame.x, rightFrame.y).setDisplaySize(rightFrame.width, rightFrame.height);
    this.tankLevelBadgeImage.setPosition(levelBadge.x, levelBadge.y).setDisplaySize(levelBadge.size, levelBadge.size);
    this.tankLevelBadgeText.setPosition(levelBadge.x, levelBadge.y);
    this.drawTankLevelBadgeHue(this.tankDisplayLevel());

    this.positionHudChip("common", chips.common, this.hudCommonText);
    this.positionHudChip("rare", chips.rare, this.hudRareText);
    this.positionHudChip("superRare", chips.superRare, this.hudSuperRareText);
    this.positionHudChip("wealth", chips.wealth, this.hudWealthText);

    this.drawHudPanel();
  }

  private positionHudChip(chipId: HudChipId, rect: HudRect, text: Phaser.GameObjects.Text): void {
    const centerY = rect.y + rect.height / 2;
    this.hudIconImages[chipId].setPosition(rect.x + hudChipIconCenterOffsetX, centerY);
    text.setPosition(rect.x + hudChipTextOffsetX, centerY).setFixedSize(Math.max(20, rect.width - hudChipTextOffsetX - 5), 0);
  }

  private drawTankLevelBadgeHue(displayLevel: number): void {
    const { levelBadge } = this.hudLayout;
    const hue = (0.52 + (Math.max(1, displayLevel) - 1) * 0.085) % 1;
    const color = Phaser.Display.Color.HSLToColor(hue, 0.78, 0.5).color;
    this.tankLevelBadgeHueOverlay.clear();
    this.tankLevelBadgeHueOverlay.fillStyle(color, 0.34);
    this.tankLevelBadgeHueOverlay.fillCircle(levelBadge.x, levelBadge.y + levelBadge.size * 0.02, levelBadge.size * 0.34);
  }

  private cloneHudLayout(layout: HudLayout): HudLayout {
    return {
      levelBadge: { ...layout.levelBadge },
      rightFrame: { ...layout.rightFrame },
      chips: {
        common: { ...layout.chips.common },
        rare: { ...layout.chips.rare },
        superRare: { ...layout.chips.superRare },
        wealth: { ...layout.chips.wealth }
      }
    };
  }

  private createDecorationTrashTarget(): void {
    const centerX = decorationTrashZone.centerX;
    const centerY = decorationTrashZone.centerY;
    this.decorationTrashBackground = this.add
      .rectangle(0, 0, decorationTrashZone.width, decorationTrashZone.height, 0x351726, 0.94)
      .setStrokeStyle(2, 0xff8fa3, 0.8);
    const lid = this.add.rectangle(0, -18, 40, 5, 0xff8fa3, 0.92);
    const bin = this.add.rectangle(0, 1, 34, 28, 0x10283a, 1).setStrokeStyle(2, 0xffccd5, 0.85);
    this.decorationTrashText = this.add
      .text(0, 23, "Trash", {
        fontFamily: "Arial",
        fontSize: "11px",
        color: "#ffccd5",
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    this.decorationTrashTarget = this.add
      .container(centerX, centerY, [this.decorationTrashBackground, lid, bin, this.decorationTrashText])
      .setDepth(28)
      .setVisible(false);
  }

  private showDecorationTrashTarget(show: boolean): void {
    if (!this.decorationTrashTarget) {
      return;
    }

    this.decorationTrashTarget.setVisible(show && this.activeScreen === "tank");
    if (!show) {
      this.highlightDecorationTrashTarget(false);
    }
  }

  private highlightDecorationTrashTarget(active: boolean): void {
    if (!this.decorationTrashBackground || !this.decorationTrashText) {
      return;
    }

    this.decorationTrashBackground.setFillStyle(active ? 0x6b1f38 : 0x351726, active ? 0.98 : 0.94);
    this.decorationTrashBackground.setStrokeStyle(2, active ? 0xffd166 : 0xff8fa3, active ? 1 : 0.8);
    this.decorationTrashText.setColor(active ? "#ffe39a" : "#ffccd5");
  }

  private tankViewScaleForLevel(level = this.tankLevel): number {
    return 1;
  }

  private maxFishCapacityForLevel(level = this.tankLevel): number {
    const displayLevel = this.tankDisplayLevel(level);
    if (displayLevel <= 5) {
      return fishCapacityByCatalogTankLevel[Math.max(1, displayLevel)] ?? fishCapacityByCatalogTankLevel[1];
    }

    return fishCapacityByCatalogTankLevel[5] + (displayLevel - 5) * 6;
  }

  private activeFish(): Fish[] {
    return this.fish.filter((currentFish) => currentFish.tankLevel === this.tankLevel);
  }

  private activeHelperCreatures(): HelperCreature[] {
    return this.helperCreatures.filter((helper) => helper.tankLevel === this.tankLevel);
  }

  private fishInTank(level: number): Fish[] {
    return this.fish.filter((currentFish) => currentFish.tankLevel === level);
  }

  private helpersInTank(level: number): HelperCreature[] {
    return this.helperCreatures.filter((helper) => helper.tankLevel === level);
  }

  private activeDecorations(): PlacedDecoration[] {
    return this.placedDecorations.filter((decoration) => decoration.tankLevel === this.tankLevel);
  }

  private decorationsInTank(level: number): PlacedDecoration[] {
    return this.placedDecorations.filter((decoration) => decoration.tankLevel === level);
  }

  private createDefaultTankState(level: number): TankRuntimeState {
    return {
      wallet: level === 1 ? createWallet(120, 0, 0) : createEmptyWallet(),
      foodInventory: new Map<FoodTypeId, number>(level === 1 ? [[basicFood.id, 3]] : []),
      fishInventory: new Map<string, number>(),
      decorationInventory: new Map<string, number>(),
      creatureInventory: new Map<string, number>(),
      backgroundInventory: new Map<string, number>([[this.defaultTankCosmeticId(level), 1]]),
      seabedInventory: new Map<string, number>([[this.defaultTankCosmeticId(level), 1]]),
      selectedBackgroundId: this.defaultTankCosmeticId(level),
      selectedSeabedId: this.defaultTankCosmeticId(level),
      cleanliness: 100,
      cleanedAt: Date.now()
    };
  }

  private ensureTankState(level = this.tankLevel): TankRuntimeState {
    const sanitizedLevel = Math.max(1, Math.floor(level));
    let state = this.tankStates.get(sanitizedLevel);
    if (!state) {
      state = this.createDefaultTankState(sanitizedLevel);
      this.tankStates.set(sanitizedLevel, state);
    }
    const fallbackCosmeticId = this.defaultTankCosmeticId(sanitizedLevel);
    if (!state.backgroundInventory) {
      state.backgroundInventory = new Map<string, number>([[fallbackCosmeticId, 1]]);
    }
    if (!state.seabedInventory) {
      state.seabedInventory = new Map<string, number>([[fallbackCosmeticId, 1]]);
    }
    state.selectedBackgroundId ??= fallbackCosmeticId;
    state.selectedSeabedId ??= fallbackCosmeticId;
    return state;
  }

  private captureActiveTankState(): void {
    const state = this.ensureTankState(this.tankLevel);
    this.tankStates.set(this.tankLevel, {
      wallet: this.wallet,
      foodInventory: this.foodInventory,
      fishInventory: this.fishInventory,
      decorationInventory: this.decorationInventory,
      creatureInventory: this.creatureInventory,
      backgroundInventory: state.backgroundInventory,
      seabedInventory: state.seabedInventory,
      selectedBackgroundId: state.selectedBackgroundId,
      selectedSeabedId: state.selectedSeabedId,
      cleanliness: this.cleanliness,
      cleanedAt: this.cleanedAt
    });
  }

  private applyTankState(level = this.tankLevel): void {
    const state = this.ensureTankState(level);
    this.wallet = state.wallet;
    this.foodInventory = state.foodInventory;
    this.fishInventory = state.fishInventory;
    this.decorationInventory = state.decorationInventory;
    this.creatureInventory = state.creatureInventory;
    this.cleanliness = state.cleanliness;
    this.cleanedAt = state.cleanedAt;
  }

  private sortedOwnedTankLevels(): number[] {
    return [...this.ownedTankLevels].sort((a, b) => a - b);
  }

  private hasTankLevel(level: number): boolean {
    return this.ownedTankLevels.has(Math.max(1, Math.floor(level)));
  }

  private defaultTankCosmeticId(level: number): string {
    if (level <= 1) {
      return "home";
    }

    return this.currentTankTheme(level).id;
  }

  private currentTankTheme(level = this.tankLevel): TankThemeTexturePair {
    return tankThemeTexturePairs[Math.abs(Math.floor(level - 2)) % tankThemeTexturePairs.length];
  }

  private themedTankTextureKeys(level = this.tankLevel): { backgroundKey: string; floorKey: string } {
    const state = this.ensureTankState(level);
    const background = this.tankCosmeticById("background", state.selectedBackgroundId);
    const seabed = this.tankCosmeticById("seabed", state.selectedSeabedId);
    return {
      backgroundKey: background?.textureKey ?? aquariumBackgroundTextureKey,
      floorKey: seabed?.textureKey ?? aquariumFloorTextureKey
    };
  }

  private tankThemeTint(level: number): number {
    if (level <= 1) {
      return 0xffffff;
    }

    const tintPalette = [0xffffff, 0xfff5ee, 0xe8fff2, 0xf1fbff, 0xdce9ff, 0xfff0dd];
    return tintPalette[Math.abs(Math.floor(level - 2)) % tintPalette.length];
  }

  private createTankBackground(): Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle {
    const textureKeys = this.themedTankTextureKeys();
    if (this.textures.exists(textureKeys.backgroundKey)) {
      return this.add.image(tankBounds.centerX, tankBounds.centerY, textureKeys.backgroundKey);
    }

    if (this.textures.exists(aquariumBackgroundTextureKey)) {
      return this.add.image(tankBounds.centerX, tankBounds.centerY, aquariumBackgroundTextureKey);
    }

    return this.add.rectangle(tankBounds.centerX, tankBounds.centerY, tankBounds.width, tankBounds.height, tankFallbackBaseColor, 1);
  }

  private createOptionalTankOverlay(textureKey: string, alpha: number): Phaser.GameObjects.Image | undefined {
    if (!this.textures.exists(textureKey)) {
      return undefined;
    }

    return this.add.image(tankBounds.centerX, tankBounds.centerY, textureKey).setAlpha(alpha);
  }

  private createTankFloor(): Phaser.GameObjects.Image {
    const textureKeys = this.themedTankTextureKeys();
    const textureKey = this.textures.exists(textureKeys.floorKey) ? textureKeys.floorKey : aquariumFloorTextureKey;
    return this.add.image(tankBounds.centerX, tankBounds.bottom, textureKey).setOrigin(0.5, 1).setDepth(2);
  }

  private createDirtyTankOverlay(): Phaser.GameObjects.Image | undefined {
    if (!this.textures.exists(dirtyTankOverlayTextureKey)) {
      return undefined;
    }

    const overlay = this.add
      .image(tankViewportBounds.centerX, tankViewportBounds.centerY, dirtyTankOverlayTextureKey)
      .setDisplaySize(tankViewportBounds.width, tankViewportBounds.height)
      .setDepth(17)
      .setAlpha(0)
      .setVisible(false);
    this.updateDirtyTankOverlay(overlay);
    return overlay;
  }

  private updateDirtyTankOverlay(overlay = this.dirtyTankOverlay): void {
    if (!overlay) {
      return;
    }

    const dirtyRatio = Phaser.Math.Clamp((dirtyTankOverlayThreshold - this.cleanliness) / dirtyTankOverlayThreshold, 0, 1);
    const visible = dirtyRatio > 0;
    overlay.setVisible(visible);
    overlay.setAlpha(visible ? Phaser.Math.Linear(0.18, dirtyTankOverlayMaxAlpha, dirtyRatio) : 0);
  }

  private applyTankViewScale(): void {
    if (!this.tankLayer) {
      return;
    }

    const scale = 1;
    setTankWorldScale(scale);
    this.tankLayer.setScale(1);
    this.tankLayer.setPosition(0, 0);
    this.layoutTankBackground();
    this.layoutTankFloor();
    this.refreshTankScaledDropSizes();
  }

  private layoutTankBackground(): void {
    if (!this.tankBackground) {
      return;
    }

    const scale = Math.max(0.01, this.tankViewScaleForLevel());
    const screenCompensatedWidth = tankBounds.width / scale;
    const screenCompensatedHeight = tankBounds.height / scale;
    this.tankBackground.setPosition(tankBounds.centerX, tankBounds.centerY);
    if (this.tankBackground instanceof Phaser.GameObjects.Image) {
      const textureKeys = this.themedTankTextureKeys();
      this.tankBackground.setTexture(this.textures.exists(textureKeys.backgroundKey) ? textureKeys.backgroundKey : aquariumBackgroundTextureKey);
      this.tankBackground.setDisplaySize(screenCompensatedWidth, screenCompensatedHeight);
      this.tankBackground.setAlpha(1);
      this.tankBackground.setTint(this.tankThemeTint(this.tankLevel));
    } else {
      this.tankBackground.setSize(screenCompensatedWidth, screenCompensatedHeight);
    }

    for (const overlay of [this.tankDistantOverlay]) {
      overlay?.setPosition(tankBounds.centerX, tankBounds.centerY);
      overlay?.setDisplaySize(screenCompensatedWidth, screenCompensatedHeight);
    }
  }

  private layoutTankFloor(): void {
    if (!this.tankSand) {
      return;
    }

    const scale = Math.max(0.01, this.tankViewScaleForLevel());
    const textureKeys = this.themedTankTextureKeys();
    this.tankSand.setTexture(this.textures.exists(textureKeys.floorKey) ? textureKeys.floorKey : aquariumFloorTextureKey);
    this.tankSand.setOrigin(0.5, 1);
    this.tankSand.setPosition(tankBounds.centerX, tankBounds.bottom);
    const displayHeight = tankBounds.height / 6 / scale;
    this.tankSand.setDisplaySize(tankBounds.width / scale, displayHeight);
    this.tankSand.clearTint();
  }

  private screenToTankPoint(x: number, y: number): Phaser.Math.Vector2 {
    const scale = this.tankViewScaleForLevel();
    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp((x - this.tankLayer.x) / scale, tankBounds.left, tankBounds.right),
      Phaser.Math.Clamp((y - this.tankLayer.y) / scale, tankBounds.top, tankBounds.bottom)
    );
  }

  private pointerDesignPoint(pointer: Phaser.Input.Pointer): Phaser.Math.Vector2 {
    const renderScale = this.currentRenderScale();
    return new Phaser.Math.Vector2(pointer.x / renderScale, pointer.y / renderScale);
  }

  private tankToScreenPoint(x: number, y: number): { x: number; y: number } {
    const scale = this.tankViewScaleForLevel();
    return {
      x: this.tankLayer.x + x * scale,
      y: this.tankLayer.y + y * scale
    };
  }

  private refreshTankScaledDropSizes(): void {
    const scale = this.tankViewScaleForLevel();
    this.foods.forEach((food) => food.setWorldScaleCompensation(scale));
    this.coinDrops.forEach((coin) => coin.setWorldScaleCompensation(scale));
  }

  private createScreenNav(): void {
    this.screenButtons.forEach((button) => button.destroy(true));
    this.screenButtons = [];

    if (this.activeScreen !== "tank") {
      return;
    }

    const screens: { label: string; screen: Exclude<AppScreen, "tank">; y: number }[] = [
      { label: "Shop", screen: "store", y: 218 },
      { label: "Care", screen: "care", y: 286 },
      { label: "Book", screen: "album", y: 354 },
      { label: "Tanks", screen: "tanks", y: 422 },
      { label: "Goal", screen: "goals", y: 490 },
      { label: "Set", screen: "settings", y: 558 }
    ];

    for (const screen of screens) {
      this.screenButtons.push(
        this.createIconButton(
          gameWidth - 42,
          screen.y,
          screen.label,
          () => {
            this.openScreen(screen.screen);
          },
          0x10283a,
          menuIconTextureByScreen[screen.screen]
        )
      );
    }
  }

  private createFoodDock(): void {
    this.clearFoodDragGhosts();
    this.foodButtons.forEach((button) => button.destroy(true));
    this.foodButtons = [];

    if (this.activeScreen !== "tank") {
      return;
    }

    const visibleFood = foodTypes.filter((foodType) => this.isDroppableFood(foodType.id) && this.getFoodInventory(foodType.id) > 0).slice(0, 5);
    visibleFood.forEach((foodType, index) => {
      const y = 218 + index * 68;
      const foodButton = this.createIconButton(
        42,
        y,
        this.foodIconLabel(foodType),
        () => {
          this.selectedFoodTypeId = foodType.id;
        },
        0x10283a,
        this.foodTextureKey(foodType.id),
        foodTintFor(foodType.id)
      );
      this.enableFoodDrag(foodButton, foodType);
      this.foodButtons.push(foodButton);
    });
  }

  private enableFoodDrag(button: Phaser.GameObjects.Container, foodType: FoodType): void {
    let dragGhost: Phaser.GameObjects.Image | undefined;
    const destroyDragGhost = () => {
      if (!dragGhost) {
        return;
      }

      this.foodDragGhosts.delete(dragGhost);
      dragGhost.destroy();
      dragGhost = undefined;
    };

    const cleanupDragListeners = () => {
      this.input.off("pointerup", destroyDragGhost);
      this.input.off("gameout", destroyDragGhost);
      destroyDragGhost();
    };

    this.input.setDraggable(button, true);
    button.on("dragstart", (pointer: Phaser.Input.Pointer) => {
      destroyDragGhost();
      const pointerPoint = this.pointerDesignPoint(pointer);
      dragGhost = this.add
        .image(pointerPoint.x, pointerPoint.y, this.foodTextureKey(foodType.id))
        .setDisplaySize(28, 28)
        .setAlpha(0.9)
        .setDepth(80);
      if (foodType.id !== "medicine" && foodType.id !== evolvePillFoodTypeId) {
        dragGhost.setTint(foodTintFor(foodType.id));
      }
      this.foodDragGhosts.add(dragGhost);
    });
    button.on("drag", (pointer: Phaser.Input.Pointer) => {
      const pointerPoint = this.pointerDesignPoint(pointer);
      dragGhost?.setPosition(pointerPoint.x, pointerPoint.y);
    });
    button.on("dragend", (pointer: Phaser.Input.Pointer) => {
      const pointerPoint = this.pointerDesignPoint(pointer);
      destroyDragGhost();

      if (!tankViewportBounds.contains(pointerPoint.x, pointerPoint.y)) {
        return;
      }

      const tankPoint = this.screenToTankPoint(pointerPoint.x, pointerPoint.y);
      this.dropFoodAt(foodType.id, tankPoint.x, tankPoint.y);
    });
    this.input.on("pointerup", destroyDragGhost);
    this.input.on("gameout", destroyDragGhost);
    button.once("destroy", cleanupDragListeners);
  }

  private clearFoodDragGhosts(): void {
    this.foodDragGhosts.forEach((dragGhost) => dragGhost.destroy());
    this.foodDragGhosts.clear();
  }

  private createIconButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    fill: number,
    iconTextureKey?: string,
    iconTint?: number
  ): Phaser.GameObjects.Container {
    const objects: Phaser.GameObjects.GameObject[] = [];
    const hasIcon = iconTextureKey !== undefined && this.textures.exists(iconTextureKey);
    const isSelectedFood = fill !== 0x10283a;
    const isFoodButton = label.includes("\n");
    const bubbleTextureKey =
      isSelectedFood && this.textures.exists(bubbleButtonPressedTextureKey) ? bubbleButtonPressedTextureKey : bubbleButtonFrameTextureKey;
    const fillRadius = isFoodButton ? 19 : 20;
    const glassFill = this.add.graphics();
    glassFill.fillStyle(0xffffff, isSelectedFood ? 0.24 : 0.17);
    glassFill.fillCircle(0, isFoodButton ? -5 : -6, fillRadius);
    glassFill.fillStyle(0xffffff, isSelectedFood ? 0.16 : 0.1);
    glassFill.fillEllipse(-7, isFoodButton ? -13 : -14, 17, 9);
    objects.push(glassFill);
    if (this.textures.exists(bubbleTextureKey)) {
      const frame = this.add.image(0, isFoodButton ? -5 : -6, bubbleTextureKey);
      frame.setDisplaySize(isFoodButton ? 60 : 62, isFoodButton ? 60 : 62);
      frame.setAlpha(isSelectedFood ? 1 : 0.92);
      if (isSelectedFood) {
        frame.setTint(Phaser.Display.Color.GetColor(
          Phaser.Math.Clamp(((fill >> 16) & 0xff) + 24, 0, 255),
          Phaser.Math.Clamp(((fill >> 8) & 0xff) + 24, 0, 255),
          Phaser.Math.Clamp((fill & 0xff) + 24, 0, 255)
        ));
      }
      objects.push(frame);
    }
    const highlight = this.add.graphics();
    const highlightY = isFoodButton ? -16 : -17;
    highlight.fillStyle(0xffffff, isSelectedFood ? 0.32 : 0.24);
    highlight.fillEllipse(-2, highlightY, 15, 8);
    highlight.fillStyle(0xe9fbff, isSelectedFood ? 0.2 : 0.14);
    highlight.fillEllipse(-7, highlightY + 6, 7, 4);
    highlight.lineStyle(2, 0xffffff, isSelectedFood ? 0.34 : 0.26);
    highlight.beginPath();
    highlight.arc(1, isFoodButton ? -4 : -5, 20, Phaser.Math.DegToRad(212), Phaser.Math.DegToRad(258), false);
    highlight.strokePath();
    objects.push(highlight);
    if (hasIcon) {
      const icon = this.add.image(0, isFoodButton ? -6 : -7, iconTextureKey);
      const maxIconSize = isFoodButton ? (isSelectedFood ? 39 : 37) : 36;
      const scale = Math.min(maxIconSize / Math.max(1, icon.width), maxIconSize / Math.max(1, icon.height));
      icon.setDisplaySize(icon.width * scale, icon.height * scale);
      if (iconTint !== undefined) {
        icon.setTint(iconTint);
      }
      objects.push(icon);
    }
    const text = this.add
      .text(0, hasIcon ? 23 : 0, label, {
        fontFamily: "Arial",
        fontSize: hasIcon ? "8px" : "10px",
        color: isSelectedFood ? this.hexColor(fill) : "#ffffff",
        align: "center",
        fixedWidth: 52,
        stroke: "#062235",
        strokeThickness: 3
      })
      .setOrigin(0.5);
    objects.push(text);
    const button = this.add.container(x, y, objects);
    button.setSize(64, 64);
    button.setDepth(35);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  private hexColor(color: number): string {
    return `#${color.toString(16).padStart(6, "0")}`;
  }

  private openScreen(screen: Exclude<AppScreen, "tank">): void {
    this.activeScreen = screen;
    this.placementMode = { kind: "none" };
    this.closeModal();
    this.createScreenNav();
    this.createFoodDock();
    this.createTabs();
    this.renderTabControls();
    this.refreshUi(false);
  }

  private closePage(): void {
    this.activeScreen = "tank";
    this.pagePanel?.destroy(true);
    this.pagePanel = undefined;
    this.tabControls.forEach((control) => control.destroy(true));
    this.tabControls = [];
    this.tabButtons.forEach((button) => button.destroy(true));
    this.tabButtons = [];
    this.createScreenNav();
    this.createFoodDock();
    this.refreshUi(false);
  }

  private createTabs(): void {
    this.tabButtons.forEach((button) => button.destroy(true));
    this.tabButtons = [];

    if (this.activeScreen !== "store") {
      return;
    }

    const tabs: { label: string; tab: StoreTab; x: number; width: number }[] = [
      { label: "Fish", tab: "fish", x: 20, width: 118 },
      { label: "Food", tab: "food", x: 156, width: 118 },
      { label: "Help", tab: "creature", x: 292, width: 118 }
    ];

    for (const tab of tabs) {
      const tabButton = this.createButton(
        tab.x,
        controlPanelTop + 48,
        tab.width,
        28,
        tab.label,
        () => {
          this.activeTab = tab.tab;
          this.createTabs();
          this.renderTabControls();
          this.refreshUi(false);
        },
        this.activeTab === tab.tab ? 0x3c93bd : 0x254d68,
        14
      ).setDepth(72);
      this.tabButtons.push(tabButton);
    }
  }

  private renderTabControls(): void {
    this.tabControls.forEach((control) => control.destroy(true));
    this.tabControls = [];
    this.pagePanel?.destroy(true);
    this.pagePanel = undefined;

    if (this.activeScreen === "tank") {
      return;
    }

    this.createPagePanel(this.pageTitle());

    if (this.activeScreen !== "store") {
      this.renderScreenControls();
      return;
    }

    if (this.activeTab === "fish") {
      this.tabControls.push(
        this.createInfoLine(20, controlPanelTop + 20, `All fish available | Active ${this.getTankName(this.tankLevel)}`),
        this.createButton(286, controlPanelTop + 16, 124, 26, "Tanks", () => this.openScreen("tanks"), 0x256f95, 11)
      );
      this.renderStoreCoinFilter();
      this.renderFishCatalog();
      return;
    }

    this.renderStoreCoinFilter();

    if (this.activeTab === "food") {
      this.renderFoodCatalog();
      return;
    }

    if (this.activeTab === "tank") {
      this.renderTankCatalog();
      return;
    }

    if (this.activeTab === "decor") {
      this.renderDecorationCatalog();
      return;
    }

    this.renderHelperCreatureCatalog();
  }

  private renderFishCatalog(): void {
    const visibleFish = this.visibleFishCatalog();
    this.renderEmptyStoreMessage(visibleFish.length, controlPanelTop + 138);
    visibleFish.forEach((fishType, index) => {
      const owned = this.getFishInventory(fishType.id);
      const canUseTank = this.activeFish().length < this.maxFishCapacityForLevel();
      const buyLabel = canUseTank ? "Buy" : "Tank Full";
      this.addShopCard({
        x: 20 + (index % 2) * 202,
        y: controlPanelTop + 136 + Math.floor(index / 2) * 84,
        width: 188,
        height: 76,
        title: fishType.name,
        meta: `${this.rarityStarsLabel(fishType.rarity)} ${this.rarityLabel(fishType.rarity)} | ${formatPrice(fishType.price)} | Own ${formatNumber(owned)}`,
        detail: canUseTank ? `${this.fishTypeProductionHint(fishType)} | Added to active tank` : "Active tank full",
        buyLabel,
        onBuy: () => this.buyFish(fishType),
        accent: fishFoodTintFor(fishType),
        fishPreview: fishType
      });
    });
  }

  private renderFoodCatalog(): void {
    const visibleFoods = this.visibleFoodCatalog();
    this.renderEmptyStoreMessage(visibleFoods.length, controlPanelTop + 138);
    visibleFoods.forEach((foodType, index) => {
      const owned = this.getFoodInventory(foodType.id);
      const buyQuantity = this.getFoodBuyQuantity(foodType.id);
      const totalPrice = this.quantityPrice(foodType.price, buyQuantity);
      this.addShopCard({
        x: 20 + (index % 2) * 202,
        y: controlPanelTop + 136 + Math.floor(index / 2) * 140,
        width: 188,
        height: 132,
        title: foodType.name,
        meta: `${this.rarityLabel(foodType.rarity)} | D${formatNumber(foodType.densityLevel)} | ${formatNumber(foodType.calories)} cal | Own ${formatNumber(owned)}`,
        detail: foodType.id === evolvePillFoodTypeId ? "50% evolve chance" : foodType.id === "medicine" ? "Low-cal heal pill" : foodType.acceptedByDefault ? "General calories" : "Species calories",
        buyLabel: `Buy ${formatPrice(totalPrice)}`,
        onBuy: () => this.buyFood(foodType, buyQuantity),
        accent: foodTintFor(foodType.id),
        assetPreview: { textureKey: this.foodTextureKey(foodType.id), maxWidth: 42, maxHeight: 38, tint: foodTintFor(foodType.id) },
        quantity: {
          label: `x${formatNumber(buyQuantity)}`,
          onReset: () => this.resetFoodBuyQuantity(foodType.id),
          presets: foodBulkBuyQuantities,
          onAdd: (quantity) => this.addFoodBuyQuantity(foodType.id, quantity)
        }
      });
    });
  }

  private renderTankCatalog(): void {
    const visibleLevels = this.visibleTankCatalogLevels();
    const maxPage = Math.max(1, Math.ceil(visibleLevels.length / tankShopPageSize));
    this.tankCatalogPage = Phaser.Math.Clamp(this.tankCatalogPage, 1, maxPage);
    const pageStart = (this.tankCatalogPage - 1) * tankShopPageSize;
    const pageLevels = visibleLevels.slice(pageStart, pageStart + tankShopPageSize);

    this.tabControls.push(
      this.createButton(20, controlPanelTop + 116, 38, 24, "<", () => this.changeTankCatalogPage(-1), 0x254d68, 12),
      this.createInfoLine(64, controlPanelTop + 120, `Tank shop ${formatNumber(this.tankCatalogPage)}/${formatNumber(maxPage)} | Slots 1-${formatNumber(maxOwnedTanks)}`),
      this.createButton(362, controlPanelTop + 116, 38, 24, ">", () => this.changeTankCatalogPage(1), 0x254d68, 12)
    );

    this.renderEmptyStoreMessage(pageLevels.length, controlPanelTop + 150);
    pageLevels.forEach((level, index) => this.addTankShopCard(level, index));
  }

  private addTankShopCard(level: number, index: number): void {
    const x = 20 + (index % 2) * 202;
    const y = controlPanelTop + 150 + Math.floor(index / 2) * 92;
    const width = 188;
    const height = 84;
    const owned = this.hasTankLevel(level);
    const active = level === this.tankLevel;
    const count = this.fishInTank(level).length;
    const capacity = this.maxFishCapacityForLevel(level);
    const price = this.tankPriceForLevel(level);
    const displayLevel = this.tankDisplayLevel(level);
    const accent = this.tankAccentColor(level);
    const background = this.add.rectangle(width / 2, height / 2, width, height, 0x17364a, 0.98).setStrokeStyle(1, accent, 0.9);
    const title = this.add.text(12, 6, `${this.getTankName(level)} Lv${formatNumber(displayLevel)}`, {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#ffffff",
      fontStyle: "bold",
      fixedWidth: 108
    });
    const meta = this.add.text(12, 22, `Worth ${formatNumber(this.calculateTankNetWorth(level))} | ${formatNumber(count)}/${formatNumber(capacity)} fish`, {
      fontFamily: "Arial",
      fontSize: "8px",
      color: "#ffe67a",
      fixedWidth: 108
    });
    const detail = this.add.text(12, 36, owned ? this.tankSummary(level) : `${formatPrice(price)} | ${this.tankTierLabel(level)}`, {
      fontFamily: "Arial",
      fontSize: "8px",
      color: "#cfeeff",
      fixedWidth: 108
    });
    const cardObjects: Phaser.GameObjects.GameObject[] = [
      background,
      ...this.createTankThumbnailObjects(148, 34, level, 54, 36, owned),
      title,
      meta,
      detail
    ];
    const card = this.add.container(x, y, cardObjects).setDepth(71);
    this.tabControls.push(card);
    this.tabControls.push(
      this.createButton(
        x + 12,
        y + height - 24,
        width - 24,
        18,
        active ? "Active" : owned ? "Switch" : `Buy ${formatPrice(price)}`,
        () => (owned ? this.switchTank(level) : this.buyTank(level)),
        active ? 0x356a35 : canAfford(this.wallet, price) || owned ? 0x256f95 : 0x76512d,
        8
      )
    );
  }

  private renderDecorationCatalog(): void {
    const visibleDecorations = this.visibleDecorationCatalog();
    this.renderEmptyStoreMessage(visibleDecorations.length, controlPanelTop + 138);
    visibleDecorations.forEach((decorationType, index) => {
      const owned = this.getDecorationInventory(decorationType.id);
      this.addShopCard({
        x: 20 + (index % 2) * 202,
        y: controlPanelTop + 136 + Math.floor(index / 2) * 84,
        width: 188,
        height: 74,
        title: decorationType.name,
        meta: `${this.rarityLabel(decorationType.rarity)} | +${formatNumber(decorationType.happinessBonus)} happy | Own ${formatNumber(owned)}`,
        detail: decorationType.habitatTags.slice(0, 2).join(", "),
        buyLabel: `Buy ${formatPrice(decorationType.price)}`,
        onBuy: () => this.buyDecoration(decorationType),
        accent: this.rarityCatalogAccent(decorationType.rarity),
        assetPreview: { textureKey: decorationType.texture, maxWidth: 52, maxHeight: 46 }
      });
    });
  }

  private renderHelperCreatureCatalog(): void {
    const visibleCreatures = this.visibleHelperCreatureCatalog();
    this.renderEmptyStoreMessage(visibleCreatures.length, controlPanelTop + 138);
    visibleCreatures.forEach((creatureType, index) => {
      const owned = this.activeHelperCreatures().filter((helper) => helper.type.id === creatureType.id).length + this.getCreatureInventory(creatureType.id);
      this.addShopCard({
        x: 20 + (index % 2) * 202,
        y: controlPanelTop + 136 + Math.floor(index / 2) * 90,
        width: 188,
        height: 82,
        title: creatureType.name,
        meta: `${this.rarityLabel(creatureType.rarity)} | ${formatPrice(creatureType.price)} | Own ${formatNumber(owned)}`,
        detail: creatureType.feedSeconds
          ? `Feeds fish | every ${formatNumber(creatureType.feedSeconds)}s`
          : `Cleans food | coins ${formatNumber(creatureType.coinCollectSeconds)}s`,
        buyLabel: "Buy",
        onBuy: () => this.buyHelperCreature(creatureType),
        accent: this.rarityCatalogAccent(creatureType.rarity),
        assetPreview: { textureKey: creatureType.texture, maxWidth: 52, maxHeight: 38 }
      });
    });
  }

  private renderStoreCoinFilter(): void {
    const coinLanes: Array<{ coinType: CoinType; label: string; fill: number }> = [
      { coinType: "common", label: "Common C", fill: 0x99722b },
      { coinType: "rare", label: "Rare R", fill: 0x236f8c },
      { coinType: "superRare", label: "Super SR", fill: 0x7b3f98 }
    ];

    coinLanes.forEach((lane, index) => {
      const active = this.storeCoinFilter === lane.coinType;
      this.tabControls.push(
        this.createButton(
          20 + index * 134,
          controlPanelTop + 82,
          122,
          28,
          lane.label,
          () => this.setStoreCoinFilter(lane.coinType),
          active ? lane.fill : 0x254d68,
          11
        )
      );
    });
  }

  private renderEmptyStoreMessage(visibleCount: number, y: number): void {
    if (visibleCount > 0) {
      return;
    }

    this.tabControls.push(
      this.createInfoLine(
        20,
        y,
        `No ${this.storeCoinLabel(this.storeCoinFilter)} items in this section. Try another coin lane or fish tank level.`
      )
    );
  }

  private visibleFishCatalog(): FishType[] {
    return fishTypes.filter(
      (fishType) =>
        this.matchesStoreCoinFilter(fishType.price)
    );
  }

  private visibleFoodCatalog(): FoodType[] {
    return foodTypes.filter((foodType) => this.matchesStoreCoinFilter(foodType.price));
  }

  private visibleTankCatalogLevels(): number[] {
    const levels = Array.from({ length: maxOwnedTanks }, (_unused, index) => index + 1);
    return levels.filter((level) => level === 1 || this.matchesStoreCoinFilter(this.tankPriceForLevel(level)));
  }

  private changeTankCatalogPage(direction: number): void {
    const maxPage = Math.max(1, Math.ceil(this.visibleTankCatalogLevels().length / tankShopPageSize));
    this.tankCatalogPage = Phaser.Math.Clamp(this.tankCatalogPage + direction, 1, maxPage);
    this.renderTabControls();
  }

  private visibleDecorationCatalog(): DecorationType[] {
    return decorationTypes.filter((decorationType) => this.matchesStoreCoinFilter(decorationType.price));
  }

  private visibleHelperCreatureCatalog(): HelperCreatureType[] {
    return helperCreatureTypes.filter((creatureType) => this.matchesStoreCoinFilter(creatureType.price));
  }

  private visibleStoreCatalogCount(): number {
    if (this.activeTab === "fish") {
      return this.visibleFishCatalog().length;
    }

    if (this.activeTab === "food") {
      return this.visibleFoodCatalog().length;
    }

    if (this.activeTab === "decor") {
      return this.visibleDecorationCatalog().length;
    }

    if (this.activeTab === "tank") {
      return this.visibleTankCatalogLevels().length;
    }

    return this.visibleHelperCreatureCatalog().length;
  }

  private matchesStoreCoinFilter(price: FishType["price"]): boolean {
    return price.coinType === this.storeCoinFilter;
  }

  private setStoreCoinFilter(coinType: CoinType): void {
    this.storeCoinFilter = coinType;
    this.tankCatalogPage = 1;
    this.renderTabControls();
    this.refreshUi(false);
  }

  private storeCoinLabel(coinType: CoinType): string {
    const labelByCoin: Record<CoinType, string> = {
      common: "Common",
      rare: "Rare",
      superRare: "Super Rare"
    };

    return labelByCoin[coinType];
  }

  private rarityCatalogAccent(rarity: DecorationType["rarity"]): number {
    const accentByRarity: Record<DecorationType["rarity"], number> = {
      common: 0x4ca37a,
      rare: 0x5fa6d6,
      superRare: 0xd379d7
    };

    return accentByRarity[rarity];
  }

  private addShopCard(options: {
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    meta: string;
    detail: string;
    buyLabel: string;
    onBuy: () => void;
    accent: number;
    compact?: boolean;
    fishPreview?: FishType;
    assetPreview?: {
      textureKey: string;
      maxWidth: number;
      maxHeight: number;
      tint?: number;
    };
    quantity?: {
      label: string;
      onReset: () => void;
      presets?: number[];
      onAdd?: (quantity: number) => void;
    };
  }): void {
    const background = this.add
      .rectangle(options.width / 2, options.height / 2, options.width, options.height, 0x17364a, 0.98)
      .setStrokeStyle(1, options.accent, 0.9);
    const stripe = this.add.rectangle(4, options.height / 2, 4, options.height - 8, options.accent, 1);
    const hasPreview = options.fishPreview !== undefined || options.assetPreview !== undefined;
    const textWidth = hasPreview ? options.width - 78 : options.width - 24;
    const title = this.add.text(12, 5, options.title, {
      fontFamily: "Arial",
      fontSize: options.compact ? "11px" : "12px",
      color: "#ffffff",
      fontStyle: "bold",
      fixedWidth: options.compact ? 76 : textWidth
    });
    const meta = this.add.text(12, options.compact ? 18 : 22, options.meta, {
      fontFamily: "Arial",
      fontSize: "9px",
      color: "#ffe67a",
      fixedWidth: options.compact ? 76 : textWidth
    });
    const detail = this.add.text(12, options.compact ? 29 : 36, options.detail, {
      fontFamily: "Arial",
      fontSize: "9px",
      color: "#cfeeff",
      fixedWidth: options.compact ? 56 : textWidth
    });
    const cardObjects: Phaser.GameObjects.GameObject[] = [background, stripe, title, meta, detail];

    if (options.fishPreview) {
      cardObjects.push(...this.createFishCatalogPreview(options.fishPreview, options.width - 32, 32));
    }
    if (options.assetPreview && this.textures.exists(options.assetPreview.textureKey)) {
      const preview = this.add.image(options.width - 32, options.compact ? 30 : Math.min(42, options.height / 2), options.assetPreview.textureKey);
      const sourceWidth = Math.max(1, preview.width);
      const sourceHeight = Math.max(1, preview.height);
      const scale = Math.min(options.assetPreview.maxWidth / sourceWidth, options.assetPreview.maxHeight / sourceHeight);
      preview.setDisplaySize(sourceWidth * scale, sourceHeight * scale);
      if (options.assetPreview.tint !== undefined) {
        preview.setTint(options.assetPreview.tint);
      }
      preview.setDepth(73);
      cardObjects.push(preview);
    }

    const card = this.add.container(options.x, options.y, cardObjects).setDepth(this.activeScreen === "tank" ? 21 : 71);
    this.tabControls.push(card);

    if (options.quantity) {
      const quantityY = options.y + options.height - 76;
      this.tabControls.push(
        this.createButton(options.x + 12, quantityY, 108, 20, `Qty ${options.quantity.label}`, () => undefined, 0x17364a, 10),
        this.createButton(options.x + 124, quantityY, 52, 20, "Reset", options.quantity.onReset, 0x76512d, 8)
      );

      if (options.quantity.presets && options.quantity.onAdd) {
        const presetY = options.y + options.height - 50;
        options.quantity.presets.forEach((quantity, index) => {
          this.tabControls.push(
            this.createButton(
              options.x + 12 + index * 33,
              presetY,
              29,
              20,
              `x${formatNumber(quantity)}`,
              () => options.quantity?.onAdd?.(quantity),
              0x254d68,
              8
            )
          );
        });
      }
    }

    const buttonY = options.y + options.height - (options.compact ? 12 : 24);
    const buttonHeight = options.compact ? 17 : 20;
    const buttonWidth = options.compact ? 76 : options.width - 24;
    this.tabControls.push(
      this.createButton(options.x + 12, buttonY, buttonWidth, buttonHeight, options.buyLabel, options.onBuy, 0x256f95, options.compact ? 8 : 9)
    );
  }

  private createFishCatalogPreview(fishType: FishType, x: number, y: number): Phaser.GameObjects.GameObject[] {
    const textureKey = this.fishCatalogPreviewTextureKey(fishType);
    const preview = this.add.image(x, y, textureKey);
    const maxWidth = 54;
    const maxHeight = 38;
    const sourceWidth = Math.max(1, preview.width);
    const sourceHeight = Math.max(1, preview.height);
    const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
    preview.setDisplaySize(sourceWidth * scale, sourceHeight * scale);
    preview.setDepth(73);

    if (textureKey === "fish-base") {
      preview.setTint(fishType.tint);
      const tailSide = -1;
      const tailX = x + tailSide * (preview.displayWidth / 2 - 2);
      const tailJoinX = x + tailSide * (preview.displayWidth / 2 - 12);
      const tailHalfHeight = Math.min(12, preview.displayHeight * 0.32);
      const tail = this.add.graphics();
      tail.fillStyle(fishFoodTintFor(fishType), 1);
      tail.fillTriangle(tailJoinX, y, tailX, y - tailHalfHeight, tailX, y + tailHalfHeight);
      tail.lineStyle(1, 0x061725, 0.22);
      tail.strokeTriangle(tailJoinX, y, tailX, y - tailHalfHeight, tailX, y + tailHalfHeight);
      tail.setDepth(74);
      return [preview, tail];
    }

    return [preview];
  }

  private fishCatalogPreviewTextureKey(fishType: FishType): string {
    const textureKey = `fish-${fishType.id}`;
    return this.textures.exists(textureKey) ? textureKey : "fish-base";
  }

  private assetCoverageSnapshot(): AquariumTestSnapshot["assetCoverage"] {
    const uiTextureKeys = [
      ...Object.keys(menuIconAssetPathByKey),
      ...Object.keys(hudIconAssetPathByKey),
      ...Object.keys(hudTopAssetPathByKey),
      bubbleButtonFrameTextureKey,
      bubbleButtonPressedTextureKey,
      coinGlowTextureKey,
      ...tankLevelBadgeTextureKeys
    ];
    const backgroundTextureKeys = [
      aquariumFloorTextureKey,
      aquariumBackgroundTextureKey,
      distantSilhouetteTextureKey,
      dirtyTankOverlayTextureKey
    ];

    return {
      fish: fishTypes.filter((fishType) => this.textures.exists(`fish-${fishType.id}`)).length,
      food: foodTypes.filter((foodType) => this.textures.exists(this.foodTextureKey(foodType.id))).length,
      decorations: decorationTypes.filter((decorationType) => this.textures.exists(decorationType.texture)).length,
      coins: (Object.keys(coinTextureKeyByType) as CoinType[]).filter((coinType) => this.textures.exists(coinTextureKeyByType[coinType])).length,
      uiIcons: uiTextureKeys.filter((textureKey) => this.textures.exists(textureKey)).length,
      helpers: helperCreatureTypes.filter((creatureType) => this.textures.exists(creatureType.texture)).length,
      backgrounds: backgroundTextureKeys.filter((textureKey) => this.textures.exists(textureKey)).length
    };
  }

  private renderFishStatsPage(): void {
    this.tabControls.push(
      this.createInfoLine(
        20,
        controlPanelTop + 52,
        `Fish ${formatNumber(this.activeFish().length)} in ${this.getTankName(this.tankLevel)} | Tank Lv${formatNumber(this.tankDisplayLevel())} | Evolve Pills ${formatNumber(this.getFoodInventory(evolvePillFoodTypeId))}`
      )
    );

    if (this.activeFish().length === 0) {
      this.tabControls.push(this.createInfoLine(20, controlPanelTop + 84, "No fish in the tank. Buy one from Shop."));
    } else {
      this.activeFish().forEach((targetFish, localIndex) => {
        this.addFishStatsCard(targetFish, this.fish.indexOf(targetFish), localIndex);
      });
    }

    this.renderHelperStatsSection();
  }

  private addFishStatsCard(targetFish: Fish, index: number, displayIndex = index): void {
    const x = 20 + (displayIndex % 2) * 202;
    const y = controlPanelTop + 84 + Math.floor(displayIndex / 2) * fishStatsCardRowHeight;
    const width = 188;
    const height = fishStatsCardHeight;
    const accent = fishFoodTintFor(targetFish.type);
    const background = this.add.rectangle(width / 2, height / 2, width, height, 0x17364a, 0.98).setStrokeStyle(1, accent, 0.9);
    const stripe = this.add.rectangle(4, height / 2, 4, height - 8, accent, 1);
    const title = this.add.text(12, 5, `${formatNumber(index + 1)}. ${targetFish.type.name}`, {
      fontFamily: "Arial",
      fontSize: "12px",
      color: "#ffffff",
      fontStyle: "bold",
      fixedWidth: width - 24
    });
    const meta = this.add.text(12, 22, `${targetFish.gender} | Age ${targetFish.ageLabel()}`, {
      fontFamily: "Arial",
      fontSize: "9px",
      color: "#ffe67a",
      fixedWidth: width - 24
    });
    const growthStatus = targetFish.isGrowthLimitedByTank() ? "Max screen size" : `Evo ${formatNumber(targetFish.evolutionStage)}/${formatNumber(maxEvolutionStage)}`;
    const detail = this.add.text(12, 36, `${this.rarityLabel(targetFish.type.rarity)} | ${this.getTankName(targetFish.tankLevel)} | ${growthStatus}`, {
      fontFamily: "Arial",
      fontSize: "9px",
      color: "#cfeeff",
      fixedWidth: width - 24
    });
    const size = this.add.text(12, 49, `Len ${targetFish.lengthLabel()} | Wt ${targetFish.weightLabel()}`, {
      fontFamily: "Arial",
      fontSize: "9px",
      color: "#cfeeff",
      fixedWidth: width - 24
    });
    const worth = this.add.text(12, 62, `Worth ${formatPrice({ coinType: targetFish.type.sellBaseValue.coinType, amount: targetFish.getSellValue() })}`, {
      fontFamily: "Arial",
      fontSize: "9px",
      color: "#cfeeff",
      fixedWidth: width - 24
    });
    const card = this.add.container(x, y, [background, stripe, title, meta, detail, size, worth]).setDepth(71);
    this.tabControls.push(card);

    this.tabControls.push(
      this.createButton(x + 12, y + height - 24, 48, 18, "Sell", () => this.showSellConfirmation(index), 0x76512d, 8),
      this.createButton(x + 66, y + height - 24, 110, 18, "Evo", () => this.tryEvolveFish(index), targetFish.canEvolve() ? 0x584f86 : 0x254d68, 8)
    );
  }

  private renderHelperStatsSection(): void {
    const fishRows = Math.max(1, Math.ceil(this.activeFish().length / 2));
    const startY = controlPanelTop + 84 + fishRows * fishStatsCardRowHeight + 14;
    const activeHelpers = this.activeHelperCreatures();
    this.tabControls.push(
      this.createInfoLine(
        20,
        startY,
        `${this.getTankName(this.tankLevel)} helpers | Sell helpers here to clean up tank utility slots`
      )
    );

    if (activeHelpers.length === 0) {
      this.tabControls.push(this.createInfoLine(20, startY + 28, "No helpers in this tank. Buy shrimp, shell, crab, or feeder snail from Shop."));
      return;
    }

    activeHelpers.forEach((helper) => {
      const index = this.helperCreatures.indexOf(helper);
      this.addHelperStatsCard(helper, index, startY + 32);
    });
  }

  private renderTankManagementPage(): void {
    const ownedLevels = this.sortedOwnedTankLevels();
    this.tabControls.push(
      this.createInfoLine(20, controlPanelTop + 52, `Owned ${formatNumber(ownedLevels.length)}/${formatNumber(maxOwnedTanks)} tanks | Active ${this.getTankName(this.tankLevel)} Lv${formatNumber(this.tankDisplayLevel())}`),
      this.createInfoLine(20, controlPanelTop + 76, "Switching closes this menu. Customize each tank separately.")
    );

    const pageLevels = [...ownedLevels, this.nextUnownedTankLevel()].filter((level, index, source) => source.indexOf(level) === index && level <= maxOwnedTanks);
    pageLevels.forEach((level, index) => {
      const x = 20 + (index % 2) * 202;
      const y = controlPanelTop + 104 + Math.floor(index / 2) * 92;
      const owned = this.hasTankLevel(level);
      const count = this.fishInTank(level).length;
      const accent = this.tankAccentColor(level);
      const background = this.add.rectangle(94, 40, 188, 80, 0x17364a, 0.98).setStrokeStyle(1, accent, 0.9);
      const title = this.add.text(12, 8, `${this.getTankName(level)} Lv${formatNumber(this.tankDisplayLevel(level))}`, {
        fontFamily: "Arial",
        fontSize: "11px",
        color: "#ffffff",
        fontStyle: "bold",
        fixedWidth: 110
      });
      const summary = this.add.text(12, 25, `Worth ${formatNumber(this.calculateTankNetWorth(level))}\n${formatNumber(count)}/${formatNumber(this.maxFishCapacityForLevel(level))} fish | ${this.tankSummary(level)}`, {
        fontFamily: "Arial",
        fontSize: "8px",
        color: "#cfeeff",
        fixedWidth: 112,
        lineSpacing: 2
      });
      const card = this.add.container(x, y, [
        background,
        ...this.createTankThumbnailObjects(148, 34, level, 56, 38, owned),
        title,
        summary
      ]).setDepth(71);
      this.tabControls.push(
        card
      );

      if (owned) {
        this.tabControls.push(
          this.createButton(x + 12, y + 62, 68, 18, "Name", () => this.renameTank(level), 0x254d68, 8),
          this.createButton(x + 86, y + 62, 90, 18, level === this.tankLevel ? "Active" : "Switch", () => this.switchTank(level), level === this.tankLevel ? 0x356a35 : 0x256f95, 8)
        );
      } else {
        this.tabControls.push(
          this.createButton(x + 12, y + 62, 164, 18, `Buy ${formatPriceLong(this.tankPriceForLevel(level))}`, () => this.buyTank(level), canAfford(this.wallet, this.tankPriceForLevel(level)) ? 0x356a35 : 0x76512d, 8)
        );
      }
    });

    const catalogTop = controlPanelTop + 104 + Math.ceil(pageLevels.length / 2) * 92 + 10;
    this.renderTankCosmeticCatalog("background", catalogTop);
    this.renderTankCosmeticCatalog("seabed", catalogTop + 116);
    this.renderTankDecorationCatalog(catalogTop + 232);
  }

  private renderTankCosmeticCatalog(category: TankCosmeticCategory, y: number): void {
    const title = category === "background" ? "Backgrounds" : "Seabeds";
    const pageSize = 6;
    const assets = this.tankCosmetics(category);
    const maxPage = Math.max(1, Math.ceil(assets.length / pageSize));
    this.tankCosmeticPages[category] = Phaser.Math.Clamp(this.tankCosmeticPages[category], 1, maxPage);
    const page = this.tankCosmeticPages[category];
    const pageAssets = assets.slice((page - 1) * pageSize, page * pageSize);
    this.tabControls.push(
      this.createInfoLine(20, y, `${title} ${formatNumber(page)}/${formatNumber(maxPage)} | active tank only`),
      this.createButton(316, y - 4, 38, 20, "<", () => this.changeTankCosmeticPage(category, -1), 0x254d68, 10),
      this.createButton(362, y - 4, 38, 20, ">", () => this.changeTankCosmeticPage(category, 1), 0x254d68, 10)
    );
    pageAssets.forEach((asset, index) => {
      const x = 20 + (index % 3) * 134;
      const cardY = y + 24 + Math.floor(index / 3) * 44;
      this.addTankCosmeticCard(asset, x, cardY);
    });
  }

  private changeTankCosmeticPage(category: TankCosmeticCategory, direction: number): void {
    const maxPage = Math.max(1, Math.ceil(this.tankCosmetics(category).length / 6));
    this.tankCosmeticPages[category] = Phaser.Math.Clamp(this.tankCosmeticPages[category] + direction, 1, maxPage);
    this.renderTabControls();
    this.refreshUi(false);
  }

  private addTankCosmeticCard(asset: TankCosmetic, x: number, y: number): void {
    const inventory = this.tankCosmeticInventory(asset.category);
    const owned = (inventory.get(asset.id) ?? 0) > 0;
    const selected = this.selectedTankCosmeticId(asset.category) === asset.id;
    const background = this.add.rectangle(62, 18, 124, 36, 0x17364a, 0.98).setStrokeStyle(1, selected ? 0xffe67a : this.tankAccentColor(this.tankLevel), selected ? 1 : 0.55);
    const preview = this.textures.exists(asset.textureKey) ? this.add.image(16, 18, asset.textureKey).setDisplaySize(28, 22) : this.add.rectangle(16, 18, 28, 22, asset.tint, 1);
    const title = this.add.text(34, 5, asset.name, {
      fontFamily: "Arial",
      fontSize: "8px",
      color: "#ffffff",
      fontStyle: "bold",
      fixedWidth: 84
    });
    const meta = this.add.text(34, 18, owned ? selected ? "Active" : "Owned" : formatPrice(asset.price), {
      fontFamily: "Arial",
      fontSize: "8px",
      color: owned ? "#a8ffb0" : "#ffe67a",
      fixedWidth: 84
    });
    const card = this.add.container(x, y, [background, preview, title, meta]).setDepth(71);
    card.setSize(124, 36).setInteractive({ useHandCursor: true });
    card.on("pointerdown", () => {
      if (owned) {
        this.useTankCosmetic(asset);
      } else {
        this.buyTankCosmetic(asset);
      }
    });
    this.tabControls.push(card);
  }

  private renderTankDecorationCatalog(y: number): void {
    const pageSize = 4;
    const maxPage = Math.max(1, Math.ceil(decorationTypes.length / pageSize));
    this.tankDecorPage = Phaser.Math.Clamp(this.tankDecorPage, 1, maxPage);
    const pageStart = (this.tankDecorPage - 1) * pageSize;
    const pageDecorations = decorationTypes.slice(pageStart, pageStart + pageSize);
    this.tabControls.push(
      this.createInfoLine(20, y, `Decorations ${formatNumber(this.tankDecorPage)}/${formatNumber(maxPage)} | placed into ${this.getTankName(this.tankLevel)}`),
      this.createButton(316, y - 4, 38, 20, "<", () => this.changeTankDecorPage(-1), 0x254d68, 10),
      this.createButton(362, y - 4, 38, 20, ">", () => this.changeTankDecorPage(1), 0x254d68, 10)
    );
    pageDecorations.forEach((decorationType, index) => {
      this.addTankDecorationCard(decorationType, 20 + (index % 2) * 202, y + 24 + Math.floor(index / 2) * 88);
    });
  }

  private changeTankDecorPage(direction: number): void {
    const maxPage = Math.max(1, Math.ceil(decorationTypes.length / 4));
    this.tankDecorPage = Phaser.Math.Clamp(this.tankDecorPage + direction, 1, maxPage);
    this.renderTabControls();
    this.refreshUi(false);
  }

  private addTankDecorationCard(decorationType: DecorationType, x: number, y: number): void {
    const width = 188;
    const height = 78;
    const accent = this.rarityCatalogAccent(decorationType.rarity);
    const background = this.add.rectangle(width / 2, height / 2, width, height, 0x17364a, 0.98).setStrokeStyle(1, accent, 0.75);
    const preview = this.add.image(24, 28, decorationType.texture);
    preview.setDisplaySize(44, 36);
    const title = this.add.text(52, 6, decorationType.name, {
      fontFamily: "Arial",
      fontSize: "10px",
      color: "#ffffff",
      fontStyle: "bold",
      fixedWidth: 124
    });
    const meta = this.add.text(52, 22, `+${formatNumber(decorationType.happinessBonus)} happy`, {
      fontFamily: "Arial",
      fontSize: "8px",
      color: "#ffe67a",
      fixedWidth: 124
    });
    const card = this.add.container(x, y, [background, preview, title, meta]).setDepth(71);
    this.tabControls.push(card);
    decorationSizeOrder.forEach((size, index) => {
      const owned = this.getDecorationInventory(decorationType.id, size);
      const label = owned > 0 ? `${decorationSizes[size].label} x${formatNumber(owned)}` : `${decorationSizes[size].label} ${formatPrice(this.decorationVariantPrice(decorationType, size))}`;
      this.tabControls.push(
        this.createButton(
          x + 52 + (index % 2) * 64,
          y + 40 + Math.floor(index / 2) * 18,
          58,
          16,
          label,
          () => (owned > 0 ? this.selectDecoration(decorationType.id, size) : this.buyDecoration(decorationType, size)),
          owned > 0 ? 0x256f95 : canAfford(this.wallet, this.decorationVariantPrice(decorationType, size)) ? 0x356a35 : 0x76512d,
          7
        )
      );
    });
  }

  private createTankThumbnailObjects(
    x: number,
    y: number,
    level: number,
    width: number,
    height: number,
    owned = true
  ): Phaser.GameObjects.GameObject[] {
    const objects: Phaser.GameObjects.GameObject[] = [];
    if (this.textures.exists(tankThumbnailBaseTextureKey)) {
      const image = this.add.image(x, y, tankThumbnailBaseTextureKey);
      image.setDisplaySize(width, height);
      image.setAlpha(owned ? 1 : 0.52);
      objects.push(image);
    } else {
      objects.push(this.add.rectangle(x, y, width, height, 0x1599c8, owned ? 1 : 0.52));
    }

    const accent = this.tankAccentColor(level);
    const hueOverlay = this.add.rectangle(x, y, width - 4, height - 4, accent, owned ? 0.14 : 0.2);
    const ring = this.add.rectangle(x, y, width, height, 0x000000, 0).setStrokeStyle(2, accent, owned ? 0.9 : 0.42);
    const tierCount = 1 + (level % 5);
    objects.push(hueOverlay, ring);
    for (let index = 0; index < tierCount; index += 1) {
      const dotX = x - width / 2 + 8 + index * 7;
      const dotY = y + height / 2 - 7;
      objects.push(this.add.circle(dotX, dotY, 2, accent, owned ? 0.95 : 0.45));
    }
    objects.push(
      this.add
        .text(x, y - height / 2 + 6, `Lv${formatNumber(this.tankDisplayLevel(level))}`, {
          fontFamily: "Arial",
          fontSize: "9px",
          color: "#ffffff",
          fontStyle: "bold",
          stroke: "#05283b",
          strokeThickness: 3
        })
        .setOrigin(0.5, 0)
    );
    return objects;
  }

  private getTankName(level: number): string {
    const sanitizedLevel = Math.max(1, Math.floor(level));
    return this.tankNames.get(sanitizedLevel) ?? `Tank ${formatNumber(sanitizedLevel)}`;
  }

  private tankNamesFromRecord(source: Record<string, string> | undefined): Map<number, string> {
    const names = new Map<number, string>([[1, "Home Reef"]]);
    if (!source) {
      return names;
    }

    for (const [key, value] of Object.entries(source)) {
      const level = Math.max(1, Math.floor(Number(key)));
      if (Number.isFinite(level) && typeof value === "string" && value.trim().length > 0) {
        names.set(level, value.trim().slice(0, 24));
      }
    }
    return names;
  }

  private tankNamesRecord(): Record<string, string> {
    return Object.fromEntries([...this.tankNames.entries()].map(([level, name]) => [String(level), name]));
  }

  private tankCosmetics(category: TankCosmeticCategory): TankCosmetic[] {
    return category === "background" ? tankBackgroundCosmetics : tankSeabedCosmetics;
  }

  private tankCosmeticById(category: TankCosmeticCategory, id: string | undefined): TankCosmetic | undefined {
    return this.tankCosmetics(category).find((asset) => asset.id === id);
  }

  private validTankCosmeticId(category: TankCosmeticCategory, id: string | undefined, level = this.tankLevel): string {
    const fallback = this.defaultTankCosmeticId(level);
    return this.tankCosmeticById(category, id) ? id as string : fallback;
  }

  private cosmeticInventoryFromRecord(category: TankCosmeticCategory, source: Record<string, number> | undefined, level: number): Map<string, number> {
    const result = recordToMap(source);
    const fallback = this.defaultTankCosmeticId(level);
    result.set(fallback, Math.max(1, result.get(fallback) ?? 0));
    if (category === "background") {
      result.set("home", Math.max(1, result.get("home") ?? 0));
    } else {
      result.set("home", Math.max(1, result.get("home") ?? 0));
    }
    return result;
  }

  private tankCosmeticInventory(category: TankCosmeticCategory, level = this.tankLevel): Map<string, number> {
    const state = this.ensureTankState(level);
    return category === "background" ? state.backgroundInventory : state.seabedInventory;
  }

  private selectedTankCosmeticId(category: TankCosmeticCategory, level = this.tankLevel): string {
    const state = this.ensureTankState(level);
    return category === "background" ? state.selectedBackgroundId : state.selectedSeabedId;
  }

  private tankStatesFromSave(saved: SavedGame): Map<number, TankRuntimeState> {
    const states = new Map<number, TankRuntimeState>();
    const savedStates = saved.tank.states ?? {};
    for (const [key, value] of Object.entries(savedStates)) {
      const level = Math.max(1, Math.floor(Number(key)));
      if (!Number.isFinite(level) || level > maxOwnedTanks) {
        continue;
      }
      states.set(level, {
        wallet: createWallet(value.wallet?.common ?? 0, value.wallet?.rare ?? 0, value.wallet?.superRare ?? 0),
        foodInventory: recordToMap(value.foodInventory) as Map<FoodTypeId, number>,
        fishInventory: recordToMap(value.fishInventory),
        decorationInventory: recordToMap(value.decorationInventory),
        creatureInventory: recordToMap(value.creatureInventory),
        backgroundInventory: this.cosmeticInventoryFromRecord("background", value.backgroundInventory, level),
        seabedInventory: this.cosmeticInventoryFromRecord("seabed", value.seabedInventory, level),
        selectedBackgroundId: this.validTankCosmeticId("background", value.selectedBackgroundId, level),
        selectedSeabedId: this.validTankCosmeticId("seabed", value.selectedSeabedId, level),
        cleanliness: Phaser.Math.Clamp(value.cleanliness ?? 100, 0, 100),
        cleanedAt: value.cleanedAt ?? Date.now()
      });
    }

    if (!states.has(1)) {
      states.set(1, {
        wallet: { ...saved.wallet },
        foodInventory: recordToMap(saved.foodInventory) as Map<FoodTypeId, number>,
        fishInventory: recordToMap(saved.fishInventory),
        decorationInventory: recordToMap(saved.decorationInventory),
        creatureInventory: recordToMap(saved.creatureInventory),
        backgroundInventory: this.cosmeticInventoryFromRecord("background", undefined, 1),
        seabedInventory: this.cosmeticInventoryFromRecord("seabed", undefined, 1),
        selectedBackgroundId: this.validTankCosmeticId("background", undefined, 1),
        selectedSeabedId: this.validTankCosmeticId("seabed", undefined, 1),
        cleanliness: saved.tank.cleanliness,
        cleanedAt: saved.tank.cleanedAt
      });
    }

    return states;
  }

  private tankStatesRecord(): SavedGame["tank"]["states"] {
    const result: NonNullable<SavedGame["tank"]["states"]> = {};
    for (const level of this.sortedOwnedTankLevels()) {
      const state = this.ensureTankState(level);
      result[String(level)] = {
        wallet: { ...state.wallet },
        foodInventory: Object.fromEntries([...state.foodInventory.entries()].filter(([, count]) => count > 0)) as Record<FoodTypeId, number>,
        fishInventory: mapToRecord(state.fishInventory),
        decorationInventory: mapToRecord(state.decorationInventory),
        creatureInventory: mapToRecord(state.creatureInventory),
        backgroundInventory: mapToRecord(state.backgroundInventory),
        seabedInventory: mapToRecord(state.seabedInventory),
        selectedBackgroundId: state.selectedBackgroundId,
        selectedSeabedId: state.selectedSeabedId,
        cleanliness: state.cleanliness,
        cleanedAt: state.cleanedAt
      };
    }
    return result;
  }

  private renameTank(level: number): void {
    const sanitizedLevel = Math.max(1, Math.floor(level));
    if (!this.hasTankLevel(sanitizedLevel)) {
      return;
    }

    const nextName = globalThis.prompt?.("Tank name", this.getTankName(sanitizedLevel))?.trim();
    if (!nextName) {
      return;
    }

    this.tankNames.set(sanitizedLevel, nextName.slice(0, 24));
    this.renderTabControls();
    this.refreshUi(false);
    this.saveNow();
  }

  private tankAgeBandLabel(level: number): string {
    return `Worth Lv${formatNumber(this.tankDisplayLevel(level))}`;
  }

  private tankSummary(level: number): string {
    const fishInTank = this.fishInTank(level);
    const helperCount = this.helpersInTank(level).length;
    if (fishInTank.length === 0) {
      return helperCount > 0 ? `${formatNumber(helperCount)} helpers` : "empty";
    }

    const averageMonths = fishInTank.reduce((total, currentFish) => total + currentFish.ageMonths(), 0) / fishInTank.length;
    const needsCare = fishInTank.filter((currentFish) => currentFish.state !== "happy" || currentFish.isGrowthLimitedByTank()).length;
    return `avg ${formatNumber(Math.round(averageMonths))}mo | care ${formatNumber(needsCare)} | help ${formatNumber(helperCount)}`;
  }

  private tankTierLabel(level: number): string {
    if (level <= 10) {
      return "starter reef";
    }
    if (level <= 30) {
      return "deep reef";
    }
    if (level <= 60) {
      return "abyss reef";
    }
    return "mythic reef";
  }

  private tankAccentColor(level: number): number {
    const palette = [0x5ed6e8, 0x62f2a8, 0xffd15c, 0xd379d7, 0x5fa6d6, 0xff8fa3];
    return palette[Math.abs(Math.floor(level - 1)) % palette.length];
  }

  private switchTank(level: number): void {
    if (!this.hasTankLevel(level)) {
      this.floatText(`Buy Tank ${formatNumber(level)} first`, toastX, toastY, "#ffb0a8");
      return;
    }

    this.captureActiveTankState();
    this.tankLevel = Math.max(1, Math.floor(level));
    this.applyTankState(this.tankLevel);
    this.clearTankDrops();
    this.applyTankViewScale();
    this.refreshFishTankVisibility();
    this.refreshHelperTankVisibility();
    this.refreshDecorationTankVisibility();
    this.updateDirtyTankOverlay();
    if (this.activeScreen !== "tank") {
      this.closePage();
    } else {
      this.renderTabControls();
    }
    this.refreshUi(false);
    this.saveNow();
  }

  private buyTank(level: number): void {
    const targetLevel = Math.max(1, Math.floor(level));
    if (this.ownedTankLevels.size >= maxOwnedTanks || targetLevel > maxOwnedTanks) {
      this.floatText(`Max ${formatNumber(maxOwnedTanks)} tanks`, toastX, toastY, "#ffb0a8");
      return;
    }

    if (targetLevel === 1 || this.hasTankLevel(targetLevel)) {
      this.switchTank(targetLevel);
      return;
    }

    const price = this.tankPriceForLevel(targetLevel);
    if (!this.spendPrice(price)) {
      return;
    }

    this.ownedTankLevels.add(targetLevel);
    this.ensureTankState(targetLevel);
    this.switchTank(targetLevel);
  }

  private buyTankCosmetic(asset: TankCosmetic): void {
    if (!this.spendPrice(asset.price)) {
      return;
    }

    const inventory = this.tankCosmeticInventory(asset.category);
    inventory.set(asset.id, 1);
    this.useTankCosmetic(asset);
    this.floatText(`${asset.name} installed`, toastX, toastY, "#a8ffb0");
  }

  private useTankCosmetic(asset: TankCosmetic): void {
    const state = this.ensureTankState(this.tankLevel);
    if ((this.tankCosmeticInventory(asset.category).get(asset.id) ?? 0) <= 0) {
      this.buyTankCosmetic(asset);
      return;
    }

    if (asset.category === "background") {
      state.selectedBackgroundId = asset.id;
    } else {
      state.selectedSeabedId = asset.id;
    }
    this.layoutTankBackground();
    this.layoutTankFloor();
    this.renderTabControls();
    this.refreshUi(false);
    this.saveNow();
  }

  private addHelperStatsCard(helper: HelperCreature, index: number, baseY: number): void {
    const x = 20 + (index % 2) * 202;
    const y = baseY + Math.floor(index / 2) * 74;
    const width = 188;
    const height = 66;
    const accent = this.rarityCatalogAccent(helper.type.rarity);
    const background = this.add.rectangle(width / 2, height / 2, width, height, 0x17364a, 0.98).setStrokeStyle(1, accent, 0.9);
    const stripe = this.add.rectangle(4, height / 2, 4, height - 8, accent, 1);
    const title = this.add.text(12, 5, `${formatNumber(index + 1)}. ${helper.type.name}`, {
      fontFamily: "Arial",
      fontSize: "12px",
      color: "#ffffff",
      fontStyle: "bold",
      fixedWidth: width - 24
    });
    const role = helper.type.feedSeconds ? "Feeder" : helper.type.habitatTags.includes("collector") ? "Collector" : "Cleaner";
    const meta = this.add.text(12, 22, `${this.rarityLabel(helper.type.rarity)} | ${role} | Speed ${formatNumber(helper.type.speed)}`, {
      fontFamily: "Arial",
      fontSize: "9px",
      color: "#ffe67a",
      fixedWidth: width - 24
    });
    const detail = this.add.text(12, 36, `Sell ${formatPrice(this.helperSellPrice(helper.type))}`, {
      fontFamily: "Arial",
      fontSize: "9px",
      color: "#cfeeff",
      fixedWidth: width - 24
    });
    const card = this.add.container(x, y, [background, stripe, title, meta, detail]).setDepth(71);
    this.tabControls.push(card);
    this.tabControls.push(
      this.createButton(x + width - 64, y + height - 18, 52, 18, "Sell", () => this.showHelperSellConfirmation(index), 0x76512d, 8)
    );
  }

  private renderScreenControls(): void {
    if (this.activeScreen === "care") {
      this.tabControls.push(
        this.createInfoLine(20, controlPanelTop + 54, `${this.getTankName(this.tankLevel)} Lv${formatNumber(this.tankDisplayLevel())} | Worth ${formatNumber(this.calculateTankNetWorth())} | ${formatNumber(Math.round(this.cleanliness))}% clean`),
        this.createButton(20, controlPanelTop + 84, 188, 36, "Clean Tank", () => this.cleanTank(), 0x356a35, 13),
        this.createButton(222, controlPanelTop + 84, 188, 36, "Manage Tanks", () => this.openScreen("tanks"), 0x256f95, 12),
        this.createInfoLine(20, controlPanelTop + 130, `Food: ${this.describeFoodInventory()}`),
        this.createInfoLine(20, controlPanelTop + 154, `Fish ${formatNumber(this.activeFish().length)}/${formatNumber(this.maxFishCapacityForLevel())} | Decor ${formatNumber(this.activeDecorations().length)}/${formatNumber(maxDecorations)} | ${this.getTankNeedIndicator()}`),
        this.createInfoLine(20, controlPanelTop + 178, `Rentals: ${this.rentalStatusLabel() || "none active"}`),
        this.createButton(20, controlPanelTop + 202, 30, 30, "-", () => this.changeRentalMinutes("feeder", -1), 0x254d68, 14),
        this.createButton(54, controlPanelTop + 202, 116, 30, `Feed ${formatNumber(this.autoFeederMinutes)}m ${formatPrice(this.rentalPrice(autoFeederPrice, this.autoFeederMinutes))}`, () => this.rentAutoFeeder(), this.isAutoFeederActive() ? 0x356a35 : 0x256f95, 9),
        this.createButton(174, controlPanelTop + 202, 30, 30, "+", () => this.changeRentalMinutes("feeder", 1), 0x254d68, 14),
        this.createButton(222, controlPanelTop + 202, 30, 30, "-", () => this.changeRentalMinutes("collector", -1), 0x254d68, 14),
        this.createButton(256, controlPanelTop + 202, 116, 30, `Coin ${formatNumber(this.autoCollectorMinutes)}m ${formatPrice(this.rentalPrice(autoCollectorPrice, this.autoCollectorMinutes))}`, () => this.rentAutoCollector(), this.isAutoCollectorActive() ? 0x356a35 : 0x256f95, 9),
        this.createButton(376, controlPanelTop + 202, 30, 30, "+", () => this.changeRentalMinutes("collector", 1), 0x254d68, 14)
      );
      return;
    }

    if (this.activeScreen === "tanks") {
      this.renderTankManagementPage();
      return;
    }

    if (this.activeScreen === "album") {
      this.renderFishStatsPage();
      return;
    }

    if (this.activeScreen === "goals") {
      this.tabControls.push(
        this.createInfoLine(20, controlPanelTop + 54, `Daily Goals | ${this.dailyGoals.date}`),
        this.createGoalRow(controlPanelTop + 82, "feed", "Feed a fish", this.getTotalFoodInventory() < 3),
        this.createGoalRow(controlPanelTop + 114, "coin", `Collect ${formatNumber(1)} coin`, this.wallet.common > 120 || this.wallet.rare > 0 || this.wallet.superRare > 0),
        this.createGoalRow(controlPanelTop + 146, "decorate", "Place a decoration", this.activeDecorations().length > 0)
      );
      return;
    }

    this.tabControls.push(
      this.createButton(20, controlPanelTop + 58, 188, 32, `Sound ${this.settings.sound ? "On" : "Off"}`, () => this.toggleSetting("sound"), 0x254d68, 13),
      this.createButton(222, controlPanelTop + 58, 188, 32, `Music ${this.settings.music ? "On" : "Off"}`, () => this.toggleSetting("music"), 0x254d68, 13),
      this.createButton(20, controlPanelTop + 98, 188, 32, `Motion ${this.settings.reducedMotion ? "Low" : "Full"}`, () => this.toggleSetting("reducedMotion"), 0x254d68, 13),
      this.createButton(222, controlPanelTop + 98, 188, 32, `Notify ${this.settings.notifications ? "On" : "Off"}`, () => this.toggleSetting("notifications"), 0x254d68, 13),
      this.createButton(20, controlPanelTop + 140, 188, 32, "Offline Summary", () => this.showOfflineSummary(), 0x356a35, 13),
      this.createButton(222, controlPanelTop + 140, 188, 32, "Reset Save", () => this.showResetConfirmation(), 0x76512d, 13)
    );
  }

  private addControlRow(
    y: number,
    buyLabel: string,
    placeLabel: string,
    onBuy: () => void,
    onPlace: () => void,
    placeFill: number
  ): void {
    this.tabControls.push(
      this.createButton(20, y, 250, 28, buyLabel, onBuy, 0x256f95, 12),
      this.createButton(284, y, 126, 28, placeLabel, onPlace, placeFill, 11)
    );
  }

  private createInfoLine(x: number, y: number, label: string): Phaser.GameObjects.Container {
    const text = this.add.text(0, 0, label, {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#eaf9ff",
      fixedWidth: 390,
      wordWrap: { width: 390 }
    });
    const container = this.add.container(x, y, [text]);
    container.setDepth(this.activeScreen === "tank" ? 22 : 72);
    return container;
  }

  private createGoalRow(y: number, id: string, label: string, complete: boolean): Phaser.GameObjects.Container {
    const claimed = this.dailyGoals.claimed.includes(id);
    return this.createButton(
      20,
      y,
      390,
      28,
      `${claimed ? "Done" : complete ? "Claim" : "Open"} | ${label} | +C15`,
      () => this.claimDailyGoal(id, complete),
      claimed ? 0x254d68 : complete ? 0x356a35 : 0x256f95,
      12
    );
  }

  private createPagePanel(title: string): void {
    const background = this.add
      .rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0x071b2a, 1)
      .setStrokeStyle(2, 0x75c9e8, 0.65);
    background.setInteractive();
    background.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
    });
    const header = this.add.rectangle(gameWidth / 2, 36, gameWidth, 72, 0x10283a, 1);
    const titleText = this.add.text(20, 20, title, {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#ffffff",
      fontStyle: "bold"
    });
    const closeButton = this.createButton(330, 18, 80, 34, "Tank", () => this.closePage(), 0x76512d, 13);
    this.pagePanel = this.add.container(0, 0, [background, header, titleText, closeButton]).setDepth(60);
  }

  private pageTitle(): string {
    const titles: Record<AppScreen, string> = {
      tank: "Tank",
      store: "Store",
      care: "Care",
      album: "Album",
      tanks: "Tanks",
      goals: "Goals",
      settings: "Settings"
    };
    return titles[this.activeScreen];
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
    fill = 0x256f95,
    fontSize = 13
  ): Phaser.GameObjects.Container {
    const background = this.add
      .rectangle(0, 0, width, height, fill, 1)
      .setStrokeStyle(1, 0xbcefff, 0.5);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Arial",
        fontSize: `${fontSize}px`,
        color: "#ffffff",
        align: "center",
        fixedWidth: width - 10
      })
      .setOrigin(0.5);
    const button = this.add.container(x + width / 2, y + height / 2, [background, text]);
    button.setSize(width, height);
    button.setDepth(this.activeScreen === "tank" ? 22 : 72);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerover", () => background.setFillStyle(0x3c93bd));
    button.on("pointerout", () => background.setFillStyle(fill));
    button.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  private buyFish(fishType: FishType): void {
    if (this.activeFish().length >= this.maxFishCapacityForLevel()) {
      this.floatText("Active tank full", toastX, toastY, "#ffb0a8");
      return;
    }

    if (!canAfford(this.wallet, fishType.price)) {
      this.floatText(`Need ${formatPrice(fishType.price)}`, toastX, toastY, "#ffb0a8");
      return;
    }

    const position = this.randomFishPlacement();
    this.buyAndAddFishToTank(fishType, position.x, position.y);
  }

  private buyAndAddFishToTank(fishType: FishType, x: number, y: number): void {
    if (!this.spendPrice(fishType.price)) {
      return;
    }

    const placedFish = this.addFishToTank(fishType, x, y, { tankLevel: this.tankLevel });
    placedFish.markCoinDropped(this.time.now + 2500);
    this.floatTankText(`${fishType.name} added`, x, y - 34, "#ffffff");
    this.placementMode = { kind: "none" };
    this.closeModal();
    this.refreshFishTankVisibility();
    this.refreshUi();
    this.saveNow();
  }

  private buyFood(foodType = this.getSelectedFoodType(), quantity = this.getFoodBuyQuantity(foodType.id)): void {
    const buyQuantity = Phaser.Math.Clamp(Math.floor(quantity), 1, maxFoodBuyQuantity);
    const totalPrice = this.quantityPrice(foodType.price, buyQuantity);
    if (!this.spendPrice(totalPrice)) {
      return;
    }

    this.foodInventory.set(foodType.id, this.getFoodInventory(foodType.id) + buyQuantity);
    if (this.isDroppableFood(foodType.id)) {
      this.selectedFoodTypeId = foodType.id;
    }
    this.placementMode = { kind: "none" };
    this.floatText(`${foodType.name} x${formatNumber(buyQuantity)}`, toastX, toastY, "#a8ffb0");
    if (this.activeScreen !== "tank" && this.isDroppableFood(foodType.id)) {
      this.closePage();
    }
    this.refreshUi();
    this.createFoodDock();
    this.saveNow();
  }

  private dropFoodAt(foodTypeId: FoodTypeId, x: number, y: number): void {
    const foodType = foodTypes.find((item) => item.id === foodTypeId);
    if (!foodType || !this.isDroppableFood(foodType.id) || this.getFoodInventory(foodType.id) <= 0) {
      return;
    }

    this.selectedFoodTypeId = foodType.id;
    this.foodInventory.set(foodType.id, this.getFoodInventory(foodType.id) - 1);
    const pellet = new FoodPellet(
      this,
      Phaser.Math.Clamp(x, tankBounds.left + 18, tankBounds.right - 18),
      Phaser.Math.Clamp(y, tankBounds.top + 18, tankBounds.bottom - 18),
      foodType
    );
    pellet.setWorldScaleCompensation(this.tankViewScaleForLevel());
    pellet.addToContainer(this.tankLayer);
    this.foods.push(pellet);
    this.cleanliness = Phaser.Math.Clamp(this.cleanliness - 1.2, 0, 100);
    this.placementMode = { kind: "none" };
    this.refreshUi();
    this.createFoodDock();
    this.saveNow();
  }

  private buyDecoration(decorationType: DecorationType, size: DecorationSize = "m"): void {
    const price = this.decorationVariantPrice(decorationType, size);
    if (!this.spendPrice(price)) {
      return;
    }

    const inventoryKey = this.decorationInventoryKey(decorationType.id, size);
    this.decorationInventory.set(
      inventoryKey,
      (this.decorationInventory.get(inventoryKey) ?? 0) + 1
    );
    this.placementMode = { kind: "decoration", decorationTypeId: decorationType.id, size };
    this.floatText(`${decorationType.name} ${decorationSizes[size].label} bought`, toastX, toastY, "#a8ffb0");
    if (this.activeScreen !== "tank") {
      this.closePage();
    }
    this.refreshUi();
    this.saveNow();
  }

  private buyHelperCreature(creatureType: HelperCreatureType): void {
    if (this.activeHelperCreatures().length >= maxHelperCreatures) {
      this.floatText("Helpers full in this tank", toastX, toastY, "#ffb0a8");
      return;
    }

    if (!this.spendPrice(creatureType.price)) {
      return;
    }

    const x = Phaser.Math.Between(tankBounds.left + 70, tankBounds.right - 70);
    this.addHelperCreatureToTank(creatureType, x);
    this.placementMode = { kind: "none" };
    this.floatTankText(`${creatureType.name} hired`, x, tankBounds.bottom - 62, "#a8ffb0");
    if (this.activeScreen !== "tank") {
      this.closePage();
    }
    this.refreshUi();
    this.saveNow();
  }

  private sellOldestFish(): void {
    if (this.fish.length === 0) {
      this.floatText("No fish to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    this.showSellConfirmation(0);
  }

  private sellFishByIndex(index: number): void {
    const fishToSell = this.fish[index];
    if (!fishToSell) {
      this.floatText("No fish to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    if (this.fish.length <= 1) {
      this.floatText("Keep one fish", toastX, toastY, "#ffb0a8");
      this.closeModal();
      return;
    }

    const sellValue = fishToSell.getSellValue();
    this.fish.splice(index, 1);
    earn(this.wallet, fishToSell.type.sellBaseValue.coinType, sellValue);
    this.floatText(`Sold ${fishToSell.type.name} +${formatNumber(sellValue)}`, toastX, toastY, "#ffe67a");
    fishToSell.destroy();
    this.closeModal();
    this.refreshUi();
    this.saveNow();
  }

  private helperSellPrice(creatureType: HelperCreatureType): HelperCreatureType["price"] {
    return {
      coinType: creatureType.price.coinType,
      amount: Math.max(1, Math.floor(creatureType.price.amount * 0.65))
    };
  }

  private sellHelperCreatureByIndex(index: number): void {
    const helperToSell = this.helperCreatures[index];
    if (!helperToSell) {
      this.floatText("No helper to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellPrice = this.helperSellPrice(helperToSell.type);
    this.helperCreatures.splice(index, 1);
    earn(this.wallet, sellPrice.coinType, sellPrice.amount);
    this.floatTankText(`Sold ${helperToSell.type.name}`, helperToSell.sprite.x, helperToSell.sprite.y - 24, "#ffe67a");
    helperToSell.destroy();
    this.closeModal();
    this.renderTabControls();
    this.refreshUi();
    this.saveNow();
  }

  private tryEvolveFish(index: number, force?: "success" | "death"): void {
    const targetFish = this.fish[index];
    if (!targetFish) {
      this.floatText("No fish to evolve", toastX, toastY, "#ffb0a8");
      return;
    }

    if (!targetFish.canEvolve()) {
      this.floatText("Max evolution", toastX, toastY, "#d7f4ff");
      return;
    }

    if (this.getFoodInventory(evolvePillFoodTypeId) <= 0) {
      this.floatText("Need Evolve Pill", toastX, toastY, "#ffb0a8");
      return;
    }

    const fee = this.evolutionFee(targetFish);
    if (!this.spendPrice(fee)) {
      return;
    }

    this.foodInventory.set(evolvePillFoodTypeId, this.getFoodInventory(evolvePillFoodTypeId) - 1);
    const success = force === "success" || (force !== "death" && Phaser.Math.Between(0, 1) === 1);
    if (success) {
      targetFish.evolve();
      targetFish.markCoinDropped(this.time.now + 2500);
      this.floatTankText(`Evolved ${targetFish.type.name}`, targetFish.sprite.x, targetFish.sprite.y - 34, "#f2dcff");
    } else {
      this.removeFishAt(index);
      this.floatText("Evolution failed", toastX, toastY, "#ff8f9a");
    }

    this.closeModal();
    this.renderTabControls();
    this.refreshUi();
    this.saveNow();
  }

  private breedFish(index: number, force?: "same" | "rare"): void {
    const parent = this.fish[index];
    const mateIndex = this.findBreedMate(index);
    if (!parent || mateIndex === undefined) {
      this.floatText("Need M+F pair", toastX, toastY, "#ffb0a8");
      return;
    }

    if (this.activeFish().length >= this.maxFishCapacityForLevel()) {
      this.floatText("Active tank full", toastX, toastY, "#ffb0a8");
      return;
    }

    const babyType = this.chooseBreedBabyType(parent.type, force);
    const position = this.randomFishPlacement();
    const baby = this.addFishToTank(babyType, position.x, position.y, { tankLevel: this.tankLevel });
    baby.markCoinDropped(this.time.now + 2500);
    this.floatTankText(`${babyType.name} added`, position.x, position.y - 34, "#ffffff");
    this.renderTabControls();
    this.refreshUi();
    this.saveNow();
  }

  private removeFishAt(index: number): Fish | undefined {
    const [removedFish] = this.fish.splice(index, 1);
    if (removedFish) {
      removedFish.destroy();
    }
    return removedFish;
  }

  private selectFish(fishTypeId: string): void {
    if (this.getFishInventory(fishTypeId) <= 0) {
      this.floatText("Buy one first", toastX, toastY, "#ffb0a8");
      return;
    }

    const fishType = fishTypes.find((item) => item.id === fishTypeId);

    this.placementMode = { kind: "fish", fishTypeId };
    if (this.activeScreen !== "tank") {
      this.closePage();
    }
    this.refreshUi();
  }

  private selectFood(foodTypeId = this.selectedFoodTypeId): void {
    if (!this.isDroppableFood(foodTypeId)) {
      this.floatText("Use from Book", toastX, toastY, "#d7f4ff");
      this.openScreen("album");
      return;
    }

    if (this.getFoodInventory(foodTypeId) <= 0) {
      this.floatText("No food left", toastX, toastY, "#ffb0a8");
      return;
    }

    this.selectedFoodTypeId = foodTypeId;
    if (this.activeScreen !== "tank") {
      this.closePage();
    }
    this.refreshUi();
    this.createFoodDock();
  }

  private toggleFoodTool(foodTypeId: FoodTypeId): void {
    this.selectFood(foodTypeId);
  }

  private selectDecoration(decorationTypeId: string, size: DecorationSize = "m"): void {
    if (this.getDecorationInventory(decorationTypeId, size) <= 0) {
      this.floatText("Buy one first", toastX, toastY, "#ffb0a8");
      return;
    }

    this.placementMode = { kind: "decoration", decorationTypeId, size };
    if (this.activeScreen !== "tank") {
      this.closePage();
    }
    this.refreshUi();
  }

  private handleTankPointer(pointer: Phaser.Input.Pointer): void {
    const pointerPoint = this.pointerDesignPoint(pointer);
    if (!tankViewportBounds.contains(pointerPoint.x, pointerPoint.y)) {
      return;
    }

    const mode = this.placementMode;
    const tankPoint = this.screenToTankPoint(pointerPoint.x, pointerPoint.y);

    if (mode.kind === "fish") {
      const type = fishTypes.find((fishType) => fishType.id === mode.fishTypeId);
      if (!type || this.getFishInventory(type.id) <= 0) {
        return;
      }

      if (this.activeFish().length >= this.maxFishCapacityForLevel()) {
        this.floatText("Active tank full", toastX, toastY, "#ffb0a8");
        return;
      }

      this.placeFishWithCompatibility(type, tankPoint.x, tankPoint.y);
      return;
    }

    if (mode.kind === "decoration") {
      const decoration = decorationTypes.find((item) => item.id === mode.decorationTypeId);
      if (!decoration || this.getDecorationInventory(decoration.id, mode.size) <= 0) {
        return;
      }

      if (this.activeDecorations().length >= maxDecorations) {
        this.floatText("Decor full", toastX, toastY, "#ffb0a8");
        return;
      }

      const inventoryKey = this.decorationInventoryKey(decoration.id, mode.size);
      const legacyKeyCount = mode.size === "m" ? this.decorationInventory.get(decoration.id) ?? 0 : 0;
      if (legacyKeyCount > 0) {
        this.decorationInventory.set(decoration.id, legacyKeyCount - 1);
      } else {
        this.decorationInventory.set(inventoryKey, Math.max(0, (this.decorationInventory.get(inventoryKey) ?? 0) - 1));
      }
      this.addDecorationToTank(decoration, tankPoint.x, tankPoint.y, mode.size);
      this.placementMode =
        this.getDecorationInventory(decoration.id, mode.size) > 0
          ? { kind: "decoration", decorationTypeId: decoration.id, size: mode.size }
          : { kind: "none" };
      this.refreshUi();
      this.saveNow();
    }
  }

  private addFishToTank(type: FishType, x: number, y: number, options: { gender?: FishGender; evolutionStage?: number; tankLevel?: number } = {}): Fish {
    const placedFish = new Fish(this, type, x, y, options);
    placedFish.addToContainer(this.tankLayer);
    placedFish.setTankVisible(placedFish.tankLevel === this.tankLevel);
    placedFish.sprite.setInteractive({ useHandCursor: true });
    placedFish.sprite.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.selectedFishIndex = this.fish.indexOf(placedFish);
      this.showFishDetails(placedFish);
    });
    this.fish.push(placedFish);
    return placedFish;
  }

  private placeFishWithCompatibility(type: FishType, x: number, y: number): void {
    this.fishInventory.set(type.id, this.getFishInventory(type.id) - 1);
    const placedFish = this.addFishToTank(type, x, y, { tankLevel: this.tankLevel });
    placedFish.markCoinDropped(this.time.now + 2500);

    this.floatTankText(`${type.name} added`, x, y - 34, "#ffffff");
    this.placementMode = { kind: "none" };
    this.closeModal();
    this.refreshUi();
    this.saveNow();
  }

  private randomFishPlacement(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      Phaser.Math.Between(tankBounds.left + 70, tankBounds.right - 70),
      Phaser.Math.Between(tankBounds.top + 150, tankBounds.bottom - 120)
    );
  }

  private addDecorationToTank(decoration: DecorationType, x: number, y: number, size: DecorationSize = "m"): void {
    const image = this.add.image(x, y, decoration.texture).setDepth(y > tankBounds.bottom - 80 ? 5 : 3);
    this.fitDecorationDisplay(image, decoration, size);
    image.setInteractive({ useHandCursor: true, draggable: true });
    this.tankLayer.add(image);
    const placedDecoration = { typeId: decoration.id, size, image, tankLevel: this.tankLevel };
    image.setVisible(placedDecoration.tankLevel === this.tankLevel);
    this.placedDecorations.push(placedDecoration);
    this.input.setDraggable(image);
    this.bindDecorationDrag(placedDecoration);
  }

  private fitDecorationDisplay(image: Phaser.GameObjects.Image, decoration: DecorationType, size: DecorationSize = "m"): void {
    const maxWidthByRarity: Record<DecorationType["rarity"], number> = {
      common: 68,
      rare: 76,
      superRare: 84
    };
    const maxHeightByRarity: Record<DecorationType["rarity"], number> = {
      common: 58,
      rare: 66,
      superRare: 74
    };
    const sizeScale = decorationSizes[size].scale;
    const maxWidth = maxWidthByRarity[decoration.rarity] * sizeScale;
    const maxHeight = maxHeightByRarity[decoration.rarity] * sizeScale;
    const sourceWidth = Math.max(1, image.width);
    const sourceHeight = Math.max(1, image.height);
    const scale = Math.min(maxWidth / sourceWidth, maxHeight / sourceHeight);
    image.setDisplaySize(sourceWidth * scale, sourceHeight * scale);
  }

  private bindDecorationDrag(decoration: PlacedDecoration): void {
    decoration.image.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
    });
    decoration.image.on("dragstart", () => {
      if (this.activeScreen !== "tank") {
        return;
      }

      this.draggedDecoration = decoration;
      decoration.image.setAlpha(0.78);
      decoration.image.setDepth(9);
      this.showDecorationTrashTarget(true);
      this.floatTankText("Drag to move", decoration.image.x, decoration.image.y - 36, "#d7f4ff");
    });
    decoration.image.on("drag", (pointer: Phaser.Input.Pointer) => {
      if (this.draggedDecoration !== decoration || this.activeScreen !== "tank") {
        return;
      }

      const pointerPoint = this.pointerDesignPoint(pointer);
      const tankPoint = this.screenToTankPoint(pointerPoint.x, pointerPoint.y);
      this.moveDecoration(decoration, tankPoint.x, tankPoint.y);
      this.highlightDecorationTrashTarget(decorationTrashZone.contains(pointerPoint.x, pointerPoint.y));
    });
    decoration.image.on("dragend", (pointer: Phaser.Input.Pointer) => {
      if (this.draggedDecoration !== decoration) {
        return;
      }

      decoration.image.setAlpha(1);
      this.showDecorationTrashTarget(false);
      this.draggedDecoration = undefined;

      const pointerPoint = this.pointerDesignPoint(pointer);
      if (this.activeScreen === "tank" && decorationTrashZone.contains(pointerPoint.x, pointerPoint.y)) {
        this.trashDecoration(decoration);
        return;
      }

      this.saveNow();
    });
  }

  private moveDecoration(decoration: PlacedDecoration, x: number, y: number): void {
    decoration.image.setPosition(
      Phaser.Math.Clamp(x, tankBounds.left + 24, tankBounds.right - 24),
      Phaser.Math.Clamp(y, tankBounds.top + 118, tankBounds.bottom - 30)
    );
    decoration.image.setDepth(this.draggedDecoration === decoration ? 9 : decoration.image.y > tankBounds.bottom - 80 ? 5 : 3);
  }

  private trashDecoration(decoration: PlacedDecoration): void {
    const index = this.placedDecorations.indexOf(decoration);
    if (index < 0) {
      return;
    }

    this.placedDecorations.splice(index, 1);
    const x = decoration.image.x;
    const y = decoration.image.y;
    decoration.image.destroy();
    this.floatTankText("Trashed", x, y - 24, "#ffccd5");
    this.refreshUi();
    this.saveNow();
  }

  private addHelperCreatureToTank(creatureType: HelperCreatureType, x: number, y = tankBounds.bottom - 36, targetX = x, tankLevel = this.tankLevel): HelperCreature {
    const yBounds = { min: tankBounds.bottom - 48, max: tankBounds.bottom - 28 };
    const helper = new HelperCreature(
      this,
      creatureType,
      Phaser.Math.Clamp(x, tankBounds.left + 24, tankBounds.right - 24),
      Phaser.Math.Clamp(y, yBounds.min, yBounds.max),
      { tankLevel }
    );
    helper.restoreProgress(targetX);
    helper.addToContainer(this.tankLayer);
    helper.setTankVisible(helper.tankLevel === this.tankLevel);
    helper.sprite.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.floatTankText(`${creatureType.name}: ${creatureType.feedSeconds ? "feeder" : "helper"}`, helper.sprite.x, helper.sprite.y - 24, "#d7f4ff");
    });
    this.helperCreatures.push(helper);
    return helper;
  }

  private restoreSavedGame(): void {
    const saved = loadGame();
    if (!saved) {
      return;
    }

    this.tankStates = this.tankStatesFromSave(saved);
    this.ownedTankLevels = new Set((saved.tank.ownedLevels ?? [1]).filter((level) => level >= 1 && level <= maxOwnedTanks));
    this.ownedTankLevels.add(1);
    this.tankNames = this.tankNamesFromRecord(saved.tank.names);
    this.tankLevel = this.hasTankLevel(saved.tank.activeLevel ?? saved.tank.level)
      ? Math.max(1, Math.floor(saved.tank.activeLevel ?? saved.tank.level ?? 1))
      : 1;
    this.applyTankState(this.tankLevel);
    this.fishCatalogLevel = 1;
    this.applyTankViewScale();
    this.settings = { ...saved.settings };
    this.dailyGoals = this.normalizeDailyGoals(saved.dailyGoals);
    this.autoFeederEndsAt = Math.max(0, saved.rentals?.autoFeederEndsAt ?? 0);
    this.autoCollectorEndsAt = Math.max(0, saved.rentals?.autoCollectorEndsAt ?? 0);
    this.autoFeederMinutes = this.sanitizeRentalMinutes(saved.rentals?.autoFeederMinutes ?? 1);
    this.autoCollectorMinutes = this.sanitizeRentalMinutes(saved.rentals?.autoCollectorMinutes ?? 1);

    for (const savedDecoration of saved.decorations) {
      const decoration = decorationTypes.find((item) => item.id === savedDecoration.typeId);
      if (decoration) {
        const previousTank = this.tankLevel;
        this.tankLevel = Math.max(1, Math.floor(savedDecoration.tankLevel ?? 1));
        this.addDecorationToTank(decoration, savedDecoration.x, savedDecoration.y, this.sanitizeDecorationSize(savedDecoration.size));
        this.tankLevel = previousTank;
      }
    }

    for (const savedCreature of saved.helperCreatures) {
      const creatureType = helperCreatureTypes.find((item) => item.id === savedCreature.typeId);
      if (creatureType) {
        this.addHelperCreatureToTank(creatureType, savedCreature.x, savedCreature.y, savedCreature.targetX, savedCreature.tankLevel ?? 1);
      }
    }

    for (const savedFish of saved.fish) {
      const type = fishTypes.find((fishType) => fishType.id === savedFish.typeId);
      if (!type) {
        continue;
      }

      const restoredFish = this.addFishToTank(type, savedFish.x, savedFish.y, {
        gender: savedFish.gender,
        evolutionStage: savedFish.evolutionStage,
        tankLevel: savedFish.tankLevel ?? 1
      });
      restoredFish.restoreProgress(
        savedFish.ageSeconds,
        savedFish.hunger,
        savedFish.health,
        this.time.now + savedFish.nextCoinDropInMs,
        savedFish.fatalCareSeconds
      );
    }
    this.refreshFishTankVisibility();
    this.refreshHelperTankVisibility();
    this.refreshDecorationTankVisibility();

    const elapsedSeconds = calculateOfflineSeconds(saved.savedAt);
    if (elapsedSeconds > 0) {
      this.offlineProgress = this.applyOfflineProgress(elapsedSeconds);
      if (elapsedSeconds >= 60) {
        this.showOfflineSummary();
      }
      this.saveNow();
    }
  }

  private applyOfflineProgress(elapsedSeconds: number): OfflineProgress {
    const earned = createEmptyWallet();
    const earnedByTank = new Map<number, Wallet>();
    const offlineDeaths: Fish[] = [];

    for (const currentFish of this.fish) {
      const productionOptions = currentFish.productionOptions();
      const primaryProduction = currentFish.primaryProduction();
      const wasInFatalCareState = currentFish.isInFatalCareState();
      const canProduce = currentFish.health >= 35 && currentFish.hunger < 86;
      if (canProduce) {
        for (const production of productionOptions) {
          const dropCount = Math.min(40, Math.floor(elapsedSeconds / production.intervalSeconds));
          const amount = Math.floor(dropCount * production.amount * production.chance);
          earned[production.coinType] += amount;
          const tankEarned = earnedByTank.get(currentFish.tankLevel) ?? createEmptyWallet();
          tankEarned[production.coinType] += amount;
          earnedByTank.set(currentFish.tankLevel, tankEarned);
        }
      }

      currentFish.setAgeSeconds(currentFish.ageSeconds + elapsedSeconds);
      currentFish.hunger = Phaser.Math.Clamp(
        currentFish.hunger + Math.min(52, currentFish.hungerPerSecond() * elapsedSeconds * 0.045),
        overfullHungerFloor,
        100
      );

      if (currentFish.hunger > 86) {
        currentFish.health = Phaser.Math.Clamp(currentFish.health - Math.min(45, elapsedSeconds / 120), 0, 100);
      }

      currentFish.addFatalCareSeconds(wasInFatalCareState ? elapsedSeconds : 0);
      if (currentFish.isDeadFromNeglect()) {
        offlineDeaths.push(currentFish);
      }

      currentFish.nextCoinDropAt = this.time.now + primaryProduction.intervalSeconds * 1000;
    }

    for (const deadFish of offlineDeaths) {
      const index = this.fish.indexOf(deadFish);
      if (index >= 0) {
        this.removeFishAt(index);
      }
    }

    this.cleanliness = Phaser.Math.Clamp(
      this.cleanliness - Math.min(50, elapsedSeconds * (0.0015 + this.fish.length * 0.0004)),
      0,
      100
    );

    for (const [level, tankEarned] of earnedByTank) {
      const state = this.ensureTankState(level);
      for (const coinType of Object.keys(tankEarned) as Array<keyof Wallet>) {
        if (tankEarned[coinType] > 0) {
          earn(state.wallet, coinType, tankEarned[coinType]);
        }
      }
    }
    this.applyTankState(this.tankLevel);

    return { elapsedSeconds, earned };
  }

  private saveNow(savedAt = Date.now()): void {
    this.captureActiveTankState();
    const snapshot: SavedGame = {
      version: SAVE_VERSION,
      savedAt,
      wallet: { ...this.wallet },
      foodInventory: this.foodInventoryRecord(),
      fishInventory: mapToRecord(this.fishInventory),
      decorationInventory: mapToRecord(this.decorationInventory),
      creatureInventory: mapToRecord(this.creatureInventory),
      fish: this.fish.map((currentFish) => ({
        typeId: currentFish.type.id,
        x: currentFish.sprite.x,
        y: currentFish.sprite.y,
        ageSeconds: currentFish.ageSeconds,
        hunger: currentFish.hunger,
        health: currentFish.health,
        nextCoinDropInMs: Math.max(0, currentFish.nextCoinDropAt - this.time.now),
        fatalCareSeconds: currentFish.fatalCareSeconds,
        gender: currentFish.gender,
        evolutionStage: currentFish.evolutionStage,
        tankLevel: currentFish.tankLevel
      })),
      decorations: this.placedDecorations.map((decoration) => ({
        typeId: decoration.typeId,
        tankLevel: decoration.tankLevel,
        x: decoration.image.x,
        y: decoration.image.y,
        size: decoration.size
      })),
      helperCreatures: this.helperCreatures.map((helper) => ({
        typeId: helper.type.id,
        tankLevel: helper.tankLevel,
        x: helper.sprite.x,
        y: helper.sprite.y,
        targetX: helper.getTargetX()
      })),
      tank: {
        cleanliness: this.cleanliness,
        cleanedAt: this.cleanedAt,
        level: Math.max(...this.sortedOwnedTankLevels()),
        ownedLevels: this.sortedOwnedTankLevels(),
        activeLevel: this.tankLevel,
        names: this.tankNamesRecord(),
        states: this.tankStatesRecord()
      },
      settings: { ...this.settings },
      dailyGoals: {
        date: this.dailyGoals.date,
        claimed: [...this.dailyGoals.claimed]
      },
      rentals: {
        autoFeederEndsAt: this.isAutoFeederActive() ? this.autoFeederEndsAt : 0,
        autoCollectorEndsAt: this.isAutoCollectorActive() ? this.autoCollectorEndsAt : 0,
        autoFeederMinutes: this.autoFeederMinutes,
        autoCollectorMinutes: this.autoCollectorMinutes
      }
    };

    saveGame(snapshot);
  }

  private spendPrice(price: FishType["price"]): boolean {
    if (!spend(this.wallet, price)) {
      this.floatText(`Need ${formatPrice(price)}`, toastX, toastY, "#ffb0a8");
      return false;
    }

    return true;
  }

  private dropCoin(fish: Fish, production = fish.activeProduction()): void {
    this.createCoinDrop(fish.sprite.x, fish.sprite.y - 24, production.amount, production.coinType);
  }

  private createCoinDrop(x: number, y: number, value: number, coinType: CoinType): CoinDrop {
    const coin = new CoinDrop(this, x, y, value, coinType);
    coin.setWorldScaleCompensation(this.tankViewScaleForLevel());
    coin.addToContainer(this.tankLayer);
    coin.sprite.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.collectCoin(coin, false);
    });
    this.coinDrops.push(coin);
    return coin;
  }

  private collectCoin(coin: CoinDrop, automated: boolean): void {
    if (!this.coinDrops.includes(coin)) {
      return;
    }

    earn(this.wallet, coin.coinType, coin.value);
    this.floatTankText(automated ? `Auto +${formatNumber(coin.value)}` : `+${formatNumber(coin.value)}`, coin.sprite.x, coin.sprite.y - 20, coin.visual.textColor);
    this.coinDrops = this.coinDrops.filter((drop) => drop !== coin);
    coin.destroy();
    this.refreshUi();
    this.saveNow();
  }

  private removeFood(food: FoodPellet): void {
    this.foods = this.foods.filter((item) => item !== food);
    food.destroy();
  }

  private foodsAssignedToFish(targetFish: Fish): FoodPellet[] {
    return this.foods.filter((food) => this.fishAssignedToFood(food) === targetFish);
  }

  private fishAssignedToFood(food: FoodPellet): Fish | undefined {
    return this.activeFish()
      .filter((currentFish) => currentFish.canChaseFood(food))
      .sort((first, second) => {
        const hungerGap = second.hunger - first.hunger;
        if (Math.abs(hungerGap) > 0.1) {
          return hungerGap;
        }

        return (
          Phaser.Math.Distance.BetweenPoints(first.sprite, food.sprite) -
          Phaser.Math.Distance.BetweenPoints(second.sprite, food.sprite)
        );
      })[0];
  }

  private removeExpiredFood(): void {
    const expiredFoods = this.foods.filter((food) => food.isExpired());
    if (expiredFoods.length === 0) {
      return;
    }

    this.foods = this.foods.filter((food) => !food.isExpired());
    for (const food of expiredFoods) {
      food.destroy();
    }
    this.saveNow();
  }

  private showMissedFoodEmotes(food: FoodPellet, winner: Fish): void {
    for (const fish of this.activeFish()) {
      if (fish === winner || fish.fullnessRatio() >= 0.2 || !fish.isInterestedInFood(food)) {
        continue;
      }

      fish.showMissedFoodEmoji(this.time.now);
    }
  }

  private refreshUi(renderControls = true): void {
    const displayLevel = this.tankDisplayLevel();
    this.hudText.setText(
      `C:${formatNumber(this.wallet.common)}   R:${formatNumber(this.wallet.rare)}   SR:${formatNumber(this.wallet.superRare)}   W:${formatNumber(this.calculateTankNetWorth())}`
    );
    this.hudCommonText.setText(formatNumber(this.wallet.common));
    this.hudRareText.setText(formatNumber(this.wallet.rare));
    this.hudSuperRareText.setText(formatNumber(this.wallet.superRare));
    this.hudWealthText.setText(formatNumber(this.calculateTankNetWorth()));
    this.tankLevelBadgeText.setText(formatNumber(displayLevel));
    this.drawTankLevelBadgeHue(displayLevel);
    this.refreshCareStatusTexts();
    this.hudNeedText.setText(this.getHudNeedLabel());
    if (renderControls) {
      this.createFoodDock();
      this.renderTabControls();
    }
    this.refreshStatus();
  }

  private refreshStatus(): void {
    const activeFish = this.activeFish();
    if (activeFish.length === 0) {
      this.statusText.setText(`${this.getTankName(this.tankLevel)} Lv${formatNumber(this.tankDisplayLevel())}   Fish 0/${formatNumber(this.maxFishCapacityForLevel())}   Coin ${formatNumber(this.coinDrops.length)}/${formatNumber(maxCoinDrops)}`);
      this.refreshCareStatusTexts();
      this.hudNeedText.setText(this.getHudNeedLabel());
      return;
    }

    const counts = activeFish.reduce(
      (summary, currentFish) => {
        summary[currentFish.state] += 1;
        return summary;
      },
      { happy: 0, hungry: 0, ill: 0 } as Record<FishState, number>
    );

    this.statusText.setText(
      `${this.getTankName(this.tankLevel)} Lv${formatNumber(this.tankDisplayLevel())}   Fish ${formatNumber(activeFish.length)}/${formatNumber(this.maxFishCapacityForLevel())}   Coin ${formatNumber(this.coinDrops.length)}/${formatNumber(maxCoinDrops)}`
    );
    this.refreshCareStatusTexts();
    this.hudNeedText.setText(`${this.getHudNeedLabel()}   H${formatNumber(counts.happy)} Hu${formatNumber(counts.hungry)} I${formatNumber(counts.ill)}`);
  }

  private getCareStatusLabel(): string {
    return `Food ${formatNumber(this.getTotalFoodInventory())}   Clean ${formatNumber(Math.round(this.cleanliness))}%   Happy ${formatNumber(Math.round(this.calculateTankHappiness()))}%`;
  }

  private refreshCareStatusTexts(): void {
    const foodLabel = `Food ${formatNumber(this.getTotalFoodInventory())}`;
    const cleanLabel = `Clean ${formatNumber(Math.round(this.cleanliness))}%`;
    const happyLabel = `Happy ${formatNumber(Math.round(this.calculateTankHappiness()))}%`;
    this.modeText.setText(`${foodLabel}   ${cleanLabel}   ${happyLabel}`);
    this.hudFoodStatusText.setText(foodLabel);
    this.hudCleanStatusText.setText(cleanLabel);
    this.hudHappyStatusText.setText(happyLabel);
  }

  private getHudNeedLabel(): string {
    return this.placementMode.kind === "none" ? this.getCompactTankNeedIndicator() : this.getModeLabel();
  }

  private getModeLabel(): string {
    const mode = this.placementMode;

    if (mode.kind === "fish") {
      const fishType = fishTypes.find((item) => item.id === mode.fishTypeId);
      return `Selected: place ${fishType?.name ?? "fish"} in the tank`;
    }

    if (mode.kind === "food") {
      const foodType = foodTypes.find((item) => item.id === mode.foodTypeId);
      return `Selected: drop ${foodType?.name ?? "food"} in the tank`;
    }

    if (mode.kind === "decoration") {
      const decorationType = decorationTypes.find((item) => item.id === mode.decorationTypeId);
      return `Selected: place ${decorationType?.name ?? "decoration"} ${decorationSizes[mode.size].label}`;
    }

    return this.rentalStatusLabel() || this.getTankNeedIndicator();
  }

  private foodIconLabel(foodType: FoodType): string {
    const labels: Record<FoodTypeId, string> = {
      micro: "Micro",
      basic: "S Food",
      basicMedium: "M Food",
      basicLarge: "L Food",
      basicXL: "XL Food",
      premium: "Prem",
      herb: "Herb",
      protein: "Prot",
      coral: "Coral",
      medicine: "Med",
      evolve: "Evolve",
      event: "Event"
    };
    return `${labels[foodType.id]}\nx${formatNumber(this.getFoodInventory(foodType.id))}`;
  }

  private foodTextureKey(foodTypeId: FoodTypeId): string {
    return `food-${foodTypeId}`;
  }

  private isDroppableFood(foodTypeId: FoodTypeId): boolean {
    return foodTypeId !== evolvePillFoodTypeId;
  }

  private getFishInventory(fishTypeId: string): number {
    return this.fishInventory.get(fishTypeId) ?? 0;
  }

  private getFoodInventory(foodTypeId: FoodTypeId): number {
    return this.foodInventory.get(foodTypeId) ?? 0;
  }

  private getFoodBuyQuantity(foodTypeId: FoodTypeId): number {
    return this.foodBuyQuantities.get(foodTypeId) ?? 1;
  }

  private changeFoodBuyQuantity(foodTypeId: FoodTypeId, delta: number): void {
    const quantity = Phaser.Math.Clamp(this.getFoodBuyQuantity(foodTypeId) + delta, 1, maxFoodBuyQuantity);
    this.foodBuyQuantities.set(foodTypeId, quantity);
    this.renderTabControls();
    this.refreshUi(false);
  }

  private addFoodBuyQuantity(foodTypeId: FoodTypeId, quantityToAdd: number): void {
    const currentQuantity = this.getFoodBuyQuantity(foodTypeId);
    const nextQuantity = this.foodBuyQuantities.has(foodTypeId) ? currentQuantity + quantityToAdd : quantityToAdd;
    this.foodBuyQuantities.set(foodTypeId, Phaser.Math.Clamp(Math.floor(nextQuantity), 1, maxFoodBuyQuantity));
    this.renderTabControls();
    this.refreshUi(false);
  }

  private setFoodBuyQuantity(foodTypeId: FoodTypeId, quantity: number): void {
    if (quantity <= 0) {
      this.resetFoodBuyQuantity(foodTypeId);
      return;
    }

    this.foodBuyQuantities.set(foodTypeId, Phaser.Math.Clamp(Math.floor(quantity), 1, maxFoodBuyQuantity));
    this.renderTabControls();
    this.refreshUi(false);
  }

  private resetFoodBuyQuantity(foodTypeId: FoodTypeId): void {
    this.foodBuyQuantities.delete(foodTypeId);
    this.renderTabControls();
    this.refreshUi(false);
  }

  private foodBuyQuantityRecord(): Record<string, number> {
    return Object.fromEntries(foodTypes.map((foodType) => [foodType.id, this.getFoodBuyQuantity(foodType.id)]));
  }

  private quantityPrice(price: FishType["price"], quantity: number): FishType["price"] {
    return {
      coinType: price.coinType,
      amount: price.amount * Phaser.Math.Clamp(Math.floor(quantity), 1, 99)
    };
  }

  private getTotalFoodInventory(): number {
    return [...this.foodInventory.values()].reduce((total, count) => total + count, 0);
  }

  private foodInventoryRecord(): Record<FoodTypeId, number> {
    return Object.fromEntries(
      [...this.foodInventory.entries()].filter(([, count]) => count > 0)
    ) as Record<FoodTypeId, number>;
  }

  private getSelectedFoodType(): FoodType {
    return foodTypes.find((foodType) => foodType.id === this.selectedFoodTypeId) ?? basicFood;
  }

  private cycleSelectedFood(): void {
    const currentIndex = foodTypes.findIndex((foodType) => foodType.id === this.selectedFoodTypeId);
    const nextFood = foodTypes[(currentIndex + 1 + foodTypes.length) % foodTypes.length];
    this.selectedFoodTypeId = nextFood.id;
    this.placementMode = { kind: "none" };
    this.refreshUi();
  }

  private describeFoodInventory(): string {
    const owned = foodTypes
      .filter((foodType) => this.getFoodInventory(foodType.id) > 0)
      .map((foodType) => `${foodType.name} x${formatNumber(this.getFoodInventory(foodType.id))}`);
    return owned.length > 0 ? owned.join(", ") : "empty";
  }

  private decorationInventoryKey(decorationTypeId: string, size: DecorationSize): string {
    return `${decorationTypeId}:${size}`;
  }

  private sanitizeDecorationSize(size: string | undefined): DecorationSize {
    return decorationSizeOrder.includes(size as DecorationSize) ? size as DecorationSize : "m";
  }

  private decorationVariantPrice(decorationType: DecorationType, size: DecorationSize): Price {
    return {
      coinType: decorationType.price.coinType,
      amount: Math.max(1, Math.round(decorationType.price.amount * decorationSizes[size].priceMultiplier))
    };
  }

  private getDecorationInventory(decorationTypeId: string, size: DecorationSize = "m"): number {
    const variantCount = this.decorationInventory.get(this.decorationInventoryKey(decorationTypeId, size)) ?? 0;
    if (size === "m") {
      return variantCount + (this.decorationInventory.get(decorationTypeId) ?? 0);
    }
    return variantCount;
  }

  private getCreatureInventory(creatureTypeId: string): number {
    return this.creatureInventory.get(creatureTypeId) ?? 0;
  }

  private getFishTankLevel(fishType: FishType): number {
    return 1;
  }

  private canTankAcceptFish(fishType: FishType): boolean {
    return true;
  }

  private evolutionFee(targetFish: Fish): FishType["price"] {
    const coinType = targetFish.type.price.coinType;
    const amount = Math.max(8, Math.ceil(targetFish.type.price.amount * (0.5 + targetFish.evolutionStage * 0.35)));
    return { coinType, amount };
  }

  private findBreedMate(index: number): number | undefined {
    const parent = this.fish[index];
    if (!parent) {
      return undefined;
    }

    return this.fish.findIndex(
      (candidate, candidateIndex) =>
        candidateIndex !== index &&
        candidate.tankLevel === parent.tankLevel &&
        candidate.type.id === parent.type.id &&
        candidate.gender !== parent.gender
    );
  }

  private chooseBreedBabyType(parentType: FishType, force?: "same" | "rare"): FishType {
    const shouldRare = force === "rare" || (force !== "same" && Phaser.Math.Between(1, 100) <= 30);
    if (!shouldRare) {
      return parentType;
    }

    const rareChoices = fishTypes.filter(
      (fishType) => fishType.rarity === "rare"
    );
    return Phaser.Utils.Array.GetRandom(rareChoices) ?? parentType;
  }

  private changeFishCatalogLevel(delta: number): void {
    this.fishCatalogLevel = 1;
    this.renderTabControls();
  }

  private getNextTankUpgradePrice(): FishType["price"] {
    return this.tankPriceForLevel(this.nextUnownedTankLevel());
  }

  private tankPriceForLevel(targetLevel: number): FishType["price"] {
    if (targetLevel <= 1) {
      return { coinType: "common", amount: 0 };
    }

    const sanitizedTargetLevel = Math.max(2, Math.floor(targetLevel));
    return {
      coinType: "common",
      amount: Math.ceil(350 * Math.pow(2.35, sanitizedTargetLevel - 2))
    };
  }

  private upgradeTank(): void {
    this.buyTank(this.nextUnownedTankLevel());
  }

  private nextUnownedTankLevel(): number {
    let level = 1;
    while (level < maxOwnedTanks && this.hasTankLevel(level)) {
      level += 1;
    }
    return level;
  }

  private clearTankDrops(): void {
    for (const food of this.foods) {
      food.destroy();
    }
    for (const coin of this.coinDrops) {
      coin.destroy();
    }
    this.foods = [];
    this.coinDrops = [];
  }

  private refreshFishTankVisibility(): void {
    for (const currentFish of this.fish) {
      currentFish.setTankVisible(currentFish.tankLevel === this.tankLevel);
    }
  }

  private refreshHelperTankVisibility(): void {
    for (const helper of this.helperCreatures) {
      helper.setTankVisible(helper.tankLevel === this.tankLevel);
    }
  }

  private refreshDecorationTankVisibility(): void {
    for (const decoration of this.placedDecorations) {
      decoration.image.setVisible(decoration.tankLevel === this.tankLevel);
    }
  }

  private walletWealth(wallet = this.wallet): number {
    return wallet.common * coinWealthValue.common + wallet.rare * coinWealthValue.rare + wallet.superRare * coinWealthValue.superRare;
  }

  private priceWealth(price: FishType["price"]): number {
    return price.amount * coinWealthValue[price.coinType];
  }

  private calculateTotalWealth(): number {
    return this.sortedOwnedTankLevels().reduce((total, level) => total + this.calculateTankNetWorth(level), 0);
  }

  private calculateTankNetWorth(level = this.tankLevel): number {
    const state = level === this.tankLevel ? undefined : this.ensureTankState(level);
    const wallet = state?.wallet ?? this.wallet;
    const foodInventory = state?.foodInventory ?? this.foodInventory;
    const fishInventory = state?.fishInventory ?? this.fishInventory;
    const decorationInventory = state?.decorationInventory ?? this.decorationInventory;
    const creatureInventory = state?.creatureInventory ?? this.creatureInventory;
    const fishInTank = this.fishInTank(level);
    const helpersInTank = this.helpersInTank(level);
    const decorationsInTank = this.decorationsInTank(level);
    const coinDrops = level === this.tankLevel ? this.coinDrops : [];
    const fishValue = this.fish.reduce((total, currentFish) => total + this.priceWealth({
      coinType: currentFish.type.sellBaseValue.coinType,
      amount: currentFish.getSellValue()
    }), 0);
    const activeFishValue = fishInTank.reduce((total, currentFish) => total + this.priceWealth({
      coinType: currentFish.type.sellBaseValue.coinType,
      amount: currentFish.getSellValue()
    }), 0);
    const foodValue = [...foodInventory.entries()].reduce((total, [foodTypeId, count]) => {
      const foodType = foodTypes.find((item) => item.id === foodTypeId);
      return total + (foodType ? this.priceWealth(foodType.price) * count : 0);
    }, 0);
    const storedFishValue = [...fishInventory.entries()].reduce((total, [fishTypeId, count]) => {
      const fishType = fishTypes.find((item) => item.id === fishTypeId);
      return total + (fishType ? this.priceWealth(fishType.sellBaseValue) * count : 0);
    }, 0);
    const decorationInventoryValue = [...decorationInventory.entries()].reduce((total, [decorationTypeId, count]) => {
      const [typeId, rawSize] = decorationTypeId.split(":");
      const decorationType = decorationTypes.find((item) => item.id === typeId);
      const size = this.sanitizeDecorationSize(rawSize);
      return total + (decorationType ? this.priceWealth(this.decorationVariantPrice(decorationType, size)) * count : 0);
    }, 0);
    const placedDecorationValue = decorationsInTank.reduce((total, decoration) => {
      const decorationType = decorationTypes.find((item) => item.id === decoration.typeId);
      return total + (decorationType ? this.priceWealth(this.decorationVariantPrice(decorationType, decoration.size)) : 0);
    }, 0);
    const backgroundAssetValue = [...(state?.backgroundInventory ?? this.ensureTankState(level).backgroundInventory).entries()].reduce((total, [assetId, count]) => {
      const asset = this.tankCosmeticById("background", assetId);
      return total + (asset ? this.priceWealth(asset.price) * count : 0);
    }, 0);
    const seabedAssetValue = [...(state?.seabedInventory ?? this.ensureTankState(level).seabedInventory).entries()].reduce((total, [assetId, count]) => {
      const asset = this.tankCosmeticById("seabed", assetId);
      return total + (asset ? this.priceWealth(asset.price) * count : 0);
    }, 0);
    const helperInventoryValue = [...creatureInventory.entries()].reduce((total, [creatureTypeId, count]) => {
      const creatureType = helperCreatureTypes.find((item) => item.id === creatureTypeId);
      return total + (creatureType ? this.priceWealth(creatureType.price) * count : 0);
    }, 0);
    const helperValue = helpersInTank.reduce((total, helper) => total + this.priceWealth(helper.type.price), 0);
    const coinDropValue = coinDrops.reduce((total, coin) => total + coin.value * coinWealthValue[coin.coinType], 0);

    return Math.round(this.walletWealth(wallet) + activeFishValue + foodValue + storedFishValue + decorationInventoryValue + placedDecorationValue + backgroundAssetValue + seabedAssetValue + helperInventoryValue + helperValue + coinDropValue);
  }

  private tankDisplayLevel(level = this.tankLevel): number {
    const worth = this.calculateTankNetWorth(level);
    return Math.max(1, Math.floor(Math.log10(Math.max(1, worth) / 250 + 1)) + 1);
  }

  private tankLevelBadgeTextureKeyForLevel(level: number): string {
    const tierIndex = Phaser.Math.Clamp(Math.floor(level), 1, tankLevelBadgeTextureKeys.length) - 1;
    return tankLevelBadgeTextureKeys[tierIndex];
  }

  private getTankNeedIndicator(): string {
    const nextTankLevel = this.nextUnownedTankLevel();
    const nextTankPrice = this.tankPriceForLevel(nextTankLevel);

    if (this.ownedTankLevels.size < maxOwnedTanks && canAfford(this.wallet, nextTankPrice)) {
      return `Ready: buy Tank ${formatNumber(nextTankLevel)} (${formatPriceLong(nextTankPrice)})`;
    }

    if (this.activeFish().length === 0) {
      return "Tank needs a fish from Shop";
    }

    if (this.getTotalFoodInventory() === 0 && this.fish.some((currentFish) => currentFish.hunger >= 45)) {
      return "Tank needs food purchase";
    }

    if (this.coinDrops.length >= maxCoinDrops) {
      return "Tank needs coin collection";
    }

    if (this.ownedTankLevels.size >= maxOwnedTanks) {
      return `Tank Lv${formatNumber(this.tankDisplayLevel())} | Worth ${formatNumber(this.calculateTankNetWorth())}`;
    }

    return `Next tank ${formatNumber(nextTankLevel)}: ${formatPriceLong(nextTankPrice)}`;
  }

  private getCompactTankNeedIndicator(): string {
    const nextTankLevel = this.nextUnownedTankLevel();
    const nextTankPrice = this.tankPriceForLevel(nextTankLevel);

    if (this.ownedTankLevels.size < maxOwnedTanks && canAfford(this.wallet, nextTankPrice)) {
      return `Buy Tank ${formatNumber(nextTankLevel)}: ${formatPriceLong(nextTankPrice)}`;
    }

    if (this.activeFish().length === 0) {
      return "Need fish";
    }

    if (this.getTotalFoodInventory() === 0 && this.fish.some((currentFish) => currentFish.hunger >= 45)) {
      return "Need food";
    }

    if (this.coinDrops.length >= maxCoinDrops) {
      return "Collect coins";
    }

    if (this.ownedTankLevels.size >= maxOwnedTanks) {
      return `Lv${formatNumber(this.tankDisplayLevel())} Worth ${formatNumber(this.calculateTankNetWorth())}`;
    }

    return `Next Tank ${formatNumber(nextTankLevel)}: ${formatPriceLong(nextTankPrice)}`;
  }

  private calculateTankHappiness(): number {
    const decorationBonus = this.activeDecorations().reduce((total, placedDecoration) => {
      const decoration = decorationTypes.find((item) => item.id === placedDecoration.typeId);
      return total + (decoration?.happinessBonus ?? 0);
    }, 0);
    const crowdingPenalty = Math.max(0, this.activeFish().length - 4) * 8 + Math.max(0, this.activeDecorations().length - 6) * 4;
    const cleanlinessPenalty = Math.max(0, 75 - this.cleanliness) * 0.55;
    return Phaser.Math.Clamp(68 + decorationBonus - crowdingPenalty - cleanlinessPenalty, 0, 100);
  }

  private calculateCurrentCompatibility(): CompatibilitySummary {
    return this.calculateCompatibilityForTypes(this.activeFish().map((currentFish) => currentFish.type));
  }

  private calculatePlacementCompatibility(candidate: FishType): CompatibilitySummary {
    return this.calculateCompatibilityForTypes([...this.activeFish().map((currentFish) => currentFish.type), candidate], candidate);
  }

  private calculateCompatibilityForTypes(_types: FishType[], _candidate?: FishType): CompatibilitySummary {
    return { score: 100, level: "good", warnings: [], incompatibleNames: [] };
  }

  private cleanTank(): void {
    if (this.cleanliness >= 96) {
      this.floatText("Already clean", toastX, toastY, "#d7f4ff");
      return;
    }

    this.cleanliness = 100;
    this.cleanedAt = Date.now();
    this.updateDirtyTankOverlay();
    this.floatText("Tank cleaned", toastX, toastY, "#a8ffb0");
    this.refreshUi();
    this.saveNow();
  }

  private rentAutoFeeder(): void {
    if (this.getFeedableFoodTypes().length === 0) {
      this.floatText("Buy food first", toastX, toastY, "#ffb0a8");
      return;
    }

    const wasActive = this.isAutoFeederActive();
    const price = this.rentalPrice(autoFeederPrice, this.autoFeederMinutes);
    if (!this.spendPrice(price)) {
      return;
    }

    this.autoFeederEndsAt = this.extendRentalEnd(this.autoFeederEndsAt, this.autoFeederMinutes);
    if (!wasActive) {
      this.nextAutoFeedAt = 0;
    }
    this.floatText(wasActive ? `Auto feed +${formatNumber(this.autoFeederMinutes)}m` : `Auto feed ${formatNumber(this.autoFeederMinutes)}m`, toastX, toastY, "#a8ffb0");
    this.refreshUi();
    this.saveNow();
  }

  private rentAutoCollector(): void {
    const wasActive = this.isAutoCollectorActive();
    const price = this.rentalPrice(autoCollectorPrice, this.autoCollectorMinutes);
    if (!this.spendPrice(price)) {
      return;
    }

    this.autoCollectorEndsAt = this.extendRentalEnd(this.autoCollectorEndsAt, this.autoCollectorMinutes);
    if (!wasActive) {
      this.nextAutoCollectAt = 0;
    }
    this.floatText(wasActive ? `Auto coins +${formatNumber(this.autoCollectorMinutes)}m` : `Auto coins ${formatNumber(this.autoCollectorMinutes)}m`, toastX, toastY, "#a8ffb0");
    this.refreshUi();
    this.saveNow();
  }

  private changeRentalMinutes(rental: "feeder" | "collector", delta: number): void {
    if (rental === "feeder") {
      this.autoFeederMinutes = this.sanitizeRentalMinutes(this.autoFeederMinutes + delta);
      this.floatText(`Feed ${formatNumber(this.autoFeederMinutes)}m`, toastX, toastY, "#d7f4ff");
    } else {
      this.autoCollectorMinutes = this.sanitizeRentalMinutes(this.autoCollectorMinutes + delta);
      this.floatText(`Coins ${formatNumber(this.autoCollectorMinutes)}m`, toastX, toastY, "#d7f4ff");
    }

    this.refreshUi();
    this.saveNow();
  }

  private setRentalMinutes(rental: "feeder" | "collector", minutes: number): void {
    if (rental === "feeder") {
      this.autoFeederMinutes = this.sanitizeRentalMinutes(minutes);
    } else {
      this.autoCollectorMinutes = this.sanitizeRentalMinutes(minutes);
    }

    this.refreshUi();
    this.saveNow();
  }

  private sanitizeRentalMinutes(minutes: number): number {
    return Phaser.Math.Clamp(Math.floor(minutes), minRentalMinutes, maxRentalMinutes);
  }

  private rentalPrice(basePrice: FishType["price"], minutes: number): FishType["price"] {
    return {
      coinType: basePrice.coinType,
      amount: basePrice.amount * this.sanitizeRentalMinutes(minutes)
    };
  }

  private extendRentalEnd(currentEndsAt: number, minutes: number): number {
    return Math.max(Date.now(), currentEndsAt) + this.sanitizeRentalMinutes(minutes) * rentalMinuteMs;
  }

  private updateRentals(): void {
    this.updateAutoFeeder();

    if (this.autoFeederEndsAt > 0 && !this.isAutoFeederActive()) {
      this.autoFeederEndsAt = 0;
      this.floatText("Auto feeder ended", toastX, toastY, "#d7f4ff");
      this.refreshUi(false);
      this.saveNow();
    }

    if (this.autoCollectorEndsAt > 0 && !this.isAutoCollectorActive()) {
      this.autoCollectorEndsAt = 0;
      this.floatText("Auto coins ended", toastX, toastY, "#d7f4ff");
      this.refreshUi(false);
      this.saveNow();
    }
  }

  private updateAutoFeeder(): void {
    if (!this.isAutoFeederActive() || this.time.now < this.nextAutoFeedAt) {
      return;
    }

    this.nextAutoFeedAt = this.time.now + 3200;
    const fishNeedingFood = this.activeFish()
      .filter((currentFish) => currentFish.health >= 35 && currentFish.hunger >= 50)
      .sort((first, second) => second.hunger - first.hunger);
    if (fishNeedingFood.length === 0) {
      return;
    }

    let droppedCount = 0;
    for (const targetFish of fishNeedingFood) {
      const foodType = this.chooseAutoFoodForFish(targetFish);
      if (!foodType) {
        continue;
      }

      this.dropAutoFood(foodType);
      droppedCount += 1;
    }

    if (droppedCount === 0) {
      return;
    }

    this.cleanliness = Phaser.Math.Clamp(this.cleanliness - 0.6 * droppedCount, 0, 100);
    this.createFoodDock();
    this.refreshUi(false);
    this.saveNow();
  }

  private dropAutoFood(foodType: FoodType): void {
    this.foodInventory.set(foodType.id, this.getFoodInventory(foodType.id) - 1);
    const x = Phaser.Math.Between(tankBounds.left + 36, tankBounds.right - 36);
    const y = tankBounds.top + Phaser.Math.Between(138, 176);
    const pellet = new FoodPellet(this, x, y, foodType);
    pellet.setWorldScaleCompensation(this.tankViewScaleForLevel());
    pellet.addToContainer(this.tankLayer);
    this.foods.push(pellet);
    this.floatTankText("Auto feed", x, y - 14, "#f7ff9a");
  }

  private updateAutoCollector(): void {
    if (!this.isAutoCollectorActive() || this.time.now < this.nextAutoCollectAt) {
      return;
    }

    this.nextAutoCollectAt = this.time.now + 350;
    const settledCoins = this.coinDrops.filter((coin) => coin.atBottom);
    for (const coin of settledCoins) {
      this.collectCoin(coin, true);
    }
  }

  private updateHelperCreatures(deltaSeconds: number): void {
    for (const helper of this.activeHelperCreatures()) {
      const action = helper.update(deltaSeconds, this.coinDrops, this.foods, this.activeFish());
      if (!action) {
        continue;
      }

      if (action.kind === "coin" && this.coinDrops.includes(action.coin)) {
        this.collectCoin(action.coin, true);
        this.floatTankText(`${helper.type.name} coin`, helper.sprite.x, helper.sprite.y - 20, "#ffe67a");
      }

      if (action.kind === "food" && this.foods.includes(action.food)) {
        this.removeFood(action.food);
        this.cleanliness = Phaser.Math.Clamp(this.cleanliness + 1.4, 0, 100);
        this.floatTankText("Cleaned", helper.sprite.x, helper.sprite.y - 20, "#a8ffb0");
        this.saveNow();
      }

      if (action.kind === "feed" && this.fish.includes(action.fish)) {
        const foodType = this.chooseAutoFoodForFish(action.fish);
        if (!foodType) {
          continue;
        }

        this.dropHelperFood(helper, action.fish, foodType);
      }
    }
  }

  private dropHelperFood(helper: HelperCreature, targetFish: Fish, foodType: FoodType): void {
    this.foodInventory.set(foodType.id, this.getFoodInventory(foodType.id) - 1);
    const launchX = Phaser.Math.Clamp(
      helper.sprite.x + Phaser.Math.Between(-38, 38),
      tankBounds.left + 28,
      tankBounds.right - 28
    );
    const launchY = Phaser.Math.Clamp(
      helper.sprite.y - Phaser.Math.Between(18, 34),
      tankBounds.bottom - 82,
      tankBounds.bottom - 44
    );
    const targetDirection = Math.sign(targetFish.sprite.x - helper.sprite.x) || Phaser.Math.RND.pick([-1, 1]);
    const velocityX = Phaser.Math.Between(54, 148) * targetDirection + Phaser.Math.Between(-44, 44);
    const velocityY = -Phaser.Math.Between(270, 390);
    const pellet = new FoodPellet(this, launchX, launchY, foodType, { velocityX, velocityY });
    pellet.setWorldScaleCompensation(this.tankViewScaleForLevel());
    pellet.addToContainer(this.tankLayer);
    this.foods.push(pellet);
    this.cleanliness = Phaser.Math.Clamp(this.cleanliness - 0.4, 0, 100);
    this.floatTankText(`${helper.type.name} tossed food`, launchX, launchY - 14, "#f7ff9a");
    this.createFoodDock();
    this.refreshUi(false);
    this.saveNow();
  }

  private chooseAutoFoodForFish(targetFish: Fish): FoodType | undefined {
    const choices = [
      ...targetFish.type.preferredFoodTypes,
      ...targetFish.type.requiredFoodTypes,
      ...foodTypes.filter((foodType) => foodType.acceptedByDefault).map((foodType) => foodType.id)
    ];

    const candidates = choices
      .map((foodTypeId) => foodTypes.find((item) => item.id === foodTypeId))
      .filter((foodType): foodType is FoodType =>
        foodType !== undefined &&
        foodType.id !== "medicine" &&
        this.isDroppableFood(foodType.id) &&
        this.getFoodInventory(foodType.id) > 0
      );

    return this.chooseBestCalorieFood(targetFish, candidates);
  }

  private chooseBestCalorieFood(targetFish: Fish, candidates: FoodType[]): FoodType | undefined {
    const uniqueCandidates = [...new Map(candidates.map((foodType) => [foodType.id, foodType])).values()];
    if (uniqueCandidates.length === 0) {
      return undefined;
    }

    const targetReduction = Phaser.Math.Clamp(targetFish.hunger, 18, 64);
    return uniqueCandidates.sort((first, second) => {
      const firstReduction = targetFish.hungerReductionFromFood(first);
      const secondReduction = targetFish.hungerReductionFromFood(second);
      const firstMiss = firstReduction >= targetReduction ? firstReduction - targetReduction : targetReduction - firstReduction + 100;
      const secondMiss = secondReduction >= targetReduction ? secondReduction - targetReduction : targetReduction - secondReduction + 100;
      return firstMiss - secondMiss || second.calories - first.calories;
    })[0];
  }

  private getFeedableFoodTypes(): FoodType[] {
    return foodTypes.filter((foodType) => foodType.id !== "medicine" && this.isDroppableFood(foodType.id) && this.getFoodInventory(foodType.id) > 0);
  }

  private isAutoFeederActive(): boolean {
    return this.autoFeederEndsAt > Date.now();
  }

  private isAutoCollectorActive(): boolean {
    return this.autoCollectorEndsAt > Date.now();
  }

  private remainingRentalSeconds(endsAt: number): number {
    return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  }

  private rentalStatusLabel(): string {
    const active: string[] = [];
    if (this.isAutoFeederActive()) {
      active.push(`Feed ${formatNumber(this.remainingRentalSeconds(this.autoFeederEndsAt))}s`);
    }
    if (this.isAutoCollectorActive()) {
      active.push(`Coins ${formatNumber(this.remainingRentalSeconds(this.autoCollectorEndsAt))}s`);
    }
    return active.join(" | ");
  }

  private normalizeDailyGoals(savedGoals: { date: string; claimed: string[] }): { date: string; claimed: string[] } {
    const today = this.localDateKey();
    if (savedGoals.date !== today) {
      return { date: today, claimed: [] };
    }

    return { date: today, claimed: savedGoals.claimed };
  }

  private localDateKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private claimDailyGoal(id: string, complete: boolean): void {
    if (this.dailyGoals.claimed.includes(id)) {
      this.floatText("Already claimed", toastX, toastY, "#d7f4ff");
      return;
    }

    if (!complete) {
      this.floatText("Goal not done", toastX, toastY, "#ffb0a8");
      return;
    }

    this.dailyGoals.claimed.push(id);
    earn(this.wallet, "common", 15);
    this.floatText(`+${formatNumber(15)} daily`, toastX, toastY, "#ffe67a");
    this.refreshUi();
    this.saveNow();
  }

  private toggleSetting(key: keyof typeof this.settings): void {
    this.settings[key] = !this.settings[key];
    this.refreshUi();
    this.saveNow();
  }

  private rarityLabel(rarity: FishType["rarity"]): string {
    const labels: Record<FishType["rarity"], string> = {
      common: "C",
      rare: "R",
      superRare: "SR"
    };
    return labels[rarity];
  }

  private rarityStarsLabel(rarity: FishType["rarity"]): string {
    return "*".repeat(rarityStarCount(rarity));
  }

  private fishTypeProductionHint(fishType: FishType): string {
    const babyProduction = fishType.ageCurve.baby.production[0];
    const mainCoin = babyProduction?.coinType ?? fishType.price.coinType;

    if (fishType.rarity === "common") {
      return `Drops ${this.storeCoinLabel(mainCoin)} + Rare bonus`;
    }

    if (fishType.rarity === "rare") {
      return `Drops ${this.storeCoinLabel(mainCoin)} + Rare/Super bonus`;
    }

    return `Drops ${this.storeCoinLabel(mainCoin)}`;
  }

  private showFirstFishDetails(): void {
    const targetFish = this.selectedFishIndex !== undefined ? this.fish[this.selectedFishIndex] : this.fish[0];
    if (!targetFish) {
      this.floatText("No fish yet", toastX, toastY, "#ffb0a8");
      return;
    }

    this.showFishDetails(targetFish);
  }

  private showFishDetails(targetFish: Fish): void {
    const index = this.fish.indexOf(targetFish);
    this.selectedFishIndex = index >= 0 ? index : undefined;
    const preferredFood = targetFish.type.preferredFoodTypes.join(", ");
    const requiredFood = targetFish.type.requiredFoodTypes.join(", ");
    this.showModal(
      `${targetFish.type.name} Details`,
      [
        `${"*".repeat(rarityStarCount(targetFish.type.rarity))} ${targetFish.type.rarity} | ${this.getTankName(targetFish.tankLevel)} | Age ${targetFish.ageLabel()} | ${targetFish.state}`,
        `Gender ${targetFish.gender} | Evo ${formatNumber(targetFish.evolutionStage)}/${formatNumber(maxEvolutionStage)} | Sell ${formatPrice({ coinType: targetFish.type.sellBaseValue.coinType, amount: targetFish.getSellValue() })}`,
        `Length ${targetFish.lengthLabel()} | Weight ${targetFish.weightLabel()}`,
        `Food need ${formatNumber(Math.round(targetFish.mealCaloriesNeeded()))} cal | Burn x${targetFish.calorieNeedMultiplier().toFixed(1)}`,
        `Hunger ${formatNumber(Math.round(targetFish.hunger))} | Health ${formatNumber(Math.round(targetFish.health))} | Evolve ${formatPrice(this.evolutionFee(targetFish))}`,
        `Eats ${requiredFood}; prefers ${preferredFood}`,
        `Produces ${targetFish.productionSummary()}`,
        `Community: ${this.describeCompatibility(targetFish.type)}`
      ],
      [
        { label: "Sell", fill: 0x76512d, action: () => this.showSellConfirmation(index) },
        { label: "Close", fill: 0x254d68, action: () => this.closeModal() }
      ]
    );
  }

  private showMoveFishOptions(index: number): void {
    this.floatText("Tanks are isolated", toastX, toastY, "#ffb0a8");
  }

  private moveFishToTank(index: number, level: number): void {
    this.floatText("Tanks are isolated", toastX, toastY, "#ffb0a8");
  }

  private describeCompatibility(_fishType: FishType): string {
    const compatibility = this.calculateCurrentCompatibility();
    return `${formatNumber(compatibility.score)}% community safe`;
  }

  private showSellConfirmation(index: number): void {
    const targetFish = this.fish[index];
    if (!targetFish) {
      this.floatText("No fish to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    if (this.fish.length <= 1) {
      this.showModal(
        "Starter Protected",
        [
          "Keep at least one fish in the tank.",
          "Buy another fish before selling this one."
        ],
        [{ label: "OK", fill: 0x356a35, action: () => this.closeModal() }]
      );
      return;
    }

    const protectedRarity = targetFish.type.rarity !== "common" || targetFish.type.acquisitionSources.includes("event");
    this.showModal(
      protectedRarity ? "Sell Rare Fish" : "Sell Fish",
      [
        `${targetFish.type.name} will leave this tank.`,
        `Rarity: ${targetFish.type.rarity} | Age ${targetFish.ageLabel()}`,
        `Length ${targetFish.lengthLabel()} | Weight ${targetFish.weightLabel()}`,
        ...(protectedRarity ? ["Rare and event fish require extra care before selling."] : []),
        `You receive ${formatPrice({ coinType: targetFish.type.sellBaseValue.coinType, amount: targetFish.getSellValue() })}.`
      ],
      [
        { label: "Confirm", fill: 0x76512d, action: () => this.sellFishByIndex(index) },
        { label: "Cancel", fill: 0x254d68, action: () => this.closeModal() }
      ]
    );
  }

  private showHelperSellConfirmation(index: number): void {
    const targetHelper = this.helperCreatures[index];
    if (!targetHelper) {
      this.floatText("No helper to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellPrice = this.helperSellPrice(targetHelper.type);
    this.showModal(
      "Sell Helper",
      [
        `${targetHelper.type.name} will leave this tank.`,
        `Role: ${targetHelper.type.feedSeconds ? "Feeder" : targetHelper.type.habitatTags.join(", ")}`,
        `You receive ${formatPrice(sellPrice)}.`
      ],
      [
        { label: "Confirm", fill: 0x76512d, action: () => this.sellHelperCreatureByIndex(index) },
        { label: "Cancel", fill: 0x254d68, action: () => this.closeModal() }
      ]
    );
  }

  private showOfflineSummary(): void {
    this.showModal(
      "Offline Summary",
      [
        `${formatNumber(Math.floor(this.offlineProgress.elapsedSeconds / 60))} minutes away.`,
        `Earned ${formatWallet(this.offlineProgress.earned)}.`,
        `Cleanliness is ${formatNumber(Math.round(this.cleanliness))}%. Fish grew and got a little hungrier.`
      ],
      [{ label: "Continue", fill: 0x356a35, action: () => this.closeModal() }]
    );
  }

  private showResetConfirmation(): void {
    this.showModal(
      "Reset Save",
      ["This clears the local aquarium save on this device.", "The page will return to the starter wallet and food."],
      [
        {
          label: "Reset",
          fill: 0x76512d,
          action: () => {
            clearSave();
            window.location.reload();
          }
        },
        { label: "Cancel", fill: 0x254d68, action: () => this.closeModal() }
      ]
    );
  }

  private showModal(
    title: string,
    lines: string[],
    actions: Array<{ label: string; fill: number; action: () => void }>
  ): void {
    this.closeModal();
    this.modalTitle = title;

    const background = this.add.rectangle(0, 0, 360, 240, 0x10283a, 0.98).setStrokeStyle(2, 0xbcefff, 0.75);
    background.setInteractive();
    background.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
    });
    const titleText = this.add.text(-160, -104, title, {
      fontFamily: "Arial",
      fontSize: "17px",
      color: "#ffffff",
      fontStyle: "bold",
      fixedWidth: 320
    });
    const bodyText = this.add.text(-160, -72, lines.join("\n"), {
      fontFamily: "Arial",
      fontSize: "12px",
      color: "#eaf9ff",
      fixedWidth: 320,
      lineSpacing: 7,
      wordWrap: { width: 320 }
    });
    const children: Phaser.GameObjects.GameObject[] = [background, titleText, bodyText];

    actions.forEach((action, index) => {
      const twoColumn = actions.length > 1;
      const width = twoColumn ? 142 : 300;
      const column = twoColumn ? index % 2 : 0;
      const row = twoColumn ? Math.floor(index / 2) : 0;
      const x = twoColumn ? -150 + column * 158 : -150;
      const y = 58 + row * 38;
      children.push(this.createModalButton(x, y, width, action.label, action.fill, action.action));
    });

    this.modal = this.add.container(gameWidth / 2, gameHeight / 2 - 10, children).setDepth(80);
  }

  private createModalButton(
    x: number,
    y: number,
    width: number,
    label: string,
    fill: number,
    action: () => void
  ): Phaser.GameObjects.Container {
    const background = this.add.rectangle(0, 0, width, 36, fill, 1).setStrokeStyle(1, 0xbcefff, 0.55);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Arial",
        fontSize: "13px",
        color: "#ffffff",
        fixedWidth: width - 8,
        align: "center"
      })
      .setOrigin(0.5);
    const button = this.add.container(x + width / 2, y, [background, text]);
    button.setSize(width, 36);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      action();
    });
    return button;
  }

  private closeModal(): void {
    this.modal?.destroy(true);
    this.modal = undefined;
    this.modalTitle = undefined;
  }

  private floatText(message: string, x: number, y: number, color: string): void {
    const text = this.add
      .text(x, y, message, {
        fontFamily: "Arial",
        fontSize: "16px",
        color,
        stroke: "#062033",
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.tweens.add({
      targets: text,
      y: y - 28,
      alpha: 0,
      duration: 950,
      ease: "Sine.out",
      onComplete: () => text.destroy()
    });
  }

  private floatTankText(message: string, x: number, y: number, color: string): void {
    return;
    const position = this.tankToScreenPoint(x, y);
    this.floatText(message, position.x, position.y, color);
  }

  private installTestHooks(): void {
    if (!import.meta.env.DEV) {
      return;
    }

    window.__aquariumTest = {
      getSnapshot: () => ({
        coins: this.wallet.common,
        wallet: { ...this.wallet },
        foodInventory: this.getTotalFoodInventory(),
        foodInventoryByType: this.foodInventoryRecord(),
        foodBuyQuantities: this.foodBuyQuantityRecord(),
        activeScreen: this.activeScreen,
        activeTab: this.activeTab,
        storeCoinFilter: this.storeCoinFilter,
        fishCatalogLevel: this.fishCatalogLevel,
        placementMode: this.placementMode.kind,
        fishCount: this.fish.length,
        activeFishCount: this.activeFish().length,
        maxFishCapacity: this.maxFishCapacityForLevel(),
        helperCreatureCount: this.helperCreatures.length,
        activeHelperCreatureCount: this.activeHelperCreatures().length,
        maxHelperCreatures,
        tankLevel: this.tankLevel,
        activeTankSlot: this.tankLevel,
        ownedTankLevels: this.sortedOwnedTankLevels(),
        ownedTankCount: this.ownedTankLevels.size,
        maxOwnedTanks,
        tankDisplayLevel: this.tankDisplayLevel(),
        maxTankLevel: maxOwnedTanks,
        renderScale: this.currentRenderScale(),
        tankCanUpgradeIndefinitely: false,
        tankSlotsAreIsolated: true,
        fishCatalogMaxLevel: maxFishCatalogLevel,
        tankViewScale: this.tankViewScaleForLevel(),
        tankWorldBounds: {
          left: tankBounds.left,
          top: tankBounds.top,
          right: tankBounds.right,
          bottom: tankBounds.bottom,
          width: tankBounds.width,
          height: tankBounds.height
        },
        tankScreenEdges: {
          left: this.tankToScreenPoint(tankBounds.left, tankBounds.top).x,
          top: this.tankToScreenPoint(tankBounds.left, tankBounds.top).y,
          right: this.tankToScreenPoint(tankBounds.right, tankBounds.bottom).x,
          bottom: this.tankToScreenPoint(tankBounds.right, tankBounds.bottom).y
        },
        totalWealth: this.calculateTotalWealth(),
        tankWorth: this.calculateTankNetWorth(),
        tankNeedIndicator: this.getTankNeedIndicator(),
        tankHudText: this.hudText.text,
        tankStatusText: this.statusText.text,
        tankCareText: `${this.modeText.text} | ${this.hudNeedText.text}`,
        fishTypeCount: fishTypes.length,
        helperCreatureTypeCount: helperCreatureTypes.length,
        visibleFishCatalogCount: this.visibleFishCatalog().length,
        visibleFishCatalogPreviewTextures: this.visibleFishCatalog().map((fishType) => this.fishCatalogPreviewTextureKey(fishType)),
        visibleStoreCatalogCount: this.visibleStoreCatalogCount(),
        assetCoverage: this.assetCoverageSnapshot(),
        dirtyTankOverlay: {
          visible: this.dirtyTankOverlay?.visible ?? false,
          alpha: this.dirtyTankOverlay?.alpha ?? 0,
          textureKey: this.dirtyTankOverlay?.texture.key,
          displayWidth: this.dirtyTankOverlay?.displayWidth ?? 0,
          displayHeight: this.dirtyTankOverlay?.displayHeight ?? 0
        },
        nextTankUpgradePrice: this.getNextTankUpgradePrice(),
        numberFormatSamples: {
          small: formatNumber(999),
          thousand: formatNumber(24_700),
          million: formatNumber(67_800_000),
          billion: formatNumber(1_234_000_000)
        },
        foodCount: this.foods.length,
        coinDropCount: this.coinDrops.length,
        maxCoinDrops,
        decorationCount: this.placedDecorations.length,
        decorations: this.placedDecorations.map((decoration) => ({
          typeId: decoration.typeId,
          size: decoration.size,
          x: this.tankToScreenPoint(decoration.image.x, decoration.image.y).x,
          y: this.tankToScreenPoint(decoration.image.x, decoration.image.y).y,
          depth: decoration.image.depth
        })),
        decorationTrashTarget: {
          visible: this.decorationTrashTarget?.visible ?? false,
          x: decorationTrashZone.centerX,
          y: decorationTrashZone.centerY
        },
        cleanliness: this.cleanliness,
        happiness: this.calculateTankHappiness(),
        compatibilityScore: this.calculateCurrentCompatibility().score,
        modalTitle: this.modalTitle,
        saved: Boolean(loadGame()),
        offlineProgress: {
          elapsedSeconds: this.offlineProgress.elapsedSeconds,
          earned: { ...this.offlineProgress.earned }
        },
        rentals: {
          autoFeederRemainingMs: Math.max(0, this.autoFeederEndsAt - Date.now()),
          autoCollectorRemainingMs: Math.max(0, this.autoCollectorEndsAt - Date.now()),
          autoFeederActive: this.isAutoFeederActive(),
          autoCollectorActive: this.isAutoCollectorActive(),
          autoFeederMinutes: this.autoFeederMinutes,
          autoCollectorMinutes: this.autoCollectorMinutes,
          autoFeederPrice: this.rentalPrice(autoFeederPrice, this.autoFeederMinutes).amount,
          autoCollectorPrice: this.rentalPrice(autoCollectorPrice, this.autoCollectorMinutes).amount
        },
        fish: this.fish.map((currentFish) => {
          const fishPosition = this.tankToScreenPoint(currentFish.sprite.x, currentFish.sprite.y);
          const statusBars = currentFish.getStatusBarsSnapshot();
          const tailAnimation = currentFish.getTailAnimationSnapshot();
          const statusPosition = this.tankToScreenPoint(statusBars.x, statusBars.y);
          const emojiPosition = this.tankToScreenPoint(statusBars.emojiX, statusBars.emojiY);
          return {
            typeId: currentFish.type.id,
            typeName: currentFish.type.name,
            textureKey: currentFish.textureKey(),
            state: currentFish.state,
            ageLabel: currentFish.ageLabel(),
            ageSeconds: currentFish.ageSeconds,
            ageMonths: currentFish.ageMonths(),
            ageYears: currentFish.ageYears(),
            ageRequiredTankLevel: currentFish.ageRequiredTankLevel(),
            tankLevel: currentFish.tankLevel,
            growthCapAgeYears: currentFish.growthCapAgeYears(),
            lengthCm: currentFish.lengthCm(),
            weightGrams: currentFish.weightGrams(),
            lengthLabel: currentFish.lengthLabel(),
            weightLabel: currentFish.weightLabel(),
            naturalAgeScale: currentFish.naturalAgeScale() * this.tankViewScaleForLevel(),
            tankGrowthScaleCap: currentFish.tankGrowthScaleCap() * this.tankViewScaleForLevel(),
            growthBlockedByTank: currentFish.isGrowthLimitedByTank(),
            gender: currentFish.gender,
            evolutionStage: currentFish.evolutionStage,
            fatalCareSeconds: currentFish.fatalCareSeconds,
            fatalCareRemainingSeconds: currentFish.fatalCareRemainingSeconds(),
            evolutionFee: this.evolutionFee(currentFish),
            hunger: currentFish.hunger,
            health: currentFish.health,
            x: fishPosition.x,
            y: fishPosition.y,
            scale: currentFish.visualScale() * this.tankViewScaleForLevel(),
            rotation: currentFish.sprite.rotation,
            displayWidth: currentFish.sprite.displayWidth * this.tankViewScaleForLevel(),
            displayHeight: currentFish.sprite.displayHeight * this.tankViewScaleForLevel(),
            veryBigScaleCap: currentFish.veryBigScaleCap() * this.tankViewScaleForLevel(),
            movementSizeMultiplier: currentFish.movementSizeMultiplier(),
            calorieNeedMultiplier: currentFish.calorieNeedMultiplier(),
            hungerPerSecond: currentFish.hungerPerSecond(),
            mealCaloriesNeeded: currentFish.mealCaloriesNeeded(),
            productionSummary: currentFish.productionSummary(),
            productionOptions: currentFish.productionOptions(),
            bodyTint: currentFish.sprite.tintTopLeft,
            sellValue: currentFish.getSellValue(),
            nextCoinDropInMs: Math.max(0, currentFish.nextCoinDropAt - this.time.now),
            statusBars: {
              ...statusBars,
              x: statusPosition.x,
              y: statusPosition.y,
              emojiX: emojiPosition.x,
              emojiY: emojiPosition.y
            },
            tailAnimation
          };
        }),
        foods: this.foods.map((food) => ({
          x: this.tankToScreenPoint(food.sprite.x, food.sprite.y).x,
          y: this.tankToScreenPoint(food.sprite.x, food.sprite.y).y,
          displayWidth: food.sprite.displayWidth * this.tankViewScaleForLevel(),
          foodType: food.foodType.id,
          textureKey: food.sprite.texture.key,
          visualTint: food.visualTint,
          sinkSpeed: food.sinkSpeed * this.tankViewScaleForLevel(),
          calories: food.foodType.calories,
          densityLevel: food.foodType.densityLevel
        })),
        helperCreatures: this.helperCreatures.map((helper) => ({
          typeId: helper.type.id,
          typeName: helper.type.name,
          tankLevel: helper.tankLevel,
          visible: helper.sprite.visible,
          x: this.tankToScreenPoint(helper.sprite.x, helper.sprite.y).x,
          y: this.tankToScreenPoint(helper.sprite.x, helper.sprite.y).y,
          speed: helper.type.speed * this.tankViewScaleForLevel(),
          sellPrice: this.helperSellPrice(helper.type),
          feedSeconds: helper.type.feedSeconds
        })),
        coinsWaiting: this.coinDrops.map((coin) => ({
          x: this.tankToScreenPoint(coin.sprite.x, coin.sprite.y).x,
          y: this.tankToScreenPoint(coin.sprite.x, coin.sprite.y).y,
          value: coin.value,
          coinType: coin.coinType,
          textureKey: coin.sprite.texture.key,
          tint: coin.visual.tint,
          textColor: coin.visual.textColor,
          sinkSpeed: coin.sinkSpeed * this.tankViewScaleForLevel(),
          displayWidth: coin.sprite.displayWidth * this.tankViewScaleForLevel(),
          labelFontSize: Number.parseFloat(`${coin.valueText.style.fontSize}`) * this.tankViewScaleForLevel(),
          bottomY: this.tankToScreenPoint(coin.sprite.x, coin.bottomY).y,
          atBottom: coin.atBottom
        }))
      }),
      setFishVitals: (index: number, hunger: number, health: number) => {
        const targetFish = this.fish[index];
        if (!targetFish) {
          return;
        }

        targetFish.hunger = Phaser.Math.Clamp(hunger, overfullHungerFloor, 100);
        targetFish.health = Phaser.Math.Clamp(health, 0, 100);
        targetFish.state = targetFish.health < 35 ? "ill" : targetFish.hunger > 68 ? "hungry" : "happy";
        if (!targetFish.isInFatalCareState()) {
          targetFish.fatalCareSeconds = 0;
        }
        targetFish.refreshStatusBars();
      },
      setFishFatalCareSeconds: (index: number, seconds: number) => {
        const targetFish = this.fish[index];
        if (!targetFish) {
          return;
        }

        targetFish.fatalCareSeconds = targetFish.isInFatalCareState() ? Phaser.Math.Clamp(seconds, 0, 3600) : 0;
      },
      setFishPosition: (index: number, x: number, y: number) => {
        const targetFish = this.fish[index];
        if (!targetFish) {
          return;
        }

        targetFish.sprite.setPosition(
          Phaser.Math.Clamp(x, tankBounds.left + 28, tankBounds.right - 28),
          Phaser.Math.Clamp(y, tankBounds.top + 26, tankBounds.bottom - 26)
        );
        targetFish.refreshStatusBars();
      },
      addFishForTest: (fishTypeId: string, x: number, y: number) => {
        const fishType = fishTypes.find((item) => item.id === fishTypeId);
        if (!fishType) {
          return;
        }

        this.addFishToTank(
          fishType,
          Phaser.Math.Clamp(x, tankBounds.left + 28, tankBounds.right - 28),
          Phaser.Math.Clamp(y, tankBounds.top + 26, tankBounds.bottom - 26)
        );
        this.refreshUi();
      },
      setFishGender: (index: number, gender: FishGender) => {
        const targetFish = this.fish[index];
        if (!targetFish) {
          return;
        }

        targetFish.gender = gender === "F" ? "F" : "M";
        this.renderTabControls();
        this.refreshUi();
      },
      removeFishAt: (index: number) => {
        const targetFish = this.fish[index];
        if (!targetFish) {
          return;
        }

        this.fish.splice(index, 1);
        targetFish.destroy();
        this.refreshUi();
      },
      forceCoinReady: (index: number) => {
        const targetFish = this.fish[index];
        if (!targetFish) {
          return;
        }

        targetFish.nextCoinDropAt = 0;
      },
      forceProductionDrop: (index: number) => {
        const targetFish = this.fish[index];
        if (!targetFish || this.coinDrops.length >= maxCoinDrops) {
          return;
        }

        const production = targetFish.rollActiveProduction();
        targetFish.markCoinDroppedForProduction(this.time.now, production);
        this.dropCoin(targetFish, production);
        this.refreshUi();
      },
      forceFishAge: (index: number, ageSeconds: number) => {
        const targetFish = this.fish[index];
        if (!targetFish) {
          return;
        }

        targetFish.setAgeSeconds(ageSeconds);
      },
      saveNow: () => {
        this.saveNow();
      },
      clearSave: () => {
        clearSave();
      },
      backdateSave: (seconds: number) => {
        this.saveNow(Date.now() - Math.max(0, seconds) * 1000);
      },
      closeModal: () => {
        this.closeModal();
      },
      setScreen: (screen: AppScreen) => {
        if (screen === "tank") {
          this.closePage();
        } else {
          this.openScreen(screen);
        }
      },
      setStoreTab: (tab: StoreTab) => {
        this.activeScreen = "store";
        this.activeTab = tab;
        this.createScreenNav();
        this.createFoodDock();
        this.createTabs();
        this.renderTabControls();
        this.refreshUi(false);
      },
      setStoreCoinFilter: (coinType: CoinType) => {
        if (coinType === "common" || coinType === "rare" || coinType === "superRare") {
          this.setStoreCoinFilter(coinType);
        }
      },
      setFishCatalogLevel: (level: number) => {
        this.fishCatalogLevel = Phaser.Math.Clamp(Math.floor(level), 1, maxFishCatalogLevel);
        this.renderTabControls();
        this.refreshUi(false);
      },
      upgradeTank: () => {
        this.upgradeTank();
      },
      switchTank: (level: number) => {
        this.switchTank(level);
      },
      buyTank: (level: number) => {
        this.buyTank(level);
      },
      buyFish: (fishTypeId: string) => {
        const fishType = fishTypes.find((item) => item.id === fishTypeId);
        if (fishType) {
          this.buyFish(fishType);
        }
      },
      buyFood: (foodTypeId?: FoodTypeId) => {
        const foodType = foodTypes.find((item) => item.id === foodTypeId) ?? this.getSelectedFoodType();
        this.buyFood(foodType);
      },
      setFoodBuyQuantity: (foodTypeId: FoodTypeId, quantity: number) => {
        if (foodTypes.some((item) => item.id === foodTypeId)) {
          this.setFoodBuyQuantity(foodTypeId, quantity);
        }
      },
      addFoodBuyQuantity: (foodTypeId: FoodTypeId, quantity: number) => {
        if (foodTypes.some((item) => item.id === foodTypeId)) {
          this.addFoodBuyQuantity(foodTypeId, quantity);
        }
      },
      resetFoodBuyQuantity: (foodTypeId: FoodTypeId) => {
        if (foodTypes.some((item) => item.id === foodTypeId)) {
          this.resetFoodBuyQuantity(foodTypeId);
        }
      },
      buyDecoration: (decorationTypeId: string) => {
        const decorationType = decorationTypes.find((item) => item.id === decorationTypeId);
        if (decorationType) {
          this.buyDecoration(decorationType);
        }
      },
      buyHelperCreature: (creatureTypeId: string) => {
        const creatureType = helperCreatureTypes.find((item) => item.id === creatureTypeId);
        if (creatureType) {
          this.buyHelperCreature(creatureType);
        }
      },
      addHelperCreatureForTest: (creatureTypeId: string, x: number) => {
        const creatureType = helperCreatureTypes.find((item) => item.id === creatureTypeId);
        if (!creatureType || this.helperCreatures.length >= maxHelperCreatures) {
          return;
        }
        this.addHelperCreatureToTank(creatureType, x);
        this.refreshUi();
      },
      setHelperCreaturePosition: (index: number, x: number) => {
        const helper = this.helperCreatures[index];
        if (!helper) {
          return;
        }
        helper.sprite.x = Phaser.Math.Clamp(x, tankBounds.left + 24, tankBounds.right - 24);
        helper.restoreProgress(helper.sprite.x);
      },
      clearHelperCreatures: () => {
        for (const helper of this.helperCreatures) {
          helper.destroy();
        }
        this.helperCreatures = [];
        this.refreshUi();
      },
      sellHelperCreatureAt: (index: number) => {
        this.sellHelperCreatureByIndex(index);
      },
      evolveFishAt: (index: number, force?: "success" | "death") => {
        this.tryEvolveFish(index, force);
      },
      breedFishAt: (index: number, force?: "same" | "rare") => {
        this.breedFish(index, force);
      },
      setFoodTool: (foodTypeId: FoodTypeId) => {
        this.selectFood(foodTypeId);
      },
      openSellOldest: () => {
        this.sellOldestFish();
      },
      sellFishAt: (index: number) => {
        this.sellFishByIndex(index);
      },
      addFood: (foodTypeId: FoodTypeId, count: number) => {
        this.foodInventory.set(foodTypeId, this.getFoodInventory(foodTypeId) + Math.max(0, Math.floor(count)));
        this.createFoodDock();
        this.refreshUi();
      },
      dropFoodForTest: (foodTypeId: FoodTypeId, x: number, y: number) => {
        const foodType = foodTypes.find((item) => item.id === foodTypeId);
        if (!foodType) {
          return;
        }

        const pellet = new FoodPellet(
          this,
          Phaser.Math.Clamp(x, tankBounds.left + 18, tankBounds.right - 18),
          Phaser.Math.Clamp(y, tankBounds.top + 18, tankBounds.bottom - 18),
          foodType
        );
        pellet.setWorldScaleCompensation(this.tankViewScaleForLevel());
        pellet.addToContainer(this.tankLayer);
        this.foods.push(pellet);
        this.refreshUi();
      },
      dropStockedFoodForTest: (foodTypeId: FoodTypeId, x: number, y: number) => {
        this.dropFoodAt(foodTypeId, x, y);
      },
      addWallet: (coinType: CoinType, amount: number) => {
        earn(this.wallet, coinType, Math.max(0, Math.floor(amount)));
        this.refreshUi();
      },
      addCoin: (coinType: CoinType, value: number, x: number, y: number) => {
        this.createCoinDrop(
          Phaser.Math.Clamp(x, tankBounds.left + 18, tankBounds.right - 18),
          Phaser.Math.Clamp(y, tankBounds.top + 18, tankBounds.bottom - 18),
          Math.max(1, Math.floor(value)),
          coinType
        );
        this.refreshUi();
      },
      clearCoins: () => {
        for (const coin of this.coinDrops) {
          coin.destroy();
        }
        this.coinDrops = [];
        this.refreshUi();
      },
      clearFoods: () => {
        for (const food of this.foods) {
          food.destroy();
        }
        this.foods = [];
        this.refreshUi();
      },
      rentAutoFeeder: () => {
        this.rentAutoFeeder();
      },
      rentAutoCollector: () => {
        this.rentAutoCollector();
      },
      setRentalMinutes: (rental: "feeder" | "collector", minutes: number) => {
        this.setRentalMinutes(rental, minutes);
      },
      setCleanliness: (cleanliness: number) => {
        this.cleanliness = Phaser.Math.Clamp(cleanliness, 0, 100);
        this.updateDirtyTankOverlay();
        this.refreshUi();
      },
      runAutoFeederNow: () => {
        this.nextAutoFeedAt = 0;
        this.updateAutoFeeder();
      },
      expireRentals: () => {
        this.autoFeederEndsAt = 0;
        this.autoCollectorEndsAt = 0;
        this.refreshUi();
        this.saveNow();
      }
    };
  }

  private createTextures(): void {
    this.createFishTexture();
    this.createFishAssetTextures();
    this.createFoodTexture();
    this.createMedicineTexture();
    this.createEvolvePillTexture();
    this.createCoinTexture();
    this.createDecorationTextures();
    this.createHelperCreatureTextures();
  }

  private createFishTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillTriangle(12, 24, 0, 10, 0, 38);
    graphics.fillEllipse(34, 24, 52, 30);
    graphics.fillStyle(0xfff1a8, 1);
    graphics.fillEllipse(43, 18, 12, 8);
    graphics.fillStyle(0x082033, 1);
    graphics.fillCircle(48, 17, 3);
    graphics.lineStyle(2, 0x082033, 0.24);
    graphics.beginPath();
    graphics.arc(26, 27, 10, 0.1, 1.3);
    graphics.strokePath();
    graphics.generateTexture("fish-base", 64, 48);
    graphics.destroy();
  }

  private createFishAssetTextures(): void {
    if (!this.textures.exists("fish-goldfish")) {
      this.createGoldfishTexture();
    }
    if (!this.textures.exists("fish-angelfish")) {
      this.createAngelfishTexture();
    }
    if (!this.textures.exists("fish-celestial-koi")) {
      this.createCelestialKoiTexture();
    }
  }

  private createGoldfishTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffb13b, 0.9);
    graphics.fillTriangle(12, 24, 1, 10, 1, 38);
    graphics.fillTriangle(16, 24, 5, 15, 5, 33);
    graphics.lineStyle(1, 0xffe0a0, 0.52);
    graphics.strokeTriangle(12, 24, 1, 10, 1, 38);
    graphics.fillStyle(0xffb23c, 1);
    graphics.fillEllipse(35, 24, 44, 27);
    graphics.fillStyle(0xffd06a, 1);
    graphics.fillEllipse(39, 19, 28, 13);
    graphics.fillStyle(0xfff0b8, 0.8);
    graphics.fillEllipse(43, 29, 20, 8);
    graphics.fillStyle(0xff8e2e, 0.72);
    graphics.fillEllipse(31, 12, 15, 8);
    graphics.fillEllipse(31, 36, 16, 8);
    graphics.lineStyle(2, 0xd86a20, 0.38);
    graphics.beginPath();
    graphics.arc(27, 27, 8, 0.15, 1.25);
    graphics.strokePath();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(49, 18, 4);
    graphics.fillStyle(0x082033, 1);
    graphics.fillCircle(50, 18, 2);
    graphics.fillStyle(0xffffff, 0.95);
    graphics.fillCircle(51, 17, 1);
    graphics.generateTexture("fish-goldfish", 64, 48);
    graphics.destroy();
  }

  private createAngelfishTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x56a8ff, 0.82);
    graphics.fillTriangle(14, 24, 1, 9, 3, 39);
    graphics.fillStyle(0xffb13b, 0.8);
    graphics.fillTriangle(8, 24, 1, 18, 1, 30);
    graphics.fillStyle(0xfff1c5, 0.42);
    graphics.fillTriangle(28, 24, 21, 1, 40, 19);
    graphics.fillTriangle(28, 24, 20, 47, 41, 30);
    graphics.fillStyle(0xdd9f68, 1);
    graphics.fillTriangle(18, 24, 40, 5, 52, 24);
    graphics.fillTriangle(18, 24, 40, 43, 52, 24);
    graphics.fillStyle(0xf7d7a2, 0.88);
    graphics.fillEllipse(40, 24, 29, 30);
    graphics.lineStyle(3, 0x754b31, 0.42);
    graphics.lineBetween(33, 10, 30, 38);
    graphics.lineBetween(43, 9, 39, 39);
    graphics.lineStyle(2, 0xfff3c4, 0.8);
    graphics.strokeTriangle(18, 24, 40, 5, 52, 24);
    graphics.strokeTriangle(18, 24, 40, 43, 52, 24);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(50, 20, 4);
    graphics.fillStyle(0x082033, 1);
    graphics.fillCircle(51, 20, 2);
    graphics.fillStyle(0xffffff, 0.95);
    graphics.fillCircle(52, 19, 1);
    graphics.generateTexture("fish-angelfish", 64, 48);
    graphics.destroy();
  }

  private createCelestialKoiTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x78d957, 0.86);
    graphics.fillTriangle(12, 24, 1, 7, 2, 41);
    graphics.fillStyle(0x35d6d0, 0.72);
    graphics.fillTriangle(8, 24, 1, 15, 1, 33);
    graphics.fillStyle(0xaee81f, 0.22);
    graphics.fillEllipse(34, 24, 60, 36);
    graphics.fillStyle(0xaae81f, 1);
    graphics.fillEllipse(34, 24, 48, 23);
    graphics.fillStyle(0xf6ffd5, 0.9);
    graphics.fillEllipse(43, 28, 25, 8);
    graphics.fillStyle(0x8dd9aa, 0.92);
    graphics.fillEllipse(26, 18, 12, 6);
    graphics.fillEllipse(36, 21, 10, 5);
    graphics.fillStyle(0xd7fcff, 0.6);
    graphics.fillEllipse(31, 11, 18, 7);
    graphics.fillEllipse(31, 37, 18, 7);
    graphics.lineStyle(1, 0xf7ffb3, 0.9);
    graphics.lineBetween(21, 22, 48, 17);
    graphics.lineBetween(22, 27, 47, 31);
    graphics.fillStyle(0xffffff, 0.95);
    graphics.fillCircle(25, 19, 1.4);
    graphics.fillCircle(33, 16, 1.2);
    graphics.fillCircle(43, 21, 1.2);
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(51, 19, 4);
    graphics.fillStyle(0x082033, 1);
    graphics.fillCircle(52, 19, 2);
    graphics.fillStyle(0xffffff, 0.95);
    graphics.fillCircle(53, 18, 1);
    graphics.generateTexture("fish-celestial-koi", 64, 48);
    graphics.destroy();
  }

  private createFoodTexture(): void {
    if (this.textures.exists("food")) {
      return;
    }
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffd15c, 1);
    graphics.fillCircle(8, 8, 7);
    graphics.fillStyle(0xfff0a0, 1);
    graphics.fillCircle(6, 6, 2);
    graphics.generateTexture("food", 16, 16);
    graphics.destroy();
  }

  private createMedicineTexture(): void {
    if (this.textures.exists("medicine-pill")) {
      return;
    }
    const graphics = this.add.graphics();
    graphics.fillStyle(0x43d66f, 1);
    graphics.fillRoundedRect(1, 3, 22, 12, 6);
    graphics.lineStyle(2, 0xd8ffe4, 0.9);
    graphics.strokeRoundedRect(1, 3, 22, 12, 6);
    graphics.lineStyle(2, 0x1c8f48, 0.75);
    graphics.lineBetween(12, 4, 12, 14);
    graphics.fillStyle(0xcaffd7, 0.9);
    graphics.fillCircle(7, 7, 2);
    graphics.generateTexture("medicine-pill", 24, 18);
    graphics.destroy();
  }

  private createEvolvePillTexture(): void {
    if (this.textures.exists("evolve-pill")) {
      return;
    }
    const graphics = this.add.graphics();
    graphics.fillStyle(0xb47cff, 1);
    graphics.fillRoundedRect(1, 3, 22, 12, 6);
    graphics.lineStyle(2, 0xf2dcff, 0.95);
    graphics.strokeRoundedRect(1, 3, 22, 12, 6);
    graphics.lineStyle(2, 0x6d3abf, 0.75);
    graphics.lineBetween(12, 4, 12, 14);
    graphics.fillStyle(0xffffff, 0.95);
    graphics.fillCircle(7, 7, 2);
    graphics.fillCircle(17, 11, 2);
    graphics.generateTexture("evolve-pill", 24, 18);
    graphics.destroy();
  }

  private createCoinTexture(): void {
    if (this.textures.exists("coin")) {
      return;
    }
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(14, 14, 13);
    graphics.lineStyle(3, 0xfff2a8, 1);
    graphics.strokeCircle(14, 14, 9);
    graphics.lineStyle(2, 0x9d6a00, 0.75);
    graphics.strokeCircle(14, 14, 13);
    graphics.generateTexture("coin", 28, 28);
    graphics.destroy();
  }

  private createDecorationTextures(): void {
    if (decorationTypes.every((decorationType) => this.textures.exists(decorationType.texture))) {
      return;
    }

    const plant = this.add.graphics();
    plant.fillStyle(0x216b3a, 1);
    plant.fillRect(27, 46, 10, 26);
    plant.fillStyle(0x3bb35f, 1);
    plant.fillEllipse(22, 44, 16, 42);
    plant.fillEllipse(40, 40, 16, 46);
    plant.fillEllipse(31, 28, 18, 50);
    plant.fillStyle(0x784d28, 1);
    plant.fillRect(18, 68, 28, 8);
    plant.generateTexture("decor-plant", 64, 80);
    plant.destroy();

    const rock = this.add.graphics();
    rock.fillStyle(0x69747c, 1);
    rock.fillEllipse(34, 42, 58, 36);
    rock.fillStyle(0x87929a, 1);
    rock.fillEllipse(23, 34, 22, 18);
    rock.fillEllipse(44, 33, 26, 22);
    rock.generateTexture("decor-rock", 72, 64);
    rock.destroy();

    const castle = this.add.graphics();
    castle.fillStyle(0x9a8eca, 1);
    castle.fillRect(18, 28, 54, 48);
    castle.fillRect(10, 18, 18, 58);
    castle.fillRect(62, 18, 18, 58);
    castle.fillStyle(0x5d5387, 1);
    castle.fillTriangle(10, 18, 19, 4, 28, 18);
    castle.fillTriangle(62, 18, 71, 4, 80, 18);
    castle.fillStyle(0x342d52, 1);
    castle.fillRoundedRect(38, 48, 14, 28, 7);
    castle.fillRect(29, 36, 9, 10);
    castle.fillRect(54, 36, 9, 10);
    castle.generateTexture("decor-castle", 92, 86);
    castle.destroy();

    const crystal = this.add.graphics();
    crystal.fillStyle(0x9ff8ff, 0.95);
    crystal.fillTriangle(46, 6, 18, 72, 74, 72);
    crystal.fillStyle(0xe0fbff, 0.9);
    crystal.fillTriangle(46, 6, 38, 72, 58, 72);
    crystal.fillStyle(0xb48cff, 0.95);
    crystal.fillTriangle(22, 28, 4, 78, 42, 78);
    crystal.fillStyle(0xff9bed, 0.9);
    crystal.fillTriangle(70, 28, 50, 78, 88, 78);
    crystal.lineStyle(2, 0xffffff, 0.7);
    crystal.lineBetween(46, 6, 46, 72);
    crystal.lineBetween(22, 28, 28, 78);
    crystal.lineBetween(70, 28, 64, 78);
    crystal.generateTexture("decor-crystal", 92, 86);
    crystal.destroy();
  }

  private createHelperCreatureTextures(): void {
    if (helperCreatureTypes.every((creatureType) => this.textures.exists(creatureType.texture))) {
      return;
    }

    if (!this.textures.exists("helper-shrimp")) {
      const shrimp = this.add.graphics();
      shrimp.fillStyle(0xff8f73, 1);
      shrimp.fillEllipse(24, 18, 34, 18);
      shrimp.fillTriangle(8, 18, 0, 10, 0, 26);
      shrimp.lineStyle(2, 0xffd0c4, 0.9);
      shrimp.lineBetween(30, 16, 44, 8);
      shrimp.lineBetween(30, 20, 44, 28);
      shrimp.lineStyle(2, 0x6b2735, 0.55);
      shrimp.lineBetween(12, 28, 12, 36);
      shrimp.lineBetween(24, 28, 24, 36);
      shrimp.generateTexture("helper-shrimp", 48, 40);
      shrimp.destroy();
    }

    const shell = this.add.graphics();
    shell.fillStyle(0xc7d3d9, 1);
    shell.fillEllipse(26, 22, 42, 26);
    shell.fillStyle(0x8fa0a8, 1);
    shell.fillEllipse(17, 18, 14, 10);
    shell.lineStyle(2, 0x5b6b73, 0.65);
    shell.lineBetween(26, 9, 26, 34);
    shell.lineBetween(15, 14, 36, 30);
    shell.lineBetween(36, 14, 15, 30);
    shell.fillStyle(0x31444d, 1);
    shell.fillCircle(40, 18, 2);
    shell.generateTexture("helper-shell", 52, 42);
    shell.destroy();

    const crab = this.add.graphics();
    crab.fillStyle(0xe2574c, 1);
    crab.fillEllipse(26, 22, 34, 24);
    crab.fillCircle(10, 14, 7);
    crab.fillCircle(42, 14, 7);
    crab.lineStyle(3, 0xffa08f, 0.9);
    crab.lineBetween(10, 31, 2, 38);
    crab.lineBetween(20, 34, 14, 42);
    crab.lineBetween(32, 34, 38, 42);
    crab.lineBetween(42, 31, 50, 38);
    crab.fillStyle(0x1d1f2a, 1);
    crab.fillCircle(21, 16, 2);
    crab.fillCircle(31, 16, 2);
    crab.generateTexture("helper-crab", 54, 46);
    crab.destroy();

    if (!this.textures.exists("helper-feeder-snail")) {
      const feederSnail = this.add.graphics();
      feederSnail.fillStyle(0x6fd39b, 1);
      feederSnail.fillEllipse(27, 24, 38, 24);
      feederSnail.fillStyle(0xf2c46d, 1);
      feederSnail.fillCircle(21, 20, 12);
      feederSnail.lineStyle(3, 0x9c6a2e, 0.65);
      feederSnail.beginPath();
      feederSnail.arc(21, 20, 8, 0.2, 5.7);
      feederSnail.strokePath();
      feederSnail.fillStyle(0xb6f7cf, 1);
      feederSnail.fillEllipse(42, 21, 18, 14);
      feederSnail.lineStyle(2, 0xd8ffe7, 0.9);
      feederSnail.lineBetween(45, 14, 51, 5);
      feederSnail.lineBetween(48, 15, 56, 8);
      feederSnail.fillStyle(0x1d1f2a, 1);
      feederSnail.fillCircle(52, 5, 2);
      feederSnail.fillCircle(57, 8, 2);
      feederSnail.fillStyle(0xffd15c, 1);
      feederSnail.fillCircle(40, 34, 4);
      feederSnail.generateTexture("helper-feeder-snail", 62, 46);
      feederSnail.destroy();
    }
  }
}
