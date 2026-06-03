import { foodTypes } from "../data/content";
import { serverNow } from "../services/server-time";
import { createDefaultPrizeMachineState, normalizePrizeMachineState, type PrizeMachineState } from "./prize-machine";
import type { DailyQuestReward } from "./quest-system";
import type { CoinType, FishGender, FoodTypeId, Wallet } from "../types/mechanics";
import { clamp } from "./math";

export const SAVE_VERSION = 13;
export const SAVE_KEY = "phaser-aquarium-save-v1";
export const MAX_OFFLINE_SECONDS = 60 * 60 * 3;

export type SavedFish = {
  typeId: string;
  tankLevel?: number;
  x: number;
  y: number;
  ageSeconds: number;
  visualAgeSeconds?: number;
  hunger: number;
  health: number;
  nextCoinDropInMs: number;
  fatalCareSeconds?: number;
  continuousHungrySeconds?: number;
  gender?: FishGender;
};

export type SavedDecoration = {
  typeId: string;
  tankLevel?: number;
  x: number;
  y: number;
  size?: string;
  depth?: number;
};

export type SavedHelperCreature = {
  typeId: string;
  tankLevel?: number;
  x: number;
  y: number;
  targetX: number;
};

export type SavedCoinDrop = {
  tankLevel?: number;
  x: number;
  y: number;
  value: number;
  coinType: CoinType;
  isMega?: boolean;
  landingX?: number;
  bottomY?: number;
};

export type SavedQuestPresent = {
  id: string;
  questId: string;
  reward: DailyQuestReward;
  rewardLabel: string;
  tankLevel?: number;
  x: number;
  y: number;
  landingX?: number;
  bottomY?: number;
};

export type SavedGame = {
  version: typeof SAVE_VERSION;
  savedAt: number;
  syncVersion?: number;
  wallet: Wallet;
  foodInventory: Record<FoodTypeId, number>;
  fishInventory: Record<string, number>;
  fishInventoryAges?: Record<string, number[]>;
  decorationInventory: Record<string, number>;
  creatureInventory: Record<string, number>;
  fish: SavedFish[];
  decorations: SavedDecoration[];
  helperCreatures: SavedHelperCreature[];
  coinDrops: SavedCoinDrop[];
  questPresents?: SavedQuestPresent[];
  tank: {
    cleanliness: number;
    cleanedAt: number;
    level: number;
    ownedLevels?: number[];
    activeLevel?: number;
    names?: Record<string, string>;
    states?: Record<string, SavedTankState>;
  };
  settings: {
    sound: boolean;
    music: boolean;
    musicVolume: number;
    reducedMotion: boolean;
    notifications: boolean;
  };
  dailyGoals: {
    date: string;
    claimed: string[];
    activeQuestIds?: string[];
  };
  prizeMachine: PrizeMachineState;
};

export type SavedTankState = {
  wallet?: Wallet;
  foodInventory?: Record<FoodTypeId, number>;
  fishInventory?: Record<string, number>;
  fishInventoryAges?: Record<string, number[]>;
  decorationInventory?: Record<string, number>;
  creatureInventory?: Record<string, number>;
  backgroundInventory?: Record<string, number>;
  seabedInventory?: Record<string, number>;
  backgroundBlueTints?: Record<string, number>;
  seabedBlueTints?: Record<string, number>;
  selectedBackgroundId?: string;
  selectedSeabedId?: string;
  cleanliness?: number;
  cleanedAt?: number;
  maxDisplayLevel?: number;
  fishProductionTotal?: number;
  timeCurrentRemainingSeconds?: number;
};

export type OfflineProgress = {
  elapsedSeconds: number;
  earned: Wallet;
};

const coinTypes: CoinType[] = ["common", "rare", "superRare"];

export function createEmptyWallet(): Wallet {
  return { common: 0, rare: 0, superRare: 0 };
}

