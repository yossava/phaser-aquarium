import Phaser from "phaser";
import type { DailyGoalsState, DailyQuestItem, DailyQuestReward, RewardedAdKind, RewardedAdOption, RewardedAdState } from "../../game/quest-system";
import type { FishType, FoodType, HelperCreatureType, Price, Wallet } from "../../types/mechanics";
import type { QuestPresentDrop } from "../../objects/QuestPresentDrop";
import type { Fish } from "../../objects/Fish";
import type { AquariumSceneCore } from "./AquariumSceneCore";
import type { AppScreen } from "./aquarium-scene-config";
import type { AquariumDailyGoalsControllerHost } from "./aquarium-daily-goals-controller";

type DailyGoalsAdapterScene = {
  activeScreen: AppScreen;
  dailyGoals: DailyGoalsState;
  rewardedAd?: RewardedAdState;
  rewardedAdRefreshTimer?: Phaser.Time.TimerEvent;
  rewardedAdCountdownText?: HTMLSpanElement;
  rewardedAdModalButton?: HTMLButtonElement;
  questPresents: Array<{ drop: QuestPresentDrop; reward: DailyQuestReward }>;
  wallet: Wallet;
  coinDrops: import("../../objects/CoinDrop").CoinDrop[];
  foodInventory: Map<string, number>;
  recentInventoryDockItemKey?: string;
  coinMagnetWasActive?: boolean;
  autoFoodBuyerWasActive?: boolean;
  careFoodTargetFish: Map<string, Fish>;
  getDailyGoals: () => DailyGoalsState;
  setDailyGoals: (goals: DailyGoalsState) => void;
  getRewardedAd: () => RewardedAdState | undefined;
  setRewardedAd: (ad: RewardedAdState | undefined) => void;
  getRewardedAdRefreshTimer: () => Phaser.Time.TimerEvent | undefined;
  setRewardedAdRefreshTimer: (timer: Phaser.Time.TimerEvent | undefined) => void;
  getRewardedAdCountdownText: () => HTMLSpanElement | undefined;
  setRewardedAdCountdownText: (el: HTMLSpanElement | undefined) => void;
  getRewardedAdModalButton: () => HTMLButtonElement | undefined;
  setRewardedAdModalButton: (el: HTMLButtonElement | undefined) => void;
  getQuestPresents: () => Array<{ drop: QuestPresentDrop; reward: DailyQuestReward }>;
  getWallet: () => Wallet;
  activeFish: () => Fish[];
  ownedFishTypeIds: () => Set<string>;
  ownedHelperCreatureTypeIds: () => Set<string>;
  tankDisplayLevel: () => number;
  calculateTotalWealth: () => number;
  totalStoredFishCount: () => number;
  totalFeedableFoodInventory: () => number;
  getFoodInventory: (foodTypeId: string) => number;
  setFoodInventory: (foodTypeId: string, count: number) => void;
  foodTypeById: (foodTypeId: string) => FoodType | undefined;
  isCalorieTrackedFood: (foodTypeId: string) => boolean;
  isDroppableFood: (foodTypeId: string) => boolean;
  getDecorationInventory: (key: string) => number;
  setDecorationInventory: (key: string, count: number) => void;
  setRecentInventoryDockItemKey: (key: string) => void;
  selectFood: (foodTypeId: string) => void;
  coinMagnetExpiresAt: () => number;
  autoFoodBuyerExpiresAt: () => number;
  setCoinMagnetWasActive: (value: boolean) => void;
  setAutoFoodBuyerWasActive: (value: boolean) => void;
  oldestActiveFish: () => Fish | undefined;
  setCareFoodTargetFish: (foodTypeId: string, fish: Fish | undefined) => void;
  phaseOneComplete: () => boolean;
  phaseTwoStarted: () => boolean;
  phaseTwoComplete: () => boolean;
  phaseThreeStarted: () => boolean;
  phaseThreeCleanQuestActive: () => boolean;
  activeFishCount: () => number;
  sickFishCount: () => number;
  coinDropCount: () => number;
  ownsNewBackground: () => boolean;
  ownsNewSeabed: () => boolean;
  ownsPhaseTwoDecoration: () => boolean;
  floatText: (message: string, x: number, y: number, color: string) => void;
  playSfx: (soundKey: string, options?: { volume?: number }) => void;
  closeModal: (skipAnimation?: boolean) => void;
  refreshUi: (renderControls?: boolean) => void;
  createFoodDock: () => void;
  saveNow: () => void;
  attachTouchFeedback: (button: HTMLButtonElement) => void;
  htmlButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;
  createQuestPresentDrop: (questId: string, reward: DailyQuestReward, label: string) => QuestPresentDrop | undefined;
  showPrizeCelebration: (title: string, imageUrl: string, detail: string, buttonLabel?: string, onClose?: () => void) => void;
  tankUtilityIconPath: (utilityId: string) => string;
  addFishToInventory: (fishType: FishType, quantity?: number) => void;
  recordDailyQuestAction: (action: string) => void;
};

