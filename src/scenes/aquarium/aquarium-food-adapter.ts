import type Phaser from "phaser";
import type { FoodPellet } from "../../objects/FoodPellet";
import type { Fish } from "../../objects/Fish";
import type { FoodTypeId, Price, Wallet } from "../../types/mechanics";
import type { PlacementMode } from "./aquarium-scene-config";
import type { AquariumFoodControllerHost } from "./aquarium-food-controller";
import type { AquariumSceneCore } from "./AquariumSceneCore";

type AquariumFoodAdapterScene = Phaser.Scene & {
  wallet: Wallet;
  developerGodMode: boolean;
  foods: FoodPellet[];
  foodPelletPool: FoodPellet[];
  foodInventory: Map<FoodTypeId, number>;
  careFoodTargetFish: Map<FoodTypeId, Fish>;
  selectedFoodTypeId: FoodTypeId;
  placementMode: PlacementMode;
  cleanliness: number;
  tankLayer: Phaser.GameObjects.Container;
  foodDispenserElement?: HTMLDivElement;
  foodDispenserY: number;
  nextFoodDispenseAt: number;
  nextAutoFoodBuyerPurchaseAt: number;
  coinMagnetWasActive: boolean;
  coinMagnetDisplayedMinutes: number;
  autoFoodBuyerWasActive: boolean;
  autoFoodBuyerDisplayedMinutes: number;
  decorationInventory: Map<string, number>;
  magnetCollectingCoins: Set<unknown>;
  storeOverlay?: { refresh: () => void };
  getFoodInventory: (foodTypeId: FoodTypeId) => number;
  getTotalFeedableFoodInventory: () => number;
  activeFish: () => Fish[];
  tankViewScaleForLevel: () => number;
  screenToTankPoint: (x: number, y: number) => Phaser.Math.Vector2;
  hasFoodDispenser: () => boolean;
  hasAutoFoodBuyer: () => boolean;
  autoFoodBuyerTankPosition: () => Phaser.Math.Vector2;
  quantityPrice: (price: Price, quantity: number) => Price;
  priceWealth: (price: Price) => number;
  hasCoinMagnet: () => boolean;
  coinMagnetRemainingMinutes: () => number;
  autoFoodBuyerRemainingMinutes: () => number;
  floatText: (message: string, x: number, y: number, color: string) => void;
  floatTankText: (message: string, x: number, y: number, color: string) => void;
  recordDailyQuestAction: (action: string) => void;
  createFoodDock: () => void;
  refreshUi: (renderControls?: boolean) => void;
  saveNow: () => void;
};

export function createAquariumFoodControllerHost(scene: AquariumSceneCore): AquariumFoodControllerHost {
  const aquariumScene = scene as unknown as AquariumFoodAdapterScene;
  return {
    scene: aquariumScene,
    getWallet: () => aquariumScene.wallet,
    isDeveloperGodMode: () => aquariumScene.developerGodMode,
    getFoods: () => aquariumScene.foods,
    getFoodPelletPool: () => aquariumScene.foodPelletPool,
    getFoodInventory: (foodTypeId) => aquariumScene.getFoodInventory(foodTypeId),
    setFoodInventory: (foodTypeId, amount) => aquariumScene.foodInventory.set(foodTypeId, amount),
    getTotalFeedableFoodInventory: () => aquariumScene.getTotalFeedableFoodInventory(),
    getCareFoodTarget: (foodTypeId) => aquariumScene.careFoodTargetFish.get(foodTypeId),
    clearCareFoodTarget: (foodTypeId) => aquariumScene.careFoodTargetFish.delete(foodTypeId),
    activeFish: () => aquariumScene.activeFish(),
    setSelectedFoodTypeId: (foodTypeId) => {
      aquariumScene.selectedFoodTypeId = foodTypeId;
    },
    setPlacementMode: (mode) => {
      aquariumScene.placementMode = mode;
    },
    getCleanliness: () => aquariumScene.cleanliness,
    setCleanliness: (cleanliness) => {
      aquariumScene.cleanliness = cleanliness;
    },
    getTankLayer: () => aquariumScene.tankLayer,
    tankViewScaleForLevel: () => aquariumScene.tankViewScaleForLevel(),
    screenToTankPoint: (x, y) => aquariumScene.screenToTankPoint(x, y),
    getFoodDispenserElement: () => aquariumScene.foodDispenserElement,
    getFoodDispenserY: () => aquariumScene.foodDispenserY,
    hasFoodDispenser: () => aquariumScene.hasFoodDispenser(),
    getNextFoodDispenseAt: () => aquariumScene.nextFoodDispenseAt,
    setNextFoodDispenseAt: (time) => {
      aquariumScene.nextFoodDispenseAt = time;
    },
    hasAutoFoodBuyer: () => aquariumScene.hasAutoFoodBuyer(),
    getNextAutoFoodBuyerPurchaseAt: () => aquariumScene.nextAutoFoodBuyerPurchaseAt,
    setNextAutoFoodBuyerPurchaseAt: (time) => {
      aquariumScene.nextAutoFoodBuyerPurchaseAt = time;
    },
    autoFoodBuyerTankPosition: () => aquariumScene.autoFoodBuyerTankPosition(),
    quantityPrice: (price, quantity) => aquariumScene.quantityPrice(price, quantity),
    priceWealth: (price) => aquariumScene.priceWealth(price),
    hasCoinMagnet: () => aquariumScene.hasCoinMagnet(),
    coinMagnetRemainingMinutes: () => aquariumScene.coinMagnetRemainingMinutes(),
    autoFoodBuyerRemainingMinutes: () => aquariumScene.autoFoodBuyerRemainingMinutes(),
    getCoinMagnetWasActive: () => aquariumScene.coinMagnetWasActive,
    setCoinMagnetWasActive: (active) => {
      aquariumScene.coinMagnetWasActive = active;
    },
    getCoinMagnetDisplayedMinutes: () => aquariumScene.coinMagnetDisplayedMinutes,
    setCoinMagnetDisplayedMinutes: (minutes) => {
      aquariumScene.coinMagnetDisplayedMinutes = minutes;
    },
    getAutoFoodBuyerWasActive: () => aquariumScene.autoFoodBuyerWasActive,
    setAutoFoodBuyerWasActive: (active) => {
      aquariumScene.autoFoodBuyerWasActive = active;
    },
    getAutoFoodBuyerDisplayedMinutes: () => aquariumScene.autoFoodBuyerDisplayedMinutes,
    setAutoFoodBuyerDisplayedMinutes: (minutes) => {
      aquariumScene.autoFoodBuyerDisplayedMinutes = minutes;
    },
    deleteDecorationInventory: (inventoryKey) => aquariumScene.decorationInventory.delete(inventoryKey),
    clearMagnetCollectingCoins: () => aquariumScene.magnetCollectingCoins.clear(),
    floatText: (message, x, y, color) => aquariumScene.floatText(message, x, y, color),
    floatTankText: (message, x, y, color) => aquariumScene.floatTankText(message, x, y, color),
    recordDailyQuestAction: (action) => aquariumScene.recordDailyQuestAction(action),
    createFoodDock: () => aquariumScene.createFoodDock(),
    refreshUi: (renderControls) => aquariumScene.refreshUi(renderControls),
    refreshStoreOverlay: () => aquariumScene.storeOverlay?.refresh(),
    saveNow: () => aquariumScene.saveNow()
  };
}