export function mapToRecord(source: Map<string, number>): Record<string, number> {
  return Object.fromEntries(
    [...source.entries()].filter(([, count]) => Number.isFinite(count) && count > 0)
  );
}

export function recordToMap(source: Record<string, number> | undefined): Map<string, number> {
  const result = new Map<string, number>();
  if (!source) {
    return result;
  }

  for (const [id, value] of Object.entries(source)) {
    if (Number.isFinite(value) && value > 0) {
      result.set(id, Math.floor(value));
    }
  }

  return result;
}

export function saveGame(snapshot: SavedGame): void {
  if (!storageAvailable()) {
    return;
  }

  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn("[Save] Failed to write save to localStorage", err);
  }
}

export function loadGame(): SavedGame | undefined {
  if (!storageAvailable()) {
    return undefined;
  }

  const rawSave = localStorage.getItem(SAVE_KEY);
  if (!rawSave) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(rawSave) as Partial<SavedGame> & { version?: number; foodInventory?: number | Record<FoodTypeId, number> };
    if (!parsed.wallet || !Array.isArray(parsed.fish)) {
      return undefined;
    }

    const migrated = migrateSave(parsed);
    if (!migrated) {
      return undefined;
    }

    return buildSanitizedSave(migrated);
  } catch (err) {
    console.warn("[Save] Failed to load save, attempting partial recovery", err);
    return recoverPartialSave(rawSave);
  }
}

function buildSanitizedSave(migrated: SavedGame): SavedGame {
  return {
    version: SAVE_VERSION,
    savedAt: sanitizeNumber(migrated.savedAt, serverNow()),
    wallet: sanitizeWallet(migrated.wallet),
    foodInventory: sanitizeFoodInventory(migrated.foodInventory),
    fishInventory: sanitizeCountRecord(migrated.fishInventory),
    fishInventoryAges: sanitizeAgeRecord(migrated.fishInventoryAges),
    decorationInventory: sanitizeCountRecord(migrated.decorationInventory),
    creatureInventory: sanitizeCountRecord(migrated.creatureInventory),
    fish: migrated.fish.map(sanitizeFish).filter((fish): fish is SavedFish => Boolean(fish)),
    decorations: Array.isArray(migrated.decorations)
      ? migrated.decorations.map(sanitizeDecoration).filter((decoration): decoration is SavedDecoration => Boolean(decoration))
      : [],
    helperCreatures: Array.isArray(migrated.helperCreatures)
      ? migrated.helperCreatures.map(sanitizeHelperCreature).filter((creature): creature is SavedHelperCreature => Boolean(creature))
      : [],
    coinDrops: Array.isArray(migrated.coinDrops)
      ? migrated.coinDrops.map(sanitizeCoinDrop).filter((coin): coin is SavedCoinDrop => Boolean(coin))
      : [],
    questPresents: Array.isArray(migrated.questPresents)
      ? migrated.questPresents.map(sanitizeQuestPresent).filter((present): present is SavedQuestPresent => Boolean(present))
      : [],
    tank: {
      cleanliness: clamp(sanitizeNumber(migrated.tank?.cleanliness, 100), 0, 100),
      cleanedAt: sanitizeNumber(migrated.tank?.cleanedAt, serverNow()),
      level: Math.max(1, Math.floor(sanitizeNumber(migrated.tank?.level, 1))),
      ownedLevels: sanitizeOwnedTankLevels(migrated.tank?.ownedLevels, migrated.tank?.level).slice(0, 5),
      activeLevel: Math.max(1, Math.floor(sanitizeNumber(migrated.tank?.activeLevel, migrated.tank?.level ?? 1))),
      names: sanitizeTankNames(migrated.tank?.names),
      states: sanitizeTankStates(migrated.tank?.states)
    },
    settings: {
      sound: migrated.settings?.sound ?? true,
      music: migrated.settings?.music ?? true,
      musicVolume: clamp(sanitizeNumber(migrated.settings?.musicVolume, 16), 0, 100),
      reducedMotion: migrated.settings?.reducedMotion ?? false,
      notifications: migrated.settings?.notifications ?? false
    },
    dailyGoals: {
      date: typeof migrated.dailyGoals?.date === "string" ? migrated.dailyGoals.date : localDateKey(),
      claimed: Array.isArray(migrated.dailyGoals?.claimed)
        ? migrated.dailyGoals.claimed.filter((id): id is string => typeof id === "string")
        : [],
      activeQuestIds: Array.isArray(migrated.dailyGoals?.activeQuestIds)
        ? migrated.dailyGoals.activeQuestIds.filter((id): id is string => typeof id === "string")
        : undefined
    },
    prizeMachine: normalizePrizeMachineState(migrated.prizeMachine)
  };
}

