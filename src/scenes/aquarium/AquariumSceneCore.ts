import Phaser from "phaser";
import { basicFood, decorationTypes, fishTypes, foodAssetPath, foodTypes, helperCreatureTypes } from "../../data/content";
import {
  gameHeight,
  gameWidth,
  maxRenderScale,
  setTankViewportBoundsFromCanvas,
  setTankWorldScale,
  tankBounds,
  tankViewportBounds,
  toastX,
  toastY
} from "../../game/constants";
import {
  clearStoredDecorationInventory as clearStoredDecorationInventoryModel,
  consumeStoredDecoration as consumeStoredDecorationModel,
  decorationInventoryKey as decorationInventoryKeyModel,
  getDecorationInventory as getDecorationInventoryModel,
  ownedDecorationCount as ownedDecorationCountModel,
  placedDecorationCount as placedDecorationCountModel,
  removeStoredDecorationInventory as removeStoredDecorationInventoryModel,
  sanitizeDecorationSize as sanitizeDecorationSizeModel
} from "../../game/decoration-inventory";
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
  foodDispenserPositionStorageKey,
  foodDispenserPrice,
  legacyFoodDispenserPositionStorageKey,
  loadUtilityPositionY,
  ownedTankUtilityInventoryCards as ownedTankUtilityInventoryCardsModel,
  saveUtilityPositionY,
  tankUtilityInfo as tankUtilityInfoModel,
  type TankUtilityId,
  utilityExpiresAt
} from "../../game/dispenser-system";
import { canAfford, createWallet, earn, formatNumber, formatPrice, formatPriceLong, spend } from "../../game/economy";
import { fishCoinProductionMaxDelayMs, fishCoinProductionMinDelayMs } from "../../game/economy-model";
import {
  activeFishSellValue as activeFishSellValueModel,
  coinSellValue as coinSellValueModel,
  coinWealthValue,
  foodSellValue as foodSellValueModel,
  helperSellPrice as helperSellPriceModel,
  priceWealth as priceWealthModel,
  quantityPrice as quantityPriceModel,
  storedFishSellValue as storedFishSellValueModel
} from "../../game/economy-values";
import {
  coinCollectDetune as coinCollectDetuneModel,
  collectCoin as collectCoinModel,
  commonWealthValueForCoin,
  createCoinDrop as createCoinDropModel,
  registerCoinCombo as registerCoinComboModel,
  resolveCoinCombo as resolveCoinComboModel,
  updateFishCoinProduction as updateFishCoinProductionModel,
  type CoinComboState,
  type CoinDropOptions
} from "../../game/coin-production";
import { FishDeliveryBubbleManager, type PendingFishBubble } from "../../game/fish-delivery-bubbles";
import {
  chooseBreedBabyType as chooseBreedBabyTypeModel,
  findBreedMate as findBreedMateModel
} from "../../game/fish-breeding";
import {
  fusionAgeLabel as fusionAgeLabelModel,
  type FishFusionChances,
  type FishFusionSource
} from "../../game/fish-fusion";
import {
  getStoredFishCount as getStoredFishCountModel,
  removeStoredFish as removeStoredFishModel,
  storeActiveFish as storeActiveFishModel,
  storedFishTypeFromCatalog
} from "../../game/fish-inventory";
import { gameFontFamily } from "../../game/fonts";
import {
  fishProductionThresholdForLevel,
  levelProgressToNext,
  maxDynamicProductionPaceMultiplier,
  rawTankDisplayLevelFromProduction,
  targetActiveHoursForDisplayLevel,
  targetProductionPerMinuteForLevel
} from "../../game/level-progression";
import {
  addPriceToWallet as addPriceToWalletModel,
  clearSelectedMakeupDecoration,
  createMakeupDraft as createMakeupDraftModel,
  cycleMakeupCosmetic as cycleMakeupCosmeticModel,
  cycleMakeupDecorationType as cycleMakeupDecorationTypeModel,
  decorationSizeUpgradePrice as decorationSizeUpgradePriceModel,
  destroyMakeupDraft as destroyMakeupDraftModel,
  makeupDecorationCostEntries as makeupDecorationCostEntriesModel,
  makeupDecorationAtPoint,
  makeupDecorationDisplayDepth,
  makeupPurchaseLines as makeupPurchaseLinesModel,
  makeupSelectedCosmetic as makeupSelectedCosmeticModel,
  makeupTotalCost as makeupTotalCostModel,
  moveMakeupDecoration,
  moveSelectedMakeupDecorationDepth as moveSelectedMakeupDecorationDepthModel,
  priceComponentAmount as priceComponentAmountModel,
  removeSelectedMakeupDecoration as removeSelectedMakeupDecorationModel,
  selectMakeupDecoration as selectMakeupDecorationModel,
  setMakeupBlueTint as setMakeupBlueTintModel,
  setMakeupCosmeticIndex as setMakeupCosmeticIndexModel,
  setMakeupDecorationSize as setMakeupDecorationSizeModel,
  setMakeupDecorationTypeIndex as setMakeupDecorationTypeIndexModel,
  setMakeupSection as setMakeupSectionModel,
  syncMakeupDecorationDepths as syncMakeupDecorationDepthsModel,
  walletToPrice as walletToPriceModel,
  type MakeupDecorationDraft,
  type MakeupDraft,
  type MakeupSection
} from "../../game/makeup-mode";
import { applyMakeupLook as applyMakeupLookModel } from "../../game/makeup-apply";
import { syncMakeupPresentation as syncMakeupPresentationModel } from "../../game/makeup-presentation";
import {
  cappedFoodCountLabel,
  addedFoodBuyQuantity as addedFoodBuyQuantityModel,
  describeFoodInventory as describeFoodInventoryModel,
  feedableFoodTypes,
  foodBuyQuantity as foodBuyQuantityModel,
  foodBuyQuantityRecord as foodBuyQuantityRecordModel,
  foodInventoryRecord as foodInventoryRecordModel,
  foodInventoryBadgeLabel as foodInventoryBadgeLabelModel,
  foodInventoryDisplayCount as foodInventoryDisplayCountModel,
  hiddenFoodTypeIds,
  isCalorieTrackedFood as isCalorieTrackedFoodModel,
  isDroppableFood as isDroppableFoodModel,
  setFoodBuyQuantityValue,
  ageBoostFoodTypeId,
  timeCurrentFoodTypeId,
  totalFeedableFoodInventory as totalFeedableFoodInventoryModel
} from "../../game/food-system";
import {
  buildInventoryCategoryItems,
  buildInventoryDockItems,
  clampInventoryDockPage,
  inventoryDockItemKey as inventoryDockItemKeyModel,
  inventoryDockPageCount,
  inventoryDockPageItems,
  pageForInventoryDockItem,
  type InventoryDockItem
} from "../../game/inventory-dock";
import {
  coinInventoryRowData,
  compactDurationLabel as compactDurationLabelModel,
  decorationInventoryRowData,
  fishHappinessPercent as fishHappinessPercentModel,
  foodInventoryRowData,
  ownedDecorationEntries,
  ownedFoodTypes,
  storedFishInventoryRowData,
  storedFishTypes
} from "../../game/inventory-page";
import {
  clearSave,
  createEmptyWallet,
  mapToRecord,
  type OfflineProgress,
  type SavedGame
} from "../../game/save";
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
} from "../../game/tank-state";
import { tankAccentColor as tankAccentColorModel, tankSummary as tankSummaryModel } from "../../game/tank-inventory";
import { calculateTankNetWorth as calculateTankNetWorthModel } from "../../game/tank-wealth";
import {
  defaultDecorationDepth,
  fitDecorationDisplay as fitDecorationDisplayModel,
  moveDecorationWithinTank,
  randomFishPlacement as randomFishPlacementModel,
  tankDecorationDepthFromOrder as tankDecorationDepthFromOrderModel
} from "../../game/tank-placement";
import {
  aquariumBackgroundAssetPath,
  aquariumBackgroundTextureKey,
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
  type DecorationSize,
  type TankCosmetic
} from "../../game/tank-catalog";
import type { PlacedDecoration } from "../../game/tank-entities";
import { createFallbackTextures } from "../../game/texture-fallbacks";
import {
  fishFoodTintFor,
  rarityForPrice as rarityForPriceModel,
  rarityIconPath as rarityIconPathModel,
  rarityLabel as rarityLabelModel,
  rarityStarsLabel as rarityStarsLabelModel
} from "../../game/visuals";
import {
  decorationAtTankPoint,
  nearestFishAtTankPoint
} from "../../input/tank-hit-testing";
import {
  bindTankSideToolDrag as bindTankSideToolDragInput,
  startHtmlPointerDrag,
  type HtmlDragCleanup
} from "../../input/html-drag";
import { installAquariumNativeCanvasInputFallback } from "../../input/aquarium-native-canvas-input-adapter";
import { handleTankPointer as handleTankPointerInput } from "../../input/tank-pointer";
import {
  buildDailyQuestItems,
  coinQuestReward,
  dailyQuestActionCount as questActionCount,
  ensureActiveDailyQuestItems as ensureActiveDailyQuestItemsModel,
  formatDailyQuestReward,
  fishPurchaseWindowMs,
  growthTonicPurchaseWindowMs,
  isRewardedAdReady,
  normalizeDailyGoals as normalizeDailyGoalsModel,
  oldestRecentFishPurchase,
  oldestRecentGrowthTonicPurchase,
  oldestRecentProductionBoostPurchase,
  oldestRecentTimeCurrentPurchase,
  productionBoostPurchaseWindowMs,
  rareQuestReward as questRareReward,
  recentFishPurchaseCount as questRecentFishPurchaseCount,
  recentGrowthTonicPurchaseCount as questRecentGrowthTonicPurchaseCount,
  recentProductionBoostPurchaseCount as questRecentProductionBoostPurchaseCount,
  recentTimeCurrentPurchaseCount as questRecentTimeCurrentPurchaseCount,
  recordDailyQuestAction as recordDailyQuestActionModel,
  recordFishPurchase as recordFishPurchaseModel,
  recordGrowthTonicPurchase as recordGrowthTonicPurchaseModel,
  recordProductionBoostPurchase as recordProductionBoostPurchaseModel,
  recordTimeCurrentPurchase as recordTimeCurrentPurchaseModel,
  rewardedAdCoinReward as questRewardedAdCoinReward,
  rewardedAdCooldownMs,
  rewardedAdDurationMs,
  rewardedAdRemainingSeconds,
  superRareQuestReward as questSuperRareReward,
  timeCurrentPurchaseWindowMs,
  todayFishPurchaseCount as questTodayFishPurchaseCount,
  visibleDailyQuestItems as visibleDailyQuestItemsModel,
  type DailyGoalsState,
  type DailyQuestItem,
  type DailyQuestReward,
  type RewardedAdKind,
  type RewardedAdOption,
  type RewardedAdState
} from "../../game/quest-system";
import {
  buildRewardedAdRewardSet,
  rewardedAdOptionsForRewards,
  selectRewardedAdFishReward,
  selectRewardedAdFoodReward,
  selectRewardedAdHelperReward
} from "../../game/rewarded-ad-rewards";
import {
  createDefaultPrizeMachineState,
  type PrizeMachineBetAmount,
  type PrizeMachineState
} from "../../game/prize-machine";
import {
  prizeWheelIconTextureKeys
} from "../../game/prize-machine-wheel";
import {
  matchesStoreCoinFilter as matchesStoreCoinFilterModel,
  visibleDecorationCatalog as visibleDecorationCatalogModel,
  visibleFishCatalog as visibleFishCatalogModel,
  visibleFoodCatalog as visibleFoodCatalogModel,
  visibleHelperCreatureCatalog as visibleHelperCreatureCatalogModel,
  visibleStoreCatalogCount as visibleStoreCatalogCountModel,
  visibleSupplyCatalog as visibleSupplyCatalogModel,
  visibleTankCatalogLevels as visibleTankCatalogLevelsModel
} from "../../game/store-catalog";
import {
  clampSellQuantity,
  decorationSaleValue as decorationSaleValueModel,
  planCoinInventorySale,
  planFoodInventorySale,
  planStoredFishSale,
  utilitySaleValue
} from "../../game/store-transactions";
import {
  addStoredFishAge as addStoredFishAgeModel,
  setStoredFishAges as setStoredFishAgesModel,
  storedFishAgesFor as storedFishAgesForModel,
  takeStoredFishAge as takeStoredFishAgeModel
} from "../../game/stored-fish-ages";
import { CoinDrop, coinTextureKeyByType, coinVisualsByType } from "../../objects/CoinDrop";
import { Fish } from "../../objects/Fish";
import { FoodPellet } from "../../objects/FoodPellet";
import { HelperCreature } from "../../objects/HelperCreature";
import {
  createPageOverlayRoot,
  createPageShellContent,
  hidePageOverlay,
  pageScreenMeta as buildPageScreenMeta,
  syncPageOverlay,
  type PageButtonFactory,
  type PageOverlayScreen,
  type PageScreenMeta
} from "../../ui/PageOverlay";
import { appendAlbumPage as appendAlbumPageView, createFishAlbumRow, createInventoryCategoryGrid as createInventoryCategoryGridView } from "../../ui/AlbumPage";
import {
  appendInventoryItemSection,
  createCoinInventoryRow as createCoinInventoryRowView,
  createDecorationInventoryRow as createDecorationInventoryRowView,
  createFoodInventoryRow as createFoodInventoryRowView,
  createStoredFishInventoryRow as createStoredFishInventoryRowView
} from "../../ui/InventoryRows";
import { appendMainMenuPage as appendMainMenuPageView, createDrillMenuCard as createDrillMenuCardView } from "../../ui/MainMenuPage";
import { createMakeupPanel as createMakeupPanelView, type MakeupPanelResult } from "../../ui/MakeupPanel";
import {
  createMakeupOverlay as createMakeupOverlayView,
  positionMakeupDecorationSettings,
  syncMakeupOverlay as syncMakeupOverlayView
} from "../../ui/MakeupOverlay";
import { createCommonCoinValueRow, createMakeupCostElement, createPriceIconRow, createWalletIconRow } from "../../ui/PriceRows";
import { appendGoalsPageContent } from "../../ui/GoalsPage";
import { createLevelCompletionRewardShell, createPrizeCelebrationShell } from "../../ui/RewardModals";
import { createRewardedAdModalView, syncRewardedAdModalView } from "../../ui/RewardedAdFlow";
import {
  createActiveFishSellConfirmationContent,
  createCoinSellConfirmationContent,
  createDecorationSellConfirmationContent,
  createFoodSellConfirmationContent,
  createHelperSellConfirmationContent,
  createOfflineSummaryContent,
  createResetConfirmationModalContent,
  createStarterProtectedSellModalContent,
  createStoredFishSellConfirmationContent,
  createTankUtilitySellConfirmationContent,
  type ModalContent
} from "../../ui/SellConfirmationModals";
import { appendSettingsPageContent } from "../../ui/SettingsPage";
import { StoreOverlay, type StoreOverlayState } from "../../ui/StoreOverlay";
import {
  createFoodDragGhost as createFoodDragGhostView,
  createHtmlFoodDock as createHtmlFoodDockView,
  createHtmlHudOverlay as createHtmlHudOverlayView,
  createHtmlInventoryDockButton as createHtmlInventoryDockButtonView,
  createInventoryDockPager as createInventoryDockPagerView,
  createTankMenuOverlay as createTankMenuOverlayView
} from "../../ui/TankHudOverlay";
import {
  appendTankInventoryTabContent,
  createDecorationInventoryCard,
  createTankCosmeticInventoryCard,
  createTankLevelInventoryCard,
  createTankUtilityInventoryCard
} from "../../ui/TankInventoryCards";
import { createHtmlButton, htmlElement, htmlImage, shouldSuppressHtmlClick } from "../../ui/dom";
import { createModalShell, type ModalAction } from "../../ui/modal";
import type { AquariumTestSnapshot } from "../../test/aquarium-test-api";
import { installAquariumTestHooks } from "../../test/aquarium-test-hooks";
import type { CoinType, DecorationType, FishGender, FishState, FishType, FoodType, FoodTypeId, HelperCreatureType, Price, Rarity, StoreTab, Wallet } from "../../types/mechanics";
import { ShellBalanceScene, ShellBalanceSceneKey, type ShellBalanceResult } from "../ShellBalanceScene";
import {
  algaeParticleThreshold,
  algaeParticleTintColor,
  automatedCoinCollectFeeRate,
  autoFoodBuyerDurationMs,
  backgroundMusicKey,
  backgroundMusicPath,
  cleanBubbleTintColor,
  coinAssetPathByType,
  coinCollectSoundKey,
  coinCollectSoundPath,
  coinComboMaxCount,
  coinComboMaxProductionMultiplier,
  coinComboRewardPercentPerCount,
  coinComboRewardTextDurationMs,
  coinGlowAssetPath,
  coinGlowTextureKey,
  coinMagnetAttractDurationMs,
  coinMagnetAttractScale,
  coinMagnetDurationMs,
  coinMagnetRayYOffset,
  decorationTrashZone,
  dirtyTankOverlayMaxAlpha,
  dirtyTankOverlayThreshold,
  dirtyTankTintColor,
  fishEatSoundKey,
  fishEatSoundPath,
  fishHungrySoundKey,
  fishHungrySoundPath,
  fishMenuIconAssetPath,
  foodDockTopBelowMenu,
  hudIconAssetPathByKey,
  hudTopAssetPathByKey,
  inventoryDockPageSize,
  maxActiveFishPerTank,
  maxCoinDrops,
  maxFishCatalogLevel,
  maxFoodBuyQuantity,
  maxFoodDrops,
  maxHelperCreatures,
  maxOwnedTanks,
  menuIconAssetPathByKey,
  overfullHungerFloor,
  prizeHighlightSoundPath,
  prizeRewardSoundPath,
  storeTankNames,
  storeTankStarterWallets,
  tankCosmeticBlueTintColor,
  tankFallbackBaseColor,
  tankMenuButtonY,
  tankMenuVersion,
  tankUpgradePrices,
  timeCurrentDurationSeconds,
  timeCurrentSpeedMultiplier,
  type AdjustableSound,
  type AppScreen,
  type CompatibilitySummary,
  type FishFusionPageResult,
  type InventoryTab,
  type PendingHelperCreatureDrop,
  type PlacementMode,
  type TankMenuTab
} from "./aquarium-scene-config";
import { preloadAquariumSceneAssets } from "./aquarium-scene-assets";
import { createAquariumWorld } from "./aquarium-scene-world";
import {
  applyAquariumSceneOfflineProgress,
  restoreAquariumSceneSave,
  saveAquariumSceneNow
} from "./aquarium-scene-persistence";
import { AquariumEntityController } from "./aquarium-entity-controller";
import { createAquariumEntityControllerAdapter } from "./aquarium-entity-adapter";
import {
  executeDecorationPurchase,
  executeHelperCreaturePurchase,
  executeTankCosmeticPurchase,
  executeTankCosmeticUse
} from "./aquarium-scene-store-purchases";
import { AquariumSceneStoreController } from "./aquarium-scene-store-controller";
import { createAquariumStoreAdapter } from "./aquarium-store-adapter";
import { runAquariumSceneUpdate } from "./aquarium-scene-update-loop";
import { AquariumPrizeController } from "./aquarium-prize-controller";
import { createAquariumPrizeControllerHost } from "./aquarium-prize-adapter";
import { createAquariumFusionAdapter } from "./aquarium-fusion-adapter";
import { AquariumTextureLoader } from "./aquarium-texture-loader";
import { AquariumFoodController } from "./aquarium-food-controller";
import { createAquariumFoodControllerHost } from "./aquarium-food-adapter";
import { AquariumCareController, createAquariumCareControllerAdapter } from "./aquarium-care-controller";

