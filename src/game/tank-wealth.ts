import { decorationTypes, fishTypes, foodTypes, helperCreatureTypes } from "../data/content";
import { hiddenFoodTypeIds } from "./food-system";
import type { DecorationSize, TankCosmetic } from "./tank-catalog";
import type { PlacedDecoration } from "./tank-entities";
import type { TankRuntimeState } from "./tank-state";
import type { CoinDrop } from "../objects/CoinDrop";
import type { Fish } from "../objects/Fish";
import type { HelperCreature } from "../objects/HelperCreature";
import type { CoinType, FishType, FoodTypeId, Price, Wallet } from "../types/mechanics";

export type CalculateTankNetWorthInput = {
  level: number;
  activeTankLevel: number;
  wallet: Wallet;
  foodInventory: Map<FoodTypeId, number>;
  fishInventory: Map<string, number>;
  decorationInventory: Map<string, number>;
  creatureInventory: Map<string, number>;
  state?: TankRuntimeState;
  ensureTankState: (level: number) => TankRuntimeState;
  fishInTank: Fish[];
  helpersInTank: HelperCreature[];
  decorationsInTank: PlacedDecoration[];
  coinDrops: CoinDrop[];
  coinWealthValue: Record<CoinType, number>;
  activeFishSellValue: (fish: Fish) => number;
  storedFishSellValue: (fishType: FishType) => number;
  priceWealth: (price: Price) => number;
  isCalorieTrackedFood: (foodTypeId: FoodTypeId) => boolean;
  sanitizeDecorationSize: (size: string | undefined) => DecorationSize;
  decorationVariantPrice: (decorationType: (typeof decorationTypes)[number], size: DecorationSize) => Price;
  tankCosmeticById: (category: "background" | "seabed", id: string | undefined) => TankCosmetic | undefined;
};

export function calculateTankNetWorth(input: CalculateTankNetWorthInput): number {
  const state = input.state;
  const wallet = state?.wallet ?? input.wallet;
  const foodInventory = state?.foodInventory ?? input.foodInventory;
  const fishInventory = state?.fishInventory ?? input.fishInventory;
  const decorationInventory = state?.decorationInventory ?? input.decorationInventory;
  const creatureInventory = state?.creatureInventory ?? input.creatureInventory;
  const coinDrops = input.level === input.activeTankLevel ? input.coinDrops : [];

  const activeFishValue = input.fishInTank.reduce((total, currentFish) => total + input.activeFishSellValue(currentFish), 0);
  const foodValue = [...foodInventory.entries()].reduce((total, [foodTypeId, count]) => {
    if (hiddenFoodTypeIds.has(foodTypeId)) {
      return total;
    }
    const foodType = foodTypes.find((item) => item.id === foodTypeId);
    if (!foodType) {
      return total;
    }
    const unitRatio = input.isCalorieTrackedFood(foodType.id) ? count / Math.max(1, foodType.calories) : count;
    return total + input.priceWealth(foodType.price) * unitRatio;
  }, 0);
  const storedFishValue = [...fishInventory.entries()].reduce((total, [fishTypeId, count]) => {
    const fishType = fishTypes.find((item) => item.id === fishTypeId);
    return total + (fishType ? input.storedFishSellValue(fishType) * count : 0);
  }, 0);
  const decorationInventoryValue = [...decorationInventory.entries()].reduce((total, [decorationTypeId, count]) => {
    const [typeId, rawSize] = decorationTypeId.split(":");
    const decorationType = decorationTypes.find((item) => item.id === typeId);
    const size = input.sanitizeDecorationSize(rawSize);
    return total + (decorationType ? input.priceWealth(input.decorationVariantPrice(decorationType, size)) * count : 0);
  }, 0);
  const placedDecorationValue = input.decorationsInTank.reduce((total, decoration) => {
    const decorationType = decorationTypes.find((item) => item.id === decoration.typeId);
    return total + (decorationType ? input.priceWealth(input.decorationVariantPrice(decorationType, decoration.size)) : 0);
  }, 0);
  const backgroundInventory = state?.backgroundInventory ?? input.ensureTankState(input.level).backgroundInventory;
  const backgroundAssetValue = [...backgroundInventory.entries()].reduce((total, [assetId, count]) => {
    const asset = input.tankCosmeticById("background", assetId);
    return total + (asset ? input.priceWealth(asset.price) * count : 0);
  }, 0);
  const seabedInventory = state?.seabedInventory ?? input.ensureTankState(input.level).seabedInventory;
  const seabedAssetValue = [...seabedInventory.entries()].reduce((total, [assetId, count]) => {
    const asset = input.tankCosmeticById("seabed", assetId);
    return total + (asset ? input.priceWealth(asset.price) * count : 0);
  }, 0);
  const helperInventoryValue = [...creatureInventory.entries()].reduce((total, [creatureTypeId, count]) => {
    const creatureType = helperCreatureTypes.find((item) => item.id === creatureTypeId);
    return total + (creatureType ? input.priceWealth(creatureType.price) * count : 0);
  }, 0);
  const helperValue = input.helpersInTank.reduce((total, helper) => total + input.priceWealth(helper.type.price), 0);
  const coinDropValue = coinDrops.reduce((total, coin) => total + coin.value * input.coinWealthValue[coin.coinType], 0);
  const walletValue = wallet.common * input.coinWealthValue.common +
    wallet.rare * input.coinWealthValue.rare +
    wallet.superRare * input.coinWealthValue.superRare;

  return Math.round(
    walletValue +
    activeFishValue +
    foodValue +
    storedFishValue +
    decorationInventoryValue +
    placedDecorationValue +
    backgroundAssetValue +
    seabedAssetValue +
    helperInventoryValue +
    helperValue +
    coinDropValue
  );
}
