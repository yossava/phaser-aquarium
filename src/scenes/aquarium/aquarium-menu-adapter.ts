import type Phaser from "phaser";
import type { AquariumMenuControllerHost } from "./aquarium-menu-controller";
import type { AquariumSceneCore } from "./AquariumSceneCore";
import type {
  AppScreen,
  InventoryTab,
  PlacementMode,
  TankMenuTab
} from "./aquarium-scene-config";
import type { MakeupDraft } from "../../game/makeup-mode";
import type { DecorationSize } from "../../game/tank-catalog";
import type { FishType, FoodType, HelperCreatureType, Wallet } from "../../types/mechanics";
import type { StoreOverlay, StoreOverlayState } from "../../ui/StoreOverlay";

type MenuAdapterScene = Phaser.Scene & {
  activeScreen: AppScreen;
  pageReturnScreen?: AppScreen;
  forceNextPageTransition: boolean;
  placementMode: PlacementMode;
  inventoryTab: InventoryTab;
  inventoryDrillOpen: boolean;
  tankMenuTab: TankMenuTab;
  tankMenuDrillOpen: boolean;
  tankMenuPage: number;
  makeupDraft?: MakeupDraft;
  makeupDraggedDecoration?: import("../../game/makeup-mode").MakeupDecorationDraft;
  makeupBackgroundScrollLeft: number;
  makeupDecorScrollLeft: number;
  reefDropPauseToken: number;
  bubblePopPauseToken: number;
  prizeSpinInProgress: boolean;
  storeOverlay?: StoreOverlay;
  storeRefreshElapsed: number;
  storeCooldownStateKey: string;
  htmlPageOverlay?: HTMLDivElement;
  htmlPageOverlayScrollTop: number;
  htmlPageOverlayRenderKey: string;
  tankMenuOverlay?: HTMLDivElement;
  tankMenuOverlayStateKey: string;
  gameHudOverlay?: HTMLDivElement;
  htmlFoodDock?: HTMLDivElement;
  makeupOverlay?: HTMLDivElement;
  screenButtons: Phaser.GameObjects.Container[];

  ensureAquariumSceneRunning: () => void;
  startPausedTankEarnings: () => void;
  settlePausedTankEarnings: () => void;
  closeModal: (skipAnimation?: boolean) => void;
  syncCoinDropVisibilityAndInput: () => void;
  createFoodDock: () => void;
  autoDropCompletedDailyQuestPresents: () => void;
  removeReefDropScene: () => void;
  removeBubblePopScene: () => void;
  cancelPendingFusion: () => void;
  destroyPrizeSpinContainer: () => void;
  destroyMakeupDraft: () => void;
  syncMakeupPresentation: () => void;
  layoutTankBackground: () => void;
  layoutTankFloor: () => void;
  refreshStatus: () => void;
  floatText: (message: string, x: number, y: number, color: string) => void;

  storeOverlayState: () => StoreOverlayState;
  showFishBuyQuantityModal: (fishType: FishType) => void;
  showFoodBuyQuantityModal: (foodType: FoodType, quantity: number) => void;
  buyHelperCreature: (creatureType: HelperCreatureType) => void;
  buyTankCosmeticFromStore: (category: "background" | "seabed", id: string) => void;
  useTankCosmeticFromStore: (category: "background" | "seabed", id: string) => void;
  buyDecorationFromStore: (decorationId: string, size: DecorationSize) => void;
  selectDecoration: (decorationId: string, size: DecorationSize) => void;
  buyTankUtility: (utilityId: string) => void;

  createMakeupDraft: () => MakeupDraft;
  syncMakeupOverlay: () => void;

  activeFish: () => import("../../objects/Fish").Fish[];
  activeHelperCreatures: () => import("../../objects/HelperCreature").HelperCreature[];
  activeFishProductionPerMinute: () => number;
  wallet: Wallet;
  recordDailyQuestAction: (action: string) => void;
  saveNow: () => void;

  createHtmlPage: () => HTMLElement;
  createTankMenuOverlay: () => HTMLDivElement;

  settings: { reducedMotion: boolean };
  htmlButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;

  syncTankFrameCssVars: () => void;
  syncTankSceneVisibility: () => void;
  syncTankMenuOverlay: () => void;
  syncHtmlHud: () => void;
  syncHtmlFoodDock: () => void;
};

