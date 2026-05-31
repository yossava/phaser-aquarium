import Phaser from "phaser";
import { earn, formatNumber } from "../../game/economy";
import { toastX, toastY } from "../../game/constants";
import { pageScreenMeta as buildPageScreenMeta } from "../../ui/PageOverlay";
import { createPageOverlayRoot, hidePageOverlay, syncPageOverlay } from "../../ui/PageOverlay";
import { StoreOverlay } from "../../ui/StoreOverlay";
import type { PageOverlayScreen, PageScreenMeta } from "../../ui/PageOverlay";
import type { MakeupDraft } from "../../game/makeup-mode";
import type { DecorationSize } from "../../game/tank-catalog";
import type { FishType, FoodType, HelperCreatureType, CoinType, Wallet } from "../../types/mechanics";
import {
  BubblePopScene,
  BubblePopSceneKey,
  type BubblePopResult
} from "../BubblePopScene";
import {
  ReefDropScene,
  ReefDropSceneKey,
  type ReefDropResult
} from "../ReefDropScene";
import type {
  AppScreen,
  InventoryTab,
  PlacementMode,
  TankMenuTab
} from "./aquarium-scene-config";
import type { StoreOverlayState } from "../../ui/StoreOverlay";

export type AquariumMenuControllerHost = {
  scene: Phaser.Scene;

  // Active screen state
  getActiveScreen: () => AppScreen;
  setActiveScreen: (screen: AppScreen) => void;
  getPageReturnScreen: () => AppScreen | undefined;
  setPageReturnScreen: (screen: AppScreen | undefined) => void;
  getForceNextPageTransition: () => boolean;
  setForceNextPageTransition: (value: boolean) => void;

  // Placement mode
  getPlacementMode: () => PlacementMode;
  setPlacementMode: (mode: PlacementMode) => void;

  // Inventory / tab state
  getInventoryTab: () => InventoryTab;
  setInventoryTab: (tab: InventoryTab) => void;
  getInventoryDrillOpen: () => boolean;
  setInventoryDrillOpen: (value: boolean) => void;
  getTankMenuTab: () => TankMenuTab;
  setTankMenuTab: (tab: TankMenuTab) => void;
  getTankMenuDrillOpen: () => boolean;
  setTankMenuDrillOpen: (value: boolean) => void;
  getTankMenuPage: () => number;
  setTankMenuPage: (page: number) => void;

  // Makeup state
  getMakeupDraft: () => MakeupDraft | undefined;
  setMakeupDraft: (draft: MakeupDraft | undefined) => void;
  getMakeupDraggedDecoration: () => import("../../game/makeup-mode").MakeupDecorationDraft | undefined;
  setMakeupDraggedDecoration: (decoration: import("../../game/makeup-mode").MakeupDecorationDraft | undefined) => void;
  getMakeupBackgroundScrollLeft: () => number;
  setMakeupBackgroundScrollLeft: (value: number) => void;
  getMakeupDecorScrollLeft: () => number;
  setMakeupDecorScrollLeft: (value: number) => void;

  // Pause tokens
  getReefDropPauseToken: () => number;
  setReefDropPauseToken: (token: number) => void;
  getBubblePopPauseToken: () => number;
  setBubblePopPauseToken: (token: number) => void;

  // Prize spin
  getPrizeSpinInProgress: () => boolean;
  setPrizeSpinInProgress: (value: boolean) => void;

  // Store overlay
  getStoreOverlay: () => StoreOverlay | undefined;
  setStoreOverlay: (overlay: StoreOverlay | undefined) => void;
  refreshStoreOverlay: () => void;
  getStoreRefreshElapsed: () => number;
  setStoreRefreshElapsed: (value: number) => void;
  getStoreCooldownStateKey: () => string;
  setStoreCooldownStateKey: (key: string) => void;

  // Page overlay
  getHtmlPageOverlay: () => HTMLDivElement | undefined;
  setHtmlPageOverlay: (overlay: HTMLDivElement | undefined) => void;
  getHtmlPageOverlayScrollTop: () => number;
  setHtmlPageOverlayScrollTop: (value: number) => void;
  getHtmlPageOverlayRenderKey: () => string;
  setHtmlPageOverlayRenderKey: (key: string) => void;

  // Tank menu overlay
  getTankMenuOverlay: () => HTMLDivElement | undefined;
  setTankMenuOverlay: (overlay: HTMLDivElement | undefined) => void;
  getTankMenuOverlayStateKey: () => string;
  setTankMenuOverlayStateKey: (key: string) => void;

  // Game HUD / food dock
  getGameHudOverlay: () => HTMLDivElement | undefined;
  getHtmlFoodDock: () => HTMLDivElement | undefined;

  // Makeup overlay
  getMakeupOverlay: () => HTMLDivElement | undefined;
  setMakeupOverlay: (overlay: HTMLDivElement | undefined) => void;

  // Screen buttons
  getScreenButtons: () => Phaser.GameObjects.Container[];
  setScreenButtons: (buttons: Phaser.GameObjects.Container[]) => void;

  // Core coordination methods
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

  // Scene management
  sceneRemove: (key: string) => void;
  sceneAdd: (key: string, sceneConfig: unknown, autoStart: boolean) => void;
  sceneLaunch: (key: string, data?: unknown) => void;
  sceneBringToTop: (key: string) => void;
  scenePause: (key: string) => void;
  sceneResume: (key: string) => void;
  sceneSetVisible: (visible: boolean, key: string) => void;
  sceneSetActive: (active: boolean, key: string) => void;
  timeDelayedCall: (delay: number, callback: () => void) => void;

  // Store overlay creation
  storeOverlayState: () => StoreOverlayState;
  showFishBuyQuantityModal: (fishType: FishType) => void;
  showFoodBuyQuantityModal: (foodType: FoodType, quantity: number) => void;
  buyHelperCreature: (creatureType: HelperCreatureType) => void;
  buyTankCosmeticFromStore: (category: "background" | "seabed", id: string) => void;
  useTankCosmeticFromStore: (category: "background" | "seabed", id: string) => void;
  buyDecorationFromStore: (decorationId: string, size: DecorationSize) => void;
  selectDecoration: (decorationId: string, size: DecorationSize) => void;
  buyTankUtility: (utilityId: string) => void;

  // Makeup helpers
  createMakeupDraft: () => MakeupDraft;
  syncMakeupOverlay: () => void;

  // Minigame helpers
  activeFish: () => import("../../objects/Fish").Fish[];
  activeHelperCreatures: () => import("../../objects/HelperCreature").HelperCreature[];
  activeFishProductionPerMinute: () => number;
  getWallet: () => Wallet;
  recordDailyQuestAction: (action: string) => void;
  saveNow: () => void;

  // Page content builders
  createHtmlPage: () => HTMLElement;
  createTankMenuOverlay: () => HTMLDivElement;

  // Settings
  getReducedMotion: () => boolean;

  // HTML button
  htmlButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;

  // HUD / interface sync kept in Core
  syncTankFrameCssVars: () => void;
  syncTankSceneVisibility: () => void;
  syncTankMenuOverlay: () => void;
  syncHtmlHud: () => void;
  syncHtmlFoodDock: () => void;
};