function recoverPartialSave(rawSave: string): SavedGame | undefined {
  try {
    const parsed = JSON.parse(rawSave);
    if (!parsed || typeof parsed !== "object") {
      return undefined;
    }
    const candidate = parsed as Partial<SavedGame> & { tank?: Partial<SavedGame["tank"]> };
    if (!candidate.wallet || !Array.isArray(candidate.fish)) {
      return undefined;
    }
    const wallet = sanitizeWallet(candidate.wallet);
    const fish = candidate.fish.map(sanitizeFish).filter((f): f is SavedFish => Boolean(f));
    const recovered: SavedGame = {
      version: SAVE_VERSION,
      savedAt: sanitizeNumber(candidate.savedAt, serverNow()),
      wallet,
      foodInventory: sanitizeFoodInventory(candidate.foodInventory),
      fishInventory: sanitizeCountRecord(candidate.fishInventory),
      fishInventoryAges: sanitizeAgeRecord(candidate.fishInventoryAges),
      decorationInventory: sanitizeCountRecord(candidate.decorationInventory),
      creatureInventory: sanitizeCountRecord(candidate.creatureInventory),
      fish,
      decorations: Array.isArray(candidate.decorations)
        ? candidate.decorations.map(sanitizeDecoration).filter((d): d is SavedDecoration => Boolean(d))
        : [],
      helperCreatures: Array.isArray(candidate.helperCreatures)
        ? candidate.helperCreatures.map(sanitizeHelperCreature).filter((creature): creature is SavedHelperCreature => Boolean(creature))
        : [],
      coinDrops: [],
      questPresents: [],
      tank: {
        cleanliness: clamp(sanitizeNumber(candidate.tank?.cleanliness, 100), 0, 100),
        cleanedAt: sanitizeNumber(candidate.tank?.cleanedAt, serverNow()),
        level: Math.max(1, Math.floor(sanitizeNumber(candidate.tank?.level, 1))),
        ownedLevels: sanitizeOwnedTankLevels(candidate.tank?.ownedLevels, candidate.tank?.level),
        activeLevel: Math.max(1, Math.floor(sanitizeNumber(candidate.tank?.activeLevel, candidate.tank?.level ?? 1))),
        names: sanitizeTankNames(candidate.tank?.names),
        states: sanitizeTankStates(candidate.tank?.states as Record<string, SavedTankState> | undefined)
      },
      settings: {
        sound: candidate.settings?.sound ?? true,
        music: candidate.settings?.music ?? true,
        musicVolume: clamp(sanitizeNumber(candidate.settings?.musicVolume, 16), 0, 100),
        reducedMotion: candidate.settings?.reducedMotion ?? false,
        notifications: candidate.settings?.notifications ?? false
      },
      dailyGoals: {
        date: typeof candidate.dailyGoals?.date === "string" ? candidate.dailyGoals.date : localDateKey(),
        claimed: Array.isArray(candidate.dailyGoals?.claimed)
          ? candidate.dailyGoals.claimed.filter((id): id is string => typeof id === "string")
          : [],
        activeQuestIds: undefined
      },
      prizeMachine: normalizePrizeMachineState(candidate.prizeMachine)
    };

    return buildSanitizedSave(recovered);
  } catch (err) {
    console.warn("[Save] Failed to recover partial save", err);
    return undefined;
  }
}

