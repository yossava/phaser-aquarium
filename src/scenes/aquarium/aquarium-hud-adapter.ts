import type Phaser from "phaser";
import type { AquariumHudControllerHost } from "./aquarium-hud-controller";
import type { AquariumSceneCore } from "./AquariumSceneCore";
import type { AppScreen, PlacementMode } from "./aquarium-scene-config";

type HudAdapterScene = Phaser.Scene & {
  gameHudOverlay?: HTMLDivElement;
  gameHudLevelText?: HTMLSpanElement;
  gameHudCommonText?: HTMLSpanElement;
  gameHudRareText?: HTMLSpanElement;
  gameHudSuperRareText?: HTMLSpanElement;
  gameHudQuestChecklist?: HTMLDivElement;
  timeCurrentElement?: HTMLDivElement;
  timeCurrentText?: HTMLSpanElement;
  coinMagnetElement?: HTMLDivElement;
  coinMagnetText?: HTMLSpanElement;
  autoFoodBuyerElement?: HTMLDivElement;
  autoFoodBuyerText?: HTMLSpanElement;
  foodDispenserElement?: HTMLDivElement;
  foodDispenserText?: HTMLSpanElement;
  tankMenuOverlay?: HTMLDivElement;
  tankMenuOverlayStateKey: string;
  activeScreen: AppScreen;
  wallet: { common: number; rare: number; superRare: number };
  tankLevel: number;
  cleanliness: number;
  tankLayer: Phaser.GameObjects.Container;
  foodDispenserY: number;
  coinMagnetY: number;
  autoFoodBuyerY: number;
  coinMagnetRay?: Phaser.GameObjects.Graphics;
  placementMode: PlacementMode;
  tankDisplayLevel: () => number;
  tankViewScaleForLevel: () => number;
  screenToTankPoint: (designX: number, designY: number) => Phaser.Math.Vector2;
  tankToScreenPoint: (x: number, y: number) => { x: number; y: number };
  attachTouchFeedback: (element: HTMLElement, releaseOnLeave?: boolean) => void;
  activeFish: () => Array<{ state: string; hunger: number; health: number }>;
  getCareStatusLabel: () => string;
  tankHudSnapshotText: () => string;
  tankStatusSnapshotText: () => string;
  tankCareSnapshotText: () => string;
  getCompactTankNeedIndicator: () => string;
  getTankNeedIndicator: () => string;
  getTotalDispenserInventory: () => number;
  coinMagnetRemainingMinutes: () => number;
  autoFoodBuyerRemainingMinutes: () => number;
  timeCurrentRemainingSeconds: () => number;
  hasCoinMagnet: () => boolean;
  hasAutoFoodBuyer: () => boolean;
  hasFoodDispenser: () => boolean;
  shouldShowCleanlinessWarning: () => boolean;
  visibleDailyQuestItems: () => Array<{ id: string; label: string; complete: boolean }>;
  dailyGoalUnclaimedCount: () => number;
  coinMagnetTankPosition: () => Phaser.Math.Vector2;
  coinMagnetRayPoint: () => Phaser.Math.Vector2;
  getFoodInventory: (foodTypeId: string) => number;
  foodBadgeLabel: (count: number) => string;
  openScreen: (screen: Exclude<AppScreen, "tank">) => void;
  showModal: (title: string, lines: string[], actions: Array<{ label: string; fill: number; action: () => void }>, bodyElements?: HTMLElement[]) => void;
  closeModal: (skipAnimation?: boolean) => void;
  saveNow: () => void;
};

export function createAquariumHudControllerHost(scene: AquariumSceneCore): AquariumHudControllerHost {
  const s = scene as unknown as HudAdapterScene;
  return {
    scene: s,

    gameHudOverlay: s.gameHudOverlay,
    gameHudLevelText: s.gameHudLevelText,
    gameHudCommonText: s.gameHudCommonText,
    gameHudRareText: s.gameHudRareText,
    gameHudSuperRareText: s.gameHudSuperRareText,
    gameHudQuestChecklist: s.gameHudQuestChecklist,
    timeCurrentElement: s.timeCurrentElement,
    timeCurrentText: s.timeCurrentText,
    coinMagnetElement: s.coinMagnetElement,
    coinMagnetText: s.coinMagnetText,
    autoFoodBuyerElement: s.autoFoodBuyerElement,
    autoFoodBuyerText: s.autoFoodBuyerText,
    foodDispenserElement: s.foodDispenserElement,
    foodDispenserText: s.foodDispenserText,

    tankMenuOverlay: s.tankMenuOverlay,
    tankMenuOverlayStateKey: s.tankMenuOverlayStateKey,

    activeScreen: s.activeScreen,
    wallet: s.wallet,
    tankLevel: s.tankLevel,
    cleanliness: s.cleanliness,
    tankLayer: s.tankLayer,
    foodDispenserY: s.foodDispenserY,
    coinMagnetY: s.coinMagnetY,
    autoFoodBuyerY: s.autoFoodBuyerY,
    coinMagnetRay: s.coinMagnetRay,
    placementMode: s.placementMode,

    tankDisplayLevel: () => s.tankDisplayLevel(),
    tankViewScaleForLevel: () => s.tankViewScaleForLevel(),
    screenToTankPoint: (designX, designY) => s.screenToTankPoint(designX, designY),
    tankToScreenPoint: (x, y) => s.tankToScreenPoint(x, y),
    attachTouchFeedback: (element, releaseOnLeave) => s.attachTouchFeedback(element, releaseOnLeave),

    activeFish: () => s.activeFish(),
    getCareStatusLabel: () => s.getCareStatusLabel(),
    tankHudSnapshotText: () => s.tankHudSnapshotText(),
    tankStatusSnapshotText: () => s.tankStatusSnapshotText(),
    tankCareSnapshotText: () => s.tankCareSnapshotText(),
    getCompactTankNeedIndicator: () => s.getCompactTankNeedIndicator(),
    getTankNeedIndicator: () => s.getTankNeedIndicator(),
    getTotalDispenserInventory: () => s.getTotalDispenserInventory(),
    coinMagnetRemainingMinutes: () => s.coinMagnetRemainingMinutes(),
    autoFoodBuyerRemainingMinutes: () => s.autoFoodBuyerRemainingMinutes(),
    timeCurrentRemainingSeconds: () => s.timeCurrentRemainingSeconds(),
    hasCoinMagnet: () => s.hasCoinMagnet(),
    hasAutoFoodBuyer: () => s.hasAutoFoodBuyer(),
    hasFoodDispenser: () => s.hasFoodDispenser(),
    shouldShowCleanlinessWarning: () => s.shouldShowCleanlinessWarning(),
    visibleDailyQuestItems: () => s.visibleDailyQuestItems(),
    dailyGoalUnclaimedCount: () => s.dailyGoalUnclaimedCount(),
    coinMagnetTankPosition: () => s.coinMagnetTankPosition(),
    coinMagnetRayPoint: () => s.coinMagnetRayPoint(),

    getFoodInventory: (foodTypeId) => s.getFoodInventory(foodTypeId),
    foodBadgeLabel: (count) => s.foodBadgeLabel(count),
    openScreen: (screen) => s.openScreen(screen),
    showModal: (title, lines, actions, bodyElements) => s.showModal(title, lines, actions, bodyElements),
    closeModal: (skipAnimation) => s.closeModal(skipAnimation),
    saveNow: () => s.saveNow()
  };
}
