import { formatNumber } from "../../game/economy";
import {
  planTankUtilityPurchase,
  tankUtilityAlreadyOwnedToast,
  type FishPurchasePlan,
  type FoodPurchasePlan
} from "../../game/store-transactions";
import { timeCurrentFoodTypeId } from "../../game/food-system";
import { decorationSizes, type DecorationSize, type TankCosmetic } from "../../game/tank-catalog";
import type { TankUtilityId } from "../../game/dispenser-system";
import type { TankRuntimeState } from "../../game/tank-state";
import type { AppScreen, PlacementMode } from "./aquarium-scene-config";
import type { DecorationType, FishType, FoodType, HelperCreatureType, Price } from "../../types/mechanics";

type StorePurchaseSceneAdapter = {
  activeScreen: () => AppScreen;
  closeModal: () => void;
  returnToTankScreen: () => void;
  refreshStoreOverlay: () => void;
  refreshUi: (renderControls?: boolean) => void;
  createFoodDock: () => void;
  saveNow: () => void;
  spendPrice: (price: Price) => boolean;
  floatText: (message: string, color: string) => void;
  setRecentInventoryDockItemKey: (key: string) => void;
  setPlacementMode: (mode: PlacementMode) => void;
  recordDailyQuestAction: (action: string) => void;
};

type TankCosmeticPurchaseAdapter = StorePurchaseSceneAdapter & {
  tankCosmeticInventory: (category: TankCosmetic["category"]) => Map<string, number>;
  useTankCosmetic: (asset: TankCosmetic) => void;
};

type TankCosmeticUseAdapter = StorePurchaseSceneAdapter & {
  ensureTankState: () => TankRuntimeState;
  tankCosmeticInventory: (category: TankCosmetic["category"]) => Map<string, number>;
  buyTankCosmetic: (asset: TankCosmetic) => void;
  layoutTankBackground: () => void;
  layoutTankFloor: () => void;
  renderTabControls: () => void;
};

type FishPurchaseAdapter = StorePurchaseSceneAdapter & {
  addFishToInventory: (fishType: FishType, quantity: number) => void;
  addFishToTank: (fishType: FishType, x: number, y: number) => void;
  recordFishPurchase: (fishType: FishType) => void;
  randomFishPlacement: () => { x: number; y: number };
};

type FoodPurchaseAdapter = StorePurchaseSceneAdapter & {
  getFoodInventory: (foodTypeId: FoodType["id"]) => number;
  setFoodInventory: (foodTypeId: FoodType["id"], amount: number) => void;
  isDroppableFood: (foodTypeId: FoodType["id"]) => boolean;
  setSelectedFoodTypeId: (foodTypeId: FoodType["id"]) => void;
  closePage: () => void;
  recordGrowthTonicPurchase: () => void;
  recordTimeCurrentPurchase: () => void;
};

type DecorationPurchaseAdapter = StorePurchaseSceneAdapter & {
  decorationInventoryKey: (decorationTypeId: string, size: DecorationSize) => string;
  getDecorationInventory: (key: string) => number;
  setDecorationInventory: (key: string, count: number) => void;
};

type TankUtilityPurchaseAdapter = StorePurchaseSceneAdapter & {
  hasFoodDispenser: () => boolean;
  hasCoinMagnet: () => boolean;
  hasAutoFoodBuyer: () => boolean;
  setDecorationInventory: (key: string, value: number) => void;
  setCoinMagnetWasActive: (value: boolean) => void;
  setAutoFoodBuyerWasActive: (value: boolean) => void;
};

type HelperCreaturePurchaseAdapter = StorePurchaseSceneAdapter & {
  getCreatureInventory: (creatureTypeId: string) => number;
  setCreatureInventory: (creatureTypeId: string, count: number) => void;
};

const successColor = "#a8ffb0";
const infoColor = "#d7f4ff";

export function closeStoreAfterPurchase(adapter: Pick<StorePurchaseSceneAdapter, "activeScreen" | "closeModal" | "returnToTankScreen">): void {
  if (adapter.activeScreen() === "store") {
    adapter.closeModal();
    adapter.returnToTankScreen();
  }
}