function migrateSave(
  parsed: Partial<SavedGame> & { version?: number; foodInventory?: number | Record<FoodTypeId, number> }
): SavedGame | undefined {
  if (parsed.version === SAVE_VERSION) {
    return buildSanitizedSave(parsed as SavedGame);
  }

  if (parsed.version && parsed.version >= 2 && parsed.version < SAVE_VERSION) {
    const migrated: SavedGame = {
      ...(parsed as SavedGame),
      version: SAVE_VERSION,
      creatureInventory: sanitizeCountRecord(parsed.creatureInventory),
      helperCreatures: Array.isArray(parsed.helperCreatures) ? parsed.helperCreatures : [],
      prizeMachine: normalizePrizeMachineState(parsed.prizeMachine),
      tank: {
        ...(parsed.tank ?? { cleanliness: 100, cleanedAt: serverNow(), level: 1 }),
        cleanliness: sanitizeNumber(parsed.tank?.cleanliness, 100),
        cleanedAt: sanitizeNumber(parsed.tank?.cleanedAt, serverNow()),
        level: Math.max(1, Math.floor(sanitizeNumber(parsed.tank?.level, 1)))
      }
    };
    return parsed.version < 11 ? migrateFoodCountsToCalories(migrated) : migrated;
  }

  if (parsed.version === 1) {
    const foodCount = Math.max(0, Math.floor(sanitizeNumber(parsed.foodInventory, 0)));
    return migrateFoodCountsToCalories({
      version: SAVE_VERSION,
      savedAt: sanitizeNumber(parsed.savedAt, serverNow()),
      wallet: sanitizeWallet(parsed.wallet ?? {}),
      foodInventory: { basic: foodCount } as Record<FoodTypeId, number>,
      fishInventory: sanitizeCountRecord(parsed.fishInventory),
      fishInventoryAges: sanitizeAgeRecord(parsed.fishInventoryAges),
      decorationInventory: sanitizeCountRecord(parsed.decorationInventory),
      creatureInventory: {},
      fish: Array.isArray(parsed.fish) ? parsed.fish : [],
      decorations: Array.isArray(parsed.decorations) ? parsed.decorations : [],
      helperCreatures: [],
      coinDrops: [],
      questPresents: [],
      tank: { cleanliness: 100, cleanedAt: serverNow(), level: 1 },
      settings: { sound: true, music: true, musicVolume: 16, reducedMotion: false, notifications: false },
      dailyGoals: { date: localDateKey(), claimed: [] },
      prizeMachine: createDefaultPrizeMachineState()
    });
  }

  return undefined;
}

export function clearSave(): void {
  if (storageAvailable()) {
    localStorage.removeItem(SAVE_KEY);
  }
}

export function calculateOfflineSeconds(savedAt: number, now: number): number {
  const elapsedSeconds = Math.floor((now - savedAt) / 1000);
  return Math.max(0, Math.min(elapsedSeconds, MAX_OFFLINE_SECONDS));
}

function sanitizeWallet(wallet: Partial<Wallet>): Wallet {
  const result = createEmptyWallet();
  for (const coinType of coinTypes) {
    result[coinType] = Math.max(0, Math.round(sanitizeNumber(wallet[coinType], 0) * 1000) / 1000);
  }
  return result;
}

function sanitizeCountRecord(source: Record<string, number> | undefined): Record<string, number> {
  const result: Record<string, number> = {};
  if (!source) {
    return result;
  }

  for (const [id, value] of Object.entries(source)) {
    const count = Math.floor(sanitizeNumber(value, 0));
    if (id && count > 0) {
      result[id] = count;
    }
  }

  return result;
}

