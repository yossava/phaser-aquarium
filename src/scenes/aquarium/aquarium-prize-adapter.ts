import type Phaser from "phaser";
import type { AquariumPrizeControllerHost } from "./aquarium-prize-controller";
import type { AquariumSceneCore } from "./AquariumSceneCore";

type AquariumPrizeAdapterScene = Phaser.Scene & Record<string, any>;

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
    addFishToInventory: (fishType, showBubble = true) => source.addFishToInventory(fishType, 1, showBubble),
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
