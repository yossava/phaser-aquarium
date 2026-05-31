import type Phaser from "phaser";
import type { DecorationSize } from "../../game/tank-catalog";
import type { PrizeMachineState } from "../../game/prize-machine";
import type { Fish } from "../../objects/Fish";
import type { DecorationType, FishType, FoodType, FoodTypeId, Price, Wallet } from "../../types/mechanics";
import type { PageButtonFactory } from "../../ui/PageOverlay";
import type { AppScreen, PlacementMode } from "./aquarium-scene-config";
import type { AquariumPrizeControllerHost } from "./aquarium-prize-controller";
import type { AquariumSceneCore } from "./AquariumSceneCore";

type AquariumPrizeAdapterScene = Phaser.Scene & {
  prizeMachineRuntimeSessionId: number;
  activeScreen: AppScreen;
  placementMode: PlacementMode;
  modal?: HTMLDivElement;
  storeOverlay?: { hide: () => void };
  htmlPageOverlay?: HTMLElement;
  wallet: Wallet;
  developerGodMode: boolean;
  prizeMachine: PrizeMachineState;
  prizeMachineSelectedBetIndex: number | undefined;
  prizeSpinContainer?: Phaser.GameObjects.Container;
  prizeSpinInProgress: boolean;
  fish: Fish[];
  fishInventory: Map<string, number>;
  prizeCommonFish?: FishType;
  prizeRareFish?: FishType;
  foodInventory: Map<FoodTypeId, number>;
  recentInventoryDockItemKey: string;
  decorationInventory: Map<string, number>;
  closeModal: () => void;
  closePage: () => void;
  hideHtmlPageOverlay: () => void;
  createFoodDock: () => void;
  syncHtmlGameInterface: () => void;
  showModal: (title: string, lines: string[], actions: { label: string; fill: number; action: () => void }[], content: HTMLElement[]) => void;
  pageButtonFactory: () => PageButtonFactory;
  floatText: (message: string, x: number, y: number, color: string) => void;
  playSfx: (key: string, config?: Phaser.Types.Sound.SoundConfig) => void;
  saveNow: () => void;
  recordDailyQuestAction: (action: string) => void;
  spendPrice: (price: Price) => boolean;
  priceWealth: (price: Price) => number;
  ensureFishTexturesLoaded: (fishType: FishType) => void;
  isDroppableFood: (foodTypeId: FoodTypeId) => boolean;
  isCalorieTrackedFood: (foodTypeId: FoodTypeId) => boolean;
  foodTextureKey: (foodTypeId: FoodTypeId) => string;
  foodSellValue: (foodType: FoodType, storedAmount?: number) => number;
  decorationSellValue: (decorationType: DecorationType, size: DecorationSize, count?: number) => number;
  decorationVariantPrice: (decorationType: DecorationType, size: DecorationSize) => Price;
  coinSellValue: (coinType: "rare" | "superRare", count?: number) => number;
  storedFishSellValue: (fishType: FishType) => number;
  sanitizeDecorationSize: (size: string | undefined) => DecorationSize;
  addFishToInventory: (fishType: FishType, quantity?: number) => void;
  getFoodInventory: (foodTypeId: FoodTypeId) => number;
  decorationInventoryKey: (decorationTypeId: string, size: DecorationSize) => string;
  showPrizeCelebration: (title: string, imageUrl: string, detail: string) => void;
};

