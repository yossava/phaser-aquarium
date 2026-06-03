import { foodTypes } from "../../data/content";
import { maxFoodBuyQuantity } from "./aquarium-scene-config";
import {
  addedFoodBuyQuantity,
  describeFoodInventory as describeFoodInventoryModel,
  foodBuyQuantity as foodBuyQuantityModel,
  foodBuyQuantityRecord as foodBuyQuantityRecordModel,
  foodInventoryRecord as foodInventoryRecordModel,
  setFoodBuyQuantityValue
} from "../../game/food-system";
import { quantityPrice as quantityPriceModel } from "../../game/economy-values";
import type { FoodType, FoodTypeId, Price, DecorationType } from "../../types/mechanics";
import type { DecorationSize } from "../../game/tank-catalog";

export type AquariumPurchaseQuantityControllerHost = {
  foodBuyQuantities: Map<FoodTypeId, number>;
  foodInventory: Map<FoodTypeId, number>;
  renderTabControls: () => void;
  refreshUi: (renderControls?: boolean) => void;
  getFoodInventory: (foodTypeId: FoodTypeId) => number;
  foodInventoryBadgeLabel: (foodType: FoodType) => string;
  decorationController: {
    decorationInventoryKey: (decorationTypeId: string, size: DecorationSize) => string;
    sanitizeDecorationSize: (size: string | undefined) => DecorationSize;
    decorationVariantPrice: (decorationType: DecorationType, size: DecorationSize) => Price;
    consumeStoredDecoration: (decorationTypeId: string, size: DecorationSize) => void;
    clearStoredDecorationInventory: (decorationTypeId: string, size: DecorationSize) => void;
    removeStoredDecorationInventory: (decorationTypeId: string, size: DecorationSize, quantity: number) => number;
    removeAllPlacedDecorationsFromActiveTank: () => void;
  };
};

export class AquariumPurchaseQuantityController {
  public constructor(private readonly host: AquariumPurchaseQuantityControllerHost) {}

  public addFoodBuyQuantity(foodTypeId: FoodTypeId, quantityToAdd: number): void {
    this.host.foodBuyQuantities.set(
      foodTypeId,
      addedFoodBuyQuantity(this.host.foodBuyQuantities, foodTypeId, quantityToAdd, maxFoodBuyQuantity)
    );
    this.host.renderTabControls();
    this.host.refreshUi(false);
  }

  public setFoodBuyQuantity(foodTypeId: FoodTypeId, quantity: number): void {
    const nextQuantity = setFoodBuyQuantityValue(quantity, maxFoodBuyQuantity);
    if (nextQuantity === undefined) {
      this.resetFoodBuyQuantity(foodTypeId);
      return;
    }
    this.host.foodBuyQuantities.set(foodTypeId, nextQuantity);
    this.host.renderTabControls();
    this.host.refreshUi(false);
  }

  public resetFoodBuyQuantity(foodTypeId: FoodTypeId): void {
    this.host.foodBuyQuantities.delete(foodTypeId);
    this.host.renderTabControls();
    this.host.refreshUi(false);
  }

  public getFoodBuyQuantity(foodTypeId: FoodTypeId): number {
    return foodBuyQuantityModel(this.host.foodBuyQuantities, foodTypeId);
  }

  public foodBuyQuantityRecord(): Record<string, number> {
    return foodBuyQuantityRecordModel(foodTypes, this.host.foodBuyQuantities);
  }

  public quantityPrice(price: Price, quantity: number): Price {
    return quantityPriceModel(price, quantity);
  }

  public foodInventoryRecord(): Record<FoodTypeId, number> {
    return foodInventoryRecordModel(this.host.foodInventory);
  }

  public foodTypeById(foodTypeId: FoodTypeId): FoodType | undefined {
    return foodTypes.find((foodType) => foodType.id === foodTypeId);
  }

  public describeFoodInventory(): string {
    return describeFoodInventoryModel(
      foodTypes,
      (foodType) => this.host.getFoodInventory(foodType.id),
      (foodType) => this.host.foodInventoryBadgeLabel(foodType)
    );
  }

  public decorationInventoryKey(decorationTypeId: string, size: DecorationSize): string {
    return this.host.decorationController.decorationInventoryKey(decorationTypeId, size);
  }

  public sanitizeDecorationSize(size: string | undefined): DecorationSize {
    return this.host.decorationController.sanitizeDecorationSize(size);
  }

  public decorationVariantPrice(decorationType: DecorationType, size: DecorationSize): Price {
    return this.host.decorationController.decorationVariantPrice(decorationType, size);
  }

  public consumeStoredDecoration(decorationTypeId: string, size: DecorationSize): void {
    this.host.decorationController.consumeStoredDecoration(decorationTypeId, size);
  }

  public clearStoredDecorationInventory(decorationTypeId: string, size: DecorationSize): void {
    this.host.decorationController.clearStoredDecorationInventory(decorationTypeId, size);
  }

  public removeStoredDecorationInventory(decorationTypeId: string, size: DecorationSize, quantity: number): number {
    return this.host.decorationController.removeStoredDecorationInventory(decorationTypeId, size, quantity);
  }

  public removeAllPlacedDecorationsFromActiveTank(): void {
    this.host.decorationController.removeAllPlacedDecorationsFromActiveTank();
  }
}
