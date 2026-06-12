import { foodTypes } from "../../data/content";
import { toastX, toastY } from "../../game/constants";
import { earn, formatNumber } from "../../game/economy";
import { planCoinInventorySale, planFoodInventorySale } from "../../game/store-transactions";
import {
  createCoinSellConfirmationContent,
  createFoodSellConfirmationContent,
  createHelperSellConfirmationContent,
  createTankUtilitySellConfirmationContent,
  type ModalContent
} from "../../ui/SellConfirmationModals";
import { coinAssetPathByType } from "./aquarium-scene-config";
import type { TankUtilityId } from "../../game/dispenser-system";
import type { HelperCreature } from "../../objects/HelperCreature";
import type { FoodType, FoodTypeId, HelperCreatureType, Price, Wallet } from "../../types/mechanics";

/**
 * Owns the "sell / convert" flows reachable from the inventory and tool docks:
 * food, rare/super-rare coins, tank utilities and helper creatures, plus their
 * confirmation modals. The scene keeps thin wrappers that forward here.
 */
export type AquariumSellControllerHost = {
  wallet: Wallet;
  foodInventory: Map<FoodTypeId, number>;
  decorationInventory: Map<string, number>;
  helperCreatures: HelperCreature[];
  getFoodInventory: (foodTypeId: FoodTypeId) => number;
  foodInventoryDisplayCount: (foodType: FoodType) => number;
  foodInventoryBadgeLabel: (foodType: FoodType) => string;
  isCalorieTrackedFood: (foodTypeId: FoodTypeId) => boolean;
  foodSellValue: (foodType: FoodType, storedAmount?: number) => number;
  coinSellValue: (coinType: "rare" | "superRare", count?: number) => number;
  helperSellPrice: (creatureType: HelperCreatureType) => HelperCreatureType["price"];
  tankUtilityInfo: (utilityId: TankUtilityId) => { name: string; price: Price; inventoryKey: string; owned: () => boolean } | undefined;
  tankUtilityIconPath: (utilityId: TankUtilityId) => string;
  tankUtilitySellValue: (price: Price) => number;
  removeHelperCreatureAt: (index: number) => HelperCreature | undefined;
  deactivateSoldUtility: (utilityId: TankUtilityId) => void;
  commonCoinValueRow: (label: string, amount: number) => HTMLElement;
  priceIconRow: (price: Price, label?: string) => HTMLElement;
  attachTouchFeedback: (element: HTMLElement, releaseOnLeave?: boolean) => void;
  showModalContent: (content: ModalContent) => void;
  floatText: (message: string, x: number, y: number, color: string) => void;
  floatTankText: (message: string, x: number, y: number, color: string) => void;
  recordDailyQuestAction: (action: string) => void;
  closeModal: (immediate?: boolean) => void;
  createFoodDock: () => void;
  renderTabControls: () => void;
  refreshUi: (renderControls?: boolean) => void;
  saveNow: (savedAt?: number, immediate?: boolean) => void;
  syncFoodDispenserPosition: () => void;
  syncCoinMagnetPosition: () => void;
  syncAutoFoodBuyerPosition: () => void;
  syncHtmlPageOverlay: () => void;
};

export class AquariumSellController {
  public constructor(private readonly host: AquariumSellControllerHost) {}