type LevelCompletionBonusReward = {
  coins?: Price;
  background?: TankCosmetic;
  seabed?: TankCosmetic;
  decoration?: {
    decorationType: DecorationType;
    size: DecorationSize;
  };
};

export class AquariumSceneCore extends Phaser.Scene {
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
  private aquariumEntityController?: AquariumEntityController;
  private aquariumFoodRuntimeController?: AquariumFoodController;
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
  private dailyQuestPlaytimeSeconds = 0;
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
  private timeCurrentElement?: HTMLDivElement;
  private timeCurrentText?: HTMLSpanElement;
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
  private htmlFoodDragCleanup?: HtmlDragCleanup;
  private htmlDockDragging = false;
  private magnetCollectingCoins = new Set<CoinDrop>();
  private coinMagnetPreviousCoinY = new Map<CoinDrop, number>();
  private coinMagnetWasActive = false;
  private coinMagnetDisplayedMinutes = 0;
  private autoFoodBuyerWasActive = false;
  private autoFoodBuyerDisplayedMinutes = 0;
  private tankMenuOverlay?: HTMLDivElement;
  private tankMenuOverlayStateKey = "";
  private htmlPageOverlay?: HTMLDivElement;
  private htmlPageOverlayScrollTop = 0;
  private htmlPageOverlayRenderKey = "";
  private storeOverlay?: StoreOverlay;
  private storeController?: AquariumSceneStoreController;
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
  private viewportResizeCleanup?: () => void;
  private nativeDraggedFish?: Fish;
  private nativeDraggedDecoration?: PlacedDecoration;
  private phaserDraggedDecoration?: PlacedDecoration;
  private careController?: AquariumCareController;
  private textureLoader = new AquariumTextureLoader(this, (fishType) => this.createFishAnimation(fishType));
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
    preloadAquariumSceneAssets(this, (foodTypeId) => this.foodTextureKey(foodTypeId));
  }

  public create(): void {
    this.refreshVisibleTankViewport();
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
    this.installViewportResizeHandling();
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
    runAquariumSceneUpdate(this, delta);
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
    const world = createAquariumWorld(this, {
      createTankBackground: () => this.createTankBackground(),
      createTankFloor: () => this.createTankFloor(),
      createDirtyTankOverlay: () => this.createDirtyTankOverlay(),
      styleAmbientWaterParticle: (particle, randomizeSize) => this.styleAmbientWaterParticle(particle, randomizeSize)
    });
    this.tankLayer = world.tankLayer;
    this.tankBackground = world.tankBackground;
    this.tankBackgroundBlueTintOverlay = world.tankBackgroundBlueTintOverlay;
    this.tankSand = world.tankSand;
    this.dirtyTankOverlay = world.dirtyTankOverlay;
    this.coinMagnetRay = world.coinMagnetRay;
    this.ambientWaterParticles.push(...world.ambientWaterParticles);
    this.applyTankViewScale();
    this.layoutTankFloor();
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
    return nearestFishAtTankPoint({
      fish: this.activeFish(),
      x,
      y,
      tankViewScale: this.tankViewScaleForLevel(),
      minimumRadius: 44,
      widthFactor: 0.52,
      heightFactor: 0.72
    });
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
    return this.textureLoader.ensureTextureLoaded(textureKey, assetPath, onLoad);
  }

  private ensureFishTexturesLoaded(fishType: FishType, onLoad?: () => void): boolean {
    return this.textureLoader.ensureFishTexturesLoaded(fishType, onLoad);
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
    this.refreshVisibleTankViewport();
    this.layoutTankBackground();
    this.layoutTankFloor();
    this.refreshTankScaledDropSizes();
  }

  private installViewportResizeHandling(): void {
    if (this.viewportResizeCleanup) {
      return;
    }

    const handleResize = () => this.time.delayedCall(0, () => this.handleViewportResize());
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("scroll", handleResize);
    this.scale.on(Phaser.Scale.Events.RESIZE, handleResize);
    this.viewportResizeCleanup = () => {
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("scroll", handleResize);
      this.scale.off(Phaser.Scale.Events.RESIZE, handleResize);
    };
  }

  private handleViewportResize(): void {
    this.refreshVisibleTankViewport();
    this.configureCameraForHighDpi();
    this.layoutTankBackground();
    this.layoutTankFloor();
    this.updateDirtyTankOverlay();
    this.syncFoodDockPosition();
    this.syncFoodDispenserPosition();
    this.syncCoinMagnetPosition();
    this.syncAutoFoodBuyerPosition();
    this.fitCoinDropsToVisibleViewport();
    this.refreshTankScaledDropSizes();
  }

  private refreshVisibleTankViewport(): void {
    setTankViewportBoundsFromCanvas(this.game.canvas);
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
    this.refreshVisibleTankViewport();
    return Phaser.Math.Clamp(tankViewportBounds.bottom, tankBounds.top, tankBounds.bottom);
  }

  private screenToTankPoint(x: number, y: number): Phaser.Math.Vector2 {
    const scale = this.tankViewScaleForLevel();
    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp((x - this.tankLayer.x) / scale, tankViewportBounds.left, tankViewportBounds.right),
      Phaser.Math.Clamp((y - this.tankLayer.y) / scale, tankViewportBounds.top, tankViewportBounds.bottom)
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

  private fitCoinDropsToVisibleViewport(): void {
    const maxBottomY = this.visibleCoinBottomDesignY();
    this.coinDrops.forEach((coin) => coin.fitWithinVisibleBounds(tankViewportBounds, maxBottomY));
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

    const nextStateKey = `${tankMenuVersion}:${this.shouldShowCleanlinessWarning()}:${this.dailyGoalUnclaimedCount()}`;
    if (this.tankMenuOverlay && (this.tankMenuOverlay.dataset.version !== tankMenuVersion || this.tankMenuOverlayStateKey !== nextStateKey)) {
      this.destroyTankMenuOverlay();
    }
    this.tankMenuOverlay ??= this.createTankMenuOverlay();
    this.tankMenuOverlayStateKey = nextStateKey;
    this.tankMenuOverlay.classList.remove("hidden");
  }

  private createTankMenuOverlay(): HTMLDivElement {
    const overlay = createTankMenuOverlayView({
      version: tankMenuVersion,
      tankDirty: this.shouldShowCleanlinessWarning(),
      designHeight: gameHeight,
      items: [
        {
          id: "menu",
          label: "Menu",
          y: tankMenuButtonY,
          icon: menuIconAssetPathByKey["ui-menu"],
          onClick: () => this.openScreen("menu")
        },
        {
          id: "goals",
          label: "Quest",
          y: tankMenuButtonY + 86,
          icon: menuIconAssetPathByKey["ui-goals"],
          badge: this.dailyGoalUnclaimedCount() > 0 ? this.foodBadgeLabel(this.dailyGoalUnclaimedCount()) : undefined,
          onClick: () => this.openScreen("goals")
        }
      ],
      attachTouchFeedback: (element, releaseOnLeave) => this.attachTouchFeedback(element, releaseOnLeave)
    });
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
    this.syncTimeCurrentIndicator();
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
    const hud = createHtmlHudOverlayView({
      coinMagnetIconPath,
      autoFoodBuyerIconPath: autoFoodBuyerAssetPath,
      foodDispenserIconPath: foodDispenserAssetPath,
      timeCurrentIconPath: foodAssetPath(timeCurrentFoodTypeId),
      attachTouchFeedback: (element, releaseOnLeave) => this.attachTouchFeedback(element, releaseOnLeave),
      prepareInfoTarget: (element, title, lines) => this.prepareHudInfoTarget(element, title, lines),
      bindCoinMagnetDrag: (element) => this.bindCoinMagnetDrag(element),
      bindAutoFoodBuyerDrag: (element) => this.bindAutoFoodBuyerDrag(element),
      bindFoodDispenserDrag: (element) => this.bindFoodDispenserDrag(element)
    });
    this.gameHudLevelText = hud.levelText;
    this.gameHudCommonText = hud.commonText;
    this.gameHudRareText = hud.rareText;
    this.gameHudSuperRareText = hud.superRareText;
    this.timeCurrentElement = hud.timeCurrentElement;
    this.timeCurrentText = hud.timeCurrentText;
    this.coinMagnetElement = hud.coinMagnetElement;
    this.coinMagnetText = hud.coinMagnetText;
    this.autoFoodBuyerElement = hud.autoFoodBuyerElement;
    this.autoFoodBuyerText = hud.autoFoodBuyerText;
    this.foodDispenserElement = hud.foodDispenserElement;
    this.foodDispenserText = hud.foodDispenserText;
    document.body.appendChild(hud.overlay);
    return hud.overlay;
  }

  private syncTimeCurrentIndicator(): void {
    if (!this.timeCurrentElement || !this.timeCurrentText) {
      return;
    }

    const remainingSeconds = this.timeCurrentRemainingSeconds();
    if (remainingSeconds <= 0) {
      this.timeCurrentElement.classList.add("hidden");
      this.timeCurrentText.textContent = "";
      return;
    }

    this.timeCurrentElement.classList.remove("hidden");
    this.timeCurrentText.textContent = compactDurationLabelModel(remainingSeconds, formatNumber);
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
    bindTankSideToolDragInput(element, {
      isEnabled: () => this.activeScreen === "tank",
      getY: handlers.getY,
      setY: handlers.setY,
      syncPosition: handlers.syncPosition,
      savePosition: handlers.savePosition,
      minY: () => this.foodDispenserMinY(),
      maxY: () => this.foodDispenserMaxY(),
      designHeight: gameHeight,
      getCanvasRect: () => this.game.canvas.getBoundingClientRect()
    });
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
    return createInventoryDockPagerView({
      page: this.inventoryDockPage,
      pageCount,
      attachTouchFeedback: (element, releaseOnLeave) => this.attachTouchFeedback(element, releaseOnLeave),
      shouldSuppressClick: () => shouldSuppressHtmlClick(),
      onPrevious: () => {
        this.inventoryDockPage = (this.inventoryDockPage - 1 + pageCount) % pageCount;
        this.syncHtmlFoodDock();
      },
      onNext: () => {
        this.inventoryDockPage = (this.inventoryDockPage + 1) % pageCount;
        this.syncHtmlFoodDock();
      }
    });
  }

  private syncFoodDockPosition(): void {
    if (!this.htmlFoodDock || this.activeScreen !== "tank") {
      return;
    }

    this.htmlFoodDock.style.setProperty("--food-dock-top", `${foodDockTopBelowMenu}px`);
  }

  private createHtmlFoodDock(): HTMLDivElement {
    const dock = createHtmlFoodDockView();
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
    const badgeLabel = item.kind === "food" ? item.badgeLabel ?? this.foodBadgeLabel(item.count) : this.foodBadgeLabel(item.count);
    return createHtmlInventoryDockButtonView({
      item,
      badgeLabel,
      attachTouchFeedback: (element, releaseOnLeave) => this.attachTouchFeedback(element, releaseOnLeave),
      onFishMenuClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.openFishInventory();
      },
      onStartDrag: (event, dockItem) => this.startHtmlInventoryDrag(event, dockItem)
    });
  }

  private startHtmlInventoryDrag(event: PointerEvent, item: InventoryDockItem): void {
    startHtmlPointerDrag({
      event,
      createGhost: () => createFoodDragGhostView(item),
      cancelActiveDrag: () => this.cancelHtmlFoodDrag(),
      setDragging: (dragging) => {
        this.htmlDockDragging = dragging;
      },
      onStart: () => {
        if (item.kind === "food" && this.isDroppableFood(item.id)) {
          this.selectedFoodTypeId = item.id;
        }
      },
      onMove: (clientX, clientY) => {
        if (item.kind === "utility" && item.id === "coin-magnet") {
          this.useCoinMagnetAtClientPoint(clientX, clientY, false);
        }
      },
      onDrop: (clientX, clientY) => {
        const point = this.clientPointToDesignPoint(clientX, clientY);
        if (!point || !tankViewportBounds.contains(point.x, point.y)) {
          return;
        }
        const tankPoint = this.screenToTankPoint(point.x, point.y);
        this.placeDockItemAt(item, tankPoint.x, tankPoint.y);
      },
      registerCleanup: (cleanup) => {
        this.htmlFoodDragCleanup = cleanup;
      },
      onCleanup: (cleanup) => {
        if (this.htmlFoodDragCleanup === cleanup) {
          this.htmlFoodDragCleanup = undefined;
        }
      }
    });
  }

  private placeDockItemAt(item: InventoryDockItem, x: number, y: number): void {
    if (item.kind === "food") {
      if (item.id === timeCurrentFoodTypeId) {
        this.useTimeCurrentBoost();
        return;
      }
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

  private cancelHtmlFoodDrag(): void {
    const cleanup = this.htmlFoodDragCleanup;
    this.htmlFoodDragCleanup = undefined;
    cleanup?.();
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
    this.tankMenuOverlayStateKey = "";
  }

  private destroyHtmlGameInterface(): void {
    this.viewportResizeCleanup?.();
    this.viewportResizeCleanup = undefined;
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
    const returnToMainMenu = closingScreen !== "tank" && closingScreen !== "menu" && closingScreen !== "goals";
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
    const timeCurrentAvailable = this.canBuyTimeCurrentNow();
    const fishAvailable = this.canBuyAnotherFishThisHour();
    const cooldownKey = [
      ageBoostAvailable,
      productionBoostAvailable,
      timeCurrentAvailable,
      this.timeCurrentPurchaseRestockLabel(),
      this.getFoodInventory(timeCurrentFoodTypeId),
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
    this.aquariumFoodController().updateTimedUtilities();
  }

  private storeOverlayState(): StoreOverlayState {
    return this.aquariumStoreController().storeOverlayState();
  }

  private aquariumStoreController(): AquariumSceneStoreController {
    this.storeController ??= new AquariumSceneStoreController(
      createAquariumStoreAdapter(this as unknown as Parameters<typeof createAquariumStoreAdapter>[0])
    );
    return this.storeController;
  }

  private aquariumCareController(): AquariumCareController {
    this.careController ??= createAquariumCareControllerAdapter(this);
    return this.careController;
  }

  private aquariumFoodController(): AquariumFoodController {
    this.aquariumFoodRuntimeController ??= new AquariumFoodController(createAquariumFoodControllerHost(this));
    return this.aquariumFoodRuntimeController;
  }

  private renderTabControls(): void {
    this.syncHtmlPageOverlay();
  }

  private hideHtmlPageOverlay(): void {
    hidePageOverlay(this.htmlPageOverlay);
  }

  private createHtmlPageOverlay(): HTMLDivElement {
    return createPageOverlayRoot();
  }

  private syncHtmlPageOverlay(): void {
    const result = syncPageOverlay({
      activeScreen: this.activeScreen,
      overlay: this.htmlPageOverlay,
      renderKey: this.htmlPageOverlayRenderKey,
      scrollTop: this.htmlPageOverlayScrollTop,
      reducedMotion: this.settings.reducedMotion,
      createOverlay: () => this.createHtmlPageOverlay(),
      createPage: () => this.createHtmlPage(),
      getRenderKey: () => this.htmlPageOverlayKey()
    });
    this.htmlPageOverlay = result.overlay;
    this.htmlPageOverlayRenderKey = result.renderKey;
    this.htmlPageOverlayScrollTop = result.scrollTop;
  }

  private createHtmlPage(): HTMLElement {
    return createPageShellContent({
      activeScreen: this.activeScreen as PageOverlayScreen,
      meta: this.pageScreenMeta(),
      closeButton: this.htmlButton("X CLOSE", "aq-page-close", () => this.closePage()),
      appendMainMenuPage: (content) => this.appendMainMenuPage(content),
      appendGamesPage: (content) => this.appendGamesPage(content),
      appendAlbumPage: (content) => this.appendAlbumPage(content),
      appendGoalsPage: (content) => this.appendGoalsPage(content),
      appendSettingsPage: (content) => this.appendSettingsPage(content)
    });
  }

  private htmlPageOverlayKey(): string {
    return `${this.activeScreen}:${this.tankMenuTab}:${this.tankMenuDrillOpen}:${this.tankMenuPage}:${this.inventoryTab}:${this.inventoryDrillOpen}`;
  }

  private appendMainMenuPage(content: HTMLElement): void {
    const items: Array<{ id: string; label: string; icon: string; action: () => void; badge?: string }> = [
      { id: "shop", label: "Shop", icon: menuIconAssetPathByKey["ui-shop"], action: () => this.openScreen("store") },
      { id: "games", label: "Games", icon: menuIconAssetPathByKey["ui-game"], action: () => this.openScreen("games") },
      { id: "album", label: "Inventory", icon: menuIconAssetPathByKey["ui-book"], action: () => this.openScreen("album") },
      { id: "tanks", label: "Customize Tank", icon: menuIconAssetPathByKey["ui-tanks"], action: () => this.openMakeupMode() },
      { id: "goals", label: "Quest", icon: menuIconAssetPathByKey["ui-goals"], action: () => this.openScreen("goals"), badge: this.dailyGoalUnclaimedCount() > 0 ? this.foodBadgeLabel(this.dailyGoalUnclaimedCount()) : undefined },
      { id: "settings", label: "Settings", icon: menuIconAssetPathByKey["ui-settings"], action: () => this.openScreen("settings") }
    ];
    const statusItems: Array<{ icon: string; label: string; value: string; action?: () => void; badge?: string }> = [
      { icon: hudIconAssetPathByKey["ui-icon-total-wealth"], label: "Wealth", value: formatNumber(this.calculateTankNetWorth()) },
      { icon: hudIconAssetPathByKey["ui-icon-food-status"], label: "Food", value: formatNumber(this.getTotalFoodInventory()) },
      { icon: hudIconAssetPathByKey["ui-icon-clean-status"], label: "Clean", value: this.cleaningTank ? "Cleaning" : `${formatNumber(Math.round(this.cleanliness))}%`, action: () => this.cleanTank(), badge: this.shouldShowCleanlinessWarning() ? "!" : undefined },
      { icon: hudIconAssetPathByKey["ui-icon-happy-status"], label: "Happy", value: `${formatNumber(Math.round(this.calculateTankHappiness()))}%` },
      { icon: hudIconAssetPathByKey["ui-icon-time-status"], label: "Time", value: this.gameTimeLabel() }
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

  private appendGamesPage(content: HTMLElement): void {
    const grid = htmlElement("div", "aq-main-menu-grid");
    grid.append(
      this.createDrillMenuCard(
        menuIconAssetPathByKey["ui-game"],
        "Treasure Spin",
        "Spin for fish, coins, helpers, and supplies.",
        () => this.openPrizeMachineArcade()
      ),
      this.createDrillMenuCard(
        menuIconAssetPathByKey["ui-game"],
        "Fish Stack",
        "Stack fish and balance the tower for rewards.",
        () => this.openShellBalanceGame()
      )
    );
    content.append(grid);
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
    appendTankInventoryTabContent({
      content,
      backgrounds: this.tankCosmetics("background")
        .filter((asset) => this.ownsTankCosmetic(asset))
        .map((asset) => this.createCosmeticHtmlCard(asset)),
      seabeds: this.tankCosmetics("seabed")
        .filter((asset) => this.ownsTankCosmetic(asset))
        .map((asset) => this.createCosmeticHtmlCard(asset)),
      decorations: decorationTypes
        .filter((decorationType) => decorationSizeOrder.some((size) => this.getOwnedDecorationCount(decorationType.id, size) > 0))
        .map((decorationType) => this.createDecorationHtmlCard(decorationType)),
      tools: this.ownedTankUtilityCards()
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
    const draft = createMakeupDraftModel({
      backgroundIndex,
      seabedIndex,
      backgroundTintById: new Map(this.tankCosmeticBlueTintInventory("background")),
      seabedTintById: new Map(this.tankCosmeticBlueTintInventory("seabed"))
    });
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
    this.makeupOverlay = syncMakeupOverlayView({
      active: this.activeScreen === "makeup" && Boolean(this.makeupDraft),
      overlay: this.makeupOverlay,
      createOverlay: () => this.createMakeupOverlay(),
      createPanel: () => this.createMakeupPanel(),
      setDecorationSettingsElement: (element) => {
        this.makeupDecorationSettingsElement = element;
      },
      updateDecorationSettingsPosition: () => this.updateMakeupDecorationSettingsPosition()
    });
  }

  private createMakeupOverlay(): HTMLDivElement {
    return createMakeupOverlayView(() => this.handleMakeupOutsidePointerDown());
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
    if (!setMakeupSectionModel(this.makeupDraft, section)) {
      return;
    }

    this.syncMakeupOverlay();
  }

  private updateMakeupDecorationSettingsPosition(): void {
    const draft = this.makeupDraft;
    const selectedDecorationIndex = draft?.selectedDecorationIndex;
    const selectedDecoration = selectedDecorationIndex !== undefined ? draft?.decorations[selectedDecorationIndex] : undefined;
    positionMakeupDecorationSettings({
      settings: this.makeupDecorationSettingsElement,
      selectedTankPoint: selectedDecoration ? { x: selectedDecoration.x, y: selectedDecoration.y } : undefined,
      tankToScreenPoint: (x, y) => this.tankToScreenPoint(x, y),
      gameWidth,
      gameHeight
    });
  }

  private handleMakeupOutsidePointerDown(): void {
    if (this.activeScreen !== "makeup" || this.makeupDraggedDecoration || this.makeupDraft?.section !== "decor" || this.makeupDraft.selectedDecorationIndex === undefined) {
      return;
    }

    clearSelectedMakeupDecoration(this.makeupDraft);
    this.makeupDecorationSettingsElement = undefined;
    this.syncMakeupOverlay();
  }

  private makeupSelectedCosmetic(category: TankCosmeticCategory): TankCosmetic {
    return makeupSelectedCosmeticModel(this.makeupDraft, category, this.tankCosmetics(category));
  }

  private setMakeupCosmeticIndex(category: TankCosmeticCategory, index: number, restoreScrollLeft?: number): void {
    const cosmetics = this.tankCosmetics(category);
    if (!setMakeupCosmeticIndexModel({ draft: this.makeupDraft, category, index, cosmetics })) {
      return;
    }

    if (category === "background") {
      this.makeupBackgroundScrollLeft = restoreScrollLeft ?? this.makeupBackgroundScrollLeft;
      this.layoutTankBackground();
    } else {
      this.layoutTankFloor();
    }
    this.syncMakeupOverlay();
  }

  private cycleMakeupCosmetic(category: TankCosmeticCategory, direction: number): void {
    const cosmetics = this.tankCosmetics(category);
    if (!cycleMakeupCosmeticModel({ draft: this.makeupDraft, category, direction, cosmetics })) {
      return;
    }

    if (category === "background") {
      this.layoutTankBackground();
    } else {
      this.layoutTankFloor();
    }
    this.syncMakeupOverlay();
  }

  private setMakeupBlueTint(category: TankCosmeticCategory, intensity: number): void {
    const selectedAsset = this.makeupSelectedCosmetic(category);
    if (!setMakeupBlueTintModel({ draft: this.makeupDraft, category, selectedAssetId: selectedAsset.id, intensity })) {
      return;
    }

    if (category === "background") {
      this.layoutTankBackground();
    } else {
      this.layoutTankFloor();
    }
  }

  private cycleMakeupDecoration(direction: number): void {
    if (!cycleMakeupDecorationTypeModel({ draft: this.makeupDraft, direction, decorationTypeCount: decorationTypes.length })) {
      return;
    }

    this.syncMakeupOverlay();
  }

  private setMakeupDecorationTypeIndex(index: number, restoreScrollLeft = this.makeupDecorScrollLeft): void {
    if (!setMakeupDecorationTypeIndexModel({ draft: this.makeupDraft, index, decorationTypeCount: decorationTypes.length })) {
      return;
    }

    this.makeupDecorScrollLeft = restoreScrollLeft;
    this.syncMakeupOverlay();
  }

  private setMakeupDecorationSize(size: DecorationSize): void {
    const selectedDecoration = setMakeupDecorationSizeModel({ draft: this.makeupDraft, size });
    if (!this.makeupDraft) {
      return;
    }
    if (selectedDecoration) {
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
    const image = this.add.image(x, y, decoration.texture).setDepth(makeupDecorationDisplayDepth(depth)).setAlpha(0.9);
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
    if (selectMakeupDecorationModel({ draft: this.makeupDraft, decoration })) {
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
    moveMakeupDecoration({
      decoration: this.makeupDraggedDecoration,
      x: tankPoint.x,
      y: tankPoint.y,
      minX: tankBounds.left + 24,
      maxX: tankBounds.right - 24,
      minY: tankBounds.top + 118,
      maxY: tankBounds.bottom - 30
    });
    this.updateMakeupDecorationSettingsPosition();
  }

  private makeupDecorationAtPointer(designX: number, designY: number): MakeupDecorationDraft | undefined {
    if (this.activeScreen !== "makeup") {
      return undefined;
    }

    const tankPoint = this.screenToTankPoint(designX, designY);
    return makeupDecorationAtPoint({
      draft: this.makeupDraft,
      tankX: tankPoint.x,
      tankY: tankPoint.y
    });
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
    if (!moveSelectedMakeupDecorationDepthModel({ draft: this.makeupDraft, direction })) {
      return;
    }
    this.syncMakeupDecorationDepths();
    this.syncMakeupOverlay();
  }

  private syncMakeupDecorationDepths(draft = this.makeupDraft): void {
    syncMakeupDecorationDepthsModel({
      draft,
      draggedDecoration: this.makeupDraggedDecoration,
      bringToTop: (image) => this.tankLayer.bringToTop(image)
    });
  }

  private removeSelectedMakeupDecoration(): void {
    const removed = removeSelectedMakeupDecorationModel(this.makeupDraft);
    if (!removed) {
      return;
    }

    removed.image.destroy();
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
    const result = applyMakeupLookModel({
      draft: this.makeupDraft,
      decorationTypes,
      tankLevel: this.tankLevel,
      makeupTotalCost: () => this.makeupTotalCost(),
      priceWealth: (price) => this.priceWealth(price),
      spendPrice: (price) => this.spendPrice(price),
      makeupDecorationCostEntries: () => this.makeupDecorationCostEntries(),
      makeupSelectedCosmetic: (category) => this.makeupSelectedCosmetic(category),
      ensureTankState: (level) => this.ensureTankState(level),
      ownsTankCosmetic: (asset) => this.ownsTankCosmetic(asset),
      addTankCosmeticToInventory: (category, assetId) => this.tankCosmeticInventory(category).set(assetId, 1),
      recordDailyQuestAction: (action) => this.recordDailyQuestAction(action),
      renderTankCosmeticBlueTintIntensity: (category, assetId) => this.renderTankCosmeticBlueTintIntensity(category, assetId),
      applyTankCosmeticBlueTint: (category, assetId, intensity) => this.applyTankCosmeticBlueTint(category, assetId, intensity),
      removeAllPlacedDecorationsFromActiveTank: () => this.removeAllPlacedDecorationsFromActiveTank(),
      getDecorationInventory: (decorationTypeId, size) => this.getDecorationInventory(decorationTypeId, size),
      consumeStoredDecoration: (decorationTypeId, size) => this.consumeStoredDecoration(decorationTypeId, size),
      addDecorationToTank: (decorationType, x, y, size, tankLevel, depth) => this.addDecorationToTank(decorationType, x, y, size, tankLevel, depth),
      tankDecorationDepthFromOrder: (index) => this.tankDecorationDepthFromOrder(index)
    });
    if (!result.applied) {
      return;
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
    destroyMakeupDraftModel(this.makeupDraft);
    this.makeupDraft = undefined;
  }

  private syncMakeupPresentation(): void {
    syncMakeupPresentationModel({
      makeupActive: this.activeScreen === "makeup",
      tankLevel: this.tankLevel,
      fish: this.fish,
      helperCreatures: this.helperCreatures,
      foods: this.foods,
      pendingHelperCreatureDrops: this.pendingHelperCreatureDrops,
      coinDrops: this.coinDrops,
      setCoinDropVisible: (coin, visible) => this.setCoinDropVisible(coin, visible),
      ambientWaterParticles: this.ambientWaterParticles,
      activeAirStoneBubbles: this.activeAirStoneBubbles,
      placedDecorations: this.placedDecorations,
      dirtyTankOverlay: this.dirtyTankOverlay,
      showDecorationTrashTarget: (show) => this.showDecorationTrashTarget(show),
      refreshFishTankVisibility: () => this.refreshFishTankVisibility(),
      refreshHelperTankVisibility: () => this.refreshHelperTankVisibility(),
      refreshDecorationTankVisibility: () => this.refreshDecorationTankVisibility(),
      updateDirtyTankOverlay: () => this.updateDirtyTankOverlay()
    });
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
    appendAlbumPageView({
      content,
      inventoryDrillOpen: this.inventoryDrillOpen,
      inventoryTab: this.inventoryTab,
      createCategoryGrid: () => this.createInventoryCategoryGrid(),
      createDrillHeader: (title, onBack) => this.createPageDrillHeader(title, onBack),
      onBackToCategories: () => {
        this.inventoryDrillOpen = false;
        this.tankMenuDrillOpen = false;
        this.syncHtmlPageOverlay();
      },
      appendFishTab: (target) => this.appendInventoryFishTab(target),
      appendFusionTab: (target) => this.appendInventoryFusionTab(target),
      appendFoodTab: (target) => this.appendInventoryFoodTab(target),
      appendDecorTab: (target) => this.appendInventoryDecorTab(target),
      appendTankTab: (target) => this.appendInventoryTankTab(target),
      appendCoinsTab: (target) => this.appendInventoryCoinsTab(target)
    });
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
    return createInventoryCategoryGridView({
      items,
      createDrillMenuCard: (icon, label, description, action) => this.createDrillMenuCard(icon, label, description, action),
      createFusionDrillMenuCard: (description, action) => this.createFusionDrillMenuCard(description, action),
      onSelectTab: (tab) => {
        this.inventoryTab = tab;
        this.inventoryDrillOpen = true;
        this.tankMenuDrillOpen = false;
        this.tankMenuPage = 1;
        this.syncHtmlPageOverlay();
      }
    });
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

    appendInventoryItemSection({
      content,
      title: "My Fish Inventory",
      items: storedFishTypes((fishTypeId) => this.getFishInventory(fishTypeId))
        .map((fishType) => this.createStoredFishInventoryRow(fishType)),
      emptyTitle: "No fish in inventory",
      emptyDetail: "Buy fish from Shop, then choose which ones go into the tank."
    });
  }

  private appendInventoryFusionTab(content: HTMLElement): void {
    createAquariumFusionAdapter(this).appendInventoryFusionTab(content);
  }

  private showFusionFishPicker(slotIndex: 0 | 1, sources: FishFusionSource[]): void {
    createAquariumFusionAdapter(this).showFusionFishPicker(slotIndex, sources);
  }

  private appendInventoryFoodTab(content: HTMLElement): void {
    appendInventoryItemSection({
      content,
      items: ownedFoodTypes((foodTypeId) => this.getFoodInventory(foodTypeId)).map((foodType) => this.createFoodInventoryRow(foodType)),
      emptyTitle: "No food owned",
      emptyDetail: "Buy food and medicine from Shop."
    });
  }

  private appendInventoryDecorTab(content: HTMLElement): void {
    appendInventoryItemSection({
      content,
      items: ownedDecorationEntries((decorationTypeId, size) => this.getOwnedDecorationCount(decorationTypeId, size))
        .map(({ decorationType, size }) => this.createDecorationInventoryRow(decorationType, size)),
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
    const row = storedFishInventoryRowData({
      fishType,
      count: this.getFishInventory(fishType.id),
      sellValue: this.storedFishSellValue(fishType),
      storedAges: this.storedFishAgesFor(fishType.id),
      rarityLabel: this.rarityLabel(fishType.rarity),
      ageLabel: (seconds) => this.fusionAgeLabel(seconds)
    });
    return createStoredFishInventoryRowView({
      ...row,
      createButton: (label, className, onClick, disabled) => this.htmlButton(label, className, onClick, disabled),
      onPlace: () => this.prepareFishPlacement(fishType.id),
      onSell: () => this.showStoredFishSellConfirmation(fishType.id)
    });
  }

  private createFoodInventoryRow(foodType: FoodType): HTMLElement {
    const rawAmount = this.getFoodInventory(foodType.id);
    const row = foodInventoryRowData({
      foodType,
      countLabel: this.foodInventoryBadgeLabel(foodType),
      sellValue: this.foodSellValue(foodType, rawAmount)
    });
    return createFoodInventoryRowView({
      ...row,
      createButton: (label, className, onClick, disabled) => this.htmlButton(label, className, onClick, disabled),
      useLabel: foodType.id === timeCurrentFoodTypeId ? "Use" : undefined,
      onUse: foodType.id === timeCurrentFoodTypeId ? () => this.useTimeCurrentBoost() : undefined,
      onSell: () => this.showFoodSellConfirmation(foodType.id)
    });
  }

  private createCoinInventoryRow(coinType: "rare" | "superRare"): HTMLElement {
    const row = coinInventoryRowData({
      coinType,
      count: this.wallet[coinType],
      value: this.coinSellValue(coinType, this.wallet[coinType])
    });
    return createCoinInventoryRowView({
      ...row,
      createButton: (label, className, onClick, disabled) => this.htmlButton(label, className, onClick, disabled),
      onSell: () => this.showCoinSellConfirmation(coinType)
    });
  }

  private createDecorationInventoryRow(decorationType: DecorationType, size: DecorationSize): HTMLElement {
    const storedCount = this.getDecorationInventory(decorationType.id, size);
    const placedCount = this.getPlacedDecorationCount(decorationType.id, size);
    const row = decorationInventoryRowData({
      decorationType,
      size,
      storedCount,
      placedCount,
      sellValue: this.decorationSellValue(decorationType, size, storedCount + placedCount)
    });
    return createDecorationInventoryRowView({
      ...row,
      createButton: (label, className, onClick, disabled) => this.htmlButton(label, className, onClick, disabled),
      onSell: () => this.showDecorationSellConfirmation(decorationType.id, size)
    });
  }

  private fishHappinessPercent(fish: Fish): number {
    return fishHappinessPercentModel(fish);
  }

  private compactDurationLabel(seconds: number): string {
    return compactDurationLabelModel(seconds, formatNumber);
  }

  private appendGoalsPage(content: HTMLElement): void {
    appendGoalsPageContent({
      content,
      goals: this.questPageItems(),
      claimedGoalIds: this.dailyGoals.claimed,
      foodNameForId: (foodTypeId) => this.foodTypeById(foodTypeId)?.name ?? "Reward",
      fishNameForId: (fishTypeId) => fishTypes.find((fishType) => fishType.id === fishTypeId)?.name ?? "Fish",
      rewardedAdOptions: this.rewardedAdOptions(),
      rewardedAd: this.rewardedAd,
      createButton: this.pageButtonFactory(),
      claimDailyGoal: (goalId, complete) => this.claimDailyGoal(goalId, complete),
      startRewardedAd: (kind) => this.startRewardedAd(kind),
      claimRewardedAd: (kind) => this.claimRewardedAd(kind)
    });
  }

  private questPageItems(): DailyQuestItem[] {
    const quests = this.dailyQuestItems();
    const previousActiveIds = this.dailyGoals.activeQuestIds?.join("|") ?? "";
    this.dailyGoals = ensureActiveDailyQuestItemsModel(this.dailyGoals, quests);
    const nextActiveIds = this.dailyGoals.activeQuestIds?.join("|") ?? "";
    if (previousActiveIds !== nextActiveIds) {
      this.saveNow();
    }
    return quests;
  }

  private prizeController(): AquariumPrizeController {
    return new AquariumPrizeController(createAquariumPrizeControllerHost(this));
  }

  private openPrizeMachineArcade(): void {
    this.prizeController().openPrizeMachineArcade();
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
    this.recordDailyQuestAction("fish-stack-game");
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

  private gameTimeLabel(): string {
    const secondsPerGameHour = 5;
    const hoursPerGameDay = 24;
    const daysPerGameYear = 360;
    const totalGameHours = Math.max(0, Math.floor(this.currentGameTimeSeconds() / secondsPerGameHour));
    const totalGameDays = Math.floor(totalGameHours / hoursPerGameDay);
    const year = Math.floor(totalGameDays / daysPerGameYear) + 1;
    const day = (totalGameDays % daysPerGameYear) + 1;
    const yearLabel = year === 1 ? "1 Year" : `${formatNumber(year)} Years`;
    const dayLabel = day === 1 ? "1 day" : `${formatNumber(day)} days`;
    return `${yearLabel} ${dayLabel}`;
  }

  private currentGameTimeSeconds(): number {
    const activeAges = this.activeFish().map((fish) => fish.ageSeconds);
    const storedAges = [...this.fishInventoryAges.values()].flat();
    return Math.max(0, ...activeAges, ...storedAges);
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
    this.prizeController().showPrizeMachineSpinner();
  }

  private selectPrizeMachineBet(betAmount: PrizeMachineBetAmount): void {
    this.prizeController().selectPrizeMachineBet(betAmount);
  }

  private showPrizeBetModal(): void {
    this.prizeController().showPrizeBetModal();
  }

  private handleNativePrizePointer(designX: number, designY: number): boolean {
    return this.prizeController().handleNativePrizePointer(designX, designY);
  }

  private currentPrizeMachineConfig() {
    return this.prizeController().currentPrizeMachineConfig();
  }

  private currentPrizeBetAmounts(): PrizeMachineBetAmount[] {
    return this.prizeController().currentPrizeBetAmounts();
  }

  private currentPrizeBetAmount(betAmounts = this.currentPrizeBetAmounts()): PrizeMachineBetAmount {
    return this.prizeController().currentPrizeBetAmount(betAmounts);
  }

  private syncCurrentPrizeBetAmount(betAmounts = this.currentPrizeBetAmounts()): PrizeMachineBetAmount {
    return this.prizeController().syncCurrentPrizeBetAmount(betAmounts);
  }

  private spinPrizeMachine(): void {
    this.prizeController().spinPrizeMachine();
  }

  private createPrizeWheelPlanner() {
    return this.prizeController().createPrizeWheelPlanner();
  }

  private createPrizeWheelSegments() {
    return this.prizeController().createPrizeWheelSegments();
  }

  private ensurePrizeWheelFishTexturesLoaded(): void {
    this.prizeController().ensurePrizeWheelFishTexturesLoaded();
  }

  private destroyPrizeSpinContainer(): void {
    this.prizeController().destroyPrizeSpinContainer();
  }

  private nextPrizeRareFish(): FishType {
    return this.prizeController().nextPrizeRareFish();
  }

  private nextPrizeFish(rarity: Rarity): FishType {
    return this.prizeController().nextPrizeFish(rarity);
  }

  private rewardedAdOptions(): RewardedAdOption[] {
    this.clearExpiredRewardedAdCooldown();
    return rewardedAdOptionsForRewards({
      rewards: this.rewardedAdRewards(),
      commonCoinIcon: coinAssetPathByType.common
    });
  }

  private rewardedAdRewards() {
    return buildRewardedAdRewardSet({
      commonReward: this.rewardedAdCoinReward("common"),
      mealCaloriesNeeded: this.activeFish().map((fish) => fish.mealCaloriesNeeded()),
      ownedFishTypeIds: this.ownedFishTypeIds(),
      ownedHelperCreatureTypeIds: this.ownedHelperCreatureTypeIds(),
      tankLevel: this.tankDisplayLevel(),
      isCalorieTrackedFood: (foodTypeId) => this.isCalorieTrackedFood(foodTypeId),
      isDroppableFood: (foodTypeId) => this.isDroppableFood(foodTypeId)
    });
  }

  private rewardedAdFoodReward(): FoodType {
    return selectRewardedAdFoodReward({
      mealCaloriesNeeded: this.activeFish().map((fish) => fish.mealCaloriesNeeded()),
      isCalorieTrackedFood: (foodTypeId) => this.isCalorieTrackedFood(foodTypeId),
      isDroppableFood: (foodTypeId) => this.isDroppableFood(foodTypeId)
    });
  }

  private rewardedAdFishReward(): FishType {
    return selectRewardedAdFishReward({
      ownedFishTypeIds: this.ownedFishTypeIds(),
      tankLevel: this.tankDisplayLevel()
    });
  }

  private rewardedAdHelperReward(): HelperCreatureType {
    return selectRewardedAdHelperReward({
      ownedHelperCreatureTypeIds: this.ownedHelperCreatureTypeIds()
    });
  }

  private appendSettingsPage(content: HTMLElement): void {
    appendSettingsPageContent(content, this.settings, {
      createButton: this.pageButtonFactory(),
      toggleSetting: (key) => this.toggleSetting(key),
      setMusicVolume: (volume, commit) => this.setMusicVolume(volume, commit),
      showOfflineSummary: () => this.showOfflineSummary(),
      showResetConfirmation: () => this.showResetConfirmation(),
      developer: {
        developerGodMode: this.developerGodMode,
        onUnlock: () => this.unlockDeveloperGodMode(),
        onGrant: () => this.grantDeveloperGodMode(),
        onWrongPassword: () => this.floatText("Wrong password", toastX, toastY, "#ffb0a8")
      }
    });
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
    return visibleFishCatalogModel(this.storeCoinFilter);
  }

  private visibleFoodCatalog(): FoodType[] {
    return visibleFoodCatalogModel();
  }

  private visibleSupplyCatalog(): FoodType[] {
    return visibleSupplyCatalogModel(this.storeCoinFilter);
  }

  private visibleTankCatalogLevels(): number[] {
    return visibleTankCatalogLevelsModel(maxOwnedTanks);
  }

  private visibleDecorationCatalog(): DecorationType[] {
    return visibleDecorationCatalogModel(this.storeCoinFilter);
  }

  private visibleHelperCreatureCatalog(): HelperCreatureType[] {
    return visibleHelperCreatureCatalogModel(this.storeCoinFilter);
  }

  private visibleStoreCatalogCount(): number {
    return visibleStoreCatalogCountModel({
      activeTab: this.activeTab,
      storeCoinFilter: this.storeCoinFilter,
      maxOwnedTanks
    });
  }

  private matchesStoreCoinFilter(price: FishType["price"], rarity: FishType["rarity"] = "common"): boolean {
    return matchesStoreCoinFilterModel(price, rarity, this.storeCoinFilter);
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
    return tankSummaryModel({
      fish: this.fishInTank(level),
      helperCount: this.helpersInTank(level).length
    });
  }

  private tankAccentColor(level: number): number {
    return tankAccentColorModel(level);
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
    executeTankCosmeticPurchase({
      ...this.storePurchaseAdapter(),
      tankCosmeticInventory: (category) => this.tankCosmeticInventory(category),
      useTankCosmetic: (cosmetic) => this.useTankCosmetic(cosmetic)
    }, asset);
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
    this.aquariumStoreController().closeStoreAfterPurchase();
  }

  private storePurchaseAdapter() {
    return {
      activeScreen: () => this.activeScreen,
      closeModal: () => this.closeModal(),
      returnToTankScreen: () => this.returnToTankScreen(),
      refreshStoreOverlay: () => this.storeOverlay?.refresh(),
      refreshUi: (renderControls?: boolean) => this.refreshUi(renderControls),
      createFoodDock: () => this.createFoodDock(),
      saveNow: () => this.saveNow(),
      spendPrice: (price: Price) => this.spendPrice(price),
      floatText: (message: string, color: string) => this.floatText(message, toastX, toastY, color),
      setRecentInventoryDockItemKey: (key: string) => {
        this.recentInventoryDockItemKey = key;
      },
      setPlacementMode: (mode: PlacementMode) => {
        this.placementMode = mode;
      },
      recordDailyQuestAction: (action: string) => this.recordDailyQuestAction(action)
    };
  }

  private useTankCosmetic(asset: TankCosmetic): void {
    executeTankCosmeticUse({
      ...this.storePurchaseAdapter(),
      ensureTankState: () => this.ensureTankState(this.tankLevel),
      tankCosmeticInventory: (category) => this.tankCosmeticInventory(category),
      buyTankCosmetic: (cosmetic) => this.buyTankCosmetic(cosmetic),
      layoutTankBackground: () => this.layoutTankBackground(),
      layoutTankFloor: () => this.layoutTankFloor(),
      renderTabControls: () => this.renderTabControls()
    }, asset);
  }

  private showFishBuyQuantityModal(fishType: FishType): void {
    this.aquariumStoreController().showFishBuyQuantityModal(fishType);
  }

  private buyFish(fishType: FishType, quantity = 1): void {
    this.aquariumStoreController().buyFish(fishType, quantity);
  }

  private showFoodBuyQuantityModal(foodType: FoodType, initialQuantity = this.getFoodBuyQuantity(foodType.id)): void {
    this.aquariumStoreController().showFoodBuyQuantityModal(foodType, initialQuantity);
  }

  private buyFood(foodType = this.getSelectedFoodType(), quantity = this.getFoodBuyQuantity(foodType.id)): void {
    this.aquariumStoreController().buyFood(foodType, quantity);
  }

  private showGrowthTonicFishModal(foodType: FoodType): void {
    this.aquariumStoreController().showGrowthTonicFishModal(foodType);
  }

  private growthTonicPriceForFish(fish: Fish): Price {
    return this.aquariumStoreController().growthTonicPriceForFish(fish);
  }

  private buyGrowthTonicForFish(foodType: FoodType, fish: Fish): void {
    this.aquariumStoreController().buyGrowthTonicForFish(foodType, fish);
  }

  private showProductionBoostFishModal(foodType: FoodType): void {
    this.aquariumStoreController().showProductionBoostFishModal(foodType);
  }

  private productionBoostPriceForFish(fish: Fish): Price {
    return this.aquariumStoreController().productionBoostPriceForFish(fish);
  }

  private buyProductionBoostForFish(foodType: FoodType, fish: Fish): void {
    this.aquariumStoreController().buyProductionBoostForFish(foodType, fish);
  }

  private dropFoodAt(foodTypeId: FoodTypeId, x: number, y: number): void {
    this.aquariumFoodController().dropFoodAt(foodTypeId, x, y);
  }

  private careFoodTargetForDrop(foodTypeId: FoodTypeId): Fish | undefined {
    return this.aquariumFoodController().careFoodTargetForDrop(foodTypeId);
  }

  private reserveFoodForDrop(foodType: FoodType): number {
    return this.aquariumFoodController().reserveFoodForDrop(foodType);
  }

  private refundUnusedFood(food: FoodPellet, consumedCalories = 0): void {
    this.aquariumFoodController().refundUnusedFood(food, consumedCalories);
  }

  private buyDecoration(decorationType: DecorationType, size: DecorationSize = "m"): void {
    const price = this.decorationVariantPrice(decorationType, size);
    executeDecorationPurchase({
      ...this.storePurchaseAdapter(),
      decorationInventoryKey: (decorationTypeId, decorationSize) => this.decorationInventoryKey(decorationTypeId, decorationSize),
      getDecorationInventory: (key) => this.decorationInventory.get(key) ?? 0,
      setDecorationInventory: (key, count) => this.decorationInventory.set(key, count)
    }, decorationType, size, price);
  }

  private buyDecorationFromStore(decorationTypeId: string, size: DecorationSize): void {
    const decorationType = decorationTypes.find((item) => item.id === decorationTypeId);
    if (decorationType) {
      this.buyDecoration(decorationType, size);
      this.storeOverlay?.refresh();
    }
  }

  private buyTankUtility(utilityId: string): void {
    this.aquariumStoreController().buyTankUtility(utilityId);
  }

  private buyHelperCreature(creatureType: HelperCreatureType): void {
    executeHelperCreaturePurchase({
      ...this.storePurchaseAdapter(),
      getCreatureInventory: (creatureTypeId) => this.getCreatureInventory(creatureTypeId),
      setCreatureInventory: (creatureTypeId, count) => this.creatureInventory.set(creatureTypeId, count)
    }, creatureType);
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
    this.recordDailyQuestAction("sell-fish");
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
    removeStoredFishModel({
      fishInventory: this.fishInventory,
      fishTypeId,
      quantity,
      trimStoredFishAges: (trimFishTypeId) => this.trimStoredFishAges(trimFishTypeId)
    });
  }

  private sellStoredFish(fishTypeId: string, quantity = 1): void {
    const fishType = storedFishTypeFromCatalog(fishTypes, fishTypeId);
    const current = this.getFishInventory(fishTypeId);
    if (!fishType || current <= 0) {
      this.floatText("No fish in inventory", toastX, toastY, "#ffb0a8");
      return;
    }

    const salePlan = planStoredFishSale({
      fishType,
      current,
      requestedQuantity: quantity
    });
    for (let index = 0; index < salePlan.sellQuantity; index += 1) {
      this.takeStoredFishAge(fishTypeId);
    }
    this.removeStoredFish(fishTypeId, salePlan.sellQuantity);
    earn(this.wallet, "common", salePlan.sellValue);
    this.recordDailyQuestAction("sell-fish");
    this.recordDailyQuestAction("sell-stored-fish");
    this.floatText(`Sold ${fishType.name} x${formatNumber(salePlan.sellQuantity)} +C${formatNumber(salePlan.sellValue)}`, toastX, toastY, "#ffe67a");
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

    const salePlan = planFoodInventorySale({
      foodType,
      current,
      requestedQuantity: quantity ?? this.foodInventoryDisplayCount(foodType),
      maxDisplayQuantity: this.foodInventoryDisplayCount(foodType),
      isCalorieTrackedFood: (itemId) => this.isCalorieTrackedFood(itemId)
    });
    if (salePlan.nextInventoryAmount <= 0) {
      this.foodInventory.delete(foodTypeId);
    } else {
      this.foodInventory.set(foodTypeId, salePlan.nextInventoryAmount);
    }
    earn(this.wallet, "common", salePlan.sellValue);
    this.recordDailyQuestAction("sell-food");
    this.floatText(`Sold ${foodType.name} x${formatNumber(salePlan.sellQuantity)} +C${formatNumber(salePlan.sellValue)}`, toastX, toastY, "#ffe67a");
    this.closeModal();
    this.createFoodDock();
    this.refreshUi();
    this.saveNow();
  }

  private decorationSellValue(decorationType: DecorationType, size: DecorationSize, count = this.getOwnedDecorationCount(decorationType.id, size)): number {
    return decorationSaleValueModel({
      decorationType,
      size,
      count,
      decorationVariantPrice: (item, itemSize) => this.decorationVariantPrice(item, itemSize)
    });
  }

  private tankUtilitySellValue(price: Price): number {
    return utilitySaleValue(price);
  }

  private sellDecorationInventory(decorationTypeId: string, size: DecorationSize, quantity?: number): void {
    const decorationType = decorationTypes.find((item) => item.id === decorationTypeId);
    const count = this.getOwnedDecorationCount(decorationTypeId, size);
    if (!decorationType || count <= 0) {
      this.floatText("No decor to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellQuantity = clampSellQuantity(quantity, count);
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
    const salePlan = planCoinInventorySale(coinType, count, quantity);
    this.wallet[coinType] = salePlan.nextCount;
    earn(this.wallet, "common", salePlan.sellValue);
    this.recordDailyQuestAction(coinType === "rare" ? "sell-rare-coins" : "sell-super-rare-coins");
    this.floatText(`Converted x${formatNumber(salePlan.sellQuantity)} +C${formatNumber(salePlan.sellValue)}`, toastX, toastY, "#ffe67a");
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
    const stored = storeActiveFishModel({
      fish,
      activeFish: this.fish,
      fishInventory: this.fishInventory,
      addStoredFishAge: (fishTypeId, ageSeconds) => this.addStoredFishAge(fishTypeId, ageSeconds),
      removeFishAt: (index) => this.removeFishAt(index)
    });
    if (!stored) {
      return;
    }

    this.recentInventoryDockItemKey = "fish-menu:fish-menu";
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
    handleTankPointerInput({
      pointer,
      activeScreen: this.activeScreen,
      modalOpen: Boolean(this.modal),
      placementMode: this.placementMode,
      pointerDesignPoint: (inputPointer) => this.pointerDesignPoint(inputPointer),
      screenToTankPoint: (designX, designY) => this.screenToTankPoint(designX, designY),
      fishBubbleAtPointer: (designX, designY) => this.pendingFishBubbleAtPointer(designX, designY),
      popFishBubble: (pending) => this.popFishInventoryBubble(pending),
      coinAtPointer: (designX, designY) => this.coinAtPointer(designX, designY),
      collectCoin: (coin, automated) => this.collectCoin(coin, automated),
      fishTypeById: (id) => fishTypes.find((fishType) => fishType.id === id),
      decorationTypeById: (id) => decorationTypes.find((item) => item.id === id),
      fishInventory: (id) => this.getFishInventory(id),
      decorationInventory: (id, size) => this.getDecorationInventory(id, size),
      activeFishCount: () => this.activeFish().length,
      maxFishCapacity: () => this.maxFishCapacityForLevel(),
      activeFishAtTankPoint: (x, y) => this.activeFishAtTankPoint(x, y),
      floatText: (message, x, y, color) => this.floatText(message, x, y, color),
      placeFishWithCompatibility: (type, x, y) => this.placeFishWithCompatibility(type, x, y),
      placeDecorationFromInventory: (decoration, size, x, y) => this.placeDecorationFromInventory(decoration, size, x, y)
    });
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
    return nearestFishAtTankPoint({
      fish: this.activeFish(),
      x: tankPoint.x,
      y: tankPoint.y,
      tankViewScale: this.tankViewScaleForLevel(),
      minimumRadius: 42,
      widthFactor: 0.48,
      heightFactor: 0.7
    });
  }

  private decorationAtPointer(designX: number, designY: number): PlacedDecoration | undefined {
    if (this.activeScreen !== "tank") {
      return undefined;
    }

    const tankPoint = this.screenToTankPoint(designX, designY);
    return decorationAtTankPoint(this.activeDecorations(), tankPoint.x, tankPoint.y);
  }

  private installNativeCanvasInputFallback(): void {
    this.nativeCanvasInputCleanup = installAquariumNativeCanvasInputFallback(this);
  }

  private entityController(): AquariumEntityController {
    this.aquariumEntityController ??= new AquariumEntityController(createAquariumEntityControllerAdapter(this));
    return this.aquariumEntityController;
  }

  private addFishToTank(type: FishType, x: number, y: number, options: { gender?: FishGender; tankLevel?: number; ageSeconds?: number } = {}): Fish {
    return this.entityController().addFishToTank(type, x, y, options);
  }

  private placeFishWithCompatibility(type: FishType, x: number, y: number): void {
    this.entityController().placeFishWithCompatibility(type, x, y);
  }

  private showTankFullText(x = toastX, y = toastY): void {
    const message = `Tank full ${formatNumber(this.activeFish().length)}/${formatNumber(this.maxFishCapacityForLevel())}`;
    this.floatText(message, toastX, toastY, "#ffb0a8");
    if (tankBounds.contains(x, y)) {
      this.floatTankText(message, x, y - 28, "#ffb0a8");
    }
  }

  private addFishToInventory(fishType: FishType, quantity = 1, showBubble = true): void {
    this.recentInventoryDockItemKey = "fish-menu:fish-menu";
    this.entityController().addFishToInventory(fishType, quantity, showBubble);
  }

  private spawnFishInventoryBubble(fishType: FishType, quantity = 1): void {
    this.entityController().spawnFishInventoryBubble(fishType, quantity);
  }

  private spawnFishTankBubble(
    fishType: FishType,
    x: number,
    y: number,
    options: { ageSeconds?: number; exchangeTarget?: Fish; consumesInventory?: boolean } = {}
  ): void {
    this.entityController().spawnFishTankBubble(fishType, x, y, options);
  }

  private pendingFishBubbleAtPointer(designX: number, designY: number): PendingFishBubble | undefined {
    return this.entityController().pendingFishBubbleAtPointer(designX, designY);
  }

  private popFishInventoryBubble(pending: PendingFishBubble): void {
    this.recordDailyQuestAction("pop-fish-bubble");
    this.entityController().popFishInventoryBubble(pending);
  }

  private handleFishBubblePop(pending: PendingFishBubble): void {
    this.entityController().handleFishBubblePop(pending);
  }

  private releaseFishTankBubble(pending: PendingFishBubble): void {
    this.entityController().releaseFishTankBubble(pending);
  }

  private randomFishPlacement(): Phaser.Math.Vector2 {
    return randomFishPlacementModel();
  }

  private addDecorationToTank(
    decoration: DecorationType,
    x: number,
    y: number,
    size: DecorationSize = "m",
    tankLevel = this.tankLevel,
    depth = defaultDecorationDepth(y)
  ): void {
    this.entityController().addDecorationToTank(decoration, x, y, size, tankLevel, depth);
  }

  private tankDecorationDepthFromOrder(index: number): number {
    return tankDecorationDepthFromOrderModel(index);
  }

  private placeDecorationFromInventory(decoration: DecorationType, size: DecorationSize, x: number, y: number): void {
    this.entityController().placeDecorationFromInventory(decoration, size, x, y);
  }

  private fitDecorationDisplay(image: Phaser.GameObjects.Image, decoration: DecorationType, size: DecorationSize = "m"): void {
    fitDecorationDisplayModel(image, decoration, size);
  }

  private updateAirStoneBubbles(deltaSeconds: number, activeDecorations: PlacedDecoration[]): void {
    this.entityController().updateAirStoneBubbles(deltaSeconds, activeDecorations);
  }

  private spawnAirStoneBubble(decoration: PlacedDecoration): void {
    this.entityController().spawnAirStoneBubble(decoration);
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
    moveDecorationWithinTank(decoration, x, y, this.draggedDecoration === decoration);
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
    return this.entityController().addHelperCreatureToTank(creatureType, x, y, targetX, tankLevel);
  }

  private dropHelperCreatureFromInventory(creatureType: HelperCreatureType, x: number, y: number): void {
    this.entityController().dropHelperCreatureFromInventory(creatureType, x, y);
  }

  private activeHelperCreatureCountWithPending(): number {
    return this.entityController().activeHelperCreatureCountWithPending();
  }

  private createPendingHelperCreatureDrop(creatureType: HelperCreatureType, x: number, y: number): void {
    this.entityController().createPendingHelperCreatureDrop(creatureType, x, y);
  }

  private updatePendingHelperCreatureDrops(deltaSeconds: number): void {
    this.entityController().updatePendingHelperCreatureDrops(deltaSeconds);
  }

  private landPendingHelperCreatureDrop(drop: PendingHelperCreatureDrop): void {
    this.entityController().landPendingHelperCreatureDrop(drop);
  }

  private fitPendingHelperCreatureDrop(drop: PendingHelperCreatureDrop, tankViewScale: number): void {
    this.entityController().fitPendingHelperCreatureDrop(drop, tankViewScale);
  }

  private restoreSavedGame(): void {
    restoreAquariumSceneSave(this);
  }

  private applyOfflineProgress(elapsedSeconds: number): OfflineProgress {
    return applyAquariumSceneOfflineProgress(this, elapsedSeconds);
  }

  private saveNow(savedAt = Date.now()): void {
    saveAquariumSceneNow(this, savedAt);
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

  private updateFishCoinProduction(fish: Fish, activitySpeedMultiplier = 1): void {
    updateFishCoinProductionModel({
      fish,
      now: this.time.now,
      coinDropCount: this.coinDrops.length,
      maxCoinDrops,
      minDelayMs: fishCoinProductionMinDelayMs,
      maxDelayMs: fishCoinProductionMaxDelayMs,
      activeProductionPaceMultiplier: this.activeProductionPaceMultiplier() * Phaser.Math.Clamp(activitySpeedMultiplier, 0.001, timeCurrentSpeedMultiplier),
      randomBetween: (min, max) => Phaser.Math.Between(min, max),
      addFishProductionTotal: (tankLevel, value) => this.addFishProductionTotal(tankLevel, value),
      createCoinDrop: (x, y, value, coinType, isMega, options) => {
        this.createCoinDrop(x, y, value, coinType, isMega, options);
      }
    });
  }

  private createCoinDrop(
    x: number,
    y: number,
    value: number,
    coinType: CoinType,
    isMega = false,
    options: CoinDropOptions = {}
  ): CoinDrop {
    const visibleBounds = tankViewportBounds;
    const horizontalPadding = 34 / Math.max(0.01, this.tankViewScaleForLevel());
    const minVisibleX = Math.max(tankBounds.left + horizontalPadding, visibleBounds.left + horizontalPadding);
    const maxVisibleX = Math.min(tankBounds.right - horizontalPadding, visibleBounds.right - horizontalPadding);
    const fallbackX = Phaser.Math.Clamp(visibleBounds.centerX || tankBounds.centerX, tankBounds.left + horizontalPadding, tankBounds.right - horizontalPadding);
    const clampedVisibleX = (targetX: number) => (minVisibleX <= maxVisibleX ? Phaser.Math.Clamp(targetX, minVisibleX, maxVisibleX) : fallbackX);
    const landingX = clampedVisibleX(options.landingX ?? x);
    const maxBottomY = this.visibleCoinBottomDesignY();
    const bottomBand = Math.round(gameWidth * 0.08);
    const bottomY = Phaser.Math.Clamp(
      options.bottomY ?? Phaser.Math.Between(Math.round(maxBottomY - bottomBand), Math.round(maxBottomY)),
      tankBounds.top + 80,
      maxBottomY
    );
    const visibleX = clampedVisibleX(x);
    const visibleY = Phaser.Math.Clamp(y, visibleBounds.top + 24, maxBottomY);

    return createCoinDropModel({
      scene: this,
      x: visibleX,
      y: visibleY,
      value,
      coinType,
      isMega,
      options: { ...options, landingX, bottomY },
      tankViewScale: this.tankViewScaleForLevel(),
      tankLayer: this.tankLayer,
      coinDrops: this.coinDrops,
      coinMagnetPreviousCoinY: this.coinMagnetPreviousCoinY,
      visible: this.activeScreen !== "makeup",
      canManuallyCollectTankCoins: () => this.canManuallyCollectTankCoins(),
      collectCoin: (coin, automated) => this.collectCoin(coin, automated),
      setCoinDropVisible: (coin, visible) => this.setCoinDropVisible(coin, visible)
    });
  }

  private visibleCoinBottomDesignY(): number {
    this.refreshVisibleTankViewport();
    const scale = Math.max(0.01, this.tankViewScaleForLevel());
    const visualPadding = Math.max(34, 46 / scale);
    return Phaser.Math.Clamp(tankViewportBounds.bottom - visualPadding, tankBounds.top + 80, tankBounds.bottom - 8);
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
    collectCoinModel({
      coin,
      automated,
      coinDrops: this.coinDrops,
      coinMagnetPreviousCoinY: this.coinMagnetPreviousCoinY,
      wallet: this.wallet,
      automatedFeeRate: automatedCoinCollectFeeRate,
      canManuallyCollectTankCoins: () => this.canManuallyCollectTankCoins(),
      recordDailyQuestAction: (action) => this.recordDailyQuestAction(action),
      floatCoinClaimText: (value, coinType, x, y, color, automatedClaim, fee) => {
        this.floatCoinClaimText(value, coinType, x, y, color, automatedClaim, fee);
      },
      playManualCollect: (collectedCoin, claimedValue) => {
        this.playSfx(coinCollectSoundKey, { volume: 0.24, detune: this.coinCollectDetune(collectedCoin.coinType) });
        this.registerCoinCombo(
          collectedCoin.sprite.x,
          collectedCoin.sprite.y - 42,
          commonWealthValueForCoin(collectedCoin.coinType, claimedValue)
        );
      },
      setCoinDrops: (coinDrops) => {
        this.coinDrops = coinDrops;
      },
      refreshUi: () => this.refreshUi(),
      saveNow: () => this.saveNow()
    });
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
    return coinCollectDetuneModel(coinType);
  }

  private registerCoinCombo(x: number, y: number, collectedCommonValue: number): void {
    const result = registerCoinComboModel({
      state: this.coinComboState(),
      now: this.time.now,
      x,
      y,
      collectedCommonValue,
      maxCount: coinComboMaxCount
    });
    this.applyCoinComboState(result.state);
    if (result.state.count >= 10 && this.dailyQuestActionCount("coin-combo-10") <= 0) {
      this.recordDailyQuestAction("coin-combo-10");
    }
    if (result.state.count >= 20 && this.dailyQuestActionCount("coin-combo-20") <= 0) {
      this.recordDailyQuestAction("coin-combo-20");
    }

    if (result.showMessage) {
      this.showCoinComboOverlay(result.showMessage);
    }

    if (result.shouldResolve) {
      this.resolveCoinCombo();
    }
  }

  private resolveCoinCombo(): void {
    const { nextState, bonus, position } = resolveCoinComboModel({
      state: this.coinComboState(),
      wallet: this.wallet,
      rewardPercentPerCount: coinComboRewardPercentPerCount
    });
    this.applyCoinComboState(nextState);
    if (bonus <= 0) {
      return;
    }

    const leveledUp = this.addFishProductionTotal(this.tankLevel, bonus);
    this.showCoinComboOverlay(`COMBO BONUS C${formatNumber(bonus)}!`, true, coinComboRewardTextDurationMs);
    this.floatTankText(`COMBO BONUS C${formatNumber(bonus)}!`, position.x, position.y - 24, coinVisualsByType.common.textColor);
    this.refreshUi(!leveledUp);
    this.saveNow();
  }

  private coinComboState(): CoinComboState {
    return {
      count: this.coinComboCount,
      collectedValue: this.coinComboCollectedValue,
      lastClaimedAt: this.coinComboLastClaimedAt,
      lastPosition: this.coinComboLastPosition
    };
  }

  private applyCoinComboState(state: CoinComboState): void {
    this.coinComboCount = state.count;
    this.coinComboCollectedValue = state.collectedValue;
    this.coinComboLastClaimedAt = state.lastClaimedAt;
    this.coinComboLastPosition = state.lastPosition;
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
    const boostLabel = this.timeCurrentRemainingSeconds() > 0
      ? `   Current x${formatNumber(timeCurrentSpeedMultiplier)} ${compactDurationLabelModel(this.timeCurrentRemainingSeconds(), formatNumber)}`
      : "";
    return `Food ${formatNumber(this.getTotalFoodInventory())}   Clean ${formatNumber(Math.round(this.cleanliness))}%   Happy ${formatNumber(Math.round(this.calculateTankHappiness()))}%${boostLabel}`;
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
    if (foodType.id === timeCurrentFoodTypeId) {
      return this.timeCurrentRemainingSeconds() > 0
        ? `x${formatNumber(timeCurrentSpeedMultiplier)} ${compactDurationLabelModel(this.timeCurrentRemainingSeconds(), formatNumber)}`
        : "Current";
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

  private timeCurrentRemainingSeconds(level = this.tankLevel): number {
    return Math.max(0, this.ensureTankState(level).timeCurrentRemainingSeconds ?? 0);
  }

  private tankActivitySpeedMultiplier(): number {
    return this.timeCurrentRemainingSeconds() > 0 ? timeCurrentSpeedMultiplier : 1;
  }

  private updateTimeCurrent(deltaSeconds: number): void {
    const state = this.ensureTankState(this.tankLevel);
    if ((state.timeCurrentRemainingSeconds ?? 0) <= 0) {
      state.timeCurrentRemainingSeconds = 0;
      return;
    }

    state.timeCurrentRemainingSeconds = Math.max(0, state.timeCurrentRemainingSeconds - Math.max(0, deltaSeconds));
  }

  private useTimeCurrentBoost(): void {
    if (this.getFoodInventory(timeCurrentFoodTypeId) <= 0) {
      this.floatText("No Time Current left", toastX, toastY, "#ffb0a8");
      return;
    }

    const state = this.ensureTankState(this.tankLevel);
    this.foodInventory.set(timeCurrentFoodTypeId, Math.max(0, this.getFoodInventory(timeCurrentFoodTypeId) - 1));
    state.timeCurrentRemainingSeconds = Math.max(0, state.timeCurrentRemainingSeconds ?? 0) + timeCurrentDurationSeconds;
    this.recentInventoryDockItemKey = `food:${timeCurrentFoodTypeId}`;
    this.recordDailyQuestAction("use-time-current");
    this.floatText(`Time Current x${formatNumber(timeCurrentSpeedMultiplier)} active`, toastX, toastY, "#8be9ff");
    this.closeModal();
    this.refreshUi();
    this.createFoodDock();
    this.saveNow();
  }

  private getFishInventory(fishTypeId: string): number {
    return getStoredFishCountModel(this.fishInventory, fishTypeId);
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
    return this.foodTypeById(this.selectedFoodTypeId) ?? basicFood;
  }

  private foodTypeById(foodTypeId: FoodTypeId): FoodType | undefined {
    return foodTypes.find((foodType) => foodType.id === foodTypeId);
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
    return findBreedMateModel(this.fish, index);
  }

  private chooseBreedBabyType(parentType: FishType, force?: "same" | "rare"): FishType {
    return chooseBreedBabyTypeModel({
      parentType,
      force,
      randomPercent: () => Phaser.Math.Between(1, 100),
      randomChoice: (items) => Phaser.Utils.Array.GetRandom(items)
    });
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

    const displayLevel = this.tankDisplayLevel();
    const targetPerMinute = targetProductionPerMinuteForLevel(displayLevel);
    const baseMultiplier = targetPerMinute / (projectedPerMinute * coinComboMaxProductionMultiplier);
    const currentThreshold = fishProductionThresholdForLevel(displayLevel);
    const nextThreshold = fishProductionThresholdForLevel(displayLevel + 1);
    const productionRatio = Phaser.Math.Clamp(
      (this.fishProductionTotal(this.tankLevel) - currentThreshold) / Math.max(1, nextThreshold - currentThreshold),
      0,
      1
    );
    const targetSeconds = targetActiveHoursForDisplayLevel(displayLevel) * 3600;
    const oldestActiveAgeSeconds = this.activeFish().reduce((oldest, fish) => Math.max(oldest, fish.ageSeconds), 0);
    const activeAgeWithinLevelSeconds = targetSeconds > 0 ? oldestActiveAgeSeconds % targetSeconds : 0;
    const expectedRatio = Phaser.Math.Clamp(activeAgeWithinLevelSeconds / Math.max(1, targetSeconds), 0, 1);
    const catchUpMultiplier = expectedRatio > productionRatio
      ? Phaser.Math.Clamp(expectedRatio / Math.max(0.02, productionRatio), 1, maxDynamicProductionPaceMultiplier)
      : 1;
    return Phaser.Math.Clamp(baseMultiplier * catchUpMultiplier, 0.001, maxDynamicProductionPaceMultiplier);
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
    const bonusRewards = this.levelCompletionBonusRewards(previousLevel, nextLevel, state);
    if (level === this.tankLevel) {
      this.moveActiveFishToInventory();
      this.clearCoinDrops();
      this.wallet = createEmptyWallet();
      state.wallet = this.wallet;
      this.grantLevelCompletionBonusRewards(state, bonusRewards);
      rewardFish.forEach((fishType) => this.addFishToInventory(fishType, 1, false));
      this.showLevelCompletionRewardModal(previousLevel, nextLevel, rewardFish, bonusRewards);
      this.refreshUi();
      this.storeOverlay?.refresh();
      this.saveNow();
    } else {
      state.wallet = createEmptyWallet();
      this.grantLevelCompletionBonusRewards(state, bonusRewards);
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

  private levelCompletionBonusRewards(previousLevel: number, nextLevel: number, state: TankRuntimeState): LevelCompletionBonusReward {
    if (previousLevel !== 1 || nextLevel < 2) {
      return {};
    }

    return {
      coins: tankUpgradePrices[2],
      background: this.cheapestUnownedTankCosmetic("background", state),
      seabed: this.cheapestUnownedTankCosmetic("seabed", state),
      decoration: this.cheapestDecorationReward()
    };
  }

  private grantLevelCompletionBonusRewards(state: TankRuntimeState, rewards: LevelCompletionBonusReward): void {
    if (rewards.coins) {
      earn(state.wallet, rewards.coins.coinType, rewards.coins.amount);
      if (rewards.coins.rareAmount !== undefined) {
        earn(state.wallet, "rare", rewards.coins.rareAmount);
      }
      if (rewards.coins.superRareAmount !== undefined) {
        earn(state.wallet, "superRare", rewards.coins.superRareAmount);
      }
    }

    if (rewards.background) {
      state.backgroundInventory.set(rewards.background.id, (state.backgroundInventory.get(rewards.background.id) ?? 0) + 1);
    }
    if (rewards.seabed) {
      state.seabedInventory.set(rewards.seabed.id, (state.seabedInventory.get(rewards.seabed.id) ?? 0) + 1);
    }
    if (rewards.decoration) {
      const key = this.decorationInventoryKey(rewards.decoration.decorationType.id, rewards.decoration.size);
      state.decorationInventory.set(key, (state.decorationInventory.get(key) ?? 0) + 1);
    }
  }

  private cheapestUnownedTankCosmetic(category: TankCosmeticCategory, state: TankRuntimeState): TankCosmetic | undefined {
    const inventory = category === "background" ? state.backgroundInventory : state.seabedInventory;
    return [...this.tankCosmetics(category)]
      .filter((cosmetic) => this.priceWealth(cosmetic.price) > 0 && (inventory.get(cosmetic.id) ?? 0) <= 0)
      .sort((first, second) => this.priceWealth(first.price) - this.priceWealth(second.price) || first.name.localeCompare(second.name))[0];
  }

  private cheapestDecorationReward(): LevelCompletionBonusReward["decoration"] {
    const candidates = decorationTypes.flatMap((decorationType) =>
      decorationSizeOrder.map((size) => ({
        decorationType,
        size,
        price: this.decorationVariantPrice(decorationType, size)
      }))
    );
    const cheapest = candidates.sort((first, second) =>
      this.priceWealth(first.price) - this.priceWealth(second.price) ||
      first.decorationType.name.localeCompare(second.decorationType.name) ||
      decorationSizeOrder.indexOf(first.size) - decorationSizeOrder.indexOf(second.size)
    )[0];
    return cheapest ? { decorationType: cheapest.decorationType, size: cheapest.size } : undefined;
  }

  private levelCompletionBonusRewardLabels(rewards: LevelCompletionBonusReward): string[] {
    const labels: string[] = [];
    if (rewards.coins) {
      labels.push(`Coins: ${formatPrice(rewards.coins)}`);
    }
    if (rewards.background) {
      labels.push(`Background: ${rewards.background.name}`);
    }
    if (rewards.seabed) {
      labels.push(`Sand: ${rewards.seabed.name}`);
    }
    if (rewards.decoration) {
      labels.push(`Decor: ${rewards.decoration.decorationType.name} ${decorationSizes[rewards.decoration.size].label}`);
    }
    return labels;
  }

  private moveActiveFishToInventory(): void {
    for (const fish of [...this.activeFish()]) {
      this.storeFish(fish);
    }
  }

  private getTankNeedIndicator(): string {
    return this.aquariumCareController().getTankNeedIndicator();
  }

  private getCompactTankNeedIndicator(): string {
    return this.aquariumCareController().getCompactTankNeedIndicator();
  }

  private calculateTankHappiness(): number {
    return this.aquariumCareController().calculateTankHappiness();
  }

  private calculateCurrentCompatibility(): CompatibilitySummary {
    return this.aquariumCareController().calculateCurrentCompatibility();
  }

  private calculateCompatibilityForTypes(types: FishType[], candidate?: FishType): CompatibilitySummary {
    return this.aquariumCareController().calculateCompatibilityForTypes(types, candidate);
  }

  private updateTankCleanliness(deltaSeconds: number, activeFishCount = this.activeFish().length): void {
    this.aquariumCareController().updateTankCleanliness(deltaSeconds, activeFishCount);
  }

  private isTankDirty(): boolean {
    return this.aquariumCareController().isTankDirty();
  }

  private shouldShowCleanlinessWarning(): boolean {
    return Math.round(this.cleanliness) < 50;
  }

  private finishTankCleaning(): void {
    this.aquariumCareController().finishTankCleaning();
  }

  private tankDirtRatePerSecond(activeFishCount: number): number {
    return this.aquariumCareController().tankDirtRatePerSecond(activeFishCount);
  }

  private cleanTank(): void {
    this.aquariumCareController().cleanTank();
  }

  private updateFoodDispenser(tankFish = this.activeFish()): void {
    this.aquariumFoodController().updateFoodDispenser(tankFish);
  }

  private foodDispenserOutletPosition(): Phaser.Math.Vector2 {
    return this.aquariumFoodController().foodDispenserOutletPosition();
  }

  private foodDispenserThrowVelocity(outlet: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    return this.aquariumFoodController().foodDispenserThrowVelocity(outlet);
  }

  private updateHelperCreatures(deltaSeconds: number, activeHelpers = this.activeHelperCreatures(), progressDeltaSeconds = deltaSeconds): void {
    for (const helper of activeHelpers) {
      const action = helper.update(deltaSeconds, this.coinDrops, this.foods, progressDeltaSeconds);

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
    return this.aquariumFoodController().chooseAutoFoodForFish(targetFish);
  }

  private updateAutoFoodBuyer(tankFish = this.activeFish()): void {
    this.aquariumFoodController().updateAutoFoodBuyer(tankFish);
  }

  private chooseAutoPurchasableFood(tankFish = this.activeFish()): FoodType | undefined {
    return this.aquariumFoodController().chooseAutoPurchasableFood(tankFish);
  }

  private medianMealCaloriesNeeded(tankFish = this.activeFish()): number {
    return this.aquariumFoodController().medianMealCaloriesNeeded(tankFish);
  }

  private foodNeedMessage(targetCalories: number): string {
    return this.aquariumFoodController().foodNeedMessage(targetCalories);
  }

  private normalizeDailyGoals(savedGoals: DailyGoalsState | undefined): DailyGoalsState {
    return normalizeDailyGoalsModel(savedGoals, this.localDateKey());
  }

  private updateDailyQuestPlaytime(deltaSeconds: number): void {
    if (this.dailyQuestActionCount("play-time-current") > 0 || this.dailyGoals.claimed.includes("play-time-current")) {
      return;
    }

    this.dailyQuestPlaytimeSeconds += Math.max(0, deltaSeconds);
    if (this.dailyQuestPlaytimeSeconds >= 180) {
      this.recordDailyQuestAction("play-time-current");
      this.refreshUi(false);
    }
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
      tankLevelProgressRatio: levelProgressToNext(this.tankDisplayLevel(), this.fishProductionTotal()).ratio,
      cleanliness: this.cleanliness,
      hasFoodDispenser: this.hasFoodDispenser(),
      hasCoinMagnet: this.hasCoinMagnet(),
      hasAutoFoodBuyer: this.hasAutoFoodBuyer(),
      foodDispenserPrice: foodDispenserPrice,
      questReward: coinQuestReward(this.currentProductionMinuteQuestReward()),
      fishQuestReward: this.fishQuestReward(),
      actionCount: (action) => this.dailyQuestActionCount(action),
      fishPurchaseCount: (coinType) => this.todayFishPurchaseCount(coinType)
    });
  }

  private dailyGoalUnclaimedCount(): number {
    return this.dailyQuestItems().filter((quest) => quest.complete && !this.dailyGoals.claimed.includes(quest.id)).length;
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

  private currentProductionMinuteQuestReward(): Price {
    return { coinType: "common", amount: Math.max(0, Math.round(this.activeFishProductionPerMinute() * 1000) / 1000) };
  }

  private fishQuestReward(): DailyQuestReward {
    return { kind: "fish", fishTypeId: this.rewardedAdFishReward().id, quantity: 1 };
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

    const modal = createRewardedAdModalView({
      option,
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
    syncRewardedAdModalView({
      ad: this.rewardedAd,
      countdownText: this.rewardedAdCountdownText,
      claimButton: this.rewardedAdModalButton
    });
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

  private recentTimeCurrentPurchaseCount(now = Date.now()): number {
    return questRecentTimeCurrentPurchaseCount(this.dailyGoals, now);
  }

  private canBuyTimeCurrentNow(): boolean {
    return this.recentTimeCurrentPurchaseCount() === 0;
  }

  private timeCurrentPurchaseRestockLabel(now = Date.now()): string {
    const oldestRecentPurchase = oldestRecentTimeCurrentPurchase(this.dailyGoals, now);

    if (!oldestRecentPurchase) {
      return "1h restock";
    }

    const remainingSeconds = Math.ceil((oldestRecentPurchase + timeCurrentPurchaseWindowMs - now) / 1000);
    return `Restock ${this.compactDurationLabel(remainingSeconds)}`;
  }

  private recordTimeCurrentPurchase(): void {
    this.dailyGoals = this.normalizeDailyGoals(this.dailyGoals);
    this.dailyGoals = recordTimeCurrentPurchaseModel(this.dailyGoals);
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

    this.showQuestRewardModal(quest);
  }

  private showQuestRewardModal(quest: DailyQuestItem): void {
    this.showPrizeCelebration(
      "Quest Reward!",
      this.questRewardImageUrl(quest.reward),
      this.dailyQuestRewardLabel(quest.reward),
      "Claim",
      () => this.finishClaimDailyGoal(quest)
    );
  }

  private finishClaimDailyGoal(quest: DailyQuestItem): void {
    if (this.dailyGoals.claimed.includes(quest.id)) {
      return;
    }

    this.dailyGoals.claimed.push(quest.id);
    if (quest.id === "play-time-current") {
      const remainingActiveQuestIds = (this.dailyGoals.activeQuestIds ?? []).filter((id) => id !== quest.id && id !== "use-time-current");
      this.dailyGoals.activeQuestIds = ["use-time-current", ...remainingActiveQuestIds];
    }
    this.dailyGoals = ensureActiveDailyQuestItemsModel(this.dailyGoals, this.dailyQuestItems());
    this.grantDailyQuestReward(quest.reward);
    this.floatText(`+${this.dailyQuestRewardLabel(quest.reward)} quest`, toastX, toastY, "#ffe67a");
    this.refreshUi();
    this.createFoodDock();
    this.saveNow();
  }

  private grantDailyQuestReward(reward: DailyQuestReward): void {
    if (reward.kind === "coins") {
      earn(this.wallet, reward.price.coinType, reward.price.amount);
      if (reward.price.rareAmount) {
        earn(this.wallet, "rare", reward.price.rareAmount);
      }
      if (reward.price.superRareAmount) {
        earn(this.wallet, "superRare", reward.price.superRareAmount);
      }
      return;
    }

    if (reward.kind === "fish") {
      const fishType = fishTypes.find((candidate) => candidate.id === reward.fishTypeId) ?? fishTypes[0];
      if (fishType) {
        this.addFishToInventory(fishType, Math.max(1, Math.floor(reward.quantity)), true);
      }
      return;
    }

    if (reward.kind === "utility") {
      const utility = tankUtilityInfoModel(reward.utilityId);
      if (!utility) {
        return;
      }
      const quantity = Math.max(1, Math.floor(reward.quantity));
      if (utility.id === "coin-magnet") {
        this.decorationInventory.set(utility.inventoryKey, Math.max(this.coinMagnetExpiresAt(), Date.now()) + coinMagnetDurationMs * quantity);
        this.coinMagnetWasActive = false;
      } else if (utility.id === "auto-food-buyer") {
        this.decorationInventory.set(utility.inventoryKey, Math.max(this.autoFoodBuyerExpiresAt(), Date.now()) + autoFoodBuyerDurationMs * quantity);
        this.autoFoodBuyerWasActive = false;
      } else {
        this.decorationInventory.set(utility.inventoryKey, 1);
      }
      this.recentInventoryDockItemKey = `utility:${utility.id}`;
      return;
    }

    const quantity = Math.max(1, Math.floor(reward.quantity));
    this.foodInventory.set(reward.foodTypeId, this.getFoodInventory(reward.foodTypeId) + quantity);
    this.recentInventoryDockItemKey = `food:${reward.foodTypeId}`;
    if (reward.foodTypeId === ageBoostFoodTypeId && reward.assignTo === "oldest-active-fish") {
      const oldestFish = this.oldestActiveFish();
      if (oldestFish) {
        this.careFoodTargetFish.set(reward.foodTypeId, oldestFish);
      }
    }
    if (this.isDroppableFood(reward.foodTypeId)) {
      this.selectedFoodTypeId = reward.foodTypeId;
    }
  }

  private oldestActiveFish(): Fish | undefined {
    return this.activeFish().reduce<Fish | undefined>(
      (oldest, fish) => (!oldest || fish.ageSeconds > oldest.ageSeconds ? fish : oldest),
      undefined
    );
  }

  private questRewardImageUrl(reward: DailyQuestReward): string {
    if (reward.kind === "coins") {
      return coinAssetPathByType[reward.price.coinType];
    }

    if (reward.kind === "fish") {
      return `/assets/fish/${reward.fishTypeId}.png`;
    }

    if (reward.kind === "utility") {
      return this.tankUtilityIconPath(reward.utilityId);
    }

    return foodAssetPath(reward.foodTypeId);
  }

  private dailyQuestRewardLabel(reward: DailyQuestReward): string {
    return formatDailyQuestReward(
      reward,
      (foodTypeId) => this.foodTypeById(foodTypeId)?.name ?? "Reward",
      (fishTypeId) => fishTypes.find((fishType) => fishType.id === fishTypeId)?.name ?? "Fish",
      (utilityId) => tankUtilityInfoModel(utilityId)?.name ?? "Tool"
    );
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
      this.showModalContent(createStarterProtectedSellModalContent({
        onClose: () => this.closeModal()
      }));
      return;
    }

    const sellValue = this.activeFishSellValue(targetFish);
    this.showModalContent(createActiveFishSellConfirmationContent({
      fishType: targetFish.type,
      sellValue,
      createValueRow: (label, amount) => this.commonCoinValueRow(label, amount),
      onSell: () => this.sellFishByIndex(index),
      onCancel: () => this.closeModal()
    }));
  }

  private showStoredFishSellConfirmation(fishTypeId: string): void {
    const fishType = fishTypes.find((item) => item.id === fishTypeId);
    const count = this.getFishInventory(fishTypeId);
    if (!fishType || count <= 0) {
      this.floatText("No fish in inventory", toastX, toastY, "#ffb0a8");
      return;
    }

    this.showModalContent(createStoredFishSellConfirmationContent({
      fishType,
      count,
      valueForQuantity: (quantity) => this.storedFishSellValue(fishType) * quantity,
      createValueRow: (label, amount) => this.commonCoinValueRow(label, amount),
      attachTouchFeedback: (button) => this.attachTouchFeedback(button),
      onSell: (quantity) => this.sellStoredFish(fishTypeId, quantity),
      onCancel: () => this.closeModal()
    }));
  }

  private showFishFusionModal(preselectedKeys: Iterable<string> = []): void {
    createAquariumFusionAdapter(this).showFishFusionModal(preselectedKeys);
  }

  private fishFusionSources(): FishFusionSource[] {
    return createAquariumFusionAdapter(this).fishFusionSources();
  }

  private fishFusionResultTypes(sources: FishFusionSource[]): { normal?: FishType; premium?: FishType } {
    return createAquariumFusionAdapter(this).fishFusionResultTypes(sources);
  }

  private fishFusionSourceSellValue(source: FishFusionSource): number {
    return createAquariumFusionAdapter(this).fishFusionSourceSellValue(source);
  }

  private fishFusionCostFor(sources: FishFusionSource[]): Price {
    return createAquariumFusionAdapter(this).fishFusionCostFor(sources);
  }

  private areFishFusionSourcesAvailable(sources: FishFusionSource[]): boolean {
    return createAquariumFusionAdapter(this).areFishFusionSourcesAvailable(sources);
  }

  private fishFusionChancesFor(sources: FishFusionSource[], hasPremium: boolean): FishFusionChances {
    return createAquariumFusionAdapter(this).fishFusionChancesFor(sources, hasPremium);
  }

  private consumeFishFusionSources(sources: FishFusionSource[]): void {
    createAquariumFusionAdapter(this).consumeFishFusionSources(sources);
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

  private ownedHelperCreatureTypeIds(): Set<string> {
    const ownedIds = new Set(this.helperCreatures.map((helper) => helper.type.id));
    for (const [creatureTypeId, count] of this.creatureInventory.entries()) {
      if (count > 0) {
        ownedIds.add(creatureTypeId);
      }
    }
    for (const state of this.tankStates.values()) {
      for (const [creatureTypeId, count] of state.creatureInventory.entries()) {
        if (count > 0) {
          ownedIds.add(creatureTypeId);
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

  private showFoodSellConfirmation(foodTypeId: FoodTypeId): void {
    const foodType = foodTypes.find((item) => item.id === foodTypeId);
    const storedAmount = this.getFoodInventory(foodTypeId);
    if (!foodType || storedAmount <= 0) {
      this.floatText("No food to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const maxQuantity = this.foodInventoryDisplayCount(foodType);
    this.showModalContent(createFoodSellConfirmationContent({
      foodType,
      ownedLabel: `Owned x${this.foodInventoryBadgeLabel(foodType)}`,
      maxQuantity,
      valueForQuantity: (quantity) => {
        const sellAmount = this.isCalorieTrackedFood(foodType.id)
          ? Math.min(storedAmount, quantity * Math.max(1, foodType.calories))
          : Math.min(storedAmount, quantity);
        return this.foodSellValue(foodType, sellAmount);
      },
      createValueRow: (label, amount) => this.commonCoinValueRow(label, amount),
      attachTouchFeedback: (button) => this.attachTouchFeedback(button),
      onSell: (quantity) => this.sellFoodInventory(foodTypeId, quantity),
      onCancel: () => this.closeModal()
    }));
  }

  private showDecorationSellConfirmation(decorationTypeId: string, size: DecorationSize): void {
    const decorationType = decorationTypes.find((item) => item.id === decorationTypeId);
    const count = this.getOwnedDecorationCount(decorationTypeId, size);
    if (!decorationType || count <= 0) {
      this.floatText("No decor to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    this.showModalContent(createDecorationSellConfirmationContent({
      decorationType,
      size,
      count,
      valueForQuantity: (quantity) => this.decorationSellValue(decorationType, size, quantity),
      createValueRow: (label, amount) => this.commonCoinValueRow(label, amount),
      attachTouchFeedback: (button) => this.attachTouchFeedback(button),
      onSell: (quantity) => this.sellDecorationInventory(decorationTypeId, size, quantity),
      onCancel: () => this.closeModal()
    }));
  }

  private showTankUtilitySellConfirmation(utilityId: TankUtilityId): void {
    const utility = this.tankUtilityInfo(utilityId);
    if (!utility || !utility.owned()) {
      this.floatText("No tool to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    this.showModalContent(createTankUtilitySellConfirmationContent({
      name: utility.name,
      iconPath: this.tankUtilityIconPath(utilityId),
      sellValue: this.tankUtilitySellValue(utility.price),
      createValueRow: (label, amount) => this.commonCoinValueRow(label, amount),
      attachTouchFeedback: (button) => this.attachTouchFeedback(button),
      onSell: () => this.sellTankUtility(utilityId),
      onCancel: () => this.closeModal()
    }));
  }

  private showCoinSellConfirmation(coinType: "rare" | "superRare"): void {
    const count = this.wallet[coinType];
    if (count <= 0) {
      this.floatText("No coins to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    this.showModalContent(createCoinSellConfirmationContent({
      coinType,
      count,
      coinAssetPath: coinAssetPathByType[coinType],
      valueForQuantity: (quantity) => this.coinSellValue(coinType, quantity),
      createValueRow: (label, amount) => this.commonCoinValueRow(label, amount),
      attachTouchFeedback: (button) => this.attachTouchFeedback(button),
      onSell: (quantity) => this.sellCoinInventory(coinType, quantity),
      onCancel: () => this.closeModal()
    }));
  }

  private showHelperSellConfirmation(index: number): void {
    const targetHelper = this.helperCreatures[index];
    if (!targetHelper) {
      this.floatText("No helper to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellPrice = this.helperSellPrice(targetHelper.type);
    this.showModalContent(createHelperSellConfirmationContent({
      helperType: targetHelper.type,
      sellPrice,
      createPriceRow: (price, label) => this.priceIconRow(price, label),
      onSell: () => this.sellHelperCreatureByIndex(index),
      onCancel: () => this.closeModal()
    }));
  }

  private showOfflineSummary(): void {
    const minutesAway = Math.floor(this.offlineProgress.elapsedSeconds / 60);
    this.showModal(
      "Offline Summary",
      [],
      [{ label: "Continue", fill: 0x356a35, action: () => this.closeModal() }],
      createOfflineSummaryContent({
        minutesAway,
        earned: this.offlineProgress.earned,
        cleanliness: this.cleanliness,
        coinAssetPathByType,
        createWalletRow: (label, wallet) => this.walletIconRow(label, wallet)
      })
    );
  }

  private showResetConfirmation(): void {
    this.showModalContent(createResetConfirmationModalContent({
      onReset: () => {
        clearSave();
        window.location.reload();
      },
      onCancel: () => this.closeModal()
    }));
  }

  private showModalContent(content: ModalContent): void {
    this.showModal(content.title, content.lines, content.actions, content.bodyElements);
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

  private showLevelCompletionRewardModal(
    completedLevel: number,
    nextLevel: number,
    rewardFish: FishType[],
    bonusRewards: LevelCompletionBonusReward = {}
  ): void {
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
      bonusRewards: this.levelCompletionBonusRewardLabels(bonusRewards),
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
    installAquariumTestHooks(this, {
      maxCoinDrops,
      maxFoodDrops,
      maxHelperCreatures,
      maxOwnedTanks,
      maxFishCatalogLevel,
      decorationTrashZone,
      overfullHungerFloor
    });
  }

}
