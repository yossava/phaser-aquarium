import Phaser from "phaser";
import { basicFood, decorationTypes, fishTypes, foodAssetPath, foodTypes, helperCreatureTypes } from "../../data/content";
import { serverNow } from "../../services/server-time";
import { getBootstrappedSave, isFreshStart } from "../../services/bootstrap";
import { setVersionConflictHandler, subscribeToRemoteSaves } from "../../services/sync-service";
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
import {
  fishCoinProductionMaxDelayMs,
  fishCoinProductionMinDelayMs,
  fishPowerLevelForAgeSeconds as fishPowerLevelForAgeSecondsModel
} from "../../game/economy-model";
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
  medicineFoodTypeId,
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
  fishHappinessPercent,
  foodInventoryRowData,
  ownedDecorationEntries,
  ownedFoodTypes,
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
  ensureActiveDailyQuestItems as ensureActiveDailyQuestItemsModel,
  normalizeDailyGoals as normalizeDailyGoalsModel,
  visibleDailyQuestItems as visibleDailyQuestItemsModel,
  type DailyGoalsState,
  type DailyQuestItem,
  type DailyQuestReward,
  type RewardedAdState
} from "../../game/quest-system";
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
  isPhaseOneStoreFood,
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
  planStoredFishSale,
  utilitySaleValue
} from "../../game/store-transactions";
import { CoinDrop, coinTextureKeyByType, coinVisualsByType } from "../../objects/CoinDrop";
import { Fish } from "../../objects/Fish";
import { FoodPellet } from "../../objects/FoodPellet";
import { HelperCreature } from "../../objects/HelperCreature";
import { QuestPresentDrop, type QuestPresentDropOptions } from "../../objects/QuestPresentDrop";
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
import { appendAlbumPage as appendAlbumPageView, createInventoryCategoryGrid as createInventoryCategoryGridView } from "../../ui/AlbumPage";
import {
  appendInventoryItemSection,
  createCoinInventoryRow as createCoinInventoryRowView,
  createDecorationInventoryRow as createDecorationInventoryRowView,
  createFoodInventoryRow as createFoodInventoryRowView
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
import { createLevelCompletionRewardShell, createPrizeCelebrationShell, type LevelCompletionRewardCard } from "../../ui/RewardModals";
import {
  createActiveFishSellConfirmationContent,
  createDecorationSellConfirmationContent,
  createOfflineSummaryContent,
  createResetConfirmationModalContent,
  createStarterProtectedSellModalContent,
  createStoredFishSellConfirmationContent,
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
import { installMobileGameTouchFeedback, removeWithModalExit } from "../../ui/dom-motion";
import { createModalShell, type ModalAction } from "../../ui/modal";
import type { AquariumTestSnapshot } from "../../test/aquarium-test-api";
import { installAquariumTestHooks } from "../../test/aquarium-test-hooks";
import type { CoinType, DecorationType, FishGender, FishState, FishType, FoodType, FoodTypeId, HelperCreatureType, Price, Rarity, StoreTab, Wallet } from "../../types/mechanics";
import { BubblePopScene, BubblePopSceneKey, type BubblePopResult } from "../BubblePopScene";
import { ReefDropScene, ReefDropSceneKey, type ReefDropResult } from "../ReefDropScene";
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
  prizeHighlightSoundKey,
  prizeHighlightSoundPath,
  prizeRewardSoundKey,
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
import type { AquariumScenePersistenceTarget } from "./aquarium-scene-persistence";
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
import type { AquariumSceneUpdateTarget } from "./aquarium-scene-update-loop";
import { AquariumCareController, createAquariumCareControllerAdapter } from "./aquarium-care-controller";
import { AquariumSettingsController } from "./aquarium-settings-controller";
import { createAquariumSettingsControllerHost } from "./aquarium-settings-adapter";
import { AquariumWalletController } from "./aquarium-wallet-controller";
import { createAquariumWalletControllerHost } from "./aquarium-wallet-adapter";
import { AquariumTankController } from "./aquarium-tank-controller";
import { createAquariumTankControllerHost } from "./aquarium-tank-adapter";
import { AquariumFishInventoryController } from "./aquarium-fish-inventory-controller";
import { createAquariumFishInventoryControllerHost } from "./aquarium-fish-inventory-adapter";
import { AquariumMenuController } from "./aquarium-menu-controller";
import { createAquariumMenuControllerHost } from "./aquarium-menu-adapter";
import { AquariumDailyGoalsController } from "./aquarium-daily-goals-controller";
import { createAquariumDailyGoalsControllerHost } from "./aquarium-daily-goals-adapter";
import { AquariumDecorationController } from "./aquarium-decoration-controller";
import { createAquariumDecorationControllerHost } from "./aquarium-decoration-adapter";
import { AquariumHudController } from "./aquarium-hud-controller";
import { createAquariumHudControllerHost } from "./aquarium-hud-adapter";
import { AquariumQuestPhaseController } from "./aquarium-quest-phase-controller";
import { createAquariumQuestPhaseControllerHost } from "./aquarium-quest-phase-adapter";
import { AquariumMinigameController } from "./aquarium-minigame-controller";
import { createAquariumMinigameHost } from "./aquarium-minigame-adapter";
import { AquariumSellController } from "./aquarium-sell-controller";
import { createAquariumSellControllerHost } from "./aquarium-sell-adapter";

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
  private readonly prizeMachineRuntimeSessionId = serverNow();
  private readonly handlePagePersistence = (): void => {
    this.saveNow(serverNow(), true);
  };
  private readonly handleVisibilityPersistence = (): void => {
    if (document.visibilityState === "hidden") {
      this.saveNow(serverNow(), true);
    }
  };
  private wallet = createWallet(500, 0, 0);
  private foodInventory = new Map<FoodTypeId, number>();
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
  private foodPelletPool: FoodPellet[] = [];
  private reusableFoodAssignments = new Map<Fish, FoodPellet[]>();
  private coinDrops: CoinDrop[] = [];
  private coinDropPool: CoinDrop[] = [];
  private questPresents: Array<{ drop: QuestPresentDrop; reward: DailyQuestReward }> = [];
  private airStoneBubblePool: Phaser.GameObjects.Arc[] = [];
  private activeAirStoneBubbles = new Set<Phaser.GameObjects.Arc>();
  private helperCreatures: HelperCreature[] = [];
  private pendingHelperCreatureDrops: PendingHelperCreatureDrop[] = [];
  private aquariumEntityController?: AquariumEntityController;
  private aquariumFoodRuntimeController?: AquariumFoodController;
  private aquariumSettingsRuntimeController?: AquariumSettingsController;
  private aquariumWalletRuntimeController?: AquariumWalletController;
  private aquariumTankRuntimeController?: AquariumTankController;
  private aquariumFishInventoryRuntimeController?: AquariumFishInventoryController;
  private aquariumMenuRuntimeController?: AquariumMenuController;
  private aquariumDailyGoalsRuntimeController?: AquariumDailyGoalsController;
  private aquariumDecorationRuntimeController?: AquariumDecorationController;
  private aquariumHudRuntimeController?: AquariumHudController;
  private aquariumQuestPhaseRuntimeController?: AquariumQuestPhaseController;
  private aquariumMinigameRuntimeController?: AquariumMinigameController;
  private aquariumSellRuntimeController?: AquariumSellController;
  private placementMode: PlacementMode = { kind: "none" };
  private activeScreen: AppScreen = "tank";
  private activeTab: StoreTab = "fish";
  private storeCoinFilter: CoinType = "common";
  private selectedFoodTypeId: FoodTypeId = basicFood.id;
  private inventoryDockPage = 0;
  private recentInventoryDockItemKey?: string;
  private lastDockStateKey = "";
  private placedDecorations: PlacedDecoration[] = [];
  private offlineProgress: OfflineProgress = { elapsedSeconds: 0, earned: createEmptyWallet() };
  private pausedTankEarningsStartedAt?: number;
  private pausedTankEarningsRatePerSecond = 0;
  private activeProductionPaceMultiplierFrame = -1;
  private activeProductionPaceMultiplierValue = 1;
  private autosaveElapsed = 0;
  private lastKnownSaveAt = 0;
  private unsubscribeRemote?: () => void;
  private hudStatusSyncElapsed = 0;
  private storeRefreshElapsed = 0;
  private storeCooldownStateKey = "";
  private get cleanliness(): number { return this.aquariumTankController().cleanliness; }
  private set cleanliness(value: number) { this.aquariumTankController().cleanliness = value; }
  private get cleanedAt(): number { return this.aquariumTankController().cleanedAt; }
  private set cleanedAt(value: number) { this.aquariumTankController().cleanedAt = value; }
  private get cleaningTank(): boolean { return this.aquariumTankController().cleaningTank; }
  private set cleaningTank(value: boolean) { this.aquariumTankController().cleaningTank = value; }
  private settings = { sound: true, music: true, musicVolume: 16, reducedMotion: false, notifications: false };
  private developerMenuUnlocked = false;
  private developerGodMode = false;
  private developerClockMultiplier = 1;
  private developerClockOffsetMs = 0;
  private dailyGoals: DailyGoalsState = { date: this.localDateKey(), claimed: [] };
  private get tankLevel(): number { return this.aquariumTankController().tankLevel; }
  private set tankLevel(value: number) { this.aquariumTankController().tankLevel = value; }
  private get ownedTankLevels(): Set<number> { return this.aquariumTankController().ownedTankLevels; }
  private set ownedTankLevels(value: Set<number>) { this.aquariumTankController().ownedTankLevels = value; }
  private get tankNames(): Map<number, string> { return this.aquariumTankController().tankNames; }
  private set tankNames(value: Map<number, string>) { this.aquariumTankController().tankNames = value; }
  private get tankStates(): Map<number, TankRuntimeState> { return this.aquariumTankController().tankStates; }
  private set tankStates(value: Map<number, TankRuntimeState>) { this.aquariumTankController().tankStates = value; }
  private get tankMenuTab(): TankMenuTab { return this.aquariumTankController().tankMenuTab; }
  private set tankMenuTab(value: TankMenuTab) { this.aquariumTankController().tankMenuTab = value; }
  private get tankMenuDrillOpen(): boolean { return this.aquariumTankController().tankMenuDrillOpen; }
  private set tankMenuDrillOpen(value: boolean) { this.aquariumTankController().tankMenuDrillOpen = value; }
  private get tankMenuPage(): number { return this.aquariumTankController().tankMenuPage; }
  private set tankMenuPage(value: number) { this.aquariumTankController().tankMenuPage = value; }
  private inventoryTab: InventoryTab = "fish";
  private inventoryDrillOpen = false;
  private pageReturnScreen?: AppScreen;
  private forceNextPageTransition = false;
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
  private gameHudQuestChecklist?: HTMLDivElement;
  private timeCurrentElement?: HTMLDivElement;
  private timeCurrentText?: HTMLSpanElement;
  private foodDispenserText?: HTMLSpanElement;
  private foodDispenserElement?: HTMLDivElement;
  private coinMagnetText?: HTMLSpanElement;
  private coinMagnetElement?: HTMLDivElement;
  private autoFoodBuyerText?: HTMLSpanElement;
  private autoFoodBuyerElement?: HTMLDivElement;
  private get foodDispenserY(): number { return this.aquariumTankController().foodDispenserY; }
  private set foodDispenserY(value: number) { this.aquariumTankController().foodDispenserY = value; }
  private get coinMagnetY(): number { return this.aquariumTankController().coinMagnetY; }
  private set coinMagnetY(value: number) { this.aquariumTankController().coinMagnetY = value; }
  private get autoFoodBuyerY(): number { return this.aquariumTankController().autoFoodBuyerY; }
  private set autoFoodBuyerY(value: number) { this.aquariumTankController().autoFoodBuyerY = value; }
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
  private reefDropPauseToken = 0;
  private bubblePopPauseToken = 0;
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
    this.setupRealtimeSubscription();
    this.refreshVisibleTankViewport();
    this.configureCameraForHighDpi();
    createFallbackTextures(this, decorationTypes, helperCreatureTypes);
    this.createFishAnimations();
    this.loadFoodDispenserY();
    this.loadCoinMagnetY();
    this.loadAutoFoodBuyerY();
    this.createWorld();
    this.restoreServerSave();
    this.createUi();
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
    this.installPagePersistenceHandlers();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.unsubscribeRemote?.();
      this.unsubscribeRemote = undefined;
      this.input.off("pointerdown");
      this.input.off("pointermove");
      this.input.off("pointerup");
      this.input.off("pointerupoutside");
      this.removePagePersistenceHandlers();
      this.destroyHtmlGameInterface();
    });

    if (import.meta.env.DEV && new URLSearchParams(window.location.search).has("openStore")) {
      this.time.delayedCall(100, () => this.openScreen("store"));
    }
  }

  private pagePersistenceHandlersInstalled = false;

  private installPagePersistenceHandlers(): void {
    if (this.pagePersistenceHandlersInstalled) return;
    
    window.addEventListener("beforeunload", this.handlePagePersistence);
    window.addEventListener("pagehide", this.handlePagePersistence);
    document.addEventListener("visibilitychange", this.handleVisibilityPersistence);
    this.pagePersistenceHandlersInstalled = true;
  }

  private removePagePersistenceHandlers(): void {
    if (!this.pagePersistenceHandlersInstalled) return;
    
    window.removeEventListener("beforeunload", this.handlePagePersistence);
    window.removeEventListener("pagehide", this.handlePagePersistence);
    document.removeEventListener("visibilitychange", this.handleVisibilityPersistence);
    this.pagePersistenceHandlersInstalled = false;
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
    runAquariumSceneUpdate(this as unknown as AquariumSceneUpdateTarget, delta);
  }

  private shouldRunTankActivity(): boolean {
    return this.activeScreen === "tank";
  }

  private startPausedTankEarnings(now = serverNow()): void {
    if (this.pausedTankEarningsStartedAt !== undefined) {
      return;
    }

    this.pausedTankEarningsStartedAt = now;
    this.pausedTankEarningsRatePerSecond = this.projectedActiveProductionPerMinute() *
      this.activeProductionPaceMultiplier() *
      this.tankActivitySpeedMultiplier() /
      60;
  }

  private settlePausedTankEarnings(now = serverNow()): void {
    const startedAt = this.pausedTankEarningsStartedAt;
    const productionPerSecond = this.pausedTankEarningsRatePerSecond;
    this.pausedTankEarningsStartedAt = undefined;
    this.pausedTankEarningsRatePerSecond = 0;
    if (startedAt === undefined) {
      return;
    }

    const elapsedSeconds = Math.max(0, (now - startedAt) / 1000);
    if (elapsedSeconds <= 0) {
      return;
    }

    const amount = Math.floor(productionPerSecond * elapsedSeconds * 0.5 * 10) / 10;
    if (amount < 0.1) {
      return;
    }

    earn(this.wallet, "common", amount);
    this.addFishProductionTotal(this.tankLevel, amount);
    this.saveNow();
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
    return this.aquariumTankController().tankLevelHueDegrees(displayLevel);
  }

  private createDecorationTrashTarget(): void {
    this.aquariumDecorationController().createDecorationTrashTarget();
  }

  private showDecorationTrashTarget(show: boolean): void {
    this.aquariumDecorationController().showDecorationTrashTarget(show);
  }

  private highlightDecorationTrashTarget(active: boolean): void {
    this.aquariumDecorationController().highlightDecorationTrashTarget(active);
  }

  private tankViewScaleForLevel(level = this.tankLevel): number {
    return this.aquariumTankController().tankViewScaleForLevel(level);
  }

  private maxFishCapacityForLevel(level = this.tankLevel): number {
    return this.aquariumTankController().maxFishCapacityForLevel(level);
  }

  private fishCapacityUpgradeBonusForLevel(_level = this.tankLevel): number {
    return this.aquariumTankController().fishCapacityUpgradeBonusForLevel(_level);
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
    return this.aquariumDecorationController().activeDecorations();
  }

  private decorationsInTank(level: number): PlacedDecoration[] {
    return this.aquariumDecorationController().decorationsInTank(level);
  }

  private tankStateConfig(): TankStateConfig {
    return this.aquariumTankController().tankStateConfig();
  }

  private ensureTankState(level = this.tankLevel): TankRuntimeState {
    return this.aquariumTankController().ensureTankState(level);
  }

  private captureActiveTankState(): void {
    this.aquariumTankController().captureActiveTankState();
  }

  private applyTankState(level = this.tankLevel): void {
    this.aquariumTankController().applyTankState(level);
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
    return this.aquariumTankController().currentTankTheme(level);
  }

  private themedTankTextureKeys(level = this.tankLevel): { backgroundKey: string; floorKey: string } {
    return this.aquariumTankController().themedTankTextureKeys(level);
  }

  private renderTankCosmeticId(category: TankCosmeticCategory, level = this.tankLevel): string {
    return this.aquariumTankController().renderTankCosmeticId(category, level);
  }

  private tankThemeTint(level: number): number {
    return this.aquariumTankController().tankThemeTint(level);
  }

  private tankCosmeticBlueTintInventory(category: TankCosmeticCategory, level = this.tankLevel): Map<string, number> {
    return this.aquariumTankController().tankCosmeticBlueTintInventory(category, level);
  }

  private tankCosmeticBlueTintIntensity(category: TankCosmeticCategory, id: string, level = this.tankLevel): number {
    return this.aquariumTankController().tankCosmeticBlueTintIntensity(category, id, level);
  }

  private renderTankCosmeticBlueTintIntensity(category: TankCosmeticCategory, id: string, level = this.tankLevel): number {
    return this.aquariumTankController().renderTankCosmeticBlueTintIntensity(category, id, level);
  }

  private tankCosmeticTint(category: TankCosmeticCategory, id: string, level = this.tankLevel): number {
    return this.aquariumTankController().tankCosmeticTint(category, id, level);
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
    this.syncTankFrameCssVars();
  }

  private syncTankFrameCssVars(): void {
    const canvas = this.game.canvas;
    const rect = canvas.getBoundingClientRect();
    const viewportWidth = Math.max(1, window.innerWidth);
    const viewportHeight = Math.max(1, window.innerHeight);
    const frameLeft = Phaser.Math.Clamp(rect.left, 0, viewportWidth);
    const frameTop = Phaser.Math.Clamp(rect.top, 0, viewportHeight);
    const frameRight = Phaser.Math.Clamp(rect.right, 0, viewportWidth);
    const frameBottom = Phaser.Math.Clamp(rect.bottom, 0, viewportHeight);
    const frameWidth = Math.max(1, frameRight - frameLeft);
    const frameHeight = Math.max(1, frameBottom - frameTop);
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty("--aq-tank-frame-left", `${Math.round(frameLeft)}px`);
    rootStyle.setProperty("--aq-tank-frame-top", `${Math.round(frameTop)}px`);
    rootStyle.setProperty("--aq-tank-frame-width", `${Math.round(frameWidth)}px`);
    rootStyle.setProperty("--aq-tank-frame-height", `${Math.round(frameHeight)}px`);
  }

  private layoutTankBackground(): void {
    if (!this.tankBackground) {
      return;
    }

    this.refreshVisibleTankViewport();
    const scale = Math.max(0.01, this.tankViewScaleForLevel());
    const visibleLeft = Math.min(tankBounds.left, tankViewportBounds.left);
    const visibleTop = Math.min(tankBounds.top, tankViewportBounds.top);
    const visibleRight = Math.max(tankBounds.right, tankViewportBounds.right);
    const visibleBottom = Math.max(tankBounds.bottom, tankViewportBounds.bottom);
    const visualCenterX = (visibleLeft + visibleRight) / 2;
    const visualCenterY = (visibleTop + visibleBottom) / 2;
    const screenCompensatedWidth = Math.max(tankBounds.width, visibleRight - visibleLeft) / scale;
    const screenCompensatedHeight = Math.max(tankBounds.height, visibleBottom - visibleTop) / scale;
    const selectedBackgroundId = this.renderTankCosmeticId("background");
    this.tankBackground.setPosition(visualCenterX, visualCenterY);
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
      visualCenterX,
      visualCenterY,
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
    const sourceEvent = pointer.event;
    if (sourceEvent instanceof MouseEvent || sourceEvent instanceof PointerEvent) {
      const point = this.clientPointToDesignPoint(sourceEvent.clientX, sourceEvent.clientY);
      if (point) {
        return point;
      }
    }

    if (typeof TouchEvent !== "undefined" && sourceEvent instanceof TouchEvent) {
      const touch = sourceEvent.changedTouches[0] ?? sourceEvent.touches[0];
      if (touch) {
        const point = this.clientPointToDesignPoint(touch.clientX, touch.clientY);
        if (point) {
          return point;
        }
      }
    }

    const renderScale = this.currentRenderScale();
    return new Phaser.Math.Vector2(pointer.x / renderScale, pointer.y / renderScale);
  }

  private tankToScreenPoint(x: number, y: number): { x: number; y: number } {
    return this.aquariumTankController().tankToScreenPoint(x, y);
  }

  private refreshTankScaledDropSizes(): void {
    const scale = this.tankViewScaleForLevel();
    this.foods.forEach((food) => food.setWorldScaleCompensation(scale));
    this.coinDrops.forEach((coin) => coin.setWorldScaleCompensation(scale));
    this.questPresents.forEach((present) => present.drop.setWorldScaleCompensation(scale));
    this.pendingHelperCreatureDrops.forEach((drop) => this.fitPendingHelperCreatureDrop(drop, scale));
  }

  private fitCoinDropsToVisibleViewport(): void {
    const maxBottomY = this.visibleCoinBottomDesignY();
    this.coinDrops.forEach((coin) => coin.fitWithinVisibleBounds(tankViewportBounds, maxBottomY));
    this.questPresents.forEach((present) => present.drop.fitWithinVisibleBounds(tankViewportBounds, maxBottomY));
  }

  private createScreenNav(): void {
    this.screenButtons.forEach((button) => button.destroy(true));
    this.screenButtons = [];
    this.aquariumMenuController().createScreenNav();
  }

  private syncTankMenuOverlay(): void {
    this.aquariumHudController().syncTankMenuOverlay();
  }

  private createTankMenuOverlay(): HTMLDivElement {
    return this.aquariumHudController().createTankMenuOverlay();
  }

  private destroyTankMenuOverlay(): void {
    this.aquariumHudController().destroyTankMenuOverlay();
  }

  private syncHtmlGameInterface(): void {
    this.aquariumMenuController().syncHtmlGameInterface();
  }

  private shouldShowTankScene(): boolean {
    return this.aquariumMenuController().shouldShowTankScene();
  }

  private syncTankSceneVisibility(): void {
    const visible = this.shouldShowTankScene();
    this.tankLayer?.setVisible(visible);
    if (!visible) {
      this.dirtyTankOverlay?.setVisible(false);
      this.coinMagnetRay?.setVisible(false);
      this.showDecorationTrashTarget(false);
      this.syncQuestPresentVisibilityAndInput();
    } else if (this.activeScreen === "tank") {
      this.updateDirtyTankOverlay();
      this.syncCoinMagnetRay();
      this.syncQuestPresentVisibilityAndInput();
    } else {
      this.syncQuestPresentVisibilityAndInput();
    }
  }

  private syncHtmlHud(): void {
    this.aquariumHudController().syncHtmlHud();
  }

  private createHtmlHudOverlay(): HTMLDivElement {
    return this.aquariumHudController().createHtmlHudOverlay();
  }

  private syncTankQuestChecklist(): void {
    this.aquariumHudController().syncTankQuestChecklist();
  }

  private syncTimeCurrentIndicator(): void {
    this.aquariumHudController().syncTimeCurrentIndicator();
  }

  private syncCoinMagnetPosition(): void {
    this.aquariumHudController().syncCoinMagnetPosition();
  }

  private syncCoinMagnetRay(): void {
    this.aquariumHudController().syncCoinMagnetRay();
  }

  private updateCoinMagnetRayPulse(): void {
    this.aquariumHudController().updateCoinMagnetRayPulse();
  }

  private syncAutoFoodBuyerPosition(): void {
    this.aquariumHudController().syncAutoFoodBuyerPosition();
  }

  private syncFoodDispenserPosition(): void {
    this.aquariumHudController().syncFoodDispenserPosition();
  }

  private bindFoodDispenserDrag(element: HTMLElement): void {
    this.aquariumHudController().bindFoodDispenserDrag(element);
  }

  private bindCoinMagnetDrag(element: HTMLElement): void {
    this.aquariumHudController().bindCoinMagnetDrag(element);
  }

  private bindAutoFoodBuyerDrag(element: HTMLElement): void {
    this.aquariumHudController().bindAutoFoodBuyerDrag(element);
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
    this.aquariumHudController().loadFoodDispenserY();
  }

  private saveFoodDispenserY(): void {
    this.aquariumHudController().saveFoodDispenserY();
  }

  private loadCoinMagnetY(): void {
    this.aquariumHudController().loadCoinMagnetY();
  }

  private saveCoinMagnetY(): void {
    this.aquariumHudController().saveCoinMagnetY();
  }

  private loadAutoFoodBuyerY(): void {
    this.aquariumHudController().loadAutoFoodBuyerY();
  }

  private saveAutoFoodBuyerY(): void {
    this.aquariumHudController().saveAutoFoodBuyerY();
  }

  private foodDispenserMinY(): number {
    return this.aquariumHudController().foodDispenserMinY();
  }

  private foodDispenserMaxY(): number {
    return this.aquariumHudController().foodDispenserMaxY();
  }

  private prepareHudInfoTarget(element: HTMLElement, title: string, lines: string[]): void {
    this.aquariumHudController().prepareHudInfoTarget(element, title, lines);
  }

  private prepareHudActionTarget(element: HTMLElement, label: string, action: () => void): void {
    this.aquariumHudController().prepareHudActionTarget(element, label, action);
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

    const allItems = this.visibleInventoryDockItems();
    const pinnedFishMenuItem = allItems.find((item) => item.kind === "fish-menu");
    const pagedItems = pinnedFishMenuItem ? allItems.filter((item) => item !== pinnedFishMenuItem) : allItems;
    const pageSize = pinnedFishMenuItem ? Math.max(1, inventoryDockPageSize - 1) : inventoryDockPageSize;
    this.focusRecentInventoryDockItem(pagedItems, pageSize);
    const pageCount = inventoryDockPageCount(pagedItems.length, pageSize);
    this.inventoryDockPage = clampInventoryDockPage(this.inventoryDockPage, pageCount);
    const visibleItems = inventoryDockPageItems(pagedItems, this.inventoryDockPage, pageSize);
    const dockKey = `${this.inventoryDockPage}:${visibleItems.map((item) => this.inventoryDockItemKey(item)).join("|")}`;
    if (dockKey === this.lastDockStateKey) {
      return;
    }
    this.lastDockStateKey = dockKey;

    this.htmlFoodDock.replaceChildren();
    if (pinnedFishMenuItem) {
      this.htmlFoodDock.append(this.createHtmlInventoryDockButton(pinnedFishMenuItem));
    }
    for (const item of visibleItems) {
      this.htmlFoodDock.append(this.createHtmlInventoryDockButton(item));
    }
    if (pageCount > 1) {
      this.htmlFoodDock.append(this.createInventoryDockPager(pageCount));
    }
    this.syncFoodDockPosition();
  }

  private focusRecentInventoryDockItem(items: InventoryDockItem[], pageSize = inventoryDockPageSize): void {
    if (!this.recentInventoryDockItemKey) {
      return;
    }

    const page = pageForInventoryDockItem(items, this.recentInventoryDockItemKey, pageSize);
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

    const rect = this.game.canvas.getBoundingClientRect();
    const viewportHeight = Math.max(1, window.innerHeight);
    const frameTop = Phaser.Math.Clamp(rect.top, 0, viewportHeight);
    const frameBottom = Phaser.Math.Clamp(rect.bottom, 0, viewportHeight);
    const frameHeight = Math.max(1, frameBottom - frameTop);
    const frameOffset = (foodDockTopBelowMenu / gameHeight) * frameHeight;
    this.htmlFoodDock.style.setProperty("--food-dock-screen-top", `${Math.round(frameTop + frameOffset)}px`);
    this.htmlFoodDock.style.setProperty("--food-dock-frame-offset", `${Math.round(frameOffset)}px`);
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
      activeFishCount: () => this.activeFish().length,
      maxFishCapacity: () => this.maxFishCapacityForLevel(),
      hasHungryFishWarning: () => this.activeFish().some((fish) => fish.hunger > 70),
      getDecorationInventory: (decorationTypeId, size) => this.getDecorationInventory(decorationTypeId, size),
      getCreatureInventory: (creatureTypeId) => this.getCreatureInventory(creatureTypeId)
    });
  }

  private inventoryDockItemKey(item: InventoryDockItem): string {
    return inventoryDockItemKeyModel(item);
  }

  private createHtmlInventoryDockButton(item: InventoryDockItem): HTMLButtonElement {
    const badgeLabel = item.kind === "food" || item.kind === "fish-menu"
      ? item.badgeLabel ?? this.foodBadgeLabel(item.count)
      : this.foodBadgeLabel(item.count);
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
    installMobileGameTouchFeedback(element, releaseOnLeave, releaseOnLeave);
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

  private destroyHtmlGameInterface(): void {
    this.viewportResizeCleanup?.();
    this.viewportResizeCleanup = undefined;
    this.nativeCanvasInputCleanup?.();
    this.nativeCanvasInputCleanup = undefined;
    this.cancelPendingFusion();
    this.cancelHtmlFoodDrag();
    this.closeModal(true);
    this.destroyMakeupDraft();
    this.makeupOverlay?.remove();
    this.makeupOverlay = undefined;
    this.gameHudOverlay?.remove();
    this.gameHudOverlay = undefined;
    this.htmlFoodDock?.remove();
    this.htmlFoodDock = undefined;
    this.htmlPageOverlay?.remove();
    this.htmlPageOverlay = undefined;
    this.aquariumWalletController().destroy();
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
    this.aquariumMenuController().openScreen(screen);
  }

  private openFishInventory(): void {
    this.aquariumMenuController().openFishInventory();
  }

  private closePage(): void {
    this.aquariumMenuController().closePage();
  }

  private returnToTankScreen(): void {
    this.aquariumMenuController().returnToTankScreen();
  }

  private ensureAquariumSceneRunning(): void {
    this.scene.resume("AquariumScene");
    this.scene.setVisible(true, "AquariumScene");
    this.scene.setActive(true, "AquariumScene");
  }

  private openStoreOverlay(): void {
    this.aquariumMenuController().openStoreOverlay();
  }

  private updateStoreOverlayTimer(deltaSeconds: number): void {
    this.aquariumMenuController().updateStoreOverlayTimer(deltaSeconds);
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

  private aquariumSettingsController(): AquariumSettingsController {
    this.aquariumSettingsRuntimeController ??= new AquariumSettingsController(createAquariumSettingsControllerHost(this));
    return this.aquariumSettingsRuntimeController;
  }

  private aquariumWalletController(): AquariumWalletController {
    this.aquariumWalletRuntimeController ??= new AquariumWalletController(createAquariumWalletControllerHost(this));
    return this.aquariumWalletRuntimeController;
  }

  private aquariumTankController(): AquariumTankController {
    this.aquariumTankRuntimeController ??= new AquariumTankController(createAquariumTankControllerHost(this));
    return this.aquariumTankRuntimeController;
  }

  private aquariumFishInventoryController(): AquariumFishInventoryController {
    this.aquariumFishInventoryRuntimeController ??= new AquariumFishInventoryController(createAquariumFishInventoryControllerHost(this));
    return this.aquariumFishInventoryRuntimeController;
  }

  private aquariumMenuController(): AquariumMenuController {
    this.aquariumMenuRuntimeController ??= new AquariumMenuController(createAquariumMenuControllerHost(this));
    return this.aquariumMenuRuntimeController;
  }

  private aquariumDailyGoalsController(): AquariumDailyGoalsController {
    this.aquariumDailyGoalsRuntimeController ??= new AquariumDailyGoalsController(createAquariumDailyGoalsControllerHost(this));
    return this.aquariumDailyGoalsRuntimeController;
  }

  private aquariumDecorationController(): AquariumDecorationController {
    this.aquariumDecorationRuntimeController ??= new AquariumDecorationController(createAquariumDecorationControllerHost(this));
    return this.aquariumDecorationRuntimeController;
  }

  private aquariumHudController(): AquariumHudController {
    this.aquariumHudRuntimeController ??= new AquariumHudController(createAquariumHudControllerHost(this));
    return this.aquariumHudRuntimeController;
  }

  private aquariumQuestPhaseController(): AquariumQuestPhaseController {
    this.aquariumQuestPhaseRuntimeController ??= new AquariumQuestPhaseController(
      createAquariumQuestPhaseControllerHost(this)
    );
    return this.aquariumQuestPhaseRuntimeController;
  }

  private aquariumMinigameController(): AquariumMinigameController {
    this.aquariumMinigameRuntimeController ??= new AquariumMinigameController(
      createAquariumMinigameHost(this)
    );
    return this.aquariumMinigameRuntimeController;
  }

  private aquariumSellController(): AquariumSellController {
    this.aquariumSellRuntimeController ??= new AquariumSellController(createAquariumSellControllerHost(this));
    return this.aquariumSellRuntimeController;
  }

  private renderTabControls(): void {
    this.aquariumMenuController().renderTabControls();
  }

  private hideHtmlPageOverlay(): void {
    this.aquariumMenuController().hideHtmlPageOverlay();
  }

  private createHtmlPageOverlay(): HTMLDivElement {
    return this.aquariumMenuController().createHtmlPageOverlay();
  }

  private syncHtmlPageOverlay(): void {
    this.aquariumMenuController().syncHtmlPageOverlay();
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
    return this.aquariumMenuController().htmlPageOverlayKey();
  }

  private appendMainMenuPage(content: HTMLElement): void {
    const lockToShop = this.phaseOneShopLimitActive();
    const lockToTankMenu = this.phaseTwoTankMenuLimitActive();
    const menuDisabled = (id: string): boolean => lockToTankMenu ? id !== "tanks" : lockToShop ? id !== "shop" : false;
    const items: Array<{ id: string; label: string; icon: string; action: () => void; badge?: string; disabled?: boolean }> = [
      { id: "shop", label: "Shop", icon: menuIconAssetPathByKey["ui-shop"], action: () => this.openScreen("store"), disabled: menuDisabled("shop") },
      { id: "games", label: "Games", icon: menuIconAssetPathByKey["ui-game"], action: () => this.openScreen("games"), disabled: menuDisabled("games") },
      { id: "album", label: "Inventory", icon: menuIconAssetPathByKey["ui-book"], action: () => this.openScreen("album"), disabled: menuDisabled("album") },
      { id: "tanks", label: "Customize Tank", icon: menuIconAssetPathByKey["ui-tanks"], action: () => this.openMakeupMode(), disabled: menuDisabled("tanks") },
      { id: "settings", label: "Settings", icon: menuIconAssetPathByKey["ui-settings"], action: () => this.openScreen("settings"), disabled: menuDisabled("settings") }
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
        () => this.openPrizeMachineArcade()
      ),
      this.createDrillMenuCard(
        menuIconAssetPathByKey["ui-game"],
        "Bubble Pop",
        () => this.openBubblePopGame()
      ),
      this.createDrillMenuCard(
        menuIconAssetPathByKey["ui-game"],
        "Reef Drop",
        () => this.openReefDropGame()
      )
    );
    content.append(grid);
  }

  private createDrillMenuCard(icon: string, label: string, action: () => void): HTMLButtonElement {
    return createDrillMenuCardView({
      icon,
      label,
      action,
      createButton: (buttonLabel, className, onClick, disabled) => this.htmlButton(buttonLabel, className, onClick, disabled)
    });
  }

  private createFusionDrillMenuCard(action: () => void): HTMLButtonElement {
    const button = this.htmlButton("", "aq-main-menu-card aq-kids-card-groove", action);
    const iconWrap = htmlElement("span", "aq-main-menu-icon-wrap aq-fusion-menu-icon-wrap", [
      htmlImage("/assets/fish/goldfish.png", "", "aq-main-menu-icon aq-fusion-menu-fish left"),
      htmlImage("/assets/fish/guppy.png", "", "aq-main-menu-icon aq-fusion-menu-fish right")
    ]);
    button.append(
      iconWrap,
      htmlElement("span", "aq-main-menu-label", ["Fusion"])
    );
    return button;
  }

  private createPageDrillHeader(title: string, onBack: () => void): HTMLElement {
    const row = htmlElement("div", "aq-page-drill-header");
    row.append(
      this.htmlButton("< BACK", "aq-store-back-button", onBack),
      htmlElement("div", "min-w-0 flex-1", [
        htmlElement("div", "truncate text-sm font-black leading-tight text-white", [title]),
    htmlElement("div", "truncate text-xs font-bold text-cyan-100/70", ["Choose an item"])
      ])
    );
    return row;
  }

  private pageScreenMeta(): PageScreenMeta {
    return this.aquariumMenuController().pageScreenMeta();
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
    this.aquariumMenuController().openMakeupMode();
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
    this.aquariumMenuController().closeMakeupMode(applied);
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
    return this.aquariumDecorationController().createDecorationHtmlCard(decorationType);
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
      createDrillMenuCard: (icon, label, action) => this.createDrillMenuCard(icon, label, action),
      createFusionDrillMenuCard: (action) => this.createFusionDrillMenuCard(action),
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
    this.aquariumFishInventoryController().appendInventoryFishTab(content);
  }

  private createFishTransferBoard(): HTMLElement {
    return this.aquariumFishInventoryController().createFishTransferBoard();
  }

  private createFishTransferProductionRate(): HTMLElement {
    return this.aquariumFishInventoryController().createFishTransferProductionRate();
  }

  private createFishTransferZone(input: {
    zone: "inventory" | "tank";
    title: string;
    meta: string;
    emptyTitle: string;
    emptyDetail: string;
  }): HTMLElement {
    return this.aquariumFishInventoryController().createFishTransferZone(input);
  }

  private createActiveFishTransferCard(fish: Fish): HTMLElement {
    return this.aquariumFishInventoryController().createActiveFishTransferCard(fish);
  }

  private createStoredFishTransferCard(fishType: FishType): HTMLElement {
    return this.aquariumFishInventoryController().createStoredFishTransferCard(fishType);
  }

  private createFishTransferCard(input: {
    fishType: FishType;
    badge: string;
    powerLabel: string;
    meta: string;
    detail: string;
    statusBars?: HTMLElement;
    transferLabel: string;
    transferDisabled: boolean;
    onTransfer: () => void;
    actionLabel: string;
    actionClassName: string;
    actionDisabled?: boolean;
    onAction: () => void;
  }): HTMLElement {
    return this.aquariumFishInventoryController().createFishTransferCard(input);
  }

  private createFishTransferStatusBars(fish: Fish): HTMLElement {
    return this.aquariumFishInventoryController().createFishTransferStatusBars(fish);
  }

  private createFishTransferStatusBar(label: string, value: number, tone: "happy" | "health" | "food"): HTMLElement {
    return this.aquariumFishInventoryController().createFishTransferStatusBar(label, value, tone);
  }

  private moveStoredFishToTankFromInventoryPage(fishTypeId: string | undefined): void {
    this.aquariumFishInventoryController().moveStoredFishToTankFromInventoryPage(fishTypeId);
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
    return this.aquariumDecorationController().createDecorationInventoryRow(decorationType, size);
  }

  private appendGoalsPage(content: HTMLElement): void {
    this.aquariumDailyGoalsController().appendGoalsPage(content);
  }

  private questPageItems(): DailyQuestItem[] {
    return this.aquariumDailyGoalsController().questPageItems();
  }

  private prizeController(): AquariumPrizeController {
    return new AquariumPrizeController(createAquariumPrizeControllerHost(this));
  }

  private openPrizeMachineArcade(): void {
    this.aquariumMinigameController().openPrizeMachineArcade();
  }

  private openReefDropGame(): void {
    this.aquariumMinigameController().openReefDropGame();
  }

  private openBubblePopGame(): void {
    this.aquariumMinigameController().openBubblePopGame();
  }

  private completeBubblePopGame(result: BubblePopResult): void {
    this.aquariumMinigameController().completeBubblePopGame(result);
  }

  private completeReefDropGame(result: ReefDropResult): void {
    this.aquariumMinigameController().completeReefDropGame(result);
  }

  private activeFishProductionPerMinute(): number {
    return this.aquariumMinigameController().activeFishProductionPerMinute();
  }

  private gameTimeLabel(): string {
    return this.aquariumMinigameController().gameTimeLabel();
  }

  private currentGameTimeSeconds(): number {
    return this.aquariumMinigameController().currentGameTimeSeconds();
  }

  private returnFromReefDropGame(): void {
    this.aquariumMinigameController().returnFromReefDropGame();
  }

  private returnFromBubblePopGame(): void {
    this.aquariumMinigameController().returnFromBubblePopGame();
  }

  private hideReefDropSceneImmediately(): void {
    this.aquariumMinigameController().hideReefDropSceneImmediately();
  }

  private removeReefDropScene(): void {
    this.aquariumMinigameController().removeReefDropScene();
  }

  private hideBubblePopSceneImmediately(): void {
    this.aquariumMinigameController().hideBubblePopSceneImmediately();
  }

  private removeBubblePopScene(): void {
    this.aquariumMinigameController().removeBubblePopScene();
  }

  private showPrizeMachineSpinner(): void {
    this.aquariumMinigameController().showPrizeMachineSpinner();
  }

  private selectPrizeMachineBet(betAmount: PrizeMachineBetAmount): void {
    this.aquariumMinigameController().selectPrizeMachineBet(betAmount);
  }

  private showPrizeBetModal(): void {
    this.aquariumMinigameController().showPrizeBetModal();
  }

  private handleNativePrizePointer(designX: number, designY: number): boolean {
    return this.aquariumMinigameController().handleNativePrizePointer(designX, designY);
  }

  private currentPrizeMachineConfig() {
    return this.aquariumMinigameController().currentPrizeMachineConfig();
  }

  private currentPrizeBetAmounts(): PrizeMachineBetAmount[] {
    return this.aquariumMinigameController().currentPrizeBetAmounts();
  }

  private currentPrizeBetAmount(betAmounts = this.currentPrizeBetAmounts()): PrizeMachineBetAmount {
    return this.aquariumMinigameController().currentPrizeBetAmount(betAmounts);
  }

  private syncCurrentPrizeBetAmount(betAmounts = this.currentPrizeBetAmounts()): PrizeMachineBetAmount {
    return this.aquariumMinigameController().syncCurrentPrizeBetAmount(betAmounts);
  }

  private spinPrizeMachine(): void {
    this.aquariumMinigameController().spinPrizeMachine();
  }

  private createPrizeWheelPlanner() {
    return this.aquariumMinigameController().createPrizeWheelPlanner();
  }

  private createPrizeWheelSegments() {
    return this.aquariumMinigameController().createPrizeWheelSegments();
  }

  private ensurePrizeWheelFishTexturesLoaded(): void {
    this.aquariumMinigameController().ensurePrizeWheelFishTexturesLoaded();
  }

  private destroyPrizeSpinContainer(): void {
    this.aquariumMinigameController().destroyPrizeSpinContainer();
  }

  private nextPrizeRareFish(): FishType {
    return this.aquariumMinigameController().nextPrizeRareFish();
  }

  private nextPrizeFish(rarity: Rarity): FishType {
    return this.aquariumMinigameController().nextPrizeFish(rarity);
  }

  private rewardedAdFishReward(): FishType {
    return this.aquariumMinigameController().rewardedAdFishReward();
  }

  private appendSettingsPage(content: HTMLElement): void {
    this.aquariumSettingsController().appendSettingsPage(content);
  }

  private unlockDeveloperGodMode(): void {
    this.aquariumSettingsController().unlockDeveloperGodMode();
  }

  private toggleDeveloperGodMode(): void {
    this.aquariumSettingsController().toggleDeveloperGodMode();
  }

  private grantDeveloperWallet(): void {
    this.aquariumSettingsController().grantDeveloperWallet();
  }

  private unlockDeveloperContent(): void {
    this.aquariumSettingsController().unlockDeveloperContent();
  }

  private setDeveloperClockMultiplier(multiplier: number): void {
    this.aquariumSettingsController().setDeveloperClockMultiplier(multiplier);
  }

  private gameClockSpeedMultiplier(): number {
    return this.aquariumSettingsController().gameClockSpeedMultiplier();
  }

  private advanceGameClock(realDeltaSeconds: number): void {
    this.aquariumSettingsController().advanceGameClock(realDeltaSeconds);
  }

  private gameClockNow(): number {
    return this.aquariumSettingsController().gameClockNow();
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
    return this.aquariumTankController().tankCosmeticImageUrl(asset);
  }

  private tankCardBackgroundUrl(level: number): string | undefined {
    return this.aquariumTankController().tankCardBackgroundUrl(level);
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
    return this.aquariumTankController().tankNamesFromRecord(source);
  }

  private tankNamesRecord(): Record<string, string> {
    return this.aquariumTankController().tankNamesRecord();
  }

  private tankCosmetics(category: TankCosmeticCategory): TankCosmetic[] {
    return this.aquariumTankController().tankCosmetics(category);
  }

  private tankCosmeticById(category: TankCosmeticCategory, id: string | undefined): TankCosmetic | undefined {
    return this.aquariumTankController().tankCosmeticById(category, id);
  }

  private ownsTankCosmetic(asset: TankCosmetic): boolean {
    return (this.tankCosmeticInventory(asset.category).get(asset.id) ?? 0) > 0;
  }

  private validTankCosmeticId(category: TankCosmeticCategory, id: string | undefined, level = this.tankLevel): string {
    return this.aquariumTankController().validTankCosmeticId(category, id, level);
  }

  private tankCosmeticInventory(category: TankCosmeticCategory, level = this.tankLevel): Map<string, number> {
    const state = this.ensureTankState(level);
    return category === "background" ? state.backgroundInventory : state.seabedInventory;
  }

  private selectedTankCosmeticId(category: TankCosmeticCategory, level = this.tankLevel): string {
    return this.aquariumTankController().selectedTankCosmeticId(category, level);
  }

  private tankStatesFromSave(saved: SavedGame): Map<number, TankRuntimeState> {
    return this.aquariumTankController().tankStatesFromSave(saved);
  }

  private tankStatesRecord(): SavedGame["tank"]["states"] {
    return this.aquariumTankController().tankStatesRecord();
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
    return this.aquariumTankController().tankSummary(level);
  }

  private tankAccentColor(level: number): number {
    return this.aquariumTankController().tankAccentColor(level);
  }

  private switchTank(level: number): void {
    this.coinComboCount = 0;
    this.coinComboCollectedValue = 0;
    this.coinComboLastClaimedAt = 0;
    this.aquariumTankController().switchTank(level);
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
    this.aquariumDecorationController().buyDecoration(decorationType, size);
  }

  private buyDecorationFromStore(decorationTypeId: string, size: DecorationSize): void {
    this.aquariumDecorationController().buyDecorationFromStore(decorationTypeId, size);
    this.storeOverlay?.refresh();
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
    if (!this.canSellFish()) {
      this.floatText("Fish selling unlocks in Phase 3", toastX, toastY, "#d7f4ff");
      return;
    }

    if (this.fish.length === 0) {
      this.floatText("No fish to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    this.showSellConfirmation(0);
  }

  private sellFishByIndex(index: number): void {
    this.aquariumFishInventoryController().sellFishByIndex(index);
  }

  private activeFishSellValue(fish: Fish): number {
    return activeFishSellValueModel(fish);
  }

  private storedFishSellValue(fishType: FishType): number {
    return storedFishSellValueModel(fishType, this.storedFishPowerAgeSeconds(fishType));
  }

  private storedFishSellValueForQuantity(fishType: FishType, quantity: number): number {
    const sellQuantity = Math.max(1, Math.floor(quantity));
    let total = 0;
    for (let index = 0; index < sellQuantity; index += 1) {
      total += storedFishSellValueModel(fishType, 0);
    }
    return total;
  }

  private storedFishPowerAgeSeconds(fishType: FishType): number {
    return this.aquariumFishInventoryController().storedFishPowerAgeSeconds(fishType);
  }

  private removeStoredFish(fishTypeId: string, quantity = 1): void {
    this.aquariumFishInventoryController().removeStoredFish(fishTypeId, quantity);
  }

  private sellStoredFish(fishTypeId: string, quantity = 1): void {
    this.aquariumFishInventoryController().sellStoredFish(fishTypeId, quantity);
  }

  private foodSellValue(foodType: FoodType, storedAmount = this.getFoodInventory(foodType.id)): number {
    return foodSellValueModel({
      foodType,
      storedAmount,
      isCalorieTrackedFood: (foodTypeId) => this.isCalorieTrackedFood(foodTypeId)
    });
  }

  private sellFoodInventory(foodTypeId: FoodTypeId, quantity?: number): void {
    this.aquariumSellController().sellFoodInventory(foodTypeId, quantity);
  }

  private decorationSellValue(decorationType: DecorationType, size: DecorationSize, count?: number): number {
    return this.aquariumDecorationController().decorationSellValue(decorationType, size, count);
  }

  private tankUtilitySellValue(price: Price): number {
    return this.aquariumTankController().tankUtilitySellValue(price);
  }

  private sellDecorationInventory(decorationTypeId: string, size: DecorationSize, quantity?: number): void {
    this.aquariumDecorationController().sellDecorationInventory(decorationTypeId, size, quantity);
  }

  private sellTankUtility(utilityId: TankUtilityId): void {
    this.aquariumSellController().sellTankUtility(utilityId);
  }

  private deactivateSoldUtility(utilityId: TankUtilityId): void {
    if (utilityId === "coin-magnet") {
      this.coinMagnetWasActive = false;
      this.coinMagnetDisplayedMinutes = 0;
      this.magnetCollectingCoins.clear();
    }
    if (utilityId === "auto-food-buyer") {
      this.autoFoodBuyerWasActive = false;
      this.autoFoodBuyerDisplayedMinutes = 0;
    }
  }

  private sellCoinInventory(coinType: "rare" | "superRare", quantity?: number): void {
    this.aquariumSellController().sellCoinInventory(coinType, quantity);
  }

  private coinSellValue(coinType: "rare" | "superRare", count = 1): number {
    return coinSellValueModel(coinType, count);
  }

  private helperSellPrice(creatureType: HelperCreatureType): HelperCreatureType["price"] {
    return helperSellPriceModel(creatureType);
  }

  private sellHelperCreatureByIndex(index: number): void {
    this.aquariumSellController().sellHelperCreatureByIndex(index);
  }

  private removeHelperCreatureAt(index: number): HelperCreature | undefined {
    const [removedHelper] = this.helperCreatures.splice(index, 1);
    if (removedHelper) {
      removedHelper.destroy();
    }
    return removedHelper;
  }

  private breedFish(index: number, force?: "same" | "rare"): void {
    this.aquariumFishInventoryController().breedFish(index, force);
  }

  private removeFishAt(index: number): Fish | undefined {
    const [removedFish] = this.fish.splice(index, 1);
    if (removedFish) {
      removedFish.destroy();
    }
    return removedFish;
  }

  private storeFish(fish: Fish): void {
    this.aquariumFishInventoryController().storeFish(fish);
  }

  private storeFishByIndex(index: number): void {
    this.aquariumFishInventoryController().storeFishByIndex(index);
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
    this.aquariumDecorationController().selectDecoration(decorationTypeId, size);
  }

  private prepareFishPlacement(fishTypeId: string): void {
    this.aquariumFishInventoryController().prepareFishPlacement(fishTypeId);
  }

  private handleTankPointer(pointer: Phaser.Input.Pointer): void {
    handleTankPointerInput({
      pointer,
      activeScreen: this.activeScreen,
      modalOpen: Boolean(this.modal),
      placementMode: this.placementMode,
      pointerDesignPoint: (inputPointer) => this.pointerDesignPoint(inputPointer),
      screenToTankPoint: (designX, designY) => this.screenToTankPoint(designX, designY),
      coinAtPointer: (designX, designY) => this.coinAtPointer(designX, designY),
      collectCoin: (coin, automated) => this.collectCoin(coin, automated),
      questPresentAtPointer: (designX, designY) => this.questPresentAtPointer(designX, designY),
      collectQuestPresent: (present) => this.collectQuestPresent(present),
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
    const minimumTapRadius = 78 / Math.max(0.01, scale);
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

  private questPresentAtPointer(designX: number, designY: number): QuestPresentDrop | undefined {
    if (!this.canManuallyCollectTankPresents() || this.questPresents.length === 0) {
      return undefined;
    }

    const tankPoint = this.screenToTankPoint(designX, designY);
    const scale = this.tankViewScaleForLevel();
    const minimumTapRadius = 44 / Math.max(0.01, scale);
    let nearestPresent: QuestPresentDrop | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const present of this.questPresents) {
      const tapRadius = Math.max(
        minimumTapRadius,
        present.drop.hitZone.width * 0.62,
        present.drop.sprite.displayWidth * 0.82
      );
      const distance = Phaser.Math.Distance.Between(
        tankPoint.x,
        tankPoint.y,
        present.drop.sprite.x,
        present.drop.sprite.y
      );
      if (distance <= tapRadius && distance < nearestDistance) {
        nearestPresent = present.drop;
        nearestDistance = distance;
      }
    }

    return nearestPresent;
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
    return this.aquariumDecorationController().decorationAtTankPoint(designX, designY);
  }

  private installNativeCanvasInputFallback(): void {
    this.nativeCanvasInputCleanup = installAquariumNativeCanvasInputFallback(this);
  }

  private entityController(): AquariumEntityController {
    this.aquariumEntityController ??= new AquariumEntityController(createAquariumEntityControllerAdapter(this));
    return this.aquariumEntityController;
  }

  private addFishToTank(type: FishType, x: number, y: number, options: { gender?: FishGender; tankLevel?: number; ageSeconds?: number; visualAgeSeconds?: number } = {}): Fish {
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

  private addFishToInventory(fishType: FishType, quantity = 1): void {
    this.recentInventoryDockItemKey = "fish-menu:fish-menu";
    this.entityController().addFishToInventory(fishType, quantity);
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
    this.aquariumDecorationController().addDecorationToTank(decoration, x, y, size, tankLevel, depth);
  }

  private tankDecorationDepthFromOrder(index: number): number {
    return this.aquariumDecorationController().tankDecorationDepthFromOrder(index);
  }

  private placeDecorationFromInventory(decoration: DecorationType, size: DecorationSize, x: number, y: number): void {
    this.aquariumDecorationController().placeDecorationFromInventory(decoration, size, x, y);
  }

  private fitDecorationDisplay(image: Phaser.GameObjects.Image, decoration: DecorationType, size: DecorationSize = "m"): void {
    this.aquariumDecorationController().fitDecorationDisplay(image, decoration, size);
  }

  private updateAirStoneBubbles(deltaSeconds: number, activeDecorations: PlacedDecoration[]): void {
    this.entityController().updateAirStoneBubbles(deltaSeconds, activeDecorations);
  }

  private spawnAirStoneBubble(decoration: PlacedDecoration): void {
    this.entityController().spawnAirStoneBubble(decoration);
  }

  private bindDecorationPointerGuard(decoration: PlacedDecoration): void {
    this.aquariumDecorationController().bindDecorationPointerGuard(decoration);
  }

  private startPhaserDecorationHold(decoration: PlacedDecoration, pointer: Phaser.Input.Pointer): void {
    this.aquariumDecorationController().startPhaserDecorationHold(decoration, pointer);
  }

  private beginTankDecorationDrag(decoration: PlacedDecoration): void {
    this.aquariumDecorationController().beginTankDecorationDrag(decoration);
  }

  private updateTankDecorationDragAtDesignPoint(pointerPoint: Phaser.Math.Vector2): void {
    this.aquariumDecorationController().updateTankDecorationDragAtDesignPoint(pointerPoint);
  }

  private endTankDecorationDrag(): void {
    this.aquariumDecorationController().endTankDecorationDrag();
  }

  private beginPhaserDecorationDrag(decoration: PlacedDecoration): void {
    this.aquariumDecorationController().beginPhaserDecorationDrag(decoration);
  }

  private updatePhaserDecorationDrag(pointer: Phaser.Input.Pointer): void {
    this.aquariumDecorationController().updatePhaserDecorationDrag(pointer);
  }

  private endPhaserDecorationDrag(pointer: Phaser.Input.Pointer): void {
    this.aquariumDecorationController().endPhaserDecorationDrag(pointer);
  }

  private moveDecoration(decoration: PlacedDecoration, x: number, y: number): void {
    this.aquariumDecorationController().moveDecoration(decoration, x, y);
  }

  private trashDecoration(decoration: PlacedDecoration): void {
    this.aquariumDecorationController().trashDecoration(decoration);
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

  private restoreServerSave(): void {
    const saved = getBootstrappedSave();
    if (!saved) {
      if (!isFreshStart()) {
        console.warn("[Save] No saved game found on server; starting fresh.");
      }
      return;
    }
    restoreAquariumSceneSave(this as unknown as AquariumScenePersistenceTarget, saved, serverNow());
  }

  private setupRealtimeSubscription(): void {
    subscribeToRemoteSaves((remoteSave: SavedGame) => {
      if (remoteSave.savedAt > (this.lastKnownSaveAt ?? 0) + 1000) {
        this.applyRemoteSave(remoteSave);
      }
    }).then((unsubscribe) => {
      this.unsubscribeRemote = unsubscribe;
    }).catch((err) => {
      console.warn("[Scene] Failed to set up realtime subscription", err);
    });

    setVersionConflictHandler(() => {
      console.warn("[Scene] Version conflict detected, reloading server save");
      this.restoreServerSave();
    });
  }

  private applyRemoteSave(save: SavedGame): void {
    this.scene.pause();
    restoreAquariumSceneSave(this as unknown as AquariumScenePersistenceTarget, save, serverNow());
    this.scene.resume();
  }

  private saveNow(savedAt = serverNow(), immediate = false): void {
    this.lastKnownSaveAt = savedAt;
    this.autosaveElapsed = 0;
    saveAquariumSceneNow(this as unknown as AquariumScenePersistenceTarget, savedAt, immediate);
  }

  private updateFrameKey(): number {
    return (this.game.loop as { frame?: number }).frame ?? Math.floor(this.time.now);
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
      now: this.gameClockNow(),
      coinDropCount: this.coinDrops.length,
      maxCoinDrops,
      minDelayMs: fishCoinProductionMinDelayMs,
      maxDelayMs: fishCoinProductionMaxDelayMs,
      activeProductionPaceMultiplier: this.activeProductionPaceMultiplier() * Phaser.Math.Clamp(activitySpeedMultiplier, 0.001, timeCurrentSpeedMultiplier),
      randomBetween: (min, max) => Phaser.Math.Between(min, max),
      addFishProductionTotal: (tankLevel, value) => this.addFishProductionTotal(tankLevel, value),
      createCoinDrop: (x, y, value, coinType, isMega, options) => this.createCoinDrop(x, y, value, coinType, isMega, options)
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
    return this.aquariumWalletController().createCoinDrop(x, y, value, coinType, isMega, options);
  }

  private makeRoomForCoinDrop(): void {
    this.aquariumWalletController().makeRoomForCoinDrop();
  }

  private trimExcessCoinDrops(): void {
    this.aquariumWalletController().trimExcessCoinDrops();
  }

  private removeOldestCoinDrop(): void {
    this.aquariumWalletController().removeOldestCoinDrop();
  }

  private createQuestPresentDrop(
    questId: string,
    reward: DailyQuestReward,
    rewardLabel = this.dailyQuestRewardLabel(reward),
    options: QuestPresentDropOptions & { id?: string; x?: number; y?: number } = {}
  ): QuestPresentDrop {
    return this.aquariumWalletController().createQuestPresentDrop(questId, reward, rewardLabel, options);
  }

  private visibleCoinBottomDesignY(): number {
    return this.aquariumWalletController().visibleCoinBottomDesignY();
  }

  private setCoinDropVisible(coin: CoinDrop, visible: boolean): void {
    this.aquariumWalletController().setCoinDropVisible(coin, visible);
  }

  private setQuestPresentVisible(present: QuestPresentDrop, visible: boolean): void {
    this.aquariumWalletController().setQuestPresentVisible(present, visible);
  }

  private collectQuestPresent(drop: QuestPresentDrop): void {
    this.aquariumWalletController().collectQuestPresent(drop);
  }

  private showQuestPresentModal(present: { drop: QuestPresentDrop; reward: DailyQuestReward }): void {
    this.aquariumWalletController().showQuestPresentModal(present);
  }

  private claimQuestPresentReward(drop: QuestPresentDrop, display: "modal" | "combo" = "modal"): void {
    this.aquariumWalletController().claimQuestPresentReward(drop, display);
  }

  private collectCoin(coin: CoinDrop, automated: boolean): void {
    this.aquariumWalletController().collectCoin(coin, automated);
  }

  private updateCoinMagnet(): void {
    this.aquariumWalletController().updateCoinMagnet();
  }

  private canManuallyCollectTankCoins(): boolean {
    return this.aquariumWalletController().canManuallyCollectTankCoins();
  }

  private canManuallyCollectTankPresents(): boolean {
    return this.aquariumWalletController().canManuallyCollectTankPresents();
  }

  private syncCoinDropVisibilityAndInput(): void {
    this.aquariumWalletController().syncCoinDropVisibilityAndInput();
  }

  private syncQuestPresentVisibilityAndInput(): void {
    this.aquariumWalletController().syncQuestPresentVisibilityAndInput();
  }

  private useCoinMagnetAtClientPoint(clientX: number, clientY: number, showEmptyMessage: boolean): void {
    this.aquariumWalletController().useCoinMagnetAtClientPoint(clientX, clientY, showEmptyMessage);
  }

  private useCoinMagnetAt(x: number, y: number, showEmptyMessage = true): void {
    this.aquariumWalletController().useCoinMagnetAt(x, y, showEmptyMessage);
  }

  private pullCoinToMagnet(coinToCollect: CoinDrop, x: number, y: number): void {
    this.aquariumWalletController().pullCoinToMagnet(coinToCollect, x, y);
  }

  private coinMagnetTankPosition(): Phaser.Math.Vector2 {
    return this.aquariumWalletController().coinMagnetTankPosition();
  }

  private coinMagnetRayY(): number {
    return this.aquariumWalletController().coinMagnetRayY();
  }

  private coinMagnetRayPoint(): Phaser.Math.Vector2 {
    return this.aquariumWalletController().coinMagnetRayPoint();
  }

  private autoFoodBuyerTankPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      tankBounds.left,
      Phaser.Math.Clamp(this.autoFoodBuyerY, this.foodDispenserMinY(), this.foodDispenserMaxY())
    );
  }

  private playSfx(key: string, config: Phaser.Types.Sound.SoundConfig = {}): void {
    this.aquariumSettingsController().playSfx(key, config);
  }

  private syncBackgroundMusic(): void {
    this.aquariumSettingsController().syncBackgroundMusic();
  }

  private removeFood(food: FoodPellet): void {
    this.foods = this.foods.filter((item) => item !== food);
    this.recycleFoodPellet(food);
  }

  private recycleFoodPellet(food: FoodPellet): void {
    food.deactivate();
    if (this.foodPelletPool.length < maxFoodDrops) {
      this.foodPelletPool.push(food);
    } else {
      food.destroy();
    }
  }

  private assignFoodsToFish(tankFish: Fish[]): Map<Fish, FoodPellet[]> {
    this.reusableFoodAssignments.clear();
    if (this.foods.length === 0 || tankFish.length === 0) {
      return this.reusableFoodAssignments;
    }

    for (const food of this.foods) {
      for (const currentFish of tankFish) {
        if (!currentFish.canChaseFood(food)) {
          continue;
        }

        const fishFoods = this.reusableFoodAssignments.get(currentFish);
        if (fishFoods) {
          fishFoods.push(food);
        } else {
          this.reusableFoodAssignments.set(currentFish, [food]);
        }
      }
    }

    return this.reusableFoodAssignments;
  }

  private removeExpiredFood(): void {
    const expiredFoods = this.foods.filter((food) => food.isExpired());
    if (expiredFoods.length === 0) {
      return;
    }

    this.foods = this.foods.filter((food) => !food.isExpired());
    for (const food of expiredFoods) {
      this.refundUnusedFood(food);
      this.recycleFoodPellet(food);
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
    this.aquariumMenuController().refreshUi(renderControls);
  }

  private refreshStatus(): void {
    this.hudStatusSyncElapsed = 0;
    this.syncHtmlHud();
  }

  private getCareStatusLabel(): string {
    return this.aquariumWalletController().getCareStatusLabel();
  }

  private tankHudSnapshotText(): string {
    return this.aquariumWalletController().tankHudSnapshotText();
  }

  private tankStatusSnapshotText(): string {
    return this.aquariumWalletController().tankStatusSnapshotText();
  }

  private tankCareSnapshotText(): string {
    return this.aquariumWalletController().tankCareSnapshotText();
  }

  private syncCleanlinessUi(): void {
    this.syncHtmlHud();
  }

  private getHudNeedLabel(): string {
    return this.aquariumHudController().getHudNeedLabel();
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
    return this.aquariumDecorationController().decorationInventoryKey(decorationTypeId, size);
  }

  private sanitizeDecorationSize(size: string | undefined): DecorationSize {
    return this.aquariumDecorationController().sanitizeDecorationSize(size);
  }

  private decorationVariantPrice(decorationType: DecorationType, size: DecorationSize): Price {
    return this.aquariumDecorationController().decorationVariantPrice(decorationType, size);
  }

  private getDecorationInventory(decorationTypeId: string, size: DecorationSize = "m"): number {
    return this.aquariumDecorationController().getDecorationInventory(decorationTypeId, size);
  }

  private consumeStoredDecoration(decorationTypeId: string, size: DecorationSize): void {
    this.aquariumDecorationController().consumeStoredDecoration(decorationTypeId, size);
  }

  private getPlacedDecorationCount(decorationTypeId: string, size: DecorationSize, level = this.tankLevel): number {
    return this.aquariumDecorationController().getPlacedDecorationCount(decorationTypeId, size, level);
  }

  private getOwnedDecorationCount(decorationTypeId: string, size: DecorationSize, level = this.tankLevel): number {
    return this.aquariumDecorationController().getOwnedDecorationCount(decorationTypeId, size, level);
  }

  private clearStoredDecorationInventory(decorationTypeId: string, size: DecorationSize): void {
    this.aquariumDecorationController().clearStoredDecorationInventory(decorationTypeId, size);
  }

  private removeStoredDecorationInventory(decorationTypeId: string, size: DecorationSize, quantity: number): number {
    return this.aquariumDecorationController().removeStoredDecorationInventory(decorationTypeId, size, quantity);
  }

  private removePlacedDecorationsFromActiveTank(decorationTypeId: string, size: DecorationSize, quantity = Number.POSITIVE_INFINITY): number {
    return this.aquariumDecorationController().removePlacedDecorationsFromActiveTank(decorationTypeId, size, quantity);
  }

  private removeAllPlacedDecorationsFromActiveTank(): void {
    this.aquariumDecorationController().removeAllPlacedDecorationsFromActiveTank();
  }

  private hasFoodDispenser(): boolean {
    return (this.decorationInventory.get(foodDispenserInventoryKey) ?? 0) > 0;
  }

  private hasCoinMagnet(): boolean {
    return this.aquariumWalletController().hasCoinMagnet();
  }

  private hasAutoFoodBuyer(): boolean {
    return this.autoFoodBuyerExpiresAt() > serverNow();
  }

  private coinMagnetExpiresAt(): number {
    return this.aquariumWalletController().coinMagnetExpiresAt();
  }

  private autoFoodBuyerExpiresAt(): number {
    return utilityExpiresAt(this.decorationInventory, autoFoodBuyerInventoryKey);
  }

  private coinMagnetRemainingMinutes(): number {
    return this.aquariumWalletController().coinMagnetRemainingMinutes();
  }

  private autoFoodBuyerRemainingMinutes(): number {
    return activeUtilityRemainingMinutes(this.autoFoodBuyerExpiresAt());
  }

  private resolveCoinCombo(): void {
    this.aquariumWalletController().resolveCoinCombo();
  }

  private tankUtilityInfo(utilityId: TankUtilityId): { name: string; price: Price; inventoryKey: string; owned: () => boolean } | undefined {
    return this.aquariumTankController().tankUtilityInfo(utilityId);
  }

  private tankUtilityIconPath(utilityId: TankUtilityId): string {
    return this.aquariumTankController().tankUtilityIconPath(utilityId);
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
    return this.aquariumTankController().tankPriceForLevel(targetLevel);
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
      this.recycleFoodPellet(food);
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
    this.aquariumDecorationController().refreshDecorationTankVisibility();
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
    return this.aquariumTankController().calculateTankNetWorth(level);
  }

  private tankDisplayLevel(level = this.tankLevel): number {
    return this.aquariumTankController().tankDisplayLevel(level);
  }

  private projectedActiveProductionPerMinute(): number {
    return this.activeFish()
      .filter((fish) => fish.state !== "ill" && fish.health >= 35 && fish.currentFullnessCalories() > 0)
      .reduce((total, fish) => total + fish.projectedProductionPerMinute(), 0);
  }

  private activeProductionPaceMultiplier(): number {
    const frame = this.updateFrameKey();
    if (this.activeProductionPaceMultiplierFrame === frame) {
      return this.activeProductionPaceMultiplierValue;
    }

    const projectedPerMinute = this.projectedActiveProductionPerMinute();
    if (projectedPerMinute <= 0) {
      this.activeProductionPaceMultiplierFrame = frame;
      this.activeProductionPaceMultiplierValue = 1;
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
    const multiplier = Phaser.Math.Clamp(baseMultiplier * catchUpMultiplier, 1, maxDynamicProductionPaceMultiplier);
    this.activeProductionPaceMultiplierFrame = frame;
    this.activeProductionPaceMultiplierValue = multiplier;
    return multiplier;
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
      this.grantLevelCompletionBonusRewards(state, bonusRewards);
      rewardFish.forEach((fishType) => this.addFishToInventory(fishType));
      this.showLevelCompletionRewardModal(previousLevel, nextLevel, rewardFish, bonusRewards);
      this.refreshUi();
      this.storeOverlay?.refresh();
      this.saveNow();
    } else {
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

  private levelCompletionBonusRewardCards(rewards: LevelCompletionBonusReward): LevelCompletionRewardCard[] {
    const cards: LevelCompletionRewardCard[] = [];
    if (rewards.coins) {
      cards.push({
        title: formatPrice(rewards.coins),
        detail: "Coins",
        imageUrl: coinAssetPathByType[rewards.coins.coinType],
        imageClassName: "coin"
      });
    }
    if (rewards.background) {
      cards.push({
        title: rewards.background.name,
        detail: "Background",
        imageUrl: this.tankCosmeticImageUrl(rewards.background) ?? aquariumBackgroundAssetPath,
        imageClassName: "background"
      });
    }
    if (rewards.seabed) {
      cards.push({
        title: rewards.seabed.name,
        detail: "Sand",
        imageUrl: this.tankCosmeticImageUrl(rewards.seabed) ?? aquariumFloorAssetPath,
        imageClassName: "sand"
      });
    }
    if (rewards.decoration) {
      cards.push({
        title: `${rewards.decoration.decorationType.name} ${decorationSizes[rewards.decoration.size].label}`,
        detail: "Decor",
        imageUrl: `/assets/decorations/${rewards.decoration.decorationType.id}.png`,
        imageClassName: "decor"
      });
    }
    return cards;
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
    return Math.round(this.cleanliness) < 50 || this.phaseThreeCleanQuestActive();
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
        this.cleanedAt = serverNow();
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

  private dailyQuestItems(): DailyQuestItem[] {
    this.prepareQuestPhaseState();
    return buildDailyQuestItems({
      questReward: coinQuestReward(this.currentProductionMinuteQuestReward()),
      fishQuestReward: this.fishQuestReward(),
      actionCount: (action) => this.dailyQuestActionCount(action),
      fishPurchaseCount: (coinType) => this.todayFishPurchaseCount(coinType),
      phaseOneComplete: () => this.phaseOneComplete(),
      phaseTwoStarted: () => this.phaseTwoStarted(),
      phaseTwoComplete: () => this.phaseTwoComplete(),
      phaseThreeStarted: () => this.phaseThreeStarted(),
      walletCommon: () => this.wallet.common,
      activeFishCount: () => this.activeFish().length,
      storedFishCount: () => this.totalStoredFishCount(),
      feedableFoodInventory: () => this.getTotalFeedableFoodInventory(),
      medicineInventory: () => this.getFoodInventory(medicineFoodTypeId),
      sickFishCount: () => this.sickFishCount(),
      coinDropCount: () => this.coinDrops.length,
      ownsNewBackground: () => this.ownsPhaseTwoBackground(),
      ownsNewSeabed: () => this.ownsPhaseTwoSeabed(),
      ownsPhaseTwoDecoration: () => this.ownsPhaseTwoDecoration()
    });
  }

  private prepareQuestPhaseState(): void {
    this.aquariumQuestPhaseController().prepareQuestPhaseState();
  }

  private phaseOneComplete(): boolean {
    return this.aquariumQuestPhaseController().phaseOneComplete();
  }

  private phaseTwoStarted(): boolean {
    return this.aquariumQuestPhaseController().phaseTwoStarted();
  }

  private phaseTwoComplete(): boolean {
    return this.aquariumQuestPhaseController().phaseTwoComplete();
  }

  private phaseThreeStarted(): boolean {
    return this.aquariumQuestPhaseController().phaseThreeStarted();
  }

  private canSellFish(): boolean {
    return this.aquariumQuestPhaseController().canSellFish();
  }

  private phaseThreeCleanQuestActive(): boolean {
    return this.aquariumQuestPhaseController().phaseThreeCleanQuestActive();
  }

  private sickFishCount(): number {
    return this.aquariumQuestPhaseController().sickFishCount();
  }

  private phaseTwoBackground(): TankCosmetic | undefined {
    return this.aquariumQuestPhaseController().phaseTwoBackground();
  }

  private phaseTwoSeabed(): TankCosmetic | undefined {
    return this.aquariumQuestPhaseController().phaseTwoSeabed();
  }

  private phaseTwoDecoration(): DecorationType | undefined {
    return this.aquariumQuestPhaseController().phaseTwoDecoration();
  }

  private ownsPhaseTwoDecoration(): boolean {
    return this.aquariumQuestPhaseController().ownsPhaseTwoDecoration();
  }

  private ownsPhaseTwoBackground(): boolean {
    return this.aquariumQuestPhaseController().ownsPhaseTwoBackground();
  }

  private ownsPhaseTwoSeabed(): boolean {
    return this.aquariumQuestPhaseController().ownsPhaseTwoSeabed();
  }

  private grantPhaseTwoStarterItems(): void {
    this.aquariumQuestPhaseController().grantPhaseTwoStarterItems();
  }

  private dailyGoalUnclaimedCount(): number {
    return this.aquariumQuestPhaseController().dailyGoalUnclaimedCount();
  }

  private phaseOneShopLimitActive(): boolean {
    return this.aquariumQuestPhaseController().phaseOneShopLimitActive();
  }

  private phaseTwoTankMenuLimitActive(): boolean {
    return this.aquariumQuestPhaseController().phaseTwoTankMenuLimitActive();
  }

  private isDailyQuestComplete(quest: DailyQuestItem): boolean {
    return this.aquariumQuestPhaseController().isDailyQuestComplete(quest);
  }

  private visibleDailyQuestItems(): DailyQuestItem[] {
    let quests = this.dailyQuestItems();
    const readyQuests = quests.filter((quest) => quest.complete && !this.dailyGoals.claimed.includes(quest.id));
    if (readyQuests.length > 0) {
      readyQuests.forEach((quest) => this.dropDailyQuestPresent(quest, false));
      quests = this.dailyQuestItems();
    }
    const previousActiveIds = this.dailyGoals.activeQuestIds?.join("|") ?? "";
    this.dailyGoals = ensureActiveDailyQuestItemsModel(this.dailyGoals, quests);
    const nextActiveIds = this.dailyGoals.activeQuestIds?.join("|") ?? "";
    if (readyQuests.length > 0 || previousActiveIds !== nextActiveIds) {
      this.saveNow();
    }
    return visibleDailyQuestItemsModel(this.dailyGoals, quests);
  }

  private currentProductionMinuteQuestReward(): Price {
    return this.aquariumDailyGoalsController().currentProductionMinuteQuestReward();
  }

  private fishQuestReward(): DailyQuestReward {
    return this.aquariumDailyGoalsController().fishQuestReward();
  }

  private rareQuestReward(): Price {
    return this.aquariumDailyGoalsController().rareQuestReward();
  }

  private superRareQuestReward(): Price {
    return this.aquariumDailyGoalsController().superRareQuestReward();
  }

  private dailyQuestActionCount(action: string): number {
    return this.aquariumDailyGoalsController().dailyQuestActionCount(action);
  }

  private todayFishPurchaseCount(coinType?: CoinType): number {
    return this.aquariumDailyGoalsController().todayFishPurchaseCount(coinType);
  }

  private recentFishPurchaseCount(coinType?: CoinType, now = serverNow()): number {
    return this.aquariumDailyGoalsController().recentFishPurchaseCount(coinType, now);
  }

  private hourlyFishPurchaseLimit(): number {
    return this.aquariumDailyGoalsController().hourlyFishPurchaseLimit();
  }

  private canBuyAnotherFishThisHour(): boolean {
    return this.aquariumDailyGoalsController().canBuyAnotherFishThisHour();
  }

  private fishPurchaseRestockLabel(now = serverNow()): string {
    return this.aquariumDailyGoalsController().fishPurchaseRestockLabel(now);
  }

  private recentGrowthTonicPurchaseCount(now = serverNow()): number {
    return this.aquariumDailyGoalsController().recentGrowthTonicPurchaseCount(now);
  }

  private canBuyGrowthTonicThisHour(): boolean {
    return this.aquariumDailyGoalsController().canBuyGrowthTonicThisHour();
  }

  private growthTonicPurchaseRestockLabel(now = serverNow()): string {
    return this.aquariumDailyGoalsController().growthTonicPurchaseRestockLabel(now);
  }

  private recordGrowthTonicPurchase(): void {
    this.aquariumDailyGoalsController().recordGrowthTonicPurchase();
  }

  private recentProductionBoostPurchaseCount(now = serverNow()): number {
    return this.aquariumDailyGoalsController().recentProductionBoostPurchaseCount(now);
  }

  private canBuyProductionBoostNow(): boolean {
    return this.aquariumDailyGoalsController().canBuyProductionBoostNow();
  }

  private productionBoostPurchaseRestockLabel(now = serverNow()): string {
    return this.aquariumDailyGoalsController().productionBoostPurchaseRestockLabel(now);
  }

  private recordProductionBoostPurchase(): void {
    this.aquariumDailyGoalsController().recordProductionBoostPurchase();
  }

  private recentTimeCurrentPurchaseCount(now = serverNow()): number {
    return this.aquariumDailyGoalsController().recentTimeCurrentPurchaseCount(now);
  }

  private canBuyTimeCurrentNow(): boolean {
    return this.aquariumDailyGoalsController().canBuyTimeCurrentNow();
  }

  private timeCurrentPurchaseRestockLabel(now = serverNow()): string {
    return this.aquariumDailyGoalsController().timeCurrentPurchaseRestockLabel(now);
  }

  private recordTimeCurrentPurchase(): void {
    this.aquariumDailyGoalsController().recordTimeCurrentPurchase();
  }

  private recordFishPurchase(fishType: FishType): void {
    this.aquariumDailyGoalsController().recordFishPurchase(fishType);
  }

  private recordDailyQuestAction(action: string): void {
    this.aquariumDailyGoalsController().recordDailyQuestAction(action);
  }

  private claimDailyGoal(id: string, complete: boolean): void {
    this.aquariumDailyGoalsController().claimDailyGoal(id, complete);
  }

  private showQuestRewardModal(quest: DailyQuestItem): void {
    this.aquariumDailyGoalsController().showQuestRewardModal(quest);
  }

  private finishClaimDailyGoal(quest: DailyQuestItem): void {
    this.aquariumDailyGoalsController().finishClaimDailyGoal(quest);
  }

  private claimAllDailyGoals(): void {
    this.aquariumDailyGoalsController().claimAllDailyGoals();
  }

  private autoDropCompletedDailyQuestPresents(): void {
    this.aquariumDailyGoalsController().autoDropCompletedDailyQuestPresents();
  }

  private dropDailyQuestPresent(quest: DailyQuestItem, notify = true): void {
    this.aquariumDailyGoalsController().dropDailyQuestPresent(quest, notify);
  }

  private markDailyGoalClaimed(quest: DailyQuestItem): boolean {
    return this.aquariumDailyGoalsController().markDailyGoalClaimed(quest);
  }

  private grantDailyQuestReward(reward: DailyQuestReward): void {
    this.aquariumDailyGoalsController().grantDailyQuestReward(reward);
  }

  private questRewardImageUrl(reward: DailyQuestReward): string {
    return this.aquariumDailyGoalsController().questRewardImageUrl(reward);
  }

  private dailyQuestRewardLabel(reward: DailyQuestReward): string {
    return this.aquariumDailyGoalsController().dailyQuestRewardLabel(reward);
  }

  private localDateKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private oldestActiveFish(): Fish | undefined {
    return this.activeFish().reduce<Fish | undefined>(
      (oldest, fish) => (!oldest || fish.ageSeconds > oldest.ageSeconds ? fish : oldest),
      undefined
    );
  }

  private toggleSetting(key: keyof typeof this.settings): void {
    this.aquariumSettingsController().toggleSetting(key);
  }

  private setMusicVolume(value: number, persist: boolean): void {
    this.aquariumSettingsController().setMusicVolume(value, persist);
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
    this.aquariumFishInventoryController().showSellConfirmation(index);
  }

  private showStoredFishSellConfirmation(fishTypeId: string): void {
    this.aquariumFishInventoryController().showStoredFishSellConfirmation(fishTypeId);
  }

  private showFishFusionModal(preselectedKeys: Iterable<string> = []): void {
    this.aquariumFishInventoryController().showFishFusionModal(preselectedKeys);
  }

  private fishFusionSources(): FishFusionSource[] {
    return this.aquariumFishInventoryController().fishFusionSources();
  }

  private fishFusionResultTypes(sources: FishFusionSource[]): { normal?: FishType; premium?: FishType } {
    return this.aquariumFishInventoryController().fishFusionResultTypes(sources);
  }

  private fishFusionSourceSellValue(source: FishFusionSource): number {
    return this.aquariumFishInventoryController().fishFusionSourceSellValue(source);
  }

  private fishFusionCostFor(sources: FishFusionSource[]): Price {
    return this.aquariumFishInventoryController().fishFusionCostFor(sources);
  }

  private areFishFusionSourcesAvailable(sources: FishFusionSource[]): boolean {
    return this.aquariumFishInventoryController().areFishFusionSourcesAvailable(sources);
  }

  private fishFusionChancesFor(sources: FishFusionSource[], hasPremium: boolean): FishFusionChances {
    return this.aquariumFishInventoryController().fishFusionChancesFor(sources, hasPremium);
  }

  private consumeFishFusionSources(sources: FishFusionSource[]): void {
    this.aquariumFishInventoryController().consumeFishFusionSources(sources);
  }

  private ownedFishTypeIds(): Set<string> {
    return this.aquariumFishInventoryController().ownedFishTypeIds();
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
    return this.aquariumFishInventoryController().storedFishAgesFor(fishTypeId);
  }

  private addStoredFishAge(fishTypeId: string, ageSeconds: number): void {
    this.aquariumFishInventoryController().addStoredFishAge(fishTypeId, ageSeconds);
  }

  private takeStoredFishAge(fishTypeId: string): number {
    return this.aquariumFishInventoryController().takeStoredFishAge(fishTypeId);
  }

  private setStoredFishAges(fishTypeId: string, ages: number[]): void {
    this.aquariumFishInventoryController().setStoredFishAges(fishTypeId, ages);
  }

  private trimStoredFishAges(fishTypeId: string): void {
    this.aquariumFishInventoryController().trimStoredFishAges(fishTypeId);
  }

  private fusionAgeLabel(ageSeconds: number): string {
    return this.aquariumFishInventoryController().fusionAgeLabel(ageSeconds);
  }

  private showFoodSellConfirmation(foodTypeId: FoodTypeId): void {
    this.aquariumSellController().showFoodSellConfirmation(foodTypeId);
  }

  private showDecorationSellConfirmation(decorationTypeId: string, size: DecorationSize): void {
    this.aquariumDecorationController().showDecorationSellConfirmation(decorationTypeId, size);
  }

  private showTankUtilitySellConfirmation(utilityId: TankUtilityId): void {
    this.aquariumSellController().showTankUtilitySellConfirmation(utilityId);
  }

  private showCoinSellConfirmation(coinType: "rare" | "superRare"): void {
    this.aquariumSellController().showCoinSellConfirmation(coinType);
  }

  private showHelperSellConfirmation(index: number): void {
    this.aquariumSellController().showHelperSellConfirmation(index);
  }

  private showOfflineSummary(): void {
    this.aquariumSettingsController().showOfflineSummary();
  }

  private showResetConfirmation(): void {
    this.aquariumSettingsController().showResetConfirmation();
  }

  private showModalContent(content: ModalContent): void {
    this.showModal(content.title, content.lines, content.actions, content.bodyElements);
  }

  private showModal(title: string, lines: string[], actions: ModalAction[], bodyElements?: HTMLElement[]): void {
    this.closeModal(true);
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
    this.closeModal(true);
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
      bonusRewards: this.levelCompletionBonusRewardCards(bonusRewards),
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

  private closeModal(immediate = false): void {
    this.cancelPendingFusion();
    const modal = this.modal;
    if (modal) {
      if (immediate) {
        modal.remove();
      } else {
        removeWithModalExit(modal);
      }
    }
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
