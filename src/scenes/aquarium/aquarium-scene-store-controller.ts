import {
  isTankUtilityId,
  tankUtilityInfo as tankUtilityInfoModel,
  tankUtilityStoreDefinitions
} from "../../game/dispenser-system";
import { toastX, toastY } from "../../game/constants";
import { canAfford, formatNumber, formatPrice } from "../../game/economy";
import { productionBoostFoodTypeId } from "../../game/food-system";
import { fishShopRequiredLevel, buildStoreOverlayState } from "../../game/store-catalog";
import {
  growthTonicPriceForFishType,
  planFishPurchase,
  planFoodPurchase,
  productionBoostPriceForFishType
} from "../../game/store-transactions";
import { decorationSizeOrder, decorationSizes, type DecorationSize, type TankCosmetic } from "../../game/tank-catalog";
import { Fish } from "../../objects/Fish";
import {
  createFishBuyQuantityModalContent,
  createFoodBuyQuantityModalContent,
  createGrowthTonicFishModalContent,
  createProductionBoostFishModalContent
} from "../../ui/store/StorePurchaseModals";
import type { StoreOverlayState } from "../../ui/StoreOverlay";
import type { ModalAction } from "../../ui/modal";
import type { DecorationType, FishType, FoodType, FoodTypeId, Price, Wallet } from "../../types/mechanics";
import type { AppScreen, PlacementMode } from "./aquarium-scene-config";
import {
  autoFoodBuyerDurationMs,
  coinAssetPathByType,
  coinMagnetDurationMs,
  maxFishBuyQuantity,
  maxFoodBuyQuantity
} from "./aquarium-scene-config";
import {
  closeStoreAfterPurchase,
  executeFishPurchase,
  executeFoodPurchase,
  executeTankUtilityPurchase
} from "./aquarium-scene-store-purchases";

export type StoreControllerAdapter = {
  wallet: () => Wallet;
  wealth: () => number;
  activeScreen: () => AppScreen;
  activeTankName: () => string;
  activeTankLevel: () => number;
  activeTankSlot: () => number;
  developerGodMode: () => boolean;
  recentFishPurchaseCount: () => number;
  hourlyFishPurchaseLimit: () => number;
  fishPurchaseRestockLabel: () => string;
  canBuyGrowthTonicThisHour: () => boolean;
  growthTonicPurchaseRestockLabel: () => string;
  canBuyProductionBoostNow: () => boolean;
  productionBoostPurchaseRestockLabel: () => string;
  activeFish: () => Fish[];
  fishCapacity: () => number;
  allFish: () => Fish[];
  getFishInventory: (fishTypeId: string) => number;
  getFoodInventory: (foodTypeId: FoodTypeId) => number;
  getFoodBuyQuantity: (foodTypeId: FoodTypeId) => number;
  foodInventoryDisplayCount: (foodType: FoodType) => number;
  getHelperOwned: (helperTypeId: string) => number;
  tankCosmetics: (category: TankCosmetic["category"]) => TankCosmetic[];
  ownsTankCosmetic: (asset: TankCosmetic) => boolean;
  selectedTankCosmeticId: (category: TankCosmetic["category"]) => string;
  tankCosmeticImageUrl: (asset: TankCosmetic) => string | undefined;
  colorToHex: (color: number) => string;
  tankCosmeticBlueTintIntensity: (category: TankCosmetic["category"], id: string) => number;
  getDecorationInventory: (decorationTypeId: string, size: DecorationSize) => number;
  decorationVariantPrice: (decorationType: DecorationType, size: DecorationSize) => Price;
  hasFoodDispenser: () => boolean;
  hasCoinMagnet: () => boolean;
  hasAutoFoodBuyer: () => boolean;
  closeModal: () => void;
  returnToTankScreen: () => void;
  refreshStoreOverlay: () => void;
  refreshUi: (renderControls?: boolean) => void;
  createFoodDock: () => void;
  saveNow: () => void;
  spendPrice: (price: Price) => boolean;
  floatText: (message: string, x: number, y: number, color: string) => void;
  setRecentInventoryDockItemKey: (key: string) => void;
  setPlacementMode: (mode: PlacementMode) => void;
  recordDailyQuestAction: (action: string) => void;
  ensureFishTexturesLoaded: (fishType: FishType) => void;
  quantityPrice: (price: Price, quantity: number) => Price;
  attachTouchFeedback: (button: HTMLButtonElement) => void;
  showModal: (title: string, lines: string[], actions: ModalAction[], bodyElements?: HTMLElement[]) => void;
  fishDeliveryTankBubbleCount: () => number;
  addFishToInventory: (fishType: FishType, quantity: number, showBubble: boolean) => void;
  recordFishPurchase: (fishType: FishType) => void;
  randomFishPlacement: () => { x: number; y: number };
  spawnFishTankBubble: (fishType: FishType, x: number, y: number) => void;
  spawnFishInventoryBubble: (fishType: FishType, quantity: number) => void;
  selectedFoodType: () => FoodType;
  isCalorieTrackedFood: (foodTypeId: FoodTypeId) => boolean;
  setFoodInventory: (foodTypeId: FoodTypeId, amount: number) => void;
  isDroppableFood: (foodTypeId: FoodTypeId) => boolean;
  setSelectedFoodTypeId: (foodTypeId: FoodTypeId) => void;
  closePage: () => void;
  recordGrowthTonicPurchase: () => void;
  recordProductionBoostPurchase: () => void;
  setCareFoodTargetFish: (foodTypeId: FoodTypeId, fish: Fish) => void;
  priceIconRow: (price: Price, label: string) => HTMLElement;
  fishIndex: (fish: Fish) => number;
  createButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;
  now: () => number;
  setDecorationInventory: (key: string, value: number) => void;
  setCoinMagnetWasActive: (value: boolean) => void;
  setAutoFoodBuyerWasActive: (value: boolean) => void;
};