function sanitizeAgeRecord(source: Record<string, number[]> | undefined): Record<string, number[]> {
  const result: Record<string, number[]> = {};
  if (!source) {
    return result;
  }

  for (const [id, values] of Object.entries(source)) {
    if (!id || !Array.isArray(values)) {
      continue;
    }
    const ages = values
      .map((value) => Math.max(0, Math.floor(sanitizeNumber(value, 0))))
      .filter((value) => value > 0)
      .sort((a, b) => b - a);
    if (ages.length > 0) {
      result[id] = ages;
    }
  }

  return result;
}

function sanitizePercentRecord(source: Record<string, number> | undefined): Record<string, number> {
  const result: Record<string, number> = {};
  if (!source) {
    return result;
  }

  for (const [id, value] of Object.entries(source)) {
    const amount = Math.round(clamp(sanitizeNumber(value, 0), 0, 100));
    if (id && amount > 0) {
      result[id] = amount;
    }
  }

  return result;
}

function sanitizeFoodInventory(source: Record<FoodTypeId, number> | undefined): Record<FoodTypeId, number> {
  const sanitized = sanitizeCountRecord(source);
  return sanitized as Record<FoodTypeId, number>;
}

function migrateFoodCountsToCalories(snapshot: SavedGame): SavedGame {
  return {
    ...snapshot,
    foodInventory: foodCountsToCalories(snapshot.foodInventory),
    tank: {
      ...snapshot.tank,
      states: snapshot.tank?.states ? Object.fromEntries(
        Object.entries(snapshot.tank.states).map(([level, state]) => [
          level,
          {
            ...state,
            foodInventory: foodCountsToCalories(state.foodInventory as Record<FoodTypeId, number> | undefined)
          }
        ])
      ) : snapshot.tank?.states
    }
  };
}

function foodCountsToCalories(source: Record<FoodTypeId, number> | undefined): Record<FoodTypeId, number> {
  const result: Partial<Record<FoodTypeId, number>> = {};
  if (!source) {
    return result as Record<FoodTypeId, number>;
  }

  for (const [id, value] of Object.entries(source) as Array<[FoodTypeId, number]>) {
    const amount = Math.max(0, Math.floor(sanitizeNumber(value, 0)));
    if (amount <= 0) {
      continue;
    }
    const foodType = foodTypes.find((item) => item.id === id);
    const isCalorieTracked = foodType && id !== "medicine" && id !== "ageBoost" && id !== "creature";
    result[id] = isCalorieTracked ? amount * foodType.calories : amount;
  }

  return result as Record<FoodTypeId, number>;
}

function sanitizeFish(fish: Partial<SavedFish>): SavedFish | undefined {
  if (!fish.typeId) {
    return undefined;
  }

  return {
    typeId: fish.typeId,
    tankLevel: Math.max(1, Math.floor(sanitizeNumber(fish.tankLevel, 1))),
    x: sanitizeNumber(fish.x, 0),
    y: sanitizeNumber(fish.y, 0),
    ageSeconds: Math.max(0, sanitizeNumber(fish.ageSeconds, 0)),
    visualAgeSeconds: Math.max(0, sanitizeNumber(fish.visualAgeSeconds, fish.ageSeconds ?? 0)),
    hunger: clamp(sanitizeNumber(fish.hunger, 12), -10000, 100),
    health: clamp(sanitizeNumber(fish.health, 100), 0, 100),
    nextCoinDropInMs: Math.max(0, sanitizeNumber(fish.nextCoinDropInMs, 0)),
    fatalCareSeconds: clamp(sanitizeNumber(fish.fatalCareSeconds, 0), 0, 24 * 60 * 60),
    continuousHungrySeconds: clamp(sanitizeNumber(fish.continuousHungrySeconds, 0), 0, 24 * 60 * 60),
    gender: fish.gender === "F" ? "F" : "M"
  };
}