export function createAquariumMenuControllerHost(scene: AquariumSceneCore): AquariumMenuControllerHost {
  const s = scene as unknown as MenuAdapterScene;

  return {
    scene: s,

    // Active screen state
    getActiveScreen: () => s.activeScreen,
    setActiveScreen: (screen) => {
      s.activeScreen = screen;
    },
    getPageReturnScreen: () => s.pageReturnScreen,
    setPageReturnScreen: (screen) => {
      s.pageReturnScreen = screen;
    },
    getForceNextPageTransition: () => s.forceNextPageTransition,
    setForceNextPageTransition: (value) => {
      s.forceNextPageTransition = value;
    },

    // Placement mode
    getPlacementMode: () => s.placementMode,
    setPlacementMode: (mode) => {
      s.placementMode = mode;
    },

    // Inventory / tab state
    getInventoryTab: () => s.inventoryTab,
    setInventoryTab: (tab) => {
      s.inventoryTab = tab;
    },
    getInventoryDrillOpen: () => s.inventoryDrillOpen,
    setInventoryDrillOpen: (value) => {
      s.inventoryDrillOpen = value;
    },
    getTankMenuTab: () => s.tankMenuTab,
    setTankMenuTab: (tab) => {
      s.tankMenuTab = tab;
    },
    getTankMenuDrillOpen: () => s.tankMenuDrillOpen,
    setTankMenuDrillOpen: (value) => {
      s.tankMenuDrillOpen = value;
    },
    getTankMenuPage: () => s.tankMenuPage,
    setTankMenuPage: (page) => {
      s.tankMenuPage = page;
    },

    // Makeup state
    getMakeupDraft: () => s.makeupDraft,
    setMakeupDraft: (draft) => {
      s.makeupDraft = draft;
    },
    getMakeupDraggedDecoration: () => s.makeupDraggedDecoration,
    setMakeupDraggedDecoration: (decoration) => {
      s.makeupDraggedDecoration = decoration;
    },
    getMakeupBackgroundScrollLeft: () => s.makeupBackgroundScrollLeft,
    setMakeupBackgroundScrollLeft: (value) => {
      s.makeupBackgroundScrollLeft = value;
    },
    getMakeupDecorScrollLeft: () => s.makeupDecorScrollLeft,
    setMakeupDecorScrollLeft: (value) => {
      s.makeupDecorScrollLeft = value;
    },

    // Pause tokens
    getReefDropPauseToken: () => s.reefDropPauseToken,
    setReefDropPauseToken: (token) => {
      s.reefDropPauseToken = token;
    },
    getBubblePopPauseToken: () => s.bubblePopPauseToken,
    setBubblePopPauseToken: (token) => {
      s.bubblePopPauseToken = token;
    },

    // Prize spin
    getPrizeSpinInProgress: () => s.prizeSpinInProgress,
    setPrizeSpinInProgress: (value) => {
      s.prizeSpinInProgress = value;
    },

    // Store overlay
    getStoreOverlay: () => s.storeOverlay,
    setStoreOverlay: (overlay) => {
      s.storeOverlay = overlay;
    },
    refreshStoreOverlay: () => s.storeOverlay?.refresh(),
    getStoreRefreshElapsed: () => s.storeRefreshElapsed,
    setStoreRefreshElapsed: (value) => {
      s.storeRefreshElapsed = value;
    },
    getStoreCooldownStateKey: () => s.storeCooldownStateKey,
    setStoreCooldownStateKey: (key) => {
      s.storeCooldownStateKey = key;
    },

    // Page overlay
    getHtmlPageOverlay: () => s.htmlPageOverlay,
    setHtmlPageOverlay: (overlay) => {
      s.htmlPageOverlay = overlay;
    },
    getHtmlPageOverlayScrollTop: () => s.htmlPageOverlayScrollTop,
    setHtmlPageOverlayScrollTop: (value) => {
      s.htmlPageOverlayScrollTop = value;
    },
    getHtmlPageOverlayRenderKey: () => s.htmlPageOverlayRenderKey,
    setHtmlPageOverlayRenderKey: (key) => {
      s.htmlPageOverlayRenderKey = key;
    },

    // Tank menu overlay
    getTankMenuOverlay: () => s.tankMenuOverlay,
    setTankMenuOverlay: (overlay) => {
      s.tankMenuOverlay = overlay;
    },
    getTankMenuOverlayStateKey: () => s.tankMenuOverlayStateKey,
    setTankMenuOverlayStateKey: (key) => {
      s.tankMenuOverlayStateKey = key;
    },

    // Game HUD / food dock
    getGameHudOverlay: () => s.gameHudOverlay,
    getHtmlFoodDock: () => s.htmlFoodDock,

    // Makeup overlay
    getMakeupOverlay: () => s.makeupOverlay,
    setMakeupOverlay: (overlay) => {
      s.makeupOverlay = overlay;
    },

    // Screen buttons
    getScreenButtons: () => s.screenButtons,
    setScreenButtons: (buttons) => {
      s.screenButtons = buttons;
    },

    // Core coordination methods
    ensureAquariumSceneRunning: () => s.ensureAquariumSceneRunning(),
    startPausedTankEarnings: () => s.startPausedTankEarnings(),
    settlePausedTankEarnings: () => s.settlePausedTankEarnings(),
    closeModal: (skipAnimation) => s.closeModal(skipAnimation),
    syncCoinDropVisibilityAndInput: () => s.syncCoinDropVisibilityAndInput(),
    createFoodDock: () => s.createFoodDock(),
    autoDropCompletedDailyQuestPresents: () => s.autoDropCompletedDailyQuestPresents(),
    removeReefDropScene: () => s.removeReefDropScene(),
    removeBubblePopScene: () => s.removeBubblePopScene(),
    cancelPendingFusion: () => s.cancelPendingFusion(),
    destroyPrizeSpinContainer: () => s.destroyPrizeSpinContainer(),
    destroyMakeupDraft: () => s.destroyMakeupDraft(),
    syncMakeupPresentation: () => s.syncMakeupPresentation(),
    layoutTankBackground: () => s.layoutTankBackground(),
    layoutTankFloor: () => s.layoutTankFloor(),
    refreshStatus: () => s.refreshStatus(),
    floatText: (message, x, y, color) => s.floatText(message, x, y, color),

    // Scene management
    sceneRemove: (key) => s.scene.remove(key),
    sceneAdd: (key, sceneConfig, autoStart) => s.scene.add(key, sceneConfig as Phaser.Scene, autoStart),
    sceneLaunch: (key, data) => s.scene.launch(key, data as object | undefined),
    sceneBringToTop: (key) => s.scene.bringToTop(key),
    scenePause: (key) => s.scene.pause(key),
    sceneResume: (key) => s.scene.resume(key),
    sceneSetVisible: (visible, key) => s.scene.setVisible(visible, key),
    sceneSetActive: (active, key) => s.scene.setActive(active, key),
    timeDelayedCall: (delay, callback) => s.time.delayedCall(delay, callback),

    // Store overlay creation
    storeOverlayState: () => s.storeOverlayState(),
    showFishBuyQuantityModal: (fishType) => s.showFishBuyQuantityModal(fishType),
    showFoodBuyQuantityModal: (foodType, quantity) => s.showFoodBuyQuantityModal(foodType, quantity),
    buyHelperCreature: (creatureType) => s.buyHelperCreature(creatureType),
    buyTankCosmeticFromStore: (category, id) => s.buyTankCosmeticFromStore(category, id),
    useTankCosmeticFromStore: (category, id) => s.useTankCosmeticFromStore(category, id),
    buyDecorationFromStore: (decorationId, size) => s.buyDecorationFromStore(decorationId, size),
    selectDecoration: (decorationId, size) => s.selectDecoration(decorationId, size),
    buyTankUtility: (utilityId) => s.buyTankUtility(utilityId),

    // Makeup helpers
    createMakeupDraft: () => s.createMakeupDraft(),
    syncMakeupOverlay: () => s.syncMakeupOverlay(),

    // Minigame helpers
    activeFish: () => s.activeFish(),
    activeHelperCreatures: () => s.activeHelperCreatures(),
    activeFishProductionPerMinute: () => s.activeFishProductionPerMinute(),
    getWallet: () => s.wallet,
    recordDailyQuestAction: (action) => s.recordDailyQuestAction(action),
    saveNow: () => s.saveNow(),

    // Page content builders
    createHtmlPage: () => s.createHtmlPage(),
    createTankMenuOverlay: () => s.createTankMenuOverlay(),

    // Settings
    getReducedMotion: () => s.settings.reducedMotion,

    // HTML button
    htmlButton: (label, className, onClick, disabled) => s.htmlButton(label, className, onClick, disabled),

    // HUD / interface sync kept in Core
    syncTankFrameCssVars: () => s.syncTankFrameCssVars(),
    syncTankSceneVisibility: () => s.syncTankSceneVisibility(),
    syncTankMenuOverlay: () => s.syncTankMenuOverlay(),
    syncHtmlHud: () => s.syncHtmlHud(),
    syncHtmlFoodDock: () => s.syncHtmlFoodDock()
  };
}
