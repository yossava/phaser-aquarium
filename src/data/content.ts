import fishTypeData from "./fish-types.json";
import foodTypeData from "./food-types.json";
import decorationTypeData from "./decoration-types.json";
import helperCreatureTypeData from "./helper-creature-types.json";
import type { DecorationType, FishType, FoodType, HelperCreatureType } from "../types/mechanics";

export const fishTypes = fishTypeData as FishType[];
export const foodTypes = foodTypeData as FoodType[];
export const decorationTypes = decorationTypeData as DecorationType[];
export const helperCreatureTypes = helperCreatureTypeData as HelperCreatureType[];

export const basicFood = foodTypes.find((foodType) => foodType.id === "basic") ?? foodTypes[0];