export function executeTankCosmeticPurchase(adapter: TankCosmeticPurchaseAdapter, asset: TankCosmetic): boolean {
  if (!adapter.spendPrice(asset.price)) {
    return false;
  }

  adapter.tankCosmeticInventory(asset.category).set(asset.id, 1);
  adapter.recordDailyQuestAction(asset.category === "background" ? "buy-background" : "buy-seabed");
  adapter.useTankCosmetic(asset);
  adapter.floatText(`${asset.name} installed`, successColor);
  closeStoreAfterPurchase(adapter);
  return true;
}

export function executeTankCosmeticUse(adapter: TankCosmeticUseAdapter, asset: TankCosmetic): void {
  const state = adapter.ensureTankState();
  if ((adapter.tankCosmeticInventory(asset.category).get(asset.id) ?? 0) <= 0) {
    adapter.buyTankCosmetic(asset);
    return;
  }

  if (asset.category === "background") {
    state.selectedBackgroundId = asset.id;
    adapter.recordDailyQuestAction("use-background");
  } else {
    state.selectedSeabedId = asset.id;
    adapter.recordDailyQuestAction("use-seabed");
  }
  adapter.layoutTankBackground();
  adapter.layoutTankFloor();
  adapter.renderTabControls();
  adapter.refreshUi(false);
  adapter.saveNow();
}

export function executeFishPurchase(adapter: FishPurchaseAdapter, fishType: FishType, purchasePlan: FishPurchasePlan): boolean {
  if (!adapter.spendPrice(purchasePlan.totalPrice)) {
    return false;
  }

  if (purchasePlan.inventoryQuantity > 0) {
    adapter.addFishToInventory(fishType, purchasePlan.inventoryQuantity);
  }
  for (let index = 0; index < purchasePlan.buyQuantity; index += 1) {
    adapter.recordFishPurchase(fishType);
  }
  adapter.closeModal();
  closeStoreAfterPurchase(adapter);

  for (let index = 0; index < purchasePlan.tankDeliveryQuantity; index += 1) {
    const position = adapter.randomFishPlacement();
    adapter.addFishToTank(fishType, position.x, position.y);
  }

  adapter.setRecentInventoryDockItemKey("fish-menu:fish-menu");
  adapter.setPlacementMode({ kind: "none" });
  adapter.floatText(
    purchasePlan.tankDeliveryQuantity > 0
      ? `${fishType.name} ${purchasePlan.tankDeliveryQuantity > 1 ? `x${formatNumber(purchasePlan.tankDeliveryQuantity)} ` : ""}in tank`
      : `${fishType.name} x${formatNumber(purchasePlan.buyQuantity)} in inventory`,
    successColor
  );
  refreshDockedPurchase(adapter);
  return true;
}

export function executeFoodPurchase(adapter: FoodPurchaseAdapter, foodType: FoodType, purchasePlan: FoodPurchasePlan): boolean {
  if (!adapter.spendPrice(purchasePlan.totalPrice)) {
    return false;
  }

  adapter.setFoodInventory(foodType.id, adapter.getFoodInventory(foodType.id) + purchasePlan.addedFoodInventory);
  if (foodType.id === "ageBoost") {
    adapter.recordGrowthTonicPurchase();
    adapter.recordDailyQuestAction("buy-growth-tonic");
  }
  if (foodType.id === timeCurrentFoodTypeId) {
    adapter.recordTimeCurrentPurchase();
    adapter.recordDailyQuestAction("buy-time-current");
  }
  adapter.recordDailyQuestAction(foodType.id === "medicine" ? "buy-medicine" : "buy-food");
  adapter.setRecentInventoryDockItemKey(`food:${foodType.id}`);
  if (adapter.isDroppableFood(foodType.id)) {
    adapter.setSelectedFoodTypeId(foodType.id);
  }
  adapter.setPlacementMode({ kind: "none" });
  adapter.floatText(`${foodType.name} x${formatNumber(purchasePlan.buyQuantity)}`, successColor);
  if (adapter.activeScreen() === "store") {
    adapter.refreshStoreOverlay();
  } else if (adapter.activeScreen() !== "tank" && adapter.isDroppableFood(foodType.id)) {
    adapter.closePage();
  }
  adapter.refreshUi();
  adapter.createFoodDock();
  adapter.saveNow();
  closeStoreAfterPurchase(adapter);
  return true;
}

