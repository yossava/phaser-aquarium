import type { AquariumPurchaseQuantityControllerHost } from "./aquarium-purchase-quantity-controller";
import type { AquariumSceneCore } from "./AquariumSceneCore";
import type { FoodTypeId, FoodType } from "../../types/mechanics";
import type { AquariumDecorationController } from "./aquarium-decoration-controller";

type PurchaseQuantityAdapterScene = {
  foodBuyQuantities: Map<FoodTypeId, number>;
  foodInventory: Map<FoodTypeId, number>;
  renderTabControls: () => void;
  refreshUi: (renderControls?: boolean) => void;
  getFoodInventory: (foodTypeId: FoodTypeId) => number;
  foodInventoryBadgeLabel: (foodType: FoodType) => string;
  aquariumDecorationController: () => AquariumDecorationController;
};

export function createAquariumPurchaseQuantityHost(scene: AquariumSceneCore): AquariumPurchaseQuantityControllerHost {
  const s = scene as unknown as PurchaseQuantityAdapterScene;

  return {
    foodBuyQuantities: s.foodBuyQuantities,
    foodInventory: s.foodInventory,
    renderTabControls: () => s.renderTabControls(),
    refreshUi: (renderControls) => s.refreshUi(renderControls),
    getFoodInventory: (foodTypeId) => s.getFoodInventory(foodTypeId),
    foodInventoryBadgeLabel: (foodType) => s.foodInventoryBadgeLabel(foodType),
    decorationController: {
      decorationInventoryKey: (decorationTypeId, size) => s.aquariumDecorationController().decorationInventoryKey(decorationTypeId, size),
      sanitizeDecorationSize: (size) => s.aquariumDecorationController().sanitizeDecorationSize(size),
      decorationVariantPrice: (decorationType, size) => s.aquariumDecorationController().decorationVariantPrice(decorationType, size),
      consumeStoredDecoration: (decorationTypeId, size) => s.aquariumDecorationController().consumeStoredDecoration(decorationTypeId, size),
      clearStoredDecorationInventory: (decorationTypeId, size) => s.aquariumDecorationController().clearStoredDecorationInventory(decorationTypeId, size),
      removeStoredDecorationInventory: (decorationTypeId, size, quantity) => s.aquariumDecorationController().removeStoredDecorationInventory(decorationTypeId, size, quantity),
      removeAllPlacedDecorationsFromActiveTank: () => s.aquariumDecorationController().removeAllPlacedDecorationsFromActiveTank()
    }
  };
}
