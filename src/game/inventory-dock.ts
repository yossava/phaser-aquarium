import { decorationTypes, foodAssetPath, foodTypes, helperCreatureTypes } from "../data/content";
import { hiddenFoodTypeIds } from "./food-system";
import { decorationSizeOrder, decorationSizes, type DecorationSize } from "./tank-catalog";
import type { FoodType, FoodTypeId } from "../types/mechanics";

export type InventoryDockItem =
  | { kind: "food"; id: FoodTypeId; label: string; count: number; badgeLabel?: string; icon: string }
  | { kind: "fish-menu"; id: "fish-menu"; label: string; count: number; icon: string }
  | { kind: "fish"; id: string; label: string; count: number; icon: string }
  | { kind: "decoration"; id: string; size: DecorationSize; label: string; count: number; icon: string }
  | { kind: "helper"; id: string; label: string; count: number; icon: string }
  | { kind: "utility"; id: string; label: string; count: number; icon: string };

export type InventoryDockBuildInput = {
  fishMenuIcon: string;
  getFoodInventory: (foodTypeId: FoodTypeId) => number;
  foodLabel: (foodType: FoodType) => string;
  foodDisplayCount: (foodType: FoodType) => number;
  foodBadgeLabel: (foodType: FoodType) => string;
  totalStoredFishCount: () => number;
  getDecorationInventory: (decorationTypeId: string, size: DecorationSize) => number;
  getCreatureInventory: (creatureTypeId: string) => number;
};

export function buildInventoryDockItems(input: InventoryDockBuildInput): InventoryDockItem[] {
  const foodItems: InventoryDockItem[] = foodTypes
    .filter((foodType) => !hiddenFoodTypeIds.has(foodType.id) && input.getFoodInventory(foodType.id) > 0)
    .map((foodType) => ({
      kind: "food",
      id: foodType.id,
      label: input.foodLabel(foodType),
      count: input.foodDisplayCount(foodType),
      badgeLabel: input.foodBadgeLabel(foodType),
      icon: foodAssetPath(foodType.id)
    }));

  const storedFishCount = input.totalStoredFishCount();
  const fishItems: InventoryDockItem[] = storedFishCount > 0
    ? [{
        kind: "fish-menu",
        id: "fish-menu",
        label: "My Fish",
        count: storedFishCount,
        icon: input.fishMenuIcon
      }]
    : [];

  const decorationItems: InventoryDockItem[] = [];
  for (const decorationType of decorationTypes) {
    for (const size of decorationSizeOrder) {
      const count = input.getDecorationInventory(decorationType.id, size);
      if (count > 0) {
        decorationItems.push({
          kind: "decoration",
          id: decorationType.id,
          size,
          label: `${decorationType.name} ${decorationSizes[size].label}`,
          count,
          icon: `/assets/decorations/${decorationType.id}.png`
        });
      }
    }
  }

  const helperItems: InventoryDockItem[] = helperCreatureTypes
    .filter((creatureType) => input.getCreatureInventory(creatureType.id) > 0)
    .map((creatureType) => ({
      kind: "helper",
      id: creatureType.id,
      label: creatureType.name,
      count: input.getCreatureInventory(creatureType.id),
      icon: creatureType.id === "feeder-snail" ? "/assets/helpers/feeder-snail.png" : `/assets/helpers/${creatureType.id}.png`
    }));

  return [...foodItems, ...fishItems, ...decorationItems, ...helperItems];
}

export function inventoryDockItemKey(item: InventoryDockItem): string {
  if (item.kind === "decoration") {
    return `${item.kind}:${item.id}:${item.size}`;
  }

  return `${item.kind}:${item.id}`;
}

export function pageForInventoryDockItem(items: InventoryDockItem[], itemKey: string | undefined, pageSize: number): number | undefined {
  if (!itemKey) {
    return undefined;
  }

  const index = items.findIndex((item) => inventoryDockItemKey(item) === itemKey);
  return index >= 0 ? Math.floor(index / pageSize) : undefined;
}

export function inventoryDockPageCount(itemCount: number, pageSize: number): number {
  return Math.max(1, Math.ceil(itemCount / pageSize));
}

export function clampInventoryDockPage(page: number, pageCount: number): number {
  return Math.max(0, Math.min(Math.max(0, pageCount - 1), Math.floor(page)));
}

export function inventoryDockPageItems(items: InventoryDockItem[], page: number, pageSize: number): InventoryDockItem[] {
  return items.slice(page * pageSize, (page + 1) * pageSize);
}
