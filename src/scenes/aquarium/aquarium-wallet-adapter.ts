import type Phaser from "phaser";
import type { WalletControllerHost } from "./aquarium-wallet-controller";
import type { AquariumSceneCore } from "./AquariumSceneCore";
import type { Wallet } from "../../types/mechanics";
import type { CoinType } from "../../types/mechanics";
import type { AppScreen, PlacementMode } from "./aquarium-scene-config";
import type { DailyQuestReward } from "../../game/quest-system";
import type { Fish } from "../../objects/Fish";
import { CoinDrop } from "../../objects/CoinDrop";
import { QuestPresentDrop } from "../../objects/QuestPresentDrop";

type WalletAdapterScene = Phaser.Scene & {
  wallet: Wallet;
  coinDrops: CoinDrop[];
  coinDropPool: CoinDrop[];
  magnetCollectingCoins: Set<CoinDrop>;
  coinMagnetPreviousCoinY: Map<CoinDrop, number>;
  coinMagnetY: number;
  coinMagnetElement?: HTMLDivElement;
  coinMagnetText?: HTMLSpanElement;
  coinMagnetRay?: Phaser.GameObjects.Graphics;
  coinMagnetWasActive: boolean;
  coinMagnetDisplayedMinutes: number;
  coinComboCount: number;
  coinComboCollectedValue: number;
  coinComboLastClaimedAt: number;
  coinComboLastPosition: Phaser.Math.Vector2;
  coinComboOverlay?: HTMLDivElement;
  questPresents: Array<{ drop: QuestPresentDrop; reward: DailyQuestReward }>;
  modal: boolean;
  activeScreen: AppScreen;
  htmlDockDragging: boolean;
  tankLevel: number;
  cleanliness: number;
  decorationInventory: Map<string, number>;
  tankLayer: Phaser.GameObjects.Container;
  gameHudCommonText?: HTMLSpanElement;
  gameHudRareText?: HTMLSpanElement;
  gameHudSuperRareText?: HTMLSpanElement;
  tankViewScaleForLevel: () => number;
  refreshVisibleTankViewport: () => void;
  foodDispenserMinY: () => number;
  foodDispenserMaxY: () => number;
  addFishProductionTotal: (level: number, bonus: number) => boolean;
  recordDailyQuestAction: (action: string) => void;
  dailyQuestActionCount: (action: string) => number;
  floatCoinClaimText: (value: number, coinType: CoinType, x: number, y: number, color: string, automated: boolean, fee?: number) => void;
  floatTankText: (message: string, x: number, y: number, color: string) => void;
  floatText: (message: string, x: number, y: number, color: string) => void;
  playSfx: (key: string, config: Phaser.Types.Sound.SoundConfig) => void;
  saveNow: (savedAt?: number, immediate?: boolean) => void;
  refreshUi: (renderControls?: boolean) => void;
  refreshStatus: () => void;
  syncHtmlGameInterface: () => void;
  syncHtmlHud: () => void;
  createFoodDock: () => void;
  closeModal: () => void;
  showPrizeCelebration: (title: string, imageUrl: string, detail: string, buttonLabel?: string, onClose?: () => void) => void;
  grantDailyQuestReward: (reward: DailyQuestReward) => void;
  dailyQuestRewardLabel: (reward: DailyQuestReward) => string;
  questRewardImageUrl: (reward: DailyQuestReward) => string;
  clientPointToDesignPoint: (clientX: number, clientY: number) => Phaser.Math.Vector2 | null;
  screenToTankPoint: (x: number, y: number) => Phaser.Math.Vector2;
  shouldShowTankScene: () => boolean;
  activeFish: () => Fish[];
  getTankName: (level: number) => string;
  tankDisplayLevel: () => number;
  calculateTankHappiness: () => number;
  calculateTankNetWorth: () => number;
  getTotalFoodInventory: () => number;
  getCompactTankNeedIndicator: () => string;
  getTankNeedIndicator: () => string;
  getHudNeedLabel: () => string;
  placementMode: PlacementMode;
  timeCurrentRemainingSeconds: () => number;
};

