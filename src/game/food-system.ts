import type { FishState, FoodType, FoodTypeId, Price } from "../types/mechanics";
import { formatNumber } from "./economy";

export const creatureFoodTypeId: FoodTypeId = "creature";
export const medicineFoodTypeId: FoodTypeId = "medicine";
export const ageBoostFoodTypeId: FoodTypeId = "ageBoost";
export const productionBoostFoodTypeId: FoodTypeId = "productionBoost";
export const timeCurrentFoodTypeId: FoodTypeId = "timeCurrent";
export const supplyFoodTypeIds = new Set<FoodTypeId>([medicineFoodTypeId, ageBoostFoodTypeId, productionBoostFoodTypeId, timeCurrentFoodTypeId]);
export const hiddenFoodTypeIds = new Set<FoodTypeId>([creatureFoodTypeId]);

type DispenserTarget = {
  state: FishState;
  health: number;
  hunger: number;
};

type PendingFood = {
  source: "manual" | "dispenser";
};

type MealTarget = {
  mealCaloriesNeeded(): number;
};

export type FoodReservation = {
  reservedCalories: number;
  nextInventory: number;
};

export function isDroppableFood(foodTypeId: FoodTypeId): boolean {
  return foodTypeId !== timeCurrentFoodTypeId && !hiddenFoodTypeIds.has(foodTypeId);
}

export function isCalorieTrackedFood(foodTypeId: FoodTypeId): boolean {
  return foodTypeId !== medicineFoodTypeId && foodTypeId !== ageBoostFoodTypeId && foodTypeId !== productionBoostFoodTypeId && foodTypeId !== timeCurrentFoodTypeId && foodTypeId !== creatureFoodTypeId && !hiddenFoodTypeIds.has(foodTypeId);
}

export function foodInventoryDisplayCount(foodType: FoodType, storedCount: number): number {
  if (!isCalorieTrackedFood(foodType.id)) {
    return storedCount;
  }

  return Math.ceil(storedCount / Math.max(1, foodType.calories));
}

export function foodInventoryBadgeLabel(foodType: FoodType, storedCount: number): string {
  if (!isCalorieTrackedFood(foodType.id)) {
    return cappedFoodCountLabel(storedCount);
  }

  if (storedCount <= 0) {
    return "0";
  }

  const servingCalories = Math.max(1, foodType.calories);
  const fullServings = Math.floor(storedCount / servingCalories);
  const hasPartial = storedCount % servingCalories > 0;
  if (fullServings <= 0) {
    return "1+";
  }
  if (hasPartial) {
    return fullServings > 99 ? "99+" : `${formatNumber(fullServings)}+`;
  }
  return cappedFoodCountLabel(fullServings);
}

export function cappedFoodCountLabel(count: number): string {
  return count > 99 ? "99+" : formatNumber(count);
}

export function feedableFoodTypes(foodTypes: FoodType[], getInventory: (foodTypeId: FoodTypeId) => number): FoodType[] {
  return foodTypes.filter(
    (foodType) =>
      foodType.id !== medicineFoodTypeId &&
      !hiddenFoodTypeIds.has(foodType.id) &&
      isDroppableFood(foodType.id) &&
      getInventory(foodType.id) > 0
  );
}

export function totalFeedableFoodInventory(foodTypes: FoodType[], getInventory: (foodType: FoodType) => number): number {
  return foodTypes.reduce((total, foodType) => total + getInventory(foodType), 0);
}

export function hasPendingDispenserFood(foods: PendingFood[]): boolean {
  return foods.some((food) => food.source === "dispenser");
}

export function findFoodDispenserTarget<T extends DispenserTarget>(tankFish: T[]): T | undefined {
  let targetFish: T | undefined;
  for (const currentFish of tankFish) {
    if (currentFish.state === "ill" || currentFish.health < 35 || currentFish.hunger < 50) {
      continue;
    }
    if (!targetFish || currentFish.hunger > targetFish.hunger) {
      targetFish = currentFish;
    }
  }
  return targetFish;
}

export function findMedicineDispenserTarget<T extends Pick<DispenserTarget, "state">>(tankFish: T[], medicineCount: number): T | undefined {
  if (medicineCount <= 0) {
    return undefined;
  }

  return tankFish.find((currentFish) => currentFish.state === "ill");
}

export function bestCalorieFoodForTarget(
  candidates: FoodType[],
  targetCalories: number,
  getInventory: (foodTypeId: FoodTypeId) => number
): FoodType | undefined {
  const uniqueCandidates = [...new Map(candidates.map((foodType) => [foodType.id, foodType])).values()];
  if (uniqueCandidates.length === 0) {
    return undefined;
  }

  return uniqueCandidates.sort((first, second) => {
    const firstServing = Math.min(first.calories, getInventory(first.id));
    const secondServing = Math.min(second.calories, getInventory(second.id));
    const firstMiss = firstServing >= targetCalories ? firstServing - targetCalories : targetCalories - firstServing + targetCalories;
    const secondMiss = secondServing >= targetCalories ? secondServing - targetCalories : targetCalories - secondServing + targetCalories;
    return firstMiss - secondMiss || secondServing - firstServing;
  })[0];
}

export function careFoodTargetForDrop<T>(
  foodTypeId: FoodTypeId,
  targetFish: T | undefined,
  activeFish: T[]
): T | undefined {
  if (foodTypeId !== ageBoostFoodTypeId && foodTypeId !== productionBoostFoodTypeId) {
    return undefined;
  }

  return targetFish && activeFish.includes(targetFish) ? targetFish : undefined;
}

