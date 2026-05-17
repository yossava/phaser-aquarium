import type { Price } from "../types/mechanics";

export const foodDispenserAssetPath = "/assets/ui/helper-food-dispenser.png";
export const autoFoodBuyerAssetPath = "/assets/ui/auto-food-buyer.png";
export const coinMagnetIconPath = "/assets/ui/coin-magnet.png";
export const foodDispenserPositionStorageKey = "phaser-aquarium-food-dispenser-y";
export const legacyFoodDispenserPositionStorageKey = "phaser-aquarium-helper-food-dispenser-y";
export const coinMagnetPositionStorageKey = "phaser-aquarium-coin-magnet-y";
export const autoFoodBuyerPositionStorageKey = "phaser-aquarium-auto-food-buyer-y";
export const foodDispenserInventoryKey = "utility:food-dispenser";
export const coinMagnetInventoryKey = "utility:coin-magnet";
export const autoFoodBuyerInventoryKey = "utility:auto-food-buyer";
export const foodDispenserPrice: Price = { coinType: "common", amount: 300 };
export const coinMagnetPrice: Price = { coinType: "common", amount: 150 };
export const autoFoodBuyerPrice: Price = { coinType: "common", amount: 200 };
export const foodDispenserPelletScale = 0.72;
export const foodDispenserMinIntervalMs = 500;
export const foodDispenserOutletRatio = { x: 0.72, y: 0.78 };

export type TankUtilityId = "food-dispenser" | "coin-magnet" | "auto-food-buyer";

export type TankUtilityInfo = {
  name: string;
  price: Price;
  icon: string;
  inventoryKey: string;
};

export const tankUtilities: Record<TankUtilityId, TankUtilityInfo> = {
  "food-dispenser": {
    name: "Food Dispenser",
    price: foodDispenserPrice,
    icon: foodDispenserAssetPath,
    inventoryKey: foodDispenserInventoryKey
  },
  "coin-magnet": {
    name: "Coin Magnet",
    price: coinMagnetPrice,
    icon: coinMagnetIconPath,
    inventoryKey: coinMagnetInventoryKey
  },
  "auto-food-buyer": {
    name: "Auto Food Buyer",
    price: autoFoodBuyerPrice,
    icon: autoFoodBuyerAssetPath,
    inventoryKey: autoFoodBuyerInventoryKey
  }
};

export function tankUtilityInfo(utilityId: string): (TankUtilityInfo & { id: TankUtilityId }) | undefined {
  if (!isTankUtilityId(utilityId)) {
    return undefined;
  }
  return { id: utilityId, ...tankUtilities[utilityId] };
}

export function isTankUtilityId(utilityId: string): utilityId is TankUtilityId {
  return utilityId === "food-dispenser" || utilityId === "coin-magnet" || utilityId === "auto-food-buyer";
}

export function utilityExpiresAt(inventory: Map<string, number>, inventoryKey: string): number {
  return Math.max(0, inventory.get(inventoryKey) ?? 0);
}

export function activeUtilityRemainingMinutes(expiresAt: number, now = Date.now()): number {
  return Math.max(1, Math.ceil(Math.max(0, expiresAt - now) / 60_000));
}

export function loadUtilityPositionY(input: {
  storageKey: string;
  fallbackStorageKey?: string;
  fallbackY: number;
  minY: number;
  maxY: number;
}): number {
  try {
    const stored = localStorage.getItem(input.storageKey) ??
      (input.fallbackStorageKey ? localStorage.getItem(input.fallbackStorageKey) : null);
    if (!stored) {
      return input.fallbackY;
    }
    const parsed = Number(stored);
    if (!Number.isFinite(parsed)) {
      return input.fallbackY;
    }
    return Math.max(input.minY, Math.min(input.maxY, parsed));
  } catch {
    return input.fallbackY;
  }
}

export function saveUtilityPositionY(input: {
  storageKey: string;
  y: number;
  removeStorageKey?: string;
}): void {
  try {
    localStorage.setItem(input.storageKey, String(Math.round(input.y)));
    if (input.removeStorageKey) {
      localStorage.removeItem(input.removeStorageKey);
    }
  } catch {
    // Optional UI position persistence should not block gameplay.
  }
}