export class AquariumMenuController {
  constructor(private readonly host: AquariumMenuControllerHost) {}

  // ─── Screen Navigation ───

  public openScreen(screen: Exclude<AppScreen, "tank">): void {
    this.host.ensureAquariumSceneRunning();
    const wasTankScreen = this.host.getActiveScreen() === "tank";
    if (wasTankScreen) {
      this.host.startPausedTankEarnings();
    }
    this.host.setPageReturnScreen(undefined);
    this.host.setActiveScreen(screen);
    this.host.setForceNextPageTransition(wasTankScreen && (screen === "menu" || screen === "goals"));
    this.host.setPlacementMode({ kind: "none" });
    if (screen === "album") {
      this.host.setInventoryDrillOpen(false);
      this.host.setTankMenuDrillOpen(false);
      this.host.setTankMenuPage(1);
    }
    this.host.closeModal(true);
    this.host.syncCoinDropVisibilityAndInput();
    this.createScreenNav();
    this.host.createFoodDock();
    this.host.autoDropCompletedDailyQuestPresents();

    if (screen === "store") {
      this.hideHtmlPageOverlay();
      this.openStoreOverlay();
      this.refreshUi(false);
      return;
    }

    this.host.getStoreOverlay()?.hide();
    this.refreshUi(false);
  }

  public openFishInventory(): void {
    this.host.setInventoryTab("fish");
    this.host.setInventoryDrillOpen(true);
    this.host.setTankMenuDrillOpen(false);
    this.host.setTankMenuPage(1);
    this.openScreen("album");
    this.host.setPageReturnScreen("tank");
    this.host.setInventoryTab("fish");
    this.host.setInventoryDrillOpen(true);
    this.syncHtmlPageOverlay();
  }

