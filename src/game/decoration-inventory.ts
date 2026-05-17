import type { DecorationSize } from "./tank-catalog";
import type { PlacedDecoration } from "./tank-entities";

export function decorationInventoryKey(decorationTypeId: string, size: DecorationSize): string {
  return `${decorationTypeId}:${size}`;
}

export function sanitizeDecorationSize(size: string | undefined, validSizes: readonly DecorationSize[]): DecorationSize {
  return validSizes.includes(size as DecorationSize) ? size as DecorationSize : "m";
}

export function getDecorationInventory(
  inventory: Map<string, number>,
  decorationTypeId: string,
  size: DecorationSize
): number {
  const variantCount = inventory.get(decorationInventoryKey(decorationTypeId, size)) ?? 0;
  if (size === "m") {
    return variantCount + (inventory.get(decorationTypeId) ?? 0);
  }
  return variantCount;
}

export function consumeStoredDecoration(
  inventory: Map<string, number>,
  decorationTypeId: string,
  size: DecorationSize
): void {
  const legacyCount = size === "m" ? inventory.get(decorationTypeId) ?? 0 : 0;
  if (legacyCount > 0) {
    setOrDeleteCount(inventory, decorationTypeId, legacyCount - 1);
    return;
  }

  const inventoryKey = decorationInventoryKey(decorationTypeId, size);
  setOrDeleteCount(inventory, inventoryKey, (inventory.get(inventoryKey) ?? 0) - 1);
}

export function clearStoredDecorationInventory(
  inventory: Map<string, number>,
  decorationTypeId: string,
  size: DecorationSize
): void {
  inventory.delete(decorationInventoryKey(decorationTypeId, size));
  if (size === "m") {
    inventory.delete(decorationTypeId);
  }
}

export function removeStoredDecorationInventory(input: {
  inventory: Map<string, number>;
  decorationTypeId: string;
  size: DecorationSize;
  quantity: number;
}): number {
  let remainingToRemove = Math.max(0, Math.floor(input.quantity));
  if (remainingToRemove <= 0) {
    return 0;
  }

  const inventoryKey = decorationInventoryKey(input.decorationTypeId, input.size);
  const storedVariantCount = input.inventory.get(inventoryKey) ?? 0;
  const removedVariantCount = Math.min(storedVariantCount, remainingToRemove);
  if (removedVariantCount > 0) {
    setOrDeleteCount(input.inventory, inventoryKey, storedVariantCount - removedVariantCount);
    remainingToRemove -= removedVariantCount;
  }

  let removedLegacyCount = 0;
  if (input.size === "m" && remainingToRemove > 0) {
    const legacyCount = input.inventory.get(input.decorationTypeId) ?? 0;
    removedLegacyCount = Math.min(legacyCount, remainingToRemove);
    if (removedLegacyCount > 0) {
      setOrDeleteCount(input.inventory, input.decorationTypeId, legacyCount - removedLegacyCount);
    }
  }

  return removedVariantCount + removedLegacyCount;
}

export function placedDecorationCount(input: {
  decorations: PlacedDecoration[];
  decorationTypeId: string;
  size: DecorationSize;
  level: number;
  validSizes: readonly DecorationSize[];
}): number {
  return input.decorations.filter((decoration) =>
    decoration.tankLevel === input.level &&
    decoration.typeId === input.decorationTypeId &&
    sanitizeDecorationSize(decoration.size, input.validSizes) === input.size
  ).length;
}

export function ownedDecorationCount(input: {
  inventory: Map<string, number>;
  decorations: PlacedDecoration[];
  decorationTypeId: string;
  size: DecorationSize;
  level: number;
  validSizes: readonly DecorationSize[];
}): number {
  return getDecorationInventory(input.inventory, input.decorationTypeId, input.size) + placedDecorationCount(input);
}

function setOrDeleteCount(inventory: Map<string, number>, key: string, count: number): void {
  const nextCount = Math.max(0, Math.floor(count));
  if (nextCount > 0) {
    inventory.set(key, nextCount);
  } else {
    inventory.delete(key);
  }
}