  public showFoodSellConfirmation(foodTypeId: FoodTypeId): void {
    const foodType = foodTypes.find((item) => item.id === foodTypeId);
    const storedAmount = this.host.getFoodInventory(foodTypeId);
    if (!foodType || storedAmount <= 0) {
      this.host.floatText("No food to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const maxQuantity = this.host.foodInventoryDisplayCount(foodType);
    this.host.showModalContent(createFoodSellConfirmationContent({
      foodType,
      ownedLabel: `Owned x${this.host.foodInventoryBadgeLabel(foodType)}`,
      maxQuantity,
      valueForQuantity: (quantity) => {
        const sellAmount = this.host.isCalorieTrackedFood(foodType.id)
          ? Math.min(storedAmount, quantity * Math.max(1, foodType.calories))
          : Math.min(storedAmount, quantity);
        return this.host.foodSellValue(foodType, sellAmount);
      },
      createValueRow: (label, amount) => this.host.commonCoinValueRow(label, amount),
      attachTouchFeedback: (button) => this.host.attachTouchFeedback(button),
      onSell: (quantity) => this.sellFoodInventory(foodTypeId, quantity),
      onCancel: () => this.host.closeModal()
    }));
  }

  public sellFoodInventory(foodTypeId: FoodTypeId, quantity?: number): void {
    const foodType = foodTypes.find((item) => item.id === foodTypeId);
    const current = this.host.getFoodInventory(foodTypeId);
    if (!foodType || current <= 0) {
      this.host.floatText("No food to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const salePlan = planFoodInventorySale({
      foodType,
      current,
      requestedQuantity: quantity ?? this.host.foodInventoryDisplayCount(foodType),
      maxDisplayQuantity: this.host.foodInventoryDisplayCount(foodType),
      isCalorieTrackedFood: (itemId) => this.host.isCalorieTrackedFood(itemId)
    });
    if (salePlan.nextInventoryAmount <= 0) {
      this.host.foodInventory.delete(foodTypeId);
    } else {
      this.host.foodInventory.set(foodTypeId, salePlan.nextInventoryAmount);
    }
    earn(this.host.wallet, "common", salePlan.sellValue);
    this.host.recordDailyQuestAction("sell-food");
    this.host.floatText(`Sold ${foodType.name} x${formatNumber(salePlan.sellQuantity)} +C${formatNumber(salePlan.sellValue)}`, toastX, toastY, "#ffe67a");
    this.host.closeModal();
    this.host.createFoodDock();
    this.host.refreshUi();
    this.host.saveNow();
  }

  public showTankUtilitySellConfirmation(utilityId: TankUtilityId): void {
    const utility = this.host.tankUtilityInfo(utilityId);
    if (!utility || !utility.owned()) {
      this.host.floatText("No tool to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    this.host.showModalContent(createTankUtilitySellConfirmationContent({
      name: utility.name,
      iconPath: this.host.tankUtilityIconPath(utilityId),
      sellValue: this.host.tankUtilitySellValue(utility.price),
      createValueRow: (label, amount) => this.host.commonCoinValueRow(label, amount),
      attachTouchFeedback: (button) => this.host.attachTouchFeedback(button),
      onSell: () => this.sellTankUtility(utilityId),
      onCancel: () => this.host.closeModal()
    }));
  }

  public sellTankUtility(utilityId: TankUtilityId): void {
    const utility = this.host.tankUtilityInfo(utilityId);
    if (!utility || !utility.owned()) {
      this.host.floatText("No tool to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellValue = this.host.tankUtilitySellValue(utility.price);
    this.host.decorationInventory.delete(utility.inventoryKey);
    this.host.deactivateSoldUtility(utilityId);
    earn(this.host.wallet, "common", sellValue);
    this.host.recordDailyQuestAction("sell-tool");
    this.host.floatText(`Sold ${utility.name} +C${formatNumber(sellValue)}`, toastX, toastY, "#ffe67a");
    this.host.closeModal();
    this.host.createFoodDock();
    this.host.refreshUi(false);
    this.host.syncFoodDispenserPosition();
    this.host.syncCoinMagnetPosition();
    this.host.syncAutoFoodBuyerPosition();
    this.host.syncHtmlPageOverlay();
    this.host.saveNow();
  }

  public showCoinSellConfirmation(coinType: "rare" | "superRare"): void {
    const count = this.host.wallet[coinType];
    if (count <= 0) {
      this.host.floatText("No coins to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    this.host.showModalContent(createCoinSellConfirmationContent({
      coinType,
      count,
      coinAssetPath: coinAssetPathByType[coinType],
      valueForQuantity: (quantity) => this.host.coinSellValue(coinType, quantity),
      createValueRow: (label, amount) => this.host.commonCoinValueRow(label, amount),
      attachTouchFeedback: (button) => this.host.attachTouchFeedback(button),
      onSell: (quantity) => this.sellCoinInventory(coinType, quantity),
      onCancel: () => this.host.closeModal()
    }));
  }

  public sellCoinInventory(coinType: "rare" | "superRare", quantity?: number): void {
    if (this.host.wallet[coinType] <= 0) {
      this.host.floatText("No coins to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const count = this.host.wallet[coinType];
    const salePlan = planCoinInventorySale(coinType, count, quantity);
    this.host.wallet[coinType] = salePlan.nextCount;
    earn(this.host.wallet, "common", salePlan.sellValue);
    this.host.recordDailyQuestAction(coinType === "rare" ? "sell-rare-coins" : "sell-super-rare-coins");
    this.host.floatText(`Converted x${formatNumber(salePlan.sellQuantity)} +C${formatNumber(salePlan.sellValue)}`, toastX, toastY, "#ffe67a");
    this.host.closeModal();
    this.host.refreshUi();
    this.host.saveNow();
  }

  public showHelperSellConfirmation(index: number): void {
    const targetHelper = this.host.helperCreatures[index];
    if (!targetHelper) {
      this.host.floatText("No helper to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellPrice = this.host.helperSellPrice(targetHelper.type);
    this.host.showModalContent(createHelperSellConfirmationContent({
      helperType: targetHelper.type,
      sellPrice,
      createPriceRow: (price, label) => this.host.priceIconRow(price, label),
      onSell: () => this.sellHelperCreatureByIndex(index),
      onCancel: () => this.host.closeModal()
    }));
  }

  public sellHelperCreatureByIndex(index: number): void {
    const helperToSell = this.host.helperCreatures[index];
    if (!helperToSell) {
      this.host.floatText("No helper to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellPrice = this.host.helperSellPrice(helperToSell.type);
    this.host.removeHelperCreatureAt(index);
    earn(this.host.wallet, sellPrice.coinType, sellPrice.amount);
    this.host.recordDailyQuestAction("sell-helper");
    this.host.floatTankText(`Sold ${helperToSell.type.name}`, helperToSell.sprite.x, helperToSell.sprite.y - 24, "#ffe67a");
    this.host.closeModal();
    this.host.renderTabControls();
    this.host.refreshUi();
    this.host.saveNow();
  }
}