  public closePage(): void {
    const closingScreen = this.host.getActiveScreen();
    this.host.removeReefDropScene();
    this.host.removeBubblePopScene();
    this.host.ensureAquariumSceneRunning();
    const explicitReturnScreen = this.host.getPageReturnScreen();
    this.host.setPageReturnScreen(undefined);
    const returnToMainMenu = closingScreen !== "tank" && closingScreen !== "menu" && closingScreen !== "goals";
    this.host.cancelPendingFusion();
    this.host.setPrizeSpinInProgress(false);
    this.host.destroyPrizeSpinContainer();
    if (closingScreen === "makeup") {
      this.host.destroyMakeupDraft();
      this.host.getMakeupOverlay()?.classList.add("hidden");
      this.host.setMakeupDraggedDecoration(undefined);
    }
    this.host.setActiveScreen(explicitReturnScreen ?? (returnToMainMenu ? "menu" : "tank"));
    if (this.host.getActiveScreen() === "tank") {
      this.host.settlePausedTankEarnings();
    }
    this.host.setTankMenuDrillOpen(false);
    this.host.setInventoryDrillOpen(false);
    this.host.setTankMenuPage(1);
    this.host.getStoreOverlay()?.hide();
    if (this.host.getActiveScreen() === "tank") {
      this.hideHtmlPageOverlay();
    } else {
      this.syncHtmlPageOverlay();
    }
    this.host.syncCoinDropVisibilityAndInput();
    this.createScreenNav();
    this.host.createFoodDock();
    this.host.syncMakeupPresentation();
    this.refreshUi(false);
  }

  public returnToTankScreen(): void {
    this.host.removeReefDropScene();
    this.host.removeBubblePopScene();
    this.host.ensureAquariumSceneRunning();
    this.host.setActiveScreen("tank");
    this.host.settlePausedTankEarnings();
    this.host.getStoreOverlay()?.hide();
    this.hideHtmlPageOverlay();
    this.host.syncCoinDropVisibilityAndInput();
    this.createScreenNav();
    this.host.createFoodDock();
    this.host.syncMakeupPresentation();
    this.refreshUi(false);
  }

  // ─── Store Overlay ───

  public openStoreOverlay(): void {
    this.hideHtmlPageOverlay();
    const existing = this.host.getStoreOverlay();
    if (!existing) {
      this.host.setStoreOverlay(
        new StoreOverlay(
          () => this.host.storeOverlayState(),
          {
            close: () => this.closePage(),
            buyFish: (fishType) => this.host.showFishBuyQuantityModal(fishType),
            buyFood: (foodType, quantity) => this.host.showFoodBuyQuantityModal(foodType, quantity),
            buyHelper: (creatureType) => this.host.buyHelperCreature(creatureType),
            buyTankCosmetic: (category, id) => this.host.buyTankCosmeticFromStore(category, id),
            switchTankCosmetic: (category, id) => this.host.useTankCosmeticFromStore(category, id),
            buyTankDecoration: (decorationId, size) => this.host.buyDecorationFromStore(decorationId, size),
            selectTankDecoration: (decorationId, size) => this.host.selectDecoration(decorationId, size),
            buyTankUtility: (utilityId) => this.host.buyTankUtility(utilityId)
          },
          this.host.getReducedMotion()
        )
      );
    }
    this.host.getStoreOverlay()?.show();
  }

  public updateStoreOverlayTimer(deltaSeconds: number): void {
    if (this.host.getActiveScreen() !== "store") {
      this.host.setStoreRefreshElapsed(0);
      this.host.setStoreCooldownStateKey("");
      return;
    }
    this.host.setStoreRefreshElapsed(this.host.getStoreRefreshElapsed() + deltaSeconds);
    if (this.host.getStoreRefreshElapsed() < 1) {
      return;
    }
    this.host.setStoreRefreshElapsed(0);
    const nextKey = this.host.storeOverlayState().fishPurchaseRestockLabel;
    if (nextKey !== this.host.getStoreCooldownStateKey()) {
      this.host.setStoreCooldownStateKey(nextKey);
      this.host.refreshStoreOverlay();
    }
  }

  // ─── Page Overlay ───

  public syncHtmlPageOverlay(): void {
    const result = syncPageOverlay({
      activeScreen: this.host.getActiveScreen(),
      overlay: this.host.getHtmlPageOverlay(),
      renderKey: this.host.getHtmlPageOverlayRenderKey(),
      scrollTop: this.host.getHtmlPageOverlayScrollTop(),
      reducedMotion: this.host.getReducedMotion(),
      forceTransition: this.host.getForceNextPageTransition(),
      createOverlay: () => this.createHtmlPageOverlay(),
      createPage: () => this.host.createHtmlPage(),
      getRenderKey: () => this.htmlPageOverlayKey()
    });
    this.host.setForceNextPageTransition(false);
    this.host.setHtmlPageOverlay(result.overlay);
    this.host.setHtmlPageOverlayRenderKey(result.renderKey);
    this.host.setHtmlPageOverlayScrollTop(result.scrollTop);
  }

