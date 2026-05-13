import { createWallet } from "./economy";
import { createEmptyWallet, mapToRecord, recordToMap, type SavedGame } from "./save";
import type { FoodTypeId, Wallet } from "../types/mechanics";

export type TankCosmeticCategory = "background" | "seabed";

export type TankRuntimeState = {
  wallet: Wallet;
  foodInventory: Map<FoodTypeId, number>;
  fishInventory: Map<string, number>;
  fishInventoryAges: Map<string, number[]>;
  decorationInventory: Map<string, number>;
  creatureInventory: Map<string, number>;
  backgroundInventory: Map<string, number>;
  seabedInventory: Map<string, number>;
  backgroundBlueTints: Map<string, number>;
  seabedBlueTints: Map<string, number>;
  selectedBackgroundId: string;
  selectedSeabedId: string;
  cleanliness: number;
  cleanedAt: number;
  maxDisplayLevel: number;
};

export type TankStateConfig = {
  maxOwnedTanks: number;
  basicFoodId: FoodTypeId;
  basicFoodCalories: number;
  defaultCosmeticId: (level: number) => string;
  validCosmeticId: (category: TankCosmeticCategory, id: string | undefined, level: number) => string;
};

export function sortedTankLevels(levels: Set<number>): number[] {
  return [...levels].sort((a, b) => a - b);
}

export function tankNamesFromRecord(source: Record<string, string> | undefined, fallbackName = "Home Reef"): Map<number, string> {
  const names = new Map<number, string>([[1, fallbackName]]);
  if (!source) {
    return names;
  }

  for (const [key, value] of Object.entries(source)) {
    const level = Math.max(1, Math.floor(Number(key)));
    if (Number.isFinite(level) && typeof value === "string" && value.trim().length > 0) {
      names.set(level, value.trim().slice(0, 24));
    }
  }
  return names;
}

export function tankNamesRecord(names: Map<number, string>): Record<string, string> {
  return Object.fromEntries([...names.entries()].map(([level, name]) => [String(level), name]));
}

export function createDefaultTankState(level: number, config: TankStateConfig, now = Date.now()): TankRuntimeState {
  const cosmeticId = config.defaultCosmeticId(level);
  return {
    wallet: level === 1 ? createWallet(120, 0, 0) : createEmptyWallet(),
    foodInventory: new Map<FoodTypeId, number>(level === 1 ? [[config.basicFoodId, config.basicFoodCalories * 3]] : []),
    fishInventory: new Map<string, number>(),
    fishInventoryAges: new Map<string, number[]>(),
    decorationInventory: new Map<string, number>(),
    creatureInventory: new Map<string, number>(),
    backgroundInventory: new Map<string, number>([[cosmeticId, 1]]),
    seabedInventory: new Map<string, number>([[cosmeticId, 1]]),
    backgroundBlueTints: new Map<string, number>(),
    seabedBlueTints: new Map<string, number>(),
    selectedBackgroundId: cosmeticId,
    selectedSeabedId: cosmeticId,
    cleanliness: 100,
    cleanedAt: now,
    maxDisplayLevel: 1
  };
}

export function ensureTankState(
  states: Map<number, TankRuntimeState>,
  level: number,
  config: TankStateConfig
): TankRuntimeState {
  const sanitizedLevel = Math.max(1, Math.floor(level));
  let state = states.get(sanitizedLevel);
  if (!state) {
    state = createDefaultTankState(sanitizedLevel, config);
    states.set(sanitizedLevel, state);
  }

  const fallbackCosmeticId = config.defaultCosmeticId(sanitizedLevel);
  state.backgroundInventory ??= new Map<string, number>([[fallbackCosmeticId, 1]]);
  state.seabedInventory ??= new Map<string, number>([[fallbackCosmeticId, 1]]);
  state.fishInventoryAges ??= new Map<string, number[]>();
  state.backgroundBlueTints ??= new Map<string, number>();
  state.seabedBlueTints ??= new Map<string, number>();
  state.selectedBackgroundId ??= fallbackCosmeticId;
  state.selectedSeabedId ??= fallbackCosmeticId;
  state.maxDisplayLevel = Math.max(1, Math.floor(state.maxDisplayLevel ?? 1));
  return state;
}

export function cosmeticInventoryFromRecord(
  source: Record<string, number> | undefined,
  level: number,
  config: TankStateConfig
): Map<string, number> {
  const result = recordToMap(source);
  const fallback = config.defaultCosmeticId(level);
  result.set(fallback, Math.max(1, result.get(fallback) ?? 0));
  result.set("home", Math.max(1, result.get("home") ?? 0));
  return result;
}