export function executeDecorationPurchase(adapter: DecorationPurchaseAdapter, decorationType: DecorationType, size: DecorationSize, price: Price): boolean {
  if (!adapter.spendPrice(price)) {
    return false;
  }

  const inventoryKey = adapter.decorationInventoryKey(decorationType.id, size);
  adapter.setDecorationInventory(inventoryKey, adapter.getDecorationInventory(inventoryKey) + 1);
  adapter.recordDailyQuestAction("buy-decoration");
  adapter.recordDailyQuestAction(decorationType.rarity === "superRare" ? "buy-super-rare-decoration" : decorationType.rarity === "rare" ? "buy-rare-decoration" : "buy-common-decoration");
  adapter.setRecentInventoryDockItemKey(`decoration:${decorationType.id}:${size}`);
  adapter.setPlacementMode({ kind: "none" });
  adapter.floatText(`${decorationType.name} ${decorationSizes[size].label} docked`, successColor);
  refreshDockedPurchase(adapter);
  closeStoreAfterPurchase(adapter);
  return true;
}

export function executeTankUtilityPurchase(adapter: TankUtilityPurchaseAdapter, input: {
  utilityId: TankUtilityId;
  utilityPrice: Price;
  now: number;
  coinMagnetDurationMs: number;
  autoFoodBuyerDurationMs: number;
}): boolean {
  const ownedToast = tankUtilityAlreadyOwnedToast({
    utilityId: input.utilityId,
    hasFoodDispenser: adapter.hasFoodDispenser(),
    hasCoinMagnet: adapter.hasCoinMagnet(),
    hasAutoFoodBuyer: adapter.hasAutoFoodBuyer()
  });
  if (ownedToast) {
    adapter.floatText(ownedToast, infoColor);
    return false;
  }

  if (!adapter.spendPrice(input.utilityPrice)) {
    return false;
  }

  const purchasePlan = planTankUtilityPurchase(input.utilityId, input.now, {
    coinMagnetDurationMs: input.coinMagnetDurationMs,
    autoFoodBuyerDurationMs: input.autoFoodBuyerDurationMs
  });
  adapter.setDecorationInventory(purchasePlan.inventoryKey, purchasePlan.inventoryValue);
  if (purchasePlan.activatesCoinMagnet) {
    adapter.setCoinMagnetWasActive(true);
  }
  if (purchasePlan.activatesAutoFoodBuyer) {
    adapter.setAutoFoodBuyerWasActive(true);
  }
  adapter.recordDailyQuestAction(purchasePlan.dailyQuestAction);
  adapter.floatText(purchasePlan.toast, successColor);
  adapter.refreshStoreOverlay();
  adapter.refreshUi(false);
  adapter.saveNow();
  closeStoreAfterPurchase(adapter);
  return true;
}

export function executeHelperCreaturePurchase(adapter: HelperCreaturePurchaseAdapter, creatureType: HelperCreatureType): boolean {
  if (!adapter.spendPrice(creatureType.price)) {
    return false;
  }

  adapter.setCreatureInventory(creatureType.id, adapter.getCreatureInventory(creatureType.id) + 1);
  adapter.recordDailyQuestAction("buy-helper");
  adapter.setRecentInventoryDockItemKey(`helper:${creatureType.id}`);
  adapter.setPlacementMode({ kind: "none" });
  adapter.floatText(`${creatureType.name} docked`, successColor);
  refreshDockedPurchase(adapter);
  closeStoreAfterPurchase(adapter);
  return true;
}

function refreshDockedPurchase(adapter: Pick<StorePurchaseSceneAdapter, "refreshStoreOverlay" | "refreshUi" | "createFoodDock" | "saveNow">): void {
  adapter.refreshStoreOverlay();
  adapter.refreshUi();
  adapter.createFoodDock();
  adapter.saveNow();
}