export function createAquariumDailyGoalsControllerHost(scene: AquariumSceneCore): AquariumDailyGoalsControllerHost {
  const s = scene as unknown as DailyGoalsAdapterScene;
  return {
    scene,
    getActiveScreen: () => s.activeScreen,
    getDailyGoals: () => s.dailyGoals,
    setDailyGoals: (goals) => { s.dailyGoals = goals; },
    getRewardedAd: () => s.rewardedAd,
    setRewardedAd: (ad) => { s.rewardedAd = ad; },
    getRewardedAdRefreshTimer: () => s.rewardedAdRefreshTimer,
    setRewardedAdRefreshTimer: (timer) => { s.rewardedAdRefreshTimer = timer; },
    getRewardedAdCountdownText: () => s.rewardedAdCountdownText,
    setRewardedAdCountdownText: (el) => { s.rewardedAdCountdownText = el; },
    getRewardedAdModalButton: () => s.rewardedAdModalButton,
    setRewardedAdModalButton: (el) => { s.rewardedAdModalButton = el; },
    getQuestPresents: () => s.questPresents,
    getWallet: () => s.wallet,
    foodInventory: s.foodInventory,
    activeFish: () => s.activeFish(),
    ownedFishTypeIds: () => s.ownedFishTypeIds(),
    ownedHelperCreatureTypeIds: () => s.ownedHelperCreatureTypeIds(),
    tankDisplayLevel: () => s.tankDisplayLevel(),
    calculateTotalWealth: () => s.calculateTotalWealth(),
    totalStoredFishCount: () => s.totalStoredFishCount(),
    totalFeedableFoodInventory: () => s.totalFeedableFoodInventory(),
    getFoodInventory: (foodTypeId) => s.getFoodInventory(foodTypeId as never),
    foodTypeById: (foodTypeId) => s.foodTypeById(foodTypeId as never),
    isCalorieTrackedFood: (foodTypeId) => s.isCalorieTrackedFood(foodTypeId as never),
    isDroppableFood: (foodTypeId) => s.isDroppableFood(foodTypeId as never),
    getDecorationInventory: (key) => s.getDecorationInventory(key),
    setDecorationInventory: (key, count) => { s.setDecorationInventory(key, count); },
    setRecentInventoryDockItemKey: (key) => { s.recentInventoryDockItemKey = key; },
    selectFood: (foodTypeId) => { s.selectFood(foodTypeId as never); },
    coinMagnetExpiresAt: () => s.coinMagnetExpiresAt(),
    autoFoodBuyerExpiresAt: () => s.autoFoodBuyerExpiresAt(),
    setCoinMagnetWasActive: (value) => { s.coinMagnetWasActive = value; },
    setAutoFoodBuyerWasActive: (value) => { s.autoFoodBuyerWasActive = value; },
    oldestActiveFish: () => s.oldestActiveFish(),
    setCareFoodTargetFish: (foodTypeId, fish) => { s.careFoodTargetFish.set(foodTypeId, fish as Fish); },
    phaseOneComplete: () => s.phaseOneComplete(),
    phaseTwoStarted: () => s.phaseTwoStarted(),
    phaseTwoComplete: () => s.phaseTwoComplete(),
    phaseThreeStarted: () => s.phaseThreeStarted(),
    phaseThreeCleanQuestActive: () => s.phaseThreeCleanQuestActive(),
    activeFishCount: () => s.activeFish().length,
    sickFishCount: () => s.sickFishCount(),
    coinDropCount: () => s.coinDrops.length,
    ownsNewBackground: () => s.ownsNewBackground(),
    ownsNewSeabed: () => s.ownsNewSeabed(),
    ownsPhaseTwoDecoration: () => s.ownsPhaseTwoDecoration(),
    floatText: (message, x, y, color) => s.floatText(message, x, y, color),
    playSfx: (soundKey, options) => s.playSfx(soundKey, options),
    closeModal: (skipAnimation) => s.closeModal(skipAnimation),
    refreshUi: (renderControls) => s.refreshUi(renderControls),
    createFoodDock: () => s.createFoodDock(),
    saveNow: () => s.saveNow(),
    attachTouchFeedback: (button) => s.attachTouchFeedback(button),
    htmlButton: (label, className, onClick, disabled) => s.htmlButton(label, className, onClick, disabled),
    createQuestPresentDrop: (questId, reward, label) => s.createQuestPresentDrop(questId, reward, label),
    showPrizeCelebration: (title, imageUrl, detail, buttonLabel, onClose) => s.showPrizeCelebration(title, imageUrl, detail, buttonLabel, onClose),
    tankUtilityIconPath: (utilityId) => s.tankUtilityIconPath(utilityId as never),
    addFishToInventory: (fishType, quantity) => s.addFishToInventory(fishType, quantity),
    recordDailyQuestAction: (action) => s.recordDailyQuestAction(action)
  };
}
