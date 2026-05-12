import Phaser from "phaser";
import { basicFood, decorationTypes, fishTypes, foodAssetPath, foodTypes, helperCreatureTypes } from "../data/content";
import { gameHeight, gameWidth, maxRenderScale, setTankWorldScale, shouldUseLowPowerMode, tankBounds, tankViewportBounds, toastX, toastY } from "../game/constants";
import {
  foodDispenserAssetPath,
  foodDispenserInventoryKey,
  foodDispenserMinIntervalMs,
  foodDispenserOutletRatio,
  foodDispenserPelletScale,
  foodDispenserPositionStorageKey,
  foodDispenserPrice,
  legacyFoodDispenserPositionStorageKey
} from "../game/dispenser-system";
import { canAfford, createWallet, earn, formatNumber, formatPrice, formatPriceLong, formatWallet, priceComponents, spend } from "../game/economy";
import { gameFontFamily } from "../game/fonts";
import {
  bestCalorieFoodForTarget,
  cappedFoodCountLabel,
  addedFoodBuyQuantity as addedFoodBuyQuantityModel,
  describeFoodInventory as describeFoodInventoryModel,
  feedableFoodTypes,
  foodBuyQuantity as foodBuyQuantityModel,
  foodBuyQuantityRecord as foodBuyQuantityRecordModel,
  foodInventoryRecord as foodInventoryRecordModel,
  findFoodDispenserTarget as findFoodDispenserTargetModel,
  findMedicineDispenserTarget as findMedicineDispenserTargetModel,
  foodInventoryBadgeLabel as foodInventoryBadgeLabelModel,
  foodInventoryDisplayCount as foodInventoryDisplayCountModel,
  hasPendingDispenserFood as hasPendingDispenserFoodModel,
  hiddenFoodTypeIds,
  isCalorieTrackedFood as isCalorieTrackedFoodModel,
  isDroppableFood as isDroppableFoodModel,
  recommendedFoodName,
  setFoodBuyQuantityValue,
  supplyFoodTypeIds,
  totalFeedableFoodInventory as totalFeedableFoodInventoryModel
} from "../game/food-system";
import {
  calculateOfflineSeconds,
  clearSave,
  createEmptyWallet,
  loadGame,
  mapToRecord,
  SAVE_VERSION,
  saveGame,
  type OfflineProgress,
  type SavedCoinDrop,
  type SavedGame
} from "../game/save";
import {
  ensureTankState as ensureTankStateModel,
  tankNamesFromRecord as tankNamesFromRecordModel,
  tankNamesRecord as tankNamesRecordModel,
  tankStatesFromSave as tankStatesFromSaveModel,
  tankStatesRecord as tankStatesRecordModel,
  sortedTankLevels,
  type TankCosmeticCategory,
  type TankRuntimeState,
  type TankStateConfig
} from "../game/tank-state";
import {
  aquariumBackgroundAssetPath,
  aquariumBackgroundTextureKey,
  aquariumFloorAssetPath,
  aquariumFloorTextureKey,
  decorationSizeOrder,
  decorationSizes,
  decorationVariantPrice as tankCatalogDecorationVariantPrice,
  tankCosmeticImageUrl as tankCatalogCosmeticImageUrl,
  tankCosmetics as tankCatalogCosmetics,
  tankFloorTextureCropTopByKey,
  tankTextureAssetPathByKey,
  tankThemeTexturePairs,
  tankThumbnailBaseAssetPath,
  tankThumbnailBaseTextureKey,
  type DecorationSize,
  type TankCosmetic,
  type TankThemeTexturePair
} from "../game/tank-catalog";
import { createFallbackTextures } from "../game/texture-fallbacks";
import { foodCssFilterFor, rarityStarCount } from "../game/visuals";
import {
  buildDailyQuestItems,
  commonQuestReward as questCommonReward,
  dailyQuestActionCount as questActionCount,
  fishPurchaseWindowMs,
  growthTonicPurchaseWindowMs,
  isRewardedAdReady,
  normalizeDailyGoals as normalizeDailyGoalsModel,
  oldestRecentFishPurchase,
  oldestRecentGrowthTonicPurchase,
  rareQuestReward as questRareReward,
  recentFishPurchaseCount as questRecentFishPurchaseCount,
  recentGrowthTonicPurchaseCount as questRecentGrowthTonicPurchaseCount,
  recordDailyQuestAction as recordDailyQuestActionModel,
  recordFishPurchase as recordFishPurchaseModel,
  recordGrowthTonicPurchase as recordGrowthTonicPurchaseModel,
  rewardedAdCoinReward as questRewardedAdCoinReward,
  rewardedAdDurationMs,
  rewardedAdOptions as buildRewardedAdOptions,
  rewardedAdRemainingSeconds,
  superRareQuestReward as questSuperRareReward,
  todayFishPurchaseCount as questTodayFishPurchaseCount,
  visibleDailyQuestItems as visibleDailyQuestItemsModel,
  type DailyGoalsState,
  type DailyQuestItem,
  type RewardedAdKind,
  type RewardedAdOption,
  type RewardedAdState
} from "../game/quest-system";
import {
  beginPrizeMachineSession,
  createDefaultPrizeMachineState,
  normalizePrizeMachineState,
  prizeMachineBetAmounts,
  prizeMachineConfigForBet,
  recordPrizeMachineSpin,
  recordPrizeMachineWin,
  setPrizeMachineBet,
  type PrizeMachineBetAmount,
  type PrizeMachineConfig,
  type PrizeMachineState,
  type PrizeSpinPrize
} from "../game/prize-machine";
import {
  createPrizeMachineSpinner,
  playPrizeMachineSpin,
  prizeWheelIconAssetPaths,
  prizeWheelIconTextureKeys,
  type PrizeWheelSegment
} from "../game/prize-machine-wheel";
import { buildStoreOverlayState } from "../game/store-catalog";
import { CoinDrop, coinTextureKeyByType, coinVisualsByType } from "../objects/CoinDrop";
import { Fish } from "../objects/Fish";
import { FoodPellet } from "../objects/FoodPellet";
import { HelperCreature } from "../objects/HelperCreature";
import {
  capturePageScrollTop,
  createPageEmptyCard,
  createPageOverlayRoot,
  createPagePager,
  createPageShell,
  createPageTabRow,
  pageScreenMeta as buildPageScreenMeta,
  restorePageScrollTop,
  type PageButtonFactory,
  type PageOverlayScreen,
  type PageScreenMeta
} from "../ui/PageOverlay";
import { createFishAlbumRow } from "../ui/AlbumPage";
import { createQuestList } from "../ui/QuestPage";
import { createRewardedAdsPage } from "../ui/RewardedAdsPage";
import { createDeveloperSettingsCard, createSettingsMusicCard, createSettingsToggleCard } from "../ui/SettingsPage";
import { StoreOverlay, type StoreOverlayState } from "../ui/StoreOverlay";
import { createHtmlButton, htmlElement, htmlImage } from "../ui/dom";
import { createModalShell, createRewardedAdModalShell, type ModalAction } from "../ui/modal";
import type { CoinType, DecorationType, FishGender, FishState, FishType, FoodType, FoodTypeId, HelperCreatureType, Price, StoreTab, Wallet } from "../types/mechanics";

type AppScreen = "tank" | "store" | "album" | "tanks" | "goals" | "prize" | "makeup" | "settings";

type PreparedPrizeMachineReward =
  | { kind: "rare"; amount: number; segmentIndex: number }
  | { kind: "superRare"; amount: number; segmentIndex: number }
  | { kind: "rareFish"; fishType: FishType; segmentIndex: number }
  | { kind: "premiumCommon"; amount: number; segmentIndex: number }
  | { kind: "food"; foodType: FoodType; quantity: number; segmentIndex: number }
  | { kind: "common"; amount: number; segmentIndex: number };

type PrizeSegmentCandidate = {
  key: string;
  segment: PrizeWheelSegment;
  value: number;
};

type PlacementMode =
  | { kind: "none" }
  | { kind: "fish"; fishTypeId: string }
  | { kind: "food"; foodTypeId: FoodTypeId }
  | { kind: "decoration"; decorationTypeId: string; size: DecorationSize };

type TankMenuTab = "tanks" | "background" | "seabed" | "decor" | "utility";
type InventoryTab = "fish" | "food" | "decor" | "coins";
type MakeupDecorationDraft = {
  typeId: string;
  size: DecorationSize;
  x: number;
  y: number;
  depth: number;
  image: Phaser.GameObjects.Image;
};
type MakeupDraft = {
  backgroundIndex: number;
  seabedIndex: number;
  backgroundTintById: Map<string, number>;
  seabedTintById: Map<string, number>;
  selectedDecorationTypeIndex: number;
  selectedSize: DecorationSize;
  selectedDecorationIndex?: number;
  decorations: MakeupDecorationDraft[];
};
type InventoryDockItem =
  | { kind: "food"; id: FoodTypeId; label: string; count: number; badgeLabel?: string; icon: string }
  | { kind: "fish"; id: string; label: string; count: number; icon: string }
  | { kind: "decoration"; id: string; size: DecorationSize; label: string; count: number; icon: string }
  | { kind: "helper"; id: string; label: string; count: number; icon: string }
  | { kind: "utility"; id: string; label: string; count: number; icon: string };

type PlacedDecoration = {
  typeId: string;
  size: DecorationSize;
  image: Phaser.GameObjects.Image;
  tankLevel: number;
  bubbleCooldown?: number;
};

type PendingHelperCreatureDrop = {
  type: HelperCreatureType;
  sprite: Phaser.GameObjects.Image;
  tankLevel: number;
  targetX: number;
};

type CompatibilitySummary = {
  score: number;
  level: "good";
  warnings: string[];
  incompatibleNames: string[];
};

type AdjustableSound = Phaser.Sound.BaseSound & {
  setVolume: (value: number) => unknown;
};

const maxCoinDrops = 25;
const maxFoodDrops = 5;
const coinCollectSoundKey = "sfx-coin-collect";
const coinCollectSoundPath = "/assets/audio/sfx/coin-pick.ogg";
const fishEatSoundKey = "sfx-fish-eat";
const fishEatSoundPath = "/assets/audio/sfx/fish-eat.ogg";
const fishHungrySoundKey = "sfx-fish-hungry";
const fishHungrySoundPath = "/assets/audio/sfx/fish-hungry.ogg";
const prizeHighlightSoundKey = "sfx-prize-highlight";
const prizeHighlightSoundPath = "/assets/audio/sfx/prize-highlight.ogg";
const prizeRewardSoundKey = "sfx-prize-reward";
const prizeRewardSoundPath = "/assets/audio/sfx/prize-reward.ogg";
const backgroundMusicKey = "music-underwater-ambient";
const backgroundMusicPath = "/assets/audio/bgm/underwater.mp3";
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
const decorationTrashZone = new Phaser.Geom.Rectangle(gameWidth / 2 - 48, gameHeight - 88, 96, 60);
const maxFoodBuyQuantity = 99_999;
const inventoryDockPageSize = 8;
const overfullHungerFloor = -10000;
const tankCleaningRatePerSecond = 50;
const maxTankDirtPerSecond = 28 / (60 * 60);
const baseTankDirtPerSecond = maxTankDirtPerSecond * 0.22;
const fishTankDirtPerSecond = maxTankDirtPerSecond * 0.075;
const looseFoodTankDirtPerSecond = maxTankDirtPerSecond * 0.11;
const automatedCoinCollectFeeRate = 0;
const coinComboWindowMs = 900;
const coinComboRewardPercentPerCount = 1;
const coinComboRewardTextDurationMs = 3000;
const hudStatusSyncIntervalSeconds = 0.25;
const helperCreatureDropSpeed = 142;
const helperCreatureSeabedY = tankBounds.bottom - 36;
const tankCosmeticBlueTintColor = 0x0b4f8f;
const helperCreatureDropDisplayWidths: Record<string, number> = {
  "helper-shrimp": 60,
  "helper-shell": 52,
  "helper-crab": 54,
  "helper-feeder-snail": 62,
  "helper-auto-cleaner": 56
};
const maxPurchasableTankLevel = 4;
const storeTankNames: Record<number, string> = {
  1: "Normal Tank",
  2: "Fish Bowl",
  3: "Normal Tank",
  4: "Fish Bowl",
  5: "Royal Tank"
};
const storeTankStarterWallets: Record<number, Wallet> = {
  1: createWallet(120, 0, 0),
  2: createWallet(180, 0, 0),
  3: createWallet(320, 16, 0),
  4: createWallet(520, 30, 6),
  5: createWallet(680, 14, 2)
};
const tankUpgradePrices: Record<number, FishType["price"]> = {
  2: { coinType: "common", amount: 1200 },
  3: { coinType: "common", amount: 5200 },
  4: { coinType: "common", amount: 22000, rareAmount: 4 },
  5: { coinType: "common", amount: 140000, superRareAmount: 2 }
};
const tankFallbackBaseColor = 0x0b7097;
const coinMagnetInventoryKey = "utility:coin-magnet";
const coinMagnetPrice: Price = { coinType: "common", amount: 720 };
const coinMagnetIconPath = "/assets/ui/coin-magnet.png";
const coinMagnetCollectRadius = 170;
const coinMagnetDurationMs = 15 * 60 * 1000;
const coinMagnetAttractDurationMs = 100;
const coinWealthValue: Record<CoinType, number> = {
  common: 1,
  rare: 1000,
  superRare: 10000
};
const inventorySellRate = 0.7;
const coinAssetPathByType: Record<CoinType, string> = {
  common: "/assets/ui/icon-common-coin.png",
  rare: "/assets/ui/icon-rare-coin.png",
  superRare: "/assets/ui/icon-super-rare-coin.png"
};
const menuIconAssetPathByKey: Record<string, string> = {
  "ui-shop": "/assets/ui/shop.png",
  "ui-game": "/assets/ui/menu/menu_game_shell.png",
  "ui-book": "/assets/ui/menu/menu_inventory_book.png",
  "ui-tanks": "/assets/ui/menu/menu_tanks_aquarium.png",
  "ui-goals": "/assets/ui/menu/menu_quest_trophy.png",
  "ui-settings": "/assets/ui/menu/menu_settings_gear.png"
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
const coinGlowTextureKey = "coin-glow";
const coinGlowAssetPath = "/assets/ui/coin-glow.png";
const hudTopAssetPathByKey: Record<string, string> = {
  "ui-hud-level-medallion": "/assets/ui/hud-level-medallion.png",
  "ui-hud-main-long-frame": "/assets/ui/hud-main-long-frame.png"
};
const dirtyTankOverlayThreshold = 72;
const algaeParticleThreshold = 50;
const dirtyTankOverlayMaxAlpha = 0.38;
const dirtyTankTintColor = 0x4f8f44;
const cleanBubbleTintColor = 0xd7f4ff;
const algaeParticleTintColor = 0x174f22;
const tankMenuVersion = "right-dock-up-v1";

type AquariumTestSnapshot = {
  coins: number;
  wallet: Wallet;
  foodInventory: number;
  foodInventoryByType: Record<string, number>;
  foodBuyQuantities: Record<string, number>;
  creatureInventoryByType: Record<string, number>;
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
    fatalCareSeconds: number;
    fatalCareRemainingSeconds: number;
    continuousHungrySeconds: number;
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
  helperCreatures: Array<{ typeId: string; typeName: string; x: number; y: number; speed: number; sellPrice: FishType["price"] }>;
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
      setFishContinuousHungerSeconds: (index: number, seconds: number) => void;
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
      placeFishFromInventory: (fishTypeId: string, x: number, y: number) => void;
      buyFood: (foodTypeId?: FoodTypeId) => void;
      setFoodBuyQuantity: (foodTypeId: FoodTypeId, quantity: number) => void;
      addFoodBuyQuantity: (foodTypeId: FoodTypeId, quantity: number) => void;
      resetFoodBuyQuantity: (foodTypeId: FoodTypeId) => void;
      buyDecoration: (decorationTypeId: string) => void;
      addFoodDispenserForTest: () => void;
      removeFoodDispenserForTest: () => void;
      buyHelperCreature: (creatureTypeId: string) => void;
      addHelperCreatureForTest: (creatureTypeId: string, x: number) => void;
      setHelperCreaturePosition: (index: number, x: number) => void;
      clearHelperCreatures: () => void;
      sellHelperCreatureAt: (index: number) => void;
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
      setCleanliness: (cleanliness: number) => void;
    };
  }
}

export class AquariumScene extends Phaser.Scene {
  private readonly prizeMachineRuntimeSessionId = Date.now();
  private wallet = createWallet(120, 0, 0);
  private foodInventory = new Map<FoodTypeId, number>([[basicFood.id, basicFood.calories * 3]]);
  private foodBuyQuantities = new Map<FoodTypeId, number>();
  private fishInventory = new Map<string, number>();
  private decorationInventory = new Map<string, number>();
  private creatureInventory = new Map<string, number>();
  private fish: Fish[] = [];
  private foods: FoodPellet[] = [];
  private coinDrops: CoinDrop[] = [];
  private airStoneBubblePool: Phaser.GameObjects.Arc[] = [];
  private activeAirStoneBubbles = new Set<Phaser.GameObjects.Arc>();
  private helperCreatures: HelperCreature[] = [];
  private pendingHelperCreatureDrops: PendingHelperCreatureDrop[] = [];
  private placementMode: PlacementMode = { kind: "none" };
  private activeScreen: AppScreen = "tank";
  private activeTab: StoreTab = "fish";
  private storeCoinFilter: CoinType = "common";
  private selectedFoodTypeId: FoodTypeId = basicFood.id;
  private inventoryDockPage = 0;
  private recentInventoryDockItemKey?: string;
  private placedDecorations: PlacedDecoration[] = [];
  private offlineProgress: OfflineProgress = { elapsedSeconds: 0, earned: createEmptyWallet() };
  private autosaveElapsed = 0;
  private hudStatusSyncElapsed = 0;
  private storeRefreshElapsed = 0;
  private storeCooldownStateKey = "";
  private cleanliness = 100;
  private cleanedAt = Date.now();
  private cleaningTank = false;
  private settings = { sound: true, music: true, musicVolume: 16, reducedMotion: false, notifications: false };
  private developerGodMode = false;
  private dailyGoals: DailyGoalsState = { date: this.localDateKey(), claimed: [] };
  private tankLevel = 1;
  private ownedTankLevels = new Set<number>([1]);
  private tankNames = new Map<number, string>([[1, "Home Reef"]]);
  private tankStates = new Map<number, TankRuntimeState>();
  private tankMenuTab: TankMenuTab = "tanks";
  private tankMenuPage = 1;
  private inventoryTab: InventoryTab = "fish";
  private fishCatalogLevel = 1;
  private selectedFishIndex?: number;
  private tankLayer!: Phaser.GameObjects.Container;
  private tankBackground!: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private tankBackgroundBlueTintOverlay?: Phaser.GameObjects.Rectangle;
  private tankSand?: Phaser.GameObjects.Image;
  private dirtyTankOverlay?: Phaser.GameObjects.Rectangle;
  private decorationTrashTarget!: Phaser.GameObjects.Container;
  private decorationTrashBackground!: Phaser.GameObjects.Rectangle;
  private decorationTrashText!: Phaser.GameObjects.Text;
  private draggedDecoration?: PlacedDecoration;
  private screenButtons: Phaser.GameObjects.Container[] = [];
  private foodButtons: Phaser.GameObjects.Container[] = [];
  private foodDragGhosts = new Set<Phaser.GameObjects.Image>();
  private ambientWaterParticles: Phaser.GameObjects.Arc[] = [];
  private ambientWaterParticlesAlgaeMode?: boolean;
  private gameHudOverlay?: HTMLDivElement;
  private gameHudLevelText?: HTMLSpanElement;
  private gameHudCommonText?: HTMLSpanElement;
  private gameHudRareText?: HTMLSpanElement;
  private gameHudSuperRareText?: HTMLSpanElement;
  private gameHudWealthText?: HTMLSpanElement;
  private gameHudCleanText?: HTMLSpanElement;
  private gameHudHappyText?: HTMLSpanElement;
  private foodDispenserText?: HTMLSpanElement;
  private foodDispenserElement?: HTMLDivElement;
  private foodDispenserY = tankBounds.bottom - 74;
  private nextFoodDispenseAt = 0;
  private htmlFoodDock?: HTMLDivElement;
  private htmlFoodDragGhost?: HTMLDivElement;
  private htmlFoodDragCleanup?: () => void;
  private htmlDockDragging = false;
  private magnetCollectingCoins = new Set<CoinDrop>();
  private coinMagnetWasActive = false;
  private coinMagnetDisplayedMinutes = 0;
  private gameHudLevelBadge?: HTMLDivElement;
  private tankMenuOverlay?: HTMLDivElement;
  private tankMenuCollapsed = false;
  private htmlPageOverlay?: HTMLDivElement;
  private htmlPageOverlayScrollTop = 0;
  private htmlPageOverlayRenderKey = "";
  private storeOverlay?: StoreOverlay;
  private modal?: HTMLDivElement;
  private modalTitle?: string;
  private makeupOverlay?: HTMLDivElement;
  private makeupDraft?: MakeupDraft;
  private makeupDraggedDecoration?: MakeupDecorationDraft;
  private draggedFish?: Fish;
  private nativeCanvasInputCleanup?: () => void;
  private nativeDraggedFish?: Fish;
  private nativeDraggedDecoration?: PlacedDecoration;
  private phaserDraggedDecoration?: PlacedDecoration;
  private pendingTextureLoads = new Set<string>();
  private pendingFishTextureLoads = new Set<string>();
  private fishTextureLoadCallbacks = new Map<string, Set<() => void>>();
  private coinComboCount = 0;
  private coinComboCollectedValue = 0;
  private coinComboTimer?: Phaser.Time.TimerEvent;
  private coinComboLastPosition = new Phaser.Math.Vector2(toastX, toastY);
  private coinComboOverlay?: HTMLDivElement;
  private backgroundMusic?: Phaser.Sound.BaseSound;
  private rewardedAd?: RewardedAdState;
  private rewardedAdRefreshTimer?: Phaser.Time.TimerEvent;
  private rewardedAdCountdownText?: HTMLSpanElement;
  private rewardedAdModalButton?: HTMLButtonElement;
  private prizeMachine: PrizeMachineState = createDefaultPrizeMachineState();
  private prizeSpinContainer?: Phaser.GameObjects.Container;
  private prizeSpinInProgress = false;
  private prizeRareFish = this.nextPrizeRareFish();

  public constructor() {
    super("AquariumScene");
  }

