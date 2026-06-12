import type { AquariumSceneCore } from "./AquariumSceneCore";
import type { AquariumSellControllerHost } from "./aquarium-sell-controller";
import type { ModalContent } from "../../ui/SellConfirmationModals";
import type { TankUtilityId } from "../../game/dispenser-system";
import type { HelperCreature } from "../../objects/HelperCreature";
import type { FoodType, FoodTypeId, HelperCreatureType, Price, Wallet } from "../../types/mechanics";

type AquariumSellAdapterScene = {
  wallet: Wallet;
  foodInventory: Map<FoodTypeId, number>;
  decorationInventory: Map<string, number>;
  helperCreatures: HelperCreature[];
  getFoodInventory(foodTypeId: FoodTypeId): number;
  foodInventoryDisplayCount(foodType: FoodType): number;
  foodInventoryBadgeLabel(foodType: FoodType): string;
  isCalorieTrackedFood(foodTypeId: FoodTypeId): boolean;
  foodSellValue(foodType: FoodType, storedAmount?: number): number;
  coinSellValue(coinType: "rare" | "superRare", count?: number): number;
  helperSellPrice(creatureType: HelperCreatureType): HelperCreatureType["price"];
  tankUtilityInfo(utilityId: TankUtilityId): { name: string; price: Price; inventoryKey: string; owned: () => boolean } | undefined;
  tankUtilityIconPath(utilityId: TankUtilityId): string;
  tankUtilitySellValue(price: Price): number;
  removeHelperCreatureAt(index: number): HelperCreature | undefined;
  deactivateSoldUtility(utilityId: TankUtilityId): void;
  commonCoinValueRow(label: string, amount: number): HTMLElement;
  priceIconRow(price: Price, label?: string): HTMLElement;
  attachTouchFeedback(element: HTMLElement, releaseOnLeave?: boolean): void;
  showModalContent(content: ModalContent): void;
  floatText(message: string, x: number, y: number, color: string): void;
  floatTankText(message: string, x: number, y: number, color: string): void;
  recordDailyQuestAction(action: string): void;
  closeModal(immediate?: boolean): void;
  createFoodDock(): void;
  renderTabControls(): void;
  refreshUi(renderControls?: boolean): void;
  saveNow(savedAt?: number, immediate?: boolean): void;
  syncFoodDispenserPosition(): void;
  syncCoinMagnetPosition(): void;
  syncAutoFoodBuyerPosition(): void;
  syncHtmlPageOverlay(): void;
};

export function createAquariumSellControllerHost(scene: AquariumSceneCore): AquariumSellControllerHost {
  const aquariumScene = scene as unknown as AquariumSellAdapterScene;
  return {
    wallet: aquariumScene.wallet,
    foodInventory: aquariumScene.foodInventory,
    decorationInventory: aquariumScene.decorationInventory,
    helperCreatures: aquariumScene.helperCreatures,
    getFoodInventory: (foodTypeId) => aquariumScene.getFoodInventory(foodTypeId),
    foodInventoryDisplayCount: (foodType) => aquariumScene.foodInventoryDisplayCount(foodType),
    foodInventoryBadgeLabel: (foodType) => aquariumScene.foodInventoryBadgeLabel(foodType),
    isCalorieTrackedFood: (foodTypeId) => aquariumScene.isCalorieTrackedFood(foodTypeId),
    foodSellValue: (foodType, storedAmount) => aquariumScene.foodSellValue(foodType, storedAmount),
    coinSellValue: (coinType, count) => aquariumScene.coinSellValue(coinType, count),
    helperSellPrice: (creatureType) => aquariumScene.helperSellPrice(creatureType),
    tankUtilityInfo: (utilityId) => aquariumScene.tankUtilityInfo(utilityId),
    tankUtilityIconPath: (utilityId) => aquariumScene.tankUtilityIconPath(utilityId),
    tankUtilitySellValue: (price) => aquariumScene.tankUtilitySellValue(price),
    removeHelperCreatureAt: (index) => aquariumScene.removeHelperCreatureAt(index),
    deactivateSoldUtility: (utilityId) => aquariumScene.deactivateSoldUtility(utilityId),
    commonCoinValueRow: (label, amount) => aquariumScene.commonCoinValueRow(label, amount),
    priceIconRow: (price, label) => aquariumScene.priceIconRow(price, label),
    attachTouchFeedback: (element, releaseOnLeave) => aquariumScene.attachTouchFeedback(element, releaseOnLeave),
    showModalContent: (content) => aquariumScene.showModalContent(content),
    floatText: (message, x, y, color) => aquariumScene.floatText(message, x, y, color),
    floatTankText: (message, x, y, color) => aquariumScene.floatTankText(message, x, y, color),
    recordDailyQuestAction: (action) => aquariumScene.recordDailyQuestAction(action),
    closeModal: (immediate) => aquariumScene.closeModal(immediate),
    createFoodDock: () => aquariumScene.createFoodDock(),
    renderTabControls: () => aquariumScene.renderTabControls(),
    refreshUi: (renderControls) => aquariumScene.refreshUi(renderControls),
    saveNow: (savedAt, immediate) => aquariumScene.saveNow(savedAt, immediate),
    syncFoodDispenserPosition: () => aquariumScene.syncFoodDispenserPosition(),
    syncCoinMagnetPosition: () => aquariumScene.syncCoinMagnetPosition(),
    syncAutoFoodBuyerPosition: () => aquariumScene.syncAutoFoodBuyerPosition(),
    syncHtmlPageOverlay: () => aquariumScene.syncHtmlPageOverlay()
  };
}
