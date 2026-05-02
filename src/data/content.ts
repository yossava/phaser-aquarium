import fishTypeData from "./fish-types.json";
import foodTypeData from "./food-types.json";
import decorationTypeData from "./decoration-types.json";
import type { DecorationType, FishType, FoodType } from "../types/mechanics";

export const fishTypes = fishTypeData as FishType[];
export const foodTypes = foodTypeData as FoodType[];
export const decorationTypes = decorationTypeData as DecorationType[];

export const basicFood = foodTypes.find((foodType) => foodType.id === "basic") ?? foodTypes[0];