function sanitizeOwnedTankLevels(source: number[] | undefined, legacyLevel = 1): number[] {
  const maxLegacyLevel = Math.max(1, Math.floor(sanitizeNumber(legacyLevel, 1)));
  const levels = new Set<number>([1]);
  for (let level = 2; level <= maxLegacyLevel; level += 1) {
    levels.add(level);
  }
  if (Array.isArray(source)) {
    for (const value of source) {
      const level = Math.max(1, Math.floor(sanitizeNumber(value, 1)));
      if (level <= 5) {
        levels.add(level);
      }
    }
  }
  return [...levels].sort((a, b) => a - b);
}

function sanitizeTankStates(source: Record<string, SavedTankState> | undefined): Record<string, SavedTankState> {
  const result: Record<string, SavedTankState> = {};
  if (!source) {
    return result;
  }

  for (const [key, value] of Object.entries(source)) {
    const level = Math.max(1, Math.floor(sanitizeNumber(Number(key), 1)));
    if (level > 5 || !value) {
      continue;
    }
    result[String(level)] = {
      wallet: sanitizeWallet(value.wallet ?? {}),
      foodInventory: sanitizeFoodInventory(value.foodInventory),
      fishInventory: sanitizeCountRecord(value.fishInventory),
      fishInventoryAges: sanitizeAgeRecord(value.fishInventoryAges),
      decorationInventory: sanitizeCountRecord(value.decorationInventory),
      creatureInventory: sanitizeCountRecord(value.creatureInventory),
      backgroundInventory: sanitizeCountRecord(value.backgroundInventory),
      seabedInventory: sanitizeCountRecord(value.seabedInventory),
      backgroundBlueTints: sanitizePercentRecord(value.backgroundBlueTints),
      seabedBlueTints: sanitizePercentRecord(value.seabedBlueTints),
      selectedBackgroundId: typeof value.selectedBackgroundId === "string" ? value.selectedBackgroundId : undefined,
      selectedSeabedId: typeof value.selectedSeabedId === "string" ? value.selectedSeabedId : undefined,
      cleanliness: clamp(sanitizeNumber(value.cleanliness, 100), 0, 100),
      cleanedAt: sanitizeNumber(value.cleanedAt, serverNow()),
      maxDisplayLevel: Math.max(1, Math.floor(sanitizeNumber(value.maxDisplayLevel, 1))),
      fishProductionTotal: Math.max(0, Math.round(sanitizeNumber(value.fishProductionTotal, 0) * 10) / 10),
      timeCurrentRemainingSeconds: Math.max(0, sanitizeNumber(value.timeCurrentRemainingSeconds, 0))
    };
  }
  return result;
}

function sanitizeTankNames(source: Record<string, string> | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!source) {
    return result;
  }

  for (const [key, value] of Object.entries(source)) {
    const level = Math.max(1, Math.floor(sanitizeNumber(Number(key), 1)));
    if (typeof value === "string") {
      const name = value.trim().slice(0, 24);
      if (name.length > 0) {
        result[String(level)] = name;
      }
    }
  }

  return result;
}

function sanitizeDecoration(decoration: Partial<SavedDecoration>): SavedDecoration | undefined {
  if (!decoration.typeId) {
    return undefined;
  }

  return {
    typeId: decoration.typeId,
    tankLevel: Math.max(1, Math.floor(sanitizeNumber(decoration.tankLevel, 1))),
    x: sanitizeNumber(decoration.x, 0),
    y: sanitizeNumber(decoration.y, 0),
    size: typeof decoration.size === "string" ? decoration.size : undefined,
    depth: decoration.depth === undefined ? undefined : sanitizeNumber(decoration.depth, 0)
  };
}

function sanitizeHelperCreature(creature: Partial<SavedHelperCreature>): SavedHelperCreature | undefined {
  if (!creature.typeId) {
    return undefined;
  }

  return {
    typeId: creature.typeId,
    tankLevel: Math.max(1, Math.floor(sanitizeNumber(creature.tankLevel, 1))),
    x: sanitizeNumber(creature.x, 0),
    y: sanitizeNumber(creature.y, 0),
    targetX: sanitizeNumber(creature.targetX, creature.x ?? 0)
  };
}