export function tankStatesFromSave(saved: SavedGame, config: TankStateConfig): Map<number, TankRuntimeState> {
  const states = new Map<number, TankRuntimeState>();
  const savedStates = saved.tank.states ?? {};
  for (const [key, value] of Object.entries(savedStates)) {
    const level = Math.max(1, Math.floor(Number(key)));
    if (!Number.isFinite(level) || level > config.maxOwnedTanks) {
      continue;
    }
    states.set(level, {
      wallet: createWallet(value.wallet?.common ?? 0, value.wallet?.rare ?? 0, value.wallet?.superRare ?? 0),
      foodInventory: recordToMap(value.foodInventory) as Map<FoodTypeId, number>,
      fishInventory: recordToMap(value.fishInventory),
      fishInventoryAges: ageRecordToMap(value.fishInventoryAges),
      decorationInventory: recordToMap(value.decorationInventory),
      creatureInventory: recordToMap(value.creatureInventory),
      backgroundInventory: cosmeticInventoryFromRecord(value.backgroundInventory, level, config),
      seabedInventory: cosmeticInventoryFromRecord(value.seabedInventory, level, config),
      backgroundBlueTints: recordToMap(value.backgroundBlueTints),
      seabedBlueTints: recordToMap(value.seabedBlueTints),
      selectedBackgroundId: config.validCosmeticId("background", value.selectedBackgroundId, level),
      selectedSeabedId: config.validCosmeticId("seabed", value.selectedSeabedId, level),
      cleanliness: clamp(value.cleanliness ?? 100, 0, 100),
      cleanedAt: value.cleanedAt ?? Date.now(),
      maxDisplayLevel: Math.max(1, Math.floor(value.maxDisplayLevel ?? 1))
    });
  }

  if (!states.has(1)) {
    states.set(1, {
      wallet: { ...saved.wallet },
      foodInventory: recordToMap(saved.foodInventory) as Map<FoodTypeId, number>,
      fishInventory: recordToMap(saved.fishInventory),
      fishInventoryAges: ageRecordToMap(saved.fishInventoryAges),
      decorationInventory: recordToMap(saved.decorationInventory),
      creatureInventory: recordToMap(saved.creatureInventory),
      backgroundInventory: cosmeticInventoryFromRecord(undefined, 1, config),
      seabedInventory: cosmeticInventoryFromRecord(undefined, 1, config),
      backgroundBlueTints: new Map<string, number>(),
      seabedBlueTints: new Map<string, number>(),
      selectedBackgroundId: config.validCosmeticId("background", undefined, 1),
      selectedSeabedId: config.validCosmeticId("seabed", undefined, 1),
      cleanliness: saved.tank.cleanliness,
      cleanedAt: saved.tank.cleanedAt,
      maxDisplayLevel: 1
    });
  }

  return states;
}

export function tankStatesRecord(
  levels: number[],
  getState: (level: number) => TankRuntimeState,
  maxDisplayLevelFor: (level: number, state: TankRuntimeState) => number
): SavedGame["tank"]["states"] {
  const result: NonNullable<SavedGame["tank"]["states"]> = {};
  for (const level of levels) {
    const state = getState(level);
    result[String(level)] = {
      wallet: { ...state.wallet },
      foodInventory: Object.fromEntries([...state.foodInventory.entries()].filter(([, count]) => count > 0)) as Record<FoodTypeId, number>,
      fishInventory: mapToRecord(state.fishInventory),
      fishInventoryAges: ageMapToRecord(state.fishInventoryAges),
      decorationInventory: mapToRecord(state.decorationInventory),
      creatureInventory: mapToRecord(state.creatureInventory),
      backgroundInventory: mapToRecord(state.backgroundInventory),
      seabedInventory: mapToRecord(state.seabedInventory),
      backgroundBlueTints: mapToRecord(state.backgroundBlueTints),
      seabedBlueTints: mapToRecord(state.seabedBlueTints),
      selectedBackgroundId: state.selectedBackgroundId,
      selectedSeabedId: state.selectedSeabedId,
      cleanliness: state.cleanliness,
      cleanedAt: state.cleanedAt,
      maxDisplayLevel: Math.max(state.maxDisplayLevel ?? 1, maxDisplayLevelFor(level, state))
    };
  }
  return result;
}

export function ageRecordToMap(source: Record<string, number[]> | undefined): Map<string, number[]> {
  const result = new Map<string, number[]>();
  if (!source) {
    return result;
  }
  for (const [id, values] of Object.entries(source)) {
    const ages = Array.isArray(values)
      ? values.filter((value) => Number.isFinite(value) && value > 0).map((value) => Math.floor(value)).sort((a, b) => b - a)
      : [];
    if (ages.length > 0) {
      result.set(id, ages);
    }
  }
  return result;
}

export function ageMapToRecord(source: Map<string, number[]>): Record<string, number[]> {
  return Object.fromEntries(
    [...source.entries()]
      .map(([id, values]) => [id, values.filter((value) => Number.isFinite(value) && value > 0).map((value) => Math.floor(value)).sort((a, b) => b - a)] as const)
      .filter(([, values]) => values.length > 0)
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
