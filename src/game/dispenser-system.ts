import type { FoodType, Price } from "../types/mechanics";
import { serverNow } from "../services/server-time";
import {
  findFoodDispenserTarget,
  findMedicineDispenserTarget,
  hasPendingDispenserFood
} from "./food-system";

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

export type TankUtilityStoreDefinition = {
  id: TankUtilityId;
  name: string;
  description: string;
  durationLabel?: string;
  icon: string;
  owned: boolean;
  price: Price;
};

export type TankUtilityInventoryCardData = {
  id: TankUtilityId;
  name: string;
  icon: string;
  meta: string;
  copy: string;
  price: Price;
};

type DispenserFood = {
  source: "manual" | "dispenser";
};

type DispenserFish = {
  state: "hungry" | "ill" | "happy";
  health: number;
  hunger: number;
};

export type FoodDispenserDropPlan<T extends DispenserFish> = {
  foodType: FoodType;
  targetFish: T;
  isMedicine: boolean;
  nextDispenseAt: number;
};

export type AutoFoodBuyerPurchasePlan = {
  foodType: FoodType;
  totalPrice: Price;
  nextPurchaseAt: number;
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

export function activeUtilityRemainingMinutes(expiresAt: number, now = serverNow()): number {
  if (expiresAt <= now) {
    return 0;
  }

  return Math.max(1, Math.ceil((expiresAt - now) / 60_000));
}

export function tankUtilityStoreDefinitions(input: {
  hasFoodDispenser: boolean;
  hasCoinMagnet: boolean;
  hasAutoFoodBuyer: boolean;
}): TankUtilityStoreDefinition[] {
  return [
    {
      id: "food-dispenser",
      name: "Food Dispenser",
      description: "Mounts on the tank edge and automatically dispenses owned fish food.",
      icon: foodDispenserAssetPath,
      owned: input.hasFoodDispenser,
      price: foodDispenserPrice
    },
    {
      id: "coin-magnet",
      name: "Coin Magnet",
      description: "Mounts on the tank edge and pulls coins that fall through its invisible line.",
      durationLabel: "30m",
      icon: coinMagnetIconPath,
      owned: input.hasCoinMagnet,
      price: coinMagnetPrice
    },
    {
      id: "auto-food-buyer",
      name: "Auto Food Buyer",
      description: "Buys a needed food serving when the dispenser is out.",
      durationLabel: "30m",
      icon: autoFoodBuyerAssetPath,
      owned: input.hasAutoFoodBuyer,
      price: autoFoodBuyerPrice
    }
  ];
}

export function ownedTankUtilityInventoryCards(input: {
  hasFoodDispenser: boolean;
  hasCoinMagnet: boolean;
  hasAutoFoodBuyer: boolean;
  foodDispenserFoodLabel: string;
  coinMagnetMinutesLabel: string;
  autoFoodBuyerMinutesLabel: string;
}): TankUtilityInventoryCardData[] {
  const cards: TankUtilityInventoryCardData[] = [];
  if (input.hasFoodDispenser) {
    cards.push({
      id: "food-dispenser",
      name: "Food Dispenser",
      icon: foodDispenserAssetPath,
      meta: `Food ${input.foodDispenserFoodLabel}`,
      copy: "Drag on the tank edge to reposition. Dispenses owned fish food automatically.",
      price: foodDispenserPrice
    });
  }
  if (input.hasCoinMagnet) {
    cards.push({
      id: "coin-magnet",
      name: "Coin Magnet",
      icon: coinMagnetIconPath,
      meta: `${input.coinMagnetMinutesLabel}m active`,
      copy: "Pulls coins that fall through its tank line.",
      price: coinMagnetPrice
    });
  }
  if (input.hasAutoFoodBuyer) {
    cards.push({
      id: "auto-food-buyer",
      name: "Auto Food Buyer",
      icon: autoFoodBuyerAssetPath,
      meta: `${input.autoFoodBuyerMinutesLabel}m active`,
      copy: "Buys food automatically while active.",
      price: autoFoodBuyerPrice
    });
  }
  return cards;
}

export function planFoodDispenserDrop<T extends DispenserFish>(input: {
  hasFoodDispenser: boolean;
  now: number;
  nextFoodDispenseAt: number;
  foods: DispenserFood[];
  maxFoodDrops: number;
  minIntervalMs: number;
  tankFish: T[];
  medicineInventory: number;
  foodTypes: FoodType[];
  chooseAutoFoodForFish: (targetFish: T) => FoodType | undefined;
}): FoodDispenserDropPlan<T> | undefined {
  if (!input.hasFoodDispenser || input.now < input.nextFoodDispenseAt) {
    return undefined;
  }

  if (hasPendingDispenserFood(input.foods) || input.foods.length >= input.maxFoodDrops) {
    return undefined;
  }

  const medicineTarget = findMedicineDispenserTarget(input.tankFish, input.medicineInventory);
  const targetFish = medicineTarget ?? findFoodDispenserTarget(input.tankFish);
  if (!targetFish) {
    return undefined;
  }

  const foodType = medicineTarget
    ? input.foodTypes.find((item) => item.id === "medicine")
    : input.chooseAutoFoodForFish(targetFish);
  if (!foodType) {
    return undefined;
  }

  return {
    foodType,
    targetFish,
    isMedicine: Boolean(medicineTarget),
    nextDispenseAt: input.now + input.minIntervalMs
  };
}

export function planAutoFoodBuyerPurchase(input: {
  hasAutoFoodBuyer: boolean;
  now: number;
  nextPurchaseAt: number;
  looseFoodCount: number;
  maxFoodDrops: number;
  feedableFoodInventory: number;
  purchaseQuantity: number;
  purchaseCooldownMs: number;
  chooseFoodType: () => FoodType | undefined;
  quantityPrice: (price: Price, quantity: number) => Price;
}): AutoFoodBuyerPurchasePlan | undefined {
  if (!input.hasAutoFoodBuyer || input.now < input.nextPurchaseAt || input.looseFoodCount >= input.maxFoodDrops) {
    return undefined;
  }

  if (input.feedableFoodInventory > 0) {
    return undefined;
  }

  const foodType = input.chooseFoodType();
  if (!foodType) {
    return undefined;
  }

  return {
    foodType,
    totalPrice: input.quantityPrice(foodType.price, input.purchaseQuantity),
    nextPurchaseAt: input.now + input.purchaseCooldownMs
  };
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