  public hideHtmlPageOverlay(): void {
    hidePageOverlay(this.host.getHtmlPageOverlay());
  }

  public createHtmlPageOverlay(): HTMLDivElement {
    return createPageOverlayRoot();
  }

  public htmlPageOverlayKey(): string {
    return `${this.host.getActiveScreen()}:${this.host.getTankMenuTab()}:${this.host.getTankMenuDrillOpen()}:${this.host.getTankMenuPage()}:${this.host.getInventoryTab()}:${this.host.getInventoryDrillOpen()}`;
  }

  public renderTabControls(): void {
    this.syncHtmlPageOverlay();
  }

  public pageScreenMeta(): PageScreenMeta {
    return buildPageScreenMeta({
      screen: this.host.getActiveScreen() as PageOverlayScreen,
      fishCount: formatNumber(this.host.activeFish().length),
      helperCount: formatNumber(this.host.activeHelperCreatures().length),
      dailyGoalsDate: "Phase 1"
    });
  }

  // ─── Screen Nav & HUD ───

  public createScreenNav(): void {
    const buttons = this.host.getScreenButtons();
    buttons.forEach((button) => button.destroy(true));
    this.host.setScreenButtons([]);
    this.syncHtmlGameInterface();
  }

  public syncHtmlGameInterface(): void {
    this.host.syncTankFrameCssVars();
    this.host.syncTankSceneVisibility();
    this.host.syncTankMenuOverlay();
    this.host.syncHtmlHud();
    this.host.syncHtmlFoodDock();
  }

  public shouldShowTankScene(): boolean {
    return this.host.getActiveScreen() === "tank" || this.host.getActiveScreen() === "makeup";
  }

  public refreshUi(renderControls = true): void {
    if (this.host.getActiveScreen() === "store") {
      this.host.refreshStoreOverlay();
    }
    if (this.host.getActiveScreen() === "prize" || this.host.getActiveScreen() === "makeup") {
      this.hideHtmlPageOverlay();
    } else if (this.host.getActiveScreen() !== "tank" && this.host.getActiveScreen() !== "store") {
      this.syncHtmlPageOverlay();
    }
    if (renderControls) {
      this.host.createFoodDock();
      if (this.host.getActiveScreen() === "store") {
        this.openStoreOverlay();
      } else {
        this.renderTabControls();
      }
    }
    this.host.refreshStatus();
    this.syncHtmlGameInterface();
  }

  // ─── Makeup Mode ───

  public openMakeupMode(): void {
    this.host.closeModal();
    this.host.getStoreOverlay()?.hide();
    this.hideHtmlPageOverlay();
    this.host.setPlacementMode({ kind: "none" });
    this.host.setMakeupDraft(this.host.createMakeupDraft());
    if (this.host.getActiveScreen() === "tank") {
      this.host.startPausedTankEarnings();
    }
    this.host.setActiveScreen("makeup");
    this.host.layoutTankBackground();
    this.host.layoutTankFloor();
    this.host.syncMakeupPresentation();
    this.syncHtmlGameInterface();
    this.renderTabControls();
    this.host.syncMakeupOverlay();
  }

  public closeMakeupMode(applied: boolean): void {
    this.host.destroyMakeupDraft();
    this.host.getMakeupOverlay()?.classList.add("hidden");
    this.host.setMakeupDraggedDecoration(undefined);
    this.host.setMakeupBackgroundScrollLeft(0);
    this.host.setMakeupDecorScrollLeft(0);
    this.host.setActiveScreen(applied ? "tank" : "menu");
    if (this.host.getActiveScreen() === "tank") {
      this.host.settlePausedTankEarnings();
    }
    this.host.layoutTankBackground();
    this.host.layoutTankFloor();
    this.host.syncMakeupPresentation();
    if (this.host.getActiveScreen() === "tank") {
      this.hideHtmlPageOverlay();
    } else {
      this.syncHtmlPageOverlay();
    }
    this.refreshUi(false);
    if (!applied) {
      this.host.floatText("Makeup closed", toastX, toastY, "#d7f4ff");
    }
  }

  // ─── Minigames ───

  public openPrizeMachineArcade(): void {
    this.host.removeReefDropScene();
    this.host.removeBubblePopScene();
  }

