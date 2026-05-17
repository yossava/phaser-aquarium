import Phaser from "phaser";
import { basicFood, decorationTypes, fishTypes, foodAssetPath, foodTypes, helperCreatureTypes } from "../data/content";
import { gameHeight, gameWidth, maxRenderScale, setTankWorldScale, shouldUseLowPowerMode, tankBounds, tankViewportBounds, toastX, toastY } from "../game/constants";
import {
  clearStoredDecorationInventory as clearStoredDecorationInventoryModel,
  consumeStoredDecoration as consumeStoredDecorationModel,
  decorationInventoryKey as decorationInventoryKeyModel,
  getDecorationInventory as getDecorationInventoryModel,
  ownedDecorationCount as ownedDecorationCountModel,
  placedDecorationCount as placedDecorationCountModel,
  removeStoredDecorationInventory as removeStoredDecorationInventoryModel,
  sanitizeDecorationSize as sanitizeDecorationSizeModel
} from "../game/decoration-inventory";
import {
  autoFoodBuyerAssetPath,
  autoFoodBuyerInventoryKey,
  autoFoodBuyerPositionStorageKey,
  autoFoodBuyerPrice,
  activeUtilityRemainingMinutes,
  coinMagnetIconPath,
  coinMagnetInventoryKey,
  coinMagnetPositionStorageKey,
  foodDispenserAssetPath,
  foodDispenserInventoryKey,
  foodDispenserMinIntervalMs,
  foodDispenserOutletRatio,
  foodDispenserPelletScale,
  foodDispenserPositionStorageKey,
  foodDispenserPrice,
  isTankUtilityId,
  legacyFoodDispenserPositionStorageKey,
  loadUtilityPositionY,
  ownedTankUtilityInventoryCards as ownedTankUtilityInventoryCardsModel,
  saveUtilityPositionY,
  tankUtilityStoreDefinitions,
  tankUtilityInfo as tankUtilityInfoModel,
  type TankUtilityId,
  utilityExpiresAt
} from "../game/dispenser-system";
import { canAfford, createWallet, earn, formatNumber, formatPrice, formatPriceLong, priceComponents, spend } from "../game/economy";
import { fishCoinProductionMaxDelayMs, fishCoinProductionMinDelayMs, fishCommonPrice } from "../game/economy-model";
import {
  activeFishSellValue as activeFishSellValueModel,
  coinSellValue as coinSellValueModel,
  coinWealthValue,
  decorationSellValue as decorationSellValueModel,
  foodSellValue as foodSellValueModel,
  helperSellPrice as helperSellPriceModel,
  priceWealth as priceWealthModel,
  quantityPrice as quantityPriceModel,
  storedFishSellValue as storedFishSellValueModel,
  tankUtilitySellValue as tankUtilitySellValueModel
} from "../game/economy-values";
import { createAquariumSaveSnapshot } from "../game/aquarium-persistence";
import { FishDeliveryBubbleManager, type PendingFishBubble } from "../game/fish-delivery-bubbles";
import {
  createFishFusionSources,
  fishFusionChancesFor as fishFusionChancesForModel,
  fishFusionCostFor as fishFusionCostForModel,
  fishFusionDurationMs,
  fishFusionResultTypes as fishFusionResultTypesModel,
  fishFusionSourceSellValue as fishFusionSourceSellValueModel,
  fusionAgeLabel as fusionAgeLabelModel,
  type FishFusionChances,
  type FishFusionSource
} from "../game/fish-fusion";
import { gameFontFamily } from "../game/fonts";
import {
  fishProductionThresholdForLevel,
  rawTankDisplayLevelFromProduction,
  targetProductionPerMinuteForLevel
} from "../game/level-progression";
import {
  addPriceToWallet as addPriceToWalletModel,
  decorationSizeUpgradePrice as decorationSizeUpgradePriceModel,
  makeupDecorationCostEntries as makeupDecorationCostEntriesModel,
  makeupDecorationDisplayDepth,
  makeupPurchaseLines as makeupPurchaseLinesModel,
  makeupTotalCost as makeupTotalCostModel,
  priceComponentAmount as priceComponentAmountModel,
  walletToPrice as walletToPriceModel,
  type MakeupDecorationDraft,
  type MakeupDraft,
  type MakeupSection
} from "../game/makeup-mode";
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
  productionBoostFoodTypeId,
  recommendedFoodName,
  setFoodBuyQuantityValue,
  supplyFoodTypeIds,
  totalFeedableFoodInventory as totalFeedableFoodInventoryModel
} from "../game/food-system";
import {
  buildInventoryCategoryItems,
  buildInventoryDockItems,
  clampInventoryDockPage,
  inventoryCategoryTitle,
  inventoryDockItemKey as inventoryDockItemKeyModel,
  inventoryDockPageCount,
  inventoryDockPageItems,
  pageForInventoryDockItem,
  type InventoryDockItem
} from "../game/inventory-dock";
import {
  calculateOfflineSeconds,
  clearSave,
  createEmptyWallet,
  loadGame,
  mapToRecord,
  saveGame,
  type OfflineProgress,
  type SavedGame
} from "../game/save";
import {
  capturedTankState,
  ensureTankState as ensureTankStateModel,
  tankStateSelection,
  tankNamesFromRecord as tankNamesFromRecordModel,
  tankNamesRecord as tankNamesRecordModel,
  tankStatesFromSave as tankStatesFromSaveModel,
  tankStatesRecord as tankStatesRecordModel,
  sortedTankLevels,
  type TankCosmeticCategory,
  type TankRuntimeState,
  type TankStateConfig
} from "../game/tank-state";
import { calculateTankNetWorth as calculateTankNetWorthModel } from "../game/tank-wealth";
import {
  aquariumBackgroundAssetPath,
  aquariumBackgroundTextureKey,
  aquariumFloorAssetPath,
  aquariumFloorTextureKey,
  decorationSizeOrder,
  decorationSizes,
  currentTankTheme as currentTankThemeModel,
  defaultTankCosmeticId as defaultTankCosmeticIdModel,
  decorationVariantPrice as tankCatalogDecorationVariantPrice,
  tankCosmeticImageUrl as tankCatalogCosmeticImageUrl,
  tankCosmeticTint as tankCosmeticTintModel,
  tankCosmetics as tankCatalogCosmetics,
  tankFloorTextureCropTopByKey,
  tankTextureAssetPathByKey,
  tankThemeTint as tankThemeTintModel,
  tankThumbnailBaseAssetPath,
  tankThumbnailBaseTextureKey,
  type DecorationSize,
  type TankCosmetic
} from "../game/tank-catalog";
import {
  calculateTankHappiness as calculateTankHappinessModel,
  isTankDirty as isTankDirtyModel,
  nextTankCleanliness,
  tankDirtRatePerSecond as tankDirtRatePerSecondModel,
  tankNeedIndicator as tankNeedIndicatorModel
} from "../game/tank-care";
import type { PlacedDecoration } from "../game/tank-entities";
import { createFallbackTextures } from "../game/texture-fallbacks";
import {
  fishFoodTintFor,
  foodCssFilterFor,
  rarityForPrice as rarityForPriceModel,
  rarityIconPath as rarityIconPathModel,
  rarityLabel as rarityLabelModel,
  rarityStarsLabel as rarityStarsLabelModel
} from "../game/visuals";
import { installNativeCanvasInputFallback as installNativeCanvasInputFallbackAdapter } from "../input/native-canvas-input";
import {
  buildDailyQuestItems,
  commonQuestReward as questCommonReward,
  dailyQuestActionCount as questActionCount,
  ensureActiveDailyQuestItems as ensureActiveDailyQuestItemsModel,
  fishPurchaseWindowMs,
  growthTonicPurchaseWindowMs,
  isRewardedAdReady,
  normalizeDailyGoals as normalizeDailyGoalsModel,
  oldestRecentFishPurchase,
  oldestRecentGrowthTonicPurchase,
  oldestRecentProductionBoostPurchase,
  productionBoostPurchaseWindowMs,
  rareQuestReward as questRareReward,
  recentFishPurchaseCount as questRecentFishPurchaseCount,
  recentGrowthTonicPurchaseCount as questRecentGrowthTonicPurchaseCount,
  recentProductionBoostPurchaseCount as questRecentProductionBoostPurchaseCount,
  recordDailyQuestAction as recordDailyQuestActionModel,
  recordFishPurchase as recordFishPurchaseModel,
  recordGrowthTonicPurchase as recordGrowthTonicPurchaseModel,
  recordProductionBoostPurchase as recordProductionBoostPurchaseModel,
  rewardedAdCoinReward as questRewardedAdCoinReward,
  rewardedAdCooldownMs,
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
  prizeMachineConfigForBet,
  recordPrizeMachineSpin,
  recordPrizeMachineWin,
  setPrizeMachineBet,
  type PrizeMachineBetAmount,
  type PrizeMachineConfig,
  type PrizeMachineState,
  type PrizeSpinPrize
} from "../game/prize-machine";
import { PrizeWheelPlanner, type PreparedPrizeMachineReward } from "../game/prize-wheel-planner";
import {
  createPrizeMachineSpinner,
  playPrizeMachineSpin,
  prizeWheelIconAssetPaths,
  prizeWheelIconTextureKeys,
  type PrizeWheelSegment
} from "../game/prize-machine-wheel";
import { buildStoreOverlayState, fishShopRequiredLevel } from "../game/store-catalog";
import {
  addStoredFishAge as addStoredFishAgeModel,
  setStoredFishAges as setStoredFishAgesModel,
  storedFishAgesFor as storedFishAgesForModel,
  takeStoredFishAge as takeStoredFishAgeModel
} from "../game/stored-fish-ages";
import { CoinDrop, coinTextureKeyByType, coinVisualsByType } from "../objects/CoinDrop";
import { Fish } from "../objects/Fish";
import { FoodPellet } from "../objects/FoodPellet";
import { HelperCreature } from "../objects/HelperCreature";
import {
  capturePageScrollTop,
  createPageEmptyCard,
  createPageOverlayRoot,
  createPageShell,
  pageScreenMeta as buildPageScreenMeta,
  restorePageScrollTop,
  type PageButtonFactory,
  type PageOverlayScreen,
  type PageScreenMeta
} from "../ui/PageOverlay";
import { createFishAlbumRow } from "../ui/AlbumPage";
import {
  createFusionFinalResult,
  createFusionFishPickerShell,
  createFusionLoadingChamber,
  createFusionMachine,
  createFusionMachinePlaceholder,
  createFusionOutputStage,
  createFusionPageRoot,
  createFusionResultCandidate,
  createFusionResultList,
  createFusionSelectedDockChildren
} from "../ui/FusionPage";
import {
  appendInventoryItemSection,
  createCoinInventoryRow as createCoinInventoryRowView,
  createDecorationInventoryRow as createDecorationInventoryRowView,
  createFoodInventoryRow as createFoodInventoryRowView,
  createStoredFishInventoryRow as createStoredFishInventoryRowView
} from "../ui/InventoryRows";
import { appendMainMenuPage as appendMainMenuPageView, createDrillMenuCard as createDrillMenuCardView } from "../ui/MainMenuPage";
import { createMakeupPanel as createMakeupPanelView, type MakeupPanelResult } from "../ui/MakeupPanel";
import { createCommonCoinValueRow, createMakeupCostElement, createPriceIconRow, createWalletIconRow } from "../ui/PriceRows";
import { createPrizeBetGrid } from "../ui/PrizeBetModal";
import { createQuestList } from "../ui/QuestPage";
import { createLevelCompletionRewardShell, createPrizeCelebrationShell } from "../ui/RewardModals";
import { createRewardedAdsPage } from "../ui/RewardedAdsPage";
import { createSellQuantityModalContent } from "../ui/SellQuantityModal";
import { createDeveloperSettingsCard, createSettingsMusicCard, createSettingsToggleCard } from "../ui/SettingsPage";
import { StoreOverlay, type StoreOverlayState } from "../ui/StoreOverlay";
import {
  createDecorationInventoryCard,
  createTankCosmeticInventoryCard,
  createTankLevelInventoryCard,
  createTankUtilityInventoryCard
} from "../ui/TankInventoryCards";
import { createHtmlButton, htmlElement, htmlImage, installHtmlInputShield, playHtmlPageTransition, shouldSuppressHtmlClick } from "../ui/dom";
import { createModalShell, createRewardedAdModalShell, type ModalAction } from "../ui/modal";
import type { AquariumTestSnapshot } from "../test/aquarium-test-api";
import type { CoinType, DecorationType, FishGender, FishState, FishType, FoodType, FoodTypeId, HelperCreatureType, Price, Rarity, StoreTab, Wallet } from "../types/mechanics";
import { ShellBalanceScene, ShellBalanceSceneKey, type ShellBalanceResult } from "./ShellBalanceScene";

type AppScreen = "tank" | "menu" | "store" | "album" | "goals" | "prize" | "makeup" | "settings";

const fixedPrizeBetAmounts: readonly PrizeMachineBetAmount[] = [
  1,
  5,
  10,
  25,
  50,
  100,
  250,
  500,
  1000,
  2500,
  5000,
  10000,
  25000,
  50000,
  100000
];

type PlacementMode =
  | { kind: "none" }
  | { kind: "fish"; fishTypeId: string }
  | { kind: "food"; foodTypeId: FoodTypeId }
  | { kind: "decoration"; decorationTypeId: string; size: DecorationSize };