export function createAquariumWalletControllerHost(scene: AquariumSceneCore): WalletControllerHost {
  const s = scene as unknown as WalletAdapterScene;
  return {
    scene: s,
    get wallet() { return s.wallet; },
    set wallet(value) { s.wallet = value; },
    get coinDrops() { return s.coinDrops; },
    set coinDrops(value) { s.coinDrops = value; },
    get coinDropPool() { return s.coinDropPool; },
    set coinDropPool(value) { s.coinDropPool = value; },
    get magnetCollectingCoins() { return s.magnetCollectingCoins; },
    set magnetCollectingCoins(value) { s.magnetCollectingCoins = value; },
    get coinMagnetPreviousCoinY() { return s.coinMagnetPreviousCoinY; },
    set coinMagnetPreviousCoinY(value) { s.coinMagnetPreviousCoinY = value; },
    get coinMagnetY() { return s.coinMagnetY; },
    set coinMagnetY(value) { s.coinMagnetY = value; },
    get coinMagnetElement() { return s.coinMagnetElement; },
    set coinMagnetElement(value) { s.coinMagnetElement = value; },
    get coinMagnetText() { return s.coinMagnetText; },
    set coinMagnetText(value) { s.coinMagnetText = value; },
    get coinMagnetRay() { return s.coinMagnetRay; },
    set coinMagnetRay(value) { s.coinMagnetRay = value; },
    get coinMagnetWasActive() { return s.coinMagnetWasActive; },
    set coinMagnetWasActive(value) { s.coinMagnetWasActive = value; },
    get coinMagnetDisplayedMinutes() { return s.coinMagnetDisplayedMinutes; },
    set coinMagnetDisplayedMinutes(value) { s.coinMagnetDisplayedMinutes = value; },
    get coinComboCount() { return s.coinComboCount; },
    set coinComboCount(value) { s.coinComboCount = value; },
    get coinComboCollectedValue() { return s.coinComboCollectedValue; },
    set coinComboCollectedValue(value) { s.coinComboCollectedValue = value; },
    get coinComboLastClaimedAt() { return s.coinComboLastClaimedAt; },
    set coinComboLastClaimedAt(value) { s.coinComboLastClaimedAt = value; },
    get coinComboLastPosition() { return s.coinComboLastPosition; },
    set coinComboLastPosition(value) { s.coinComboLastPosition = value; },
    get coinComboOverlay() { return s.coinComboOverlay; },
    set coinComboOverlay(value) { s.coinComboOverlay = value; },
    get questPresents() { return s.questPresents; },
    set questPresents(value) { s.questPresents = value; },
    getModal: () => s.modal,
    getActiveScreen: () => s.activeScreen,
    getHtmlDockDragging: () => s.htmlDockDragging,
    getTankLevel: () => s.tankLevel,
    getCleanliness: () => s.cleanliness,
    get decorationInventory() { return s.decorationInventory; },
    set decorationInventory(value) { s.decorationInventory = value; },
    get tankLayer() { return s.tankLayer; },
    set tankLayer(value) { s.tankLayer = value; },
    get gameHudCommonText() { return s.gameHudCommonText; },
    set gameHudCommonText(value) { s.gameHudCommonText = value; },
    get gameHudRareText() { return s.gameHudRareText; },
    set gameHudRareText(value) { s.gameHudRareText = value; },
    get gameHudSuperRareText() { return s.gameHudSuperRareText; },
    set gameHudSuperRareText(value) { s.gameHudSuperRareText = value; },
    tankViewScaleForLevel: () => s.tankViewScaleForLevel(),
    refreshVisibleTankViewport: () => s.refreshVisibleTankViewport(),
    foodDispenserMinY: () => s.foodDispenserMinY(),
    foodDispenserMaxY: () => s.foodDispenserMaxY(),
    addFishProductionTotal: (level, bonus) => s.addFishProductionTotal(level, bonus),
    recordDailyQuestAction: (action) => s.recordDailyQuestAction(action),
    dailyQuestActionCount: (action) => s.dailyQuestActionCount(action),
    floatCoinClaimText: (value, coinType, x, y, color, automated, fee) => s.floatCoinClaimText(value, coinType, x, y, color, automated, fee),
    floatTankText: (message, x, y, color) => s.floatTankText(message, x, y, color),
    floatText: (message, x, y, color) => s.floatText(message, x, y, color),
    playSfx: (key, config) => s.playSfx(key, config),
    saveNow: (savedAt, immediate) => s.saveNow(savedAt, immediate),
    refreshUi: (renderControls) => s.refreshUi(renderControls),
    refreshStatus: () => s.refreshStatus(),
    syncHtmlGameInterface: () => s.syncHtmlGameInterface(),
    syncHtmlHud: () => s.syncHtmlHud(),
    createFoodDock: () => s.createFoodDock(),
    closeModal: () => s.closeModal(),
    showPrizeCelebration: (title, imageUrl, detail, buttonLabel, onClose) => s.showPrizeCelebration(title, imageUrl, detail, buttonLabel, onClose),
    grantDailyQuestReward: (reward) => s.grantDailyQuestReward(reward),
    dailyQuestRewardLabel: (reward) => s.dailyQuestRewardLabel(reward),
    questRewardImageUrl: (reward) => s.questRewardImageUrl(reward),
    clientPointToDesignPoint: (clientX, clientY) => s.clientPointToDesignPoint(clientX, clientY),
    screenToTankPoint: (x, y) => s.screenToTankPoint(x, y),
    shouldShowTankScene: () => s.shouldShowTankScene(),
    activeFish: () => s.activeFish(),
    getTankName: (level) => s.getTankName(level),
    tankDisplayLevel: () => s.tankDisplayLevel(),
    calculateTankHappiness: () => s.calculateTankHappiness(),
    calculateTankNetWorth: () => s.calculateTankNetWorth(),
    getTotalFoodInventory: () => s.getTotalFoodInventory(),
    getCompactTankNeedIndicator: () => s.getCompactTankNeedIndicator(),
    getTankNeedIndicator: () => s.getTankNeedIndicator(),
    getHudNeedLabel: () => s.getHudNeedLabel(),
    getPlacementMode: () => s.placementMode,
    timeCurrentRemainingSeconds: () => s.timeCurrentRemainingSeconds()
  };
}