export class AquariumSceneStoreController {
  constructor(private readonly adapter: StoreControllerAdapter) {}

  storeOverlayState(): StoreOverlayState {
    const adapter = this.adapter;
    return buildStoreOverlayState({
      wallet: { ...adapter.wallet() },
      wealth: adapter.wealth(),
      activeTankName: adapter.activeTankName(),
      activeTankLevel: adapter.activeTankLevel(),
      activeTankSlot: adapter.activeTankSlot(),
      developerGodMode: adapter.developerGodMode(),
      fishPurchasesInWindow: adapter.recentFishPurchaseCount(),
      fishPurchaseHourlyLimit: adapter.hourlyFishPurchaseLimit(),
      fishPurchaseRestockLabel: adapter.fishPurchaseRestockLabel(),
      ageBoostPurchaseAvailable: adapter.canBuyGrowthTonicThisHour(),
      ageBoostRestockLabel: adapter.growthTonicPurchaseRestockLabel(),
      productionBoostPurchaseAvailable: adapter.canBuyProductionBoostNow(),
      productionBoostRestockLabel: adapter.productionBoostPurchaseRestockLabel(),
      fishCount: adapter.activeFish().length,
      fishCapacity: adapter.fishCapacity(),
      getFishOwned: (fishTypeId) =>
        adapter.allFish().filter((currentFish) => currentFish.type.id === fishTypeId).length +
        adapter.getFishInventory(fishTypeId),
      getFoodOwned: (foodType) => adapter.foodInventoryDisplayCount(foodType),
      getHelperOwned: (helperTypeId) => adapter.getHelperOwned(helperTypeId),
      tankCosmetics: {
        background: adapter.tankCosmetics("background"),
        seabed: adapter.tankCosmetics("seabed")
      },
      ownsTankCosmetic: (asset) => adapter.ownsTankCosmetic(asset),
      selectedTankCosmeticId: (category) => adapter.selectedTankCosmeticId(category),
      tankCosmeticImageUrl: (asset) => adapter.tankCosmeticImageUrl(asset),
      colorToHex: (color) => adapter.colorToHex(color),
      tankCosmeticBlueTintIntensity: (category, id) => adapter.tankCosmeticBlueTintIntensity(category, id),
      decorationSizeOrder,
      decorationSizeLabel: (size) => decorationSizes[size].label,
      getDecorationInventory: (decorationTypeId, size) => adapter.getDecorationInventory(decorationTypeId, size),
      decorationVariantPrice: (decorationType, size) => adapter.decorationVariantPrice(decorationType, size),
      utilityDefinitions: tankUtilityStoreDefinitions({
        hasFoodDispenser: adapter.hasFoodDispenser(),
        hasCoinMagnet: adapter.hasCoinMagnet(),
        hasAutoFoodBuyer: adapter.hasAutoFoodBuyer()
      })
    });
  }

  closeStoreAfterPurchase(): void {
    closeStoreAfterPurchase(this.storePurchaseAdapter());
  }