  public preload(): void {
    foodTypes.forEach((foodType) => {
      this.load.image(this.foodTextureKey(foodType.id), foodAssetPath(foodType.id));
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
    this.load.audio(coinCollectSoundKey, coinCollectSoundPath);
    this.load.audio(fishEatSoundKey, fishEatSoundPath);
    this.load.audio(fishHungrySoundKey, fishHungrySoundPath);
    this.load.audio(prizeHighlightSoundKey, prizeHighlightSoundPath);
    this.load.audio(prizeRewardSoundKey, prizeRewardSoundPath);
    this.load.audio(backgroundMusicKey, backgroundMusicPath);
    Object.entries(menuIconAssetPathByKey).forEach(([textureKey, assetPath]) => {
      this.load.image(textureKey, assetPath);
    });
    Object.entries(hudIconAssetPathByKey).forEach(([textureKey, assetPath]) => {
      this.load.image(textureKey, assetPath);
    });
    this.load.image(aquariumFloorTextureKey, aquariumFloorAssetPath);
    this.load.image(aquariumBackgroundTextureKey, aquariumBackgroundAssetPath);
    this.load.image(tankThumbnailBaseTextureKey, tankThumbnailBaseAssetPath);
    this.load.image(coinGlowTextureKey, coinGlowAssetPath);
    Object.entries(hudTopAssetPathByKey).forEach(([textureKey, assetPath]) => {
      this.load.image(textureKey, assetPath);
    });
    Object.entries(prizeWheelIconTextureKeys).forEach(([iconName, textureKey]) => {
      this.load.image(textureKey, prizeWheelIconAssetPaths[iconName as keyof typeof prizeWheelIconAssetPaths]);
    });
  }

  public create(): void {
    this.configureCameraForHighDpi();
    createFallbackTextures(this, decorationTypes, helperCreatureTypes);
    this.createFishAnimations();
    this.loadFoodDispenserY();
    this.createWorld();
    this.createUi();
    this.restoreSavedGame();
    this.syncBackgroundMusic();
    this.updateDirtyTankOverlay();
    this.installTestHooks();
    this.refreshUi();

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.handleTankPointer(pointer);
    });
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.updatePhaserDecorationDrag(pointer));
    this.input.on("pointerup", (pointer: Phaser.Input.Pointer) => this.endPhaserDecorationDrag(pointer));
    this.input.on("pointerupoutside", (pointer: Phaser.Input.Pointer) => this.endPhaserDecorationDrag(pointer));
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.updateMakeupDecorationDrag(pointer));
    this.input.on("pointerup", () => this.endMakeupDecorationDrag());
    this.input.on("pointerupoutside", () => this.endMakeupDecorationDrag());
    this.installNativeCanvasInputFallback();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroyHtmlGameInterface());

    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("openStore")) {
      this.time.delayedCall(100, () => this.openScreen("store"));
    }
  }

  private createFishAnimations(): void {
    fishTypes.forEach((fishType) => {
      this.createFishAnimation(fishType);
    });
  }

  private createFishAnimation(fishType: FishType): void {
    const textureKey = `fish-${fishType.id}-swim`;
    const animationKey = `${textureKey}-idle`;
    if (!this.textures.exists(textureKey) || this.anims.exists(animationKey)) {
      return;
    }

    this.anims.create({
      key: animationKey,
      frames: this.anims.generateFrameNumbers(textureKey, { start: 0, end: 11 }),
      frameRate: 10,
      repeat: -1
    });
  }

  public update(_time: number, delta: number): void {
    const deltaSeconds = delta / 1000;
    const now = this.time.now;
    this.updateStoreOverlayTimer(deltaSeconds);
    this.updateTimedUtilities();

    this.foods.forEach((food) => food.update(deltaSeconds));
    this.removeExpiredFood();
    this.coinDrops.forEach((coin) => coin.update(deltaSeconds));
    const tankFish = this.activeFish();
    const activeDecorations = this.activeDecorations();
    const activeHelpers = this.activeHelperCreatures();
    this.updateAirStoneBubbles(deltaSeconds, activeDecorations);
    this.updateFoodDispenser(tankFish);
    this.updatePendingHelperCreatureDrops(deltaSeconds);
    this.updateHelperCreatures(deltaSeconds, tankFish, activeHelpers);
    this.updateTankCleanliness(deltaSeconds, tankFish.length);
    this.updateDirtyTankOverlay();
    const foodAssignments = this.assignFoodsToFish(tankFish);
    const fishToRemove: Fish[] = [];
    for (const currentFish of tankFish) {
      const previousAgeStage = currentFish.ageStage;
      const previousState = currentFish.state;
      const eatenFood = currentFish.update(deltaSeconds, foodAssignments.get(currentFish) ?? [], tankFish);
      if (currentFish.ageStage !== previousAgeStage) {
        this.saveNow();
      }
      if (previousState !== "hungry" && currentFish.state === "hungry") {
        this.playSfx(fishHungrySoundKey, { volume: 0.16 });
      }

      if (eatenFood) {
        const ateMedicine = eatenFood.accepted && eatenFood.food.foodType.id === "medicine";
        const ateAgeBoost = eatenFood.accepted && eatenFood.food.foodType.id === "ageBoost";
        if (eatenFood.accepted) {
          this.playSfx(fishEatSoundKey, { volume: 0.18 });
        }
        if (eatenFood.accepted && !ateMedicine && !ateAgeBoost) {
          this.recordDailyQuestAction("feed");
          this.showMissedFoodEmotes(eatenFood.food, currentFish);
          if (currentFish.nextCoinDropAt <= this.time.now) {
            currentFish.postponeCoinProduction(this.time.now, Phaser.Math.Between(5000, 30000));
          }
        }
        this.refundUnusedFood(eatenFood.food, eatenFood.consumedCalories);
        this.removeFood(eatenFood.food);
        if (ateMedicine) {
          currentFish.applyMedicine(this.time.now);
          this.recordDailyQuestAction("medicine");
          this.floatTankText("Healed", currentFish.sprite.x, currentFish.sprite.y - 26, "#a8ffb0");
        } else if (ateAgeBoost) {
          currentFish.applyAgeBoost(3);
          this.floatTankText("+3 months", currentFish.sprite.x, currentFish.sprite.y - 26, "#d9c2ff");
        } else {
          if (eatenFood.reason === "tooSmall") {
            currentFish.showFoodNeedMessage(this.foodNeedMessage(eatenFood.neededMealCalories));
          } else {
            this.floatTankText(eatenFood.accepted ? "Yum" : "Nope", currentFish.sprite.x, currentFish.sprite.y - 26, eatenFood.accepted ? "#f7ff9a" : "#ffb0a8");
          }
        }
        if (!eatenFood.accepted) {
          this.cleanliness = Phaser.Math.Clamp(this.cleanliness - 4, 0, 100);
        }
        this.saveNow();
      }

      if (this.cleanliness < 35 && currentFish.hunger > 72) {
        currentFish.health = Phaser.Math.Clamp(currentFish.health - 1.8 * deltaSeconds, 0, 100);
      }

      this.updateFishCoinProduction(currentFish);

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

    this.autosaveElapsed += deltaSeconds;
    if (this.autosaveElapsed >= 5) {
      this.autosaveElapsed = 0;
      this.saveNow();
    }

    this.hudStatusSyncElapsed += deltaSeconds;
    if (this.hudStatusSyncElapsed >= hudStatusSyncIntervalSeconds) {
      this.hudStatusSyncElapsed = 0;
      this.refreshStatus();
    }
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
    this.tankBackgroundBlueTintOverlay = this.add.rectangle(tankBounds.centerX, tankBounds.centerY, tankBounds.width, tankBounds.height, tankCosmeticBlueTintColor, 1).setDepth(1);
    this.tankLayer.add(this.tankBackgroundBlueTintOverlay);
    this.applyTankViewScale();
    this.tankSand = this.createTankFloor();
    this.tankLayer.add(this.tankSand);
    this.layoutTankFloor();
    this.dirtyTankOverlay = this.createDirtyTankOverlay();

    const ambientBubbleCount = shouldUseLowPowerMode() ? 8 : 18;
    for (let i = 0; i < ambientBubbleCount; i += 1) {
      const particle = this.add.circle(
        Phaser.Math.Between(tankBounds.left + 20, tankBounds.right - 20),
        Phaser.Math.Between(tankBounds.top + 20, tankBounds.bottom - 40),
        Phaser.Math.Between(2, 6),
        cleanBubbleTintColor,
        0.28
      );
      this.styleAmbientWaterParticle(particle);
      this.ambientWaterParticles.push(particle);
      this.tankLayer.add(particle);
      this.tweens.add({
        targets: particle,
        y: tankBounds.top + Phaser.Math.Between(8, 60),
        alpha: 0,
        duration: Phaser.Math.Between(3500, 7600),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3500),
        onRepeat: () => {
          particle.x = Phaser.Math.Between(tankBounds.left + 20, tankBounds.right - 20);
          particle.y = tankBounds.bottom - Phaser.Math.Between(30, 90);
          this.styleAmbientWaterParticle(particle, true);
        }
      });
    }
  }

  private createUi(): void {
    this.createScreenNav();
    this.createFoodDock();
    this.createDecorationTrashTarget();
    this.renderTabControls();
    this.syncHtmlGameInterface();
  }

  private tankLevelHueDegrees(displayLevel: number): number {
    return ((Math.max(1, Math.floor(displayLevel)) - 1) * 37) % 360;
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
        fontFamily: gameFontFamily,
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

  private tankStateConfig(): TankStateConfig {
    return {
      maxOwnedTanks,
      basicFoodId: basicFood.id,
      basicFoodCalories: basicFood.calories,
      defaultCosmeticId: (level) => this.defaultTankCosmeticId(level),
      validCosmeticId: (category, id, level) => this.validTankCosmeticId(category, id, level)
    };
  }

  private ensureTankState(level = this.tankLevel): TankRuntimeState {
    return ensureTankStateModel(this.tankStates, level, this.tankStateConfig());
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
      backgroundBlueTints: state.backgroundBlueTints,
      seabedBlueTints: state.seabedBlueTints,
      selectedBackgroundId: state.selectedBackgroundId,
      selectedSeabedId: state.selectedSeabedId,
      cleanliness: this.cleanliness,
      cleanedAt: this.cleanedAt,
      maxDisplayLevel: Math.max(state.maxDisplayLevel ?? 1, this.rawTankDisplayLevelFromWorth(this.calculateTankNetWorth(this.tankLevel)))
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
    return sortedTankLevels(this.ownedTankLevels);
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
    const background = this.tankCosmeticById("background", this.renderTankCosmeticId("background", level));
    const seabed = this.tankCosmeticById("seabed", this.renderTankCosmeticId("seabed", level));
    return {
      backgroundKey: background?.textureKey ?? aquariumBackgroundTextureKey,
      floorKey: seabed?.textureKey ?? aquariumFloorTextureKey
    };
  }

  private renderTankCosmeticId(category: TankCosmeticCategory, level = this.tankLevel): string {
    if (this.activeScreen === "makeup" && level === this.tankLevel && this.makeupDraft) {
      const cosmetics = this.tankCosmetics(category);
      const index = category === "background" ? this.makeupDraft.backgroundIndex : this.makeupDraft.seabedIndex;
      return cosmetics[index]?.id ?? this.selectedTankCosmeticId(category, level);
    }

    return this.selectedTankCosmeticId(category, level);
  }

  private tankThemeTint(level: number): number {
    if (level <= 1) {
      return 0xffffff;
    }

    const tintPalette = [0xffffff, 0xfff5ee, 0xe8fff2, 0xf1fbff, 0xdce9ff, 0xfff0dd];
    return tintPalette[Math.abs(Math.floor(level - 2)) % tintPalette.length];
  }

  private tankCosmeticBlueTintInventory(category: TankCosmeticCategory, level = this.tankLevel): Map<string, number> {
    const state = this.ensureTankState(level);
    return category === "background" ? state.backgroundBlueTints : state.seabedBlueTints;
  }

  private tankCosmeticBlueTintIntensity(category: TankCosmeticCategory, id: string, level = this.tankLevel): number {
    return Phaser.Math.Clamp(this.tankCosmeticBlueTintInventory(category, level).get(id) ?? 0, 0, 100);
  }

  private renderTankCosmeticBlueTintIntensity(category: TankCosmeticCategory, id: string, level = this.tankLevel): number {
    if (this.activeScreen === "makeup" && level === this.tankLevel && this.makeupDraft) {
      const tintMap = category === "background" ? this.makeupDraft.backgroundTintById : this.makeupDraft.seabedTintById;
      return Phaser.Math.Clamp(tintMap.get(id) ?? 0, 0, 100);
    }

    return this.tankCosmeticBlueTintIntensity(category, id, level);
  }

  private tankCosmeticTint(category: TankCosmeticCategory, id: string, level = this.tankLevel): number {
    const baseTint = category === "background" ? this.tankThemeTint(level) : 0xffffff;
    return this.mixRgb(baseTint, tankCosmeticBlueTintColor, this.renderTankCosmeticBlueTintIntensity(category, id, level) / 100);
  }

  private mixRgb(from: number, to: number, ratio: number): number {
    const amount = Phaser.Math.Clamp(ratio, 0, 1);
    const fromR = (from >> 16) & 0xff;
    const fromG = (from >> 8) & 0xff;
    const fromB = from & 0xff;
    const toR = (to >> 16) & 0xff;
    const toG = (to >> 8) & 0xff;
    const toB = to & 0xff;
    const r = Math.round(Phaser.Math.Linear(fromR, toR, amount));
    const g = Math.round(Phaser.Math.Linear(fromG, toG, amount));
    const b = Math.round(Phaser.Math.Linear(fromB, toB, amount));
    return (r << 16) | (g << 8) | b;
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

  private createTankFloor(): Phaser.GameObjects.Image {
    const textureKeys = this.themedTankTextureKeys();
    const textureKey = this.textures.exists(textureKeys.floorKey) ? textureKeys.floorKey : aquariumFloorTextureKey;
    return this.add.image(tankBounds.centerX, tankBounds.bottom, textureKey).setOrigin(0.5, 1).setDepth(2);
  }

  private ensureTextureLoaded(textureKey: string, assetPath: string | undefined, onLoad: () => void): boolean {
    if (this.textures.exists(textureKey)) {
      return true;
    }

    if (!assetPath || this.pendingTextureLoads.has(textureKey)) {
      return false;
    }

    this.pendingTextureLoads.add(textureKey);
    const completeEvent = `filecomplete-image-${textureKey}`;
    const cleanupListeners = () => {
      this.load.off(completeEvent, finish);
      this.load.off(Phaser.Loader.Events.COMPLETE, finish);
      this.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, fail);
    };
    const finish = () => {
      if (!this.pendingTextureLoads.has(textureKey)) {
        return;
      }
      cleanupListeners();
      this.pendingTextureLoads.delete(textureKey);
      if (this.textures.exists(textureKey)) {
        onLoad();
      }
    };
    const fail = () => {
      cleanupListeners();
      this.pendingTextureLoads.delete(textureKey);
    };
    this.load.once(completeEvent, finish);
    this.load.once(Phaser.Loader.Events.COMPLETE, finish);
    this.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, fail);
    this.load.image(textureKey, assetPath);

    const loader = this.load as unknown as { isLoading?: () => boolean };
    if (!loader.isLoading?.()) {
      this.load.start();
    }

    return false;
  }

  private ensureFishTexturesLoaded(fishType: FishType, onLoad?: () => void): boolean {
    const staticKey = `fish-${fishType.id}`;
    const swimKey = `fish-${fishType.id}-swim`;
    const texturesReady = this.textures.exists(staticKey) && this.textures.exists(swimKey);
    if (texturesReady) {
      this.createFishAnimation(fishType);
      onLoad?.();
      return true;
    }

    if (onLoad) {
      const callbacks = this.fishTextureLoadCallbacks.get(fishType.id) ?? new Set<() => void>();
      callbacks.add(onLoad);
      this.fishTextureLoadCallbacks.set(fishType.id, callbacks);
    }

    if (this.pendingFishTextureLoads.has(fishType.id)) {
      return false;
    }

    this.pendingFishTextureLoads.add(fishType.id);
    if (!this.textures.exists(staticKey)) {
      this.load.image(staticKey, `/assets/fish/${fishType.id}.png`);
    }
    if (!this.textures.exists(swimKey)) {
      this.load.spritesheet(swimKey, `/assets/fish/${fishType.id}-swim.webp`, {
        frameWidth: 256,
        frameHeight: 160
      });
    }

    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.pendingFishTextureLoads.delete(fishType.id);
      this.createFishAnimation(fishType);
      const callbacks = this.fishTextureLoadCallbacks.get(fishType.id);
      this.fishTextureLoadCallbacks.delete(fishType.id);
      callbacks?.forEach((callback) => callback());
    });

    const loader = this.load as unknown as { isLoading?: () => boolean };
    if (!loader.isLoading?.()) {
      this.load.start();
    }

    return false;
  }

  private createDirtyTankOverlay(): Phaser.GameObjects.Rectangle {
    const overlay = this.add
      .rectangle(tankViewportBounds.centerX, tankViewportBounds.centerY, tankViewportBounds.width, tankViewportBounds.height, dirtyTankTintColor, 1)
      .setBlendMode(Phaser.BlendModes.NORMAL)
      .setDepth(17)
      .setAlpha(0)
      .setVisible(false);
    this.updateDirtyTankOverlay(overlay);
    return overlay;
  }

  private updateDirtyTankOverlay(overlay = this.dirtyTankOverlay): void {
    const dirtyRatio = Phaser.Math.Clamp((dirtyTankOverlayThreshold - this.cleanliness) / dirtyTankOverlayThreshold, 0, 1);
    const visible = dirtyRatio > 0;
    const easedRatio = Math.pow(dirtyRatio, 0.72);

    if (overlay) {
      overlay.setVisible(visible);
      overlay.setPosition(tankViewportBounds.centerX, tankViewportBounds.centerY);
      overlay.setSize(tankViewportBounds.width, tankViewportBounds.height);
      overlay.setFillStyle(dirtyTankTintColor, 1);
      overlay.setAlpha(visible ? Phaser.Math.Linear(0.05, dirtyTankOverlayMaxAlpha, easedRatio) : 0);
    }
    this.updateAmbientWaterParticles();
  }

  private updateAmbientWaterParticles(): void {
    const algaeMode = this.cleanliness < algaeParticleThreshold;
    if (this.ambientWaterParticlesAlgaeMode === algaeMode) {
      return;
    }

    this.ambientWaterParticlesAlgaeMode = algaeMode;
    for (const particle of this.ambientWaterParticles) {
      this.styleAmbientWaterParticle(particle, true);
    }
  }

  private styleAmbientWaterParticle(particle: Phaser.GameObjects.Arc, randomizeSize = false): void {
    const algaeMode = this.cleanliness < algaeParticleThreshold;
    if (randomizeSize) {
      particle.setRadius(algaeMode ? Phaser.Math.FloatBetween(3.5, 6.5) : Phaser.Math.FloatBetween(2, 6));
      particle.setScale(algaeMode ? Phaser.Math.FloatBetween(0.22, 0.38) : 1, algaeMode ? Phaser.Math.FloatBetween(1.8, 3.2) : 1);
      particle.setAngle(algaeMode ? Phaser.Math.Between(-28, 28) : 0);
    }
    particle.setFillStyle(algaeMode ? algaeParticleTintColor : cleanBubbleTintColor, algaeMode ? 0.62 : 0.28);
    particle.setAlpha(algaeMode ? 0.62 : 0.28);
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
    const selectedBackgroundId = this.renderTankCosmeticId("background");
    this.tankBackground.setPosition(tankBounds.centerX, tankBounds.centerY);
    if (this.tankBackground instanceof Phaser.GameObjects.Image) {
      const textureKeys = this.themedTankTextureKeys();
      const textureKey = this.textures.exists(textureKeys.backgroundKey) ? textureKeys.backgroundKey : aquariumBackgroundTextureKey;
      this.ensureTextureLoaded(textureKeys.backgroundKey, tankTextureAssetPathByKey.get(textureKeys.backgroundKey), () => this.layoutTankBackground());
      this.tankBackground.setTexture(textureKey);
      this.tankBackground.setDisplaySize(screenCompensatedWidth, screenCompensatedHeight);
      this.tankBackground.setAlpha(1);
      this.tankBackground.setTint(this.tankCosmeticTint("background", selectedBackgroundId));
    } else {
      this.tankBackground.setSize(screenCompensatedWidth, screenCompensatedHeight);
    }

    this.layoutTankBlueTintOverlay(
      this.tankBackgroundBlueTintOverlay,
      tankBounds.centerX,
      tankBounds.centerY,
      screenCompensatedWidth,
      screenCompensatedHeight,
      this.renderTankCosmeticBlueTintIntensity("background", selectedBackgroundId),
      0.48
    );
  }

  private layoutTankFloor(): void {
    if (!this.tankSand) {
      return;
    }

    const scale = Math.max(0.01, this.tankViewScaleForLevel());
    const textureKeys = this.themedTankTextureKeys();
    const floorTextureReady = this.textures.exists(textureKeys.floorKey);
    this.ensureTextureLoaded(textureKeys.floorKey, tankTextureAssetPathByKey.get(textureKeys.floorKey), () => this.layoutTankFloor());
    if (!floorTextureReady && this.activeScreen === "makeup") {
      return;
    }
    const textureKey = floorTextureReady ? textureKeys.floorKey : aquariumFloorTextureKey;
    this.tankSand.setTexture(textureKey);
    this.tankSand.setOrigin(0.5, 1);
    this.tankSand.setPosition(tankBounds.centerX, this.visibleTankBottomDesignY());
    const displayHeight = tankBounds.height / 6 / scale;
    const selectedSeabedId = this.renderTankCosmeticId("seabed");
    this.applyTankFloorCrop(textureKey);
    this.tankSand.setDisplaySize(tankBounds.width / scale, displayHeight);
    this.tankSand.setTint(this.tankCosmeticTint("seabed", selectedSeabedId));
  }

  private applyTankFloorCrop(textureKey: string): void {
    if (!this.tankSand) {
      return;
    }

    const cropTop = tankFloorTextureCropTopByKey.get(textureKey) ?? 0;
    if (cropTop <= 0) {
      this.tankSand.setCrop();
      return;
    }

    const frame = this.textures.getFrame(textureKey);
    const sourceWidth = frame?.width ?? 1024;
    const sourceHeight = frame?.height ?? 1024;
    const safeCropTop = Phaser.Math.Clamp(cropTop, 0, sourceHeight - 1);
    this.tankSand.setCrop(0, safeCropTop, sourceWidth, sourceHeight - safeCropTop);
  }

  private layoutTankBlueTintOverlay(
    overlay: Phaser.GameObjects.Rectangle | undefined,
    x: number,
    y: number,
    width: number,
    height: number,
    intensity: number,
    maxAlpha: number,
    originX = 0.5,
    originY = 0.5
  ): void {
    if (!overlay) {
      return;
    }

    const alpha = (Phaser.Math.Clamp(intensity, 0, 100) / 100) * maxAlpha;
    overlay
      .setOrigin(originX, originY)
      .setPosition(x, y)
      .setSize(width, height)
      .setFillStyle(tankCosmeticBlueTintColor, 1)
      .setAlpha(alpha)
      .setVisible(alpha > 0);
  }

  private visibleTankBottomDesignY(): number {
    const rect = this.game.canvas.getBoundingClientRect();
    if (rect.height <= 0) {
      return tankBounds.bottom;
    }

    const visibleBottom = ((window.innerHeight - rect.top) / rect.height) * gameHeight;
    return Phaser.Math.Clamp(visibleBottom, tankBounds.top, tankBounds.bottom);
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
    this.pendingHelperCreatureDrops.forEach((drop) => this.fitPendingHelperCreatureDrop(drop, scale));
  }

  private createScreenNav(): void {
    this.screenButtons.forEach((button) => button.destroy(true));
    this.screenButtons = [];
    this.syncHtmlGameInterface();
  }

  private syncTankMenuOverlay(): void {
    if (this.activeScreen !== "tank") {
      this.tankMenuOverlay?.classList.add("hidden");
      return;
    }

    if (this.tankMenuOverlay && this.tankMenuOverlay.dataset.version !== tankMenuVersion) {
      this.destroyTankMenuOverlay();
    }
    this.tankMenuOverlay ??= this.createTankMenuOverlay();
    this.tankMenuOverlay.classList.remove("hidden");
    this.syncTankMenuCollapsedState();
    this.syncGoalMenuBadge();
  }

  private createTankMenuOverlay(): HTMLDivElement {
    const overlay = document.createElement("div");
    overlay.className = "aq-tank-menu";
    overlay.dataset.version = tankMenuVersion;

    const menuDockLowerOffset = 12;
    const shopY = 212 + menuDockLowerOffset;
    const menuSpacing = 72;
    const toggleY = shopY + menuSpacing;
    const gameY = toggleY + menuSpacing;
    const screens: { id: string; label: string; y: number; icon: string; action: () => void }[] = [
      { id: "shop", label: "Shop", y: shopY, icon: "/assets/ui/shop.png", action: () => this.openScreen("store") },
      { id: "game", label: "Game", y: gameY, icon: menuIconAssetPathByKey["ui-game"], action: () => this.openPrizeMachineArcade() },
      { id: "book", label: "Inventory", y: gameY + menuSpacing, icon: menuIconAssetPathByKey["ui-book"], action: () => this.openScreen("album") },
      { id: "tanks", label: "Tanks", y: gameY + menuSpacing * 2, icon: menuIconAssetPathByKey["ui-tanks"], action: () => this.openScreen("tanks") },
      { id: "quest", label: "Quest", y: gameY + menuSpacing * 3, icon: menuIconAssetPathByKey["ui-goals"], action: () => this.openScreen("goals") },
      { id: "settings", label: "Set", y: gameY + menuSpacing * 4, icon: menuIconAssetPathByKey["ui-settings"], action: () => this.openScreen("settings") }
    ];

    for (const item of screens) {
      const button = document.createElement("button");
      button.type = "button";
      const fixed = item.id === "shop";
      button.className = `aq-tank-menu-button ${fixed ? "aq-tank-menu-button-fixed" : "aq-tank-menu-button-collapsible"}`;
      button.dataset.menu = item.id;
      button.style.top = `${(item.y / gameHeight) * 100}%`;
      button.setAttribute("aria-label", item.label);
      this.attachTouchFeedback(button, true);
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        item.action();
      });

      const bubble = document.createElement("span");
      bubble.className = "aq-tank-menu-bubble";
      const icon = document.createElement("img");
      icon.src = item.icon;
      icon.alt = "";
      icon.draggable = false;
      bubble.append(icon);
      if (item.id === "quest") {
        const badge = document.createElement("span");
        badge.className = "aq-tank-menu-badge hidden";
        badge.setAttribute("aria-hidden", "true");
        bubble.append(badge);
      }

      const label = document.createElement("span");
      label.className = "aq-tank-menu-label";
      label.textContent = item.label;

      button.append(bubble, label);
      overlay.append(button);
    }

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "aq-tank-menu-toggle";
    toggle.style.top = `${(toggleY / gameHeight) * 100}%`;
    toggle.setAttribute("aria-label", "Toggle menu");
    this.attachTouchFeedback(toggle, true);
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.tankMenuCollapsed = !this.tankMenuCollapsed;
      this.syncTankMenuCollapsedState();
    });

    const toggleBubble = document.createElement("span");
    toggleBubble.className = "aq-tank-menu-bubble aq-tank-menu-toggle-bubble";
    const toggleIcon = document.createElement("span");
    toggleIcon.className = "aq-tank-menu-toggle-icon";
    toggleIcon.setAttribute("aria-hidden", "true");
    toggleBubble.append(toggleIcon);
    toggle.append(toggleBubble);
    overlay.append(toggle);

    document.body.appendChild(overlay);
    this.syncTankMenuCollapsedState();
    return overlay;
  }

  private syncTankMenuCollapsedState(): void {
    if (!this.tankMenuOverlay) {
      return;
    }

    this.tankMenuOverlay.classList.toggle("is-collapsed", this.tankMenuCollapsed);
    const toggle = this.tankMenuOverlay.querySelector(".aq-tank-menu-toggle");
    const icon = toggle?.querySelector(".aq-tank-menu-toggle-icon");
    if (toggle instanceof HTMLElement) {
      toggle.setAttribute("aria-expanded", String(!this.tankMenuCollapsed));
    }
    if (icon instanceof HTMLElement) {
      icon.textContent = this.tankMenuCollapsed ? "<" : ">";
    }
  }

  private syncGoalMenuBadge(): void {
    if (!this.tankMenuOverlay) {
      return;
    }

    const badge = this.tankMenuOverlay.querySelector(".aq-tank-menu-badge");
    if (!(badge instanceof HTMLElement)) {
      return;
    }

    const count = this.dailyGoalUnfinishedCount();
    badge.textContent = this.foodBadgeLabel(count);
    badge.classList.toggle("hidden", count <= 0);
  }

  private syncHtmlGameInterface(): void {
    this.syncTankMenuOverlay();
    this.syncHtmlHud();
    this.syncHtmlFoodDock();
  }

  private syncHtmlHud(): void {
    if (this.activeScreen !== "tank") {
      this.gameHudOverlay?.classList.add("hidden");
      return;
    }

    this.gameHudOverlay ??= this.createHtmlHudOverlay();
    this.gameHudOverlay.classList.remove("hidden");

    const displayLevel = this.tankDisplayLevel();
    this.gameHudLevelText!.textContent = formatNumber(displayLevel);
    this.gameHudLevelBadge!.style.setProperty("--level-badge-hue", `${this.tankLevelHueDegrees(displayLevel)}deg`);
    this.gameHudCommonText!.textContent = formatNumber(this.wallet.common);
    this.gameHudRareText!.textContent = formatNumber(this.wallet.rare);
    this.gameHudSuperRareText!.textContent = formatNumber(this.wallet.superRare);
    this.gameHudWealthText!.textContent = formatNumber(this.calculateTankNetWorth());
    this.gameHudCleanText!.textContent = `Clean ${formatNumber(Math.round(this.cleanliness))}%`;
    this.gameHudCleanText!.parentElement?.classList.toggle("is-clean-warning", this.cleanliness > 0 && this.cleanliness < 72);
    this.gameHudCleanText!.parentElement?.classList.toggle("is-clean-danger", this.cleanliness <= 0);
    this.gameHudHappyText!.textContent = `Happy ${formatNumber(Math.round(this.calculateTankHappiness()))}%`;
    if (this.foodDispenserText) {
      this.foodDispenserText.textContent = this.foodBadgeLabel(this.getTotalDispenserInventory());
    }
    this.syncFoodDispenserPosition();
    this.syncFoodDockPosition();
  }

  private createHtmlHudOverlay(): HTMLDivElement {
    const overlay = document.createElement("div");
    overlay.className = "aq-game-hud";

    const panel = document.createElement("section");
    panel.className = "aq-game-stat-panel";

    const summary = document.createElement("div");
    summary.className = "aq-game-tank-summary";
    const badge = document.createElement("div");
    badge.className = "aq-game-level-badge";
    this.prepareHudInfoTarget(badge, "Level", [
      "Your tank level is based on the total value of this tank.",
      "Higher level unlocks better fish and gives the tank more room to grow."
    ]);
    this.gameHudLevelBadge = badge;
    this.gameHudLevelText = document.createElement("span");
    badge.append(this.gameHudLevelText);
    summary.prepend(badge);

    const wallet = document.createElement("div");
    wallet.className = "aq-game-wallet-grid";
    this.gameHudCommonText = this.createHudChip(wallet, "/assets/ui/shop/coin_icon_common.png", "Common", "aq-game-wallet-chip", [
      "Common coins are the basic money used for early fish, food, medicine, decorations, and starter tank items.",
      "Most young fish produce common coins."
    ]);
    this.gameHudRareText = this.createHudChip(wallet, "/assets/ui/shop/coin_icon_rare.png", "Rare", "aq-game-wallet-chip", [
      "Rare currency is used for stronger rare fish and higher-value shop items.",
      "It comes from quests, ads, events, and later reward systems."
    ]);
    this.gameHudSuperRareText = this.createHudChip(wallet, "/assets/ui/shop/coin_icon_super_rare.png", "Super Rare", "aq-game-wallet-chip", [
      "Super rare diamonds are premium progression currency for the most valuable fish and items.",
      "They come from special quests, ads, events, and late progression rewards."
    ]);

    const care = document.createElement("div");
    care.className = "aq-game-care-row";
    this.gameHudWealthText = this.createHudChip(care, "/assets/ui/shop/wealth_icon_treasure.png", "Wealth", "aq-game-wealth-chip", [
      "Wealth is the estimated total value of this tank.",
      "It includes wallet, fish, inventory, decorations, owned cosmetics, helpers, and waiting coin drops."
    ]);
    this.gameHudCleanText = this.appendHudText(care, "/assets/ui/icon-clean-status.png");
    const cleanChip = this.gameHudCleanText.parentElement;
    if (cleanChip) {
      this.prepareHudActionTarget(cleanChip, "Clean tank", () => this.cleanTank());
    }
    this.gameHudHappyText = this.appendHudText(care, "/assets/ui/icon-happy-status.png", "Happy", [
      "Happy is the overall mood of the tank.",
      "Fed, healthy fish and decorations improve the tank feeling."
    ]);

    panel.append(summary, wallet, care);
    const foodDispenser = document.createElement("div");
    foodDispenser.className = "aq-food-dispenser";
    this.foodDispenserElement = foodDispenser;
    const foodDispenserIcon = document.createElement("img");
    foodDispenserIcon.src = foodDispenserAssetPath;
    foodDispenserIcon.alt = "Fish food dispenser";
    foodDispenserIcon.draggable = false;
    const foodDispenserBadge = document.createElement("span");
    foodDispenserBadge.className = "aq-food-dispenser-count";
    this.foodDispenserText = foodDispenserBadge;
    foodDispenser.append(foodDispenserIcon, foodDispenserBadge);
    this.bindFoodDispenserDrag(foodDispenser);

    overlay.append(panel, foodDispenser);
    document.body.appendChild(overlay);
    return overlay;
  }

  private syncFoodDispenserPosition(): void {
    if (!this.foodDispenserElement) {
      return;
    }

    if (!this.hasFoodDispenser()) {
      this.foodDispenserElement.classList.add("hidden");
      return;
    }

    this.foodDispenserElement.classList.remove("hidden");

    this.foodDispenserY = Phaser.Math.Clamp(this.foodDispenserY, this.foodDispenserMinY(), this.foodDispenserMaxY());
    const position = this.tankToScreenPoint(tankBounds.left, this.foodDispenserY);
    this.foodDispenserElement.style.setProperty("--food-dispenser-left", `${Math.round(position.x)}px`);
    this.foodDispenserElement.style.setProperty("--food-dispenser-top", `${Math.round(position.y)}px`);
  }

  private bindFoodDispenserDrag(element: HTMLElement): void {
    let pressed = false;
    let dragging = false;
    let startClientY = 0;
    let startDispenserY = this.foodDispenserY;
    const dragThresholdPx = 8;
    const cleanup = (pointerId?: number) => {
      pressed = false;
      dragging = false;
      element.classList.remove("is-dragging");
      if (pointerId !== undefined) {
        this.releasePointerSafely(element, pointerId);
      }
    };
    const move = (event: PointerEvent) => {
      if (!pressed) {
        return;
      }

      event.preventDefault();
      const clientDeltaY = event.clientY - startClientY;
      if (!dragging && Math.abs(clientDeltaY) < dragThresholdPx) {
        return;
      }

      dragging = true;
      element.classList.add("is-dragging");
      const canvas = this.game.canvas;
      const rect = canvas.getBoundingClientRect();
      const designDeltaY = rect.height > 0 ? (clientDeltaY / rect.height) * gameHeight : 0;
      this.foodDispenserY = Phaser.Math.Clamp(startDispenserY + designDeltaY, this.foodDispenserMinY(), this.foodDispenserMaxY());
      this.syncFoodDispenserPosition();
    };
    const end = (event: PointerEvent) => {
      if (!pressed) {
        return;
      }
      event.preventDefault();
      const shouldSave = dragging;
      cleanup(event.pointerId);
      if (shouldSave) {
        this.saveFoodDispenserY();
      }
    };

    element.addEventListener("pointerdown", (event) => {
      if (this.activeScreen !== "tank") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      pressed = true;
      dragging = false;
      startClientY = event.clientY;
      startDispenserY = this.foodDispenserY;
      this.capturePointerSafely(element, event.pointerId);
    });
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", end);
    element.addEventListener("pointercancel", end);
    element.addEventListener("lostpointercapture", () => cleanup());
  }

  private loadFoodDispenserY(): void {
    try {
      const stored =
        localStorage.getItem(foodDispenserPositionStorageKey) ??
        localStorage.getItem(legacyFoodDispenserPositionStorageKey);
      if (!stored) {
        return;
      }
      const parsed = Number(stored);
      if (Number.isFinite(parsed)) {
        this.foodDispenserY = Phaser.Math.Clamp(parsed, this.foodDispenserMinY(), this.foodDispenserMaxY());
      }
    } catch {
      // Optional UI position persistence should not block game startup.
    }
  }

  private saveFoodDispenserY(): void {
    try {
      localStorage.setItem(foodDispenserPositionStorageKey, String(Math.round(this.foodDispenserY)));
      localStorage.removeItem(legacyFoodDispenserPositionStorageKey);
    } catch {
      // Ignore storage failures.
    }
  }

  private foodDispenserMinY(): number {
    return tankBounds.top + 164;
  }

  private foodDispenserMaxY(): number {
    return tankBounds.bottom - 8;
  }

  private createHudChip(parent: HTMLElement, iconSrc: string, label: string, className = "aq-game-wallet-chip", definition?: string[]): HTMLSpanElement {
    const chip = document.createElement("div");
    chip.className = className;
    if (definition) {
      this.prepareHudInfoTarget(chip, label, definition);
    }
    const icon = document.createElement("img");
    icon.src = iconSrc;
    icon.alt = label;
    icon.draggable = false;
    const text = document.createElement("span");
    chip.append(icon, text);
    parent.append(chip);
    return text;
  }

  private appendHudText(parent: HTMLElement, iconSrc?: string, definitionTitle?: string, definition?: string[]): HTMLSpanElement {
    const item = document.createElement("span");
    item.className = "aq-game-hud-pill";
    if (definitionTitle && definition) {
      this.prepareHudInfoTarget(item, definitionTitle, definition);
    }
    if (iconSrc) {
      const icon = document.createElement("img");
      icon.src = iconSrc;
      icon.alt = "";
      icon.draggable = false;
      item.append(icon);
    }
    const text = document.createElement("span");
    item.append(text);
    parent.append(item);
    return text;
  }

  private prepareHudInfoTarget(element: HTMLElement, title: string, lines: string[]): void {
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");
    element.setAttribute("aria-label", `Show ${title} definition`);
    element.classList.add("aq-hud-info-target");
    this.attachTouchFeedback(element, true);
    const show = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      this.showModal(title, lines, [{ label: "Close", fill: 0x254d68, action: () => this.closeModal() }]);
    };
    element.addEventListener("click", show);
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        show(event);
      }
    });
  }

  private prepareHudActionTarget(element: HTMLElement, label: string, action: () => void): void {
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");
    element.setAttribute("aria-label", label);
    element.classList.add("aq-hud-info-target");
    this.attachTouchFeedback(element, true);
    const run = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      action();
    };
    element.addEventListener("click", run);
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        run(event);
      }
    });
  }

  private syncHtmlFoodDock(): void {
    if (this.activeScreen !== "tank") {
      this.cancelHtmlFoodDrag();
      this.htmlFoodDock?.classList.add("hidden");
      return;
    }

    this.htmlFoodDock ??= this.createHtmlFoodDock();
    this.htmlFoodDock.classList.remove("hidden");
    if (this.htmlDockDragging) {
      this.syncFoodDockPosition();
      return;
    }
    this.htmlFoodDock.replaceChildren();

    const allItems = this.visibleInventoryDockItems();
    this.focusRecentInventoryDockItem(allItems);
    const pageCount = Math.max(1, Math.ceil(allItems.length / inventoryDockPageSize));
    this.inventoryDockPage = Phaser.Math.Clamp(this.inventoryDockPage, 0, pageCount - 1);
    const visibleItems = allItems.slice(
      this.inventoryDockPage * inventoryDockPageSize,
      (this.inventoryDockPage + 1) * inventoryDockPageSize
    );
    for (const item of visibleItems) {
      this.htmlFoodDock.append(this.createHtmlInventoryDockButton(item));
    }
    if (pageCount > 1) {
      this.htmlFoodDock.append(this.createInventoryDockPager(pageCount));
    }
    this.syncFoodDockPosition();
  }

  private focusRecentInventoryDockItem(items: InventoryDockItem[]): void {
    if (!this.recentInventoryDockItemKey) {
      return;
    }

    const index = items.findIndex((item) => this.inventoryDockItemKey(item) === this.recentInventoryDockItemKey);
    if (index >= 0) {
      this.inventoryDockPage = Math.floor(index / inventoryDockPageSize);
    }
    this.recentInventoryDockItemKey = undefined;
  }

  private createInventoryDockPager(pageCount: number): HTMLDivElement {
    const pager = document.createElement("div");
    pager.className = "aq-food-dock-pager";
    const previous = this.createInventoryDockPageButton("<", () => {
      this.inventoryDockPage = (this.inventoryDockPage - 1 + pageCount) % pageCount;
      this.syncHtmlFoodDock();
    });
    const next = this.createInventoryDockPageButton(">", () => {
      this.inventoryDockPage = (this.inventoryDockPage + 1) % pageCount;
      this.syncHtmlFoodDock();
    });
    const label = document.createElement("span");
    label.className = "aq-food-dock-page-label";
    label.textContent = `${formatNumber(this.inventoryDockPage + 1)}/${formatNumber(pageCount)}`;
    pager.append(previous, label, next);
    return pager;
  }

  private createInventoryDockPageButton(label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "aq-food-dock-page-button";
    button.textContent = label;
    this.attachTouchFeedback(button);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  private syncFoodDockPosition(): void {
    if (!this.htmlFoodDock || !this.gameHudOverlay || this.activeScreen !== "tank") {
      return;
    }

    const hudPanel = this.gameHudOverlay.querySelector(".aq-game-stat-panel");
    const hudBottom = hudPanel instanceof HTMLElement ? hudPanel.getBoundingClientRect().bottom : 0;
    const top = Math.max(140, Math.round(hudBottom + 30));
    this.htmlFoodDock.style.setProperty("--food-dock-top", `${top}px`);
  }

  private createHtmlFoodDock(): HTMLDivElement {
    const dock = document.createElement("div");
    dock.className = "aq-food-dock";
    document.body.appendChild(dock);
    return dock;
  }

  private visibleInventoryDockItems(): InventoryDockItem[] {
    const foodItems: InventoryDockItem[] = foodTypes
      .filter((foodType) => !hiddenFoodTypeIds.has(foodType.id) && this.getFoodInventory(foodType.id) > 0)
      .map((foodType) => ({
        kind: "food",
        id: foodType.id,
        label: this.foodDockLabel(foodType),
        count: this.foodInventoryDisplayCount(foodType),
        badgeLabel: this.foodInventoryBadgeLabel(foodType),
        icon: foodAssetPath(foodType.id)
      }));
    const fishItems: InventoryDockItem[] = fishTypes
      .filter((fishType) => this.getFishInventory(fishType.id) > 0)
      .map((fishType) => ({
        kind: "fish",
        id: fishType.id,
        label: fishType.name,
        count: this.getFishInventory(fishType.id),
        icon: `/assets/fish/${fishType.id}.png`
      }));
    const decorationItems: InventoryDockItem[] = [];
    for (const decorationType of decorationTypes) {
      for (const size of decorationSizeOrder) {
        const count = this.getDecorationInventory(decorationType.id, size);
        if (count > 0) {
          decorationItems.push({
            kind: "decoration",
            id: decorationType.id,
            size,
            label: `${decorationType.name} ${decorationSizes[size].label}`,
            count,
            icon: `/assets/decorations/${decorationType.id}.png`
          });
        }
      }
    }
    const helperItems: InventoryDockItem[] = helperCreatureTypes
      .filter((creatureType) => this.getCreatureInventory(creatureType.id) > 0)
      .map((creatureType) => ({
        kind: "helper",
        id: creatureType.id,
        label: creatureType.name,
        count: this.getCreatureInventory(creatureType.id),
        icon: creatureType.id === "feeder-snail" ? "/assets/helpers/feeder-snail.png" : `/assets/helpers/${creatureType.id}.png`
      }));
    const utilityItems: InventoryDockItem[] = this.hasCoinMagnet()
      ? [{
        kind: "utility",
        id: "coin-magnet",
        label: "Magnet",
        count: this.coinMagnetRemainingMinutes(),
        icon: coinMagnetIconPath
      }]
      : [];

    return [...foodItems, ...utilityItems, ...fishItems, ...decorationItems, ...helperItems];
  }

  private inventoryDockItemKey(item: InventoryDockItem): string {
    if (item.kind === "decoration") {
      return `${item.kind}:${item.id}:${item.size}`;
    }

    return `${item.kind}:${item.id}`;
  }

  private createHtmlInventoryDockButton(item: InventoryDockItem): HTMLButtonElement {
    const button = document.createElement("button");
    const badgeLabel = item.kind === "food" ? item.badgeLabel ?? this.foodBadgeLabel(item.count) : this.foodBadgeLabel(item.count);
    button.type = "button";
    button.className = "aq-food-button";
    button.setAttribute("aria-label", `${item.label} x${badgeLabel}`);
    this.attachTouchFeedback(button);

    const bubble = document.createElement("span");
    bubble.className = "aq-food-button-bubble";
    const icon = document.createElement("img");
    icon.src = item.icon;
    icon.alt = "";
    icon.draggable = false;
    if (item.kind === "food") {
      icon.classList.add("aq-food-icon", `aq-food-icon-${item.id}`);
      icon.style.filter = foodCssFilterFor(item.id);
    }
    bubble.append(icon);

    const count = document.createElement("span");
    count.className = "aq-food-button-count";
    if (item.kind === "utility" && item.id === "coin-magnet") {
      count.classList.add("is-timer");
      count.textContent = `${formatNumber(item.count)}m`;
    } else {
      count.textContent = badgeLabel;
    }
    bubble.append(count);

    const label = document.createElement("span");
    label.className = "aq-food-button-label";
    label.textContent = item.label;

    button.append(bubble, label);
    button.addEventListener("pointerdown", (event) => this.startHtmlInventoryDrag(event, item));
    return button;
  }

  private startHtmlInventoryDrag(event: PointerEvent, item: InventoryDockItem): void {
    event.preventDefault();
    event.stopPropagation();
    const source = event.currentTarget;
    if (!(source instanceof HTMLElement)) {
      return;
    }

    this.cancelHtmlFoodDrag();
    this.htmlDockDragging = true;
    this.capturePointerSafely(source, event.pointerId);
    source.classList.add("is-touching");
    if (item.kind === "food" && this.isDroppableFood(item.id)) {
      this.selectedFoodTypeId = item.id;
    }

    const ghost = document.createElement("div");
    ghost.className = "aq-food-drag-ghost";
    const icon = document.createElement("img");
    icon.src = item.icon;
    icon.alt = "";
    icon.draggable = false;
    if (item.kind === "food") {
      icon.classList.add("aq-food-icon", `aq-food-icon-${item.id}`);
      icon.style.filter = foodCssFilterFor(item.id);
    }
    ghost.append(icon);
    document.body.appendChild(ghost);
    this.htmlFoodDragGhost = ghost;
    this.moveHtmlFoodDragGhost(event.clientX, event.clientY);

    let ended = false;
    let lastClientX = event.clientX;
    let lastClientY = event.clientY;
    const cleanup = () => {
      if (ended) {
        return;
      }
      ended = true;
      source.removeEventListener("pointermove", onMove);
      source.removeEventListener("pointerup", onDrop);
      source.removeEventListener("pointercancel", onCancel);
      source.removeEventListener("lostpointercapture", onLostCapture);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onDrop);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onCancel);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      this.releasePointerSafely(source, event.pointerId);
      source.classList.remove("is-touching");
      this.destroyHtmlFoodDragGhost();
      this.htmlDockDragging = false;
      if (this.htmlFoodDragCleanup === cleanup) {
        this.htmlFoodDragCleanup = undefined;
      }
    };
    const finishDrop = (clientX: number, clientY: number) => {
      cleanup();

      const point = this.clientPointToDesignPoint(clientX, clientY);
      if (!point || !tankViewportBounds.contains(point.x, point.y)) {
        return;
      }
      const tankPoint = this.screenToTankPoint(point.x, point.y);
      this.placeDockItemAt(item, tankPoint.x, tankPoint.y);
    };
    const onMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      lastClientX = moveEvent.clientX;
      lastClientY = moveEvent.clientY;
      this.moveHtmlFoodDragGhost(moveEvent.clientX, moveEvent.clientY);
      if (item.kind === "utility" && item.id === "coin-magnet") {
        this.useCoinMagnetAtClientPoint(moveEvent.clientX, moveEvent.clientY, false);
      }
    };
    const onDrop = (endEvent: PointerEvent) => {
      endEvent.preventDefault();
      lastClientX = endEvent.clientX;
      lastClientY = endEvent.clientY;
      finishDrop(lastClientX, lastClientY);
    };
    const onCancel = (cancelEvent?: Event) => {
      cancelEvent?.preventDefault();
      cleanup();
    };
    const onLostCapture = (captureEvent: PointerEvent) => {
      if (captureEvent.buttons === 0) {
        finishDrop(lastClientX, lastClientY);
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        cleanup();
      }
    };

    this.htmlFoodDragCleanup = cleanup;
    source.addEventListener("pointermove", onMove);
    source.addEventListener("pointerup", onDrop);
    source.addEventListener("pointercancel", onCancel);
    source.addEventListener("lostpointercapture", onLostCapture);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onDrop);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onCancel);
    document.addEventListener("visibilitychange", onVisibilityChange);
  }

  private capturePointerSafely(element: HTMLElement, pointerId: number): void {
    try {
      if (!element.hasPointerCapture(pointerId)) {
        element.setPointerCapture(pointerId);
      }
    } catch {
      // Some browsers reject capture if the pointer is already ending or the node moved.
    }
  }

  private releasePointerSafely(element: HTMLElement, pointerId: number): void {
    try {
      if (element.hasPointerCapture(pointerId)) {
        element.releasePointerCapture(pointerId);
      }
    } catch {
      // Cleanup must continue even if capture was already lost.
    }
  }

  private placeDockItemAt(item: InventoryDockItem, x: number, y: number): void {
    if (item.kind === "food") {
      this.dropFoodAt(item.id, x, y);
      return;
    }

    if (item.kind === "fish") {
      const fishType = fishTypes.find((candidate) => candidate.id === item.id);
      if (fishType) {
        this.placeFishWithCompatibility(fishType, x, y);
      }
      return;
    }

    if (item.kind === "decoration") {
      const decorationType = decorationTypes.find((candidate) => candidate.id === item.id);
      if (decorationType) {
        this.placeDecorationFromInventory(decorationType, item.size, x, y);
      }
      return;
    }

    if (item.kind === "utility") {
      if (item.id === "coin-magnet") {
        this.useCoinMagnetAt(x, y);
      }
      return;
    }

    const creatureType = helperCreatureTypes.find((candidate) => candidate.id === item.id);
    if (creatureType) {
      this.dropHelperCreatureFromInventory(creatureType, x, y);
    }
  }

  private attachTouchFeedback(element: HTMLElement, releaseOnLeave = false): void {
    const press = () => element.classList.add("is-touching");
    const release = () => element.classList.remove("is-touching");
    element.addEventListener("pointerdown", press);
    element.addEventListener("pointerup", release);
    element.addEventListener("pointercancel", release);
    if (releaseOnLeave) {
      element.addEventListener("pointerleave", release);
    }
    element.addEventListener("blur", release);
  }

  private moveHtmlFoodDragGhost(clientX: number, clientY: number): void {
    if (!this.htmlFoodDragGhost) {
      return;
    }
    this.htmlFoodDragGhost.style.transform = `translate(${clientX}px, ${clientY}px) translate(-50%, -50%)`;
  }

  private destroyHtmlFoodDragGhost(): void {
    this.htmlFoodDragGhost?.remove();
    this.htmlFoodDragGhost = undefined;
  }

  private cancelHtmlFoodDrag(): void {
    const cleanup = this.htmlFoodDragCleanup;
    this.htmlFoodDragCleanup = undefined;
    cleanup?.();
    this.destroyHtmlFoodDragGhost();
  }

  private clientPointToDesignPoint(clientX: number, clientY: number): Phaser.Math.Vector2 | undefined {
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0 || clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
      return undefined;
    }
    return new Phaser.Math.Vector2(
      ((clientX - rect.left) / rect.width) * gameWidth,
      ((clientY - rect.top) / rect.height) * gameHeight
    );
  }

  private destroyTankMenuOverlay(): void {
    this.tankMenuOverlay?.remove();
    this.tankMenuOverlay = undefined;
  }

  private destroyHtmlGameInterface(): void {
    this.nativeCanvasInputCleanup?.();
    this.nativeCanvasInputCleanup = undefined;
    this.cancelHtmlFoodDrag();
    this.closeModal();
    this.destroyMakeupDraft();
    this.makeupOverlay?.remove();
    this.makeupOverlay = undefined;
    this.gameHudOverlay?.remove();
    this.gameHudOverlay = undefined;
    this.htmlFoodDock?.remove();
    this.htmlFoodDock = undefined;
    this.htmlPageOverlay?.remove();
    this.htmlPageOverlay = undefined;
    this.coinComboOverlay?.remove();
    this.coinComboOverlay = undefined;
    this.destroyPrizeSpinContainer();
    this.destroyTankMenuOverlay();
    this.storeOverlay?.destroy();
    this.storeOverlay = undefined;
  }

  private createFoodDock(): void {
    this.clearFoodDragGhosts();
    this.foodButtons.forEach((button) => button.destroy(true));
    this.foodButtons = [];
    this.syncHtmlFoodDock();

    return;
  }

  private clearFoodDragGhosts(): void {
    this.foodDragGhosts.forEach((dragGhost) => dragGhost.destroy());
    this.foodDragGhosts.clear();
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

    if (screen === "store") {
      this.hideHtmlPageOverlay();
      this.openStoreOverlay();
      this.refreshUi(false);
      return;
    }

    this.storeOverlay?.hide();
    this.renderTabControls();
    this.refreshUi(false);
  }

  private closePage(): void {
    this.prizeSpinInProgress = false;
    this.destroyPrizeSpinContainer();
    if (this.activeScreen === "makeup") {
      this.destroyMakeupDraft();
      this.makeupOverlay?.classList.add("hidden");
      this.makeupDraggedDecoration = undefined;
    }
    this.activeScreen = "tank";
    this.storeOverlay?.hide();
    this.hideHtmlPageOverlay();
    this.createScreenNav();
    this.createFoodDock();
    this.syncMakeupPresentation();
    this.refreshUi(false);
  }

  private openStoreOverlay(): void {
    this.hideHtmlPageOverlay();
    this.storeOverlay ??= new StoreOverlay(
      () => this.storeOverlayState(),
      {
        close: () => this.closePage(),
        buyFish: (fishType) => this.buyFish(fishType),
        buyFood: (foodType, quantity) => this.buyFood(foodType, quantity),
        buyHelper: (creatureType) => this.buyHelperCreature(creatureType),
        buyTank: (level) => this.buyTank(level),
        switchTank: (level) => this.switchTank(level),
        buyTankCosmetic: (category, id) => this.buyTankCosmeticFromStore(category, id),
        switchTankCosmetic: (category, id) => this.useTankCosmeticFromStore(category, id),
        buyTankDecoration: (decorationId, size) => this.buyDecorationFromStore(decorationId, size),
        selectTankDecoration: (decorationId, size) => this.selectDecoration(decorationId, size),
        buyTankUtility: (utilityId) => this.buyTankUtility(utilityId)
      }
    );
    this.storeOverlay.show();
  }

  private updateStoreOverlayTimer(deltaSeconds: number): void {
    if (this.activeScreen !== "store") {
      this.storeRefreshElapsed = 0;
      this.storeCooldownStateKey = "";
      return;
    }

    this.storeRefreshElapsed += deltaSeconds;
    if (this.storeRefreshElapsed < 1) {
      return;
    }
    this.storeRefreshElapsed = 0;

    const ageBoostAvailable = this.canBuyGrowthTonicThisHour();
    const fishAvailable = this.canBuyAnotherFishThisHour();
    const cooldownKey = [
      ageBoostAvailable,
      fishAvailable,
      this.recentFishPurchaseCount(),
      this.hourlyFishPurchaseLimit()
    ].join(":");
    if (cooldownKey !== this.storeCooldownStateKey) {
      this.storeCooldownStateKey = cooldownKey;
      this.storeOverlay?.refresh();
    }
  }

  private updateTimedUtilities(): void {
    const coinMagnetActive = this.hasCoinMagnet();
    const remainingMinutes = coinMagnetActive ? this.coinMagnetRemainingMinutes() : 0;
    if (coinMagnetActive === this.coinMagnetWasActive && remainingMinutes === this.coinMagnetDisplayedMinutes) {
      return;
    }

    const wasActive = this.coinMagnetWasActive;
    this.coinMagnetWasActive = coinMagnetActive;
    this.coinMagnetDisplayedMinutes = remainingMinutes;
    if (wasActive && !coinMagnetActive) {
      this.decorationInventory.delete(coinMagnetInventoryKey);
      this.magnetCollectingCoins.clear();
      this.floatText("Coin Magnet expired", toastX, toastY, "#d7f4ff");
      this.saveNow();
    }
    this.createFoodDock();
    this.storeOverlay?.refresh();
  }

  private storeOverlayState(): StoreOverlayState {
    return buildStoreOverlayState({
      wallet: { ...this.wallet },
      wealth: this.calculateTankNetWorth(),
      activeTankName: this.getTankName(this.tankLevel),
      activeTankLevel: this.tankDisplayLevel(),
      activeTankSlot: this.tankLevel,
      developerGodMode: this.developerGodMode,
      fishPurchasesInWindow: this.recentFishPurchaseCount(),
      fishPurchaseHourlyLimit: this.hourlyFishPurchaseLimit(),
      fishPurchaseRestockLabel: this.fishPurchaseRestockLabel(),
      ageBoostPurchaseAvailable: this.canBuyGrowthTonicThisHour(),
      ageBoostRestockLabel: this.growthTonicPurchaseRestockLabel(),
      fishCount: this.activeFish().length,
      fishCapacity: this.maxFishCapacityForLevel(),
      maxOwnedTanks,
      maxPurchasableTankLevel,
      tankStarterWallets: storeTankStarterWallets,
      getFishOwned: (fishTypeId) =>
        this.fish.filter((currentFish) => currentFish.type.id === fishTypeId).length +
        this.getFishInventory(fishTypeId),
      getFoodOwned: (foodType) => this.foodInventoryDisplayCount(foodType),
      getHelperOwned: (helperTypeId) =>
        this.helperCreatures.filter((helper) => helper.type.id === helperTypeId).length +
        this.getCreatureInventory(helperTypeId),
      getTankName: (level) => storeTankNames[level] ?? this.getTankName(level),
      tankDisplayLevel: (level) => this.tankDisplayLevel(level),
      hasTankLevel: (level) => this.hasTankLevel(level),
      fishInTankCount: (level) => this.fishInTank(level).length,
      helpersInTankCount: (level) => this.helpersInTank(level).length,
      maxFishCapacityForLevel: (level) => this.maxFishCapacityForLevel(level),
      calculateTankNetWorth: (level) => this.calculateTankNetWorth(level),
      tankPriceForLevel: (level) => this.tankPriceForLevel(level),
      tankCosmetics: {
        background: this.tankCosmetics("background"),
        seabed: this.tankCosmetics("seabed")
      },
      ownsTankCosmetic: (asset) => this.ownsTankCosmetic(asset),
      selectedTankCosmeticId: (category) => this.selectedTankCosmeticId(category),
      tankCosmeticImageUrl: (asset) => this.tankCosmeticImageUrl(asset),
      colorToHex: (color) => this.hexColor(color),
      tankCosmeticBlueTintIntensity: (category, id) => this.tankCosmeticBlueTintIntensity(category, id),
      decorationSizeOrder,
      decorationSizeLabel: (size) => decorationSizes[size].label,
      getDecorationInventory: (decorationTypeId, size) => this.getDecorationInventory(decorationTypeId, size),
      decorationVariantPrice: (decorationType, size) => this.decorationVariantPrice(decorationType, size),
      utilityDefinitions: [
        {
          id: "food-dispenser",
          name: "Food Dispenser",
          description: "Mounts on the tank edge and automatically dispenses owned fish food.",
          icon: foodDispenserAssetPath,
          owned: this.hasFoodDispenser(),
          price: foodDispenserPrice
        },
        {
          id: "coin-magnet",
          name: "Coin Magnet",
          description: "Drag from the dock and release near coins to pull nearby drops into your wallet.",
          icon: coinMagnetIconPath,
          owned: this.hasCoinMagnet(),
          price: coinMagnetPrice
        }
      ]
    });
  }

  private renderTabControls(): void {
    if (this.activeScreen === "tank" || this.activeScreen === "store") {
      this.hideHtmlPageOverlay();
      return;
    }
    if (this.activeScreen === "prize" || this.activeScreen === "makeup") {
      this.hideHtmlPageOverlay();
      return;
    }

    this.syncHtmlPageOverlay();
  }

  private hideHtmlPageOverlay(): void {
    this.htmlPageOverlay?.classList.add("hidden");
    this.htmlPageOverlay?.replaceChildren();
  }

  private createHtmlPageOverlay(): HTMLDivElement {
    return createPageOverlayRoot();
  }

  private syncHtmlPageOverlay(): void {
    if (this.activeScreen === "tank" || this.activeScreen === "store" || this.activeScreen === "prize" || this.activeScreen === "makeup") {
      this.hideHtmlPageOverlay();
      return;
    }

    this.htmlPageOverlay ??= this.createHtmlPageOverlay();
    const previousKey = this.htmlPageOverlayRenderKey;
    this.htmlPageOverlayScrollTop = capturePageScrollTop(this.htmlPageOverlay);
    const nextKey = `${this.activeScreen}:${this.tankMenuTab}:${this.tankMenuPage}:${this.inventoryTab}`;
    this.htmlPageOverlayRenderKey = nextKey;
    this.htmlPageOverlay.classList.remove("hidden");
    this.htmlPageOverlay.replaceChildren(this.createHtmlPage());
    if (previousKey === nextKey && this.htmlPageOverlayScrollTop > 0) {
      restorePageScrollTop(this.htmlPageOverlay, this.htmlPageOverlayScrollTop);
    }
  }

  private createHtmlPage(): HTMLElement {
    const meta = this.pageScreenMeta();
    const { page, content } = createPageShell(meta, this.htmlButton("X CLOSE", "aq-page-close", () => this.closePage()));
    if (this.activeScreen === "tanks") {
      this.appendTanksPage(content);
    } else if (this.activeScreen === "album") {
      this.appendAlbumPage(content);
    } else if (this.activeScreen === "goals") {
      this.appendGoalsPage(content);
    } else {
      this.appendSettingsPage(content);
    }

    return page;
  }

  private pageScreenMeta(): PageScreenMeta {
    return buildPageScreenMeta({
      screen: this.activeScreen as PageOverlayScreen,
      fishCount: formatNumber(this.activeFish().length),
      helperCount: formatNumber(this.activeHelperCreatures().length),
      ownedTankCount: formatNumber(this.sortedOwnedTankLevels().length),
      maxTankCount: formatNumber(maxOwnedTanks),
      activeTankName: this.getTankName(this.tankLevel),
      dailyGoalsDate: this.dailyGoals.date
    });
  }

  private appendTanksPage(content: HTMLElement): void {
    const shell = htmlElement("div", "flex h-full min-h-0 flex-col");
    shell.append(this.createTankMenuTabs());

    const items = this.tankMenuItems();
    const pageSize = 4;
    const maxPage = Math.max(1, Math.ceil(items.length / pageSize));
    this.tankMenuPage = Phaser.Math.Clamp(this.tankMenuPage, 1, maxPage);
    const pageItems = items.slice((this.tankMenuPage - 1) * pageSize, this.tankMenuPage * pageSize);

    const grid = htmlElement("div", "grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 overflow-hidden");
    if (pageItems.length === 0) {
      grid.append(this.tankMenuEmptyCard());
    } else {
      pageItems.forEach((item) => grid.append(item));
    }

    const pager = createPagePager(
      this.tankMenuPage,
      maxPage,
      this.pageButtonFactory(),
      formatNumber,
      (direction) => this.changeTankMenuPage(direction)
    );

    shell.append(grid, pager);
    content.append(shell);
  }

  private createTankMenuTabs(): HTMLElement {
    const tabs: Array<{ tab: TankMenuTab; label: string; icon: string }> = [
      { tab: "tanks", label: "Tanks", icon: "/assets/ui/shop/icon_category_tanks.png" },
      { tab: "background", label: "BG", icon: "/assets/ui/shop/rare_star_badge.png" },
      { tab: "seabed", label: "Sand", icon: "/assets/ui/shop/common_star_badge.png" },
      { tab: "decor", label: "Decor", icon: "/assets/decorations/rock.png" },
      { tab: "utility", label: "Util", icon: foodDispenserAssetPath }
    ];
    return createPageTabRow(tabs, this.tankMenuTab, this.pageButtonFactory(), (tab) => {
      this.tankMenuTab = tab;
      this.tankMenuPage = 1;
      this.syncHtmlPageOverlay();
    });
  }

  private tankMenuItems(): HTMLElement[] {
    if (this.tankMenuTab === "tanks") {
      return this.sortedOwnedTankLevels().map((level) => this.createTankHtmlCard(level));
    }
    if (this.tankMenuTab === "background" || this.tankMenuTab === "seabed") {
      return this.tankCosmetics(this.tankMenuTab)
        .filter((asset) => this.ownsTankCosmetic(asset))
        .map((asset) => this.createCosmeticHtmlCard(asset));
    }
    if (this.tankMenuTab === "decor") {
      return decorationTypes
        .filter((decorationType) => decorationSizeOrder.some((size) => this.getOwnedDecorationCount(decorationType.id, size) > 0))
        .map((decorationType) => this.createDecorationHtmlCard(decorationType));
    }
    return this.hasFoodDispenser() ? [this.createFoodDispenserHtmlCard()] : [];
  }

  private changeTankMenuPage(direction: number): void {
    this.tankMenuPage = Math.max(1, this.tankMenuPage + direction);
    this.syncHtmlPageOverlay();
  }

  private tankMenuEmptyCard(): HTMLElement {
    const copyByTab: Record<TankMenuTab, [string, string]> = {
      tanks: ["No tanks owned", "Buy tank types from Shop."],
      background: ["No backgrounds owned", "Buy tank backgrounds from Shop."],
      seabed: ["No seabeds owned", "Buy tank seabeds from Shop."],
      decor: ["No decorations owned", "Buy tank decorations from Shop."],
      utility: ["No utilities owned", "Buy tank utilities from Shop."]
    };
    const [title, detail] = copyByTab[this.tankMenuTab];
    return createPageEmptyCard(title, detail);
  }

  private createTankHtmlCard(level: number): HTMLElement {
    const owned = this.hasTankLevel(level);
    const card = htmlElement("article", `aq-tank-grid-card ${level === this.tankLevel ? "is-active" : ""}`);
    this.attachTouchFeedback(card);
    if (owned && level !== this.tankLevel) {
      card.addEventListener("click", () => this.switchTank(level));
    }
    const imageUrl = this.tankCardBackgroundUrl(level);
    if (imageUrl) {
      card.append(htmlImage(imageUrl, "", "aq-tank-grid-image cover"));
    } else {
      card.style.setProperty("--tank-accent", this.hexColor(this.tankAccentColor(level)));
    }
    const overlay = htmlElement("div", "aq-tank-grid-overlay");
    overlay.append(
      htmlElement("span", "aq-page-tank-level", [`Level ${formatNumber(this.tankDisplayLevel(level))}`]),
      htmlElement("h3", "aq-page-card-title", [this.getTankName(level)]),
      htmlElement("p", "aq-page-card-meta", [`${owned ? "Owned" : "Locked"} | ${formatNumber(this.fishInTank(level).length)}/${formatNumber(this.maxFishCapacityForLevel(level))} fish`]),
      htmlElement("p", "aq-page-card-copy", [`Worth ${formatNumber(this.calculateTankNetWorth(level))} | ${this.tankSummary(level)}`])
    );

    if (owned) {
      const actions = htmlElement("div", "aq-page-actions compact");
      if (level === this.tankLevel) {
        actions.append(
          this.htmlButton("Background", "aq-page-button aq-page-button-good aq-tank-background-button", () => this.openMakeupMode(level))
        );
        overlay.append(actions);
      } else {
        overlay.append(htmlElement("p", "aq-page-card-meta", ["Tap card to activate"]));
      }
    } else {
      overlay.append(htmlElement("p", "aq-page-card-meta", ["Available in Shop"]));
    }
    card.append(overlay);
    return card;
  }

  private openMakeupMode(level = this.tankLevel): void {
    if (level !== this.tankLevel) {
      this.floatText("Switch tank first", toastX, toastY, "#ffb0a8");
      return;
    }

    this.closeModal();
    this.storeOverlay?.hide();
    this.hideHtmlPageOverlay();
    this.placementMode = { kind: "none" };
    this.makeupDraft = this.createMakeupDraft();
    this.activeScreen = "makeup";
    this.layoutTankBackground();
    this.layoutTankFloor();
    this.syncMakeupPresentation();
    this.syncHtmlGameInterface();
    this.renderTabControls();
    this.syncMakeupOverlay();
  }

  private createMakeupDraft(): MakeupDraft {
    const backgroundIndex = Math.max(0, this.tankCosmetics("background").findIndex((asset) => asset.id === this.selectedTankCosmeticId("background")));
    const seabedIndex = Math.max(0, this.tankCosmetics("seabed").findIndex((asset) => asset.id === this.selectedTankCosmeticId("seabed")));
    const draft: MakeupDraft = {
      backgroundIndex,
      seabedIndex,
      backgroundTintById: new Map(this.tankCosmeticBlueTintInventory("background")),
      seabedTintById: new Map(this.tankCosmeticBlueTintInventory("seabed")),
      selectedDecorationTypeIndex: 0,
      selectedSize: "m",
      decorations: []
    };
    const activeDecorations = [...this.activeDecorations()].sort((first, second) => first.image.depth - second.image.depth);
    for (const [index, placedDecoration] of activeDecorations.entries()) {
      const decorationType = decorationTypes.find((item) => item.id === placedDecoration.typeId);
      if (!decorationType) {
        continue;
      }
      draft.decorations.push(
        this.createMakeupDecorationDraft(
          decorationType,
          this.sanitizeDecorationSize(placedDecoration.size),
          placedDecoration.image.x,
          placedDecoration.image.y,
          index
        )
      );
    }
    this.syncMakeupDecorationDepths(draft);
    return draft;
  }

  private syncMakeupOverlay(): void {
    if (this.activeScreen !== "makeup" || !this.makeupDraft) {
      this.makeupOverlay?.classList.add("hidden");
      return;
    }

    this.makeupOverlay ??= this.createMakeupOverlay();
    this.makeupOverlay.classList.remove("hidden");
    this.makeupOverlay.replaceChildren(this.createMakeupPanel());
  }

  private createMakeupOverlay(): HTMLDivElement {
    const overlay = document.createElement("div");
    overlay.className = "aq-makeup-overlay";
    document.body.appendChild(overlay);
    return overlay;
  }

  private createMakeupPanel(): HTMLElement {
    const draft = this.makeupDraft!;
    const decorationType = decorationTypes[draft.selectedDecorationTypeIndex] ?? decorationTypes[0];
    const cost = this.makeupTotalCost();
    const selectedDecorationIndex = draft.selectedDecorationIndex;
    const selectedDecoration = selectedDecorationIndex !== undefined ? draft.decorations[selectedDecorationIndex] : undefined;
    const panel = htmlElement("section", "aq-makeup-panel");
    panel.append(
      htmlElement("div", "aq-makeup-header", [
        htmlElement("div", "aq-makeup-title-block", [
          htmlElement("h2", "aq-makeup-title", ["Makeup"]),
          this.makeupCostElement(cost)
        ]),
        this.makeupButton("Apply", "good", () => this.applyMakeupLook()),
        this.makeupButton("Close", "danger", () => this.closeMakeupMode(false))
      ]),
      this.makeupPickerRow("Background", "background", () => this.cycleMakeupCosmetic("background", -1), () => this.cycleMakeupCosmetic("background", 1)),
      this.makeupPickerRow("Sand", "seabed", () => this.cycleMakeupCosmetic("seabed", -1), () => this.cycleMakeupCosmetic("seabed", 1)),
      htmlElement("div", `aq-makeup-decor-tools ${selectedDecoration ? "has-selection" : ""}`, [
        htmlElement("div", "aq-makeup-decor-row", [
          this.makeupButton("<", "muted", () => this.cycleMakeupDecoration(-1)),
          htmlImage(`/assets/decorations/${decorationType?.id ?? "plant"}.png`, "", "aq-makeup-decor-preview"),
          htmlElement("div", "aq-makeup-decor-name", [
            htmlElement("span", "aq-makeup-row-label", ["Decor"]),
            htmlElement("strong", "", [decorationType?.name ?? "Decor"])
          ]),
          this.makeupButton(">", "muted", () => this.cycleMakeupDecoration(1))
        ]),
        this.makeupButton("Add", "good", () => this.addMakeupDecoration()),
        htmlElement("div", "aq-makeup-size-row", [
          ...decorationSizeOrder.map((size) =>
            this.makeupButton(
              decorationSizes[size].label,
              draft.selectedSize === size ? "selected" : "muted",
              () => this.setMakeupDecorationSize(size)
            )
          )
        ]),
        htmlElement("div", "aq-makeup-depth-row", [
          this.makeupButton("Back", "muted", () => this.moveSelectedMakeupDecorationDepth(-1), !selectedDecoration || selectedDecorationIndex === 0),
          this.makeupButton("Front", "muted", () => this.moveSelectedMakeupDecorationDepth(1), !selectedDecoration || selectedDecorationIndex === draft.decorations.length - 1),
          this.makeupButton("Remove", "danger", () => this.removeSelectedMakeupDecoration(), !selectedDecoration)
        ])
      ])
    );
    return panel;
  }

  private makeupPickerRow(label: string, category: TankCosmeticCategory, previous: () => void, next: () => void): HTMLElement {
    const selectedAsset = this.makeupSelectedCosmetic(category);
    return htmlElement("div", `aq-makeup-picker-row ${label.toLowerCase()}`, [
      this.makeupButton("<", "muted", previous),
      htmlElement("div", "aq-makeup-picker-copy", [
        htmlElement("span", "aq-makeup-row-label", [label]),
        htmlElement("div", "aq-makeup-cosmetic-title-row", [
          htmlElement("strong", "", [selectedAsset.name]),
          this.makeupCosmeticStatusElement(selectedAsset)
        ]),
        this.makeupTintControl(category)
      ]),
      this.makeupButton(">", "muted", next)
    ]);
  }

  private makeupCosmeticStatusElement(asset: TankCosmetic): HTMLElement {
    if (this.ownsTankCosmetic(asset)) {
      return htmlElement("span", "aq-makeup-cosmetic-status owned", ["Owned"]);
    }

    const status = htmlElement("span", "aq-makeup-cosmetic-status price");
    for (const [coinType, amount] of priceComponents(asset.price)) {
      status.append(
        htmlElement("span", "aq-makeup-cost-chip", [
          htmlImage(coinAssetPathByType[coinType], coinType, "aq-makeup-cost-icon"),
          htmlElement("strong", "", [formatNumber(amount)])
        ])
      );
    }
    return status;
  }

  private makeupTintControl(category: TankCosmeticCategory): HTMLElement {
    const selectedAsset = this.makeupSelectedCosmetic(category);
    const value = Math.round(this.renderTankCosmeticBlueTintIntensity(category, selectedAsset.id));
    const valueText = htmlElement("span", "", [`${formatNumber(value)}%`]);
    const input = document.createElement("input");
    input.className = "aq-makeup-tint-range";
    input.type = "range";
    input.min = "0";
    input.max = "100";
    input.step = "1";
    input.value = String(value);
    input.addEventListener("pointerdown", (event) => event.stopPropagation());
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("input", (event) => {
      event.stopPropagation();
      const nextValue = Number(input.value);
      valueText.textContent = `${formatNumber(nextValue)}%`;
      this.setMakeupBlueTint(category, nextValue);
    });
    return htmlElement("label", "aq-makeup-tint-control", [
      htmlElement("span", "", ["Tint"]),
      input,
      valueText
    ]);
  }

  private makeupButton(label: string, tone: string, onClick: () => void, disabled = false): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `aq-makeup-button ${tone}`;
    button.disabled = disabled;
    button.textContent = label;
    this.attachTouchFeedback(button, true);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!button.disabled) {
        onClick();
      }
    });
    return button;
  }

  private makeupSelectedCosmetic(category: TankCosmeticCategory): TankCosmetic {
    const cosmetics = this.tankCosmetics(category);
    const index = category === "background" ? this.makeupDraft?.backgroundIndex ?? 0 : this.makeupDraft?.seabedIndex ?? 0;
    return cosmetics[index] ?? cosmetics[0]!;
  }

  private cycleMakeupCosmetic(category: TankCosmeticCategory, direction: number): void {
    if (!this.makeupDraft) {
      return;
    }

    const cosmetics = this.tankCosmetics(category);
    if (cosmetics.length === 0) {
      return;
    }

    if (category === "background") {
      this.makeupDraft.backgroundIndex = (this.makeupDraft.backgroundIndex + direction + cosmetics.length) % cosmetics.length;
      this.layoutTankBackground();
    } else {
      this.makeupDraft.seabedIndex = (this.makeupDraft.seabedIndex + direction + cosmetics.length) % cosmetics.length;
      this.layoutTankFloor();
    }
    this.syncMakeupOverlay();
  }

  private setMakeupBlueTint(category: TankCosmeticCategory, intensity: number): void {
    if (!this.makeupDraft) {
      return;
    }

    const selectedAsset = this.makeupSelectedCosmetic(category);
    const normalizedIntensity = Math.round(Phaser.Math.Clamp(intensity, 0, 100));
    const tintMap = category === "background" ? this.makeupDraft.backgroundTintById : this.makeupDraft.seabedTintById;
    if (normalizedIntensity > 0) {
      tintMap.set(selectedAsset.id, normalizedIntensity);
    } else {
      tintMap.delete(selectedAsset.id);
    }

    if (category === "background") {
      this.layoutTankBackground();
    } else {
      this.layoutTankFloor();
    }
  }

  private cycleMakeupDecoration(direction: number): void {
    if (!this.makeupDraft || decorationTypes.length === 0) {
      return;
    }

    this.makeupDraft.selectedDecorationTypeIndex = (this.makeupDraft.selectedDecorationTypeIndex + direction + decorationTypes.length) % decorationTypes.length;
    this.syncMakeupOverlay();
  }

  private setMakeupDecorationSize(size: DecorationSize): void {
    if (!this.makeupDraft) {
      return;
    }

    this.makeupDraft.selectedSize = size;
    const selectedDecoration = this.makeupDraft.selectedDecorationIndex !== undefined ? this.makeupDraft.decorations[this.makeupDraft.selectedDecorationIndex] : undefined;
    if (selectedDecoration) {
      selectedDecoration.size = size;
      const decorationType = decorationTypes.find((item) => item.id === selectedDecoration.typeId);
      if (decorationType) {
        this.fitDecorationDisplay(selectedDecoration.image, decorationType, size);
      }
    }
    this.syncMakeupOverlay();
  }

  private addMakeupDecoration(): void {
    if (!this.makeupDraft || decorationTypes.length === 0) {
      return;
    }

    const decorationType = decorationTypes[this.makeupDraft.selectedDecorationTypeIndex] ?? decorationTypes[0];
    if (!decorationType) {
      return;
    }
    const draftDecoration = this.createMakeupDecorationDraft(
      decorationType,
      this.makeupDraft.selectedSize,
      tankBounds.centerX,
      tankBounds.bottom - 72,
      this.makeupDraft.decorations.length
    );
    this.makeupDraft.decorations.push(draftDecoration);
    this.makeupDraft.selectedDecorationIndex = this.makeupDraft.decorations.length - 1;
    this.syncMakeupDecorationDepths();
    this.syncMakeupOverlay();
  }

  private createMakeupDecorationDraft(decoration: DecorationType, size: DecorationSize, x: number, y: number, depth = 0): MakeupDecorationDraft {
    const image = this.add.image(x, y, decoration.texture).setDepth(this.makeupDecorationDisplayDepth(depth)).setAlpha(0.9);
    this.fitDecorationDisplay(image, decoration, size);
    image.setInteractive({ useHandCursor: true });
    this.tankLayer.add(image);
    const draft: MakeupDecorationDraft = { typeId: decoration.id, size, x, y, depth, image };
    image.on("pointerdown", (pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.selectMakeupDecoration(draft);
      this.makeupDraggedDecoration = draft;
      draft.image.setAlpha(0.72).setDepth(20);
      this.tankLayer.bringToTop(draft.image);
      this.updateMakeupDecorationDrag(pointer);
    });
    return draft;
  }

  private selectMakeupDecoration(decoration: MakeupDecorationDraft): void {
    if (!this.makeupDraft) {
      return;
    }

    const index = this.makeupDraft.decorations.indexOf(decoration);
    if (index >= 0) {
      this.makeupDraft.selectedDecorationIndex = index;
      this.makeupDraft.selectedSize = decoration.size;
      this.syncMakeupOverlay();
    }
  }

  private updateMakeupDecorationDrag(pointer: Phaser.Input.Pointer): void {
    if (this.activeScreen !== "makeup" || !this.makeupDraggedDecoration) {
      return;
    }

    const pointerPoint = this.pointerDesignPoint(pointer);
    const tankPoint = this.screenToTankPoint(pointerPoint.x, pointerPoint.y);
    const decoration = this.makeupDraggedDecoration;
    decoration.x = Phaser.Math.Clamp(tankPoint.x, tankBounds.left + 24, tankBounds.right - 24);
    decoration.y = Phaser.Math.Clamp(tankPoint.y, tankBounds.top + 118, tankBounds.bottom - 30);
    decoration.image.setPosition(decoration.x, decoration.y);
  }

  private endMakeupDecorationDrag(): void {
    if (!this.makeupDraggedDecoration) {
      return;
    }

    this.makeupDraggedDecoration.image.setAlpha(0.9);
    this.makeupDraggedDecoration = undefined;
    this.syncMakeupDecorationDepths();
  }

  private moveSelectedMakeupDecorationDepth(direction: number): void {
    if (!this.makeupDraft || this.makeupDraft.selectedDecorationIndex === undefined) {
      return;
    }

    const currentIndex = this.makeupDraft.selectedDecorationIndex;
    const nextIndex = Phaser.Math.Clamp(currentIndex + direction, 0, this.makeupDraft.decorations.length - 1);
    if (nextIndex === currentIndex) {
      return;
    }

    const [decoration] = this.makeupDraft.decorations.splice(currentIndex, 1);
    if (!decoration) {
      return;
    }
    this.makeupDraft.decorations.splice(nextIndex, 0, decoration);
    this.makeupDraft.selectedDecorationIndex = nextIndex;
    this.syncMakeupDecorationDepths();
    this.syncMakeupOverlay();
  }

  private syncMakeupDecorationDepths(draft = this.makeupDraft): void {
    if (!draft) {
      return;
    }

    draft.decorations.forEach((decoration, index) => {
      decoration.depth = index;
      if (decoration !== this.makeupDraggedDecoration) {
        decoration.image.setDepth(this.makeupDecorationDisplayDepth(index));
      }
      this.tankLayer.bringToTop(decoration.image);
    });
  }

  private makeupDecorationDisplayDepth(index: number): number {
    return 11 + index * 0.05;
  }

  private removeSelectedMakeupDecoration(): void {
    if (!this.makeupDraft || this.makeupDraft.selectedDecorationIndex === undefined) {
      return;
    }

    const [removed] = this.makeupDraft.decorations.splice(this.makeupDraft.selectedDecorationIndex, 1);
    removed?.image.destroy();
    this.makeupDraft.selectedDecorationIndex = undefined;
    this.syncMakeupDecorationDepths();
    this.syncMakeupOverlay();
  }

  private makeupTotalCost(): Price {
    if (!this.makeupDraft) {
      return { coinType: "common", amount: 0 };
    }

    const total = createEmptyWallet();
    const background = this.makeupSelectedCosmetic("background");
    const seabed = this.makeupSelectedCosmetic("seabed");
    if (!this.ownsTankCosmetic(background)) {
      this.addPriceToWallet(total, background.price);
    }
    if (!this.ownsTankCosmetic(seabed)) {
      this.addPriceToWallet(total, seabed.price);
    }

    const decorationCounts = new Map<string, { type: DecorationType; size: DecorationSize; count: number }>();
    for (const decoration of this.makeupDraft.decorations) {
      const decorationType = decorationTypes.find((item) => item.id === decoration.typeId);
      if (!decorationType) {
        continue;
      }
      const key = this.decorationInventoryKey(decoration.typeId, decoration.size);
      const current = decorationCounts.get(key) ?? { type: decorationType, size: decoration.size, count: 0 };
      current.count += 1;
      decorationCounts.set(key, current);
    }

    for (const entry of decorationCounts.values()) {
      const ownedCount = this.getOwnedDecorationCount(entry.type.id, entry.size);
      const purchaseCount = Math.max(0, entry.count - ownedCount);
      if (purchaseCount > 0) {
        this.addPriceToWallet(total, this.decorationVariantPrice(entry.type, entry.size), purchaseCount);
      }
    }

    return this.walletToPrice(total);
  }

  private makeupCostElement(price: Price): HTMLElement {
    if (this.priceWealth(price) <= 0) {
      return htmlElement("div", "aq-makeup-cost", ["Cost Free"]);
    }

    const row = htmlElement("div", "aq-makeup-cost aq-makeup-cost-icons", [htmlElement("span", "", ["Cost"])]);
    for (const [coinType, amount] of priceComponents(price)) {
      row.append(
        htmlElement("span", "aq-makeup-cost-chip", [
          htmlImage(coinAssetPathByType[coinType], coinType, "aq-makeup-cost-icon"),
          htmlElement("strong", "", [formatNumber(amount)])
        ])
      );
    }
    return row;
  }

  private addPriceToWallet(total: Wallet, price: Price, multiplier = 1): void {
    for (const [coinType, amount] of priceComponents(price)) {
      total[coinType] += Math.max(0, Math.floor(amount * multiplier));
    }
  }

  private walletToPrice(wallet: Wallet): Price {
    return {
      coinType: "common",
      amount: Math.max(0, Math.floor(wallet.common)),
      rareAmount: wallet.rare > 0 ? Math.max(0, Math.floor(wallet.rare)) : undefined,
      superRareAmount: wallet.superRare > 0 ? Math.max(0, Math.floor(wallet.superRare)) : undefined
    };
  }

  private applyMakeupLook(): void {
    if (!this.makeupDraft) {
      return;
    }

    const cost = this.makeupTotalCost();
    if (this.priceWealth(cost) > 0 && !this.spendPrice(cost)) {
      return;
    }

    const background = this.makeupSelectedCosmetic("background");
    const seabed = this.makeupSelectedCosmetic("seabed");
    const state = this.ensureTankState(this.tankLevel);
    if (!this.ownsTankCosmetic(background)) {
      this.tankCosmeticInventory("background").set(background.id, 1);
      this.recordDailyQuestAction("buy-background");
    }
    if (!this.ownsTankCosmetic(seabed)) {
      this.tankCosmeticInventory("seabed").set(seabed.id, 1);
      this.recordDailyQuestAction("buy-seabed");
    }
    state.selectedBackgroundId = background.id;
    state.selectedSeabedId = seabed.id;
    this.applyTankCosmeticBlueTint("background", background.id, this.renderTankCosmeticBlueTintIntensity("background", background.id));
    this.applyTankCosmeticBlueTint("seabed", seabed.id, this.renderTankCosmeticBlueTintIntensity("seabed", seabed.id));

    const draftDecorations = [...this.makeupDraft.decorations];
    const reusablePlacedCounts = new Map<string, number>();
    for (const decoration of this.activeDecorations()) {
      const size = this.sanitizeDecorationSize(decoration.size);
      const key = this.decorationInventoryKey(decoration.typeId, size);
      reusablePlacedCounts.set(key, (reusablePlacedCounts.get(key) ?? 0) + 1);
    }
    this.removeAllPlacedDecorationsFromActiveTank();
    this.makeupDraft.decorations = [];
    for (const [index, decoration] of draftDecorations.entries()) {
      const decorationType = decorationTypes.find((item) => item.id === decoration.typeId);
      decoration.image.destroy();
      if (!decorationType) {
        continue;
      }
      const key = this.decorationInventoryKey(decoration.typeId, decoration.size);
      const reusablePlacedCount = reusablePlacedCounts.get(key) ?? 0;
      if (reusablePlacedCount > 0) {
        reusablePlacedCounts.set(key, reusablePlacedCount - 1);
      } else if (this.getDecorationInventory(decoration.typeId, decoration.size) > 0) {
        this.consumeStoredDecoration(decoration.typeId, decoration.size);
      }
      this.addDecorationToTank(decorationType, decoration.x, decoration.y, decoration.size, this.tankLevel, this.tankDecorationDepthFromOrder(index));
      this.recordDailyQuestAction("place-decoration");
    }

    if (draftDecorations.length > 0) {
      this.recordDailyQuestAction("buy-decoration");
    }
    this.floatText("Look applied", toastX, toastY, "#a8ffb0");
    this.closeMakeupMode(true);
    this.saveNow();
  }

  private closeMakeupMode(applied: boolean): void {
    this.destroyMakeupDraft();
    this.makeupOverlay?.classList.add("hidden");
    this.makeupDraggedDecoration = undefined;
    this.activeScreen = "tank";
    this.layoutTankBackground();
    this.layoutTankFloor();
    this.syncMakeupPresentation();
    this.refreshUi(false);
    if (!applied) {
      this.floatText("Makeup closed", toastX, toastY, "#d7f4ff");
    }
  }

  private destroyMakeupDraft(): void {
    for (const decoration of this.makeupDraft?.decorations ?? []) {
      decoration.image.destroy();
    }
    this.makeupDraft = undefined;
  }

  private syncMakeupPresentation(): void {
    const makeupActive = this.activeScreen === "makeup";
    for (const currentFish of this.fish) {
      currentFish.setTankVisible(!makeupActive && currentFish.tankLevel === this.tankLevel);
    }
    for (const helper of this.helperCreatures) {
      helper.setTankVisible(!makeupActive && helper.tankLevel === this.tankLevel);
    }
    for (const food of this.foods) {
      food.sprite.setVisible(!makeupActive);
    }
    for (const drop of this.pendingHelperCreatureDrops) {
      drop.sprite.setVisible(!makeupActive && drop.tankLevel === this.tankLevel);
    }
    for (const coin of this.coinDrops) {
      this.setCoinDropVisible(coin, !makeupActive);
    }
    for (const particle of this.ambientWaterParticles) {
      particle.setVisible(!makeupActive);
    }
    for (const bubble of this.activeAirStoneBubbles) {
      bubble.setVisible(!makeupActive);
    }
    for (const decoration of this.placedDecorations) {
      decoration.image.setVisible(!makeupActive && decoration.tankLevel === this.tankLevel);
    }
    if (makeupActive) {
      this.dirtyTankOverlay?.setVisible(false);
      this.showDecorationTrashTarget(false);
    } else {
      this.refreshFishTankVisibility();
      this.refreshHelperTankVisibility();
      this.refreshDecorationTankVisibility();
      this.updateDirtyTankOverlay();
    }
  }

  private createCosmeticHtmlCard(asset: TankCosmetic): HTMLElement {
    const inventory = this.tankCosmeticInventory(asset.category);
    const owned = (inventory.get(asset.id) ?? 0) > 0;
    const selected = this.selectedTankCosmeticId(asset.category) === asset.id;
    const card = htmlElement("article", `aq-tank-grid-card ${selected ? "is-active" : ""}`);
    this.attachTouchFeedback(card);
    const imageUrl = this.tankCosmeticImageUrl(asset);
    if (imageUrl) {
      card.append(htmlImage(imageUrl, "", "aq-tank-grid-image cover"));
    } else {
      card.style.backgroundColor = this.hexColor(asset.tint);
    }
    card.append(this.createBlueTintPreviewOverlay(this.tankCosmeticBlueTintIntensity(asset.category, asset.id)));
    const overlay = htmlElement("div", "aq-tank-grid-overlay");
    overlay.append(
      htmlElement("span", "aq-page-mini-title", [asset.name]),
      htmlElement("span", "aq-page-mini-meta", [selected ? "Active" : "Owned"]),
      this.htmlButton(selected ? "Active" : "Apply", "aq-page-button aq-page-button-good aq-cosmetic-apply-button", () => this.useTankCosmetic(asset), selected)
    );
    card.append(overlay);
    return card;
  }

  private createBlueTintPreviewOverlay(intensity: number): HTMLElement {
    const overlay = htmlElement("div", "aq-blue-tint-preview");
    this.updateBlueTintPreviewOverlay(overlay, intensity);
    return overlay;
  }

  private updateBlueTintPreviewOverlay(overlay: HTMLElement, intensity: number): void {
    overlay.style.opacity = String(Math.round(Phaser.Math.Clamp(intensity, 0, 100)) / 100);
  }

  private createDecorationHtmlCard(decorationType: DecorationType): HTMLElement {
    const card = htmlElement("article", "aq-tank-grid-card");
    card.append(htmlImage(`/assets/decorations/${decorationType.id}.png`, "", "aq-tank-grid-image contain"));
    const overlay = htmlElement("div", "aq-tank-grid-overlay");
    overlay.append(
      htmlElement("h3", "aq-page-card-title", [decorationType.name]),
      htmlElement("p", "aq-page-card-meta", [`${this.rarityStarsLabel(decorationType.rarity)} | +${formatNumber(decorationType.happinessBonus)} happy`])
    );
    const sizeGrid = htmlElement("div", "aq-page-size-grid");
    decorationSizeOrder.forEach((size) => {
      const stored = this.getDecorationInventory(decorationType.id, size);
      const placed = this.getPlacedDecorationCount(decorationType.id, size);
      const owned = stored + placed;
      if (owned <= 0) {
        return;
      }
      const label = stored > 0
        ? `${decorationSizes[size].label} x${formatNumber(stored)}`
        : `${decorationSizes[size].label} in tank x${formatNumber(placed)}`;
      sizeGrid.append(
        this.htmlButton(
          label,
          "aq-page-size-button owned",
          () => this.selectDecoration(decorationType.id, size),
          stored <= 0
        )
      );
    });
    overlay.append(sizeGrid);
    card.append(overlay);
    return card;
  }

  private createFoodDispenserHtmlCard(): HTMLElement {
    const card = htmlElement("article", "aq-tank-grid-card");
    card.append(
      htmlImage(foodDispenserAssetPath, "", "aq-tank-grid-image contain"),
      htmlElement("div", "aq-tank-grid-overlay", [
        htmlElement("h3", "aq-page-card-title", ["Food Dispenser"]),
        htmlElement("p", "aq-page-card-meta", [`Food ${this.foodBadgeLabel(this.getTotalDispenserInventory())}`]),
        htmlElement("p", "aq-page-card-copy", ["Drag on the tank edge to reposition. Dispenses owned fish food automatically."])
      ])
    );
    return card;
  }

  private appendAlbumPage(content: HTMLElement): void {
    content.classList.add("aq-page-content-scroll");
    content.append(this.createInventoryTabs());
    if (this.inventoryTab === "fish") {
      this.appendInventoryFishTab(content);
      return;
    }
    if (this.inventoryTab === "food") {
      this.appendInventoryFoodTab(content);
      return;
    }
    if (this.inventoryTab === "decor") {
      this.appendInventoryDecorTab(content);
      return;
    }
    this.appendInventoryCoinsTab(content);
  }

  private createInventoryTabs(): HTMLElement {
    const tabs: Array<{ tab: InventoryTab; label: string; icon: string }> = [
      { tab: "fish", label: "Fish", icon: "/assets/ui/shop/icon_category_fish.png" },
      { tab: "food", label: "Food", icon: "/assets/ui/shop/icon_category_food.png" },
      { tab: "decor", label: "Decor", icon: "/assets/decorations/rock.png" },
      { tab: "coins", label: "Coins", icon: "/assets/ui/shop/coin_icon_rare.png" }
    ];
    return createPageTabRow(tabs, this.inventoryTab, this.pageButtonFactory(), (tab) => {
      this.inventoryTab = tab;
      this.syncHtmlPageOverlay();
    });
  }

  private appendInventoryFishTab(content: HTMLElement): void {
    content.append(htmlElement("h2", "aq-page-section-title", ["Tank Fish"]));
    const fishList = htmlElement("div", "aq-album-list");
    const activeFish = this.activeFish();
    if (activeFish.length === 0) {
      fishList.append(createPageEmptyCard("No fish in this tank", "Buy fish from Shop, then drag them from the dock."));
    } else {
      activeFish.forEach((fish) =>
        fishList.append(
          createFishAlbumRow({
            fish,
            index: this.fish.indexOf(fish),
            happinessPercent: this.fishHappinessPercent(fish),
            rarityLabel: this.rarityLabel(fish.type.rarity),
            createButton: this.pageButtonFactory(),
            onSell: (index) => this.showSellConfirmation(index)
          })
        )
      );
    }
    content.append(fishList, htmlElement("h2", "aq-page-section-title", ["Stored Fish"]));

    const storedList = htmlElement("div", "aq-album-list");
    const storedFish = fishTypes.filter((fishType) => this.getFishInventory(fishType.id) > 0);
    if (storedFish.length === 0) {
      storedList.append(createPageEmptyCard("No stored fish", "Buy fish from Shop. New fish stay in the dock until placed."));
    } else {
      storedFish.forEach((fishType) => storedList.append(this.createStoredFishInventoryRow(fishType)));
    }
    content.append(storedList);
  }

  private appendInventoryFoodTab(content: HTMLElement): void {
    const foodList = htmlElement("div", "aq-album-list");
    const ownedFood = foodTypes.filter((foodType) => !hiddenFoodTypeIds.has(foodType.id) && this.getFoodInventory(foodType.id) > 0);
    if (ownedFood.length === 0) {
      foodList.append(createPageEmptyCard("No food owned", "Buy food and medicine from Shop."));
    } else {
      ownedFood.forEach((foodType) => foodList.append(this.createFoodInventoryRow(foodType)));
    }
    content.append(foodList);
  }

  private appendInventoryDecorTab(content: HTMLElement): void {
    const decorList = htmlElement("div", "aq-album-list");
    const rows: HTMLElement[] = [];
    decorationTypes.forEach((decorationType) => {
      decorationSizeOrder.forEach((size) => {
        if (this.getOwnedDecorationCount(decorationType.id, size) > 0) {
          rows.push(this.createDecorationInventoryRow(decorationType, size));
        }
      });
    });
    if (rows.length === 0) {
      decorList.append(createPageEmptyCard("No decorations owned", "Buy tank decorations from Shop."));
    } else {
      decorList.append(...rows);
    }
    content.append(decorList);
  }

  private appendInventoryCoinsTab(content: HTMLElement): void {
    const coinList = htmlElement("div", "aq-album-list");
    coinList.append(
      this.createCoinInventoryRow("rare"),
      this.createCoinInventoryRow("superRare")
    );
    content.append(coinList);
  }

  private createStoredFishInventoryRow(fishType: FishType): HTMLElement {
    const count = this.getFishInventory(fishType.id);
    const sellValue = this.storedFishSellValue(fishType);
    const row = htmlElement("article", "aq-album-row fish");
    const body = htmlElement("div", "aq-album-row-body", [
      htmlElement("h3", "aq-album-row-title", [fishType.name]),
      htmlElement("p", "aq-album-row-meta", [`Stored x${formatNumber(count)} | ${this.rarityLabel(fishType.rarity)}`]),
      htmlElement("p", "aq-album-row-copy", [`Sell converts one fish to C${formatNumber(sellValue)}`])
    ]);
    row.append(
      htmlImage(`/assets/fish/${fishType.id}.png`, "", "aq-album-row-image fish"),
      body,
      this.htmlButton("Sell", "aq-page-button aq-page-button-danger aq-album-row-button", () => this.showStoredFishSellConfirmation(fishType.id))
    );
    return row;
  }

  private createFoodInventoryRow(foodType: FoodType): HTMLElement {
    const rawAmount = this.getFoodInventory(foodType.id);
    const countLabel = this.foodInventoryBadgeLabel(foodType);
    const sellValue = this.foodSellValue(foodType, rawAmount);
    const row = htmlElement("article", "aq-album-row food");
    const image = htmlImage(foodAssetPath(foodType.id), "", "aq-album-row-image");
    image.style.filter = foodCssFilterFor(foodType.id);
    const body = htmlElement("div", "aq-album-row-body", [
      htmlElement("h3", "aq-album-row-title", [foodType.name]),
      htmlElement("p", "aq-album-row-meta", [`Owned x${countLabel} | ${formatNumber(foodType.calories)} cal each`]),
      htmlElement("p", "aq-album-row-copy", [`Sell all for C${formatNumber(sellValue)}`])
    ]);
    row.append(
      image,
      body,
      this.htmlButton("Sell", "aq-page-button aq-page-button-danger aq-album-row-button", () => this.showFoodSellConfirmation(foodType.id))
    );
    return row;
  }

  private createCoinInventoryRow(coinType: "rare" | "superRare"): HTMLElement {
    const count = this.wallet[coinType];
    const value = this.coinSellValue(coinType, count);
    const label = coinType === "rare" ? "Rare Coin" : "Super Rare Diamond";
    const icon = coinType === "rare" ? "/assets/ui/shop/coin_icon_rare.png" : "/assets/ui/shop/coin_icon_super_rare.png";
    const row = htmlElement("article", "aq-album-row coin");
    const body = htmlElement("div", "aq-album-row-body", [
      htmlElement("h3", "aq-album-row-title", [label]),
      htmlElement("p", "aq-album-row-meta", [`Owned x${formatNumber(count)}`]),
      htmlElement("p", "aq-album-row-copy", [`Sell all for C${formatNumber(value)}`])
    ]);
    row.append(
      htmlImage(icon, "", "aq-album-row-image"),
      body,
      this.htmlButton(
        "Sell",
        "aq-page-button aq-page-button-danger aq-album-row-button",
        () => this.showCoinSellConfirmation(coinType),
        count <= 0
      )
    );
    return row;
  }

  private createDecorationInventoryRow(decorationType: DecorationType, size: DecorationSize): HTMLElement {
    const storedCount = this.getDecorationInventory(decorationType.id, size);
    const placedCount = this.getPlacedDecorationCount(decorationType.id, size);
    const count = storedCount + placedCount;
    const sellValue = this.decorationSellValue(decorationType, size, count);
    const sizeLabel = decorationSizes[size].label;
    const row = htmlElement("article", "aq-album-row decor");
    const body = htmlElement("div", "aq-album-row-body", [
      htmlElement("h3", "aq-album-row-title", [decorationType.name]),
      htmlElement("p", "aq-album-row-meta", [`${sizeLabel} x${formatNumber(count)} | Stored ${formatNumber(storedCount)} | Tank ${formatNumber(placedCount)}`]),
      htmlElement("p", "aq-album-row-copy", [`Sell all for C${formatNumber(sellValue)}`])
    ]);
    row.append(
      htmlImage(`/assets/decorations/${decorationType.id}.png`, "", "aq-album-row-image"),
      body,
      this.htmlButton("Sell", "aq-page-button aq-page-button-danger aq-album-row-button", () => this.showDecorationSellConfirmation(decorationType.id, size))
    );
    return row;
  }

  private fishHappinessPercent(fish: Fish): number {
    const fullness = Phaser.Math.Clamp(fish.fullnessRatio(), 0, 1) * 100;
    return Math.round(Phaser.Math.Clamp(fish.health * 0.68 + fullness * 0.32, 0, 100));
  }

  private compactDurationLabel(seconds: number): string {
    const rounded = Math.max(0, Math.floor(seconds));
    if (rounded < 60) {
      return `${formatNumber(rounded)}s`;
    }

    const minutes = Math.floor(rounded / 60);
    const remainingSeconds = rounded % 60;
    if (minutes < 60) {
      return remainingSeconds > 0 ? `${formatNumber(minutes)}m ${formatNumber(remainingSeconds)}s` : `${formatNumber(minutes)}m`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${formatNumber(hours)}h ${formatNumber(remainingMinutes)}m` : `${formatNumber(hours)}h`;
  }

  private appendGoalsPage(content: HTMLElement): void {
    content.classList.add("aq-page-content-scroll");
    content.append(
      createQuestList(this.visibleDailyQuestItems(), this.dailyGoals.claimed, this.pageButtonFactory(), (goalId, complete) =>
        this.claimDailyGoal(goalId, complete)
      )
    );
    content.append(
      createRewardedAdsPage(this.rewardedAdOptions(), this.rewardedAd, this.pageButtonFactory(), {
        startRewardedAd: (kind) => this.startRewardedAd(kind),
        claimRewardedAd: (kind) => this.claimRewardedAd(kind)
      })
    );
  }

  private openPrizeMachineArcade(): void {
    this.activeScreen = "prize";
    this.placementMode = { kind: "none" };
    this.prizeMachine = beginPrizeMachineSession(this.prizeMachine, this.prizeMachineRuntimeSessionId, Math.random);
    this.closeModal();
    this.storeOverlay?.hide();
    this.hideHtmlPageOverlay();
    this.createFoodDock();
    this.syncHtmlGameInterface();
    this.prizeRareFish = this.nextPrizeRareFish();
    this.ensureFishTexturesLoaded(this.prizeRareFish);
    this.showPrizeMachineSpinner();
  }

  private showPrizeMachineSpinner(): void {
    this.destroyPrizeSpinContainer();
    this.prizeSpinInProgress = false;
    this.prizeSpinContainer = createPrizeMachineSpinner(
      this,
      this.currentPrizeMachineConfig(),
      this.createPrizeWheelSegments(),
      {
        commonCoins: this.wallet.common,
        selectedBetAmount: this.prizeMachine.selectedBetAmount,
        betAmounts: prizeMachineBetAmounts
      },
      {
        onSpin: () => this.spinPrizeMachine(),
        onSelectBet: (betAmount) => this.selectPrizeMachineBet(betAmount),
        onClose: () => this.closePage()
      }
    );
  }

  private selectPrizeMachineBet(betAmount: PrizeMachineBetAmount): void {
    if (this.prizeSpinInProgress) {
      return;
    }

    this.prizeMachine = setPrizeMachineBet(this.prizeMachine, betAmount);
    this.showPrizeMachineSpinner();
    this.saveNow();
  }

  private handleNativePrizePointer(designX: number, designY: number): boolean {
    if (this.activeScreen !== "prize" || this.modal || !this.prizeSpinContainer) {
      return false;
    }

    const closeBounds = new Phaser.Geom.Rectangle(gameWidth / 2 - 85, gameHeight - 95, 170, 46);
    if (!this.prizeSpinInProgress && closeBounds.contains(designX, designY)) {
      this.closePage();
      return true;
    }

    const spinBounds = new Phaser.Geom.Rectangle(gameWidth / 2 - 115, gameHeight - 158, 230, 52);
    if (!this.prizeSpinInProgress && spinBounds.contains(designX, designY)) {
      this.spinPrizeMachine();
      return true;
    }

    const selectedBet = this.nativePrizeBetAtPoint(designX, designY);
    if (selectedBet !== undefined) {
      this.selectPrizeMachineBet(selectedBet);
      return true;
    }

    return false;
  }

  private nativePrizeBetAtPoint(designX: number, designY: number): PrizeMachineBetAmount | undefined {
    if (this.prizeSpinInProgress) {
      return undefined;
    }

    const betY = gameHeight - 198;
    if (Math.abs(designY - betY) > 24) {
      return undefined;
    }

    const betAmounts = prizeMachineBetAmounts;
    const spacing = betAmounts.length > 4 ? 50 : 74;
    const buttonWidth = betAmounts.length > 4 ? 46 : 64;
    const startX = gameWidth / 2 - ((betAmounts.length - 1) * spacing) / 2;
    return betAmounts.find((betAmount, index) => {
      const centerX = startX + index * spacing;
      return Math.abs(designX - centerX) <= buttonWidth / 2;
    });
  }

  private currentPrizeMachineConfig(): PrizeMachineConfig {
    return prizeMachineConfigForBet(this.prizeMachine.selectedBetAmount);
  }

  private spinPrizeMachine(): void {
    if (this.prizeSpinInProgress) {
      return;
    }

    const config = this.currentPrizeMachineConfig();
    if (!this.spendPrice(config.spinCost)) {
      this.floatText(`Need ${formatPrice(config.spinCost)}`, toastX, toastY, "#ffb0a8");
      if (!this.prizeSpinContainer) {
        this.closePage();
      }
      return;
    }

    this.prizeMachine = recordPrizeMachineSpin(this.prizeMachine, this.priceWealth(config.spinCost));
    const segments = this.createPrizeWheelSegments();
    const preparedReward = this.choosePrizeMachinePreparedReward(segments);
    const preparedRewardValue = this.prizeMachineRewardResaleValue(preparedReward);
    this.prizeSpinInProgress = true;
    this.htmlPageOverlay?.classList.add("hidden");
    this.destroyPrizeSpinContainer();
    let rewardApplied = false;
    const applyPrizeReward = () => {
      if (rewardApplied) {
        return;
      }
      rewardApplied = true;
      this.prizeSpinInProgress = false;
      this.awardPrizeMachinePreparedReward(preparedReward);
      this.prizeMachine = recordPrizeMachineWin(
        this.prizeMachine,
        preparedRewardValue,
        this.prizeMachineRewardKey(preparedReward)
      );

      this.recordDailyQuestAction("prize-game");
      this.createFoodDock();
      this.saveNow();
    };
    this.prizeSpinContainer = playPrizeMachineSpin(this, config, segments, preparedReward.segmentIndex, { commonCoins: this.wallet.common }, {
      onRewardReady: applyPrizeReward,
      onSpinAgain: () => {
        applyPrizeReward();
        const nextConfig = this.currentPrizeMachineConfig();
        if (!this.developerGodMode && !canAfford(this.wallet, nextConfig.spinCost)) {
          this.floatText(`Need ${formatPrice(nextConfig.spinCost)}`, toastX, toastY, "#ffb0a8");
          return;
        }
        this.destroyPrizeSpinContainer();
        this.spinPrizeMachine();
      },
      onClose: () => {
        applyPrizeReward();
        this.closePage();
      },
      getCommonCoins: () => this.wallet.common,
      onHighlight: () => this.playSfx(prizeHighlightSoundKey, { volume: 0.12 }),
      onStop: () => this.playSfx(prizeRewardSoundKey, { volume: 0.18 })
    });
  }

  private createPrizeWheelSegments(): PrizeWheelSegment[] {
    const betAmount = this.prizeMachine.selectedBetAmount;
    const targetMultipliers = [0.5, 0.58, 0.66, 0.74, 0.82, 0.9, 1.1, 1.18, 1.26, 1.34, 1.42, 1.5];
    const usedKeys = new Set<string>();

    return targetMultipliers.map((multiplier, index) => {
      const lane: "loss" | "win" = multiplier < 1 ? "loss" : "win";
      const rawTargetValue = betAmount * multiplier;
      const targetValue = lane === "loss"
        ? Math.max(1, Math.min(betAmount - 1, Math.floor(rawTargetValue)))
        : Math.max(betAmount + 1, Math.round(rawTargetValue));
      const candidates = this.prizeWheelCandidatesForTarget(targetValue, lane, index);
      const candidate = this.choosePrizeWheelSegmentCandidate(candidates, targetValue, index, usedKeys);
      usedKeys.add(candidate.key);
      return candidate.segment;
    });
  }

  private prizeWheelCandidatesForTarget(targetValue: number, lane: "loss" | "win", slotIndex: number): PrizeSegmentCandidate[] {
    const betAmount = this.prizeMachine.selectedBetAmount;
    const candidates = [
      this.prizeWheelCommonCandidate(targetValue, slotIndex),
      ...this.prizeWheelFoodCandidates(targetValue, lane, slotIndex),
      ...this.prizeWheelRareCoinCandidates(targetValue, lane),
      ...this.prizeWheelSuperRareCoinCandidates(targetValue, lane),
      ...this.prizeWheelRareFishCandidates(lane)
    ].filter((candidate) => this.prizeWheelValueMatchesLane(candidate.value, lane, betAmount));

    return candidates.length > 0 ? candidates : [this.prizeWheelCommonCandidate(targetValue, slotIndex)];
  }

  private prizeWheelCommonCandidate(targetValue: number, slotIndex: number): PrizeSegmentCandidate {
    const commonColors = [0x0ea5e9, 0x14b8a6, 0x7dd3fc, 0x0284c7, 0x38bdf8, 0x0f766e];
    const amount = Math.max(1, Math.round(targetValue));
    return {
      key: `common:${amount}`,
      value: amount,
      segment: {
        kind: "common",
        label: `C${formatNumber(amount)}`,
        iconTextureKey: prizeWheelIconTextureKeys.common,
        color: commonColors[slotIndex % commonColors.length],
        commonAmount: amount
      }
    };
  }

  private prizeWheelFoodCandidates(targetValue: number, lane: "loss" | "win", slotIndex: number): PrizeSegmentCandidate[] {
    const foodColors = [0x22c55e, 0x38bdf8, 0xa3e635, 0x06b6d4, 0x84cc16, 0x10b981];
    return foodTypes
      .filter((foodType) => !hiddenFoodTypeIds.has(foodType.id) && !supplyFoodTypeIds.has(foodType.id) && this.isDroppableFood(foodType.id))
      .map((foodType, index) => {
        const unitStoredAmount = this.isCalorieTrackedFood(foodType.id) ? foodType.calories : 1;
        const unitValue = this.foodSellValue(foodType, unitStoredAmount);
        const quantity = this.prizeWheelQuantityForTarget(unitValue, targetValue, lane);
        const storedAmount = unitStoredAmount * quantity;
        const value = this.foodSellValue(foodType, storedAmount);
        const marketValue = this.priceWealth(foodType.price) * quantity;
        const label = `${this.prizeWheelFoodLabel(foodType)}${quantity > 1 ? ` x${formatNumber(quantity)}` : ""}`;
        return {
          key: `food:${foodType.id}:${quantity}`,
          value,
          segment: {
            kind: "food" as const,
            label,
            resultLabel: label,
            resultMarketLabel: `(Worth C${formatNumber(marketValue)})`,
            iconTextureKey: this.foodTextureKey(foodType.id),
            color: foodColors[(slotIndex + index) % foodColors.length],
            foodTypeId: foodType.id,
            foodQuantity: quantity
          }
        };
      });
  }

  private prizeWheelRareCoinCandidates(targetValue: number, lane: "loss" | "win"): PrizeSegmentCandidate[] {
    if (this.prizeMachine.selectedBetAmount < coinWealthValue.rare) {
      return [];
    }

    const unitValue = this.coinSellValue("rare");
    const amount = this.prizeWheelQuantityForTarget(unitValue, targetValue, lane);
    const value = this.coinSellValue("rare", amount);
    return [{
      key: `rare:${amount}`,
      value,
      segment: {
        kind: "rare",
        label: `R${formatNumber(amount)}`,
        resultLabel: `R${formatNumber(amount)}`,
        resultMarketLabel: `(Worth C${formatNumber(coinWealthValue.rare * amount)})`,
        iconTextureKey: prizeWheelIconTextureKeys.rare,
        color: 0x0ea5e9,
        rareAmount: amount
      }
    }];
  }

  private prizeWheelSuperRareCoinCandidates(targetValue: number, lane: "loss" | "win"): PrizeSegmentCandidate[] {
    if (this.prizeMachine.selectedBetAmount < coinWealthValue.superRare) {
      return [];
    }

    const unitValue = this.coinSellValue("superRare");
    const amount = this.prizeWheelQuantityForTarget(unitValue, targetValue, lane);
    const value = this.coinSellValue("superRare", amount);
    return [{
      key: `superRare:${amount}`,
      value,
      segment: {
        kind: "superRare",
        label: `SR${formatNumber(amount)}`,
        resultLabel: `SR${formatNumber(amount)}`,
        resultMarketLabel: `(Worth C${formatNumber(coinWealthValue.superRare * amount)})`,
        iconTextureKey: prizeWheelIconTextureKeys.superRare,
        color: 0x8b5cf6,
        superRareAmount: amount
      }
    }];
  }

  private prizeWheelRareFishCandidates(lane: "loss" | "win"): PrizeSegmentCandidate[] {
    const betAmount = this.prizeMachine.selectedBetAmount;
    const value = this.storedFishSellValue(this.prizeRareFish);
    if (!this.prizeWheelValueMatchesLane(value, lane, betAmount)) {
      return [];
    }

    return [{
      key: `rareFish:${this.prizeRareFish.id}`,
      value,
      segment: {
        kind: "rareFish",
        label: "R Fish",
        iconTextureKey: this.textures.exists(`fish-${this.prizeRareFish.id}`) ? `fish-${this.prizeRareFish.id}` : prizeWheelIconTextureKeys.fish,
        color: 0x22c55e,
        resultLabel: this.prizeRareFish.name,
        resultMarketLabel: `(Worth C${formatNumber(this.priceWealth(this.prizeRareFish.price))})`,
        fishTypeId: this.prizeRareFish.id
      }
    }];
  }

  private prizeWheelQuantityForTarget(unitValue: number, targetValue: number, lane: "loss" | "win"): number {
    const safeUnitValue = Math.max(1, unitValue);
    const estimatedQuantity = Math.max(1, Math.round(targetValue / safeUnitValue));
    const betAmount = this.prizeMachine.selectedBetAmount;
    const quantities = Array.from({ length: 9 }, (_, offset) => Math.max(1, estimatedQuantity - 4 + offset));
    const sorted = [...new Set(quantities)].sort((first, second) => {
      const firstValue = first * safeUnitValue;
      const secondValue = second * safeUnitValue;
      const firstValid = this.prizeWheelValueMatchesLane(firstValue, lane, betAmount) ? 0 : 1;
      const secondValid = this.prizeWheelValueMatchesLane(secondValue, lane, betAmount) ? 0 : 1;
      return firstValid - secondValid || Math.abs(firstValue - targetValue) - Math.abs(secondValue - targetValue);
    });
    return sorted[0] ?? estimatedQuantity;
  }

  private prizeWheelValueMatchesLane(value: number, lane: "loss" | "win", betAmount = this.prizeMachine.selectedBetAmount): boolean {
    const safeBet = Math.max(1, betAmount);
    if (lane === "loss") {
      return value >= Math.max(1, Math.floor(safeBet * 0.5)) && value < safeBet;
    }
    return value > safeBet && value <= Math.max(safeBet + 1, Math.ceil(safeBet * 1.5));
  }

  private choosePrizeWheelSegmentCandidate(
    candidates: PrizeSegmentCandidate[],
    targetValue: number,
    slotIndex: number,
    usedKeys: Set<string>
  ): PrizeSegmentCandidate {
    const preferredKinds: PrizeSpinPrize[] = ["common", "food", "common", "food", "common", "rare", "common", "food", "rare", "food", "rareFish", "superRare"];
    const unusedCandidates = candidates.filter((candidate) => !usedKeys.has(candidate.key));
    const availableCandidates = unusedCandidates.length > 0 ? unusedCandidates : candidates;
    const preferredKind = preferredKinds[slotIndex % preferredKinds.length];
    const preferredCandidates = availableCandidates.filter((candidate) => candidate.segment.kind === preferredKind);
    const pool = preferredCandidates.length > 0 ? preferredCandidates : availableCandidates;
    return [...pool].sort((first, second) => Math.abs(first.value - targetValue) - Math.abs(second.value - targetValue))[0] ?? candidates[0];
  }

  private choosePrizeMachinePreparedReward(segments: PrizeWheelSegment[]): PreparedPrizeMachineReward {
    const candidates = segments.map((segment, segmentIndex) => {
      const reward = this.preparePrizeMachineSegmentReward(segment, segmentIndex);
      return {
        reward,
        value: this.prizeMachineRewardResaleValue(reward),
        key: this.prizeMachineRewardKey(reward)
      };
    });
    const betAmount = this.prizeMachine.selectedBetAmount;
    const laneCandidates = Math.random() < 0.5
      ? candidates.filter((candidate) => candidate.value < betAmount)
      : candidates.filter((candidate) => candidate.value > betAmount);
    const lanePool = laneCandidates.length > 0 ? laneCandidates : candidates;
    const recentPrizeKeys = new Set(this.prizeMachine.recentPrizeKeys);
    const filteredCandidates = this.filterPrizeRepeatCandidates(lanePool, recentPrizeKeys);
    return Phaser.Utils.Array.GetRandom(filteredCandidates.length > 0 ? filteredCandidates : lanePool)?.reward ?? { kind: "common", amount: 10, segmentIndex: 0 };
  }

  private filterPrizeRepeatCandidates<T extends { key: string }>(candidates: T[], recentPrizeKeys: Set<string>): T[] {
    const filtered = candidates.filter((candidate) => !recentPrizeKeys.has(candidate.key));
    return filtered.length >= 3 ? filtered : candidates;
  }

  private preparePrizeMachineSegmentReward(segment: PrizeWheelSegment, segmentIndex: number): PreparedPrizeMachineReward {
    if (segment.kind === "rare") {
      return { kind: "rare", amount: Math.max(1, segment.rareAmount ?? 1), segmentIndex };
    }
    if (segment.kind === "superRare") {
      return { kind: "superRare", amount: Math.max(1, segment.superRareAmount ?? 1), segmentIndex };
    }
    if (segment.kind === "rareFish") {
      const fishType = fishTypes.find((candidate) => candidate.id === segment.fishTypeId) ?? this.prizeRareFish;
      return { kind: "rareFish", fishType, segmentIndex };
    }
    if (segment.kind === "premiumCommon") {
      return { kind: "premiumCommon", amount: segment.commonAmount ?? 500, segmentIndex };
    }
    if (segment.kind === "food") {
      const foodType = foodTypes.find((candidate) => candidate.id === segment.foodTypeId) ?? basicFood;
      return { kind: "food", foodType, quantity: Math.max(1, segment.foodQuantity ?? 1), segmentIndex };
    }
    return { kind: "common", amount: segment.commonAmount ?? 10, segmentIndex };
  }

  private prizeMachineRewardResaleValue(reward: PreparedPrizeMachineReward): number {
    if (reward.kind === "rare") {
      return this.coinSellValue("rare", reward.amount);
    }
    if (reward.kind === "superRare") {
      return this.coinSellValue("superRare", reward.amount);
    }
    if (reward.kind === "rareFish") {
      return this.storedFishSellValue(reward.fishType);
    }
    if (reward.kind === "premiumCommon" || reward.kind === "common") {
      return reward.amount;
    }
    return this.foodSellValue(reward.foodType, (this.isCalorieTrackedFood(reward.foodType.id) ? reward.foodType.calories : 1) * reward.quantity);
  }

  private prizeMachineRewardKey(reward: PreparedPrizeMachineReward): string {
    if (reward.kind === "food") {
      return `food:${reward.foodType.id}:${reward.quantity}`;
    }
    if (reward.kind === "common" || reward.kind === "premiumCommon") {
      return `${reward.kind}:C${reward.amount}`;
    }
    if (reward.kind === "rareFish") {
      return `rareFish:${reward.fishType.id}`;
    }
    return `${reward.kind}:${reward.amount}`;
  }

  private awardPrizeMachinePreparedReward(reward: PreparedPrizeMachineReward): void {
    if (reward.kind === "rare") {
      this.awardPrizeMachineRare(reward.amount);
      return;
    }
    if (reward.kind === "superRare") {
      this.awardPrizeMachineSuperRare(reward.amount);
      return;
    }
    if (reward.kind === "rareFish") {
      this.awardPrizeMachineRareFish(reward.fishType);
      return;
    }
    if (reward.kind === "premiumCommon") {
      this.awardPrizeMachineCommon(reward.amount);
      return;
    }
    if (reward.kind === "food") {
      this.awardPrizeMachineFood(reward.foodType, reward.quantity);
      return;
    }
    this.awardPrizeMachineCommon(reward.amount);
  }

  private destroyPrizeSpinContainer(): void {
    this.prizeSpinContainer?.destroy(true);
    this.prizeSpinContainer = undefined;
  }

  private awardPrizeMachineRare(amount: number): void {
    earn(this.wallet, "rare", amount);
    this.setPrizeMachineResult("rare", `R${formatNumber(amount)} Prize!`, "Rare coins dropped from the spinner.");
    this.floatText(`+R${formatNumber(amount)} prize`, toastX, toastY, "#9eefff");
    this.showPrizeCelebration("Rare Coin!", "/assets/ui/shop/coin_icon_rare.png", `You won R${formatNumber(amount)}.`);
  }

  private awardPrizeMachineSuperRare(amount: number): void {
    earn(this.wallet, "superRare", amount);
    this.setPrizeMachineResult("superRare", `SR${formatNumber(amount)} Prize!`, "Super rare diamonds dropped from the spinner.");
    this.floatText(`+SR${formatNumber(amount)} prize`, toastX, toastY, "#f0b6ff");
    this.showPrizeCelebration("Super Rare!", "/assets/ui/shop/coin_icon_super_rare.png", `You won SR${formatNumber(amount)}.`);
  }

  private awardPrizeMachineRareFish(fishType: FishType): void {
    this.fishInventory.set(fishType.id, this.getFishInventory(fishType.id) + 1);
    this.recentInventoryDockItemKey = `fish:${fishType.id}`;
    this.setPrizeMachineResult("rareFish", `${fishType.name} Prize!`, "The fish is waiting in your left dock.");
    this.floatText(`${fishType.name} prize`, toastX, toastY, "#a8ffb0");
    this.showPrizeCelebration(`${fishType.name}!`, `/assets/fish/${fishType.id}.png`, "A rare fish is waiting in your dock.");
    this.prizeRareFish = this.nextPrizeRareFish();
  }

  private awardPrizeMachineFood(foodType: FoodType, quantity: number): void {
    const amount = (this.isCalorieTrackedFood(foodType.id) ? foodType.calories : 1) * Math.max(1, quantity);
    this.foodInventory.set(foodType.id, this.getFoodInventory(foodType.id) + amount);
    this.recentInventoryDockItemKey = `food:${foodType.id}`;
    this.setPrizeMachineResult("food", `Food Prize: ${foodType.name}`, `+${formatNumber(amount)} cal food.`);
    this.floatText(`+${foodType.name}${quantity > 1 ? ` x${formatNumber(quantity)}` : ""}`, toastX, toastY, "#ffe67a");
  }

  private awardPrizeMachineCommon(amount: number): void {
    earn(this.wallet, "common", amount);
    this.setPrizeMachineResult("common", `Common Prize C${formatNumber(amount)}`, `+C${formatNumber(amount)} from the wheel.`);
    this.floatText(`+C${formatNumber(amount)}`, toastX, toastY, "#ffe67a");
  }

  private setPrizeMachineResult(kind: PrizeSpinPrize, title: string, detail: string): void {
    this.prizeMachine = {
      ...this.prizeMachine,
      lastResult: { kind, title, detail, at: Date.now() }
    };
  }

  private nextPrizeRareFish(): FishType {
    const ownedFishIds = new Set([
      ...this.fish.map((fish) => fish.type.id),
      ...[...this.fishInventory.entries()].filter(([, count]) => count > 0).map(([fishTypeId]) => fishTypeId)
    ]);
    const unowned = fishTypes.filter((fishType) => fishType.rarity === "rare" && !ownedFishIds.has(fishType.id));
    const pool = unowned.length > 0 ? unowned : fishTypes.filter((fishType) => fishType.rarity === "rare");
    return Phaser.Utils.Array.GetRandom(pool.length > 0 ? pool : fishTypes);
  }

  private prizeWheelFoodLabel(foodType: FoodType): string {
    return foodType.name
      .replace(/\s+(Food|Flakes|Bites|Dust|Treat)\b/gi, "")
      .replace(/\s+Small\b/gi, "")
      .trim();
  }

  private rewardedAdOptions(): RewardedAdOption[] {
    const commonReward = this.rewardedAdCoinReward("common");
    const foodReward = this.rewardedAdFoodReward();
    const fishReward = this.rewardedAdFishReward();
    const helperReward = this.rewardedAdHelperReward();
    return buildRewardedAdOptions({
      common: {
        detail: formatPrice(commonReward),
        icon: coinAssetPathByType.common
      },
      food: {
        detail: foodReward.name,
        icon: foodAssetPath(foodReward.id)
      },
      fish: {
        detail: fishReward.name,
        icon: `/assets/fish/${fishReward.id}.png`
      },
      helper: {
        detail: helperReward.name,
        icon: `/assets/helpers/${helperReward.id}.png`
      }
    });
  }

  private rewardedAdFoodReward(): FoodType {
    const candidates = foodTypes.filter((foodType) => this.isCalorieTrackedFood(foodType.id) && this.isDroppableFood(foodType.id));
    const targetCalories = this.activeFish()
      .map((fish) => fish.mealCaloriesNeeded())
      .sort((first, second) => second - first)[0] ?? basicFood.calories;
    const sorted = [...candidates].sort((first, second) => {
      const firstShortfall = first.calories >= targetCalories ? 0 : targetCalories - first.calories;
      const secondShortfall = second.calories >= targetCalories ? 0 : targetCalories - second.calories;
      return firstShortfall - secondShortfall || first.calories - second.calories;
    });
    return sorted[0] ?? basicFood;
  }

  private rewardedAdFishReward(): FishType {
    const ownedFishIds = new Set([
      ...this.fish.map((fish) => fish.type.id),
      ...[...this.fishInventory.entries()].filter(([, count]) => count > 0).map(([fishTypeId]) => fishTypeId)
    ]);
    const availableCommon = fishTypes
      .filter((fishType) => fishType.rarity === "common" && fishType.tankLevel <= this.tankDisplayLevel())
      .sort((first, second) => first.tankLevel - second.tankLevel || this.priceWealth(first.price) - this.priceWealth(second.price));
    return availableCommon.find((fishType) => !ownedFishIds.has(fishType.id)) ?? availableCommon[0] ?? fishTypes[0];
  }

  private rewardedAdHelperReward(): HelperCreatureType {
    const ownedHelperIds = new Set([
      ...this.helperCreatures.map((helper) => helper.type.id),
      ...[...this.creatureInventory.entries()].filter(([, count]) => count > 0).map(([helperTypeId]) => helperTypeId)
    ]);
    const availableCommon = helperCreatureTypes
      .filter((creatureType) => creatureType.rarity === "common")
      .sort((first, second) => this.priceWealth(first.price) - this.priceWealth(second.price));
    return availableCommon.find((creatureType) => !ownedHelperIds.has(creatureType.id)) ?? availableCommon[0] ?? helperCreatureTypes[0];
  }

  private appendSettingsPage(content: HTMLElement): void {
    const grid = htmlElement("div", "aq-page-card-grid");
    const createButton = this.pageButtonFactory();
    grid.append(
      createSettingsToggleCard("Sound", this.settings.sound, createButton, () => this.toggleSetting("sound")),
      createSettingsToggleCard("Motion", !this.settings.reducedMotion, createButton, () => this.toggleSetting("reducedMotion")),
      createSettingsToggleCard("Notify", this.settings.notifications, createButton, () => this.toggleSetting("notifications"))
    );
    grid.prepend(
      createSettingsMusicCard(
        this.settings,
        createButton,
        (volume, commit) => this.setMusicVolume(volume, commit),
        () => this.toggleSetting("music")
      )
    );

    const actions = htmlElement("div", "aq-page-actions");
    actions.append(
      this.htmlButton("Offline Summary", "aq-page-button aq-page-button-good", () => this.showOfflineSummary()),
      this.htmlButton("Reset Save", "aq-page-button aq-page-button-danger", () => this.showResetConfirmation())
    );
    content.append(
      grid,
      actions,
      createDeveloperSettingsCard(
        {
          developerGodMode: this.developerGodMode,
          onUnlock: () => this.unlockDeveloperGodMode(),
          onGrant: () => this.grantDeveloperGodMode(),
          onWrongPassword: () => this.floatText("Wrong password", toastX, toastY, "#ffb0a8")
        },
        createButton
      )
    );
  }

  private unlockDeveloperGodMode(): void {
    this.developerGodMode = true;
    this.grantDeveloperGodMode();
  }

  private grantDeveloperGodMode(): void {
    const maxContentTankLevel = Math.max(1, ...fishTypes.map((fishType) => fishType.tankLevel));
    const grantWallet = (wallet: Wallet): Wallet => createWallet(
      Math.max(wallet.common, 10_000),
      Math.max(wallet.rare, 10_000),
      Math.max(wallet.superRare, 10_000)
    );

    this.captureActiveTankState();
    for (let level = 1; level <= maxOwnedTanks; level += 1) {
      this.ownedTankLevels.add(level);
      this.tankNames.set(level, storeTankNames[level] ?? `Tank ${formatNumber(level)}`);
      const state = this.ensureTankState(level);
      state.wallet = grantWallet(state.wallet);
      state.maxDisplayLevel = Math.max(state.maxDisplayLevel ?? 1, maxContentTankLevel);
    }

    const activeState = this.ensureTankState(this.tankLevel);
    this.wallet = grantWallet(activeState.wallet);
    activeState.wallet = this.wallet;
    activeState.maxDisplayLevel = Math.max(activeState.maxDisplayLevel ?? 1, maxContentTankLevel);
    this.floatText("God mode unlocked", toastX, toastY, "#a8ffb0");
    this.storeOverlay?.refresh();
    this.refreshUi();
    if (this.activeScreen !== "prize" && this.activeScreen !== "makeup") {
      this.syncHtmlPageOverlay();
    }
    this.saveNow();
  }

  private htmlButton(label: string, className: string, onClick: () => void, disabled = false): HTMLButtonElement {
    return createHtmlButton(label, className, onClick, {
      disabled,
      attachTouchFeedback: (button) => this.attachTouchFeedback(button),
      afterClick: () => {
        if (this.activeScreen !== "tank" && this.activeScreen !== "store" && this.activeScreen !== "prize" && this.activeScreen !== "makeup") {
          this.syncHtmlPageOverlay();
        }
      }
    });
  }

  private pageButtonFactory(): PageButtonFactory {
    return (label, className, onClick, disabled = false) => this.htmlButton(label, className, onClick, disabled);
  }

  private tankCosmeticImageUrl(asset: TankCosmetic): string | undefined {
    return tankCatalogCosmeticImageUrl(asset);
  }

  private tankCardBackgroundUrl(level: number): string | undefined {
    const asset = this.tankCosmeticById("background", this.selectedTankCosmeticId("background", level));
    return asset ? this.tankCosmeticImageUrl(asset) : aquariumBackgroundAssetPath;
  }

  private visibleFishCatalog(): FishType[] {
    return fishTypes.filter(
      (fishType) =>
        this.matchesStoreCoinFilter(fishType.price, fishType.rarity)
    );
  }

  private visibleFoodCatalog(): FoodType[] {
    return foodTypes.filter((foodType) => !hiddenFoodTypeIds.has(foodType.id) && !supplyFoodTypeIds.has(foodType.id));
  }

  private visibleSupplyCatalog(): FoodType[] {
    return foodTypes.filter((foodType) => !hiddenFoodTypeIds.has(foodType.id) && supplyFoodTypeIds.has(foodType.id) && this.matchesStoreCoinFilter(foodType.price, foodType.rarity));
  }

  private visibleTankCatalogLevels(): number[] {
    const levels = Array.from({ length: maxOwnedTanks }, (_unused, index) => index + 1);
    return levels;
  }

  private visibleDecorationCatalog(): DecorationType[] {
    return decorationTypes.filter((decorationType) => this.matchesStoreCoinFilter(decorationType.price, decorationType.rarity));
  }

  private visibleHelperCreatureCatalog(): HelperCreatureType[] {
    return helperCreatureTypes.filter((creatureType) => this.matchesStoreCoinFilter(creatureType.price, creatureType.rarity));
  }

  private visibleStoreCatalogCount(): number {
    if (this.activeTab === "fish") {
      return this.visibleFishCatalog().length;
    }

    if (this.activeTab === "food") {
      return this.visibleFoodCatalog().length;
    }

    if (this.activeTab === "supply") {
      return this.visibleSupplyCatalog().length;
    }

    if (this.activeTab === "decor") {
      return this.visibleDecorationCatalog().length;
    }

    if (this.activeTab === "tank") {
      return this.visibleTankCatalogLevels().length;
    }

    return this.visibleHelperCreatureCatalog().length;
  }

  private matchesStoreCoinFilter(price: FishType["price"], rarity: FishType["rarity"] = "common"): boolean {
    if (price.superRareAmount && price.superRareAmount > 0) {
      return this.storeCoinFilter === "superRare";
    }
    if (price.rareAmount && price.rareAmount > 0) {
      return this.storeCoinFilter === "rare";
    }
    if (rarity === "superRare" || rarity === "rare") {
      return this.storeCoinFilter === rarity;
    }
    return this.storeCoinFilter === "common";
  }

  private setStoreCoinFilter(coinType: CoinType): void {
    this.storeCoinFilter = coinType;
    this.refreshUi(false);
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
      coinGlowTextureKey
    ];
    const backgroundTextureKeys = [
      aquariumFloorTextureKey,
      aquariumBackgroundTextureKey
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

  private getTankName(level: number): string {
    const sanitizedLevel = Math.max(1, Math.floor(level));
    return this.tankNames.get(sanitizedLevel) ?? storeTankNames[sanitizedLevel] ?? `Tank ${formatNumber(sanitizedLevel)}`;
  }

  private tankNamesFromRecord(source: Record<string, string> | undefined): Map<number, string> {
    return tankNamesFromRecordModel(source);
  }

  private tankNamesRecord(): Record<string, string> {
    return tankNamesRecordModel(this.tankNames);
  }

  private tankCosmetics(category: TankCosmeticCategory): TankCosmetic[] {
    return tankCatalogCosmetics(category);
  }

  private tankCosmeticById(category: TankCosmeticCategory, id: string | undefined): TankCosmetic | undefined {
    return this.tankCosmetics(category).find((asset) => asset.id === id);
  }

  private ownsTankCosmetic(asset: TankCosmetic): boolean {
    return (this.tankCosmeticInventory(asset.category).get(asset.id) ?? 0) > 0;
  }

  private validTankCosmeticId(category: TankCosmeticCategory, id: string | undefined, level = this.tankLevel): string {
    const fallback = this.defaultTankCosmeticId(level);
    return this.tankCosmeticById(category, id) ? id as string : fallback;
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
    return tankStatesFromSaveModel(saved, this.tankStateConfig());
  }

  private tankStatesRecord(): SavedGame["tank"]["states"] {
    return tankStatesRecordModel(
      this.sortedOwnedTankLevels(),
      (level) => this.ensureTankState(level),
      (level, state) => Math.max(state.maxDisplayLevel ?? 1, this.rawTankDisplayLevelFromWorth(this.calculateTankNetWorth(level)))
    );
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
    this.cleaningTank = false;
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
    this.recordDailyQuestAction("buy-tank");
    this.tankNames.set(targetLevel, storeTankNames[targetLevel] ?? `Tank ${formatNumber(targetLevel)}`);
    const tankState = this.ensureTankState(targetLevel);
    const starterWallet = storeTankStarterWallets[targetLevel] ?? createEmptyWallet();
    tankState.wallet = createWallet(starterWallet.common, starterWallet.rare, starterWallet.superRare);
    this.switchTank(targetLevel);
  }

  private buyTankCosmetic(asset: TankCosmetic): void {
    if (!this.spendPrice(asset.price)) {
      return;
    }

    const inventory = this.tankCosmeticInventory(asset.category);
    inventory.set(asset.id, 1);
    this.recordDailyQuestAction(asset.category === "background" ? "buy-background" : "buy-seabed");
    this.useTankCosmetic(asset);
    this.floatText(`${asset.name} installed`, toastX, toastY, "#a8ffb0");
    this.closeStoreAfterPurchase();
  }

  private buyTankCosmeticFromStore(category: TankCosmeticCategory, id: string): void {
    const asset = this.tankCosmeticById(category, id);
    if (asset) {
      this.buyTankCosmetic(asset);
      this.storeOverlay?.refresh();
    }
  }

  private useTankCosmeticFromStore(category: TankCosmeticCategory, id: string): void {
    const asset = this.tankCosmeticById(category, id);
    if (asset) {
      this.useTankCosmetic(asset);
      this.storeOverlay?.refresh();
    }
  }

  private applyTankCosmeticBlueTint(category: TankCosmeticCategory, id: string, intensity: number): void {
    const tintInventory = this.tankCosmeticBlueTintInventory(category);
    const normalizedIntensity = Math.round(Phaser.Math.Clamp(intensity, 0, 100));
    if (normalizedIntensity > 0) {
      tintInventory.set(id, normalizedIntensity);
    } else {
      tintInventory.delete(id);
    }

    if (this.selectedTankCosmeticId(category) === id) {
      if (category === "background") {
        this.layoutTankBackground();
      } else {
        this.layoutTankFloor();
      }
    }
    this.saveNow();
  }

  private closeStoreAfterPurchase(): void {
    if (this.activeScreen === "store") {
      this.closePage();
    }
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

  private buyFish(fishType: FishType): void {
    if (!this.developerGodMode && fishType.tankLevel > this.tankDisplayLevel()) {
      this.floatText(`Needs tank L${formatNumber(fishType.tankLevel)}`, toastX, toastY, "#ffb0a8");
      return;
    }

    if (!this.developerGodMode && !this.canBuyAnotherFishThisHour()) {
      this.floatText(`Fish shop ${this.fishPurchaseRestockLabel().toLowerCase()}`, toastX, toastY, "#ffdd8a");
      return;
    }

    if (!this.developerGodMode && !canAfford(this.wallet, fishType.price)) {
      this.floatText(`Need ${formatPrice(fishType.price)}`, toastX, toastY, "#ffb0a8");
      return;
    }

    if (!this.spendPrice(fishType.price)) {
      return;
    }

    this.fishInventory.set(fishType.id, this.getFishInventory(fishType.id) + 1);
    this.recordFishPurchase(fishType);
    this.recentInventoryDockItemKey = `fish:${fishType.id}`;
    this.placementMode = { kind: "none" };
    this.floatText(`${fishType.name} docked`, toastX, toastY, "#a8ffb0");
    this.storeOverlay?.refresh();
    this.refreshUi();
    this.createFoodDock();
    this.saveNow();
    this.closeStoreAfterPurchase();
  }

  private buyFood(foodType = this.getSelectedFoodType(), quantity = this.getFoodBuyQuantity(foodType.id)): void {
    if (!this.developerGodMode && foodType.id === "ageBoost" && !this.canBuyGrowthTonicThisHour()) {
      this.floatText(this.growthTonicPurchaseRestockLabel(), toastX, toastY, "#ffdd8a");
      this.storeOverlay?.refresh();
      return;
    }

    const buyQuantity = foodType.id === "ageBoost" ? 1 : Phaser.Math.Clamp(Math.floor(quantity), 1, maxFoodBuyQuantity);
    const totalPrice = this.quantityPrice(foodType.price, buyQuantity);
    if (!this.spendPrice(totalPrice)) {
      return;
    }

    const addedFoodInventory = this.isCalorieTrackedFood(foodType.id) ? foodType.calories * buyQuantity : buyQuantity;
    this.foodInventory.set(foodType.id, this.getFoodInventory(foodType.id) + addedFoodInventory);
    if (foodType.id === "ageBoost") {
      this.recordGrowthTonicPurchase();
    }
    this.recordDailyQuestAction(foodType.id === "medicine" ? "buy-medicine" : "buy-food");
    this.recentInventoryDockItemKey = `food:${foodType.id}`;
    if (this.isDroppableFood(foodType.id)) {
      this.selectedFoodTypeId = foodType.id;
    }
    this.placementMode = { kind: "none" };
    this.floatText(`${foodType.name} x${formatNumber(buyQuantity)}`, toastX, toastY, "#a8ffb0");
    if (this.activeScreen === "store") {
      this.storeOverlay?.refresh();
    } else if (this.activeScreen !== "tank" && this.isDroppableFood(foodType.id)) {
      this.closePage();
    }
    this.refreshUi();
    this.createFoodDock();
    this.saveNow();
    this.closeStoreAfterPurchase();
  }

  private dropFoodAt(foodTypeId: FoodTypeId, x: number, y: number): void {
    const foodType = foodTypes.find((item) => item.id === foodTypeId);
    if (!foodType || !this.isDroppableFood(foodType.id) || this.getFoodInventory(foodType.id) <= 0) {
      return;
    }
    if (this.foods.length >= maxFoodDrops) {
      this.floatTankText("Too much food", x, y - 18, "#ffdd8a");
      return;
    }

    this.selectedFoodTypeId = foodType.id;
    const reservedCalories = this.reserveFoodForDrop(foodType);
    if (reservedCalories <= 0) {
      return;
    }
    const pellet = new FoodPellet(
      this,
      Phaser.Math.Clamp(x, tankBounds.left + 18, tankBounds.right - 18),
      Phaser.Math.Clamp(y, tankBounds.top + 18, tankBounds.bottom - 18),
      foodType,
      { reservedCalories }
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

  private reserveFoodForDrop(foodType: FoodType): number {
    const current = this.getFoodInventory(foodType.id);
    if (current <= 0) {
      return 0;
    }

    if (!this.isCalorieTrackedFood(foodType.id)) {
      this.foodInventory.set(foodType.id, Math.max(0, current - 1));
      return foodType.calories;
    }

    const reservedCalories = Math.min(foodType.calories, current);
    this.foodInventory.set(foodType.id, Math.max(0, current - reservedCalories));
    return reservedCalories;
  }

  private refundUnusedFood(food: FoodPellet, consumedCalories = 0): void {
    if (!this.isCalorieTrackedFood(food.foodType.id)) {
      return;
    }

    const unusedCalories = Math.max(0, food.reservedNutrition - consumedCalories);
    if (unusedCalories <= 0) {
      return;
    }

    this.foodInventory.set(food.foodType.id, this.getFoodInventory(food.foodType.id) + unusedCalories);
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
    this.recordDailyQuestAction("buy-decoration");
    this.recentInventoryDockItemKey = `decoration:${decorationType.id}:${size}`;
    this.placementMode = { kind: "none" };
    this.floatText(`${decorationType.name} ${decorationSizes[size].label} docked`, toastX, toastY, "#a8ffb0");
    this.storeOverlay?.refresh();
    this.refreshUi();
    this.createFoodDock();
    this.saveNow();
    this.closeStoreAfterPurchase();
  }

  private buyDecorationFromStore(decorationTypeId: string, size: DecorationSize): void {
    const decorationType = decorationTypes.find((item) => item.id === decorationTypeId);
    if (decorationType) {
      this.buyDecoration(decorationType, size);
      this.storeOverlay?.refresh();
    }
  }

  private buyTankUtility(utilityId: string): void {
    if (utilityId !== "food-dispenser" && utilityId !== "coin-magnet") {
      return;
    }

    if (utilityId === "food-dispenser" && this.hasFoodDispenser()) {
      this.floatText("Already installed", toastX, toastY, "#d7f4ff");
      return;
    }

    if (utilityId === "coin-magnet" && this.hasCoinMagnet()) {
      this.floatText("Already owned", toastX, toastY, "#d7f4ff");
      return;
    }

    const utilityPrice = utilityId === "food-dispenser" ? foodDispenserPrice : coinMagnetPrice;
    if (!this.spendPrice(utilityPrice)) {
      return;
    }

    if (utilityId === "food-dispenser") {
      this.decorationInventory.set(foodDispenserInventoryKey, 1);
      this.recordDailyQuestAction("buy-dispenser");
      this.floatText("Food Dispenser installed", toastX, toastY, "#a8ffb0");
    } else {
      this.decorationInventory.set(coinMagnetInventoryKey, Date.now() + coinMagnetDurationMs);
      this.coinMagnetWasActive = true;
      this.recentInventoryDockItemKey = "utility:coin-magnet";
      this.floatText("Coin Magnet active 15m", toastX, toastY, "#a8ffb0");
      this.createFoodDock();
    }
    this.storeOverlay?.refresh();
    this.refreshUi(false);
    this.saveNow();
    this.closeStoreAfterPurchase();
  }

  private buyHelperCreature(creatureType: HelperCreatureType): void {
    if (!this.spendPrice(creatureType.price)) {
      return;
    }

    this.creatureInventory.set(creatureType.id, this.getCreatureInventory(creatureType.id) + 1);
    this.recordDailyQuestAction("buy-helper");
    this.recentInventoryDockItemKey = `helper:${creatureType.id}`;
    this.placementMode = { kind: "none" };
    this.floatText(`${creatureType.name} docked`, toastX, toastY, "#a8ffb0");
    this.storeOverlay?.refresh();
    this.refreshUi();
    this.createFoodDock();
    this.saveNow();
    this.closeStoreAfterPurchase();
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

    const commonSellValue = this.activeFishSellValue(fishToSell);
    this.fish.splice(index, 1);
    earn(this.wallet, "common", commonSellValue);
    this.floatText(`Sold ${fishToSell.type.name} +C${formatNumber(commonSellValue)}`, toastX, toastY, "#ffe67a");
    fishToSell.destroy();
    this.closeModal();
    this.refreshUi();
    this.saveNow();
  }

  private activeFishSellValue(fish: Fish): number {
    return Math.max(1, Math.floor(this.priceWealth(fish.type.price) * inventorySellRate * fish.resaleAdjustmentMultiplier()));
  }

  private storedFishSellValue(fishType: FishType): number {
    return Math.max(1, Math.floor(this.priceWealth(fishType.price) * inventorySellRate));
  }

  private sellStoredFish(fishTypeId: string): void {
    const fishType = fishTypes.find((item) => item.id === fishTypeId);
    const current = this.getFishInventory(fishTypeId);
    if (!fishType || current <= 0) {
      this.floatText("No stored fish", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellValue = this.storedFishSellValue(fishType);
    if (current <= 1) {
      this.fishInventory.delete(fishTypeId);
    } else {
      this.fishInventory.set(fishTypeId, current - 1);
    }
    earn(this.wallet, "common", sellValue);
    this.floatText(`Sold ${fishType.name} +C${formatNumber(sellValue)}`, toastX, toastY, "#ffe67a");
    this.closeModal();
    this.createFoodDock();
    this.refreshUi();
    this.saveNow();
  }

  private foodSellValue(foodType: FoodType, storedAmount = this.getFoodInventory(foodType.id)): number {
    return Math.max(1, Math.floor(this.priceWealth(foodType.price) * inventorySellRate * this.foodSellQuantityMultiplier(foodType, storedAmount)));
  }

  private foodSellQuantityMultiplier(foodType: FoodType, storedAmount = this.getFoodInventory(foodType.id)): number {
    if (!this.isCalorieTrackedFood(foodType.id)) {
      return Math.max(0, storedAmount);
    }

    return Math.max(0, storedAmount) / Math.max(1, foodType.calories);
  }

  private sellFoodInventory(foodTypeId: FoodTypeId): void {
    const foodType = foodTypes.find((item) => item.id === foodTypeId);
    const current = this.getFoodInventory(foodTypeId);
    if (!foodType || current <= 0) {
      this.floatText("No food to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellValue = this.foodSellValue(foodType, current);
    this.foodInventory.delete(foodTypeId);
    earn(this.wallet, "common", sellValue);
    this.floatText(`Sold ${foodType.name} +C${formatNumber(sellValue)}`, toastX, toastY, "#ffe67a");
    this.closeModal();
    this.createFoodDock();
    this.refreshUi();
    this.saveNow();
  }

  private decorationSellValue(decorationType: DecorationType, size: DecorationSize, count = this.getOwnedDecorationCount(decorationType.id, size)): number {
    return Math.max(1, Math.floor(this.priceWealth(this.decorationVariantPrice(decorationType, size)) * inventorySellRate * Math.max(0, count)));
  }

  private sellDecorationInventory(decorationTypeId: string, size: DecorationSize): void {
    const decorationType = decorationTypes.find((item) => item.id === decorationTypeId);
    const count = this.getOwnedDecorationCount(decorationTypeId, size);
    if (!decorationType || count <= 0) {
      this.floatText("No decor to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellValue = this.decorationSellValue(decorationType, size, count);
    this.clearStoredDecorationInventory(decorationTypeId, size);
    this.removePlacedDecorationsFromActiveTank(decorationTypeId, size);
    earn(this.wallet, "common", sellValue);
    this.floatText(`Sold ${decorationType.name} +C${formatNumber(sellValue)}`, toastX, toastY, "#ffe67a");
    this.closeModal();
    this.createFoodDock();
    this.refreshUi();
    this.saveNow();
  }

  private sellCoinInventory(coinType: "rare" | "superRare"): void {
    if (this.wallet[coinType] <= 0) {
      this.floatText("No coins to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const count = this.wallet[coinType];
    const sellValue = this.coinSellValue(coinType, count);
    this.wallet[coinType] = 0;
    earn(this.wallet, "common", sellValue);
    this.floatText(`Converted +C${formatNumber(sellValue)}`, toastX, toastY, "#ffe67a");
    this.closeModal();
    this.refreshUi();
    this.saveNow();
  }

  private coinSellValue(coinType: "rare" | "superRare", count = 1): number {
    return Math.max(1, Math.floor(coinWealthValue[coinType] * inventorySellRate * Math.max(0, count)));
  }

  private helperSellPrice(creatureType: HelperCreatureType): HelperCreatureType["price"] {
    return {
      coinType: "common",
      amount: Math.max(1, Math.floor(this.priceWealth(creatureType.price) * 0.65))
    };
  }

  private sellHelperCreatureByIndex(index: number): void {
    const helperToSell = this.helperCreatures[index];
    if (!helperToSell) {
      this.floatText("No helper to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellPrice = this.helperSellPrice(helperToSell.type);
    this.removeHelperCreatureAt(index);
    earn(this.wallet, sellPrice.coinType, sellPrice.amount);
    this.floatTankText(`Sold ${helperToSell.type.name}`, helperToSell.sprite.x, helperToSell.sprite.y - 24, "#ffe67a");
    this.closeModal();
    this.renderTabControls();
    this.refreshUi();
    this.saveNow();
  }

  private removeHelperCreatureAt(index: number): HelperCreature | undefined {
    const [removedHelper] = this.helperCreatures.splice(index, 1);
    if (removedHelper) {
      removedHelper.destroy();
    }
    return removedHelper;
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
    this.addFishToTank(babyType, position.x, position.y, { tankLevel: this.tankLevel });
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

  private selectFood(foodTypeId = this.selectedFoodTypeId): void {
    if (!this.isDroppableFood(foodTypeId)) {
      this.floatText("Use from Inventory", toastX, toastY, "#d7f4ff");
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

    const tappedCoin = this.coinAtPointer(pointerPoint.x, pointerPoint.y);
    if (tappedCoin) {
      this.collectCoin(tappedCoin, false);
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

      this.placeDecorationFromInventory(decoration, mode.size, tankPoint.x, tankPoint.y);
    }
  }

  private coinAtPointer(designX: number, designY: number): CoinDrop | undefined {
    if (this.activeScreen !== "tank" || this.coinDrops.length === 0) {
      return undefined;
    }

    const tankPoint = this.screenToTankPoint(designX, designY);
    const scale = this.tankViewScaleForLevel();
    const minimumTapRadius = 44 / Math.max(0.01, scale);
    let nearestCoin: CoinDrop | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const coin of this.coinDrops) {
      const tapRadius = Math.max(minimumTapRadius, coin.hitZone.width * 0.62, coin.sprite.displayWidth * 0.82);
      const distance = Phaser.Math.Distance.Between(tankPoint.x, tankPoint.y, coin.sprite.x, coin.sprite.y);
      if (distance <= tapRadius && distance < nearestDistance) {
        nearestCoin = coin;
        nearestDistance = distance;
      }
    }

    return nearestCoin;
  }

  private fishAtPointer(designX: number, designY: number): Fish | undefined {
    if (this.activeScreen !== "tank") {
      return undefined;
    }

    const tankPoint = this.screenToTankPoint(designX, designY);
    const scale = this.tankViewScaleForLevel();
    const minimumTapRadius = 42 / Math.max(0.01, scale);
    let nearestFish: Fish | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const fish of this.activeFish()) {
      const tapRadius = Math.max(minimumTapRadius, fish.sprite.displayWidth * 0.48, fish.sprite.displayHeight * 0.7);
      const distance = Phaser.Math.Distance.Between(tankPoint.x, tankPoint.y, fish.sprite.x, fish.sprite.y);
      if (distance <= tapRadius && distance < nearestDistance) {
        nearestFish = fish;
        nearestDistance = distance;
      }
    }

    return nearestFish;
  }

  private decorationAtPointer(designX: number, designY: number): PlacedDecoration | undefined {
    if (this.activeScreen !== "tank") {
      return undefined;
    }

    const tankPoint = this.screenToTankPoint(designX, designY);
    return this.activeDecorations()
      .filter((decoration) => {
        const radiusX = Math.max(34, decoration.image.displayWidth * 0.58);
        const radiusY = Math.max(34, decoration.image.displayHeight * 0.58);
        return Math.abs(tankPoint.x - decoration.image.x) <= radiusX && Math.abs(tankPoint.y - decoration.image.y) <= radiusY;
      })
      .sort((first, second) => second.image.depth - first.image.depth || second.image.y - first.image.y)[0];
  }

  private installNativeCanvasInputFallback(): void {
    const canvas = this.game.canvas;
    let activePointerId: number | undefined;

    const designPointFromEvent = (event: PointerEvent): Phaser.Math.Vector2 | undefined => this.clientPointToDesignPoint(event.clientX, event.clientY);
    const beginNativeDecorationDrag = (decoration: PlacedDecoration) => {
      this.phaserDraggedDecoration = undefined;
      this.nativeDraggedDecoration = decoration;
      this.draggedDecoration = decoration;
      decoration.image.setAlpha(0.78);
      decoration.image.setDepth(9);
      this.showDecorationTrashTarget(true);
    };
    const endNativeFishDrag = (event?: PointerEvent) => {
      if (!this.nativeDraggedFish) {
        return;
      }

      const fish = this.nativeDraggedFish;
      const point = event ? designPointFromEvent(event) : undefined;
      if (point && tankViewportBounds.contains(point.x, point.y) && this.activeScreen === "tank") {
        const tankPoint = this.screenToTankPoint(point.x, point.y);
        fish.moveManuallyTo(tankPoint.x, tankPoint.y);
      }

      fish.endManualDrag();
      fish.sprite.setDepth(8);
      this.draggedFish = undefined;
      this.nativeDraggedFish = undefined;
      activePointerId = undefined;
      this.saveNow();
    };
    const endNativeDecorationDrag = (event?: PointerEvent) => {
      if (!this.nativeDraggedDecoration) {
        return;
      }

      const decoration = this.nativeDraggedDecoration;
      decoration.image.setAlpha(1);
      this.showDecorationTrashTarget(false);
      const point = event ? designPointFromEvent(event) : undefined;
      if (point && this.activeScreen === "tank" && decorationTrashZone.contains(point.x, point.y)) {
        this.trashDecoration(decoration);
      } else if (point && tankViewportBounds.contains(point.x, point.y) && this.activeScreen === "tank") {
        const tankPoint = this.screenToTankPoint(point.x, point.y);
        this.moveDecoration(decoration, tankPoint.x, tankPoint.y);
        this.saveNow();
      }

      this.draggedDecoration = undefined;
      this.nativeDraggedDecoration = undefined;
      this.phaserDraggedDecoration = undefined;
      activePointerId = undefined;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (this.activeScreen === "prize") {
        const point = designPointFromEvent(event);
        if (point && this.handleNativePrizePointer(point.x, point.y)) {
          event.preventDefault();
          event.stopPropagation();
        }
        return;
      }

      if (event.button !== 0 || this.htmlDockDragging || this.activeScreen !== "tank") {
        return;
      }

      const point = designPointFromEvent(event);
      if (!point || !tankViewportBounds.contains(point.x, point.y)) {
        return;
      }

      const tappedCoin = this.coinAtPointer(point.x, point.y);
      if (tappedCoin) {
        event.preventDefault();
        event.stopPropagation();
        this.collectCoin(tappedCoin, false);
        return;
      }

      const fish = this.fishAtPointer(point.x, point.y);
      if (!fish) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      activePointerId = event.pointerId;
      this.capturePointerSafely(canvas, event.pointerId);
      this.nativeDraggedFish = fish;
      this.draggedFish = fish;
      this.selectedFishIndex = this.fish.indexOf(fish);
      fish.beginManualDrag();
      fish.sprite.setDepth(14);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (activePointerId !== event.pointerId || this.activeScreen !== "tank") {
        return;
      }

      const point = designPointFromEvent(event);
      if (!point) {
        return;
      }

      event.preventDefault();
      const tankPoint = this.screenToTankPoint(point.x, point.y);
      if (this.nativeDraggedFish) {
        this.nativeDraggedFish.moveManuallyTo(tankPoint.x, tankPoint.y);
      }
    };
    const onPointerUp = (event: PointerEvent) => {
      if (activePointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      this.releasePointerSafely(canvas, event.pointerId);
      endNativeDecorationDrag(event);
      endNativeFishDrag(event);
      activePointerId = undefined;
    };
    const onPointerCancel = (event: PointerEvent) => {
      if (activePointerId !== event.pointerId) {
        return;
      }

      event.preventDefault();
      this.releasePointerSafely(canvas, event.pointerId);
      endNativeDecorationDrag(event);
      endNativeFishDrag(event);
      activePointerId = undefined;
    };

    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    canvas.addEventListener("pointermove", onPointerMove, { passive: false });
    canvas.addEventListener("pointerup", onPointerUp, { passive: false });
    canvas.addEventListener("pointercancel", onPointerCancel, { passive: false });
    this.nativeCanvasInputCleanup = () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);
      endNativeDecorationDrag();
      endNativeFishDrag();
    };
  }

  private addFishToTank(type: FishType, x: number, y: number, options: { gender?: FishGender; tankLevel?: number } = {}): Fish {
    const placedFish = new Fish(this, type, x, y, options);
    this.ensureFishTexturesLoaded(type, () => placedFish.refreshTextureIfAvailable());
    placedFish.addToContainer(this.tankLayer);
    placedFish.setTankVisible(placedFish.tankLevel === this.tankLevel);
    placedFish.sprite.setInteractive({ useHandCursor: true, draggable: true });
    this.input.setDraggable(placedFish.sprite, true);
    placedFish.sprite.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.selectedFishIndex = this.fish.indexOf(placedFish);
    });
    placedFish.sprite.on("dragstart", (_pointer: Phaser.Input.Pointer) => {
      if (this.activeScreen !== "tank" || placedFish.tankLevel !== this.tankLevel) {
        return;
      }

      this.draggedFish = placedFish;
      this.selectedFishIndex = this.fish.indexOf(placedFish);
      placedFish.beginManualDrag();
      placedFish.sprite.setDepth(14);
    });
    placedFish.sprite.on("drag", (pointer: Phaser.Input.Pointer) => {
      if (this.draggedFish !== placedFish || this.activeScreen !== "tank") {
        return;
      }

      const pointerPoint = this.pointerDesignPoint(pointer);
      const tankPoint = this.screenToTankPoint(pointerPoint.x, pointerPoint.y);
      placedFish.moveManuallyTo(tankPoint.x, tankPoint.y);
    });
    placedFish.sprite.on("dragend", (pointer: Phaser.Input.Pointer) => {
      if (this.draggedFish !== placedFish) {
        return;
      }

      const pointerPoint = this.pointerDesignPoint(pointer);
      if (this.activeScreen === "tank" && tankViewportBounds.contains(pointerPoint.x, pointerPoint.y)) {
        const tankPoint = this.screenToTankPoint(pointerPoint.x, pointerPoint.y);
        placedFish.moveManuallyTo(tankPoint.x, tankPoint.y);
      }
      placedFish.endManualDrag();
      placedFish.sprite.setDepth(8);
      this.draggedFish = undefined;
      this.saveNow();
    });
    this.fish.push(placedFish);
    return placedFish;
  }

  private placeFishWithCompatibility(type: FishType, x: number, y: number): void {
    if (this.activeFish().length >= this.maxFishCapacityForLevel()) {
      this.floatText("Active tank full", toastX, toastY, "#ffb0a8");
      return;
    }

    this.fishInventory.set(type.id, this.getFishInventory(type.id) - 1);
    this.addFishToTank(type, x, y, { tankLevel: this.tankLevel });
    this.recordDailyQuestAction("place-fish");

    this.floatTankText(`${type.name} added`, x, y - 34, "#ffffff");
    this.placementMode = { kind: "none" };
    this.closeModal();
    this.refreshUi();
    this.createFoodDock();
    this.saveNow();
  }

  private randomFishPlacement(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      Phaser.Math.Between(tankBounds.left + 70, tankBounds.right - 70),
      Phaser.Math.Between(tankBounds.top + 150, tankBounds.bottom - 120)
    );
  }

  private addDecorationToTank(
    decoration: DecorationType,
    x: number,
    y: number,
    size: DecorationSize = "m",
    tankLevel = this.tankLevel,
    depth = y > tankBounds.bottom - 80 ? 5 : 3
  ): void {
    const image = this.add.image(x, y, decoration.texture).setDepth(depth);
    this.fitDecorationDisplay(image, decoration, size);
    this.tankLayer.add(image);
    const placedDecoration = { typeId: decoration.id, size, image, tankLevel };
    image.setVisible(placedDecoration.tankLevel === this.tankLevel);
    this.placedDecorations.push(placedDecoration);
  }

  private tankDecorationDepthFromOrder(index: number): number {
    return 3 + Math.min(39, Math.max(0, index)) * 0.05;
  }

  private placeDecorationFromInventory(decoration: DecorationType, size: DecorationSize, x: number, y: number): void {
    if (this.getDecorationInventory(decoration.id, size) <= 0) {
      this.floatText("Buy one first", toastX, toastY, "#ffb0a8");
      return;
    }

    if (this.activeDecorations().length >= maxDecorations) {
      this.floatText("Decor full", toastX, toastY, "#ffb0a8");
      return;
    }

    this.consumeStoredDecoration(decoration.id, size);
    this.addDecorationToTank(decoration, x, y, size);
    this.recordDailyQuestAction("place-decoration");
    this.placementMode = { kind: "none" };
    this.refreshUi();
    this.createFoodDock();
    this.saveNow();
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

  private updateAirStoneBubbles(deltaSeconds: number, activeDecorations: PlacedDecoration[]): void {
    if (this.activeScreen === "makeup") {
      return;
    }

    if (this.activeAirStoneBubbles.size >= 16) {
      return;
    }

    for (const decoration of activeDecorations) {
      if (decoration.typeId !== "air-stone" || !decoration.image.visible) {
        continue;
      }

      decoration.bubbleCooldown = Math.max(0, (decoration.bubbleCooldown ?? 0) - deltaSeconds);
      if (decoration.bubbleCooldown > 0) {
        continue;
      }

      decoration.bubbleCooldown = Phaser.Math.FloatBetween(0.4, 0.85);
      this.spawnAirStoneBubble(decoration);
    }
  }

  private spawnAirStoneBubble(decoration: PlacedDecoration): void {
    const startX = decoration.image.x + Phaser.Math.Between(-8, 8);
    const startY = decoration.image.y - decoration.image.displayHeight * 0.24 + Phaser.Math.Between(-3, 4);
    const radius = Phaser.Math.FloatBetween(1.5, 3.2);
    const reusedBubble = this.airStoneBubblePool.pop();
    const bubble = reusedBubble ?? this.add.circle(0, 0, 2.4, 0xd7f4ff, 0.34);
    if (!reusedBubble) {
      this.tankLayer.add(bubble);
    }
    bubble
      .setPosition(startX, startY)
      .setScale(radius / 2.4)
      .setAlpha(0.34)
      .setVisible(true)
      .setActive(true)
      .setFillStyle(0xd7f4ff, 0.34)
      .setStrokeStyle(1, 0xffffff, 0.42)
      .setDepth(Math.max(6, decoration.image.depth + 1));
    this.activeAirStoneBubbles.add(bubble);
    this.tweens.add({
      targets: bubble,
      x: startX + Phaser.Math.Between(-10, 10),
      y: Math.max(tankBounds.top + 22, startY - Phaser.Math.Between(86, 148)),
      alpha: 0,
      scale: Phaser.Math.FloatBetween(1.15, 1.55),
      duration: Phaser.Math.Between(1700, 2800),
      ease: "Sine.easeOut",
      onComplete: () => {
        this.activeAirStoneBubbles.delete(bubble);
        bubble.setVisible(false).setActive(false);
        if (this.airStoneBubblePool.length < 16) {
          this.airStoneBubblePool.push(bubble);
        } else {
          bubble.destroy();
        }
      }
    });
  }

  private bindDecorationPointerGuard(decoration: PlacedDecoration): void {
    decoration.image.disableInteractive();
  }

  private startPhaserDecorationHold(decoration: PlacedDecoration, pointer: Phaser.Input.Pointer): void {
    void decoration;
    void pointer;
  }

  private beginPhaserDecorationDrag(decoration: PlacedDecoration): void {
    if (this.nativeDraggedDecoration) {
      return;
    }

    this.phaserDraggedDecoration = decoration;
    this.draggedDecoration = decoration;
    decoration.image.setAlpha(0.78);
    decoration.image.setDepth(9);
    this.showDecorationTrashTarget(true);
  }

  private updatePhaserDecorationDrag(pointer: Phaser.Input.Pointer): void {
    if (this.nativeDraggedDecoration || this.activeScreen !== "tank") {
      return;
    }

    const pointerPoint = this.pointerDesignPoint(pointer);
    if (!this.phaserDraggedDecoration) {
      return;
    }

    const tankPoint = this.screenToTankPoint(pointerPoint.x, pointerPoint.y);
    this.moveDecoration(this.phaserDraggedDecoration, tankPoint.x, tankPoint.y);
    this.highlightDecorationTrashTarget(decorationTrashZone.contains(pointerPoint.x, pointerPoint.y));
  }

  private endPhaserDecorationDrag(pointer: Phaser.Input.Pointer): void {
    const decoration = this.phaserDraggedDecoration;
    if (!decoration || this.nativeDraggedDecoration) {
      return;
    }

    decoration.image.setAlpha(1);
    this.showDecorationTrashTarget(false);
    const pointerPoint = this.pointerDesignPoint(pointer);
    if (this.activeScreen === "tank" && decorationTrashZone.contains(pointerPoint.x, pointerPoint.y)) {
      this.trashDecoration(decoration);
    } else if (this.activeScreen === "tank" && tankViewportBounds.contains(pointerPoint.x, pointerPoint.y)) {
      const tankPoint = this.screenToTankPoint(pointerPoint.x, pointerPoint.y);
      this.moveDecoration(decoration, tankPoint.x, tankPoint.y);
      this.saveNow();
    }

    this.draggedDecoration = undefined;
    this.phaserDraggedDecoration = undefined;
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
      this.floatTankText(
        creatureType.name,
        helper.sprite.x,
        helper.sprite.y - 24,
        "#d7f4ff"
      );
    });
    this.helperCreatures.push(helper);
    return helper;
  }

  private dropHelperCreatureFromInventory(creatureType: HelperCreatureType, x: number, y: number): void {
    if (this.getCreatureInventory(creatureType.id) <= 0) {
      this.floatText("Hire one first", toastX, toastY, "#ffb0a8");
      return;
    }

    if (this.activeHelperCreatureCountWithPending() >= maxHelperCreatures) {
      this.floatText("Helpers full in this tank", toastX, toastY, "#ffb0a8");
      return;
    }

    this.creatureInventory.set(creatureType.id, Math.max(0, this.getCreatureInventory(creatureType.id) - 1));
    this.recordDailyQuestAction("place-helper");
    this.createPendingHelperCreatureDrop(creatureType, x, y);
    this.floatTankText(`${creatureType.name} dropped`, x, y - 24, "#d7f4ff");
    this.placementMode = { kind: "none" };
    this.refreshUi();
    this.createFoodDock();
  }

  private activeHelperCreatureCountWithPending(): number {
    return this.activeHelperCreatures().length + this.pendingHelperCreatureDrops.filter((drop) => drop.tankLevel === this.tankLevel).length;
  }

  private createPendingHelperCreatureDrop(creatureType: HelperCreatureType, x: number, y: number): void {
    const drop: PendingHelperCreatureDrop = {
      type: creatureType,
      sprite: this.add.image(
        Phaser.Math.Clamp(x, tankBounds.left + 24, tankBounds.right - 24),
        Phaser.Math.Clamp(y, tankBounds.top + 40, helperCreatureSeabedY),
        creatureType.texture
      ),
      tankLevel: this.tankLevel,
      targetX: Phaser.Math.Clamp(x, tankBounds.left + 24, tankBounds.right - 24)
    };
    drop.sprite.setDepth(9);
    drop.sprite.setVisible(drop.tankLevel === this.tankLevel);
    this.fitPendingHelperCreatureDrop(drop, this.tankViewScaleForLevel());
    this.tankLayer.add(drop.sprite);
    this.pendingHelperCreatureDrops.push(drop);
    this.autosaveElapsed = 0;
  }

  private updatePendingHelperCreatureDrops(deltaSeconds: number): void {
    if (this.pendingHelperCreatureDrops.length === 0) {
      return;
    }

    const landedDrops: PendingHelperCreatureDrop[] = [];
    for (const drop of this.pendingHelperCreatureDrops) {
      drop.sprite.y = Math.min(helperCreatureSeabedY, drop.sprite.y + helperCreatureDropSpeed * deltaSeconds);
      if (drop.sprite.y >= helperCreatureSeabedY - 0.5) {
        landedDrops.push(drop);
      }
    }

    for (const drop of landedDrops) {
      this.landPendingHelperCreatureDrop(drop);
    }
  }

  private landPendingHelperCreatureDrop(drop: PendingHelperCreatureDrop): void {
    const index = this.pendingHelperCreatureDrops.indexOf(drop);
    if (index < 0) {
      return;
    }

    this.pendingHelperCreatureDrops.splice(index, 1);
    const x = drop.sprite.x;
    const y = helperCreatureSeabedY;
    drop.sprite.destroy();
    const helper = this.addHelperCreatureToTank(drop.type, x, y, drop.targetX, drop.tankLevel);
    this.floatTankText(`${drop.type.name} active`, helper.sprite.x, tankBounds.bottom - 62, "#a8ffb0");
    this.refreshUi();
    this.saveNow();
  }

  private fitPendingHelperCreatureDrop(drop: PendingHelperCreatureDrop, tankViewScale: number): void {
    const displayWidth = (helperCreatureDropDisplayWidths[drop.type.texture] ?? Math.min(62, drop.sprite.width)) / Math.max(0.01, tankViewScale);
    const aspectRatio = drop.sprite.height / Math.max(1, drop.sprite.width);
    drop.sprite.setDisplaySize(displayWidth, displayWidth * aspectRatio);
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
    this.prizeMachine = beginPrizeMachineSession(
      normalizePrizeMachineState(saved.prizeMachine),
      this.prizeMachineRuntimeSessionId,
      Math.random
    );
    const savedDecorations = [...saved.decorations].sort((first, second) => (first.depth ?? 0) - (second.depth ?? 0));
    for (const savedDecoration of savedDecorations) {
      const decoration = decorationTypes.find((item) => item.id === savedDecoration.typeId);
      if (decoration) {
        const savedTankLevel = Math.max(1, Math.floor(savedDecoration.tankLevel ?? 1));
        const decorationTankLevel = this.hasTankLevel(savedTankLevel) ? savedTankLevel : this.tankLevel;
        this.addDecorationToTank(
          decoration,
          savedDecoration.x,
          savedDecoration.y,
          this.sanitizeDecorationSize(savedDecoration.size),
          decorationTankLevel,
          savedDecoration.depth
        );
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
        tankLevel: savedFish.tankLevel ?? 1
      });
      restoredFish.restoreProgress(
        savedFish.ageSeconds,
        savedFish.hunger,
        savedFish.health,
        this.time.now + savedFish.nextCoinDropInMs,
        savedFish.fatalCareSeconds,
        savedFish.continuousHungrySeconds
      );
    }

    for (const savedCoin of saved.coinDrops) {
      if ((savedCoin.tankLevel ?? this.tankLevel) !== this.tankLevel || this.coinDrops.length >= maxCoinDrops) {
        continue;
      }
      this.createCoinDrop(
        savedCoin.x,
        savedCoin.y,
        savedCoin.value,
        savedCoin.coinType,
        savedCoin.isMega,
        {
          landingX: savedCoin.landingX,
          bottomY: savedCoin.bottomY
        }
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
      const hungerBeforeOffline = currentFish.hunger;
      const canProduce = currentFish.state !== "ill" && currentFish.health >= 35 && currentFish.hunger < 86;
      if (canProduce) {
        const targetCalories = (currentFish.fullCaloriesNeed() / 3600) * elapsedSeconds;
        const convertedCalories = Math.min(currentFish.currentFullnessCalories(), targetCalories);
        const amount = Math.floor(currentFish.coinProductionValueForCalories(convertedCalories));
        if (amount > 0) {
          currentFish.consumeFullnessCalories(convertedCalories);
          earned.common += amount;
          const tankEarned = earnedByTank.get(currentFish.tankLevel) ?? createEmptyWallet();
          tankEarned.common += amount;
          earnedByTank.set(currentFish.tankLevel, tankEarned);
        }
      }

      currentFish.setAgeSeconds(currentFish.ageSeconds + elapsedSeconds);

      if (currentFish.hunger > 68) {
        const hungerIncrease = currentFish.hunger - hungerBeforeOffline;
        const thresholdCrossingSeconds = hungerBeforeOffline > 68 || hungerIncrease <= 0
          ? 0
          : Phaser.Math.Clamp(((68 - hungerBeforeOffline) / hungerIncrease) * elapsedSeconds, 0, elapsedSeconds);
        currentFish.addContinuousHungerSeconds(elapsedSeconds - thresholdCrossingSeconds);
      } else {
        currentFish.setContinuousHungerSeconds(0);
      }

      if (currentFish.hunger > 86) {
        currentFish.health = Phaser.Math.Clamp(currentFish.health - Math.min(45, elapsedSeconds / 120), 0, 100);
      }

      currentFish.addFatalCareSeconds(currentFish.isInFatalCareState() ? elapsedSeconds : 0);
      if (currentFish.isDeadFromNeglect()) {
        offlineDeaths.push(currentFish);
      }

      currentFish.nextCoinDropAt = 0;
      currentFish.resumeAfterOfflineProgress();
    }

    for (const deadFish of offlineDeaths) {
      const index = this.fish.indexOf(deadFish);
      if (index >= 0) {
        this.removeFishAt(index);
      }
    }

    this.cleanliness = Phaser.Math.Clamp(
      this.cleanliness - Math.min(84, elapsedSeconds * this.tankDirtRatePerSecond(this.fish.length)),
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

  private savedCoinDrops(): SavedCoinDrop[] {
    return this.coinDrops.map((coin) => ({
      tankLevel: this.tankLevel,
      x: coin.sprite.x,
      y: coin.sprite.y,
      value: coin.value,
      coinType: coin.coinType,
      isMega: coin.isMega,
      landingX: coin.landingX,
      bottomY: coin.bottomY
    }));
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
        continuousHungrySeconds: currentFish.continuousHungrySeconds,
        gender: currentFish.gender,
        tankLevel: currentFish.tankLevel
      })),
      decorations: this.placedDecorations.map((decoration) => ({
        typeId: decoration.typeId,
        tankLevel: decoration.tankLevel,
        x: decoration.image.x,
        y: decoration.image.y,
        size: decoration.size,
        depth: decoration.image.depth
      })),
      helperCreatures: this.helperCreatures.map((helper) => ({
        typeId: helper.type.id,
        tankLevel: helper.tankLevel,
        x: helper.sprite.x,
        y: helper.sprite.y,
        targetX: helper.getTargetX()
      })),
      coinDrops: this.savedCoinDrops(),
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
      prizeMachine: normalizePrizeMachineState(this.prizeMachine)
    };

    saveGame(snapshot);
  }

  private spendPrice(price: FishType["price"]): boolean {
    if (this.developerGodMode) {
      return true;
    }

    if (!spend(this.wallet, price)) {
      this.floatText(`Need ${formatPrice(price)}`, toastX, toastY, "#ffb0a8");
      return false;
    }

    return true;
  }

  private updateFishCoinProduction(fish: Fish): void {
    const now = this.time.now;
    if (!fish.canDropCoin(now)) {
      if (fish.nextCoinDropAt > 0 && now >= fish.nextCoinDropAt) {
        fish.postponeCoinProduction(now, Phaser.Math.Between(5000, 30000));
      }
      return;
    }

    if (this.coinDrops.length >= maxCoinDrops) {
      fish.postponeCoinProduction(now);
      return;
    }

    const value = fish.takeCoinProductionDrop(now);
    if (value <= 0) {
      return;
    }

    this.createCoinDrop(
      fish.sprite.x + Phaser.Math.Between(-18, 18),
      fish.sprite.y + Phaser.Math.Between(-28, -14),
      value,
      "common"
    );
  }

  private createCoinDrop(
    x: number,
    y: number,
    value: number,
    coinType: CoinType,
    isMega = false,
    options: { landingX?: number; bottomY?: number } = {}
  ): CoinDrop {
    const coin = new CoinDrop(this, x, y, value, coinType, isMega, options);
    coin.setWorldScaleCompensation(this.tankViewScaleForLevel());
    coin.addToContainer(this.tankLayer);
    const collect = (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.collectCoin(coin, false);
    };
    coin.hitZone.on("pointerdown", collect);
    coin.sprite.on("pointerdown", collect);
    this.coinDrops.push(coin);
    this.setCoinDropVisible(coin, this.activeScreen !== "makeup");
    return coin;
  }

  private setCoinDropVisible(coin: CoinDrop, visible: boolean): void {
    coin.sprite.setVisible(visible);
    coin.hitZone.setVisible(visible);
    coin.shimmer.setVisible(visible);
    coin.valueText.setVisible(visible);
    if (visible) {
      coin.hitZone.setInteractive({ useHandCursor: true });
      coin.sprite.setInteractive({ useHandCursor: true });
    } else {
      coin.hitZone.disableInteractive();
      coin.sprite.disableInteractive();
    }
  }

  private collectCoin(coin: CoinDrop, automated: boolean): void {
    if (!this.coinDrops.includes(coin)) {
      return;
    }

    const fee = automated ? Math.floor(coin.value * automatedCoinCollectFeeRate) : 0;
    const claimedValue = Math.max(0, coin.value - fee);
    earn(this.wallet, coin.coinType, claimedValue);
    this.recordDailyQuestAction("coin");
    this.floatCoinClaimText(claimedValue, coin.coinType, coin.sprite.x, coin.sprite.y - 20, coin.visual.textColor, automated, fee);
    if (!automated) {
      this.playSfx(coinCollectSoundKey, { volume: 0.24, detune: this.coinCollectDetune(coin.coinType) });
      this.registerCoinCombo(coin.sprite.x, coin.sprite.y - 42, claimedValue * coinWealthValue[coin.coinType]);
    }
    this.coinDrops = this.coinDrops.filter((drop) => drop !== coin);
    coin.destroy();
    this.refreshUi();
    this.saveNow();
  }

  private useCoinMagnetAtClientPoint(clientX: number, clientY: number, showEmptyMessage: boolean): void {
    const point = this.clientPointToDesignPoint(clientX, clientY);
    if (!point || !tankViewportBounds.contains(point.x, point.y)) {
      return;
    }

    const tankPoint = this.screenToTankPoint(point.x, point.y);
    this.useCoinMagnetAt(tankPoint.x, tankPoint.y, showEmptyMessage);
  }

  private useCoinMagnetAt(x: number, y: number, showEmptyMessage = true): void {
    if (!this.hasCoinMagnet()) {
      return;
    }

    if (this.magnetCollectingCoins.size > 0) {
      return;
    }

    let nearestCoin: CoinDrop | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const coin of this.coinDrops) {
      if (this.magnetCollectingCoins.has(coin)) {
        continue;
      }
      const distance = Phaser.Math.Distance.Between(x, y, coin.sprite.x, coin.sprite.y);
      if (distance <= coinMagnetCollectRadius && distance < nearestDistance) {
        nearestCoin = coin;
        nearestDistance = distance;
      }
    }

    if (!nearestCoin) {
      if (showEmptyMessage) {
        this.floatTankText("No coins nearby", x, y - 22, "#d7f4ff");
      }
      return;
    }

    const coinToCollect = nearestCoin;
    this.floatTankText("Magnet", x, y - 28, "#9eeeff");
    this.magnetCollectingCoins.add(coinToCollect);
    coinToCollect.hitZone.disableInteractive();
    coinToCollect.sprite.disableInteractive();
    this.tweens.add({
      targets: [coinToCollect.sprite, coinToCollect.hitZone, coinToCollect.shimmer, coinToCollect.valueText],
      x,
      y,
      scale: 0.72,
      duration: coinMagnetAttractDurationMs,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.magnetCollectingCoins.delete(coinToCollect);
        this.collectCoin(coinToCollect, false);
      }
    });
  }

  private playSfx(key: string, config: Phaser.Types.Sound.SoundConfig = {}): void {
    if (!this.settings.sound || !this.cache.audio.exists(key)) {
      return;
    }

    this.sound.play(key, config);
  }

  private syncBackgroundMusic(): void {
    if (!this.cache.audio.exists(backgroundMusicKey)) {
      return;
    }

    const musicVolume = this.normalizedMusicVolume();
    if (!this.backgroundMusic) {
      this.backgroundMusic = this.sound.add(backgroundMusicKey, {
        loop: true,
        volume: musicVolume
      });
    }
    (this.backgroundMusic as AdjustableSound).setVolume(musicVolume);

    if (this.settings.music) {
      if (!this.backgroundMusic.isPlaying) {
        this.backgroundMusic.play();
      }
      return;
    }

    if (this.backgroundMusic.isPlaying) {
      this.backgroundMusic.stop();
    }
  }

  private normalizedMusicVolume(): number {
    return Phaser.Math.Clamp(this.settings.musicVolume, 0, 100) / 100;
  }

  private coinCollectDetune(coinType: CoinType): number {
    if (coinType === "rare") {
      return 220;
    }
    if (coinType === "superRare") {
      return 440;
    }
    return 120;
  }

  private registerCoinCombo(x: number, y: number, collectedCommonValue: number): void {
    this.coinComboCount += 1;
    this.coinComboCollectedValue += Math.max(0, collectedCommonValue);
    this.coinComboLastPosition.set(x, y);

    if (this.coinComboCount >= 2) {
      this.showCoinComboOverlay(`${formatNumber(this.coinComboCount)}x COMBO`);
    }

    this.coinComboTimer?.remove(false);
    this.coinComboTimer = this.time.delayedCall(coinComboWindowMs, () => this.resolveCoinCombo());
  }

  private resolveCoinCombo(): void {
    const comboCount = this.coinComboCount;
    const collectedValue = this.coinComboCollectedValue;
    const position = this.coinComboLastPosition.clone();
    this.coinComboCount = 0;
    this.coinComboCollectedValue = 0;
    this.coinComboTimer = undefined;

    const bonusPercent = comboCount * coinComboRewardPercentPerCount;
    const bonus = Math.floor(collectedValue * (bonusPercent / 100));
    if (bonus <= 0) {
      return;
    }

    earn(this.wallet, "common", bonus);
    this.showCoinComboOverlay(`BONUS C${formatNumber(bonus)}!`, true, coinComboRewardTextDurationMs);
    this.floatTankText(`BONUS C${formatNumber(bonus)}!`, position.x, position.y - 24, coinVisualsByType.common.textColor);
    this.refreshUi(false);
    this.saveNow();
  }

  private showCoinComboOverlay(message: string, bonus = false, durationMs?: number): void {
    this.coinComboOverlay ??= this.createCoinComboOverlay();
    this.coinComboOverlay.textContent = message;
    this.coinComboOverlay.classList.toggle("is-bonus", bonus);
    this.coinComboOverlay.style.animationDuration = durationMs ? `${durationMs}ms` : "";
    this.coinComboOverlay.classList.remove("is-showing");
    this.coinComboOverlay.getBoundingClientRect();
    this.coinComboOverlay.classList.add("is-showing");
  }

  private createCoinComboOverlay(): HTMLDivElement {
    const overlay = document.createElement("div");
    overlay.className = "aq-coin-combo";
    overlay.setAttribute("aria-live", "polite");
    document.body.appendChild(overlay);
    return overlay;
  }

  private removeFood(food: FoodPellet): void {
    this.foods = this.foods.filter((item) => item !== food);
    food.destroy();
  }

  private assignFoodsToFish(tankFish: Fish[]): Map<Fish, FoodPellet[]> {
    const assignments = new Map<Fish, FoodPellet[]>();
    if (this.foods.length === 0 || tankFish.length === 0) {
      return assignments;
    }

    for (const food of this.foods) {
      const assignedFish = this.fishAssignedToFood(food, tankFish);
      if (!assignedFish) {
        continue;
      }

      const fishFoods = assignments.get(assignedFish);
      if (fishFoods) {
        fishFoods.push(food);
      } else {
        assignments.set(assignedFish, [food]);
      }
    }

    return assignments;
  }

  private fishAssignedToFood(food: FoodPellet, tankFish: Fish[]): Fish | undefined {
    let bestFish: Fish | undefined;
    let bestDistance = Number.POSITIVE_INFINITY;

    for (const currentFish of tankFish) {
      if (!currentFish.canChaseFood(food)) {
        continue;
      }

      const distance = Phaser.Math.Distance.BetweenPoints(currentFish.sprite, food.sprite);
      if (!bestFish) {
        bestFish = currentFish;
        bestDistance = distance;
        continue;
      }

      const hungerGap = currentFish.hunger - bestFish.hunger;
      if (hungerGap > 0.1 || (Math.abs(hungerGap) <= 0.1 && distance < bestDistance)) {
        bestFish = currentFish;
        bestDistance = distance;
      }
    }

    return bestFish;
  }

  private removeExpiredFood(): void {
    const expiredFoods = this.foods.filter((food) => food.isExpired());
    if (expiredFoods.length === 0) {
      return;
    }

    this.foods = this.foods.filter((food) => !food.isExpired());
    for (const food of expiredFoods) {
      this.refundUnusedFood(food);
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
    this.storeOverlay?.refresh();
    if (this.activeScreen === "prize" || this.activeScreen === "makeup") {
      this.hideHtmlPageOverlay();
    } else if (this.activeScreen !== "tank" && this.activeScreen !== "store") {
      this.syncHtmlPageOverlay();
    }
    if (renderControls) {
      this.createFoodDock();
      if (this.activeScreen === "store") {
        this.openStoreOverlay();
      } else {
        this.renderTabControls();
      }
    }
    this.refreshStatus();
    this.syncHtmlGameInterface();
  }

  private refreshStatus(): void {
    this.hudStatusSyncElapsed = 0;
    this.syncHtmlHud();
  }

  private getCareStatusLabel(): string {
    return `Food ${formatNumber(this.getTotalFoodInventory())}   Clean ${formatNumber(Math.round(this.cleanliness))}%   Happy ${formatNumber(Math.round(this.calculateTankHappiness()))}%`;
  }

  private tankHudSnapshotText(): string {
    return `C:${formatNumber(this.wallet.common)}   R:${formatNumber(this.wallet.rare)}   SR:${formatNumber(this.wallet.superRare)}   W:${formatNumber(this.calculateTankNetWorth())}`;
  }

  private tankStatusSnapshotText(): string {
    return `${this.getTankName(this.tankLevel)} Lv${formatNumber(this.tankDisplayLevel())}`;
  }

  private tankCareSnapshotText(): string {
    const counts = this.activeFish().reduce(
      (summary, currentFish) => {
        summary[currentFish.state] += 1;
        return summary;
      },
      { happy: 0, hungry: 0, ill: 0 } as Record<FishState, number>
    );
    const needLabel = this.activeFish().length > 0
      ? `${this.getHudNeedLabel()}   H${formatNumber(counts.happy)} Hu${formatNumber(counts.hungry)} I${formatNumber(counts.ill)}`
      : this.getHudNeedLabel();
    return `${this.getCareStatusLabel()} | ${needLabel}`;
  }

  private syncCleanlinessUi(): void {
    this.syncHtmlHud();
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

    return this.getTankNeedIndicator();
  }

  private foodDockLabel(foodType: FoodType): string {
    if (foodType.id === "medicine") {
      return "Med";
    }
    if (foodType.id === "ageBoost") {
      return "Boost";
    }
    if (foodType.id === "creature") {
      return "Creature";
    }

    return foodType.name
      .replace(" Food", "")
      .replace(" Flakes", "")
      .replace(" Bites", "")
      .replace(" Dust", "")
      .replace(" Treat", "")
      .replace(" Small", " S")
      .replace(" Medium", " M")
      .replace(" Large", " L")
      .replace(" XL", " XL");
  }

  private foodBadgeLabel(count: number): string {
    return cappedFoodCountLabel(count);
  }

  private foodInventoryBadgeLabel(foodType: FoodType): string {
    return foodInventoryBadgeLabelModel(foodType, this.getFoodInventory(foodType.id));
  }

  private foodInventoryDisplayCount(foodType: FoodType): number {
    return foodInventoryDisplayCountModel(foodType, this.getFoodInventory(foodType.id));
  }

  private foodTextureKey(foodTypeId: FoodTypeId): string {
    return `food-${foodTypeId}`;
  }

  private isDroppableFood(foodTypeId: FoodTypeId): boolean {
    return isDroppableFoodModel(foodTypeId);
  }

  private isCalorieTrackedFood(foodTypeId: FoodTypeId): boolean {
    return isCalorieTrackedFoodModel(foodTypeId);
  }

  private getFishInventory(fishTypeId: string): number {
    return this.fishInventory.get(fishTypeId) ?? 0;
  }

  private getFoodInventory(foodTypeId: FoodTypeId): number {
    return this.foodInventory.get(foodTypeId) ?? 0;
  }

  private getFoodBuyQuantity(foodTypeId: FoodTypeId): number {
    return foodBuyQuantityModel(this.foodBuyQuantities, foodTypeId);
  }

  private addFoodBuyQuantity(foodTypeId: FoodTypeId, quantityToAdd: number): void {
    this.foodBuyQuantities.set(foodTypeId, addedFoodBuyQuantityModel(this.foodBuyQuantities, foodTypeId, quantityToAdd, maxFoodBuyQuantity));
    this.renderTabControls();
    this.refreshUi(false);
  }

  private setFoodBuyQuantity(foodTypeId: FoodTypeId, quantity: number): void {
    const nextQuantity = setFoodBuyQuantityValue(quantity, maxFoodBuyQuantity);
    if (nextQuantity === undefined) {
      this.resetFoodBuyQuantity(foodTypeId);
      return;
    }

    this.foodBuyQuantities.set(foodTypeId, nextQuantity);
    this.renderTabControls();
    this.refreshUi(false);
  }

  private resetFoodBuyQuantity(foodTypeId: FoodTypeId): void {
    this.foodBuyQuantities.delete(foodTypeId);
    this.renderTabControls();
    this.refreshUi(false);
  }

  private foodBuyQuantityRecord(): Record<string, number> {
    return foodBuyQuantityRecordModel(foodTypes, this.foodBuyQuantities);
  }

  private quantityPrice(price: FishType["price"], quantity: number): FishType["price"] {
    const multiplier = Phaser.Math.Clamp(Math.floor(quantity), 1, 99);
    return {
      coinType: price.coinType,
      amount: price.amount * multiplier,
      rareAmount: (price.rareAmount ?? 0) * multiplier || undefined,
      superRareAmount: (price.superRareAmount ?? 0) * multiplier || undefined
    };
  }

  private getTotalFoodInventory(): number {
    return foodTypes
      .filter((foodType) => !hiddenFoodTypeIds.has(foodType.id))
      .reduce((total, foodType) => total + this.foodInventoryDisplayCount(foodType), 0);
  }

  private getTotalFeedableFoodInventory(): number {
    return totalFeedableFoodInventoryModel(this.getFeedableFoodTypes(), (foodType) => this.foodInventoryDisplayCount(foodType));
  }

  private getTotalDispenserInventory(): number {
    return this.getTotalFeedableFoodInventory() + this.getFoodInventory("medicine");
  }

  private getFeedableFoodTypes(): FoodType[] {
    return feedableFoodTypes(foodTypes, (foodTypeId) => this.getFoodInventory(foodTypeId));
  }

  private foodInventoryRecord(): Record<FoodTypeId, number> {
    return foodInventoryRecordModel(this.foodInventory);
  }

  private getSelectedFoodType(): FoodType {
    return foodTypes.find((foodType) => foodType.id === this.selectedFoodTypeId) ?? basicFood;
  }

  private describeFoodInventory(): string {
    return describeFoodInventoryModel(
      foodTypes,
      (foodType) => this.getFoodInventory(foodType.id),
      (foodType) => this.foodInventoryBadgeLabel(foodType)
    );
  }

  private decorationInventoryKey(decorationTypeId: string, size: DecorationSize): string {
    return `${decorationTypeId}:${size}`;
  }

  private sanitizeDecorationSize(size: string | undefined): DecorationSize {
    return decorationSizeOrder.includes(size as DecorationSize) ? size as DecorationSize : "m";
  }

  private decorationVariantPrice(decorationType: DecorationType, size: DecorationSize): Price {
    return tankCatalogDecorationVariantPrice(decorationType, size);
  }

  private getDecorationInventory(decorationTypeId: string, size: DecorationSize = "m"): number {
    const variantCount = this.decorationInventory.get(this.decorationInventoryKey(decorationTypeId, size)) ?? 0;
    if (size === "m") {
      return variantCount + (this.decorationInventory.get(decorationTypeId) ?? 0);
    }
    return variantCount;
  }

  private consumeStoredDecoration(decorationTypeId: string, size: DecorationSize): void {
    const legacyCount = size === "m" ? this.decorationInventory.get(decorationTypeId) ?? 0 : 0;
    if (legacyCount > 0) {
      const nextLegacyCount = legacyCount - 1;
      if (nextLegacyCount > 0) {
        this.decorationInventory.set(decorationTypeId, nextLegacyCount);
      } else {
        this.decorationInventory.delete(decorationTypeId);
      }
      return;
    }

    const inventoryKey = this.decorationInventoryKey(decorationTypeId, size);
    const nextCount = Math.max(0, (this.decorationInventory.get(inventoryKey) ?? 0) - 1);
    if (nextCount > 0) {
      this.decorationInventory.set(inventoryKey, nextCount);
    } else {
      this.decorationInventory.delete(inventoryKey);
    }
  }

  private getPlacedDecorationCount(decorationTypeId: string, size: DecorationSize, level = this.tankLevel): number {
    return this.placedDecorations.filter((decoration) =>
      decoration.tankLevel === level &&
      decoration.typeId === decorationTypeId &&
      this.sanitizeDecorationSize(decoration.size) === size
    ).length;
  }

  private getOwnedDecorationCount(decorationTypeId: string, size: DecorationSize, level = this.tankLevel): number {
    return this.getDecorationInventory(decorationTypeId, size) + this.getPlacedDecorationCount(decorationTypeId, size, level);
  }

  private clearStoredDecorationInventory(decorationTypeId: string, size: DecorationSize): void {
    this.decorationInventory.delete(this.decorationInventoryKey(decorationTypeId, size));
    if (size === "m") {
      this.decorationInventory.delete(decorationTypeId);
    }
  }

  private removePlacedDecorationsFromActiveTank(decorationTypeId: string, size: DecorationSize): void {
    const keptDecorations: PlacedDecoration[] = [];
    for (const decoration of this.placedDecorations) {
      const matchesActiveTank =
        decoration.tankLevel === this.tankLevel &&
        decoration.typeId === decorationTypeId &&
        this.sanitizeDecorationSize(decoration.size) === size;

      if (matchesActiveTank) {
        decoration.image.destroy();
      } else {
        keptDecorations.push(decoration);
      }
    }

    this.placedDecorations = keptDecorations;
  }

  private removeAllPlacedDecorationsFromActiveTank(): void {
    const keptDecorations: PlacedDecoration[] = [];
    for (const decoration of this.placedDecorations) {
      if (decoration.tankLevel === this.tankLevel) {
        decoration.image.destroy();
      } else {
        keptDecorations.push(decoration);
      }
    }

    this.placedDecorations = keptDecorations;
  }

  private hasFoodDispenser(): boolean {
    return (this.decorationInventory.get(foodDispenserInventoryKey) ?? 0) > 0;
  }

  private hasCoinMagnet(): boolean {
    return this.coinMagnetExpiresAt() > Date.now();
  }

  private coinMagnetExpiresAt(): number {
    return Math.max(0, this.decorationInventory.get(coinMagnetInventoryKey) ?? 0);
  }

  private coinMagnetRemainingMinutes(): number {
    return Math.max(1, Math.ceil(Math.max(0, this.coinMagnetExpiresAt() - Date.now()) / 60_000));
  }

  private getCreatureInventory(creatureTypeId: string): number {
    return this.creatureInventory.get(creatureTypeId) ?? 0;
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

  private getNextTankUpgradePrice(): FishType["price"] {
    return this.tankPriceForLevel(this.nextUnownedTankLevel());
  }

  private tankPriceForLevel(targetLevel: number): FishType["price"] {
    if (targetLevel <= 1) {
      return { coinType: "common", amount: 0 };
    }

    const sanitizedTargetLevel = Math.max(2, Math.floor(targetLevel));
    const configuredPrice = tankUpgradePrices[sanitizedTargetLevel];
    if (configuredPrice) {
      return configuredPrice;
    }

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
      this.refundUnusedFood(food);
      food.destroy();
    }
    for (const coin of this.coinDrops) {
      coin.destroy();
    }
    for (const drop of this.pendingHelperCreatureDrops) {
      drop.sprite.destroy();
    }
    this.foods = [];
    this.coinDrops = [];
    this.pendingHelperCreatureDrops = [];
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
    for (const drop of this.pendingHelperCreatureDrops) {
      drop.sprite.setVisible(drop.tankLevel === this.tankLevel);
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
    return priceComponents(price).reduce((total, [coinType, amount]) => total + amount * coinWealthValue[coinType], 0);
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
    const fishValue = this.fish.reduce((total, currentFish) => total + this.activeFishSellValue(currentFish), 0);
    const activeFishValue = fishInTank.reduce((total, currentFish) => total + this.activeFishSellValue(currentFish), 0);
    const foodValue = [...foodInventory.entries()].reduce((total, [foodTypeId, count]) => {
      if (hiddenFoodTypeIds.has(foodTypeId)) {
        return total;
      }
      const foodType = foodTypes.find((item) => item.id === foodTypeId);
      if (!foodType) {
        return total;
      }
      const unitRatio = this.isCalorieTrackedFood(foodType.id) ? count / Math.max(1, foodType.calories) : count;
      return total + this.priceWealth(foodType.price) * unitRatio;
    }, 0);
    const storedFishValue = [...fishInventory.entries()].reduce((total, [fishTypeId, count]) => {
      const fishType = fishTypes.find((item) => item.id === fishTypeId);
      return total + (fishType ? this.storedFishSellValue(fishType) * count : 0);
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
    const state = this.ensureTankState(level);
    const currentLevel = this.rawTankDisplayLevelFromWorth(this.calculateTankNetWorth(level));
    if (currentLevel > (state.maxDisplayLevel ?? 1)) {
      state.maxDisplayLevel = currentLevel;
    }
    return Math.max(1, state.maxDisplayLevel ?? currentLevel);
  }

  private rawTankDisplayLevelFromWorth(worth: number): number {
    return Math.max(1, Math.floor(Math.log10(Math.max(1, worth) / 250 + 1)) + 1);
  }

  private getTankNeedIndicator(): string {
    const nextTankLevel = this.nextUnownedTankLevel();
    const nextTankPrice = this.tankPriceForLevel(nextTankLevel);
    const canBuyTankType = nextTankLevel <= maxPurchasableTankLevel;

    if (canBuyTankType && canAfford(this.wallet, nextTankPrice)) {
      return `Ready: buy ${storeTankNames[nextTankLevel] ?? "tank"} (${formatPriceLong(nextTankPrice)})`;
    }

    if (this.activeFish().length === 0) {
      return `Tank Lv${formatNumber(this.tankDisplayLevel())} | Worth ${formatNumber(this.calculateTankNetWorth())}`;
    }

    if (this.getTotalFoodInventory() === 0 && this.fish.some((currentFish) => currentFish.hunger >= 45)) {
      return "Tank needs food purchase";
    }

    if (this.coinDrops.length >= maxCoinDrops) {
      return "Tank needs coin collection";
    }

    if (!canBuyTankType) {
      return `Tank Lv${formatNumber(this.tankDisplayLevel())} | Worth ${formatNumber(this.calculateTankNetWorth())}`;
    }

    return `${storeTankNames[nextTankLevel] ?? "Next tank"}: ${formatPriceLong(nextTankPrice)}`;
  }

  private getCompactTankNeedIndicator(): string {
    const nextTankLevel = this.nextUnownedTankLevel();
    const nextTankPrice = this.tankPriceForLevel(nextTankLevel);
    const canBuyTankType = nextTankLevel <= maxPurchasableTankLevel;

    if (canBuyTankType && canAfford(this.wallet, nextTankPrice)) {
      return `Buy ${storeTankNames[nextTankLevel] ?? "Tank"}: ${formatPriceLong(nextTankPrice)}`;
    }

    if (this.getTotalFoodInventory() === 0 && this.fish.some((currentFish) => currentFish.hunger >= 45)) {
      return "Need food";
    }

    if (this.coinDrops.length >= maxCoinDrops) {
      return "Collect coins";
    }

    if (!canBuyTankType) {
      return `Lv${formatNumber(this.tankDisplayLevel())} Worth ${formatNumber(this.calculateTankNetWorth())}`;
    }

    return `${storeTankNames[nextTankLevel] ?? "Next Tank"}: ${formatPriceLong(nextTankPrice)}`;
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

  private calculateCompatibilityForTypes(_types: FishType[], _candidate?: FishType): CompatibilitySummary {
    return { score: 100, level: "good", warnings: [], incompatibleNames: [] };
  }

  private updateTankCleanliness(deltaSeconds: number, activeFishCount = this.activeFish().length): void {
    if (this.cleaningTank) {
      const previousCleanliness = this.cleanliness;
      this.cleanliness = Phaser.Math.Clamp(this.cleanliness + tankCleaningRatePerSecond * deltaSeconds, 0, 100);
      if (Math.floor(previousCleanliness) !== Math.floor(this.cleanliness)) {
        this.syncCleanlinessUi();
      }
      if (this.cleanliness >= 100) {
        this.cleaningTank = false;
        this.cleanedAt = Date.now();
        this.updateDirtyTankOverlay();
        this.floatText("Tank cleaned", toastX, toastY, "#a8ffb0");
        this.syncCleanlinessUi();
        this.saveNow();
      }
      return;
    }

    this.cleanliness = Phaser.Math.Clamp(this.cleanliness - this.tankDirtRatePerSecond(activeFishCount) * deltaSeconds, 0, 100);
  }

  private tankDirtRatePerSecond(activeFishCount: number): number {
    return Math.min(
      maxTankDirtPerSecond,
      baseTankDirtPerSecond + activeFishCount * fishTankDirtPerSecond + this.foods.length * looseFoodTankDirtPerSecond
    );
  }

  private cleanTank(): void {
    if (this.cleanliness >= 100) {
      this.floatText("Already clean", toastX, toastY, "#d7f4ff");
      return;
    }

    if (this.cleaningTank) {
      this.floatText("Cleaning...", toastX, toastY, "#d7f4ff");
      return;
    }

    this.cleaningTank = true;
    this.recordDailyQuestAction("clean");
    this.floatText("Cleaning...", toastX, toastY, "#a8ffb0");
    this.refreshUi(false);
    this.saveNow();
  }

  private updateFoodDispenser(tankFish = this.activeFish()): void {
    if (!this.hasFoodDispenser()) {
      return;
    }

    if (this.time.now < this.nextFoodDispenseAt) {
      return;
    }

    if (hasPendingDispenserFoodModel(this.foods)) {
      return;
    }
    if (this.foods.length >= maxFoodDrops) {
      return;
    }

    const medicineTarget = findMedicineDispenserTargetModel(tankFish, this.getFoodInventory("medicine"));
    const targetFish = medicineTarget ?? findFoodDispenserTargetModel(tankFish);
    if (!targetFish) {
      return;
    }

    const foodType = medicineTarget ? foodTypes.find((item) => item.id === "medicine") : this.chooseAutoFoodForFish(targetFish);
    if (!foodType) {
      return;
    }

    this.nextFoodDispenseAt = this.time.now + foodDispenserMinIntervalMs;
    const outlet = this.foodDispenserOutletPosition();
    const reservedCalories = this.reserveFoodForDrop(foodType);
    if (reservedCalories <= 0) {
      return;
    }
    const targetDirection = Math.sign(targetFish.sprite.x - outlet.x) || 1;
    const pellet = new FoodPellet(this, outlet.x, outlet.y, foodType, {
      velocityX: Phaser.Math.Between(70, 145) * targetDirection,
      velocityY: -Phaser.Math.Between(120, 220),
      displayScale: foodDispenserPelletScale,
      reservedCalories,
      source: "dispenser"
    });
    pellet.setWorldScaleCompensation(this.tankViewScaleForLevel());
    pellet.addToContainer(this.tankLayer);
    this.foods.push(pellet);
    this.cleanliness = Phaser.Math.Clamp(this.cleanliness - 0.4, 0, 100);
    this.floatTankText(foodType.id === "medicine" ? "Medicine" : "Food", outlet.x + 18, outlet.y - 10, foodType.id === "medicine" ? "#a8ffb0" : "#f7ff9a");
    this.createFoodDock();
    this.refreshUi(false);
    this.saveNow();
  }

  private foodDispenserOutletPosition(): Phaser.Math.Vector2 {
    const sourceElement = this.foodDispenserElement?.querySelector("img") ?? this.foodDispenserElement;
    const dispenserRect = sourceElement?.getBoundingClientRect();
    const canvasRect = this.game.canvas.getBoundingClientRect();
    if (dispenserRect && dispenserRect.width > 0 && dispenserRect.height > 0 && canvasRect.width > 0 && canvasRect.height > 0) {
      const clientX = dispenserRect.left + dispenserRect.width * foodDispenserOutletRatio.x;
      const clientY = dispenserRect.top + dispenserRect.height * foodDispenserOutletRatio.y;
      const designX = Phaser.Math.Clamp(((clientX - canvasRect.left) / canvasRect.width) * gameWidth, 0, gameWidth);
      const designY = Phaser.Math.Clamp(((clientY - canvasRect.top) / canvasRect.height) * gameHeight, 0, gameHeight);
      return this.screenToTankPoint(designX, designY);
    }

    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp(tankBounds.left + 58, tankBounds.left + 12, tankBounds.right - 12),
      Phaser.Math.Clamp(this.foodDispenserY + 34, tankBounds.top + 24, tankBounds.bottom - 18)
    );
  }

  private updateHelperCreatures(deltaSeconds: number, tankFish = this.activeFish(), activeHelpers = this.activeHelperCreatures()): void {
    for (const helper of activeHelpers) {
      const action = helper.update(deltaSeconds, this.coinDrops, this.foods, tankFish);

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

      if (action.kind === "tankClean" && this.cleanliness < 100) {
        this.cleanliness = Phaser.Math.Clamp(this.cleanliness + 1, 0, 100);
        this.cleanedAt = Date.now();
        this.floatTankText("+1% Clean", helper.sprite.x, helper.sprite.y - 20, "#a8ffb0");
        this.refreshUi(false);
        this.saveNow();
      }
    }
  }

  private chooseAutoFoodForFish(targetFish: Fish): FoodType | undefined {
    const candidates = foodTypes.filter(
      (foodType) =>
        this.isCalorieTrackedFood(foodType.id) &&
        this.isDroppableFood(foodType.id) &&
        this.getFoodInventory(foodType.id) > 0
    );

    return this.chooseBestCalorieFood(targetFish, candidates);
  }

  private chooseBestCalorieFood(targetFish: Fish, candidates: FoodType[]): FoodType | undefined {
    return bestCalorieFoodForTarget(candidates, targetFish.mealCaloriesNeeded(), (foodTypeId) => this.getFoodInventory(foodTypeId));
  }

  private foodNeedMessage(targetCalories: number): string {
    return recommendedFoodName(foodTypes, targetCalories);
  }

  private normalizeDailyGoals(savedGoals: DailyGoalsState | undefined): DailyGoalsState {
    return normalizeDailyGoalsModel(savedGoals, this.localDateKey());
  }

  private dailyQuestItems(): DailyQuestItem[] {
    const nextTankLevel = this.nextUnownedTankLevel();
    const nextTankPrice = nextTankLevel <= maxOwnedTanks ? this.tankPriceForLevel(nextTankLevel) : undefined;
    return buildDailyQuestItems({
      affordableCommonFish: fishTypes.some((fishType) => fishType.rarity === "common" && canAfford(this.wallet, fishType.price)),
      nextTankName: storeTankNames[nextTankLevel] ?? "new tank",
      nextTankPrice,
      maxOwnedTanksReached: this.ownedTankLevels.size >= maxOwnedTanks,
      activeFishCount: this.activeFish().length,
      activeDecorationCount: this.activeDecorations().length,
      activeHelperCount: this.activeHelperCreatures().length,
      hasFoodDispenser: this.hasFoodDispenser(),
      foodDispenserPrice: foodDispenserPrice,
      actionCount: (action) => this.dailyQuestActionCount(action),
      fishPurchaseCount: (coinType) => this.todayFishPurchaseCount(coinType),
      commonReward: (weight) => this.commonQuestReward(weight),
      rareReward: () => this.rareQuestReward(),
      superRareReward: () => this.superRareQuestReward()
    });
  }

  private dailyGoalUnfinishedCount(): number {
    return this.visibleDailyQuestItems().length;
  }

  private visibleDailyQuestItems(): DailyQuestItem[] {
    return visibleDailyQuestItemsModel(this.dailyGoals, this.dailyQuestItems());
  }

  private commonQuestReward(weight = 1): Price {
    return questCommonReward(this.tankDisplayLevel(), this.wallet, this.calculateTotalWealth(), weight);
  }

  private rareQuestReward(): Price {
    return questRareReward(this.wallet);
  }

  private superRareQuestReward(): Price {
    return questSuperRareReward(this.wallet);
  }

  private rewardedAdCoinReward(coinType: CoinType): Price {
    return questRewardedAdCoinReward(coinType, this.tankDisplayLevel(), this.wallet, this.calculateTotalWealth());
  }

  private startRewardedAd(kind: RewardedAdKind): void {
    if (this.rewardedAd) {
      return;
    }

    this.rewardedAd = { kind, readyAt: Date.now() + rewardedAdDurationMs };
    this.ensureRewardedAdRefreshTimer();
    this.showRewardedAdModal(kind);
  }

  private ensureRewardedAdRefreshTimer(): void {
    if (this.rewardedAdRefreshTimer) {
      return;
    }

    this.rewardedAdRefreshTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (!this.rewardedAd) {
          this.rewardedAdRefreshTimer?.remove(false);
          this.rewardedAdRefreshTimer = undefined;
          return;
        }
        this.updateRewardedAdModal();
        if (this.activeScreen === "goals") {
          this.syncHtmlPageOverlay();
        }
        if (isRewardedAdReady(this.rewardedAd)) {
          this.rewardedAdRefreshTimer?.remove(false);
          this.rewardedAdRefreshTimer = undefined;
        }
      }
    });
  }

  private showRewardedAdModal(kind: RewardedAdKind): void {
    const option = this.rewardedAdOptions().find((item) => item.kind === kind);
    this.closeModal();
    this.modalTitle = "Rewarded Ad";

    const modal = createRewardedAdModalShell({
      icon: option?.icon ?? "/assets/ui/shop/coin_icon_common.png",
      rewardDetail: option?.detail ?? "bonus",
      onClaim: () => this.claimRewardedAd(kind),
      attachTouchFeedback: (button) => this.attachTouchFeedback(button)
    });
    this.rewardedAdCountdownText = modal.countdownText;
    this.rewardedAdModalButton = modal.claimButton;
    document.body.appendChild(modal.shell);
    this.modal = modal.shell;
    this.updateRewardedAdModal();
  }

  private updateRewardedAdModal(): void {
    if (!this.rewardedAd || !this.rewardedAdCountdownText || !this.rewardedAdModalButton) {
      return;
    }

    const remainingSeconds = rewardedAdRemainingSeconds(this.rewardedAd);
    this.rewardedAdCountdownText.textContent = formatNumber(remainingSeconds);
    if (remainingSeconds <= 0) {
      this.rewardedAdCountdownText.textContent = "Ready";
      this.rewardedAdModalButton.disabled = false;
      this.rewardedAdModalButton.textContent = "Claim Reward";
      return;
    }

    this.rewardedAdModalButton.disabled = true;
    this.rewardedAdModalButton.textContent = `Watching ${formatNumber(remainingSeconds)}s`;
  }

  private claimRewardedAd(kind: RewardedAdKind): void {
    if (!this.rewardedAd || this.rewardedAd.kind !== kind || !isRewardedAdReady(this.rewardedAd)) {
      return;
    }

    if (kind === "common") {
      const reward = this.rewardedAdCoinReward(kind);
      earn(this.wallet, reward.coinType, reward.amount);
      this.floatText(`+${formatPrice(reward)} ad`, toastX, toastY, "#ffe67a");
    } else if (kind === "food") {
      const foodType = this.rewardedAdFoodReward();
      const inventoryAmount = this.isCalorieTrackedFood(foodType.id) ? foodType.calories : 1;
      this.foodInventory.set(foodType.id, this.getFoodInventory(foodType.id) + inventoryAmount);
      this.recentInventoryDockItemKey = `food:${foodType.id}`;
      if (this.isDroppableFood(foodType.id)) {
        this.selectedFoodTypeId = foodType.id;
      }
      this.floatText(`+${foodType.name}`, toastX, toastY, "#ffe67a");
    } else if (kind === "fish") {
      const fishType = this.rewardedAdFishReward();
      this.fishInventory.set(fishType.id, this.getFishInventory(fishType.id) + 1);
      this.recentInventoryDockItemKey = `fish:${fishType.id}`;
      this.floatText(`+${fishType.name}`, toastX, toastY, "#a8ffb0");
    } else if (kind === "helper") {
      const creatureType = this.rewardedAdHelperReward();
      this.creatureInventory.set(creatureType.id, this.getCreatureInventory(creatureType.id) + 1);
      this.recentInventoryDockItemKey = `helper:${creatureType.id}`;
      this.floatText(`+${creatureType.name}`, toastX, toastY, "#a8ffb0");
    }

    this.rewardedAd = undefined;
    this.rewardedAdRefreshTimer?.remove(false);
    this.rewardedAdRefreshTimer = undefined;
    this.closeModal();
    this.refreshUi();
    this.createFoodDock();
    this.saveNow();
  }

  private dailyQuestActionCount(action: string): number {
    return questActionCount(this.dailyGoals, action);
  }

  private todayFishPurchaseCount(coinType?: CoinType): number {
    return questTodayFishPurchaseCount(this.dailyGoals, coinType);
  }

  private recentFishPurchaseCount(coinType?: CoinType, now = Date.now()): number {
    return questRecentFishPurchaseCount(this.dailyGoals, coinType, now);
  }

  private hourlyFishPurchaseLimit(): number {
    const level = this.tankDisplayLevel();
    if (level <= 1) {
      return 5;
    }
    if (level <= 2) {
      return 4;
    }
    if (level <= 4) {
      return 6;
    }
    return 9999;
  }

  private canBuyAnotherFishThisHour(): boolean {
    return this.recentFishPurchaseCount() < this.hourlyFishPurchaseLimit();
  }

  private fishPurchaseRestockLabel(now = Date.now()): string {
    const oldestRecentPurchase = oldestRecentFishPurchase(this.dailyGoals, now);

    if (!oldestRecentPurchase) {
      return "Hourly Limit";
    }

    const remainingSeconds = Math.ceil((oldestRecentPurchase + fishPurchaseWindowMs - now) / 1000);
    return `Restock ${this.compactDurationLabel(remainingSeconds)}`;
  }

  private recentGrowthTonicPurchaseCount(now = Date.now()): number {
    return questRecentGrowthTonicPurchaseCount(this.dailyGoals, now);
  }

  private canBuyGrowthTonicThisHour(): boolean {
    return this.recentGrowthTonicPurchaseCount() === 0;
  }

  private growthTonicPurchaseRestockLabel(now = Date.now()): string {
    const oldestRecentPurchase = oldestRecentGrowthTonicPurchase(this.dailyGoals, now);

    if (!oldestRecentPurchase) {
      return "1 per hour";
    }

    const remainingSeconds = Math.ceil((oldestRecentPurchase + growthTonicPurchaseWindowMs - now) / 1000);
    return `Restock ${this.compactDurationLabel(remainingSeconds)}`;
  }

  private recordGrowthTonicPurchase(): void {
    this.dailyGoals = this.normalizeDailyGoals(this.dailyGoals);
    this.dailyGoals = recordGrowthTonicPurchaseModel(this.dailyGoals);
  }

  private recordFishPurchase(fishType: FishType): void {
    this.dailyGoals = this.normalizeDailyGoals(this.dailyGoals);
    this.dailyGoals = recordFishPurchaseModel(this.dailyGoals, fishType.rarity);
  }

  private recordDailyQuestAction(action: string): void {
    this.dailyGoals = this.normalizeDailyGoals(this.dailyGoals);
    this.dailyGoals = recordDailyQuestActionModel(this.dailyGoals, action);
  }

  private localDateKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private claimDailyGoal(id: string, complete: boolean): void {
    this.dailyGoals = this.normalizeDailyGoals(this.dailyGoals);
    const quest = this.dailyQuestItems().find((item) => item.id === id);
    if (this.dailyGoals.claimed.includes(id)) {
      this.floatText("Already claimed", toastX, toastY, "#d7f4ff");
      return;
    }

    if (!complete) {
      this.floatText("Quest not done", toastX, toastY, "#ffb0a8");
      return;
    }

    if (!quest) {
      return;
    }

    this.dailyGoals.claimed.push(id);
    earn(this.wallet, quest.reward.coinType, quest.reward.amount);
    this.floatText(`+${formatPrice(quest.reward)} quest`, toastX, toastY, "#ffe67a");
    this.refreshUi();
    this.saveNow();
  }

  private toggleSetting(key: keyof typeof this.settings): void {
    if (key === "musicVolume") {
      return;
    }
    this.settings[key] = !this.settings[key];
    if (key === "music") {
      this.syncBackgroundMusic();
    }
    this.refreshUi();
    this.saveNow();
  }

  private setMusicVolume(value: number, persist: boolean): void {
    this.settings.musicVolume = Phaser.Math.Clamp(Math.round(value), 0, 100);
    this.syncBackgroundMusic();
    if (persist) {
      this.refreshUi();
      this.saveNow();
    }
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
    const sellValue = this.activeFishSellValue(targetFish);
    this.showModal(
      protectedRarity ? "Sell Rare Fish" : "Sell Fish",
      [
        `${targetFish.type.name} will leave this tank.`,
        `Rarity: ${targetFish.type.rarity} | Age ${targetFish.ageLabel()}`,
        `Length ${targetFish.lengthLabel()} | Weight ${targetFish.weightLabel()}`,
        ...(protectedRarity ? ["Rare and event fish require extra care before selling."] : []),
        `You receive C${formatNumber(sellValue)}.`
      ],
      [
        { label: `SELL ${formatNumber(sellValue)}`, fill: 0x76512d, action: () => this.sellFishByIndex(index) },
        { label: "Cancel", fill: 0x254d68, action: () => this.closeModal() }
      ]
    );
  }

  private showStoredFishSellConfirmation(fishTypeId: string): void {
    const fishType = fishTypes.find((item) => item.id === fishTypeId);
    const count = this.getFishInventory(fishTypeId);
    if (!fishType || count <= 0) {
      this.floatText("No stored fish", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellValue = this.storedFishSellValue(fishType);
    this.showModal(
      "Sell Stored Fish",
      [
        `${fishType.name} will be removed from your dock inventory.`,
        `Stored: ${formatNumber(count)} | Rarity: ${fishType.rarity}`,
        `You receive C${formatNumber(sellValue)}.`
      ],
      [
        { label: `SELL ${formatNumber(sellValue)}`, fill: 0x76512d, action: () => this.sellStoredFish(fishTypeId) },
        { label: "Cancel", fill: 0x254d68, action: () => this.closeModal() }
      ]
    );
  }

  private showFoodSellConfirmation(foodTypeId: FoodTypeId): void {
    const foodType = foodTypes.find((item) => item.id === foodTypeId);
    const storedAmount = this.getFoodInventory(foodTypeId);
    if (!foodType || storedAmount <= 0) {
      this.floatText("No food to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellValue = this.foodSellValue(foodType, storedAmount);
    const countLabel = this.foodInventoryBadgeLabel(foodType);
    const quantityMultiplier = this.foodSellQuantityMultiplier(foodType, storedAmount);
    const servingCopy = this.isCalorieTrackedFood(foodType.id)
      ? `${formatNumber(storedAmount)} calories, about ${formatNumber(quantityMultiplier)} servings, will be sold.`
      : `${formatNumber(storedAmount)} items will be sold.`;
    this.showModal(
      "Sell Food",
      [
        `${foodType.name} will be converted to common coins.`,
        `Owned: x${countLabel}`,
        servingCopy,
        `You receive C${formatNumber(sellValue)}.`
      ],
      [
        { label: `SELL ${formatNumber(sellValue)}`, fill: 0x76512d, action: () => this.sellFoodInventory(foodTypeId) },
        { label: "Cancel", fill: 0x254d68, action: () => this.closeModal() }
      ]
    );
  }

  private showDecorationSellConfirmation(decorationTypeId: string, size: DecorationSize): void {
    const decorationType = decorationTypes.find((item) => item.id === decorationTypeId);
    const storedCount = this.getDecorationInventory(decorationTypeId, size);
    const placedCount = this.getPlacedDecorationCount(decorationTypeId, size);
    const count = storedCount + placedCount;
    if (!decorationType || count <= 0) {
      this.floatText("No decor to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellValue = this.decorationSellValue(decorationType, size, count);
    const sizeLabel = decorationSizes[size].label;
    this.showModal(
      "Sell Decoration",
      [
        `${decorationType.name} ${sizeLabel} will be converted to common coins.`,
        `Owned: x${formatNumber(count)}`,
        `Stored: ${formatNumber(storedCount)} | In tank: ${formatNumber(placedCount)}`,
        `You receive C${formatNumber(sellValue)}.`
      ],
      [
        { label: `SELL ${formatNumber(sellValue)}`, fill: 0x76512d, action: () => this.sellDecorationInventory(decorationTypeId, size) },
        { label: "Cancel", fill: 0x254d68, action: () => this.closeModal() }
      ]
    );
  }

  private showCoinSellConfirmation(coinType: "rare" | "superRare"): void {
    const count = this.wallet[coinType];
    if (count <= 0) {
      this.floatText("No coins to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const label = coinType === "rare" ? "Rare Coin" : "Super Rare Diamond";
    const sellValue = this.coinSellValue(coinType, count);
    this.showModal(
      "Convert Coin",
      [
        `Convert all owned ${label} to common coins.`,
        `Owned: x${formatNumber(count)}`,
        `You receive C${formatNumber(sellValue)}.`
      ],
      [
        { label: `SELL ${formatNumber(sellValue)}`, fill: 0x76512d, action: () => this.sellCoinInventory(coinType) },
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
        `Role: ${targetHelper.type.id === "feeder-snail" ? "Pet" : targetHelper.type.habitatTags.join(", ")}`,
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

  private showModal(title: string, lines: string[], actions: ModalAction[]): void {
    this.closeModal();
    this.modalTitle = title;

    const shell = createModalShell({
      title,
      lines,
      actions,
      attachTouchFeedback: (button) => this.attachTouchFeedback(button),
      afterAction: () => {
        if (this.activeScreen !== "tank" && this.activeScreen !== "store" && this.activeScreen !== "prize" && this.activeScreen !== "makeup") {
          this.syncHtmlPageOverlay();
        }
      }
    });
    document.body.appendChild(shell);
    this.modal = shell;
  }

  private showPrizeCelebration(title: string, imageUrl: string, detail: string): void {
    this.closeModal();
    this.modalTitle = title;
    const shell = htmlElement("div", "aq-modal-shell aq-prize-celebration-shell");
    const stopEvent = (event: Event) => {
      event.stopPropagation();
    };
    shell.addEventListener("pointerdown", stopEvent);
    shell.addEventListener("click", stopEvent);

    const closeButton = this.htmlButton("Awesome", "aq-modal-button good", () => this.closeModal());
    const panel = htmlElement("section", "aq-modal aq-prize-celebration-modal", [
      htmlElement("h2", "aq-modal-title aq-prize-celebration-title", [title]),
      htmlElement("div", "aq-prize-celebration-image-wrap", [
        htmlImage(imageUrl, "", "aq-prize-celebration-image")
      ]),
      htmlElement("p", "aq-modal-line aq-prize-celebration-detail", [detail]),
      htmlElement("div", "aq-modal-actions single", [closeButton])
    ]);
    shell.append(panel);
    document.body.appendChild(shell);
    this.modal = shell;
  }

  private closeModal(): void {
    this.modal?.remove();
    this.modal = undefined;
    this.modalTitle = undefined;
    this.rewardedAdCountdownText = undefined;
    this.rewardedAdModalButton = undefined;
  }

  private floatText(message: string, x: number, y: number, color: string): void {
    const text = this.add
      .text(x, y, message, {
        fontFamily: gameFontFamily,
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

  private floatCoinClaimText(value: number, coinType: CoinType, x: number, y: number, color: string, automated: boolean, fee = 0): void {
    const position = this.tankToScreenPoint(x, y);
    const textureKey = coinTextureKeyByType[coinType];
    const label = automated ? `Auto +${formatNumber(value)}${fee > 0 ? ` (-${formatNumber(fee)})` : ""}` : `+${formatNumber(value)}`;
    const container = this.add.container(position.x, position.y).setDepth(61).setAlpha(1).setScale(0.9);
    const icon = this.add.image(-18, 0, this.textures.exists(textureKey) ? textureKey : "coin").setDisplaySize(20, 20);
    const text = this.add
      .text(-3, 0, label, {
        fontFamily: gameFontFamily,
        fontSize: "17px",
        fontStyle: "700",
        color,
        stroke: "#062033",
        strokeThickness: 4
      })
      .setOrigin(0, 0.5);

    if (icon.texture.key === "coin") {
      icon.setTint(coinVisualsByType[coinType].tint);
    }

    const halfWidth = (icon.displayWidth + 7 + text.width) / 2;
    icon.setX(-halfWidth + icon.displayWidth / 2);
    text.setX(icon.x + icon.displayWidth / 2 + 7);
    container.add([icon, text]);

    this.tweens.add({
      targets: container,
      y: position.y - 34,
      alpha: 0,
      scale: 1.08,
      duration: 920,
      ease: "Sine.out",
      onComplete: () => container.destroy(true)
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
        creatureInventoryByType: mapToRecord(this.creatureInventory),
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
        nextTankUpgradePrice: this.getNextTankUpgradePrice(),
        tankNeedIndicator: this.getTankNeedIndicator(),
        tankHudText: this.tankHudSnapshotText(),
        tankStatusText: this.tankStatusSnapshotText(),
        tankCareText: this.tankCareSnapshotText(),
        fishTypeCount: fishTypes.length,
        helperCreatureTypeCount: helperCreatureTypes.length,
        visibleFishCatalogCount: this.visibleFishCatalog().length,
        visibleFishCatalogPreviewTextures: this.visibleFishCatalog().map((fishType) => this.fishCatalogPreviewTextureKey(fishType)),
        visibleStoreCatalogCount: this.visibleStoreCatalogCount(),
        assetCoverage: this.assetCoverageSnapshot(),
        dirtyTankOverlay: {
          visible: this.dirtyTankOverlay?.visible ?? false,
          alpha: this.dirtyTankOverlay?.alpha ?? 0,
          displayWidth: this.dirtyTankOverlay?.displayWidth ?? 0,
          displayHeight: this.dirtyTankOverlay?.displayHeight ?? 0
        },
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
            fatalCareSeconds: currentFish.fatalCareSeconds,
            fatalCareRemainingSeconds: currentFish.fatalCareRemainingSeconds(),
            continuousHungrySeconds: currentFish.continuousHungrySeconds,
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
            sellValue: this.activeFishSellValue(currentFish),
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
          sellPrice: this.helperSellPrice(helper.type)
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
        targetFish.setContinuousHungerSeconds(targetFish.hunger > 68 && targetFish.health < 35 ? 5 * 60 : 0);
        if (!targetFish.isInFatalCareState()) {
          targetFish.fatalCareSeconds = 0;
        }
        targetFish.refreshStatusBars();
      },
      setFishContinuousHungerSeconds: (index: number, seconds: number) => {
        const targetFish = this.fish[index];
        if (!targetFish) {
          return;
        }

        targetFish.setContinuousHungerSeconds(seconds);
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

        targetFish.fatalCareSeconds = targetFish.isInFatalCareState() ? Phaser.Math.Clamp(seconds, 0, 24 * 60 * 60) : 0;
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
        if (!targetFish || targetFish.state === "ill" || this.coinDrops.length >= maxCoinDrops) {
          return;
        }

        this.createCoinDrop(targetFish.sprite.x, targetFish.sprite.y - 24, 1, "common");
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
        this.buyTank(maxPurchasableTankLevel);
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
      placeFishFromInventory: (fishTypeId: string, x: number, y: number) => {
        const fishType = fishTypes.find((item) => item.id === fishTypeId);
        if (!fishType || this.getFishInventory(fishType.id) <= 0) {
          return;
        }

        this.placeFishWithCompatibility(
          fishType,
          Phaser.Math.Clamp(x, tankBounds.left + 28, tankBounds.right - 28),
          Phaser.Math.Clamp(y, tankBounds.top + 26, tankBounds.bottom - 26)
        );
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
          this.selectDecoration(decorationType.id, "m");
        }
      },
      addFoodDispenserForTest: () => {
        this.decorationInventory.set(foodDispenserInventoryKey, 1);
        this.createFoodDock();
        this.refreshUi();
      },
      removeFoodDispenserForTest: () => {
        this.decorationInventory.delete(foodDispenserInventoryKey);
        this.createFoodDock();
        this.refreshUi();
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
        const foodType = foodTypes.find((item) => item.id === foodTypeId);
        const amount = Math.max(0, Math.floor(count));
        const inventoryAmount = foodType && this.isCalorieTrackedFood(foodType.id) ? foodType.calories * amount : amount;
        this.foodInventory.set(foodTypeId, this.getFoodInventory(foodTypeId) + inventoryAmount);
        this.createFoodDock();
        this.refreshUi();
      },
      dropFoodForTest: (foodTypeId: FoodTypeId, x: number, y: number) => {
        const foodType = foodTypes.find((item) => item.id === foodTypeId);
        if (!foodType || this.foods.length >= maxFoodDrops) {
          return;
        }

        const pellet = new FoodPellet(
          this,
          Phaser.Math.Clamp(x, tankBounds.left + 18, tankBounds.right - 18),
          Phaser.Math.Clamp(y, tankBounds.top + 18, tankBounds.bottom - 18),
          foodType,
          { reservedCalories: foodType.calories }
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
      setCleanliness: (cleanliness: number) => {
        this.cleanliness = Phaser.Math.Clamp(cleanliness, 0, 100);
        this.cleaningTank = false;
        this.updateDirtyTankOverlay();
        this.refreshUi();
      }
    };
  }

}
