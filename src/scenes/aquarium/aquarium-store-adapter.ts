import type { DecorationType, FishType, FoodType, FoodTypeId, Price, Wallet } from "../../types/mechanics";
import type { DecorationSize, TankCosmetic } from "../../game/tank-catalog";
import type { Fish } from "../../objects/Fish";
import type { ModalAction } from "../../ui/modal";
import type { StoreOverlay } from "../../ui/StoreOverlay";
import type { AppScreen, PlacementMode } from "./aquarium-scene-config";
import type { StoreControllerAdapter } from "./aquarium-scene-store-controller";

type AquariumStoreAdapterScene = {
  wallet: Wallet;
  activeScreen: AppScreen;
  tankLevel: number;
  developerGodMode: boolean;
  fish: Fish[];
  helperCreatures: Array<{ type: { id: string } }>;
  storeOverlay?: StoreOverlay;
  recentInventoryDockItemKey: string;
  placementMode: PlacementMode;
  selectedFoodTypeId: FoodTypeId;
  foodInventory: Map<FoodTypeId, number>;
  decorationInventory: Map<string, number>;
  coinMagnetWasActive: boolean;
  autoFoodBuyerWasActive: boolean;
  time: { now: number };
  fishDeliveryBubbles?: { bubbles: Array<{ destination: string }> };
  careFoodTargetFish: Map<FoodTypeId, Fish>;

  calculateTankNetWorth(): number;
  getTankName(tankLevel: number): string;
  tankDisplayLevel(): number;
  recentFishPurchaseCount(): number;
  hourlyFishPurchaseLimit(): number;
  fishPurchaseRestockLabel(): string;
  canBuyGrowthTonicThisHour(): boolean;
  growthTonicPurchaseRestockLabel(): string;
  canBuyProductionBoostNow(): boolean;
  productionBoostPurchaseRestockLabel(): string;
  activeFish(): Fish[];
  maxFishCapacityForLevel(): number;
  getFishInventory(fishTypeId: string): number;
  getFoodInventory(foodTypeId: FoodTypeId): number;
  getFoodBuyQuantity(foodTypeId: FoodTypeId): number;
  foodInventoryDisplayCount(foodType: FoodType): number;
  getCreatureInventory(helperTypeId: string): number;
  tankCosmetics(category: TankCosmetic["category"]): TankCosmetic[];
  ownsTankCosmetic(asset: TankCosmetic): boolean;
  selectedTankCosmeticId(category: TankCosmetic["category"]): string;
  tankCosmeticImageUrl(asset: TankCosmetic): string | undefined;
  hexColor(color: number): string;
  tankCosmeticBlueTintIntensity(category: TankCosmetic["category"], id: string): number;
  getDecorationInventory(decorationTypeId: string, size: DecorationSize): number;
  decorationVariantPrice(decorationType: DecorationType, size: DecorationSize): Price;
  hasFoodDispenser(): boolean;
  hasCoinMagnet(): boolean;
  hasAutoFoodBuyer(): boolean;
  closeModal(): void;
  returnToTankScreen(): void;
  refreshUi(renderControls?: boolean): void;
  createFoodDock(): void;
  saveNow(): void;
  spendPrice(price: Price): boolean;
  floatText(message: string, x: number, y: number, color: string): void;
  recordDailyQuestAction(action: string): void;
  ensureFishTexturesLoaded(fishType: FishType): void;
  quantityPrice(price: Price, quantity: number): Price;
  attachTouchFeedback(button: HTMLButtonElement): void;
  showModal(title: string, lines: string[], actions: ModalAction[], bodyElements?: HTMLElement[]): void;
  addFishToInventory(fishType: FishType, quantity: number, showBubble: boolean): void;
  recordFishPurchase(fishType: FishType): void;
  randomFishPlacement(): { x: number; y: number };
  spawnFishTankBubble(fishType: FishType, x: number, y: number): void;
  spawnFishInventoryBubble(fishType: FishType, quantity: number): void;
  getSelectedFoodType(): FoodType;
  isCalorieTrackedFood(foodTypeId: FoodTypeId): boolean;
  isDroppableFood(foodTypeId: FoodTypeId): boolean;
  closePage(): void;
  recordGrowthTonicPurchase(): void;
  recordProductionBoostPurchase(): void;
  priceIconRow(price: Price, label: string): HTMLElement;
  htmlButton(label: string, className: string, onClick: () => void, disabled?: boolean): HTMLButtonElement;
};