export function createAquariumPrizeControllerHost(scene: AquariumSceneCore): AquariumPrizeControllerHost {
  const source = scene as unknown as AquariumPrizeAdapterScene;

  return {
    scene,
    runtimeSessionId: source.prizeMachineRuntimeSessionId,
    getActiveScreen: () => source.activeScreen,
    setActiveScreen: (screen) => {
      source.activeScreen = screen;
    },
    setPlacementMode: (mode) => {
      source.placementMode = mode;
    },
    hasModal: () => Boolean(source.modal),
    closeModal: () => source.closeModal(),
    closePage: () => source.closePage(),
    hideStoreOverlay: () => source.storeOverlay?.hide(),
    hideHtmlPageOverlay: () => source.hideHtmlPageOverlay(),
    hideHtmlPageOverlayClass: () => source.htmlPageOverlay?.classList.add("hidden"),
    createFoodDock: () => source.createFoodDock(),
    syncHtmlGameInterface: () => source.syncHtmlGameInterface(),
    showModal: (title, lines, actions, content) => source.showModal(title, lines, actions, content),
    pageButtonFactory: () => source.pageButtonFactory(),
    floatText: (message, x, y, color) => source.floatText(message, x, y, color),
    playSfx: (key, config) => source.playSfx(key, config),
    saveNow: () => source.saveNow(),
    recordDailyQuestAction: (action) => source.recordDailyQuestAction(action),
    spendPrice: (price) => source.spendPrice(price),
    priceWealth: (price) => source.priceWealth(price),
    getWallet: () => source.wallet,
    isDeveloperGodMode: () => source.developerGodMode,
    getPrizeMachine: () => source.prizeMachine,
    setPrizeMachine: (state) => {
      source.prizeMachine = state;
    },
    getSelectedBetIndex: () => source.prizeMachineSelectedBetIndex,
    setSelectedBetIndex: (index) => {
      source.prizeMachineSelectedBetIndex = index;
    },
    getSpinContainer: () => source.prizeSpinContainer,
    setSpinContainer: (container) => {
      source.prizeSpinContainer = container;
    },
    isSpinInProgress: () => source.prizeSpinInProgress,
    setSpinInProgress: (inProgress) => {
      source.prizeSpinInProgress = inProgress;
    },
    getFish: () => source.fish,
    getFishInventory: () => source.fishInventory,
    textureExists: (textureKey) => source.textures.exists(textureKey),
    ensureFishTexturesLoaded: (fishType) => source.ensureFishTexturesLoaded(fishType),
    isDroppableFood: (foodTypeId) => source.isDroppableFood(foodTypeId),
    isCalorieTrackedFood: (foodTypeId) => source.isCalorieTrackedFood(foodTypeId),
    foodTextureKey: (foodTypeId) => source.foodTextureKey(foodTypeId),
    foodSellValue: (foodType, storedAmount) => source.foodSellValue(foodType, storedAmount),
    decorationSellValue: (decorationType, size, count) => source.decorationSellValue(decorationType, size, count),
    decorationVariantPrice: (decorationType, size) => source.decorationVariantPrice(decorationType, size),
    coinSellValue: (coinType, count) => source.coinSellValue(coinType, count),
    storedFishSellValue: (fishType) => source.storedFishSellValue(fishType),
    sanitizeDecorationSize: (size) => source.sanitizeDecorationSize(size),
    addFishToInventory: (fishType) => source.addFishToInventory(fishType),
    setPrizeCommonFish: (fishType) => {
      source.prizeCommonFish = fishType;
    },
    setPrizeRareFish: (fishType) => {
      source.prizeRareFish = fishType;
    },
    getFoodInventory: (foodTypeId) => source.getFoodInventory(foodTypeId),
    setFoodInventory: (foodTypeId, amount) => {
      source.foodInventory.set(foodTypeId, amount);
    },
    setRecentInventoryDockItemKey: (key) => {
      source.recentInventoryDockItemKey = key;
    },
    decorationInventoryKey: (decorationTypeId, size) => source.decorationInventoryKey(decorationTypeId, size),
    addDecorationInventory: (inventoryKey, amount) => {
      source.decorationInventory.set(inventoryKey, (source.decorationInventory.get(inventoryKey) ?? 0) + amount);
    },
    showPrizeCelebration: (title, imageUrl, detail) => source.showPrizeCelebration(title, imageUrl, detail)
  };
}