export function reserveFoodForDrop(foodType: FoodType, currentInventory: number): FoodReservation {
  if (currentInventory <= 0) {
    return { reservedCalories: 0, nextInventory: currentInventory };
  }

  if (!isCalorieTrackedFood(foodType.id)) {
    return {
      reservedCalories: foodType.calories,
      nextInventory: Math.max(0, currentInventory - 1)
    };
  }

  const reservedCalories = Math.min(foodType.calories, currentInventory);
  return {
    reservedCalories,
    nextInventory: Math.max(0, currentInventory - reservedCalories)
  };
}

export function refundedFoodInventory(input: {
  foodTypeId: FoodTypeId;
  reservedNutrition: number;
  consumedCalories: number;
  currentInventory: number;
}): number {
  if (!isCalorieTrackedFood(input.foodTypeId)) {
    return input.currentInventory;
  }

  const unusedCalories = Math.max(0, input.reservedNutrition - input.consumedCalories);
  return unusedCalories > 0 ? input.currentInventory + unusedCalories : input.currentInventory;
}

export function chooseAutoFoodForFish(
  foodTypes: FoodType[],
  targetFish: MealTarget,
  getInventory: (foodTypeId: FoodTypeId) => number
): FoodType | undefined {
  const candidates = foodTypes.filter(
    (foodType) =>
      isCalorieTrackedFood(foodType.id) &&
      isDroppableFood(foodType.id) &&
      getInventory(foodType.id) > 0
  );

  return bestCalorieFoodForTarget(candidates, targetFish.mealCaloriesNeeded(), getInventory);
}

export function medianMealCaloriesNeeded(tankFish: MealTarget[]): number {
  const needs = tankFish
    .map((fish) => fish.mealCaloriesNeeded())
    .filter((need) => Number.isFinite(need) && need > 0)
    .sort((first, second) => first - second);
  if (needs.length === 0) {
    return 0;
  }

  const middle = Math.floor(needs.length / 2);
  return needs.length % 2 === 1 ? needs[middle]! : (needs[middle - 1]! + needs[middle]!) / 2;
}

export function chooseAutoPurchasableFood(input: {
  foodTypes: FoodType[];
  tankFish: MealTarget[];
  developerGodMode: boolean;
  canAfford: (price: Price) => boolean;
  priceWealth: (price: Price) => number;
}): FoodType | undefined {
  const candidates = input.foodTypes.filter(
    (foodType) =>
      isCalorieTrackedFood(foodType.id) &&
      isDroppableFood(foodType.id) &&
      (input.developerGodMode || input.canAfford(foodType.price))
  );

  const medianMealCalories = medianMealCaloriesNeeded(input.tankFish);
  if (medianMealCalories > 0) {
    return bestCalorieFoodForTarget(candidates, medianMealCalories, (foodTypeId) => {
      const foodType = input.foodTypes.find((item) => item.id === foodTypeId);
      return foodType?.calories ?? 0;
    });
  }

  return candidates.sort((first, second) => input.priceWealth(first.price) - input.priceWealth(second.price) || first.calories - second.calories)[0];
}

export function recommendedFoodName(foodTypes: FoodType[], targetCalories: number): string {
  const recommendedFood = foodTypes
    .filter((foodType) => isCalorieTrackedFood(foodType.id))
    .sort((first, second) => first.calories - second.calories)
    .find((foodType) => foodType.calories >= targetCalories);
  return recommendedFood?.name ?? `${formatNumber(Math.ceil(targetCalories))} cal food`;
}

export function foodBuyQuantity(quantities: Map<FoodTypeId, number>, foodTypeId: FoodTypeId): number {
  return quantities.get(foodTypeId) ?? 1;
}

export function changedFoodBuyQuantity(
  quantities: Map<FoodTypeId, number>,
  foodTypeId: FoodTypeId,
  delta: number,
  maxQuantity: number
): number {
  return clampFoodQuantity(foodBuyQuantity(quantities, foodTypeId) + delta, maxQuantity);
}

export function addedFoodBuyQuantity(
  quantities: Map<FoodTypeId, number>,
  foodTypeId: FoodTypeId,
  quantityToAdd: number,
  maxQuantity: number
): number {
  const currentQuantity = foodBuyQuantity(quantities, foodTypeId);
  const nextQuantity = quantities.has(foodTypeId) ? currentQuantity + quantityToAdd : quantityToAdd;
  return clampFoodQuantity(nextQuantity, maxQuantity);
}

export function setFoodBuyQuantityValue(quantity: number, maxQuantity: number): number | undefined {
  return quantity <= 0 ? undefined : clampFoodQuantity(quantity, maxQuantity);
}

export function foodBuyQuantityRecord(foodTypes: FoodType[], quantities: Map<FoodTypeId, number>): Record<string, number> {
  return Object.fromEntries(foodTypes.map((foodType) => [foodType.id, foodBuyQuantity(quantities, foodType.id)]));
}

export function foodInventoryRecord(inventory: Map<FoodTypeId, number>): Record<FoodTypeId, number> {
  return Object.fromEntries(
    [...inventory.entries()].filter(([foodTypeId, count]) => !hiddenFoodTypeIds.has(foodTypeId) && count > 0)
  ) as Record<FoodTypeId, number>;
}

export function describeFoodInventory(foodTypes: FoodType[], getInventory: (foodType: FoodType) => number, labelFor: (foodType: FoodType) => string): string {
  const owned = foodTypes
    .filter((foodType) => !hiddenFoodTypeIds.has(foodType.id) && getInventory(foodType) > 0)
    .map((foodType) => `${foodType.name} x${labelFor(foodType)}`);
  return owned.length > 0 ? owned.join(", ") : "empty";
}

function clampFoodQuantity(quantity: number, maxQuantity: number): number {
  return Math.max(1, Math.min(maxQuantity, Math.floor(quantity)));
}