  public openReefDropGame(): void {
    this.host.setPlacementMode({ kind: "none" });
    if (this.host.getActiveScreen() === "tank") {
      this.host.startPausedTankEarnings();
    }
    this.host.setActiveScreen("prize");
    this.host.closeModal();
    this.host.getStoreOverlay()?.hide();
    this.hideHtmlPageOverlay();
    this.syncHtmlGameInterface();
    this.host.getTankMenuOverlay()?.classList.add("hidden");
    this.host.getGameHudOverlay()?.classList.add("hidden");
    this.host.getHtmlFoodDock()?.classList.add("hidden");
    this.host.destroyPrizeSpinContainer();
    this.host.removeBubblePopScene();
    this.host.sceneRemove(ReefDropSceneKey);
    this.host.sceneAdd(ReefDropSceneKey, ReefDropScene, false);
    const pauseToken = this.host.getReefDropPauseToken() + 1;
    this.host.setReefDropPauseToken(pauseToken);
    this.host.sceneLaunch(ReefDropSceneKey, {
      productionPerMinute: this.host.activeFishProductionPerMinute(),
      onComplete: (result: ReefDropResult) => this.completeReefDropGame(result),
      onCancel: () => this.returnFromReefDropGame()
    });
    this.host.sceneBringToTop(ReefDropSceneKey);
    this.host.timeDelayedCall(0, () => {
      if (this.host.getReefDropPauseToken() !== pauseToken || this.host.getActiveScreen() !== "prize") {
        return;
      }
      this.host.scenePause("AquariumScene");
    });
  }

  public openBubblePopGame(): void {
    this.host.setPlacementMode({ kind: "none" });
    if (this.host.getActiveScreen() === "tank") {
      this.host.startPausedTankEarnings();
    }
    this.host.setActiveScreen("prize");
    this.host.closeModal();
    this.host.getStoreOverlay()?.hide();
    this.hideHtmlPageOverlay();
    this.syncHtmlGameInterface();
    this.host.getTankMenuOverlay()?.classList.add("hidden");
    this.host.getGameHudOverlay()?.classList.add("hidden");
    this.host.getHtmlFoodDock()?.classList.add("hidden");
    this.host.destroyPrizeSpinContainer();
    this.host.removeReefDropScene();
    this.host.sceneRemove(BubblePopSceneKey);
    this.host.sceneAdd(BubblePopSceneKey, BubblePopScene, false);
    const pauseToken = this.host.getBubblePopPauseToken() + 1;
    this.host.setBubblePopPauseToken(pauseToken);
    this.host.sceneLaunch(BubblePopSceneKey, {
      productionPerMinute: this.host.activeFishProductionPerMinute(),
      onComplete: (result: BubblePopResult) => this.completeBubblePopGame(result),
      onCancel: () => this.returnFromBubblePopGame()
    });
    this.host.sceneBringToTop(BubblePopSceneKey);
    this.host.timeDelayedCall(0, () => {
      if (this.host.getBubblePopPauseToken() !== pauseToken || this.host.getActiveScreen() !== "prize") {
        return;
      }
      this.host.scenePause("AquariumScene");
    });
  }

  public completeBubblePopGame(result: BubblePopResult): void {
    const rewardCommonCoins = Math.max(0, Math.floor(result.coinReward));
    earn(this.host.getWallet(), "common", rewardCommonCoins);
    this.host.recordDailyQuestAction("bubble-pop-game");
    this.host.recordDailyQuestAction("prize-game");
    this.host.saveNow();
    this.returnFromBubblePopGame();
  }

  public completeReefDropGame(result: ReefDropResult): void {
    const productionPerMinute = this.host.activeFishProductionPerMinute();
    const mismatchMultiplier = Math.max(0, 1 - result.mismatchCount * 0.05);
    const rewardCommonCoins = Math.max(0, Math.floor(result.caughtCount * productionPerMinute * mismatchMultiplier));
    earn(this.host.getWallet(), "common", rewardCommonCoins);
    this.host.recordDailyQuestAction("reef-drop-game");
    this.host.recordDailyQuestAction("prize-game");
    this.host.saveNow();
    this.returnFromReefDropGame();
  }

  public returnFromReefDropGame(): void {
    this.host.removeReefDropScene();
    this.host.ensureAquariumSceneRunning();
    this.host.sceneBringToTop("AquariumScene");
    this.host.setActiveScreen("menu");
    this.syncHtmlGameInterface();
    this.syncHtmlPageOverlay();
  }

  public returnFromBubblePopGame(): void {
    this.host.removeBubblePopScene();
    this.host.ensureAquariumSceneRunning();
    this.host.sceneBringToTop("AquariumScene");
    this.host.setActiveScreen("menu");
    this.syncHtmlGameInterface();
    this.syncHtmlPageOverlay();
  }
}