  showFishBuyQuantityModal(fishType: FishType): void {
    const adapter = this.adapter;
    const requiredLevel = fishShopRequiredLevel(fishType);
    if (!adapter.developerGodMode() && requiredLevel > adapter.activeTankLevel()) {
      adapter.floatText(`Needs tank L${formatNumber(requiredLevel)}`, toastX, toastY, "#ffb0a8");
      return;
    }

    const remainingHourlyBuys = this.remainingHourlyFishBuys();
    if (remainingHourlyBuys <= 0) {
      adapter.floatText(`Fish shop ${adapter.fishPurchaseRestockLabel().toLowerCase()}`, toastX, toastY, "#ffdd8a");
      return;
    }

    adapter.ensureFishTexturesLoaded(fishType);
    const maxQuantity = Math.max(1, Math.min(maxFishBuyQuantity, remainingHourlyBuys));
    const owned = adapter.allFish().filter((fish) => fish.type.id === fishType.id).length + adapter.getFishInventory(fishType.id);
    const modalContent = createFishBuyQuantityModalContent({
      fishType,
      maxQuantity,
      owned,
      coinAssetPathByType,
      quantityPrice: (price, quantity) => adapter.quantityPrice(price, quantity),
      attachTouchFeedback: (button) => adapter.attachTouchFeedback(button),
      onBuy: (quantity) => this.buyFish(fishType, quantity),
      onCancel: () => adapter.closeModal()
    });

    adapter.showModal(fishType.name, [], modalContent.actions, modalContent.bodyElements);
  }

  buyFish(fishType: FishType, quantity = 1): void {
    const adapter = this.adapter;
    const requiredLevel = fishShopRequiredLevel(fishType);
    if (!adapter.developerGodMode() && requiredLevel > adapter.activeTankLevel()) {
      adapter.floatText(`Needs tank L${formatNumber(requiredLevel)}`, toastX, toastY, "#ffb0a8");
      return;
    }

    const remainingHourlyBuys = this.remainingHourlyFishBuys();
    if (remainingHourlyBuys <= 0) {
      adapter.floatText(`Fish shop ${adapter.fishPurchaseRestockLabel().toLowerCase()}`, toastX, toastY, "#ffdd8a");
      return;
    }

    const purchasePlan = planFishPurchase({
      fishType,
      requestedQuantity: quantity,
      maxFishBuyQuantity,
      remainingHourlyBuys,
      fishCapacity: adapter.fishCapacity(),
      activeFishCount: adapter.activeFish().length,
      pendingTankDeliveries: adapter.fishDeliveryTankBubbleCount()
    });
    if (!adapter.developerGodMode() && !canAfford(adapter.wallet(), purchasePlan.totalPrice)) {
      adapter.floatText(`Need ${formatPrice(purchasePlan.totalPrice)}`, toastX, toastY, "#ffb0a8");
      return;
    }

    executeFishPurchase({
      ...this.storePurchaseAdapter(),
      addFishToInventory: (type, count, showBubble) => adapter.addFishToInventory(type, count, showBubble),
      recordFishPurchase: (type) => adapter.recordFishPurchase(type),
      randomFishPlacement: () => adapter.randomFishPlacement(),
      spawnFishTankBubble: (type, x, y) => adapter.spawnFishTankBubble(type, x, y),
      spawnFishInventoryBubble: (type, count) => adapter.spawnFishInventoryBubble(type, count)
    }, fishType, purchasePlan);
  }

  showFoodBuyQuantityModal(foodType: FoodType, initialQuantity = this.adapter.getFoodBuyQuantity(foodType.id)): void {
    const adapter = this.adapter;
    if (foodType.id === "ageBoost") {
      this.showGrowthTonicFishModal(foodType);
      return;
    }

    if (foodType.id === productionBoostFoodTypeId) {
      this.showProductionBoostFishModal(foodType);
      return;
    }

    const modalContent = createFoodBuyQuantityModalContent({
      foodType,
      initialQuantity,
      maxQuantity: maxFoodBuyQuantity,
      coinAssetPathByType,
      quantityPrice: (price, quantity) => adapter.quantityPrice(price, quantity),
      attachTouchFeedback: (button) => adapter.attachTouchFeedback(button),
      onBuy: (quantity) => this.buyFood(foodType, quantity),
      onCancel: () => adapter.closeModal()
    });

    adapter.showModal(foodType.name, [], modalContent.actions, modalContent.bodyElements);
  }