type TankMenuTab = "background" | "seabed" | "decor" | "utility";
type InventoryTab = "fish" | "fusion" | "food" | "decor" | "coins" | "tank";
type FishFusionPageResult = {
  label: string;
  fishTypeId: string;
  ageSeconds: number;
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

const maxCoinDrops = 5;
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
const maxActiveFishPerTank = 4;
const maxDecorations = 8;
const maxHelperCreatures = 5;
const maxFishCatalogLevel = 5;
const maxOwnedTanks = 1;
const decorationTrashZone = new Phaser.Geom.Rectangle(gameWidth / 2 - 48, gameHeight - 88, 96, 60);
const maxFoodBuyQuantity = 99_999;
const maxFishBuyQuantity = 99;
const inventoryDockPageSize = 8;
const tankMenuButtonY = 214;
const foodDockTopBelowMenu = tankMenuButtonY + 36;
const overfullHungerFloor = -10000;
const automatedCoinCollectFeeRate = 0;
const coinComboMaxCount = 50;
const coinComboRewardPercentPerCount = 1;
const coinComboMaxProductionMultiplier = 1 + (coinComboMaxCount * coinComboRewardPercentPerCount) / 100;
const coinComboIdleTimeoutMs = 10_000;
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
const coinMagnetDurationMs = 30 * 60 * 1000;
const autoFoodBuyerDurationMs = 30 * 60 * 1000;
const productionBoostDurationMs = 30 * 1000;
const autoFoodBuyerPurchaseCooldownMs = 3500;
const autoFoodBuyerPurchaseQuantity = 10;
const coinMagnetAttractDurationMs = 260;
const coinMagnetAttractScale = 0.44;
const coinMagnetRayYOffset = -30;
const coinAssetPathByType: Record<CoinType, string> = {
  common: "/assets/ui/icon-common-coin.png",
  rare: "/assets/ui/icon-rare-coin.png",
  superRare: "/assets/ui/icon-super-rare-coin.png"
};
const fishMenuIconAssetPath = "/assets/ui/menu/menu_tank_hub_icon.png";
const menuIconAssetPathByKey: Record<string, string> = {
  "ui-menu": "/assets/ui/menu/menu_inventory_book.png",
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
const tankMenuVersion = "single-menu-v3";

export class AquariumScene extends Phaser.Scene {
  private readonly prizeMachineRuntimeSessionId = Date.now();
  private wallet = createWallet(120, 0, 0);
  private foodInventory = new Map<FoodTypeId, number>([[basicFood.id, basicFood.calories * 3]]);
  private foodBuyQuantities = new Map<FoodTypeId, number>();
  private fishInventory = new Map<string, number>();
  private fishInventoryAges = new Map<string, number[]>();
  private fusionPreviewSourceKeys = new Set<string>();
  private fusionPageResult?: FishFusionPageResult;
  private pendingFusionTimer?: number;
  private fusionRunToken = 0;
  private decorationInventory = new Map<string, number>();
  private careFoodTargetFish = new Map<FoodTypeId, Fish>();
  private creatureInventory = new Map<string, number>();
  private fish: Fish[] = [];
  private foods: FoodPellet[] = [];
  private coinDrops: CoinDrop[] = [];
  private airStoneBubblePool: Phaser.GameObjects.Arc[] = [];
  private activeAirStoneBubbles = new Set<Phaser.GameObjects.Arc>();
  private helperCreatures: HelperCreature[] = [];
  private pendingHelperCreatureDrops: PendingHelperCreatureDrop[] = [];
  private fishDeliveryBubbles?: FishDeliveryBubbleManager;
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
  private tankMenuTab: TankMenuTab = "background";
  private tankMenuDrillOpen = false;
  private tankMenuPage = 1;
  private inventoryTab: InventoryTab = "fish";
  private inventoryDrillOpen = false;
  private fishCatalogLevel = 1;
  private selectedFishIndex?: number;
  private tankLayer!: Phaser.GameObjects.Container;
  private tankBackground!: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  private tankBackgroundBlueTintOverlay?: Phaser.GameObjects.Rectangle;
  private tankSand?: Phaser.GameObjects.Image;
  private dirtyTankOverlay?: Phaser.GameObjects.Rectangle;
  private coinMagnetRay?: Phaser.GameObjects.Graphics;
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
  private foodDispenserText?: HTMLSpanElement;
  private foodDispenserElement?: HTMLDivElement;
  private coinMagnetText?: HTMLSpanElement;
  private coinMagnetElement?: HTMLDivElement;
  private autoFoodBuyerText?: HTMLSpanElement;
  private autoFoodBuyerElement?: HTMLDivElement;
  private foodDispenserY = tankBounds.bottom - 74;
  private coinMagnetY = tankBounds.bottom - 160;
  private autoFoodBuyerY = tankBounds.bottom - 246;
  private nextFoodDispenseAt = 0;
  private nextAutoFoodBuyerPurchaseAt = 0;
  private htmlFoodDock?: HTMLDivElement;
  private htmlFoodDragGhost?: HTMLDivElement;
  private htmlFoodDragCleanup?: () => void;
  private htmlDockDragging = false;
  private magnetCollectingCoins = new Set<CoinDrop>();
  private coinMagnetPreviousCoinY = new Map<CoinDrop, number>();
  private coinMagnetWasActive = false;
  private coinMagnetDisplayedMinutes = 0;
  private autoFoodBuyerWasActive = false;
  private autoFoodBuyerDisplayedMinutes = 0;
  private tankMenuOverlay?: HTMLDivElement;
  private htmlPageOverlay?: HTMLDivElement;
  private htmlPageOverlayScrollTop = 0;
  private htmlPageOverlayRenderKey = "";
  private storeOverlay?: StoreOverlay;
  private modal?: HTMLDivElement;
  private modalTitle?: string;
  private makeupOverlay?: HTMLDivElement;
  private makeupDraft?: MakeupDraft;
  private makeupDraggedDecoration?: MakeupDecorationDraft;
  private nativeMakeupDraggedDecoration?: MakeupDecorationDraft;
  private makeupDecorationSettingsElement?: HTMLElement;
  private makeupBackgroundScrollLeft = 0;
  private makeupDecorScrollLeft = 0;
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
  private coinComboLastClaimedAt = 0;
  private coinComboLastPosition = new Phaser.Math.Vector2(toastX, toastY);
  private coinComboOverlay?: HTMLDivElement;
  private backgroundMusic?: Phaser.Sound.BaseSound;
  private rewardedAd?: RewardedAdState;
  private rewardedAdRefreshTimer?: Phaser.Time.TimerEvent;
  private rewardedAdCountdownText?: HTMLSpanElement;
  private rewardedAdModalButton?: HTMLButtonElement;
  private prizeMachine: PrizeMachineState = createDefaultPrizeMachineState();
  private prizeMachineSelectedBetIndex?: number;
  private prizeSpinContainer?: Phaser.GameObjects.Container;
  private prizeSpinInProgress = false;
  private prizeCommonFish = this.nextPrizeFish("common");
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
    this.loadCoinMagnetY();
    this.loadAutoFoodBuyerY();
    this.createWorld();
    this.createUi();
    this.restoreSavedGame();
    this.syncBackgroundMusic();
    this.updateDirtyTankOverlay();
    this.installTestHooks();
    this.refreshUi();

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.handleMakeupOutsidePointerDown();
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

  private fishBubbleManager(): FishDeliveryBubbleManager {
    this.fishDeliveryBubbles ??= new FishDeliveryBubbleManager(
      this,
      this.tankLayer,
      (fishType, onLoad) => this.ensureFishTexturesLoaded(fishType, onLoad),
      (pending) => this.handleFishBubblePop(pending)
    );
    return this.fishDeliveryBubbles;
  }

  public update(_time: number, delta: number): void {
    const deltaSeconds = delta / 1000;
    const now = this.time.now;
    this.updateStoreOverlayTimer(deltaSeconds);

    if (!this.shouldRunTankActivity()) {
      return;
    }

    this.updateTimedUtilities();

    this.foods.forEach((food) => food.update(deltaSeconds));
    this.removeExpiredFood();
    this.coinDrops.forEach((coin) => coin.update(deltaSeconds));
    this.updateCoinMagnetRayPulse();
    this.updateCoinMagnet();
    if (this.coinComboCount > 0 && now - this.coinComboLastClaimedAt >= coinComboIdleTimeoutMs) {
      this.resolveCoinCombo();
    }
    const tankFish = this.activeFish();
    const activeDecorations = this.activeDecorations();
    const activeHelpers = this.activeHelperCreatures();
    this.updateAirStoneBubbles(deltaSeconds, activeDecorations);
    this.updateAutoFoodBuyer(tankFish);
    this.updateFoodDispenser(tankFish);
    this.updatePendingHelperCreatureDrops(deltaSeconds);
    this.fishDeliveryBubbles?.update(deltaSeconds, now);
    this.updateHelperCreatures(deltaSeconds, tankFish, activeHelpers);
    this.updateTankCleanliness(deltaSeconds, tankFish.length);
    this.updateDirtyTankOverlay();
    const foodAssignments = this.assignFoodsToFish(tankFish);
    const fishToRemove: Fish[] = [];
    for (const currentFish of tankFish) {
      const previousAgeStage = currentFish.ageStage;
      const previousState = currentFish.state;
      const eatenFood = currentFish.update(deltaSeconds, foodAssignments.get(currentFish) ?? []);
      if (currentFish.ageStage !== previousAgeStage) {
        this.saveNow();
      }
      if (previousState !== "hungry" && currentFish.state === "hungry") {
        this.playSfx(fishHungrySoundKey, { volume: 0.16 });
      }

      if (eatenFood) {
        const ateMedicine = eatenFood.accepted && eatenFood.food.foodType.id === "medicine";
        const ateAgeBoost = eatenFood.accepted && eatenFood.food.foodType.id === "ageBoost";
        const ateProductionBoost = eatenFood.accepted && eatenFood.food.foodType.id === productionBoostFoodTypeId;
        if (eatenFood.accepted) {
          this.playSfx(fishEatSoundKey, { volume: 0.18 });
        }
        if (eatenFood.accepted && !ateMedicine && !ateAgeBoost && !ateProductionBoost) {
          this.recordDailyQuestAction("feed");
          this.showMissedFoodEmotes(eatenFood.food, currentFish);
          if (currentFish.nextCoinDropAt <= this.time.now) {
            currentFish.postponeCoinProduction(this.time.now, Phaser.Math.Between(fishCoinProductionMinDelayMs, fishCoinProductionMaxDelayMs));
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
          this.recordDailyQuestAction("use-growth-tonic");
          this.floatTankText("+3 months", currentFish.sprite.x, currentFish.sprite.y - 26, "#d9c2ff");
        } else if (ateProductionBoost) {
          currentFish.applyProductionBoost(this.time.now, productionBoostDurationMs);
          this.recordDailyQuestAction("use-production-boost");
          this.floatTankText("5x Production", currentFish.sprite.x, currentFish.sprite.y - 26, "#ffd34d");
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

  private shouldRunTankActivity(): boolean {
    return this.activeScreen === "tank";
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
    this.coinMagnetRay = this.add.graphics().setDepth(11).setVisible(false);
    this.tankLayer.add(this.coinMagnetRay);

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
    return maxActiveFishPerTank + this.fishCapacityUpgradeBonusForLevel(level);
  }

  private fishCapacityUpgradeBonusForLevel(_level = this.tankLevel): number {
    return 0;
  }

  private activeFish(): Fish[] {
    return this.fish.filter((currentFish) => currentFish.tankLevel === this.tankLevel);
  }

  private activeFishAtTankPoint(x: number, y: number): Fish | undefined {
    const scale = this.tankViewScaleForLevel();
    const minimumRadius = 44 / Math.max(0.01, scale);
    let nearestFish: Fish | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const fish of this.activeFish()) {
      const radius = Math.max(minimumRadius, fish.sprite.displayWidth * 0.52, fish.sprite.displayHeight * 0.72);
      const distance = Phaser.Math.Distance.Between(x, y, fish.sprite.x, fish.sprite.y);
      if (distance <= radius && distance < nearestDistance) {
        nearestFish = fish;
        nearestDistance = distance;
      }
    }

    return nearestFish;
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
    this.tankStates.set(this.tankLevel, capturedTankState({
      previousState: state,
      wallet: this.wallet,
      foodInventory: this.foodInventory,
      fishInventory: this.fishInventory,
      fishInventoryAges: this.fishInventoryAges,
      decorationInventory: this.decorationInventory,
      creatureInventory: this.creatureInventory,
      cleanliness: this.cleanliness,
      cleanedAt: this.cleanedAt,
      maxDisplayLevel: rawTankDisplayLevelFromProduction(state.fishProductionTotal ?? 0)
    }));
  }

  private applyTankState(level = this.tankLevel): void {
    const state = tankStateSelection(this.ensureTankState(level));
    this.wallet = state.wallet;
    this.foodInventory = state.foodInventory;
    this.fishInventory = state.fishInventory;
    this.fishInventoryAges = state.fishInventoryAges;
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
    return defaultTankCosmeticIdModel(level);
  }

  private currentTankTheme(level = this.tankLevel) {
    return currentTankThemeModel(level);
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
    return tankThemeTintModel(level);
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
    return tankCosmeticTintModel({
      category,
      level,
      blueTintColor: tankCosmeticBlueTintColor,
      blueTintIntensity: this.renderTankCosmeticBlueTintIntensity(category, id, level)
    });
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
    const visible = dirtyRatio > 0 && this.shouldShowTankScene();
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
  }

  private createTankMenuOverlay(): HTMLDivElement {
    const overlay = document.createElement("div");
    overlay.className = "aq-tank-menu";
    overlay.dataset.version = tankMenuVersion;
    const tankDirty = this.isTankDirty();

    const menuY = tankMenuButtonY;
    const screens: { id: string; label: string; y: number; icon: string; action: () => void }[] = [
      { id: "menu", label: "Menu", y: menuY, icon: menuIconAssetPathByKey["ui-menu"], action: () => this.openScreen("menu") }
    ];

    for (const item of screens) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "aq-tank-menu-button";
      if (item.id === "menu") {
        button.classList.add("aq-tank-menu-button-plain");
      }
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
      if (item.id === "menu") {
        bubble.classList.add("aq-tank-menu-bubble-plain");
      }
      const icon = document.createElement("img");
      icon.src = item.icon;
      icon.alt = "";
      icon.draggable = false;
      if (item.id === "menu") {
        icon.classList.add("aq-tank-menu-icon-small");
      }
      bubble.append(icon);
      if (item.id === "menu" && tankDirty) {
        const badge = document.createElement("span");
        badge.className = "aq-tank-menu-badge";
        badge.textContent = "!";
        bubble.append(badge);
      }
      button.append(bubble, htmlElement("span", "aq-tank-menu-label", [item.label]));
      overlay.append(button);
    }

    document.body.appendChild(overlay);
    return overlay;
  }

  private syncHtmlGameInterface(): void {
    this.syncTankSceneVisibility();
    this.syncTankMenuOverlay();
    this.syncHtmlHud();
    this.syncHtmlFoodDock();
  }

  private shouldShowTankScene(): boolean {
    return this.activeScreen === "tank" || this.activeScreen === "makeup";
  }

  private syncTankSceneVisibility(): void {
    const visible = this.shouldShowTankScene();
    this.tankLayer?.setVisible(visible);
    if (!visible) {
      this.dirtyTankOverlay?.setVisible(false);
      this.coinMagnetRay?.setVisible(false);
      this.showDecorationTrashTarget(false);
    } else if (this.activeScreen === "tank") {
      this.updateDirtyTankOverlay();
      this.syncCoinMagnetRay();
    }
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
    this.gameHudCommonText!.textContent = formatNumber(this.wallet.common);
    this.gameHudRareText!.textContent = formatNumber(this.wallet.rare);
    this.gameHudSuperRareText!.textContent = formatNumber(this.wallet.superRare);
    if (this.foodDispenserText) {
      this.foodDispenserText.textContent = this.foodBadgeLabel(this.getTotalDispenserInventory());
    }
    if (this.coinMagnetText) {
      this.coinMagnetText.textContent = `${formatNumber(this.coinMagnetRemainingMinutes())}m`;
    }
    if (this.autoFoodBuyerText) {
      this.autoFoodBuyerText.textContent = `${formatNumber(this.autoFoodBuyerRemainingMinutes())}m`;
    }
    this.syncAutoFoodBuyerPosition();
    this.syncCoinMagnetPosition();
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

    panel.append(summary, wallet);
    const coinMagnet = document.createElement("div");
    coinMagnet.className = "aq-tank-side-tool aq-coin-magnet-tool";
    this.coinMagnetElement = coinMagnet;
    const coinMagnetIcon = document.createElement("img");
    coinMagnetIcon.src = coinMagnetIconPath;
    coinMagnetIcon.alt = "Coin magnet";
    coinMagnetIcon.draggable = false;
    const coinMagnetBadge = document.createElement("span");
    coinMagnetBadge.className = "aq-tank-side-tool-count aq-coin-magnet-count";
    this.coinMagnetText = coinMagnetBadge;
    coinMagnet.append(coinMagnetIcon, coinMagnetBadge);
    this.bindCoinMagnetDrag(coinMagnet);

    const autoFoodBuyer = document.createElement("div");
    autoFoodBuyer.className = "aq-tank-side-tool aq-auto-food-buyer-tool";
    this.autoFoodBuyerElement = autoFoodBuyer;
    const autoFoodBuyerIcon = document.createElement("img");
    autoFoodBuyerIcon.src = autoFoodBuyerAssetPath;
    autoFoodBuyerIcon.alt = "Auto food buyer";
    autoFoodBuyerIcon.draggable = false;
    const autoFoodBuyerBadge = document.createElement("span");
    autoFoodBuyerBadge.className = "aq-tank-side-tool-count aq-auto-food-buyer-count";
    this.autoFoodBuyerText = autoFoodBuyerBadge;
    autoFoodBuyer.append(autoFoodBuyerIcon, autoFoodBuyerBadge);
    this.bindAutoFoodBuyerDrag(autoFoodBuyer);

    const foodDispenser = document.createElement("div");
    foodDispenser.className = "aq-tank-side-tool aq-food-dispenser";
    this.foodDispenserElement = foodDispenser;
    const foodDispenserIcon = document.createElement("img");
    foodDispenserIcon.src = foodDispenserAssetPath;
    foodDispenserIcon.alt = "Fish food dispenser";
    foodDispenserIcon.draggable = false;
    const foodDispenserBadge = document.createElement("span");
    foodDispenserBadge.className = "aq-tank-side-tool-count aq-food-dispenser-count";
    this.foodDispenserText = foodDispenserBadge;
    foodDispenser.append(foodDispenserIcon, foodDispenserBadge);
    this.bindFoodDispenserDrag(foodDispenser);

    overlay.append(panel, autoFoodBuyer, coinMagnet, foodDispenser);
    document.body.appendChild(overlay);
    return overlay;
  }

  private syncCoinMagnetPosition(): void {
    if (!this.coinMagnetElement) {
      return;
    }

    if (!this.hasCoinMagnet()) {
      this.coinMagnetElement.classList.add("hidden");
      this.syncCoinMagnetRay();
      return;
    }

    this.coinMagnetElement.classList.remove("hidden");
    this.coinMagnetY = Phaser.Math.Clamp(this.coinMagnetY, this.foodDispenserMinY(), this.foodDispenserMaxY());
    const position = this.coinMagnetTankPosition();
    const screenPosition = this.tankToScreenPoint(position.x, position.y);
    this.coinMagnetElement.style.setProperty("--tank-side-tool-left", `${Math.round(screenPosition.x)}px`);
    this.coinMagnetElement.style.setProperty("--tank-side-tool-top", `${Math.round(screenPosition.y)}px`);
    this.syncCoinMagnetRay();
  }

  private syncCoinMagnetRay(): void {
    if (!this.coinMagnetRay) {
      return;
    }

    this.coinMagnetRay.clear();
    if (!this.hasCoinMagnet() || !this.shouldShowTankScene()) {
      this.coinMagnetRay.setVisible(false);
      return;
    }

    const y = this.coinMagnetRayY();
    this.coinMagnetRay.setVisible(true);
    this.coinMagnetRay.lineStyle(16, 0x55ff8a, 0.04);
    this.coinMagnetRay.beginPath();
    this.coinMagnetRay.moveTo(tankBounds.left + 4, y);
    this.coinMagnetRay.lineTo(tankBounds.right - 4, y);
    this.coinMagnetRay.strokePath();
    this.coinMagnetRay.lineStyle(7, 0x77ff99, 0.12);
    this.coinMagnetRay.beginPath();
    this.coinMagnetRay.moveTo(tankBounds.left + 4, y);
    this.coinMagnetRay.lineTo(tankBounds.right - 4, y);
    this.coinMagnetRay.strokePath();
    this.coinMagnetRay.lineStyle(2, 0xd9ffe5, 0.22);
    this.coinMagnetRay.beginPath();
    this.coinMagnetRay.moveTo(tankBounds.left + 4, y);
    this.coinMagnetRay.lineTo(tankBounds.right - 4, y);
    this.coinMagnetRay.strokePath();
    this.updateCoinMagnetRayPulse();
  }

  private updateCoinMagnetRayPulse(): void {
    if (!this.coinMagnetRay?.visible) {
      return;
    }

    const pulse = 0.72 + Math.sin(this.time.now * 0.006) * 0.28;
    this.coinMagnetRay.setAlpha(pulse);
  }

  private syncAutoFoodBuyerPosition(): void {
    if (!this.autoFoodBuyerElement) {
      return;
    }

    if (!this.hasAutoFoodBuyer()) {
      this.autoFoodBuyerElement.classList.add("hidden");
      return;
    }

    this.autoFoodBuyerElement.classList.remove("hidden");
    this.autoFoodBuyerY = Phaser.Math.Clamp(this.autoFoodBuyerY, this.foodDispenserMinY(), this.foodDispenserMaxY());
    const position = this.autoFoodBuyerTankPosition();
    const screenPosition = this.tankToScreenPoint(position.x, position.y);
    this.autoFoodBuyerElement.style.setProperty("--tank-side-tool-left", `${Math.round(screenPosition.x)}px`);
    this.autoFoodBuyerElement.style.setProperty("--tank-side-tool-top", `${Math.round(screenPosition.y)}px`);
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
    this.bindTankSideToolDrag(element, {
      getY: () => this.foodDispenserY,
      setY: (y) => {
        this.foodDispenserY = y;
      },
      syncPosition: () => this.syncFoodDispenserPosition(),
      savePosition: () => this.saveFoodDispenserY()
    });
  }

  private bindCoinMagnetDrag(element: HTMLElement): void {
    this.bindTankSideToolDrag(element, {
      getY: () => this.coinMagnetY,
      setY: (y) => {
        this.coinMagnetY = y;
      },
      syncPosition: () => this.syncCoinMagnetPosition(),
      savePosition: () => this.saveCoinMagnetY()
    });
  }

  private bindAutoFoodBuyerDrag(element: HTMLElement): void {
    this.bindTankSideToolDrag(element, {
      getY: () => this.autoFoodBuyerY,
      setY: (y) => {
        this.autoFoodBuyerY = y;
      },
      syncPosition: () => this.syncAutoFoodBuyerPosition(),
      savePosition: () => this.saveAutoFoodBuyerY()
    });
  }

  private bindTankSideToolDrag(element: HTMLElement, handlers: {
    getY: () => number;
    setY: (y: number) => void;
    syncPosition: () => void;
    savePosition: () => void;
  }): void {
    let pressed = false;
    let dragging = false;
    let startClientY = 0;
    let startY = handlers.getY();
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
      const rect = this.game.canvas.getBoundingClientRect();
      const designDeltaY = rect.height > 0 ? (clientDeltaY / rect.height) * gameHeight : 0;
      handlers.setY(Phaser.Math.Clamp(startY + designDeltaY, this.foodDispenserMinY(), this.foodDispenserMaxY()));
      handlers.syncPosition();
    };
    const end = (event: PointerEvent) => {
      if (!pressed) {
        return;
      }
      event.preventDefault();
      const shouldSave = dragging;
      cleanup(event.pointerId);
      if (shouldSave) {
        handlers.savePosition();
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
      startY = handlers.getY();
      this.capturePointerSafely(element, event.pointerId);
    });
    element.addEventListener("pointermove", move);
    element.addEventListener("pointerup", end);
    element.addEventListener("pointercancel", end);
    element.addEventListener("lostpointercapture", () => cleanup());
  }

  private loadFoodDispenserY(): void {
    this.foodDispenserY = loadUtilityPositionY({
      storageKey: foodDispenserPositionStorageKey,
      fallbackStorageKey: legacyFoodDispenserPositionStorageKey,
      fallbackY: this.foodDispenserY,
      minY: this.foodDispenserMinY(),
      maxY: this.foodDispenserMaxY()
    });
  }

  private saveFoodDispenserY(): void {
    saveUtilityPositionY({
      storageKey: foodDispenserPositionStorageKey,
      y: this.foodDispenserY,
      removeStorageKey: legacyFoodDispenserPositionStorageKey
    });
  }

  private loadCoinMagnetY(): void {
    this.coinMagnetY = loadUtilityPositionY({
      storageKey: coinMagnetPositionStorageKey,
      fallbackY: this.coinMagnetY,
      minY: this.foodDispenserMinY(),
      maxY: this.foodDispenserMaxY()
    });
  }

  private saveCoinMagnetY(): void {
    saveUtilityPositionY({
      storageKey: coinMagnetPositionStorageKey,
      y: this.coinMagnetY
    });
  }

  private loadAutoFoodBuyerY(): void {
    this.autoFoodBuyerY = loadUtilityPositionY({
      storageKey: autoFoodBuyerPositionStorageKey,
      fallbackY: this.autoFoodBuyerY,
      minY: this.foodDispenserMinY(),
      maxY: this.foodDispenserMaxY()
    });
  }

  private saveAutoFoodBuyerY(): void {
    saveUtilityPositionY({
      storageKey: autoFoodBuyerPositionStorageKey,
      y: this.autoFoodBuyerY
    });
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
      if (event instanceof MouseEvent && shouldSuppressHtmlClick()) {
        return;
      }
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
      if (event instanceof MouseEvent && shouldSuppressHtmlClick()) {
        return;
      }
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
    const pageCount = inventoryDockPageCount(allItems.length, inventoryDockPageSize);
    this.inventoryDockPage = clampInventoryDockPage(this.inventoryDockPage, pageCount);
    const visibleItems = inventoryDockPageItems(allItems, this.inventoryDockPage, inventoryDockPageSize);
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

    const page = pageForInventoryDockItem(items, this.recentInventoryDockItemKey, inventoryDockPageSize);
    if (page !== undefined) {
      this.inventoryDockPage = page;
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
      if (shouldSuppressHtmlClick()) {
        return;
      }
      onClick();
    });
    return button;
  }

  private syncFoodDockPosition(): void {
    if (!this.htmlFoodDock || this.activeScreen !== "tank") {
      return;
    }

    this.htmlFoodDock.style.setProperty("--food-dock-top", `${foodDockTopBelowMenu}px`);
  }

  private createHtmlFoodDock(): HTMLDivElement {
    const dock = document.createElement("div");
    dock.className = "aq-food-dock";
    document.body.appendChild(dock);
    return dock;
  }

  private visibleInventoryDockItems(): InventoryDockItem[] {
    return buildInventoryDockItems({
      fishMenuIcon: fishMenuIconAssetPath,
      getFoodInventory: (foodTypeId) => this.getFoodInventory(foodTypeId),
      foodLabel: (foodType) => this.foodDockLabel(foodType),
      foodDisplayCount: (foodType) => this.foodInventoryDisplayCount(foodType),
      foodBadgeLabel: (foodType) => this.foodInventoryBadgeLabel(foodType),
      totalStoredFishCount: () => this.totalStoredFishCount(),
      getDecorationInventory: (decorationTypeId, size) => this.getDecorationInventory(decorationTypeId, size),
      getCreatureInventory: (creatureTypeId) => this.getCreatureInventory(creatureTypeId)
    });
  }

  private inventoryDockItemKey(item: InventoryDockItem): string {
    return inventoryDockItemKeyModel(item);
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
    if (item.kind === "fish-menu") {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.openFishInventory();
      });
      return button;
    }
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
        if (this.activeFish().length >= this.maxFishCapacityForLevel() && !this.activeFishAtTankPoint(x, y)) {
          this.showTankFullText(x, y);
          return;
        }

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
    this.cancelPendingFusion();
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
    this.fishDeliveryBubbles?.destroyAll();
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
    if (screen === "album") {
      this.inventoryDrillOpen = false;
      this.tankMenuDrillOpen = false;
      this.tankMenuPage = 1;
    }
    this.closeModal();
    this.syncCoinDropVisibilityAndInput();
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

  private openFishInventory(): void {
    this.inventoryTab = "fish";
    this.inventoryDrillOpen = true;
    this.tankMenuDrillOpen = false;
    this.tankMenuPage = 1;
    this.openScreen("album");
    this.inventoryTab = "fish";
    this.inventoryDrillOpen = true;
    this.syncHtmlPageOverlay();
  }

  private closePage(): void {
    const closingScreen = this.activeScreen;
    this.removeShellBalanceScene();
    this.scene.resume("AquariumScene");
    this.scene.setVisible(true, "AquariumScene");
    this.scene.setActive(true, "AquariumScene");
    const returnToMainMenu = closingScreen !== "tank" && closingScreen !== "menu";
    this.cancelPendingFusion();
    this.prizeSpinInProgress = false;
    this.destroyPrizeSpinContainer();
    if (closingScreen === "makeup") {
      this.destroyMakeupDraft();
      this.makeupOverlay?.classList.add("hidden");
      this.makeupDraggedDecoration = undefined;
    }
    this.activeScreen = returnToMainMenu ? "menu" : "tank";
    this.tankMenuDrillOpen = false;
    this.inventoryDrillOpen = false;
    this.tankMenuPage = 1;
    this.storeOverlay?.hide();
    if (this.activeScreen === "tank") {
      this.hideHtmlPageOverlay();
    } else {
      this.syncHtmlPageOverlay();
    }
    this.syncCoinDropVisibilityAndInput();
    this.createScreenNav();
    this.createFoodDock();
    this.syncMakeupPresentation();
    this.refreshUi(false);
  }

  private returnToTankScreen(): void {
    this.removeShellBalanceScene();
    this.scene.resume("AquariumScene");
    this.scene.setVisible(true, "AquariumScene");
    this.scene.setActive(true, "AquariumScene");
    this.activeScreen = "tank";
    this.storeOverlay?.hide();
    this.hideHtmlPageOverlay();
    this.syncCoinDropVisibilityAndInput();
    this.createScreenNav();
    this.createFoodDock();
    this.syncMakeupPresentation();
    this.refreshUi(false);
  }

  private openStoreOverlay(): void {
    this.hideHtmlPageOverlay();
    this.htmlPageOverlay ??= this.createHtmlPageOverlay();
    this.storeOverlay ??= new StoreOverlay(
      () => this.storeOverlayState(),
      {
        close: () => this.closePage(),
        buyFish: (fishType) => this.showFishBuyQuantityModal(fishType),
        buyFood: (foodType, quantity) => this.showFoodBuyQuantityModal(foodType, quantity),
        buyHelper: (creatureType) => this.buyHelperCreature(creatureType),
        buyTankCosmetic: (category, id) => this.buyTankCosmeticFromStore(category, id),
        switchTankCosmetic: (category, id) => this.useTankCosmeticFromStore(category, id),
        buyTankDecoration: (decorationId, size) => this.buyDecorationFromStore(decorationId, size),
        selectTankDecoration: (decorationId, size) => this.selectDecoration(decorationId, size),
        buyTankUtility: (utilityId) => this.buyTankUtility(utilityId)
      },
      this.settings.reducedMotion,
      this.htmlPageOverlay
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
    const productionBoostAvailable = this.canBuyProductionBoostNow();
    const fishAvailable = this.canBuyAnotherFishThisHour();
    const cooldownKey = [
      ageBoostAvailable,
      productionBoostAvailable,
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
    const autoFoodBuyerActive = this.hasAutoFoodBuyer();
    const autoFoodBuyerRemainingMinutes = autoFoodBuyerActive ? this.autoFoodBuyerRemainingMinutes() : 0;
    if (
      coinMagnetActive === this.coinMagnetWasActive &&
      remainingMinutes === this.coinMagnetDisplayedMinutes &&
      autoFoodBuyerActive === this.autoFoodBuyerWasActive &&
      autoFoodBuyerRemainingMinutes === this.autoFoodBuyerDisplayedMinutes
    ) {
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
    const autoBuyerWasActive = this.autoFoodBuyerWasActive;
    this.autoFoodBuyerWasActive = autoFoodBuyerActive;
    this.autoFoodBuyerDisplayedMinutes = autoFoodBuyerRemainingMinutes;
    if (autoBuyerWasActive && !autoFoodBuyerActive) {
      this.decorationInventory.delete(autoFoodBuyerInventoryKey);
      this.floatText("Auto Buyer expired", toastX, toastY, "#d7f4ff");
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
      productionBoostPurchaseAvailable: this.canBuyProductionBoostNow(),
      productionBoostRestockLabel: this.productionBoostPurchaseRestockLabel(),
      fishCount: this.activeFish().length,
      fishCapacity: this.maxFishCapacityForLevel(),
      getFishOwned: (fishTypeId) =>
        this.fish.filter((currentFish) => currentFish.type.id === fishTypeId).length +
        this.getFishInventory(fishTypeId),
      getFoodOwned: (foodType) => this.foodInventoryDisplayCount(foodType),
      getHelperOwned: (helperTypeId) =>
        this.helperCreatures.filter((helper) => helper.type.id === helperTypeId).length +
        this.getCreatureInventory(helperTypeId),
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
      utilityDefinitions: tankUtilityStoreDefinitions({
        hasFoodDispenser: this.hasFoodDispenser(),
        hasCoinMagnet: this.hasCoinMagnet(),
        hasAutoFoodBuyer: this.hasAutoFoodBuyer()
      })
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
    const nextKey = `${this.activeScreen}:${this.tankMenuTab}:${this.tankMenuDrillOpen}:${this.tankMenuPage}:${this.inventoryTab}:${this.inventoryDrillOpen}`;
    this.htmlPageOverlayRenderKey = nextKey;
    this.htmlPageOverlay.className = "aq-page-shell";
    this.htmlPageOverlay.classList.remove("hidden");
    this.htmlPageOverlay.replaceChildren(this.createHtmlPage());
    if (previousKey !== nextKey) {
      playHtmlPageTransition(this.htmlPageOverlay, this.settings.reducedMotion);
    }
    installHtmlInputShield(this.htmlPageOverlay);
    if (previousKey === nextKey && this.htmlPageOverlayScrollTop > 0) {
      restorePageScrollTop(this.htmlPageOverlay, this.htmlPageOverlayScrollTop);
    }
  }

  private createHtmlPage(): HTMLElement {
    const meta = this.pageScreenMeta();
    const { page, content } = createPageShell(meta, this.htmlButton("X CLOSE", "aq-page-close", () => this.closePage()));
    if (this.activeScreen === "menu") {
      content.classList.add("aq-page-content-main-menu");
      this.appendMainMenuPage(content);
    } else if (this.activeScreen === "album") {
      this.appendAlbumPage(content);
    } else if (this.activeScreen === "goals") {
      this.appendGoalsPage(content);
    } else {
      this.appendSettingsPage(content);
    }

    return page;
  }

  private appendMainMenuPage(content: HTMLElement): void {
    const items: Array<{ id: string; label: string; icon: string; action: () => void; badge?: string }> = [
      { id: "shop", label: "Shop", icon: menuIconAssetPathByKey["ui-shop"], action: () => this.openScreen("store") },
      { id: "game", label: "Game", icon: menuIconAssetPathByKey["ui-game"], action: () => this.openPrizeMachineArcade() },
      { id: "shell-balance", label: "Fish Stack", icon: menuIconAssetPathByKey["ui-game"], action: () => this.openShellBalanceGame() },
      { id: "album", label: "Inventory", icon: menuIconAssetPathByKey["ui-book"], action: () => this.openScreen("album") },
      { id: "tanks", label: "Customize Tank", icon: menuIconAssetPathByKey["ui-tanks"], action: () => this.openMakeupMode() },
      { id: "goals", label: "Quest", icon: menuIconAssetPathByKey["ui-goals"], action: () => this.openScreen("goals"), badge: this.dailyGoalUnfinishedCount() > 0 ? this.foodBadgeLabel(this.dailyGoalUnfinishedCount()) : undefined },
      { id: "settings", label: "Settings", icon: menuIconAssetPathByKey["ui-settings"], action: () => this.openScreen("settings") }
    ];
    const statusItems: Array<{ icon: string; label: string; value: string; action?: () => void; badge?: string }> = [
      { icon: hudIconAssetPathByKey["ui-icon-total-wealth"], label: "Wealth", value: formatNumber(this.calculateTankNetWorth()) },
      { icon: hudIconAssetPathByKey["ui-icon-food-status"], label: "Food", value: formatNumber(this.getTotalFoodInventory()) },
      { icon: hudIconAssetPathByKey["ui-icon-clean-status"], label: "Clean", value: this.cleaningTank ? "Cleaning" : `${formatNumber(Math.round(this.cleanliness))}%`, action: () => this.cleanTank(), badge: this.isTankDirty() ? "!" : undefined },
      { icon: hudIconAssetPathByKey["ui-icon-happy-status"], label: "Happy", value: `${formatNumber(Math.round(this.calculateTankHappiness()))}%` }
    ];
    appendMainMenuPageView({
      content,
      items,
      statusItems,
      level: this.tankDisplayLevel(),
      production: this.fishProductionTotal(),
      createButton: (label, className, onClick, disabled) => this.htmlButton(label, className, onClick, disabled)
    });
  }

  private createDrillMenuCard(icon: string, label: string, description: string, action: () => void): HTMLButtonElement {
    return createDrillMenuCardView({
      icon,
      label,
      description,
      action,
      createButton: (buttonLabel, className, onClick, disabled) => this.htmlButton(buttonLabel, className, onClick, disabled)
    });
  }

  private createFusionDrillMenuCard(description: string, action: () => void): HTMLButtonElement {
    const button = this.htmlButton("", "aq-main-menu-card aq-kids-card-groove", action);
    const iconWrap = htmlElement("span", "aq-main-menu-icon-wrap aq-fusion-menu-icon-wrap", [
      htmlImage("/assets/fish/goldfish.png", "", "aq-main-menu-icon aq-fusion-menu-fish left"),
      htmlImage("/assets/fish/guppy.png", "", "aq-main-menu-icon aq-fusion-menu-fish right")
    ]);
    button.append(
      iconWrap,
      htmlElement("span", "aq-main-menu-label", ["Fusion"]),
      htmlElement("span", "aq-drill-menu-description", [description])
    );
    return button;
  }

  private createPageDrillHeader(title: string, onBack: () => void): HTMLElement {
    const row = htmlElement("div", "aq-page-drill-header");
    row.append(
      this.htmlButton("< BACK", "aq-store-back-button", onBack),
      htmlElement("div", "min-w-0 flex-1", [
        htmlElement("div", "truncate text-sm font-black leading-tight text-white", [title]),
        htmlElement("div", "truncate text-[10px] font-bold text-cyan-100/70", ["Choose an item"])
      ])
    );
    return row;
  }

  private pageScreenMeta(): PageScreenMeta {
    return buildPageScreenMeta({
      screen: this.activeScreen as PageOverlayScreen,
      fishCount: formatNumber(this.activeFish().length),
      helperCount: formatNumber(this.activeHelperCreatures().length),
      dailyGoalsDate: this.dailyGoals.date
    });
  }

  private appendInventoryTankTab(content: HTMLElement): void {
    this.appendInventoryTankSection(
      content,
      "Background",
      this.tankCosmetics("background")
        .filter((asset) => this.ownsTankCosmetic(asset))
        .map((asset) => this.createCosmeticHtmlCard(asset)),
      "No backgrounds owned",
      "Buy tank backgrounds from Shop."
    );
    this.appendInventoryTankSection(
      content,
      "Seabed",
      this.tankCosmetics("seabed")
        .filter((asset) => this.ownsTankCosmetic(asset))
        .map((asset) => this.createCosmeticHtmlCard(asset)),
      "No seabeds owned",
      "Buy tank seabeds from Shop."
    );
    this.appendInventoryTankSection(
      content,
      "Decor",
      decorationTypes
        .filter((decorationType) => decorationSizeOrder.some((size) => this.getOwnedDecorationCount(decorationType.id, size) > 0))
        .map((decorationType) => this.createDecorationHtmlCard(decorationType)),
      "No decorations owned",
      "Buy tank decorations from Shop."
    );
    this.appendInventoryTankSection(
      content,
      "Tools",
      this.ownedTankUtilityCards(),
      "No tools owned",
      "Buy tank utilities from Shop."
    );
  }

  private appendInventoryTankSection(content: HTMLElement, title: string, items: HTMLElement[], emptyTitle: string, emptyDetail: string): void {
    appendInventoryItemSection({
      content,
      title,
      items,
      emptyTitle,
      emptyDetail,
      listClassName: "aq-inventory-tank-grid"
    });
  }

  private createTankHtmlCard(level: number): HTMLElement {
    const owned = this.hasTankLevel(level);
    return createTankLevelInventoryCard({
      displayLevel: this.tankDisplayLevel(level),
      active: level === this.tankLevel,
      owned,
      name: this.getTankName(level),
      fishCount: this.fishInTank(level).length,
      capacity: this.maxFishCapacityForLevel(level),
      productionTotal: this.fishProductionTotal(level),
      summary: this.tankSummary(level),
      imageUrl: this.tankCardBackgroundUrl(level),
      accentColor: this.hexColor(this.tankAccentColor(level)),
      createButton: (label, className, onClick, disabled) => this.htmlButton(label, className, onClick, disabled),
      attachTouchFeedback: (element) => this.attachTouchFeedback(element),
      shouldSuppressClick: () => shouldSuppressHtmlClick(),
      onSwitch: () => this.switchTank(level),
      onOpenMakeup: () => this.openMakeupMode(level)
    });
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
      section: undefined,
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
          index,
          {
            originalTypeId: placedDecoration.typeId,
            originalSize: this.sanitizeDecorationSize(placedDecoration.size)
          }
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
    const { panel, decorationSettings } = this.createMakeupPanel();
    this.makeupDecorationSettingsElement = decorationSettings;
    this.makeupOverlay.replaceChildren(panel);
    if (decorationSettings) {
      window.requestAnimationFrame(() => this.updateMakeupDecorationSettingsPosition());
    }
  }

  private createMakeupOverlay(): HTMLDivElement {
    const overlay = document.createElement("div");
    overlay.className = "aq-makeup-overlay";
    overlay.addEventListener("pointerdown", () => this.handleMakeupOutsidePointerDown());
    document.body.appendChild(overlay);
    return overlay;
  }

  private createMakeupPanel(): MakeupPanelResult {
    const draft = this.makeupDraft!;
    return createMakeupPanelView({
      draft,
      totalCostElement: this.makeupCostElement(this.makeupTotalCost()),
      decorationTypes,
      decorationSizeOrder,
      decorationSizeLabel: (size) => decorationSizes[size].label,
      tankCosmetics: (category) => this.tankCosmetics(category),
      selectedCosmetic: (category) => this.makeupSelectedCosmetic(category),
      tankCosmeticImageUrl: (asset) => this.tankCosmeticImageUrl(asset),
      hexColor: (color) => this.hexColor(color),
      ownsTankCosmetic: (asset) => this.ownsTankCosmetic(asset),
      rarityIconPath: (rarity) => this.rarityIconPath(rarity as Rarity),
      rarityForPrice: (price) => this.rarityForPrice(price),
      coinAssetPathByType,
      decorationVariantPrice: (decorationType, size) => this.decorationVariantPrice(decorationType, size),
      renderBlueTintIntensity: (category, id) => this.renderTankCosmeticBlueTintIntensity(category, id),
      backgroundScrollLeft: this.makeupBackgroundScrollLeft,
      decorScrollLeft: this.makeupDecorScrollLeft,
      attachTouchFeedback: (element, compact) => this.attachTouchFeedback(element, compact),
      onApply: () => this.showMakeupApplyConfirmation(),
      onClose: () => this.closeMakeupMode(false),
      onSetSection: (section) => this.setMakeupSection(section),
      onSetDecorationTypeIndex: (index, restoreScrollLeft) => this.setMakeupDecorationTypeIndex(index, restoreScrollLeft),
      onAddDecoration: () => this.addMakeupDecoration(),
      onSetDecorationSize: (size) => this.setMakeupDecorationSize(size),
      onMoveSelectedDecorationDepth: (direction) => this.moveSelectedMakeupDecorationDepth(direction),
      onRemoveSelectedDecoration: () => this.removeSelectedMakeupDecoration(),
      onSetCosmeticIndex: (category, index, restoreScrollLeft) => this.setMakeupCosmeticIndex(category, index, restoreScrollLeft),
      onSetBlueTint: (category, intensity) => this.setMakeupBlueTint(category, intensity),
      onBackgroundScroll: (scrollLeft) => {
        this.makeupBackgroundScrollLeft = scrollLeft;
      },
      onDecorScroll: (scrollLeft) => {
        this.makeupDecorScrollLeft = scrollLeft;
      }
    });
  }

  private setMakeupSection(section: MakeupSection | undefined): void {
    if (!this.makeupDraft) {
      return;
    }

    this.makeupDraft.section = section;
    this.syncMakeupOverlay();
  }

  private updateMakeupDecorationSettingsPosition(): void {
    const settings = this.makeupDecorationSettingsElement;
    const draft = this.makeupDraft;
    const selectedDecorationIndex = draft?.selectedDecorationIndex;
    const selectedDecoration = selectedDecorationIndex !== undefined ? draft?.decorations[selectedDecorationIndex] : undefined;
    if (!settings || !selectedDecoration) {
      return;
    }

    const position = this.tankToScreenPoint(selectedDecoration.x, selectedDecoration.y);
    const leftPercent = Phaser.Math.Clamp((position.x / gameWidth) * 100, 14, 86);
    const topPercent = Phaser.Math.Clamp(((position.y - 88) / gameHeight) * 100, 14, 82);
    settings.style.left = `${leftPercent}%`;
    settings.style.top = `${topPercent}%`;
  }

  private handleMakeupOutsidePointerDown(): void {
    if (this.activeScreen !== "makeup" || this.makeupDraggedDecoration || this.makeupDraft?.section !== "decor" || this.makeupDraft.selectedDecorationIndex === undefined) {
      return;
    }

    this.makeupDraft.selectedDecorationIndex = undefined;
    this.makeupDecorationSettingsElement = undefined;
    this.syncMakeupOverlay();
  }

  private makeupSelectedCosmetic(category: TankCosmeticCategory): TankCosmetic {
    const cosmetics = this.tankCosmetics(category);
    const index = category === "background" ? this.makeupDraft?.backgroundIndex ?? 0 : this.makeupDraft?.seabedIndex ?? 0;
    return cosmetics[index] ?? cosmetics[0]!;
  }

  private setMakeupCosmeticIndex(category: TankCosmeticCategory, index: number, restoreScrollLeft?: number): void {
    if (!this.makeupDraft) {
      return;
    }

    const cosmetics = this.tankCosmetics(category);
    if (!cosmetics[index]) {
      return;
    }

    if (category === "background") {
      this.makeupBackgroundScrollLeft = restoreScrollLeft ?? this.makeupBackgroundScrollLeft;
      this.makeupDraft.backgroundIndex = index;
      this.layoutTankBackground();
    } else {
      this.makeupDraft.seabedIndex = index;
      this.layoutTankFloor();
    }
    this.syncMakeupOverlay();
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

  private setMakeupDecorationTypeIndex(index: number, restoreScrollLeft = this.makeupDecorScrollLeft): void {
    if (!this.makeupDraft || !decorationTypes[index]) {
      return;
    }

    this.makeupDecorScrollLeft = restoreScrollLeft;
    this.makeupDraft.selectedDecorationTypeIndex = index;
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

  private createMakeupDecorationDraft(decoration: DecorationType, size: DecorationSize, x: number, y: number, depth = 0, original?: { originalTypeId: string; originalSize: DecorationSize }): MakeupDecorationDraft {
    const image = this.add.image(x, y, decoration.texture).setDepth(this.makeupDecorationDisplayDepth(depth)).setAlpha(0.9);
    this.fitDecorationDisplay(image, decoration, size);
    image.setInteractive({ useHandCursor: true });
    this.tankLayer.add(image);
    const draft: MakeupDecorationDraft = { typeId: decoration.id, size, x, y, depth, image, ...original };
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
      this.makeupDraft.section = "decor";
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
    this.updateMakeupDecorationDragAtDesignPoint(pointerPoint);
  }

  private updateMakeupDecorationDragAtDesignPoint(pointerPoint: Phaser.Math.Vector2): void {
    if (this.activeScreen !== "makeup" || !this.makeupDraggedDecoration) {
      return;
    }

    const tankPoint = this.screenToTankPoint(pointerPoint.x, pointerPoint.y);
    const decoration = this.makeupDraggedDecoration;
    decoration.x = Phaser.Math.Clamp(tankPoint.x, tankBounds.left + 24, tankBounds.right - 24);
    decoration.y = Phaser.Math.Clamp(tankPoint.y, tankBounds.top + 118, tankBounds.bottom - 30);
    decoration.image.setPosition(decoration.x, decoration.y);
    this.updateMakeupDecorationSettingsPosition();
  }

  private makeupDecorationAtPointer(designX: number, designY: number): MakeupDecorationDraft | undefined {
    if (this.activeScreen !== "makeup" || this.makeupDraft?.section !== "decor") {
      return undefined;
    }

    const tankPoint = this.screenToTankPoint(designX, designY);
    return this.makeupDraft.decorations
      .filter((decoration) => {
        const radiusX = Math.max(34, decoration.image.displayWidth * 0.58);
        const radiusY = Math.max(34, decoration.image.displayHeight * 0.58);
        return Math.abs(tankPoint.x - decoration.x) <= radiusX && Math.abs(tankPoint.y - decoration.y) <= radiusY;
      })
      .sort((first, second) => second.depth - first.depth || second.y - first.y)[0];
  }

  private endMakeupDecorationDrag(): void {
    if (!this.makeupDraggedDecoration) {
      return;
    }

    this.makeupDraggedDecoration.image.setAlpha(0.9);
    this.makeupDraggedDecoration = undefined;
    this.nativeMakeupDraggedDecoration = undefined;
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
        decoration.image.setDepth(makeupDecorationDisplayDepth(index));
      }
      this.tankLayer.bringToTop(decoration.image);
    });
  }

  private makeupDecorationDisplayDepth(index: number): number {
    return makeupDecorationDisplayDepth(index);
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
    return makeupTotalCostModel({
      draft: this.makeupDraft,
      background: this.makeupSelectedCosmetic("background"),
      seabed: this.makeupSelectedCosmetic("seabed"),
      ownsTankCosmetic: (asset) => this.ownsTankCosmetic(asset),
      decorationCostEntries: this.makeupDecorationCostEntries()
    });
  }

  private makeupDecorationCostEntries(): Array<{ line: string; price: Price; count: number }> {
    return makeupDecorationCostEntriesModel({
      draft: this.makeupDraft,
      decorationTypes,
      decorationSizeLabel: (size) => decorationSizes[size].label,
      decorationInventoryKey: (decorationTypeId, size) => this.decorationInventoryKey(decorationTypeId, size),
      getDecorationInventory: (decorationTypeId, size) => this.getDecorationInventory(decorationTypeId, size),
      decorationVariantPrice: (decorationType, size) => this.decorationVariantPrice(decorationType, size),
      priceWealth: (price) => this.priceWealth(price),
      formatNumber
    });
  }

  private decorationSizeUpgradePrice(decorationType: DecorationType, fromSize: DecorationSize, toSize: DecorationSize): Price {
    return decorationSizeUpgradePriceModel({
      decorationType,
      fromSize,
      toSize,
      decorationVariantPrice: (item, size) => this.decorationVariantPrice(item, size)
    });
  }

  private priceComponentAmount(price: Price, coinType: CoinType): number {
    return priceComponentAmountModel(price, coinType);
  }

  private makeupPurchaseLines(): string[] {
    return makeupPurchaseLinesModel({
      draft: this.makeupDraft,
      background: this.makeupSelectedCosmetic("background"),
      seabed: this.makeupSelectedCosmetic("seabed"),
      ownsTankCosmetic: (asset) => this.ownsTankCosmetic(asset),
      decorationCostEntries: this.makeupDecorationCostEntries()
    });
  }

  private makeupCostElement(price: Price): HTMLElement {
    return createMakeupCostElement({
      price,
      priceWealth: (itemPrice) => this.priceWealth(itemPrice),
      coinAssetPathByType
    });
  }

  private priceIconRow(price: Price, label = "Total price"): HTMLElement {
    return createPriceIconRow({
      price,
      label,
      priceWealth: (itemPrice) => this.priceWealth(itemPrice),
      coinAssetPathByType
    });
  }

  private commonCoinValueRow(label: string, amount: number): HTMLElement {
    return createCommonCoinValueRow({
      label,
      amount,
      commonCoinAssetPath: coinAssetPathByType.common
    });
  }

  private walletIconRow(label: string, wallet: Wallet): HTMLElement {
    return createWalletIconRow({
      label,
      wallet,
      coinAssetPathByType
    });
  }

  private addPriceToWallet(total: Wallet, price: Price, multiplier = 1): void {
    addPriceToWalletModel(total, price, multiplier);
  }

  private walletToPrice(wallet: Wallet): Price {
    return walletToPriceModel(wallet);
  }

  private showMakeupApplyConfirmation(): void {
    if (!this.makeupDraft) {
      return;
    }

    const cost = this.makeupTotalCost();
    const purchaseLines = this.makeupPurchaseLines();
    const bodyElements = [
      this.priceIconRow(cost),
      htmlElement("p", "aq-modal-line", [purchaseLines.length > 0 ? "Items purchased:" : "Items purchased: none"]),
      ...(purchaseLines.length > 0 ? purchaseLines : ["Only owned items will be used."]).map((line) => htmlElement("p", "aq-modal-line", [line]))
    ];
    this.showModal(
      "Apply Tank Look?",
      [],
      [
        {
          label: "Apply",
          fill: 0x356a35,
          action: () => {
            this.closeModal();
            this.applyMakeupLook();
          }
        },
        { label: "Cancel", fill: 0x254d68, action: () => this.closeModal() }
      ],
      bodyElements
    );
  }

  private applyMakeupLook(): void {
    if (!this.makeupDraft) {
      return;
    }

    const cost = this.makeupTotalCost();
    if (this.priceWealth(cost) > 0 && !this.spendPrice(cost)) {
      return;
    }
    const boughtDecorationCount = this.makeupDecorationCostEntries().length;

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
    this.removeAllPlacedDecorationsFromActiveTank();
    this.makeupDraft.decorations = [];
    for (const [index, decoration] of draftDecorations.entries()) {
      const decorationType = decorationTypes.find((item) => item.id === decoration.typeId);
      decoration.image.destroy();
      if (!decorationType) {
        continue;
      }
      const isExistingPlacedDecoration = decoration.originalTypeId === decoration.typeId && Boolean(decoration.originalSize);
      if (!isExistingPlacedDecoration && this.getDecorationInventory(decoration.typeId, decoration.size) > 0) {
        this.consumeStoredDecoration(decoration.typeId, decoration.size);
      }
      this.addDecorationToTank(decorationType, decoration.x, decoration.y, decoration.size, this.tankLevel, this.tankDecorationDepthFromOrder(index));
      this.recordDailyQuestAction("place-decoration");
    }

    if (boughtDecorationCount > 0) {
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
    this.makeupBackgroundScrollLeft = 0;
    this.makeupDecorScrollLeft = 0;
    this.activeScreen = "menu";
    this.layoutTankBackground();
    this.layoutTankFloor();
    this.syncMakeupPresentation();
    this.syncHtmlPageOverlay();
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
    const selected = this.selectedTankCosmeticId(asset.category) === asset.id;
    return createTankCosmeticInventoryCard({
      name: asset.name,
      selected,
      imageUrl: this.tankCosmeticImageUrl(asset),
      tintColor: this.hexColor(asset.tint),
      blueTintIntensity: this.tankCosmeticBlueTintIntensity(asset.category, asset.id),
      createButton: (label, className, onClick, disabled) => this.htmlButton(label, className, onClick, disabled),
      attachTouchFeedback: (element) => this.attachTouchFeedback(element),
      onApply: () => this.useTankCosmetic(asset)
    });
  }

  private createDecorationHtmlCard(decorationType: DecorationType): HTMLElement {
    const sizeRows = decorationSizeOrder.flatMap((size) => {
      const stored = this.getDecorationInventory(decorationType.id, size);
      const placed = this.getPlacedDecorationCount(decorationType.id, size);
      const owned = stored + placed;
      if (owned <= 0) {
        return [];
      }
      const label = stored > 0
        ? `${decorationSizes[size].label} x${formatNumber(stored)}`
        : `${decorationSizes[size].label} in tank x${formatNumber(placed)}`;
      return [{
        label,
        sellValue: this.decorationSellValue(decorationType, size, owned),
        selectDisabled: stored <= 0,
        onSelect: () => this.selectDecoration(decorationType.id, size),
        onSell: () => this.showDecorationSellConfirmation(decorationType.id, size)
      }];
    });
    return createDecorationInventoryCard({
      decorationType,
      rarityLabel: this.rarityStarsLabel(decorationType.rarity),
      sizeRows,
      createButton: (label, className, onClick, disabled) => this.htmlButton(label, className, onClick, disabled)
    });
  }

  private ownedTankUtilityCards(): HTMLElement[] {
    return ownedTankUtilityInventoryCardsModel({
      hasFoodDispenser: this.hasFoodDispenser(),
      hasCoinMagnet: this.hasCoinMagnet(),
      hasAutoFoodBuyer: this.hasAutoFoodBuyer(),
      foodDispenserFoodLabel: this.foodBadgeLabel(this.getTotalDispenserInventory()),
      coinMagnetMinutesLabel: formatNumber(this.coinMagnetRemainingMinutes()),
      autoFoodBuyerMinutesLabel: formatNumber(this.autoFoodBuyerRemainingMinutes())
    }).map((card) => this.createTankUtilityHtmlCard(card));
  }

  private createTankUtilityHtmlCard(options: { id: TankUtilityId; name: string; icon: string; meta: string; copy: string; price: Price }): HTMLElement {
    const sellValue = this.tankUtilitySellValue(options.price);
    return createTankUtilityInventoryCard({
      id: options.id,
      name: options.name,
      icon: options.icon,
      meta: options.meta,
      copy: options.copy,
      sellValue,
      createButton: (label, className, onClick, disabled) => this.htmlButton(label, className, onClick, disabled),
      onSell: (id) => this.showTankUtilitySellConfirmation(id as TankUtilityId)
    });
  }

  private appendAlbumPage(content: HTMLElement): void {
    content.classList.add("aq-page-content-scroll");
    if (!this.inventoryDrillOpen) {
      content.classList.add("aq-page-content-main-menu");
      content.append(this.createInventoryCategoryGrid());
      return;
    }

    const title = this.inventoryTitle(this.inventoryTab);
    content.append(this.createPageDrillHeader(title, () => {
      this.inventoryDrillOpen = false;
      this.tankMenuDrillOpen = false;
      this.syncHtmlPageOverlay();
    }));
    if (this.inventoryTab === "fish") {
      this.appendInventoryFishTab(content);
      return;
    }
    if (this.inventoryTab === "fusion") {
      this.appendInventoryFusionTab(content);
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
    if (this.inventoryTab === "tank") {
      this.appendInventoryTankTab(content);
      return;
    }
    this.appendInventoryCoinsTab(content);
  }

  private createInventoryCategoryGrid(): HTMLElement {
    const items = buildInventoryCategoryItems<InventoryTab>({
      activeFishCount: this.activeFish().length,
      fishMenuIcon: fishMenuIconAssetPath,
      tankMenuIcon: menuIconAssetPathByKey["ui-tanks"],
      getFishInventory: (fishTypeId) => this.getFishInventory(fishTypeId),
      getFoodInventory: (foodTypeId) => this.getFoodInventory(foodTypeId),
      getOwnedDecorationCount: (decorationTypeId, size) => this.getOwnedDecorationCount(decorationTypeId, size),
      formatNumber,
      tabs: {
        fish: "fish",
        fusion: "fusion",
        food: "food",
        decor: "decor",
        tank: "tank",
        coins: "coins"
      }
    });
    const grid = htmlElement("div", "aq-main-menu-grid");
    items.forEach((item) => {
      const action = () => {
        this.inventoryTab = item.tab;
        this.inventoryDrillOpen = true;
        this.tankMenuDrillOpen = false;
        this.tankMenuPage = 1;
        this.syncHtmlPageOverlay();
      };
      grid.append(item.tab === "fusion"
        ? this.createFusionDrillMenuCard(item.description, action)
        : this.createDrillMenuCard(item.icon, item.label, item.description, action));
    });
    return grid;
  }

  private inventoryTitle(tab: InventoryTab): string {
    return inventoryCategoryTitle(tab);
  }

  private appendInventoryFishTab(content: HTMLElement): void {
    const activeFish = this.activeFish();
    appendInventoryItemSection({
      content,
      title: "Tank Fish",
      items: activeFish.map((fish) => createFishAlbumRow({
        fish,
        index: this.fish.indexOf(fish),
        happinessPercent: this.fishHappinessPercent(fish),
        rarityLabel: this.rarityLabel(fish.type.rarity),
        sellValue: this.activeFishSellValue(fish),
        createButton: this.pageButtonFactory(),
        onStore: (index) => this.storeFishByIndex(index),
        onSell: (index) => this.showSellConfirmation(index)
      })),
      emptyTitle: "No fish in this tank",
      emptyDetail: "Buy fish from Shop, then choose To Tank from inventory."
    });

    const storedFish = fishTypes.filter((fishType) => this.getFishInventory(fishType.id) > 0);
    appendInventoryItemSection({
      content,
      title: "My Fish Inventory",
      items: storedFish.map((fishType) => this.createStoredFishInventoryRow(fishType)),
      emptyTitle: "No fish in inventory",
      emptyDetail: "Buy fish from Shop, then choose which ones go into the tank."
    });
  }

  private appendInventoryFusionTab(content: HTMLElement): void {
    const sources = this.fishFusionSources();
    const fusionList = createFusionPageRoot();
    const canStart = sources.length >= 2;
    const validKeys = new Set(sources.map((source) => source.key));
    this.fusionPreviewSourceKeys = new Set([...this.fusionPreviewSourceKeys].filter((key) => validKeys.has(key)).slice(0, 2));
    if (!canStart && !this.fusionPageResult) {
      fusionList.append(createPageEmptyCard("Need 2 owned fish", "Keep at least two tank or inventory fish to start fusion."));
    } else {
      const selectedDock = htmlElement("div", "aq-fusion-selected-dock");
      const outputStage = createFusionOutputStage();
      const renderSavedResult = () => {
        const resultFish = this.fusionPageResult ? fishTypes.find((fishType) => fishType.id === this.fusionPageResult?.fishTypeId) : undefined;
        if (!resultFish || !this.fusionPageResult) {
          outputStage.replaceChildren(createFusionMachinePlaceholder("Choose two fish to reveal Normal and Premium outcomes."));
          return;
        }
        outputStage.replaceChildren(
          createFusionFinalResult({
            label: this.fusionPageResult.label,
            fishType: resultFish,
            ageSeconds: this.fusionPageResult.ageSeconds,
            ageLabel: (seconds) => this.fusionAgeLabel(seconds)
          })
        );
      };
      let previewButton: HTMLButtonElement;
      const sourceByKey = new Map(sources.map((source) => [source.key, source]));
      const selectedSourceKeys = (): string[] => [...this.fusionPreviewSourceKeys].filter((key) => sourceByKey.has(key)).slice(0, 2);
      const selectedSources = (): FishFusionSource[] => selectedSourceKeys().map((key) => sourceByKey.get(key)).filter((source): source is FishFusionSource => Boolean(source));
      const updatePreviewSelection = () => {
        const selected = selectedSources();
        const fusionCost = selected.length === 2 ? this.fishFusionCostFor(selected) : undefined;
        const canPayFusionCost = !fusionCost || this.developerGodMode || canAfford(this.wallet, fusionCost);
        previewButton.disabled = selected.length !== 2 || !canPayFusionCost;
        previewButton.textContent = selected.length === 2
          ? canPayFusionCost
            ? `Fuse C${formatNumber(fusionCost?.amount ?? 0)}`
            : `Need C${formatNumber(fusionCost?.amount ?? 0)}`
          : `Select ${formatNumber(2 - selected.length)} More`;
        selectedDock.replaceChildren(
          ...createFusionSelectedDockChildren({
            selected,
            sources,
            ageLabel: (seconds) => this.fusionAgeLabel(seconds),
            attachTouchFeedback: (button) => this.attachTouchFeedback(button),
            onPickSlot: (slotIndex, pickerSources) => this.showFusionFishPicker(slotIndex, pickerSources)
          })
        );
        if (selected.length === 2) {
          const resultTypes = this.fishFusionResultTypes(selected);
          if (resultTypes.normal) {
            const chances = this.fishFusionChancesFor(selected, Boolean(resultTypes.premium));
            const inheritedAge = Math.max(...selected.map((source) => source.ageSeconds));
            outputStage.replaceChildren(
              ...createFusionResultList({
                normal: resultTypes.normal,
                premium: resultTypes.premium,
                normalChance: chances.normal,
                premiumChance: chances.premium,
                ageSeconds: inheritedAge,
                costAmount: this.fishFusionCostFor(selected).amount,
                ageLabel: (seconds) => this.fusionAgeLabel(seconds)
              })
            );
          } else {
            outputStage.replaceChildren(createFusionMachinePlaceholder("No un-owned fish available."));
          }
        } else {
          renderSavedResult();
        }
      };
      previewButton = createHtmlButton("Select 2 Fish", "aq-fusion-preview-button", () => {
        const selected = selectedSources();
        if (selected.length !== 2) {
          return;
        }
        const resultTypes = this.fishFusionResultTypes(selected);
        if (!resultTypes.normal) {
          this.floatText("No un-owned fish", toastX, toastY, "#ffb0a8");
          return;
        }
        const fusionCost = this.fishFusionCostFor(selected);
        if (!this.developerGodMode && !canAfford(this.wallet, fusionCost)) {
          return;
        }

        previewButton.disabled = true;
        previewButton.textContent = "Fusing...";
        const fusionDurationMs = this.settings.reducedMotion ? 1200 : fishFusionDurationMs;
        outputStage.replaceChildren(
          createFusionLoadingChamber({
            leftFishType: selected[0].type,
            rightFishType: selected[1].type
          })
        );
        outputStage.style.setProperty("--aq-fusion-duration", `${fusionDurationMs}ms`);

        const chances = this.fishFusionChancesFor(selected, Boolean(resultTypes.premium));
        const roll = Math.random();
        const resultOutcome = resultTypes.premium && roll < chances.premium
          ? { label: "Premium", fishType: resultTypes.premium }
          : { label: "Normal", fishType: resultTypes.normal };
        const inheritedAge = Math.max(...selected.map((source) => source.ageSeconds));
        const fusionToken = ++this.fusionRunToken;

        this.pendingFusionTimer = window.setTimeout(() => {
          this.pendingFusionTimer = undefined;
          if (fusionToken !== this.fusionRunToken || this.activeScreen !== "album" || !document.body.contains(outputStage)) {
            return;
          }
          if (!this.areFishFusionSourcesAvailable(selected)) {
            this.fusionPreviewSourceKeys.clear();
            outputStage.style.removeProperty("--aq-fusion-duration");
            updatePreviewSelection();
            outputStage.replaceChildren(createFusionMachinePlaceholder("Fusion source changed. Select two fish again."));
            return;
          }
          if (!this.spendPrice(fusionCost)) {
            outputStage.style.removeProperty("--aq-fusion-duration");
            updatePreviewSelection();
            outputStage.replaceChildren(createFusionMachinePlaceholder(`Need ${formatPrice(fusionCost)} to fuse.`));
            return;
          }
          const resultType = resultOutcome.fishType;
          this.captureActiveTankState();
          this.consumeFishFusionSources(selected);
          this.addFishToInventory(resultType);
          this.addStoredFishAge(resultType.id, inheritedAge);
          this.ensureFishTexturesLoaded(resultType);
          outputStage.style.removeProperty("--aq-fusion-duration");
          this.fusionPageResult = {
            label: resultOutcome.label,
            fishTypeId: resultType.id,
            ageSeconds: inheritedAge
          };
          this.fusionPreviewSourceKeys.clear();
          this.floatText(`-${formatPrice(fusionCost)} fusion`, toastX, toastY, "#ffdc7a");
          this.floatText(`${resultType.name} moved to inventory`, toastX, toastY, "#a8ffb0");
          this.createFoodDock();
          updatePreviewSelection();
          this.saveNow();
          this.refreshStatus();
          this.syncHtmlGameInterface();
          this.showPrizeCelebration(
            `Fusion ${resultOutcome.label}!`,
            `/assets/fish/${resultType.id}.png`,
            `${resultType.name} inventory | ${this.fusionAgeLabel(inheritedAge)}`,
            "Close",
            () => this.closePage()
          );
        }, fusionDurationMs);
      }, {
        disabled: this.fusionPreviewSourceKeys.size !== 2,
        attachTouchFeedback: (button) => this.attachTouchFeedback(button)
      });
      fusionList.append(...createFusionMachine({ selectedDock, outputStage, previewButton }));
      updatePreviewSelection();
    }
    content.append(fusionList);
  }

  private showFusionFishPicker(slotIndex: 0 | 1, sources: FishFusionSource[]): void {
    this.closeModal();
    this.modalTitle = "Choose Fish";

    const selectedKeys = [...this.fusionPreviewSourceKeys].slice(0, 2);
    const chooseSource = (source: FishFusionSource) => {
      this.fusionPageResult = undefined;
      selectedKeys[slotIndex] = source.key;
      this.fusionPreviewSourceKeys = new Set(selectedKeys.filter((key, index) => key && selectedKeys.indexOf(key) === index).slice(0, 2));
      this.closeModal();
      this.syncHtmlPageOverlay();
    };

    const shell = createFusionFishPickerShell({
      slotIndex,
      sources,
      selectedKeys: this.fusionPreviewSourceKeys,
      ageLabel: (seconds) => this.fusionAgeLabel(seconds),
      attachTouchFeedback: (button) => this.attachTouchFeedback(button),
      onChoose: chooseSource,
      onCancel: () => this.closeModal()
    });
    document.body.appendChild(shell);
    this.modal = shell;
    this.syncCoinDropVisibilityAndInput();
  }

  private appendInventoryFoodTab(content: HTMLElement): void {
    const ownedFood = foodTypes.filter((foodType) => !hiddenFoodTypeIds.has(foodType.id) && this.getFoodInventory(foodType.id) > 0);
    appendInventoryItemSection({
      content,
      items: ownedFood.map((foodType) => this.createFoodInventoryRow(foodType)),
      emptyTitle: "No food owned",
      emptyDetail: "Buy food and medicine from Shop."
    });
  }

  private appendInventoryDecorTab(content: HTMLElement): void {
    const rows: HTMLElement[] = [];
    decorationTypes.forEach((decorationType) => {
      decorationSizeOrder.forEach((size) => {
        if (this.getOwnedDecorationCount(decorationType.id, size) > 0) {
          rows.push(this.createDecorationInventoryRow(decorationType, size));
        }
      });
    });
    appendInventoryItemSection({
      content,
      items: rows,
      emptyTitle: "No decorations owned",
      emptyDetail: "Buy tank decorations from Shop."
    });
  }

  private appendInventoryCoinsTab(content: HTMLElement): void {
    appendInventoryItemSection({
      content,
      items: [
        this.createCoinInventoryRow("rare"),
        this.createCoinInventoryRow("superRare")
      ],
      emptyTitle: "No special coins owned",
      emptyDetail: "Special coins from rewards will show here."
    });
  }

  private createStoredFishInventoryRow(fishType: FishType): HTMLElement {
    const count = this.getFishInventory(fishType.id);
    const sellValue = this.storedFishSellValue(fishType);
    const storedAges = this.storedFishAgesFor(fishType.id);
    const ageCopy = storedAges.length > 0 ? ` | Oldest ${this.fusionAgeLabel(storedAges[0])}` : "";
    return createStoredFishInventoryRowView({
      fishType,
      count,
      sellValue,
      ageCopy,
      rarityLabel: this.rarityLabel(fishType.rarity),
      createButton: (label, className, onClick, disabled) => this.htmlButton(label, className, onClick, disabled),
      onPlace: () => this.prepareFishPlacement(fishType.id),
      onSell: () => this.showStoredFishSellConfirmation(fishType.id)
    });
  }

  private createFoodInventoryRow(foodType: FoodType): HTMLElement {
    const rawAmount = this.getFoodInventory(foodType.id);
    const countLabel = this.foodInventoryBadgeLabel(foodType);
    const sellValue = this.foodSellValue(foodType, rawAmount);
    return createFoodInventoryRowView({
      foodType,
      countLabel,
      sellValue,
      imageUrl: foodAssetPath(foodType.id),
      imageFilter: foodCssFilterFor(foodType.id),
      createButton: (label, className, onClick, disabled) => this.htmlButton(label, className, onClick, disabled),
      onSell: () => this.showFoodSellConfirmation(foodType.id)
    });
  }

  private createCoinInventoryRow(coinType: "rare" | "superRare"): HTMLElement {
    const count = this.wallet[coinType];
    const value = this.coinSellValue(coinType, count);
    const icon = coinType === "rare" ? "/assets/ui/shop/coin_icon_rare.png" : "/assets/ui/shop/coin_icon_super_rare.png";
    return createCoinInventoryRowView({
      coinType,
      count,
      value,
      icon,
      createButton: (label, className, onClick, disabled) => this.htmlButton(label, className, onClick, disabled),
      onSell: () => this.showCoinSellConfirmation(coinType)
    });
  }

  private createDecorationInventoryRow(decorationType: DecorationType, size: DecorationSize): HTMLElement {
    const storedCount = this.getDecorationInventory(decorationType.id, size);
    const placedCount = this.getPlacedDecorationCount(decorationType.id, size);
    const count = storedCount + placedCount;
    const sellValue = this.decorationSellValue(decorationType, size, count);
    const sizeLabel = decorationSizes[size].label;
    return createDecorationInventoryRowView({
      decorationType,
      size,
      sizeLabel,
      storedCount,
      placedCount,
      sellValue,
      createButton: (label, className, onClick, disabled) => this.htmlButton(label, className, onClick, disabled),
      onSell: () => this.showDecorationSellConfirmation(decorationType.id, size)
    });
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
    this.prizeCommonFish = this.nextPrizeFish("common");
    this.prizeRareFish = this.nextPrizeRareFish();
    this.ensurePrizeWheelFishTexturesLoaded();
    this.showPrizeMachineSpinner();
  }

  private openShellBalanceGame(): void {
    this.placementMode = { kind: "none" };
    this.activeScreen = "prize";
    this.closeModal();
    this.storeOverlay?.hide();
    this.hideHtmlPageOverlay();
    this.syncHtmlGameInterface();
    this.tankMenuOverlay?.classList.add("hidden");
    this.gameHudOverlay?.classList.add("hidden");
    this.htmlFoodDock?.classList.add("hidden");
    this.destroyPrizeSpinContainer();
    this.hideShellBalanceSceneImmediately();
    this.scene.remove(ShellBalanceSceneKey);
    this.scene.add(ShellBalanceSceneKey, ShellBalanceScene, false);
    this.scene.launch(ShellBalanceSceneKey, {
      productionPerMinute: this.activeFishProductionPerMinute(),
      onComplete: (result: ShellBalanceResult) => this.completeShellBalanceGame(result),
      onCancel: () => this.returnFromShellBalanceGame()
    });
    this.scene.bringToTop(ShellBalanceSceneKey);
    this.time.delayedCall(0, () => this.scene.pause("AquariumScene"));
  }

  private completeShellBalanceGame(result: ShellBalanceResult): void {
    const productionPerMinute = this.activeFishProductionPerMinute();
    const mismatchMultiplier = Math.max(0, 1 - result.mismatchCount * 0.05);
    const rewardCommonCoins = Math.max(0, Math.floor(result.caughtCount * productionPerMinute * mismatchMultiplier));
    earn(this.wallet, "common", rewardCommonCoins);
    this.recordDailyQuestAction("prize-game");
    this.saveNow();
    this.returnFromShellBalanceGame();
  }

  private activeFishProductionPerMinute(): number {
    const now = this.time.now;
    return this.activeFish().reduce((total, fish) => {
      if (fish.state === "ill" || fish.currentFullnessCalories() <= 0) {
        return total;
      }

      const intervalSeconds = Math.max(1, fish.type.coinDropSeconds);
      const boostMultiplier = fish.hasActiveProductionBoost(now) ? 5 : 1;
      return total + fish.type.coinValue * boostMultiplier * (60 / intervalSeconds);
    }, 0);
  }

  private returnFromShellBalanceGame(): void {
    this.removeShellBalanceScene();
    this.scene.resume("AquariumScene");
    this.scene.setVisible(true, "AquariumScene");
    this.scene.setActive(true, "AquariumScene");
    this.scene.bringToTop("AquariumScene");
    this.activeScreen = "menu";
    this.syncHtmlGameInterface();
    this.syncHtmlPageOverlay();
  }

  private hideShellBalanceSceneImmediately(): void {
    let shellScene: Phaser.Scene;
    try {
      shellScene = this.scene.get(ShellBalanceSceneKey);
    } catch {
      return;
    }
    if (!shellScene) {
      return;
    }
    shellScene.input.enabled = false;
    shellScene.tweens.killAll();
    shellScene.time.removeAllEvents();
    [...shellScene.children.getChildren()].forEach((child) => {
      (child as Phaser.GameObjects.GameObject & { setVisible?: (value: boolean) => unknown }).setVisible?.(false);
      child.destroy();
    });
    shellScene.children.removeAll(true);
    shellScene.cameras.cameras.forEach((camera) => {
      camera.visible = false;
    });
    shellScene.sys.setVisible(false);
    shellScene.sys.setActive(false);
  }

  private removeShellBalanceScene(): void {
    let shellScene: Phaser.Scene;
    try {
      shellScene = this.scene.get(ShellBalanceSceneKey);
    } catch {
      return;
    }
    if (!shellScene) {
      return;
    }
    this.hideShellBalanceSceneImmediately();
    this.scene.setVisible(false, ShellBalanceSceneKey);
    this.scene.setActive(false, ShellBalanceSceneKey);
    this.scene.sleep(ShellBalanceSceneKey);
    this.scene.stop(ShellBalanceSceneKey);
    this.scene.remove(ShellBalanceSceneKey);
  }

  private showPrizeMachineSpinner(): void {
    this.destroyPrizeSpinContainer();
    this.prizeSpinInProgress = false;
    const betAmounts = this.currentPrizeBetAmounts();
    const selectedBetAmount = this.syncCurrentPrizeBetAmount(betAmounts);
    this.prizeSpinContainer = createPrizeMachineSpinner(
      this,
      this.currentPrizeMachineConfig(),
      this.createPrizeWheelSegments(),
      {
        commonCoins: this.wallet.common,
        selectedBetAmount
      },
      {
        onSpin: () => this.spinPrizeMachine(),
        onOpenBetPicker: () => this.showPrizeBetModal(),
        onClose: () => this.closePage()
      }
    );
  }

  private selectPrizeMachineBet(betAmount: PrizeMachineBetAmount): void {
    if (this.prizeSpinInProgress) {
      return;
    }

    const betAmounts = this.currentPrizeBetAmounts();
    const selectedIndex = betAmounts.indexOf(betAmount);
    if (selectedIndex >= 0) {
      this.prizeMachineSelectedBetIndex = selectedIndex;
    }
    this.closeModal();
    this.prizeMachine = setPrizeMachineBet(this.prizeMachine, betAmount);
    this.ensurePrizeWheelFishTexturesLoaded();
    this.showPrizeMachineSpinner();
    this.saveNow();
  }

  private showPrizeBetModal(): void {
    if (this.prizeSpinInProgress) {
      return;
    }

    const selectedBetAmount = this.syncCurrentPrizeBetAmount();
    const grid = createPrizeBetGrid({
      betAmounts: this.currentPrizeBetAmounts(),
      selectedBetAmount,
      createButton: this.pageButtonFactory(),
      onSelect: (betAmount) => this.selectPrizeMachineBet(betAmount)
    });

    this.showModal(
      "Select Bet",
      [],
      [{ label: "Cancel", fill: 0x254d68, action: () => this.closeModal() }],
      [grid]
    );
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

    const betBounds = new Phaser.Geom.Rectangle(gameWidth / 2 - 78, gameHeight - 217, 156, 38);
    if (!this.prizeSpinInProgress && betBounds.contains(designX, designY)) {
      this.showPrizeBetModal();
      return true;
    }

    return false;
  }

  private currentPrizeMachineConfig(): PrizeMachineConfig {
    return prizeMachineConfigForBet(this.currentPrizeBetAmount());
  }

  private currentPrizeBetAmounts(): PrizeMachineBetAmount[] {
    return [...fixedPrizeBetAmounts];
  }

  private currentPrizeBetAmount(betAmounts = this.currentPrizeBetAmounts()): PrizeMachineBetAmount {
    return betAmounts[this.currentPrizeBetIndex(betAmounts)] ?? betAmounts[0] ?? 1;
  }

  private currentPrizeBetIndex(betAmounts = this.currentPrizeBetAmounts()): number {
    if (betAmounts.length === 0) {
      return 0;
    }

    if (this.prizeMachineSelectedBetIndex !== undefined) {
      return Phaser.Math.Clamp(this.prizeMachineSelectedBetIndex, 0, betAmounts.length - 1);
    }

    const selected = Math.max(1, Math.floor(this.prizeMachine.selectedBetAmount));
    return betAmounts.reduce((closestIndex, bet, index) => {
      const closest = betAmounts[closestIndex] ?? bet;
      return Math.abs(bet - selected) < Math.abs(closest - selected) ? index : closestIndex;
    }, 0);
  }

  private syncCurrentPrizeBetAmount(betAmounts = this.currentPrizeBetAmounts()): PrizeMachineBetAmount {
    const selectedBetAmount = this.currentPrizeBetAmount(betAmounts);
    if (this.prizeMachine.selectedBetAmount !== selectedBetAmount) {
      this.prizeMachine = {
        ...this.prizeMachine,
        selectedBetAmount
      };
    }
    return selectedBetAmount;
  }

  private spinPrizeMachine(): void {
    if (this.prizeSpinInProgress) {
      return;
    }

    const selectedBetAmount = this.syncCurrentPrizeBetAmount();
    const config = prizeMachineConfigForBet(selectedBetAmount);
    if (!this.spendPrice(config.spinCost)) {
      this.floatText(`Need ${formatPrice(config.spinCost)}`, toastX, toastY, "#ffb0a8");
      if (!this.prizeSpinContainer) {
        this.closePage();
      }
      return;
    }

    this.prizeMachine = recordPrizeMachineSpin(this.prizeMachine, this.priceWealth(config.spinCost));
    const prizePlanner = this.createPrizeWheelPlanner();
    const segments = prizePlanner.createSegments();
    const preparedReward = prizePlanner.choosePreparedReward(segments);
    const preparedRewardValue = prizePlanner.rewardResaleValue(preparedReward);
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
        prizePlanner.rewardKey(preparedReward)
      );

      this.recordDailyQuestAction("prize-game");
      this.createFoodDock();
      this.saveNow();
    };
    const resultBetAmounts = this.currentPrizeBetAmounts();
    const resultSelectedBetAmount = this.currentPrizeBetAmount(resultBetAmounts);
    this.prizeSpinContainer = playPrizeMachineSpin(this, config, segments, preparedReward.segmentIndex, {
      commonCoins: this.wallet.common,
      selectedBetAmount: resultSelectedBetAmount
    }, {
      onRewardReady: applyPrizeReward,
      onOpenBetPicker: () => {
        applyPrizeReward();
        this.showPrizeBetModal();
      },
      onSpinAgain: () => {
        applyPrizeReward();
        this.syncCurrentPrizeBetAmount();
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
      getSelectedBetAmount: () => this.syncCurrentPrizeBetAmount(),
      onHighlight: () => this.playSfx(prizeHighlightSoundKey, { volume: 0.12 }),
      onStop: () => this.playSfx(prizeRewardSoundKey, { volume: 0.18 })
    });
  }

  private createPrizeWheelPlanner(): PrizeWheelPlanner {
    return new PrizeWheelPlanner({
      selectedBetAmount: this.prizeMachine.selectedBetAmount,
      recentPrizeKeys: this.prizeMachine.recentPrizeKeys,
      rareCoinWealthValue: coinWealthValue.rare,
      superRareCoinWealthValue: coinWealthValue.superRare,
      ownedFishTypeIds: () => new Set([
        ...this.fish.map((fish) => fish.type.id),
        ...[...this.fishInventory.entries()].filter(([, count]) => count > 0).map(([fishTypeId]) => fishTypeId)
      ]),
      textureExists: (textureKey) => this.textures.exists(textureKey),
      isDroppableFood: (foodTypeId) => this.isDroppableFood(foodTypeId),
      isCalorieTrackedFood: (foodTypeId) => this.isCalorieTrackedFood(foodTypeId),
      foodTextureKey: (foodTypeId) => this.foodTextureKey(foodTypeId),
      foodSellValue: (foodType, storedAmount) => this.foodSellValue(foodType, storedAmount),
      decorationSellValue: (decorationType, size, count) => this.decorationSellValue(decorationType, size, count),
      decorationVariantPrice: (decorationType, size) => this.decorationVariantPrice(decorationType, size),
      priceWealth: (price) => this.priceWealth(price),
      coinSellValue: (coinType, count) => this.coinSellValue(coinType, count),
      storedFishSellValue: (fishType) => this.storedFishSellValue(fishType),
      sanitizeDecorationSize: (size) => this.sanitizeDecorationSize(size)
    });
  }

  private createPrizeWheelSegments(): PrizeWheelSegment[] {
    return this.createPrizeWheelPlanner().createSegments();
  }

  private ensurePrizeWheelFishTexturesLoaded(): void {
    this.createPrizeWheelPlanner()
      .fishPrizePool()
      .slice(0, 8)
      .forEach((fishType) => this.ensureFishTexturesLoaded(fishType));
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
    if (reward.kind === "decoration") {
      this.awardPrizeMachineDecoration(reward.decorationType, reward.size);
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
    this.showPrizeCelebration("Rare Coin!", "/assets/ui/shop/coin_icon_rare.png", `You won R${formatNumber(amount)}.`);
  }

  private awardPrizeMachineSuperRare(amount: number): void {
    earn(this.wallet, "superRare", amount);
    this.setPrizeMachineResult("superRare", `SR${formatNumber(amount)} Prize!`, "Super rare diamonds dropped from the spinner.");
    this.showPrizeCelebration("Super Rare!", "/assets/ui/shop/coin_icon_super_rare.png", `You won SR${formatNumber(amount)}.`);
  }

  private awardPrizeMachineRareFish(fishType: FishType): void {
    this.addFishToInventory(fishType);
    this.setPrizeMachineResult("rareFish", `${fishType.name} Prize!`, "The fish is floating in a bubble.");
    this.showPrizeCelebration(`${fishType.name}!`, `/assets/fish/${fishType.id}.png`, "A fish is floating in your tank bubble.");
    if (fishType.rarity === "common") {
      this.prizeCommonFish = this.nextPrizeFish("common");
    } else {
      this.prizeRareFish = this.nextPrizeRareFish();
    }
  }

  private awardPrizeMachineFood(foodType: FoodType, quantity: number): void {
    const amount = (this.isCalorieTrackedFood(foodType.id) ? foodType.calories : 1) * Math.max(1, quantity);
    this.foodInventory.set(foodType.id, this.getFoodInventory(foodType.id) + amount);
    this.recentInventoryDockItemKey = `food:${foodType.id}`;
    this.setPrizeMachineResult("food", `Food Prize: ${foodType.name}`, `+${formatNumber(amount)} cal food.`);
  }

  private awardPrizeMachineDecoration(decorationType: DecorationType, size: DecorationSize): void {
    const inventoryKey = this.decorationInventoryKey(decorationType.id, size);
    this.decorationInventory.set(inventoryKey, (this.decorationInventory.get(inventoryKey) ?? 0) + 1);
    this.recentInventoryDockItemKey = `decoration:${decorationType.id}:${size}`;
    this.setPrizeMachineResult(
      "decoration",
      `${decorationType.name} ${decorationSizes[size].label} Prize!`,
      "The decoration is waiting in your Inventory."
    );
  }

  private awardPrizeMachineCommon(amount: number): void {
    earn(this.wallet, "common", amount);
    this.setPrizeMachineResult("common", `Common Prize C${formatNumber(amount)}`, `+C${formatNumber(amount)} from the wheel.`);
  }

  private setPrizeMachineResult(kind: PrizeSpinPrize, title: string, detail: string): void {
    this.prizeMachine = {
      ...this.prizeMachine,
      lastResult: { kind, title, detail, at: Date.now() }
    };
  }

  private nextPrizeRareFish(): FishType {
    return this.nextPrizeFish("rare");
  }

  private nextPrizeFish(rarity: Rarity): FishType {
    const ownedFishIds = new Set([
      ...this.fish.map((fish) => fish.type.id),
      ...[...this.fishInventory.entries()].filter(([, count]) => count > 0).map(([fishTypeId]) => fishTypeId)
    ]);
    const rarityPool = fishTypes.filter((fishType) => fishType.rarity === rarity);
    const unowned = rarityPool.filter((fishType) => !ownedFishIds.has(fishType.id));
    const pool = unowned.length > 0 ? unowned : rarityPool;
    return Phaser.Utils.Array.GetRandom(pool.length > 0 ? pool : fishTypes);
  }

  private rewardedAdOptions(): RewardedAdOption[] {
    this.clearExpiredRewardedAdCooldown();
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
    if (rarity === "superRare" || (price.superRareAmount && price.superRareAmount > 0)) {
      return this.storeCoinFilter === "superRare";
    }
    if (rarity === "rare" || (price.rareAmount && price.rareAmount > 0)) {
      return this.storeCoinFilter === "rare";
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
      (_level, state) => rawTankDisplayLevelFromProduction(state.fishProductionTotal ?? 0)
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
    this.recordDailyQuestAction("rename-tank");
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
      this.returnToTankScreen();
    } else {
      this.renderTabControls();
    }
    this.refreshUi(false);
    this.saveNow();
  }

  private buyTank(level: number): void {
    const targetLevel = Math.max(1, Math.floor(level));
    if (this.ownedTankLevels.size >= maxOwnedTanks || targetLevel > maxOwnedTanks) {
      this.floatText("Only one tank available", toastX, toastY, "#ffb0a8");
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
    this.recordDailyQuestAction("tint-cosmetic");
    this.saveNow();
  }

  private closeStoreAfterPurchase(): void {
    if (this.activeScreen === "store") {
      this.closeModal();
      this.returnToTankScreen();
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
      this.recordDailyQuestAction("use-background");
    } else {
      state.selectedSeabedId = asset.id;
      this.recordDailyQuestAction("use-seabed");
    }
    this.layoutTankBackground();
    this.layoutTankFloor();
    this.renderTabControls();
    this.refreshUi(false);
    this.saveNow();
  }

  private showFishBuyQuantityModal(fishType: FishType): void {
    const requiredLevel = fishShopRequiredLevel(fishType);
    if (!this.developerGodMode && requiredLevel > this.tankDisplayLevel()) {
      this.floatText(`Needs tank L${formatNumber(requiredLevel)}`, toastX, toastY, "#ffb0a8");
      return;
    }

    const remainingHourlyBuys = this.developerGodMode
      ? maxFishBuyQuantity
      : Math.max(0, this.hourlyFishPurchaseLimit() - this.recentFishPurchaseCount());
    if (remainingHourlyBuys <= 0) {
      this.floatText(`Fish shop ${this.fishPurchaseRestockLabel().toLowerCase()}`, toastX, toastY, "#ffdd8a");
      return;
    }

    this.ensureFishTexturesLoaded(fishType);
    const maxQuantity = Math.max(1, Math.min(maxFishBuyQuantity, remainingHourlyBuys));
    let selectedQuantity = 1;
    const quantityText = htmlElement("strong", "aq-sell-qty-value", [formatNumber(selectedQuantity)]);
    const totalText = htmlElement("p", "aq-modal-line aq-modal-price-line aq-sell-qty-total");
    const renderTotalPrice = () => {
      totalText.replaceChildren(htmlElement("span", "", ["Total"]));
      for (const [coinType, amount] of priceComponents(this.quantityPrice(fishType.price, selectedQuantity))) {
        totalText.append(
          htmlElement("span", "aq-makeup-cost-chip", [
            htmlImage(coinAssetPathByType[coinType], coinType, "aq-makeup-cost-icon"),
            htmlElement("strong", "", [formatNumber(amount)])
          ])
        );
      }
    };
    const update = () => {
      selectedQuantity = Phaser.Math.Clamp(Math.floor(selectedQuantity), 1, maxQuantity);
      quantityText.textContent = formatNumber(selectedQuantity);
      renderTotalPrice();
    };
    const setQuantity = (quantity: number) => {
      selectedQuantity = quantity;
      update();
    };
    const quantityPicker = htmlElement("div", "aq-sell-qty-picker", [
      createHtmlButton("-", "aq-sell-qty-step", () => setQuantity(selectedQuantity - 1), {
        attachTouchFeedback: (button) => this.attachTouchFeedback(button)
      }),
      htmlElement("div", "aq-sell-qty-display", [quantityText]),
      createHtmlButton("+", "aq-sell-qty-step", () => setQuantity(selectedQuantity + 1), {
        attachTouchFeedback: (button) => this.attachTouchFeedback(button)
      })
    ]);
    const owned = this.fish.filter((fish) => fish.type.id === fishType.id).length + this.getFishInventory(fishType.id);
    const previewImage = htmlImage(`/assets/fish/${fishType.id}.png`, fishType.name, "aq-modal-preview-image fish");
    const preview = htmlElement("div", "aq-modal-preview", [previewImage]);
    if (owned <= 0) {
      previewImage.classList.remove("drop-shadow-lg");
    }
    renderTotalPrice();

    this.showModal(
      fishType.name,
      [],
      [
        { label: "BUY NOW", fill: 0x356a35, action: () => this.buyFish(fishType, selectedQuantity) },
        { label: "Cancel", fill: 0x254d68, action: () => this.closeModal() }
      ],
      [
        preview,
        quantityPicker,
        totalText
      ]
    );
  }

  private buyFish(fishType: FishType, quantity = 1): void {
    const requiredLevel = fishShopRequiredLevel(fishType);
    if (!this.developerGodMode && requiredLevel > this.tankDisplayLevel()) {
      this.floatText(`Needs tank L${formatNumber(requiredLevel)}`, toastX, toastY, "#ffb0a8");
      return;
    }

    const remainingHourlyBuys = this.developerGodMode
      ? maxFishBuyQuantity
      : Math.max(0, this.hourlyFishPurchaseLimit() - this.recentFishPurchaseCount());
    if (remainingHourlyBuys <= 0) {
      this.floatText(`Fish shop ${this.fishPurchaseRestockLabel().toLowerCase()}`, toastX, toastY, "#ffdd8a");
      return;
    }

    const buyQuantity = Phaser.Math.Clamp(Math.floor(quantity), 1, Math.min(maxFishBuyQuantity, remainingHourlyBuys));
    const totalPrice = this.quantityPrice(fishType.price, buyQuantity);
    if (!this.developerGodMode && !canAfford(this.wallet, totalPrice)) {
      this.floatText(`Need ${formatPrice(totalPrice)}`, toastX, toastY, "#ffb0a8");
      return;
    }

    if (!this.spendPrice(totalPrice)) {
      return;
    }

    const pendingTankDeliveries = this.fishDeliveryBubbles?.bubbles.filter((pending) => pending.destination === "tank").length ?? 0;
    const tankSlotsAvailable = Math.max(0, this.maxFishCapacityForLevel() - this.activeFish().length - pendingTankDeliveries);
    const tankDeliveryQuantity = Math.min(buyQuantity, tankSlotsAvailable);
    const inventoryQuantity = buyQuantity - tankDeliveryQuantity;
    if (inventoryQuantity > 0) {
      this.addFishToInventory(fishType, inventoryQuantity, false);
    }
    for (let index = 0; index < buyQuantity; index += 1) {
      this.recordFishPurchase(fishType);
    }
    this.closeModal();
    this.closeStoreAfterPurchase();

    for (let index = 0; index < tankDeliveryQuantity; index += 1) {
      const position = this.randomFishPlacement();
      this.spawnFishTankBubble(fishType, position.x, position.y);
    }

    if (inventoryQuantity > 0) {
      this.spawnFishInventoryBubble(fishType, inventoryQuantity);
    }

    this.recentInventoryDockItemKey = "fish-menu:fish-menu";
    this.placementMode = { kind: "none" };
    this.floatText(
      tankDeliveryQuantity > 0
        ? `${fishType.name} ${tankDeliveryQuantity > 1 ? `x${formatNumber(tankDeliveryQuantity)} ` : ""}in tank bubble`
        : `${fishType.name} x${formatNumber(buyQuantity)} in inventory`,
      toastX,
      toastY,
      "#a8ffb0"
    );
    this.storeOverlay?.refresh();
    this.refreshUi();
    this.createFoodDock();
    this.saveNow();
  }

  private showFoodBuyQuantityModal(foodType: FoodType, initialQuantity = this.getFoodBuyQuantity(foodType.id)): void {
    if (foodType.id === "ageBoost") {
      this.showGrowthTonicFishModal(foodType);
      return;
    }

    if (foodType.id === productionBoostFoodTypeId) {
      this.showProductionBoostFishModal(foodType);
      return;
    }

    if (!this.developerGodMode && foodType.id === "ageBoost" && !this.canBuyGrowthTonicThisHour()) {
      this.floatText(this.growthTonicPurchaseRestockLabel(), toastX, toastY, "#ffdd8a");
      this.storeOverlay?.refresh();
      return;
    }

    const maxQuantity = foodType.id === "ageBoost" ? 1 : maxFoodBuyQuantity;
    let selectedQuantity = Phaser.Math.Clamp(Math.floor(initialQuantity), 1, maxQuantity);
    const quantityText = htmlElement("strong", "aq-sell-qty-value", [formatNumber(selectedQuantity)]);
    const totalText = htmlElement("p", "aq-modal-line aq-modal-price-line aq-sell-qty-total");
    const renderTotalPrice = () => {
      totalText.replaceChildren(htmlElement("span", "", ["Total"]));
      for (const [coinType, amount] of priceComponents(this.quantityPrice(foodType.price, selectedQuantity))) {
        totalText.append(
          htmlElement("span", "aq-makeup-cost-chip", [
            htmlImage(coinAssetPathByType[coinType], coinType, "aq-makeup-cost-icon"),
            htmlElement("strong", "", [formatNumber(amount)])
          ])
        );
      }
    };
    const update = () => {
      selectedQuantity = Phaser.Math.Clamp(Math.floor(selectedQuantity), 1, maxQuantity);
      quantityText.textContent = formatNumber(selectedQuantity);
      renderTotalPrice();
    };
    const setQuantity = (quantity: number) => {
      selectedQuantity = quantity;
      update();
    };
    const quantityPicker = htmlElement("div", "aq-sell-qty-picker", [
      createHtmlButton("-", "aq-sell-qty-step", () => setQuantity(selectedQuantity - 1), {
        disabled: maxQuantity <= 1,
        attachTouchFeedback: (button) => this.attachTouchFeedback(button)
      }),
      htmlElement("div", "aq-sell-qty-display", [quantityText]),
      createHtmlButton("+", "aq-sell-qty-step", () => setQuantity(selectedQuantity + 1), {
        disabled: maxQuantity <= 1,
        attachTouchFeedback: (button) => this.attachTouchFeedback(button)
      })
    ]);
    const previewImage = htmlImage(foodAssetPath(foodType.id), foodType.name, "aq-modal-preview-image food");
    previewImage.style.filter = foodCssFilterFor(foodType.id);
    const preview = htmlElement("div", "aq-modal-preview", [previewImage]);
    update();

    this.showModal(
      foodType.name,
      [],
      [
        { label: foodType.id === "medicine" ? "BUY MEDICINE" : "BUY NOW", fill: 0x356a35, action: () => this.buyFood(foodType, selectedQuantity) },
        { label: "Cancel", fill: 0x254d68, action: () => this.closeModal() }
      ],
      [
        preview,
        quantityPicker,
        totalText
      ]
    );
  }

  private buyFood(foodType = this.getSelectedFoodType(), quantity = this.getFoodBuyQuantity(foodType.id)): void {
    if (foodType.id === "ageBoost") {
      this.showGrowthTonicFishModal(foodType);
      return;
    }

    if (foodType.id === productionBoostFoodTypeId) {
      this.showProductionBoostFishModal(foodType);
      return;
    }

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
      this.recordDailyQuestAction("buy-growth-tonic");
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

  private showGrowthTonicFishModal(foodType: FoodType): void {
    if (!this.developerGodMode && !this.canBuyGrowthTonicThisHour()) {
      this.floatText(this.growthTonicPurchaseRestockLabel(), toastX, toastY, "#ffdd8a");
      this.storeOverlay?.refresh();
      return;
    }

    const candidates = this.activeFish();
    if (candidates.length === 0) {
      this.floatText("No fish to grow", toastX, toastY, "#ffb0a8");
      return;
    }

    let selectedFish = candidates[0];
    const selectedName = htmlElement("strong", "aq-production-boost-selected", [selectedFish.type.name]);
    const selectedAge = htmlElement("strong", "aq-production-boost-selected", [selectedFish.ageLabel()]);
    const priceText = this.priceIconRow(this.growthTonicPriceForFish(selectedFish), "Price");
    let buyButton: HTMLButtonElement;
    const grid = htmlElement("div", "aq-production-boost-fish-grid");
    const renderPrice = () => {
      const nextPrice = this.priceIconRow(this.growthTonicPriceForFish(selectedFish), "Price");
      priceText.replaceChildren(...Array.from(nextPrice.childNodes));
    };
    const updateSelection = () => {
      selectedName.textContent = selectedFish.type.name;
      selectedAge.textContent = selectedFish.ageLabel();
      renderPrice();
      buyButton.disabled = !this.developerGodMode && !canAfford(this.wallet, this.growthTonicPriceForFish(selectedFish));
      grid.querySelectorAll("[data-fish-index]").forEach((element) => {
        element.classList.toggle("selected", Number((element as HTMLElement).dataset.fishIndex) === this.fish.indexOf(selectedFish));
      });
    };

    candidates.forEach((fish) => {
      const button = createHtmlButton("", `aq-production-boost-fish ${fish === selectedFish ? "selected" : ""}`, () => {
        selectedFish = fish;
        updateSelection();
      }, {
        attachTouchFeedback: (targetButton) => this.attachTouchFeedback(targetButton)
      });
      button.dataset.fishIndex = String(this.fish.indexOf(fish));
      button.append(
        htmlImage(`/assets/fish/${fish.type.id}.png`, "", "aq-production-boost-fish-image"),
        htmlElement("span", "aq-production-boost-fish-name", [fish.type.name]),
        htmlElement("span", "aq-production-boost-fish-age", [`Age ${fish.ageLabel()}`]),
        htmlElement("span", "aq-production-boost-fish-price", [formatPrice(this.growthTonicPriceForFish(fish))])
      );
      grid.append(button);
    });

    buyButton = this.htmlButton("BUY", "aq-modal-button good", () => this.buyGrowthTonicForFish(foodType, selectedFish));
    updateSelection();

    this.showModal(
      "Growth Tonic",
      [],
      [],
      [
        htmlElement("p", "aq-modal-line", ["Select which fish gets +3 months of growth."]),
        htmlElement("p", "aq-modal-line", ["Price is 15% of fish value, from C100 to C15K."]),
        grid,
        htmlElement("p", "aq-modal-line", ["Selected: ", selectedName, " | Age ", selectedAge]),
        priceText,
        htmlElement("div", "aq-modal-actions single", [buyButton, this.htmlButton("Cancel", "aq-modal-button muted", () => this.closeModal())])
      ]
    );
  }

  private growthTonicPriceForFish(fish: Fish): Price {
    return {
      coinType: "common",
      amount: Phaser.Math.Clamp(Math.round(fishCommonPrice(fish.type) * 0.15), 100, 15000)
    };
  }

  private buyGrowthTonicForFish(foodType: FoodType, fish: Fish): void {
    if (!this.activeFish().includes(fish)) {
      this.floatText("Fish not found", toastX, toastY, "#ffb0a8");
      return;
    }
    if (!this.developerGodMode && !this.canBuyGrowthTonicThisHour()) {
      this.floatText(this.growthTonicPurchaseRestockLabel(), toastX, toastY, "#ffdd8a");
      this.storeOverlay?.refresh();
      return;
    }

    const price = this.growthTonicPriceForFish(fish);
    if (!this.spendPrice(price)) {
      return;
    }

    this.foodInventory.set(foodType.id, this.getFoodInventory(foodType.id) + 1);
    this.careFoodTargetFish.set(foodType.id, fish);
    this.recordGrowthTonicPurchase();
    this.recordDailyQuestAction("buy-growth-tonic");
    this.recentInventoryDockItemKey = `food:${foodType.id}`;
    this.placementMode = { kind: "none" };
    this.floatText(`Growth tonic docked`, toastX, toastY, "#d9c2ff");
    this.closeModal();
    this.storeOverlay?.refresh();
    this.refreshUi();
    this.createFoodDock();
    this.saveNow();
    this.closeStoreAfterPurchase();
  }

  private showProductionBoostFishModal(foodType: FoodType): void {
    if (!this.developerGodMode && !this.canBuyProductionBoostNow()) {
      this.floatText(this.productionBoostPurchaseRestockLabel(), toastX, toastY, "#ffdd8a");
      this.storeOverlay?.refresh();
      return;
    }

    const candidates = this.activeFish();
    if (candidates.length === 0) {
      this.floatText("No fish to boost", toastX, toastY, "#ffb0a8");
      return;
    }

    const availableFish = candidates.filter((fish) => fish.productionBoostUntil <= this.time.now);
    if (availableFish.length === 0) {
      this.floatText("All fish already boosted", toastX, toastY, "#d7f4ff");
      return;
    }

    let selectedFish = availableFish[0];
    const selectedName = htmlElement("strong", "aq-production-boost-selected", [selectedFish.type.name]);
    const selectedAge = htmlElement("strong", "aq-production-boost-selected", [selectedFish.ageLabel()]);
    const priceText = htmlElement("p", "aq-modal-line aq-sell-qty-total", [
      `Price ${formatPrice(this.productionBoostPriceForFish(selectedFish))}`
    ]);
    let buyButton: HTMLButtonElement;
    const grid = htmlElement("div", "aq-production-boost-fish-grid");
    const updateSelection = () => {
      selectedName.textContent = selectedFish.type.name;
      selectedAge.textContent = selectedFish.ageLabel();
      priceText.textContent = `Price ${formatPrice(this.productionBoostPriceForFish(selectedFish))}`;
      buyButton.disabled = !this.developerGodMode && !canAfford(this.wallet, this.productionBoostPriceForFish(selectedFish));
      grid.querySelectorAll("[data-fish-index]").forEach((element) => {
        element.classList.toggle("selected", Number((element as HTMLElement).dataset.fishIndex) === this.fish.indexOf(selectedFish));
      });
    };

    candidates.forEach((fish) => {
      const active = fish.productionBoostUntil > this.time.now;
      const button = createHtmlButton("", `aq-production-boost-fish ${fish === selectedFish ? "selected" : ""}`, () => {
        selectedFish = fish;
        updateSelection();
      }, {
        disabled: active,
        attachTouchFeedback: (targetButton) => this.attachTouchFeedback(targetButton)
      });
      button.dataset.fishIndex = String(this.fish.indexOf(fish));
      button.append(
        htmlImage(`/assets/fish/${fish.type.id}.png`, "", "aq-production-boost-fish-image"),
        htmlElement("span", "aq-production-boost-fish-name", [fish.type.name]),
        htmlElement("span", "aq-production-boost-fish-age", [`Age ${fish.ageLabel()}`]),
        htmlElement("span", "aq-production-boost-fish-price", [
          active ? "Active" : formatPrice(this.productionBoostPriceForFish(fish))
        ])
      );
      grid.append(button);
    });

    buyButton = this.htmlButton("BUY", "aq-modal-button good", () => this.buyProductionBoostForFish(foodType, selectedFish));
    updateSelection();

    this.showModal(
      "Production Boost",
      [],
      [],
      [
        htmlElement("p", "aq-modal-line", ["Select which fish gets the boost. Only that fish will eat the pill."]),
        htmlElement("p", "aq-modal-line", ["Effect: 5x production speed and 5x fullness use for 30s."]),
        grid,
        htmlElement("p", "aq-modal-line", ["Selected: ", selectedName, " | Age ", selectedAge]),
        priceText,
        htmlElement("div", "aq-modal-actions single", [buyButton, this.htmlButton("Cancel", "aq-modal-button muted", () => this.closeModal())])
      ]
    );
  }

  private productionBoostPriceForFish(fish: Fish): Price {
    return {
      coinType: "common",
      amount: Phaser.Math.Clamp(Math.round(fishCommonPrice(fish.type) * 0.08), 25, 5000)
    };
  }

  private buyProductionBoostForFish(foodType: FoodType, fish: Fish): void {
    if (!this.activeFish().includes(fish)) {
      this.floatText("Fish not found", toastX, toastY, "#ffb0a8");
      return;
    }
    if (!this.developerGodMode && !this.canBuyProductionBoostNow()) {
      this.floatText(this.productionBoostPurchaseRestockLabel(), toastX, toastY, "#ffdd8a");
      this.storeOverlay?.refresh();
      return;
    }
    if (fish.productionBoostUntil > this.time.now) {
      this.floatText("Already boosted", toastX, toastY, "#d7f4ff");
      return;
    }

    const price = this.productionBoostPriceForFish(fish);
    if (!this.spendPrice(price)) {
      return;
    }

    this.foodInventory.set(foodType.id, this.getFoodInventory(foodType.id) + 1);
    this.careFoodTargetFish.set(foodType.id, fish);
    this.recordProductionBoostPurchase();
    this.recordDailyQuestAction("buy-production-boost");
    this.recentInventoryDockItemKey = `food:${foodType.id}`;
    this.placementMode = { kind: "none" };
    this.floatText(`Production boost docked`, toastX, toastY, "#ffd34d");
    this.closeModal();
    this.storeOverlay?.refresh();
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
    const targetFish = this.careFoodTargetForDrop(foodType.id);
    const pellet = new FoodPellet(
      this,
      Phaser.Math.Clamp(x, tankBounds.left + 18, tankBounds.right - 18),
      Phaser.Math.Clamp(y, tankBounds.top + 18, tankBounds.bottom - 18),
      foodType,
      { reservedCalories, targetFish }
    );
    if (targetFish) {
      this.careFoodTargetFish.delete(foodType.id);
    }
    pellet.setWorldScaleCompensation(this.tankViewScaleForLevel());
    pellet.addToContainer(this.tankLayer);
    this.foods.push(pellet);
    this.cleanliness = Phaser.Math.Clamp(this.cleanliness - 1.2, 0, 100);
    this.recordDailyQuestAction("drop-food");
    this.placementMode = { kind: "none" };
    this.refreshUi();
    this.createFoodDock();
    this.saveNow();
  }

  private careFoodTargetForDrop(foodTypeId: FoodTypeId): Fish | undefined {
    if (foodTypeId !== "ageBoost" && foodTypeId !== productionBoostFoodTypeId) {
      return undefined;
    }

    const targetFish = this.careFoodTargetFish.get(foodTypeId);
    return targetFish && this.activeFish().includes(targetFish) ? targetFish : undefined;
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
    this.recordDailyQuestAction(decorationType.rarity === "superRare" ? "buy-super-rare-decoration" : decorationType.rarity === "rare" ? "buy-rare-decoration" : "buy-common-decoration");
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
    if (!isTankUtilityId(utilityId)) {
      return;
    }

    const utility = tankUtilityInfoModel(utilityId);
    if (!utility) {
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

    if (utilityId === "auto-food-buyer" && this.hasAutoFoodBuyer()) {
      this.floatText("Already owned", toastX, toastY, "#d7f4ff");
      return;
    }

    if (!this.spendPrice(utility.price)) {
      return;
    }

    if (utilityId === "food-dispenser") {
      this.decorationInventory.set(foodDispenserInventoryKey, 1);
      this.recordDailyQuestAction("buy-dispenser");
      this.floatText("Food Dispenser installed", toastX, toastY, "#a8ffb0");
    } else {
      if (utilityId === "coin-magnet") {
        this.decorationInventory.set(coinMagnetInventoryKey, Date.now() + coinMagnetDurationMs);
        this.coinMagnetWasActive = true;
        this.recordDailyQuestAction("buy-coin-magnet");
        this.floatText("Coin Magnet active 30m", toastX, toastY, "#a8ffb0");
      } else {
        this.decorationInventory.set(autoFoodBuyerInventoryKey, Date.now() + autoFoodBuyerDurationMs);
        this.autoFoodBuyerWasActive = true;
        this.recordDailyQuestAction("buy-auto-food-buyer");
        this.floatText("Auto Buyer active 30m", toastX, toastY, "#a8ffb0");
      }
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
    this.recordDailyQuestAction("sell-active-fish");
    this.floatText(`Sold ${fishToSell.type.name} +C${formatNumber(commonSellValue)}`, toastX, toastY, "#ffe67a");
    fishToSell.destroy();
    this.closeModal();
    this.refreshUi();
    this.saveNow();
  }

  private activeFishSellValue(fish: Fish): number {
    return activeFishSellValueModel(fish);
  }

  private storedFishSellValue(fishType: FishType): number {
    return storedFishSellValueModel(fishType);
  }

  private removeStoredFish(fishTypeId: string, quantity = 1): void {
    const current = this.getFishInventory(fishTypeId);
    const next = Math.max(0, current - Math.max(1, Math.floor(quantity)));
    if (next > 0) {
      this.fishInventory.set(fishTypeId, next);
    } else {
      this.fishInventory.delete(fishTypeId);
    }
    this.trimStoredFishAges(fishTypeId);
  }

  private sellStoredFish(fishTypeId: string, quantity = 1): void {
    const fishType = fishTypes.find((item) => item.id === fishTypeId);
    const current = this.getFishInventory(fishTypeId);
    if (!fishType || current <= 0) {
      this.floatText("No fish in inventory", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellQuantity = Phaser.Math.Clamp(Math.floor(quantity), 1, current);
    const sellValue = this.storedFishSellValue(fishType) * sellQuantity;
    for (let index = 0; index < sellQuantity; index += 1) {
      this.takeStoredFishAge(fishTypeId);
    }
    this.removeStoredFish(fishTypeId, sellQuantity);
    earn(this.wallet, "common", sellValue);
    this.recordDailyQuestAction("sell-stored-fish");
    this.floatText(`Sold ${fishType.name} x${formatNumber(sellQuantity)} +C${formatNumber(sellValue)}`, toastX, toastY, "#ffe67a");
    this.closeModal();
    this.createFoodDock();
    this.refreshUi();
    this.saveNow();
  }

  private foodSellValue(foodType: FoodType, storedAmount = this.getFoodInventory(foodType.id)): number {
    return foodSellValueModel({
      foodType,
      storedAmount,
      isCalorieTrackedFood: (foodTypeId) => this.isCalorieTrackedFood(foodTypeId)
    });
  }

  private sellFoodInventory(foodTypeId: FoodTypeId, quantity?: number): void {
    const foodType = foodTypes.find((item) => item.id === foodTypeId);
    const current = this.getFoodInventory(foodTypeId);
    if (!foodType || current <= 0) {
      this.floatText("No food to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const maxQuantity = this.foodInventoryDisplayCount(foodType);
    const sellQuantity = Phaser.Math.Clamp(Math.floor(quantity ?? maxQuantity), 1, Math.max(1, maxQuantity));
    const sellAmount = this.isCalorieTrackedFood(foodType.id)
      ? Math.min(current, sellQuantity * Math.max(1, foodType.calories))
      : Math.min(current, sellQuantity);
    const sellValue = this.foodSellValue(foodType, sellAmount);
    const nextAmount = Math.max(0, current - sellAmount);
    if (nextAmount <= 0) {
      this.foodInventory.delete(foodTypeId);
    } else {
      this.foodInventory.set(foodTypeId, nextAmount);
    }
    earn(this.wallet, "common", sellValue);
    this.recordDailyQuestAction("sell-food");
    this.floatText(`Sold ${foodType.name} x${formatNumber(sellQuantity)} +C${formatNumber(sellValue)}`, toastX, toastY, "#ffe67a");
    this.closeModal();
    this.createFoodDock();
    this.refreshUi();
    this.saveNow();
  }

  private decorationSellValue(decorationType: DecorationType, size: DecorationSize, count = this.getOwnedDecorationCount(decorationType.id, size)): number {
    return decorationSellValueModel({
      decorationType,
      size,
      count,
      decorationVariantPrice: (item, itemSize) => this.decorationVariantPrice(item, itemSize)
    });
  }

  private tankUtilitySellValue(price: Price): number {
    return tankUtilitySellValueModel(price);
  }

  private sellDecorationInventory(decorationTypeId: string, size: DecorationSize, quantity?: number): void {
    const decorationType = decorationTypes.find((item) => item.id === decorationTypeId);
    const count = this.getOwnedDecorationCount(decorationTypeId, size);
    if (!decorationType || count <= 0) {
      this.floatText("No decor to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellQuantity = Phaser.Math.Clamp(Math.floor(quantity ?? count), 1, count);
    const sellValue = this.decorationSellValue(decorationType, size, sellQuantity);
    const storedSold = this.removeStoredDecorationInventory(decorationTypeId, size, sellQuantity);
    this.removePlacedDecorationsFromActiveTank(decorationTypeId, size, sellQuantity - storedSold);
    earn(this.wallet, "common", sellValue);
    this.recordDailyQuestAction("sell-decoration");
    this.floatText(`Sold ${decorationType.name} x${formatNumber(sellQuantity)} +C${formatNumber(sellValue)}`, toastX, toastY, "#ffe67a");
    this.closeModal();
    this.createFoodDock();
    this.refreshUi();
    this.saveNow();
  }

  private sellTankUtility(utilityId: TankUtilityId): void {
    const utility = this.tankUtilityInfo(utilityId);
    if (!utility || !utility.owned()) {
      this.floatText("No tool to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellValue = this.tankUtilitySellValue(utility.price);
    this.decorationInventory.delete(utility.inventoryKey);
    if (utilityId === "coin-magnet") {
      this.coinMagnetWasActive = false;
      this.coinMagnetDisplayedMinutes = 0;
      this.magnetCollectingCoins.clear();
    }
    if (utilityId === "auto-food-buyer") {
      this.autoFoodBuyerWasActive = false;
      this.autoFoodBuyerDisplayedMinutes = 0;
    }
    earn(this.wallet, "common", sellValue);
    this.recordDailyQuestAction("sell-tool");
    this.floatText(`Sold ${utility.name} +C${formatNumber(sellValue)}`, toastX, toastY, "#ffe67a");
    this.closeModal();
    this.createFoodDock();
    this.refreshUi(false);
    this.syncFoodDispenserPosition();
    this.syncCoinMagnetPosition();
    this.syncAutoFoodBuyerPosition();
    this.syncHtmlPageOverlay();
    this.saveNow();
  }

  private sellCoinInventory(coinType: "rare" | "superRare", quantity?: number): void {
    if (this.wallet[coinType] <= 0) {
      this.floatText("No coins to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const count = this.wallet[coinType];
    const sellQuantity = Phaser.Math.Clamp(Math.floor(quantity ?? count), 1, count);
    const sellValue = this.coinSellValue(coinType, sellQuantity);
    this.wallet[coinType] = Math.max(0, count - sellQuantity);
    earn(this.wallet, "common", sellValue);
    this.recordDailyQuestAction(coinType === "rare" ? "sell-rare-coins" : "sell-super-rare-coins");
    this.floatText(`Converted x${formatNumber(sellQuantity)} +C${formatNumber(sellValue)}`, toastX, toastY, "#ffe67a");
    this.closeModal();
    this.refreshUi();
    this.saveNow();
  }

  private coinSellValue(coinType: "rare" | "superRare", count = 1): number {
    return coinSellValueModel(coinType, count);
  }

  private helperSellPrice(creatureType: HelperCreatureType): HelperCreatureType["price"] {
    return helperSellPriceModel(creatureType);
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
    this.recordDailyQuestAction("sell-helper");
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
    this.recordDailyQuestAction("breed-fish");
    this.floatTankText(`${babyType.name} moved in`, position.x, position.y - 34, "#ffffff");
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

  private storeFish(fish: Fish): void {
    const index = this.fish.indexOf(fish);
    if (index < 0) {
      return;
    }

    this.fishInventory.set(fish.type.id, this.getFishInventory(fish.type.id) + 1);
    this.addStoredFishAge(fish.type.id, fish.ageSeconds);
    this.recentInventoryDockItemKey = "fish-menu:fish-menu";
    this.removeFishAt(index);
  }

  private storeFishByIndex(index: number): void {
    const fish = this.fish[index];
    if (!fish) {
      this.floatText("No fish to store", toastX, toastY, "#ffb0a8");
      return;
    }

    const name = fish.type.name;
    this.storeFish(fish);
    this.recordDailyQuestAction("move-fish");
    this.floatText(`${name} moved to inventory`, toastX, toastY, "#d7f4ff");
    this.closeModal();
    this.refreshUi();
    this.createFoodDock();
    this.saveNow();
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
      this.returnToTankScreen();
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
      this.returnToTankScreen();
    }
    this.refreshUi();
  }

  private prepareFishPlacement(fishTypeId: string): void {
    const fishType = fishTypes.find((candidate) => candidate.id === fishTypeId);
    if (!fishType || this.getFishInventory(fishTypeId) <= 0) {
      this.floatText("No fish in inventory", toastX, toastY, "#ffb0a8");
      return;
    }

    if (this.activeFish().length >= this.maxFishCapacityForLevel()) {
      this.floatText("Tank full - move a fish to inventory first", toastX, toastY, "#ffb0a8");
      return;
    }

    this.returnToTankScreen();
    const position = this.randomFishPlacement();
    this.placeFishWithCompatibility(fishType, position.x, position.y);
  }

  private handleTankPointer(pointer: Phaser.Input.Pointer): void {
    if (this.activeScreen !== "tank" || this.modal) {
      return;
    }

    const pointerPoint = this.pointerDesignPoint(pointer);
    if (!tankViewportBounds.contains(pointerPoint.x, pointerPoint.y)) {
      return;
    }

    const tappedFishBubble = this.pendingFishBubbleAtPointer(pointerPoint.x, pointerPoint.y);
    if (tappedFishBubble) {
      this.popFishInventoryBubble(tappedFishBubble);
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

      if (this.activeFish().length >= this.maxFishCapacityForLevel() && !this.activeFishAtTankPoint(tankPoint.x, tankPoint.y)) {
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
    if (!this.canManuallyCollectTankCoins() || this.coinDrops.length === 0) {
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
    this.nativeCanvasInputCleanup = installNativeCanvasInputFallbackAdapter({
      canvas: this.game.canvas,
      activeScreen: () => this.activeScreen,
      htmlDockDragging: () => this.htmlDockDragging,
      designPointFromEvent: (event) => this.clientPointToDesignPoint(event.clientX, event.clientY),
      screenToTankPoint: (designX, designY) => this.screenToTankPoint(designX, designY),
      capturePointer: (element, pointerId) => this.capturePointerSafely(element, pointerId),
      releasePointer: (element, pointerId) => this.releasePointerSafely(element, pointerId),
      decorationTrashZone,
      handlePrizePointer: (designX, designY) => this.handleNativePrizePointer(designX, designY),
      makeupDecorationAtPointer: (designX, designY) => this.makeupDecorationAtPointer(designX, designY),
      selectMakeupDecoration: (decoration) => this.selectMakeupDecoration(decoration),
      beginMakeupDecorationDrag: (decoration) => {
        this.nativeMakeupDraggedDecoration = decoration;
        this.makeupDraggedDecoration = decoration;
        decoration.image.setAlpha(0.72).setDepth(20);
      },
      updateMakeupDecorationDragAtDesignPoint: (point) => this.updateMakeupDecorationDragAtDesignPoint(point),
      endMakeupDecorationDrag: () => {
        this.nativeMakeupDraggedDecoration = undefined;
        this.endMakeupDecorationDrag();
      },
      fishBubbleAtPointer: (designX, designY) => this.pendingFishBubbleAtPointer(designX, designY),
      popFishBubble: (pending) => this.popFishInventoryBubble(pending),
      coinAtPointer: (designX, designY) => this.coinAtPointer(designX, designY),
      collectCoin: (coin, automated) => this.collectCoin(coin, automated),
      fishAtPointer: (designX, designY) => this.fishAtPointer(designX, designY),
      setNativeDraggedFish: (fish) => {
        this.nativeDraggedFish = fish;
      },
      setDraggedFish: (fish) => {
        this.draggedFish = fish;
      },
      selectFish: (fish) => {
        this.selectedFishIndex = this.fish.indexOf(fish);
      },
      decorationAtPointer: (designX, designY) => this.decorationAtPointer(designX, designY),
      beginDecorationDrag: (decoration) => {
        this.phaserDraggedDecoration = undefined;
        this.nativeDraggedDecoration = decoration;
        this.draggedDecoration = decoration;
        decoration.image.setAlpha(0.78);
        decoration.image.setDepth(9);
        this.showDecorationTrashTarget(true);
      },
      setNativeDraggedDecoration: (decoration) => {
        this.nativeDraggedDecoration = decoration;
      },
      setDraggedDecoration: (decoration) => {
        this.draggedDecoration = decoration;
      },
      clearPhaserDraggedDecoration: () => {
        this.phaserDraggedDecoration = undefined;
      },
      moveDecoration: (decoration, tankX, tankY) => this.moveDecoration(decoration, tankX, tankY),
      trashDecoration: (decoration) => this.trashDecoration(decoration),
      showDecorationTrashTarget: (show) => this.showDecorationTrashTarget(show),
      highlightDecorationTrashTarget: (active) => this.highlightDecorationTrashTarget(active),
      bringMakeupDecorationToTop: (decoration) => this.tankLayer.bringToTop(decoration.image),
      saveNow: () => this.saveNow(),
      recordDailyQuestAction: (action) => this.recordDailyQuestAction(action)
    });
  }

  private addFishToTank(type: FishType, x: number, y: number, options: { gender?: FishGender; tankLevel?: number; ageSeconds?: number } = {}): Fish {
    const placedFish = new Fish(this, type, x, y, options);
    if (options.ageSeconds && options.ageSeconds > 0) {
      placedFish.setAgeSeconds(options.ageSeconds);
    }
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
      this.recordDailyQuestAction("move-fish");
      this.saveNow();
    });
    this.fish.push(placedFish);
    return placedFish;
  }

  private placeFishWithCompatibility(type: FishType, x: number, y: number): void {
    const exchangeTarget = this.activeFish().length >= this.maxFishCapacityForLevel()
      ? this.activeFishAtTankPoint(x, y)
      : undefined;
    if (this.activeFish().length >= this.maxFishCapacityForLevel() && !exchangeTarget) {
      this.showTankFullText(x, y);
      return;
    }

    const storedAgeSeconds = this.takeStoredFishAge(type.id);
    this.removeStoredFish(type.id);
    if (exchangeTarget) {
      this.storeFish(exchangeTarget);
    }
    this.spawnFishTankBubble(type, x, y, {
      ageSeconds: storedAgeSeconds,
      exchangeTarget
    });
    this.recordDailyQuestAction("place-fish");

    this.floatTankText(exchangeTarget ? `${type.name} ready to swap` : `${type.name} ready`, x, y - 34, "#ffffff");
    this.placementMode = { kind: "none" };
    this.closeModal();
    this.refreshUi();
    this.createFoodDock();
    this.saveNow();
  }

  private showTankFullText(x = toastX, y = toastY): void {
    const message = `Tank full ${formatNumber(this.activeFish().length)}/${formatNumber(this.maxFishCapacityForLevel())}`;
    this.floatText(message, toastX, toastY, "#ffb0a8");
    if (tankBounds.contains(x, y)) {
      this.floatTankText(message, x, y - 28, "#ffb0a8");
    }
  }

  private addFishToInventory(fishType: FishType, quantity = 1, showBubble = true): void {
    const safeQuantity = Math.max(1, Math.floor(quantity));
    this.fishInventory.set(fishType.id, this.getFishInventory(fishType.id) + safeQuantity);
    this.recentInventoryDockItemKey = "fish-menu:fish-menu";
    if (showBubble) {
      this.spawnFishInventoryBubble(fishType, safeQuantity);
    }
  }

  private spawnFishInventoryBubble(fishType: FishType, quantity = 1): void {
    this.fishBubbleManager().spawnInventory(fishType, quantity);
  }

  private spawnFishTankBubble(
    fishType: FishType,
    x: number,
    y: number,
    options: { ageSeconds?: number; exchangeTarget?: Fish; consumesInventory?: boolean } = {}
  ): void {
    this.fishBubbleManager().spawnTank(fishType, x, y, options);
  }

  private pendingFishBubbleAtPointer(designX: number, designY: number): PendingFishBubble | undefined {
    if (this.activeScreen !== "tank") {
      return undefined;
    }

    const tankPoint = this.screenToTankPoint(designX, designY);
    return this.fishDeliveryBubbles?.atTankPoint(tankPoint.x, tankPoint.y, this.tankViewScaleForLevel());
  }

  private popFishInventoryBubble(pending: PendingFishBubble): void {
    this.fishDeliveryBubbles?.pop(pending);
  }

  private handleFishBubblePop(pending: PendingFishBubble): void {
    if (pending.destination === "tank") {
      this.releaseFishTankBubble(pending);
    } else {
      this.floatTankText(
        pending.quantity > 1 ? `${pending.type.name} x${formatNumber(pending.quantity)} in inventory` : `${pending.type.name} in inventory`,
        pending.container.x,
        pending.container.y - 38,
        "#d7f4ff"
      );
    }
  }

  private releaseFishTankBubble(pending: PendingFishBubble): void {
    const x = pending.container.x;
    const y = pending.container.y;
    if (pending.consumesInventory) {
      this.removeStoredFish(pending.type.id);
    }
    if (pending.exchangeTarget && this.fish.includes(pending.exchangeTarget)) {
      this.storeFish(pending.exchangeTarget);
    }
    this.addFishToTank(pending.type, x, y, {
      tankLevel: this.tankLevel,
      ageSeconds: pending.ageSeconds
    });
    this.floatTankText(`${pending.type.name} moved in`, x, y - 38, "#ffffff");
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
    if (this.nativeDraggedDecoration || this.activeScreen !== "makeup") {
      return;
    }

    this.phaserDraggedDecoration = decoration;
    this.draggedDecoration = decoration;
    decoration.image.setAlpha(0.78);
    decoration.image.setDepth(9);
    this.showDecorationTrashTarget(true);
  }

  private updatePhaserDecorationDrag(pointer: Phaser.Input.Pointer): void {
    if (this.nativeDraggedDecoration || this.activeScreen !== "makeup") {
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
    if (this.activeScreen === "makeup" && decorationTrashZone.contains(pointerPoint.x, pointerPoint.y)) {
      this.trashDecoration(decoration);
    } else if (this.activeScreen === "makeup" && tankViewportBounds.contains(pointerPoint.x, pointerPoint.y)) {
      const tankPoint = this.screenToTankPoint(pointerPoint.x, pointerPoint.y);
      this.moveDecoration(decoration, tankPoint.x, tankPoint.y);
      this.recordDailyQuestAction("move-decoration");
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
    this.recordDailyQuestAction("trash-decoration");
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
        this.addDecorationToTank(
          decoration,
          savedDecoration.x,
          savedDecoration.y,
          this.sanitizeDecorationSize(savedDecoration.size),
          1,
          savedDecoration.depth
        );
      }
    }

    for (const savedCreature of saved.helperCreatures) {
      const creatureType = helperCreatureTypes.find((item) => item.id === savedCreature.typeId);
      if (creatureType) {
        this.addHelperCreatureToTank(creatureType, savedCreature.x, savedCreature.y, savedCreature.targetX, 1);
      }
    }

    for (const savedFish of saved.fish) {
      const type = fishTypes.find((fishType) => fishType.id === savedFish.typeId);
      if (!type) {
        continue;
      }

      const restoredFish = this.addFishToTank(type, savedFish.x, savedFish.y, {
        gender: savedFish.gender,
        tankLevel: 1
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
          const leveledUp = this.addFishProductionTotal(currentFish.tankLevel, amount);
          if (!leveledUp) {
            earned.common += amount;
            const tankEarned = earnedByTank.get(currentFish.tankLevel) ?? createEmptyWallet();
            tankEarned.common += amount;
            earnedByTank.set(currentFish.tankLevel, tankEarned);
          }
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

  private saveNow(savedAt = Date.now()): void {
    this.captureActiveTankState();
    saveGame(createAquariumSaveSnapshot({
      savedAt,
      currentTime: this.time.now,
      wallet: this.wallet,
      foodInventory: this.foodInventoryRecord(),
      fishInventory: this.fishInventory,
      fishInventoryAges: this.fishInventoryAges,
      decorationInventory: this.decorationInventory,
      creatureInventory: this.creatureInventory,
      fish: this.fish,
      decorations: this.placedDecorations,
      helperCreatures: this.helperCreatures,
      coinDrops: this.coinDrops,
      tank: {
        cleanliness: this.cleanliness,
        cleanedAt: this.cleanedAt,
        maxOwnedLevel: Math.max(...this.sortedOwnedTankLevels()),
        ownedLevels: this.sortedOwnedTankLevels(),
        activeLevel: this.tankLevel,
        names: this.tankNamesRecord(),
        states: this.tankStatesRecord()
      },
      settings: this.settings,
      dailyGoals: this.dailyGoals,
      prizeMachine: this.prizeMachine
    }));
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
        fish.postponeCoinProduction(now, Phaser.Math.Between(fishCoinProductionMinDelayMs, fishCoinProductionMaxDelayMs));
      }
      return;
    }

    if (this.coinDrops.length >= maxCoinDrops && !fish.hasActiveProductionBoost(now)) {
      fish.postponeCoinProduction(now);
      return;
    }

    const value = fish.takeCoinProductionDrop(now, this.activeProductionPaceMultiplier());
    if (value <= 0) {
      return;
    }

    const leveledUp = this.addFishProductionTotal(fish.tankLevel, value);
    if (leveledUp) {
      return;
    }
    const boostedDrop = fish.hasActiveProductionBoost(now);
    const dropX = fish.sprite.x + (boostedDrop ? 0 : Phaser.Math.Between(-18, 18));
    this.createCoinDrop(
      dropX,
      fish.sprite.y + Phaser.Math.Between(-28, -14),
      value,
      "common",
      false,
      boostedDrop ? { landingX: dropX } : {}
    );
  }

  private createCoinDrop(
    x: number,
    y: number,
    value: number,
    coinType: CoinType,
    isMega = false,
    options: { landingX?: number; bottomY?: number; sinkSpeed?: number } = {}
  ): CoinDrop {
    const coin = new CoinDrop(this, x, y, value, coinType, isMega, options);
    coin.setWorldScaleCompensation(this.tankViewScaleForLevel());
    coin.addToContainer(this.tankLayer);
    const collect = (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (!this.canManuallyCollectTankCoins()) {
        return;
      }
      this.collectCoin(coin, false);
    };
    coin.hitZone.on("pointerdown", collect);
    coin.sprite.on("pointerdown", collect);
    this.coinDrops.push(coin);
    this.coinMagnetPreviousCoinY.set(coin, coin.sprite.y);
    this.setCoinDropVisible(coin, this.activeScreen !== "makeup");
    return coin;
  }

  private setCoinDropVisible(coin: CoinDrop, visible: boolean): void {
    coin.sprite.setVisible(visible);
    coin.hitZone.setVisible(visible);
    coin.shimmer.setVisible(visible);
    coin.valueText.setVisible(visible);
    if (visible && this.canManuallyCollectTankCoins()) {
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
    if (!automated && !this.canManuallyCollectTankCoins()) {
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
    this.coinMagnetPreviousCoinY.delete(coin);
    coin.destroy();
    this.refreshUi();
    this.saveNow();
  }

  private updateCoinMagnet(): void {
    if (!this.hasCoinMagnet() || this.modal || this.coinDrops.length === 0) {
      for (const coin of this.coinDrops) {
        this.coinMagnetPreviousCoinY.set(coin, coin.sprite.y);
      }
      return;
    }

    const position = new Phaser.Math.Vector2(tankBounds.left, this.coinMagnetRayY());
    for (const coin of this.coinDrops) {
      const previousY = this.coinMagnetPreviousCoinY.get(coin) ?? coin.sprite.y;
      this.coinMagnetPreviousCoinY.set(coin, coin.sprite.y);
      if (this.magnetCollectingCoins.has(coin)) {
        continue;
      }
      if (previousY < position.y && coin.sprite.y >= position.y) {
        this.pullCoinToMagnet(coin, position.x, position.y);
      }
    }
  }

  private canManuallyCollectTankCoins(): boolean {
    return this.activeScreen === "tank" && !this.modal && !this.htmlDockDragging;
  }

  private syncCoinDropVisibilityAndInput(): void {
    const visible = this.activeScreen !== "makeup";
    for (const coin of this.coinDrops) {
      this.setCoinDropVisible(coin, visible);
    }
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

    const coinToCollect = this.coinDrops.find((coin) => !this.magnetCollectingCoins.has(coin) && coin.sprite.y >= y);
    if (coinToCollect) {
      this.pullCoinToMagnet(coinToCollect, x, y);
    } else if (showEmptyMessage) {
      this.floatTankText("No coins past line", x, y - 22, "#d7f4ff");
    }
  }

  private pullCoinToMagnet(coinToCollect: CoinDrop, x: number, y: number): void {
    if (!this.coinDrops.includes(coinToCollect) || this.magnetCollectingCoins.has(coinToCollect)) {
      return;
    }

    this.magnetCollectingCoins.add(coinToCollect);
    coinToCollect.hitZone.disableInteractive();
    coinToCollect.sprite.disableInteractive();
    this.tweens.add({
      targets: [coinToCollect.sprite, coinToCollect.hitZone, coinToCollect.shimmer, coinToCollect.valueText],
      x,
      y,
      scale: coinMagnetAttractScale,
      duration: coinMagnetAttractDurationMs,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.magnetCollectingCoins.delete(coinToCollect);
        this.recordDailyQuestAction("magnet-coin");
        this.collectCoin(coinToCollect, false);
      }
    });
  }

  private coinMagnetTankPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      tankBounds.left,
      Phaser.Math.Clamp(this.coinMagnetY, this.foodDispenserMinY(), this.foodDispenserMaxY())
    );
  }

  private coinMagnetRayY(): number {
    return Phaser.Math.Clamp(this.coinMagnetTankPosition().y + coinMagnetRayYOffset, this.foodDispenserMinY(), this.foodDispenserMaxY());
  }

  private autoFoodBuyerTankPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      tankBounds.left,
      Phaser.Math.Clamp(this.autoFoodBuyerY, this.foodDispenserMinY(), this.foodDispenserMaxY())
    );
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
    this.coinComboCount = Math.min(coinComboMaxCount, this.coinComboCount + 1);
    this.coinComboCollectedValue += Math.max(0, collectedCommonValue);
    this.coinComboLastClaimedAt = this.time.now;
    this.coinComboLastPosition.set(x, y);

    if (this.coinComboCount >= 2) {
      this.showCoinComboOverlay(`${formatNumber(this.coinComboCount)}x COMBO`);
    }

    if (this.coinComboCount >= coinComboMaxCount) {
      this.resolveCoinCombo();
    }
  }

  private resolveCoinCombo(): void {
    const comboCount = this.coinComboCount;
    const collectedValue = this.coinComboCollectedValue;
    const position = this.coinComboLastPosition.clone();
    this.coinComboCount = 0;
    this.coinComboCollectedValue = 0;
    this.coinComboLastClaimedAt = 0;

    const bonusPercent = comboCount * coinComboRewardPercentPerCount;
    const bonus = Math.floor(collectedValue * (bonusPercent / 100));
    if (bonus <= 0) {
      return;
    }

    earn(this.wallet, "common", bonus);
    const leveledUp = this.addFishProductionTotal(this.tankLevel, bonus);
    this.showCoinComboOverlay(`COMBO BONUS C${formatNumber(bonus)}!`, true, coinComboRewardTextDurationMs);
    this.floatTankText(`COMBO BONUS C${formatNumber(bonus)}!`, position.x, position.y - 24, coinVisualsByType.common.textColor);
    this.refreshUi(!leveledUp);
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
      for (const currentFish of tankFish) {
        if (!currentFish.canChaseFood(food)) {
          continue;
        }

        const fishFoods = assignments.get(currentFish);
        if (fishFoods) {
          fishFoods.push(food);
        } else {
          assignments.set(currentFish, [food]);
        }
      }
    }

    return assignments;
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

  private totalStoredFishCount(): number {
    return [...this.fishInventory.values()].reduce((total, count) => total + Math.max(0, count), 0);
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
    return quantityPriceModel(price, quantity);
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
    return decorationInventoryKeyModel(decorationTypeId, size);
  }

  private sanitizeDecorationSize(size: string | undefined): DecorationSize {
    return sanitizeDecorationSizeModel(size, decorationSizeOrder);
  }

  private decorationVariantPrice(decorationType: DecorationType, size: DecorationSize): Price {
    return tankCatalogDecorationVariantPrice(decorationType, size);
  }

  private getDecorationInventory(decorationTypeId: string, size: DecorationSize = "m"): number {
    return getDecorationInventoryModel(this.decorationInventory, decorationTypeId, size);
  }

  private consumeStoredDecoration(decorationTypeId: string, size: DecorationSize): void {
    consumeStoredDecorationModel(this.decorationInventory, decorationTypeId, size);
  }

  private getPlacedDecorationCount(decorationTypeId: string, size: DecorationSize, level = this.tankLevel): number {
    return placedDecorationCountModel({
      decorations: this.placedDecorations,
      decorationTypeId,
      size,
      level,
      validSizes: decorationSizeOrder
    });
  }

  private getOwnedDecorationCount(decorationTypeId: string, size: DecorationSize, level = this.tankLevel): number {
    return ownedDecorationCountModel({
      inventory: this.decorationInventory,
      decorations: this.placedDecorations,
      decorationTypeId,
      size,
      level,
      validSizes: decorationSizeOrder
    });
  }

  private clearStoredDecorationInventory(decorationTypeId: string, size: DecorationSize): void {
    clearStoredDecorationInventoryModel(this.decorationInventory, decorationTypeId, size);
  }

  private removeStoredDecorationInventory(decorationTypeId: string, size: DecorationSize, quantity: number): number {
    return removeStoredDecorationInventoryModel({
      inventory: this.decorationInventory,
      decorationTypeId,
      size,
      quantity
    });
  }

  private removePlacedDecorationsFromActiveTank(decorationTypeId: string, size: DecorationSize, quantity = Number.POSITIVE_INFINITY): number {
    const keptDecorations: PlacedDecoration[] = [];
    let removedCount = 0;
    const maxToRemove = Math.max(0, Math.floor(quantity));
    for (const decoration of this.placedDecorations) {
      const matchesActiveTank =
        decoration.tankLevel === this.tankLevel &&
        decoration.typeId === decorationTypeId &&
        this.sanitizeDecorationSize(decoration.size) === size;

      if (matchesActiveTank && removedCount < maxToRemove) {
        decoration.image.destroy();
        removedCount += 1;
      } else {
        keptDecorations.push(decoration);
      }
    }

    this.placedDecorations = keptDecorations;
    return removedCount;
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

  private hasAutoFoodBuyer(): boolean {
    return this.autoFoodBuyerExpiresAt() > Date.now();
  }

  private coinMagnetExpiresAt(): number {
    return utilityExpiresAt(this.decorationInventory, coinMagnetInventoryKey);
  }

  private autoFoodBuyerExpiresAt(): number {
    return utilityExpiresAt(this.decorationInventory, autoFoodBuyerInventoryKey);
  }

  private coinMagnetRemainingMinutes(): number {
    return activeUtilityRemainingMinutes(this.coinMagnetExpiresAt());
  }

  private autoFoodBuyerRemainingMinutes(): number {
    return activeUtilityRemainingMinutes(this.autoFoodBuyerExpiresAt());
  }

  private tankUtilityInfo(utilityId: TankUtilityId): { name: string; price: Price; inventoryKey: string; owned: () => boolean } | undefined {
    const utility = tankUtilityInfoModel(utilityId);
    if (!utility) {
      return undefined;
    }

    return {
      name: utility.name,
      price: utility.price,
      inventoryKey: utility.inventoryKey,
      owned: () => utility.id === "food-dispenser"
        ? this.hasFoodDispenser()
        : utility.id === "coin-magnet"
          ? this.hasCoinMagnet()
          : this.hasAutoFoodBuyer()
    };
  }

  private tankUtilityIconPath(utilityId: TankUtilityId): string {
    return tankUtilityInfoModel(utilityId)?.icon ?? "";
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
    this.clearCoinDrops();
    for (const drop of this.pendingHelperCreatureDrops) {
      drop.sprite.destroy();
    }
    this.foods = [];
    this.pendingHelperCreatureDrops = [];
  }

  private clearCoinDrops(): void {
    for (const coin of this.coinDrops) {
      coin.destroy();
    }
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
    for (const drop of this.pendingHelperCreatureDrops) {
      drop.sprite.setVisible(drop.tankLevel === this.tankLevel);
    }
  }

  private refreshDecorationTankVisibility(): void {
    for (const decoration of this.placedDecorations) {
      decoration.image.setVisible(decoration.tankLevel === this.tankLevel);
    }
  }

  private priceWealth(price: FishType["price"]): number {
    return priceWealthModel(price);
  }

  private addFishProductionTotal(level: number, amount: number): boolean {
    const production = Math.max(0, Math.round(amount * 10) / 10);
    if (production <= 0) {
      return false;
    }
    const state = this.ensureTankState(level);
    const previousProduction = Math.max(0, state.fishProductionTotal ?? 0);
    const nextProduction = Math.round((previousProduction + production) * 10) / 10;
    state.fishProductionTotal = nextProduction;
    return this.awardLevelCompletionRewards(level, previousProduction, nextProduction);
  }

  private fishProductionTotal(level = this.tankLevel): number {
    return Math.max(0, this.ensureTankState(level).fishProductionTotal ?? 0);
  }

  private calculateTotalWealth(): number {
    return this.sortedOwnedTankLevels().reduce((total, level) => total + this.calculateTankNetWorth(level), 0);
  }

  private calculateTankNetWorth(level = this.tankLevel): number {
    const state = level === this.tankLevel ? undefined : this.ensureTankState(level);
    return calculateTankNetWorthModel({
      level,
      activeTankLevel: this.tankLevel,
      wallet: this.wallet,
      foodInventory: this.foodInventory,
      fishInventory: this.fishInventory,
      decorationInventory: this.decorationInventory,
      creatureInventory: this.creatureInventory,
      state,
      ensureTankState: (tankLevel) => this.ensureTankState(tankLevel),
      fishInTank: this.fishInTank(level),
      helpersInTank: this.helpersInTank(level),
      decorationsInTank: this.decorationsInTank(level),
      coinDrops: this.coinDrops,
      coinWealthValue,
      activeFishSellValue: (fish) => this.activeFishSellValue(fish),
      storedFishSellValue: (fishType) => this.storedFishSellValue(fishType),
      priceWealth: (price) => this.priceWealth(price),
      isCalorieTrackedFood: (foodTypeId) => this.isCalorieTrackedFood(foodTypeId),
      sanitizeDecorationSize: (size) => this.sanitizeDecorationSize(size),
      decorationVariantPrice: (decorationType, size) => this.decorationVariantPrice(decorationType, size),
      tankCosmeticById: (category, id) => this.tankCosmeticById(category, id)
    });
  }

  private tankDisplayLevel(level = this.tankLevel): number {
    const state = this.ensureTankState(level);
    const currentLevel = rawTankDisplayLevelFromProduction(state.fishProductionTotal ?? 0);
    state.maxDisplayLevel = Math.max(1, currentLevel);
    return state.maxDisplayLevel;
  }

  private projectedActiveProductionPerMinute(): number {
    return this.activeFish()
      .filter((fish) => fish.state !== "ill" && fish.health >= 35 && fish.currentFullnessCalories() > 0)
      .reduce((total, fish) => total + fish.projectedProductionPerMinute(), 0);
  }

  private activeProductionPaceMultiplier(): number {
    const projectedPerMinute = this.projectedActiveProductionPerMinute();
    if (projectedPerMinute <= 0) {
      return 1;
    }

    const targetPerMinute = targetProductionPerMinuteForLevel(this.tankDisplayLevel());
    return Phaser.Math.Clamp(targetPerMinute / (projectedPerMinute * coinComboMaxProductionMultiplier), 0.001, 4);
  }

  private awardLevelCompletionRewards(level: number, previousProduction: number, nextProduction: number): boolean {
    const previousLevel = rawTankDisplayLevelFromProduction(previousProduction);
    const nextLevel = rawTankDisplayLevelFromProduction(nextProduction);
    if (nextLevel <= previousLevel) {
      return false;
    }

    const rewardFish: FishType[] = [];
    for (let completedLevel = previousLevel + 1; completedLevel <= nextLevel; completedLevel += 1) {
      const completedThreshold = fishProductionThresholdForLevel(completedLevel);
      rewardFish.push(this.levelRewardFishFor(completedLevel, Math.max(1, Math.floor(completedThreshold * 0.3))));
    }

    if (rewardFish.length === 0) {
      return false;
    }

    const state = this.ensureTankState(level);
    if (level === this.tankLevel) {
      this.moveActiveFishToInventory();
      this.clearCoinDrops();
      this.wallet = createEmptyWallet();
      state.wallet = this.wallet;
      rewardFish.forEach((fishType) => this.addFishToInventory(fishType, 1, false));
      this.showLevelCompletionRewardModal(previousLevel, nextLevel, rewardFish);
      this.refreshUi();
      this.storeOverlay?.refresh();
      this.saveNow();
    } else {
      state.wallet = createEmptyWallet();
      for (const fishType of rewardFish) {
        state.fishInventory.set(fishType.id, (state.fishInventory.get(fishType.id) ?? 0) + 1);
      }
    }
    return true;
  }

  private levelRewardFishFor(completedLevel: number, targetValue: number): FishType {
    const unlockedLevel = Math.max(1, completedLevel + 1);
    const ownedIds = this.ownedFishTypeIds();
    const unlockedFish = fishTypes.filter((fishType) => fishType.tankLevel <= unlockedLevel);
    const unownedFish = unlockedFish.filter((fishType) => !ownedIds.has(fishType.id));
    const pool = unownedFish.length > 0 ? unownedFish : unlockedFish.length > 0 ? unlockedFish : fishTypes;
    return [...pool].sort((first, second) => {
      const firstDelta = Math.abs(this.priceWealth(first.price) - targetValue);
      const secondDelta = Math.abs(this.priceWealth(second.price) - targetValue);
      return firstDelta - secondDelta || first.tankLevel - second.tankLevel || this.priceWealth(first.price) - this.priceWealth(second.price);
    })[0];
  }

  private moveActiveFishToInventory(): void {
    for (const fish of [...this.activeFish()]) {
      this.storeFish(fish);
    }
  }

  private getTankNeedIndicator(): string {
    return tankNeedIndicatorModel({
      activeFishCount: this.activeFish().length,
      totalFoodInventory: this.getTotalFoodInventory(),
      hasHungryFish: this.fish.some((currentFish) => currentFish.hunger >= 45),
      coinDropCount: this.coinDrops.length,
      maxCoinDrops,
      displayLevel: this.tankDisplayLevel(),
      productionTotal: this.fishProductionTotal(),
      formatNumber
    });
  }

  private getCompactTankNeedIndicator(): string {
    return tankNeedIndicatorModel({
      activeFishCount: this.activeFish().length,
      totalFoodInventory: this.getTotalFoodInventory(),
      hasHungryFish: this.fish.some((currentFish) => currentFish.hunger >= 45),
      coinDropCount: this.coinDrops.length,
      maxCoinDrops,
      displayLevel: this.tankDisplayLevel(),
      productionTotal: this.fishProductionTotal(),
      formatNumber,
      compact: true
    });
  }

  private calculateTankHappiness(): number {
    return calculateTankHappinessModel({
      activeFishCount: this.activeFish().length,
      activeDecorations: this.activeDecorations(),
      cleanliness: this.cleanliness
    });
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
      this.cleanliness = nextTankCleanliness({
        cleanliness: this.cleanliness,
        deltaSeconds,
        cleaning: true,
        activeFishCount,
        looseFoodCount: this.foods.length
      });
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

    this.cleanliness = nextTankCleanliness({
      cleanliness: this.cleanliness,
      deltaSeconds,
      cleaning: false,
      activeFishCount,
      looseFoodCount: this.foods.length
    });
  }

  private isTankDirty(): boolean {
    return isTankDirtyModel(this.cleanliness);
  }

  private finishTankCleaning(): void {
    this.cleanliness = 100;
    this.cleaningTank = false;
    this.cleanedAt = Date.now();
    this.updateDirtyTankOverlay();
    this.syncCleanlinessUi();
    this.refreshUi(false);
    this.saveNow();
  }

  private tankDirtRatePerSecond(activeFishCount: number): number {
    return tankDirtRatePerSecondModel({
      activeFishCount,
      looseFoodCount: this.foods.length
    });
  }

  private cleanTank(): void {
    if (this.cleanliness >= 100) {
      this.cleaningTank = false;
      this.floatText("Already clean", toastX, toastY, "#d7f4ff");
      this.refreshUi(false);
      return;
    }

    if (this.cleaningTank) {
      if (!this.shouldRunTankActivity()) {
        this.finishTankCleaning();
        this.floatText("Tank cleaned", toastX, toastY, "#a8ffb0");
        return;
      }
      this.floatText("Cleaning...", toastX, toastY, "#d7f4ff");
      return;
    }

    this.recordDailyQuestAction("clean");
    if (!this.shouldRunTankActivity()) {
      this.finishTankCleaning();
      this.floatText("Tank cleaned", toastX, toastY, "#a8ffb0");
      return;
    }

    this.cleaningTank = true;
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
    const throwVelocity = this.foodDispenserThrowVelocity(outlet);
    const pellet = new FoodPellet(this, outlet.x, outlet.y, foodType, {
      velocityX: throwVelocity.x,
      velocityY: throwVelocity.y,
      displayScale: foodDispenserPelletScale,
      reservedCalories,
      source: "dispenser"
    });
    pellet.setWorldScaleCompensation(this.tankViewScaleForLevel());
    pellet.addToContainer(this.tankLayer);
    this.foods.push(pellet);
    this.cleanliness = Phaser.Math.Clamp(this.cleanliness - 0.4, 0, 100);
    this.recordDailyQuestAction(foodType.id === "medicine" ? "dispenser-medicine" : "dispenser-food");
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

  private foodDispenserThrowVelocity(outlet: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    const target = new Phaser.Math.Vector2((tankBounds.left + tankBounds.right) / 2, (tankBounds.top + tankBounds.bottom) / 2);
    const direction = target.subtract(outlet);
    if (direction.lengthSq() <= 1) {
      return new Phaser.Math.Vector2(0, 18);
    }

    const distance = direction.length();
    const power = Phaser.Math.Clamp(distance * 1.35, 150, 280);
    return direction.normalize().scale(power);
  }

  private updateHelperCreatures(deltaSeconds: number, tankFish = this.activeFish(), activeHelpers = this.activeHelperCreatures()): void {
    for (const helper of activeHelpers) {
      const action = helper.update(deltaSeconds, this.coinDrops, this.foods, tankFish);

      if (!action) {
        continue;
      }

      if (action.kind === "coin" && this.coinDrops.includes(action.coin)) {
        this.collectCoin(action.coin, true);
        this.recordDailyQuestAction("helper-coin");
        this.floatTankText(`${helper.type.name} coin`, helper.sprite.x, helper.sprite.y - 20, "#ffe67a");
      }

      if (action.kind === "food" && this.foods.includes(action.food)) {
        this.removeFood(action.food);
        this.cleanliness = Phaser.Math.Clamp(this.cleanliness + 1.4, 0, 100);
        this.recordDailyQuestAction("helper-food-clean");
        this.floatTankText("Cleaned", helper.sprite.x, helper.sprite.y - 20, "#a8ffb0");
        this.saveNow();
      }

      if (action.kind === "tankClean" && this.cleanliness < 100) {
        this.cleanliness = Phaser.Math.Clamp(this.cleanliness + 1, 0, 100);
        this.cleanedAt = Date.now();
        this.recordDailyQuestAction("helper-clean");
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

  private updateAutoFoodBuyer(tankFish = this.activeFish()): void {
    if (!this.hasAutoFoodBuyer() || this.time.now < this.nextAutoFoodBuyerPurchaseAt || this.foods.length >= maxFoodDrops) {
      return;
    }

    if (this.getTotalFeedableFoodInventory() > 0) {
      return;
    }

    const foodType = this.chooseAutoPurchasableFood(tankFish);
    if (!foodType) {
      return;
    }

    const totalPrice = this.quantityPrice(foodType.price, autoFoodBuyerPurchaseQuantity);
    if (!this.developerGodMode && !spend(this.wallet, totalPrice)) {
      this.nextAutoFoodBuyerPurchaseAt = this.time.now + autoFoodBuyerPurchaseCooldownMs;
      return;
    }

    this.foodInventory.set(foodType.id, this.getFoodInventory(foodType.id) + foodType.calories * autoFoodBuyerPurchaseQuantity);
    this.nextAutoFoodBuyerPurchaseAt = this.time.now + autoFoodBuyerPurchaseCooldownMs;
    this.recordDailyQuestAction("buy-food");
    this.recordDailyQuestAction("auto-buy-food");
    const position = this.autoFoodBuyerTankPosition();
    this.floatTankText(`Bought ${foodType.name} x${formatNumber(autoFoodBuyerPurchaseQuantity)}`, position.x + 22, position.y - 10, "#a8ffb0");
    this.createFoodDock();
    this.refreshUi(false);
    this.saveNow();
  }

  private chooseAutoPurchasableFood(tankFish = this.activeFish()): FoodType | undefined {
    const candidates = foodTypes.filter(
      (foodType) =>
        this.isCalorieTrackedFood(foodType.id) &&
        this.isDroppableFood(foodType.id) &&
        (this.developerGodMode || canAfford(this.wallet, foodType.price))
    );

    const medianMealCalories = this.medianMealCaloriesNeeded(tankFish);
    if (medianMealCalories > 0) {
      return bestCalorieFoodForTarget(candidates, medianMealCalories, (foodTypeId) => {
        const foodType = foodTypes.find((item) => item.id === foodTypeId);
        return foodType?.calories ?? 0;
      });
    }

    return candidates.sort((first, second) => this.priceWealth(first.price) - this.priceWealth(second.price) || first.calories - second.calories)[0];
  }

  private medianMealCaloriesNeeded(tankFish = this.activeFish()): number {
    const needs = tankFish
      .map((fish) => fish.mealCaloriesNeeded())
      .filter((need) => Number.isFinite(need) && need > 0)
      .sort((first, second) => first - second);
    if (needs.length === 0) {
      return 0;
    }

    const middle = Math.floor(needs.length / 2);
    return needs.length % 2 === 1 ? needs[middle]! : (needs[middle - 1]! + needs[middle]!) / 2;
  }

  private foodNeedMessage(targetCalories: number): string {
    return recommendedFoodName(foodTypes, targetCalories);
  }

  private normalizeDailyGoals(savedGoals: DailyGoalsState | undefined): DailyGoalsState {
    return normalizeDailyGoalsModel(savedGoals, this.localDateKey());
  }

  private dailyQuestItems(): DailyQuestItem[] {
    const activeFish = this.activeFish();
    return buildDailyQuestItems({
      affordableCommonFish: fishTypes.some((fishType) => fishType.rarity === "common" && canAfford(this.wallet, fishType.price)),
      activeFishCount: activeFish.length,
      activeDecorationCount: this.activeDecorations().length,
      activeHelperCount: this.activeHelperCreatures().length,
      sickFishCount: activeFish.filter((fish) => fish.state === "ill" || fish.health < 82).length,
      hungryFishCount: activeFish.filter((fish) => fish.state === "hungry" || fish.hunger > 68).length,
      medicineInventory: this.getFoodInventory("medicine"),
      feedableFoodInventory: this.getTotalFeedableFoodInventory(),
      totalFoodInventory: this.getTotalFoodInventory(),
      storedFishCount: [...this.fishInventory.values()].reduce((total, count) => total + count, 0),
      storedDecorationCount: [...this.decorationInventory.values()].reduce((total, count) => total + count, 0),
      rareCoinCount: this.wallet.rare,
      superRareCoinCount: this.wallet.superRare,
      coinDropCount: this.coinDrops.length,
      cleanliness: this.cleanliness,
      hasFoodDispenser: this.hasFoodDispenser(),
      hasCoinMagnet: this.hasCoinMagnet(),
      hasAutoFoodBuyer: this.hasAutoFoodBuyer(),
      foodDispenserPrice: foodDispenserPrice,
      questReward: this.commonQuestReward(),
      actionCount: (action) => this.dailyQuestActionCount(action),
      fishPurchaseCount: (coinType) => this.todayFishPurchaseCount(coinType)
    });
  }

  private dailyGoalUnfinishedCount(): number {
    return this.visibleDailyQuestItems().length;
  }

  private visibleDailyQuestItems(): DailyQuestItem[] {
    const quests = this.dailyQuestItems();
    const previousActiveIds = this.dailyGoals.activeQuestIds?.join("|") ?? "";
    this.dailyGoals = ensureActiveDailyQuestItemsModel(this.dailyGoals, quests);
    const nextActiveIds = this.dailyGoals.activeQuestIds?.join("|") ?? "";
    if (previousActiveIds !== nextActiveIds) {
      this.saveNow();
    }
    return visibleDailyQuestItemsModel(this.dailyGoals, quests);
  }

  private commonQuestReward(): Price {
    return questCommonReward(this.calculateTankNetWorth());
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

  private clearExpiredRewardedAdCooldown(): void {
    if (this.rewardedAd?.cooldown === true && isRewardedAdReady(this.rewardedAd)) {
      this.rewardedAd = undefined;
    }
  }

  private startRewardedAd(kind: RewardedAdKind): void {
    this.clearExpiredRewardedAdCooldown();
    if (this.rewardedAd) {
      if (this.rewardedAd.cooldown === true) {
        const remainingSeconds = rewardedAdRemainingSeconds(this.rewardedAd);
        this.floatText(`Ad cooldown ${formatNumber(remainingSeconds)}s`, toastX, toastY, "#d7f4ff");
      }
      return;
    }

    this.rewardedAd = { kind, readyAt: Date.now() + rewardedAdDurationMs };
    this.recordDailyQuestAction("watch-ad");
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
          if (this.rewardedAd.cooldown === true) {
            this.rewardedAd = undefined;
            if (this.activeScreen === "goals") {
              this.syncHtmlPageOverlay();
            }
          }
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
    if (this.rewardedAd.cooldown === true) {
      this.rewardedAdModalButton.disabled = true;
      this.rewardedAdModalButton.textContent = `Cooldown ${formatNumber(remainingSeconds)}s`;
      return;
    }
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
    if (!this.rewardedAd || this.rewardedAd.kind !== kind || this.rewardedAd.cooldown === true || !isRewardedAdReady(this.rewardedAd)) {
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
      this.addFishToInventory(fishType);
      this.floatText(`${fishType.name} in bubble`, toastX, toastY, "#a8ffb0");
    } else if (kind === "helper") {
      const creatureType = this.rewardedAdHelperReward();
      this.creatureInventory.set(creatureType.id, this.getCreatureInventory(creatureType.id) + 1);
      this.recentInventoryDockItemKey = `helper:${creatureType.id}`;
      this.floatText(`+${creatureType.name}`, toastX, toastY, "#a8ffb0");
    }

    this.recordDailyQuestAction("claim-ad");
    this.recordDailyQuestAction(kind === "common" ? "claim-coin-ad" : `claim-${kind}-ad`);
    this.rewardedAd = { kind, readyAt: Date.now() + rewardedAdCooldownMs, cooldown: true };
    this.ensureRewardedAdRefreshTimer();
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

  private recentProductionBoostPurchaseCount(now = Date.now()): number {
    return questRecentProductionBoostPurchaseCount(this.dailyGoals, now);
  }

  private canBuyProductionBoostNow(): boolean {
    return this.recentProductionBoostPurchaseCount() === 0;
  }

  private productionBoostPurchaseRestockLabel(now = Date.now()): string {
    const oldestRecentPurchase = oldestRecentProductionBoostPurchase(this.dailyGoals, now);

    if (!oldestRecentPurchase) {
      return "30m restock";
    }

    const remainingSeconds = Math.ceil((oldestRecentPurchase + productionBoostPurchaseWindowMs - now) / 1000);
    return `Restock ${this.compactDurationLabel(remainingSeconds)}`;
  }

  private recordProductionBoostPurchase(): void {
    this.dailyGoals = this.normalizeDailyGoals(this.dailyGoals);
    this.dailyGoals = recordProductionBoostPurchaseModel(this.dailyGoals);
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
    this.dailyGoals = ensureActiveDailyQuestItemsModel(this.dailyGoals, this.dailyQuestItems());
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
    return rarityLabelModel(rarity);
  }

  private rarityStarsLabel(rarity: FishType["rarity"]): string {
    return rarityStarsLabelModel(rarity);
  }

  private rarityForPrice(price: Price): Rarity {
    return rarityForPriceModel(price);
  }

  private rarityIconPath(rarity: Rarity): string {
    return rarityIconPathModel(rarity);
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

    const sellValue = this.activeFishSellValue(targetFish);
    this.showModal(
      targetFish.type.name,
      [],
      [
        { label: "SELL NOW", fill: 0x76512d, action: () => this.sellFishByIndex(index) },
        { label: "Cancel", fill: 0x254d68, action: () => this.closeModal() }
      ],
      [
        htmlElement("div", "aq-modal-preview", [
          htmlImage(`/assets/fish/${targetFish.type.id}.png`, targetFish.type.name, "aq-modal-preview-image fish")
        ]),
        htmlElement("p", "aq-modal-owned-line", ["Owned x1"]),
        this.commonCoinValueRow("Receive", sellValue)
      ]
    );
  }

  private showStoredFishSellConfirmation(fishTypeId: string): void {
    const fishType = fishTypes.find((item) => item.id === fishTypeId);
    const count = this.getFishInventory(fishTypeId);
    if (!fishType || count <= 0) {
      this.floatText("No fish in inventory", toastX, toastY, "#ffb0a8");
      return;
    }

    this.showInventorySellQuantityModal({
      title: fishType.name,
      preview: htmlElement("div", "aq-modal-preview", [
        htmlImage(`/assets/fish/${fishType.id}.png`, fishType.name, "aq-modal-preview-image fish")
      ]),
      ownedLabel: `Owned x${formatNumber(count)}`,
      maxQuantity: count,
      valueForQuantity: (quantity) => this.storedFishSellValue(fishType) * quantity,
      onSell: (quantity) => this.sellStoredFish(fishTypeId, quantity)
    });
  }

  private showFishFusionModal(preselectedKeys: Iterable<string> = []): void {
    const sources = this.fishFusionSources();
    if (sources.length < 2) {
      this.floatText("Need 2 fish", toastX, toastY, "#ffb0a8");
      return;
    }

    this.closeModal();
    this.modalTitle = "Fusion";
    const validKeys = new Set(sources.map((source) => source.key));
    const selectedKeys = new Set([...preselectedKeys].filter((key) => validKeys.has(key)).slice(0, 2));
    const selectedSources = (): FishFusionSource[] => sources.filter((source) => selectedKeys.has(source.key));

    const shell = htmlElement("div", "aq-modal-shell aq-fusion-modal-shell");
    const stopEvent = (event: Event) => {
      event.stopPropagation();
    };
    shell.addEventListener("pointerdown", stopEvent);
    shell.addEventListener("pointerup", stopEvent);
    shell.addEventListener("click", stopEvent);

    const selectedLabel = htmlElement("p", "aq-modal-line aq-fusion-selected", ["Select 2 fish"]);
    const resultStage = htmlElement("div", "aq-fusion-result-stage", [
      htmlElement("p", "aq-fusion-result-copy", ["Select 2 fish to preview the result."])
    ]);
    const sourceGrid = htmlElement("div", "aq-fusion-source-grid");
    let fuseButton: HTMLButtonElement;

    const updateSelection = () => {
      const selected = selectedSources();
      selectedLabel.textContent = selected.length === 0
        ? "Select 2 fish"
        : selected.map((source) => `${source.type.name} (${source.label})`).join(" + ");
      fuseButton.disabled = selected.length !== 2;
      fuseButton.textContent = selected.length === 2 ? `FUSE C${formatNumber(this.fishFusionCostFor(selected).amount)}` : "FUSE";
      const resultTypes = selected.length === 2 ? this.fishFusionResultTypes(selected) : undefined;
      if (resultTypes?.normal) {
        const inheritedAge = Math.max(...selected.map((source) => source.ageSeconds));
        const chances = this.fishFusionChancesFor(selected, Boolean(resultTypes.premium));
        resultStage.replaceChildren(
          htmlElement("div", "aq-fusion-result-candidates", [
            createFusionResultCandidate({ label: "Normal", fishType: resultTypes.normal, chance: chances.normal }),
            resultTypes.premium
              ? createFusionResultCandidate({ label: "Premium", fishType: resultTypes.premium, chance: chances.premium })
              : htmlElement("div", "aq-fusion-result-card unavailable", [
                htmlElement("span", "aq-fusion-result-tier", ["Premium"]),
                htmlElement("p", "aq-fusion-result-copy", ["No premium fish available"])
              ])
          ]),
          htmlElement("p", "aq-fusion-result-copy", [`Age ${this.fusionAgeLabel(inheritedAge)} | Always succeeds`])
        );
      } else {
        resultStage.replaceChildren(
          htmlElement("p", "aq-fusion-result-copy", [selected.length === 2 ? "No un-owned fish available." : "Select 2 fish to preview the result."])
        );
      }
      sourceGrid.querySelectorAll<HTMLButtonElement>(".aq-fusion-source-button").forEach((button) => {
        button.classList.toggle("selected", selectedKeys.has(button.dataset.sourceKey ?? ""));
      });
    };

    sources.forEach((source) => {
      const sourceButton = createHtmlButton("", "aq-fusion-source-button", () => {
        if (selectedKeys.has(source.key)) {
          selectedKeys.delete(source.key);
        } else if (selectedKeys.size < 2) {
          selectedKeys.add(source.key);
        }
        updateSelection();
      }, { attachTouchFeedback: (button) => this.attachTouchFeedback(button) });
      sourceButton.dataset.sourceKey = source.key;
      sourceButton.append(
        htmlImage(`/assets/fish/${source.type.id}.png`, "", "aq-fusion-source-image"),
        htmlElement("span", "aq-fusion-source-name", [source.type.name]),
        htmlElement("span", "aq-fusion-source-meta", [`${source.label} | ${this.fusionAgeLabel(source.ageSeconds)}`])
      );
      sourceGrid.append(sourceButton);
    });

    const closeButton = createHtmlButton("Cancel", "aq-modal-button muted", () => this.closeModal(), {
      attachTouchFeedback: (button) => this.attachTouchFeedback(button)
    });
    fuseButton = createHtmlButton("FUSE", "aq-modal-button good", () => {
      const selected = selectedSources();
      if (selected.length !== 2) {
        return;
      }
      const resultTypes = this.fishFusionResultTypes(selected);
      if (!resultTypes.normal) {
        this.floatText("No un-owned fish", toastX, toastY, "#ffb0a8");
        return;
      }
      const fusionCost = this.fishFusionCostFor(selected);
      if (!this.developerGodMode && !canAfford(this.wallet, fusionCost)) {
        return;
      }

      fuseButton.disabled = true;
      closeButton.disabled = true;
      sourceGrid.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
        button.disabled = true;
      });
      resultStage.classList.add("processing");
      resultStage.replaceChildren(
        htmlElement("div", "aq-fusion-spinner"),
        htmlElement("p", "aq-fusion-result-copy", ["Fusing..."])
      );

      const chances = this.fishFusionChancesFor(selected, Boolean(resultTypes.premium));
      const roll = Math.random();
      const resultOutcome = resultTypes.premium && roll < chances.premium
        ? { label: "Premium", fishType: resultTypes.premium }
        : { label: "Normal", fishType: resultTypes.normal };
      const inheritedAge = Math.max(...selected.map((source) => source.ageSeconds));
      const fusionToken = ++this.fusionRunToken;
      const unlockFusionControls = () => {
        closeButton.disabled = false;
        sourceGrid.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
          button.disabled = false;
        });
        updateSelection();
      };

      this.pendingFusionTimer = window.setTimeout(() => {
        this.pendingFusionTimer = undefined;
        if (fusionToken !== this.fusionRunToken || this.modal !== shell || !document.body.contains(shell)) {
          return;
        }
        if (!this.areFishFusionSourcesAvailable(selected)) {
          resultStage.classList.remove("processing");
          selectedKeys.clear();
          unlockFusionControls();
          resultStage.replaceChildren(htmlElement("p", "aq-fusion-result-copy", ["Fusion source changed. Select two fish again."]));
          return;
        }
        if (!this.spendPrice(fusionCost)) {
          resultStage.classList.remove("processing");
          unlockFusionControls();
          resultStage.replaceChildren(htmlElement("p", "aq-fusion-result-copy", [`Need ${formatPrice(fusionCost)} to fuse.`]));
          return;
        }
        const resultType = resultOutcome.fishType;
        this.captureActiveTankState();
        this.consumeFishFusionSources(selected);
        this.addFishToInventory(resultType);
        this.addStoredFishAge(resultType.id, inheritedAge);
        this.ensureFishTexturesLoaded(resultType);
        this.recordDailyQuestAction("fuse-fish");
        if (resultOutcome.label === "Premium") {
          this.recordDailyQuestAction("premium-fusion");
        }
        resultStage.classList.remove("processing");
        resultStage.replaceChildren(
          htmlImage(`/assets/fish/${resultType.id}.png`, "", "aq-fusion-result-image"),
          htmlElement("p", "aq-fusion-result-copy success", [`${resultOutcome.label} success: ${resultType.name} inventory | ${this.fusionAgeLabel(inheritedAge)}`])
        );
        this.floatText(`-${formatPrice(fusionCost)} fusion`, toastX, toastY, "#ffdc7a");
        this.floatText(`${resultType.name} moved to inventory`, toastX, toastY, "#a8ffb0");
        closeButton.textContent = "Close";
        closeButton.disabled = false;
        this.createFoodDock();
        this.refreshUi();
        this.saveNow();
      }, this.settings.reducedMotion ? 250 : 1400);
    }, {
      disabled: true,
      attachTouchFeedback: (button) => this.attachTouchFeedback(button)
    });

    const panel = htmlElement("section", "aq-modal aq-fusion-modal", [
      htmlElement("div", "aq-fusion-modal-header", [
        htmlElement("span", "aq-fusion-modal-badge", ["Fusion Lab"]),
        htmlElement("h2", "aq-modal-title aq-fusion-modal-title", ["Preview Results"])
      ]),
      htmlElement("div", "aq-modal-body aq-fusion-modal-body", [
        htmlElement("p", "aq-modal-line", ["Cost is shown on the Fuse button. Fusion always succeeds. Close-age fish have better Premium chance."]),
        selectedLabel,
        sourceGrid,
        resultStage
      ]),
      htmlElement("div", "aq-modal-actions", [fuseButton, closeButton])
    ]);
    shell.append(panel);
    document.body.appendChild(shell);
    this.modal = shell;
    this.syncCoinDropVisibilityAndInput();
    updateSelection();
  }

  private fishFusionSources(): FishFusionSource[] {
    return createFishFusionSources({
      activeFish: this.activeFish(),
      fishInventory: this.fishInventory,
      storedFishAgesFor: (fishTypeId) => this.storedFishAgesFor(fishTypeId)
    });
  }

  private fishFusionResultTypes(sources: FishFusionSource[]): { normal?: FishType; premium?: FishType } {
    return fishFusionResultTypesModel({
      sources,
      ownedFishTypeIds: this.ownedFishTypeIds(),
      activeFish: this.fish,
      activeFishSellValue: (fish) => this.activeFishSellValue(fish),
      storedFishSellValue: (fishType) => this.storedFishSellValue(fishType),
      priceWealth: (price) => this.priceWealth(price)
    });
  }

  private fishFusionSourceSellValue(source: FishFusionSource): number {
    return fishFusionSourceSellValueModel(source, {
      activeFish: this.fish,
      activeFishSellValue: (fish) => this.activeFishSellValue(fish),
      storedFishSellValue: (fishType) => this.storedFishSellValue(fishType)
    });
  }

  private fishFusionCostFor(sources: FishFusionSource[]): Price {
    return fishFusionCostForModel(sources, (source) => this.fishFusionSourceSellValue(source));
  }

  private areFishFusionSourcesAvailable(sources: FishFusionSource[]): boolean {
    const availableKeys = new Set(this.fishFusionSources().map((source) => source.key));
    return sources.every((source) => availableKeys.has(source.key));
  }

  private fishFusionChancesFor(sources: FishFusionSource[], hasPremium: boolean): FishFusionChances {
    return fishFusionChancesForModel(sources, hasPremium);
  }

  private consumeFishFusionSources(sources: FishFusionSource[]): void {
    sources
      .filter((source): source is Extract<FishFusionSource, { kind: "active" }> => source.kind === "active")
      .sort((first, second) => second.activeIndex - first.activeIndex)
      .forEach((source) => {
        const fish = this.fish[source.activeIndex];
        if (!fish || fish.type.id !== source.type.id) {
          return;
        }
        this.fish.splice(source.activeIndex, 1);
        fish.destroy();
      });

    sources
      .filter((source): source is Extract<FishFusionSource, { kind: "stored" }> => source.kind === "stored")
      .sort((first, second) => (second.storedAgeIndex ?? -1) - (first.storedAgeIndex ?? -1))
      .forEach((source) => this.consumeStoredFishForFusion(source));
  }

  private consumeStoredFishForFusion(source: Extract<FishFusionSource, { kind: "stored" }>): void {
    const current = this.getFishInventory(source.type.id);
    if (current <= 1) {
      this.fishInventory.delete(source.type.id);
    } else {
      this.fishInventory.set(source.type.id, current - 1);
    }

    if (source.storedAgeIndex !== undefined) {
      const ages = this.storedFishAgesFor(source.type.id);
      ages.splice(source.storedAgeIndex, 1);
      this.setStoredFishAges(source.type.id, ages);
    }
    this.trimStoredFishAges(source.type.id);
  }

  private ownedFishTypeIds(): Set<string> {
    const ownedIds = new Set(this.fish.map((fish) => fish.type.id));
    for (const [fishTypeId, count] of this.fishInventory.entries()) {
      if (count > 0) {
        ownedIds.add(fishTypeId);
      }
    }
    for (const state of this.tankStates.values()) {
      for (const [fishTypeId, count] of state.fishInventory.entries()) {
        if (count > 0) {
          ownedIds.add(fishTypeId);
        }
      }
    }
    return ownedIds;
  }

  private storedFishAgesFor(fishTypeId: string): number[] {
    return storedFishAgesForModel(this.fishInventoryAges, fishTypeId);
  }

  private addStoredFishAge(fishTypeId: string, ageSeconds: number): void {
    addStoredFishAgeModel(this.fishInventoryAges, fishTypeId, ageSeconds, this.getFishInventory(fishTypeId));
  }

  private takeStoredFishAge(fishTypeId: string): number {
    return takeStoredFishAgeModel(this.fishInventoryAges, fishTypeId, Math.max(0, this.getFishInventory(fishTypeId) - 1));
  }

  private setStoredFishAges(fishTypeId: string, ages: number[]): void {
    setStoredFishAgesModel(this.fishInventoryAges, fishTypeId, ages, this.getFishInventory(fishTypeId));
  }

  private trimStoredFishAges(fishTypeId: string): void {
    this.setStoredFishAges(fishTypeId, this.storedFishAgesFor(fishTypeId));
  }

  private fusionAgeLabel(ageSeconds: number): string {
    return fusionAgeLabelModel(ageSeconds);
  }

  private showInventorySellQuantityModal(options: {
    title: string;
    preview: HTMLElement;
    ownedLabel: string;
    maxQuantity: number;
    valueForQuantity: (quantity: number) => number;
    onSell: (quantity: number) => void;
  }): void {
    const { bodyElements, actions } = createSellQuantityModalContent({
      preview: options.preview,
      ownedLabel: options.ownedLabel,
      maxQuantity: options.maxQuantity,
      valueForQuantity: options.valueForQuantity,
      createValueRow: (label, amount) => this.commonCoinValueRow(label, amount),
      attachTouchFeedback: (button) => this.attachTouchFeedback(button),
      onSell: options.onSell,
      onCancel: () => this.closeModal()
    });

    this.showModal(
      options.title,
      [],
      actions,
      bodyElements
    );
  }

  private showFoodSellConfirmation(foodTypeId: FoodTypeId): void {
    const foodType = foodTypes.find((item) => item.id === foodTypeId);
    const storedAmount = this.getFoodInventory(foodTypeId);
    if (!foodType || storedAmount <= 0) {
      this.floatText("No food to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const maxQuantity = this.foodInventoryDisplayCount(foodType);
    const previewImage = htmlImage(foodAssetPath(foodType.id), foodType.name, "aq-modal-preview-image food");
    previewImage.style.filter = foodCssFilterFor(foodType.id);
    this.showInventorySellQuantityModal({
      title: foodType.name,
      preview: htmlElement("div", "aq-modal-preview", [previewImage]),
      ownedLabel: `Owned x${this.foodInventoryBadgeLabel(foodType)}`,
      maxQuantity,
      valueForQuantity: (quantity) => {
        const sellAmount = this.isCalorieTrackedFood(foodType.id)
          ? Math.min(storedAmount, quantity * Math.max(1, foodType.calories))
          : Math.min(storedAmount, quantity);
        return this.foodSellValue(foodType, sellAmount);
      },
      onSell: (quantity) => this.sellFoodInventory(foodTypeId, quantity)
    });
  }

  private showDecorationSellConfirmation(decorationTypeId: string, size: DecorationSize): void {
    const decorationType = decorationTypes.find((item) => item.id === decorationTypeId);
    const count = this.getOwnedDecorationCount(decorationTypeId, size);
    if (!decorationType || count <= 0) {
      this.floatText("No decor to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const sizeLabel = decorationSizes[size].label;
    this.showInventorySellQuantityModal({
      title: `${decorationType.name} ${sizeLabel}`,
      preview: htmlElement("div", "aq-modal-preview", [
        htmlImage(`/assets/decorations/${decorationType.id}.png`, decorationType.name, "aq-modal-preview-image")
      ]),
      ownedLabel: `Owned x${formatNumber(count)}`,
      maxQuantity: count,
      valueForQuantity: (quantity) => this.decorationSellValue(decorationType, size, quantity),
      onSell: (quantity) => this.sellDecorationInventory(decorationTypeId, size, quantity)
    });
  }

  private showTankUtilitySellConfirmation(utilityId: TankUtilityId): void {
    const utility = this.tankUtilityInfo(utilityId);
    if (!utility || !utility.owned()) {
      this.floatText("No tool to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    this.showInventorySellQuantityModal({
      title: utility.name,
      preview: htmlElement("div", "aq-modal-preview", [
        htmlImage(this.tankUtilityIconPath(utilityId), utility.name, "aq-modal-preview-image")
      ]),
      ownedLabel: "Owned x1",
      maxQuantity: 1,
      valueForQuantity: () => this.tankUtilitySellValue(utility.price),
      onSell: () => this.sellTankUtility(utilityId)
    });
  }

  private showCoinSellConfirmation(coinType: "rare" | "superRare"): void {
    const count = this.wallet[coinType];
    if (count <= 0) {
      this.floatText("No coins to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const label = coinType === "rare" ? "Rare Coin" : "Super Rare Diamond";
    this.showInventorySellQuantityModal({
      title: label,
      preview: htmlElement("div", "aq-modal-preview", [
        htmlImage(coinAssetPathByType[coinType], label, "aq-modal-preview-image")
      ]),
      ownedLabel: `Owned x${formatNumber(count)}`,
      maxQuantity: count,
      valueForQuantity: (quantity) => this.coinSellValue(coinType, quantity),
      onSell: (quantity) => this.sellCoinInventory(coinType, quantity)
    });
  }

  private showHelperSellConfirmation(index: number): void {
    const targetHelper = this.helperCreatures[index];
    if (!targetHelper) {
      this.floatText("No helper to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellPrice = this.helperSellPrice(targetHelper.type);
    this.showModal(
      targetHelper.type.name,
      [],
      [
        { label: "SELL NOW", fill: 0x76512d, action: () => this.sellHelperCreatureByIndex(index) },
        { label: "Cancel", fill: 0x254d68, action: () => this.closeModal() }
      ],
      [
        htmlElement("div", "aq-modal-preview", [
          htmlImage(
            targetHelper.type.id === "feeder-snail" ? "/assets/helpers/feeder-snail.png" : `/assets/helpers/${targetHelper.type.id}.png`,
            targetHelper.type.name,
            "aq-modal-preview-image"
          )
        ]),
        htmlElement("p", "aq-modal-owned-line", ["Owned x1"]),
        this.priceIconRow(sellPrice, "Receive")
      ]
    );
  }

  private showOfflineSummary(): void {
    const minutesAway = Math.floor(this.offlineProgress.elapsedSeconds / 60);
    const earnedEntries = (Object.entries(this.offlineProgress.earned) as Array<[CoinType, number]>).filter(([, amount]) => amount > 0);
    const previewCoins = earnedEntries.length > 0 ? earnedEntries : [["common", 0] as [CoinType, number]];
    this.showModal(
      "Offline Summary",
      [],
      [{ label: "Continue", fill: 0x356a35, action: () => this.closeModal() }],
      [
        htmlElement("div", "aq-modal-preview aq-modal-coin-preview", previewCoins.map(([coinType, amount]) =>
          htmlElement("span", "aq-modal-coin-preview-item", [
            htmlImage(coinAssetPathByType[coinType], coinType, "aq-modal-preview-image coin"),
            htmlElement("strong", "", [formatNumber(amount)])
          ])
        )),
        this.walletIconRow("Earned", this.offlineProgress.earned),
        htmlElement("p", "aq-modal-owned-line", [`Away ${formatNumber(minutesAway)} min`]),
        htmlElement("p", "aq-modal-owned-line", [`Clean ${formatNumber(Math.round(this.cleanliness))}%`])
      ]
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

  private showModal(title: string, lines: string[], actions: ModalAction[], bodyElements?: HTMLElement[]): void {
    this.closeModal();
    this.modalTitle = title;

    const shell = createModalShell({
      title,
      lines,
      bodyElements,
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
    this.syncCoinDropVisibilityAndInput();
  }

  private showPrizeCelebration(title: string, imageUrl: string, detail: string, buttonLabel = "Awesome", onClose?: () => void): void {
    this.closeModal();
    this.modalTitle = title;
    const shell = createPrizeCelebrationShell({
      title,
      imageUrl,
      detail,
      buttonLabel,
      createButton: (label, className, action, disabled) => this.htmlButton(label, className, action, disabled),
      onClose: () => {
        this.closeModal();
        onClose?.();
      }
    });
    document.body.appendChild(shell);
    this.modal = shell;
    this.syncCoinDropVisibilityAndInput();
  }

  private showLevelCompletionRewardModal(completedLevel: number, nextLevel: number, rewardFish: FishType[]): void {
    this.closeModal();
    const fallbackFish = fishTypes[0];
    if (!fallbackFish) {
      return;
    }
    const shell = createLevelCompletionRewardShell({
      completedLevel,
      nextLevel,
      rewardFish,
      fallbackFish,
      createButton: (label, className, action, disabled) => this.htmlButton(label, className, action, disabled),
      onClaim: () => this.closeModal()
    });
    document.body.appendChild(shell);
    this.modal = shell;
    this.syncCoinDropVisibilityAndInput();
  }

  private cancelPendingFusion(): void {
    if (this.pendingFusionTimer !== undefined) {
      window.clearTimeout(this.pendingFusionTimer);
      this.pendingFusionTimer = undefined;
    }
    this.fusionRunToken += 1;
  }

  private closeModal(): void {
    this.cancelPendingFusion();
    this.modal?.remove();
    this.modal = undefined;
    this.modalTitle = undefined;
    this.rewardedAdCountdownText = undefined;
    this.rewardedAdModalButton = undefined;
    this.syncCoinDropVisibilityAndInput();
  }

  private floatText(message: string, x: number, y: number, color: string): void {
    const safeY = Math.max(y, 172);
    const text = this.add
      .text(x, safeY, message, {
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
      y: safeY - 18,
      duration: 2000,
      ease: "Sine.out",
      onComplete: () => {
        this.tweens.add({
          targets: text,
          alpha: 0,
          duration: 700,
          ease: "Sine.in",
          onComplete: () => text.destroy()
        });
      }
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
          const emote = currentFish.getEmoteSnapshot();
          const tailAnimation = currentFish.getTailAnimationSnapshot();
          const emotePosition = this.tankToScreenPoint(emote.x, emote.y);
          const emojiPosition = this.tankToScreenPoint(emote.emojiX, emote.emojiY);
          const fullnessRatio = currentFish.fullnessRatio();
          const moodRatio = Phaser.Math.Clamp(currentFish.health / 100, 0, 1);
          const growthBlockedByTank = currentFish.isGrowthLimitedByTank();
          const fullyGrown = currentFish.visualScale() >= currentFish.tankGrowthScaleCap() - 0.01;
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
            growthBlockedByTank,
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
              careBarsVisible: false,
              y: Math.min(emotePosition.y, fishPosition.y - 1),
              fullnessRatio,
              moodRatio,
              tailTint: fishFoodTintFor(currentFish.type),
              rarityStars: 0,
              fullyGrown,
              growthBlockedByTank,
              emoji: emote.emoji,
              emojiVisible: emote.emojiVisible,
              emojiBubbleVisible: emote.emojiBubbleVisible
            },
            emote: {
              ...emote,
              x: emotePosition.x,
              y: emotePosition.y,
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
          this.returnToTankScreen();
        } else {
          this.openScreen(screen);
        }
      },
      setStoreTab: (tab: StoreTab) => {
        this.activeScreen = "store";
        this.activeTab = tab;
        this.syncCoinDropVisibilityAndInput();
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
      buyFish: (fishTypeId: string) => {
        const fishType = fishTypes.find((item) => item.id === fishTypeId);
        if (fishType) {
          this.buyFish(fishType);
        }
      },
      placeFishFromInventory: (fishTypeId: string, x: number, y: number) => {
        const fishType = fishTypes.find((item) => item.id === fishTypeId);
        if (!fishType) {
          return;
        }
        if (this.getFishInventory(fishType.id) <= 0) {
          const pendingTankBubble = this.fishDeliveryBubbles?.bubbles.find((pending) => pending.destination === "tank" && pending.type.id === fishType.id);
          if (pendingTankBubble) {
            this.popFishInventoryBubble(pendingTankBubble);
          }
          return;
        }

        const previousBubbleCount = this.fishDeliveryBubbles?.bubbles.length ?? 0;
        this.placeFishWithCompatibility(
          fishType,
          Phaser.Math.Clamp(x, tankBounds.left + 28, tankBounds.right - 28),
          Phaser.Math.Clamp(y, tankBounds.top + 26, tankBounds.bottom - 26)
        );
        const pendingTankBubble = this.fishDeliveryBubbles?.bubbles
          .slice(previousBubbleCount)
          .find((pending) => pending.destination === "tank" && pending.type.id === fishType.id);
        if (pendingTankBubble) {
          this.popFishInventoryBubble(pendingTankBubble);
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
        if (this.coinDrops.length >= maxCoinDrops) {
          return;
        }
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