export function createAquariumStoreAdapter(scene: AquariumStoreAdapterScene): StoreControllerAdapter {
  return {
    wallet: () => scene.wallet,
    wealth: () => scene.calculateTankNetWorth(),
    activeScreen: () => scene.activeScreen,
    activeTankName: () => scene.getTankName(scene.tankLevel),
    activeTankLevel: () => scene.tankDisplayLevel(),
    activeTankSlot: () => scene.tankLevel,
    developerGodMode: () => scene.developerGodMode,
    recentFishPurchaseCount: () => scene.recentFishPurchaseCount(),
    hourlyFishPurchaseLimit: () => scene.hourlyFishPurchaseLimit(),
    fishPurchaseRestockLabel: () => scene.fishPurchaseRestockLabel(),
    canBuyGrowthTonicThisHour: () => scene.canBuyGrowthTonicThisHour(),
    growthTonicPurchaseRestockLabel: () => scene.growthTonicPurchaseRestockLabel(),
    canBuyProductionBoostNow: () => scene.canBuyProductionBoostNow(),
    productionBoostPurchaseRestockLabel: () => scene.productionBoostPurchaseRestockLabel(),
    activeFish: () => scene.activeFish(),
    fishCapacity: () => scene.maxFishCapacityForLevel(),
    allFish: () => scene.fish,
    getFishInventory: (fishTypeId) => scene.getFishInventory(fishTypeId),
    getFoodInventory: (foodTypeId) => scene.getFoodInventory(foodTypeId),
    getFoodBuyQuantity: (foodTypeId) => scene.getFoodBuyQuantity(foodTypeId),
    foodInventoryDisplayCount: (foodType) => scene.foodInventoryDisplayCount(foodType),
    getHelperOwned: (helperTypeId) =>
      scene.helperCreatures.filter((helper) => helper.type.id === helperTypeId).length +
      scene.getCreatureInventory(helperTypeId),
    tankCosmetics: (category) => scene.tankCosmetics(category),
    ownsTankCosmetic: (asset) => scene.ownsTankCosmetic(asset),
    selectedTankCosmeticId: (category) => scene.selectedTankCosmeticId(category),
    tankCosmeticImageUrl: (asset) => scene.tankCosmeticImageUrl(asset),
    colorToHex: (color) => scene.hexColor(color),
    tankCosmeticBlueTintIntensity: (category, id) => scene.tankCosmeticBlueTintIntensity(category, id),
    getDecorationInventory: (decorationTypeId, size) => scene.getDecorationInventory(decorationTypeId, size),
    decorationVariantPrice: (decorationType, size) => scene.decorationVariantPrice(decorationType, size),
    hasFoodDispenser: () => scene.hasFoodDispenser(),
    hasCoinMagnet: () => scene.hasCoinMagnet(),
    hasAutoFoodBuyer: () => scene.hasAutoFoodBuyer(),
    closeModal: () => scene.closeModal(),
    returnToTankScreen: () => scene.returnToTankScreen(),
    refreshStoreOverlay: () => scene.storeOverlay?.refresh(),
    refreshUi: (renderControls?: boolean) => scene.refreshUi(renderControls),
    createFoodDock: () => scene.createFoodDock(),
    saveNow: () => scene.saveNow(),
    spendPrice: (price) => scene.spendPrice(price),
    floatText: (message, x, y, color) => scene.floatText(message, x, y, color),
    setRecentInventoryDockItemKey: (key) => {
      scene.recentInventoryDockItemKey = key;
    },
    setPlacementMode: (mode) => {
      scene.placementMode = mode;
    },
    recordDailyQuestAction: (action) => scene.recordDailyQuestAction(action),
    ensureFishTexturesLoaded: (fishType) => scene.ensureFishTexturesLoaded(fishType),
    quantityPrice: (price, quantity) => scene.quantityPrice(price, quantity),
    attachTouchFeedback: (button) => scene.attachTouchFeedback(button),
    showModal: (title, lines, actions, bodyElements) => scene.showModal(title, lines, actions, bodyElements),
    fishDeliveryTankBubbleCount: () =>
      scene.fishDeliveryBubbles?.bubbles.filter((pending) => pending.destination === "tank").length ?? 0,
    addFishToInventory: (fishType, quantity, showBubble) => scene.addFishToInventory(fishType, quantity, showBubble),
    recordFishPurchase: (fishType) => scene.recordFishPurchase(fishType),
    randomFishPlacement: () => scene.randomFishPlacement(),
    spawnFishTankBubble: (fishType, x, y) => scene.spawnFishTankBubble(fishType, x, y),
    spawnFishInventoryBubble: (fishType, quantity) => scene.spawnFishInventoryBubble(fishType, quantity),
    selectedFoodType: () => scene.getSelectedFoodType(),
    isCalorieTrackedFood: (foodTypeId) => scene.isCalorieTrackedFood(foodTypeId),
    setFoodInventory: (foodTypeId, amount) => scene.foodInventory.set(foodTypeId, amount),
    isDroppableFood: (foodTypeId) => scene.isDroppableFood(foodTypeId),
    setSelectedFoodTypeId: (foodTypeId) => {
      scene.selectedFoodTypeId = foodTypeId;
    },
    closePage: () => scene.closePage(),
    recordGrowthTonicPurchase: () => scene.recordGrowthTonicPurchase(),
    recordProductionBoostPurchase: () => scene.recordProductionBoostPurchase(),
    setCareFoodTargetFish: (foodTypeId, fish) => scene.careFoodTargetFish.set(foodTypeId, fish),
    priceIconRow: (price, label) => scene.priceIconRow(price, label),
    fishIndex: (fish) => scene.fish.indexOf(fish),
    createButton: (label, className, onClick, disabled = false) =>
      scene.htmlButton(label, className, onClick, disabled),
    now: () => scene.time.now,
    setDecorationInventory: (key, value) => scene.decorationInventory.set(key, value),
    setCoinMagnetWasActive: (value) => {
      scene.coinMagnetWasActive = value;
    },
    setAutoFoodBuyerWasActive: (value) => {
      scene.autoFoodBuyerWasActive = value;
    }
  };
}