  buyFood(foodType = this.adapter.selectedFoodType(), quantity = this.adapter.getFoodBuyQuantity(foodType.id)): void {
    const adapter = this.adapter;
    if (foodType.id === "ageBoost") {
      this.showGrowthTonicFishModal(foodType);
      return;
    }

    if (foodType.id === productionBoostFoodTypeId) {
      this.showProductionBoostFishModal(foodType);
      return;
    }

    const purchasePlan = planFoodPurchase({
      foodType,
      requestedQuantity: quantity,
      maxFoodBuyQuantity,
      isCalorieTrackedFood: (foodTypeId) => adapter.isCalorieTrackedFood(foodTypeId)
    });
    executeFoodPurchase({
      ...this.storePurchaseAdapter(),
      getFoodInventory: (foodTypeId) => adapter.getFoodInventory(foodTypeId),
      setFoodInventory: (foodTypeId, amount) => adapter.setFoodInventory(foodTypeId, amount),
      isDroppableFood: (foodTypeId) => adapter.isDroppableFood(foodTypeId),
      setSelectedFoodTypeId: (foodTypeId) => adapter.setSelectedFoodTypeId(foodTypeId),
      closePage: () => adapter.closePage(),
      recordGrowthTonicPurchase: () => adapter.recordGrowthTonicPurchase()
    }, foodType, purchasePlan);
  }

  showGrowthTonicFishModal(foodType: FoodType): void {
    const adapter = this.adapter;
    if (!adapter.developerGodMode() && !adapter.canBuyGrowthTonicThisHour()) {
      adapter.floatText(adapter.growthTonicPurchaseRestockLabel(), toastX, toastY, "#ffdd8a");
      adapter.refreshStoreOverlay();
      return;
    }

    const candidates = adapter.activeFish();
    if (candidates.length === 0) {
      adapter.floatText("No fish to grow", toastX, toastY, "#ffb0a8");
      return;
    }

    const bodyElements = createGrowthTonicFishModalContent({
      candidates,
      walletCanAfford: (price) => canAfford(adapter.wallet(), price),
      developerGodMode: adapter.developerGodMode(),
      priceForFish: (fish) => this.growthTonicPriceForFish(fish),
      priceIconRow: (price, label) => adapter.priceIconRow(price, label),
      fishIndex: (fish) => adapter.fishIndex(fish),
      createButton: (label, className, onClick, disabled = false) => adapter.createButton(label, className, onClick, disabled),
      attachTouchFeedback: (button) => adapter.attachTouchFeedback(button),
      onBuy: (fish) => this.buyGrowthTonicForFish(foodType, fish),
      onCancel: () => adapter.closeModal()
    });

    adapter.showModal("Growth Tonic", [], [], bodyElements);
  }

  growthTonicPriceForFish(fish: Fish): Price {
    return growthTonicPriceForFishType(fish.type);
  }

  buyGrowthTonicForFish(foodType: FoodType, fish: Fish): void {
    const adapter = this.adapter;
    if (!adapter.activeFish().includes(fish)) {
      adapter.floatText("Fish not found", toastX, toastY, "#ffb0a8");
      return;
    }
    if (!adapter.developerGodMode() && !adapter.canBuyGrowthTonicThisHour()) {
      adapter.floatText(adapter.growthTonicPurchaseRestockLabel(), toastX, toastY, "#ffdd8a");
      adapter.refreshStoreOverlay();
      return;
    }

    const price = this.growthTonicPriceForFish(fish);
    if (!adapter.spendPrice(price)) {
      return;
    }

    adapter.setFoodInventory(foodType.id, adapter.getFoodInventory(foodType.id) + 1);
    adapter.setCareFoodTargetFish(foodType.id, fish);
    adapter.recordGrowthTonicPurchase();
    adapter.recordDailyQuestAction("buy-growth-tonic");
    adapter.setRecentInventoryDockItemKey(`food:${foodType.id}`);
    adapter.setPlacementMode({ kind: "none" });
    adapter.floatText("Growth tonic docked", toastX, toastY, "#d9c2ff");
    adapter.closeModal();
    adapter.refreshStoreOverlay();
    adapter.refreshUi();
    adapter.createFoodDock();
    adapter.saveNow();
    this.closeStoreAfterPurchase();
  }

  showProductionBoostFishModal(foodType: FoodType): void {
    const adapter = this.adapter;
    if (!adapter.developerGodMode() && !adapter.canBuyProductionBoostNow()) {
      adapter.floatText(adapter.productionBoostPurchaseRestockLabel(), toastX, toastY, "#ffdd8a");
      adapter.refreshStoreOverlay();
      return;
    }

    const candidates = adapter.activeFish();
    if (candidates.length === 0) {
      adapter.floatText("No fish to boost", toastX, toastY, "#ffb0a8");
      return;
    }

    const availableFish = candidates.filter((fish) => fish.productionBoostUntil <= adapter.now());
    if (availableFish.length === 0) {
      adapter.floatText("All fish already boosted", toastX, toastY, "#d7f4ff");
      return;
    }

    const bodyElements = createProductionBoostFishModalContent({
      candidates,
      availableFish,
      now: adapter.now(),
      walletCanAfford: (price) => canAfford(adapter.wallet(), price),
      developerGodMode: adapter.developerGodMode(),
      priceForFish: (fish) => this.productionBoostPriceForFish(fish),
      fishIndex: (fish) => adapter.fishIndex(fish),
      createButton: (label, className, onClick, disabled = false) => adapter.createButton(label, className, onClick, disabled),
      attachTouchFeedback: (button) => adapter.attachTouchFeedback(button),
      onBuy: (fish) => this.buyProductionBoostForFish(foodType, fish),
      onCancel: () => adapter.closeModal()
    });

    adapter.showModal("Production Boost", [], [], bodyElements);
  }

