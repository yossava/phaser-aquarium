import type { Price } from "../types/mechanics";

export const foodDispenserAssetPath = "/assets/ui/helper-food-dispenser.png";
export const autoFoodBuyerAssetPath = "/assets/ui/auto-food-buyer.png";
export const foodDispenserPositionStorageKey = "phaser-aquarium-food-dispenser-y";
export const legacyFoodDispenserPositionStorageKey = "phaser-aquarium-helper-food-dispenser-y";
export const coinMagnetPositionStorageKey = "phaser-aquarium-coin-magnet-y";
export const autoFoodBuyerPositionStorageKey = "phaser-aquarium-auto-food-buyer-y";
export const foodDispenserInventoryKey = "utility:food-dispenser";
export const autoFoodBuyerInventoryKey = "utility:auto-food-buyer";
export const foodDispenserPrice: Price = { coinType: "common", amount: 1800 };
export const autoFoodBuyerPrice: Price = { coinType: "common", amount: 1200 };
export const foodDispenserPelletScale = 0.72;
export const foodDispenserMinIntervalMs = 500;
export const foodDispenserOutletRatio = { x: 0.72, y: 0.78 };