function sanitizeCoinDrop(coin: Partial<SavedCoinDrop>): SavedCoinDrop | undefined {
  if (coin.coinType !== "common" && coin.coinType !== "rare" && coin.coinType !== "superRare") {
    return undefined;
  }

  const value = Math.round(sanitizeNumber(coin.value, 0) * 10) / 10;
  if (value <= 0) {
    return undefined;
  }

  return {
    tankLevel: Math.max(1, Math.floor(sanitizeNumber(coin.tankLevel, 1))),
    x: sanitizeNumber(coin.x, 0),
    y: sanitizeNumber(coin.y, 0),
    value,
    coinType: coin.coinType,
    isMega: coin.isMega === true,
    landingX: sanitizeNumber(coin.landingX, coin.x ?? 0),
    bottomY: sanitizeNumber(coin.bottomY, coin.y ?? 0)
  };
}

function sanitizeQuestPresent(present: Partial<SavedQuestPresent>): SavedQuestPresent | undefined {
  const id = typeof present.id === "string" ? present.id : "";
  const questId = typeof present.questId === "string" ? present.questId : "";
  const reward = sanitizeDailyQuestReward(present.reward);
  if (!id || !questId || !reward) {
    return undefined;
  }

  return {
    id,
    questId,
    reward,
    rewardLabel: typeof present.rewardLabel === "string" ? present.rewardLabel : "Prize",
    tankLevel: Math.max(1, Math.floor(sanitizeNumber(present.tankLevel, 1))),
    x: sanitizeNumber(present.x, 0),
    y: sanitizeNumber(present.y, 0),
    landingX: sanitizeNumber(present.landingX, present.x ?? 0),
    bottomY: sanitizeNumber(present.bottomY, present.y ?? 0)
  };
}

function sanitizeDailyQuestReward(reward: unknown): DailyQuestReward | undefined {
  if (!reward || typeof reward !== "object") {
    return undefined;
  }
  const candidate = reward as Partial<DailyQuestReward>;
  if (candidate.kind === "coins" && candidate.price) {
    const price = candidate.price;
    const coinType = price.coinType === "rare" || price.coinType === "superRare" ? price.coinType : "common";
    return {
      kind: "coins",
      price: {
        coinType,
        amount: Math.max(0, sanitizeNumber(price.amount, 0)),
        rareAmount: Math.max(0, sanitizeNumber(price.rareAmount, 0)) || undefined,
        superRareAmount: Math.max(0, sanitizeNumber(price.superRareAmount, 0)) || undefined
      }
    };
  }
  if (candidate.kind === "food" && typeof candidate.foodTypeId === "string") {
    return {
      kind: "food",
      foodTypeId: candidate.foodTypeId,
      quantity: Math.max(1, Math.floor(sanitizeNumber(candidate.quantity, 1))),
      assignTo: candidate.assignTo === "oldest-active-fish" ? "oldest-active-fish" : undefined
    };
  }
  if (candidate.kind === "fish" && typeof candidate.fishTypeId === "string") {
    return {
      kind: "fish",
      fishTypeId: candidate.fishTypeId,
      quantity: Math.max(1, Math.floor(sanitizeNumber(candidate.quantity, 1)))
    };
  }
  if (candidate.kind === "utility" && typeof candidate.utilityId === "string") {
    return {
      kind: "utility",
      utilityId: candidate.utilityId,
      quantity: Math.max(1, Math.floor(sanitizeNumber(candidate.quantity, 1)))
    };
  }

  return undefined;
}

function sanitizeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function storageAvailable(): boolean {
  try {
    const testKey = "__storage_test__";
    localStorage.setItem(testKey, testKey);
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

function localDateKey(): string {
  const date = new Date(serverNow());
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