  productionBoostPriceForFish(fish: Fish): Price {
    return productionBoostPriceForFishType(fish.type);
  }

  buyProductionBoostForFish(foodType: FoodType, fish: Fish): void {
    const adapter = this.adapter;
    if (!adapter.activeFish().includes(fish)) {
      adapter.floatText("Fish not found", toastX, toastY, "#ffb0a8");
      return;
    }
    if (!adapter.developerGodMode() && !adapter.canBuyProductionBoostNow()) {
      adapter.floatText(adapter.productionBoostPurchaseRestockLabel(), toastX, toastY, "#ffdd8a");
      adapter.refreshStoreOverlay();
      return;
    }
    if (fish.productionBoostUntil > adapter.now()) {
      adapter.floatText("Already boosted", toastX, toastY, "#d7f4ff");
      return;
    }

    const price = this.productionBoostPriceForFish(fish);
    if (!adapter.spendPrice(price)) {
      return;
    }

    adapter.setFoodInventory(foodType.id, adapter.getFoodInventory(foodType.id) + 1);
    adapter.setCareFoodTargetFish(foodType.id, fish);
    adapter.recordProductionBoostPurchase();
    adapter.recordDailyQuestAction("buy-production-boost");
    adapter.setRecentInventoryDockItemKey(`food:${foodType.id}`);
    adapter.setPlacementMode({ kind: "none" });
    adapter.floatText("Production boost docked", toastX, toastY, "#ffd34d");
    adapter.closeModal();
    adapter.refreshStoreOverlay();
    adapter.refreshUi();
    adapter.createFoodDock();
    adapter.saveNow();
    this.closeStoreAfterPurchase();
  }

  buyTankUtility(utilityId: string): void {
    const adapter = this.adapter;
    if (!isTankUtilityId(utilityId)) {
      return;
    }

    const utility = tankUtilityInfoModel(utilityId);
    if (!utility) {
      return;
    }

    executeTankUtilityPurchase({
      ...this.storePurchaseAdapter(),
      hasFoodDispenser: () => adapter.hasFoodDispenser(),
      hasCoinMagnet: () => adapter.hasCoinMagnet(),
      hasAutoFoodBuyer: () => adapter.hasAutoFoodBuyer(),
      setDecorationInventory: (key, value) => adapter.setDecorationInventory(key, value),
      setCoinMagnetWasActive: (value) => adapter.setCoinMagnetWasActive(value),
      setAutoFoodBuyerWasActive: (value) => adapter.setAutoFoodBuyerWasActive(value)
    }, {
      utilityId,
      utilityPrice: utility.price,
      now: Date.now(),
      coinMagnetDurationMs,
      autoFoodBuyerDurationMs
    });
  }

  private remainingHourlyFishBuys(): number {
    const adapter = this.adapter;
    return adapter.developerGodMode()
      ? maxFishBuyQuantity
      : Math.max(0, adapter.hourlyFishPurchaseLimit() - adapter.recentFishPurchaseCount());
  }

  private storePurchaseAdapter() {
    const adapter = this.adapter;
    return {
      activeScreen: () => adapter.activeScreen(),
      closeModal: () => adapter.closeModal(),
      returnToTankScreen: () => adapter.returnToTankScreen(),
      refreshStoreOverlay: () => adapter.refreshStoreOverlay(),
      refreshUi: (renderControls?: boolean) => adapter.refreshUi(renderControls),
      createFoodDock: () => adapter.createFoodDock(),
      saveNow: () => adapter.saveNow(),
      spendPrice: (price: Price) => adapter.spendPrice(price),
      floatText: (message: string, color: string) => adapter.floatText(message, toastX, toastY, color),
      setRecentInventoryDockItemKey: (key: string) => adapter.setRecentInventoryDockItemKey(key),
      setPlacementMode: (mode: PlacementMode) => adapter.setPlacementMode(mode),
      recordDailyQuestAction: (action: string) => adapter.recordDailyQuestAction(action)
    };
  }
}
