import type { CoinType, FoodTypeId, Wallet } from "../types/mechanics";

export const SAVE_VERSION = 3;
export const SAVE_KEY = "phaser-aquarium-save-v1";
export const MAX_OFFLINE_SECONDS = 60 * 60 * 8;

export type SavedFish = {
  typeId: string;
  x: number;
  y: number;
  ageSeconds: number;
  hunger: number;
  health: number;
  nextCoinDropInMs: number;
};

export type SavedDecoration = {
  typeId: string;
  x: number;
  y: number;
};

export type SavedGame = {
  version: typeof SAVE_VERSION;
  savedAt: number;
  wallet: Wallet;
  foodInventory: Record<FoodTypeId, number>;
  fishInventory: Record<string, number>;
  decorationInventory: Record<string, number>;
  fish: SavedFish[];
  decorations: SavedDecoration[];
  tank: {
    cleanliness: number;
    cleanedAt: number;
    level: number;
  };
  settings: {
    sound: boolean;
    music: boolean;
    reducedMotion: boolean;
    notifications: boolean;
  };
  dailyGoals: {
    date: string;
    claimed: string[];
  };
  rentals?: {
    autoFeederEndsAt: number;
    autoCollectorEndsAt: number;
    autoFeederMinutes?: number;
    autoCollectorMinutes?: number;
  };
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

  localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
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

    return {
      version: SAVE_VERSION,
      savedAt: sanitizeNumber(migrated.savedAt, Date.now()),
      wallet: sanitizeWallet(migrated.wallet),
      foodInventory: sanitizeFoodInventory(migrated.foodInventory),
      fishInventory: sanitizeCountRecord(migrated.fishInventory),
      decorationInventory: sanitizeCountRecord(migrated.decorationInventory),
      fish: migrated.fish.map(sanitizeFish).filter((fish): fish is SavedFish => Boolean(fish)),
      decorations: Array.isArray(migrated.decorations)
        ? migrated.decorations.map(sanitizeDecoration).filter((decoration): decoration is SavedDecoration => Boolean(decoration))
        : []
      ,
      tank: {
        cleanliness: clamp(sanitizeNumber(migrated.tank?.cleanliness, 100), 0, 100),
        cleanedAt: sanitizeNumber(migrated.tank?.cleanedAt, Date.now()),
        level: clamp(Math.floor(sanitizeNumber(migrated.tank?.level, 1)), 1, 5)
      },
      settings: {
        sound: migrated.settings?.sound ?? true,
        music: migrated.settings?.music ?? true,
        reducedMotion: migrated.settings?.reducedMotion ?? false,
        notifications: migrated.settings?.notifications ?? false
      },
      dailyGoals: {
        date: typeof migrated.dailyGoals?.date === "string" ? migrated.dailyGoals.date : localDateKey(),
        claimed: Array.isArray(migrated.dailyGoals?.claimed)
          ? migrated.dailyGoals.claimed.filter((id): id is string => typeof id === "string")
          : []
      },
      rentals: {
        autoFeederEndsAt: Math.max(0, sanitizeNumber(migrated.rentals?.autoFeederEndsAt, 0)),
        autoCollectorEndsAt: Math.max(0, sanitizeNumber(migrated.rentals?.autoCollectorEndsAt, 0)),
        autoFeederMinutes: clamp(Math.floor(sanitizeNumber(migrated.rentals?.autoFeederMinutes, 1)), 1, 10),
        autoCollectorMinutes: clamp(Math.floor(sanitizeNumber(migrated.rentals?.autoCollectorMinutes, 1)), 1, 10)
      }
    };
  } catch {
    return undefined;
  }
}

function migrateSave(
  parsed: Partial<SavedGame> & { version?: number; foodInventory?: number | Record<FoodTypeId, number> }
): SavedGame | undefined {
  if (parsed.version === SAVE_VERSION) {
    return parsed as SavedGame;
  }

  if (parsed.version === 2) {
    return {
      ...(parsed as SavedGame),
      version: SAVE_VERSION,
      tank: {
        cleanliness: sanitizeNumber(parsed.tank?.cleanliness, 100),
        cleanedAt: sanitizeNumber(parsed.tank?.cleanedAt, Date.now()),
        level: 1
      },
      rentals: {
        autoFeederEndsAt: Math.max(0, sanitizeNumber(parsed.rentals?.autoFeederEndsAt, 0)),
        autoCollectorEndsAt: Math.max(0, sanitizeNumber(parsed.rentals?.autoCollectorEndsAt, 0)),
        autoFeederMinutes: clamp(Math.floor(sanitizeNumber(parsed.rentals?.autoFeederMinutes, 1)), 1, 10),
        autoCollectorMinutes: clamp(Math.floor(sanitizeNumber(parsed.rentals?.autoCollectorMinutes, 1)), 1, 10)
      }
    };
  }

  if (parsed.version === 1) {
    const foodCount = Math.max(0, Math.floor(sanitizeNumber(parsed.foodInventory, 0)));
    return {
      version: SAVE_VERSION,
      savedAt: sanitizeNumber(parsed.savedAt, Date.now()),
      wallet: sanitizeWallet(parsed.wallet ?? {}),
      foodInventory: { basic: foodCount } as Record<FoodTypeId, number>,
      fishInventory: sanitizeCountRecord(parsed.fishInventory),
      decorationInventory: sanitizeCountRecord(parsed.decorationInventory),
      fish: Array.isArray(parsed.fish) ? parsed.fish : [],
      decorations: Array.isArray(parsed.decorations) ? parsed.decorations : [],
      tank: { cleanliness: 100, cleanedAt: Date.now(), level: 1 },
      settings: { sound: true, music: true, reducedMotion: false, notifications: false },
      dailyGoals: { date: localDateKey(), claimed: [] },
      rentals: { autoFeederEndsAt: 0, autoCollectorEndsAt: 0, autoFeederMinutes: 1, autoCollectorMinutes: 1 }
    };
  }

  return undefined;
}

export function clearSave(): void {
  if (storageAvailable()) {
    localStorage.removeItem(SAVE_KEY);
  }
}

export function calculateOfflineSeconds(savedAt: number, now = Date.now()): number {
  const elapsedSeconds = Math.floor((now - savedAt) / 1000);
  return Math.max(0, Math.min(elapsedSeconds, MAX_OFFLINE_SECONDS));
}

function sanitizeWallet(wallet: Partial<Wallet>): Wallet {
  const result = createEmptyWallet();
  for (const coinType of coinTypes) {
    result[coinType] = Math.max(0, Math.floor(sanitizeNumber(wallet[coinType], 0)));
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

function sanitizeFoodInventory(source: Record<FoodTypeId, number> | undefined): Record<FoodTypeId, number> {
  const sanitized = sanitizeCountRecord(source);
  return sanitized as Record<FoodTypeId, number>;
}

function sanitizeFish(fish: Partial<SavedFish>): SavedFish | undefined {
  if (!fish.typeId) {
    return undefined;
  }

  return {
    typeId: fish.typeId,
    x: sanitizeNumber(fish.x, 0),
    y: sanitizeNumber(fish.y, 0),
    ageSeconds: Math.max(0, sanitizeNumber(fish.ageSeconds, 0)),
    hunger: clamp(sanitizeNumber(fish.hunger, 12), 0, 100),
    health: clamp(sanitizeNumber(fish.health, 100), 0, 100),
    nextCoinDropInMs: Math.max(0, sanitizeNumber(fish.nextCoinDropInMs, 0))
  };
}

function sanitizeDecoration(decoration: Partial<SavedDecoration>): SavedDecoration | undefined {
  if (!decoration.typeId) {
    return undefined;
  }

  return {
    typeId: decoration.typeId,
    x: sanitizeNumber(decoration.x, 0),
    y: sanitizeNumber(decoration.y, 0)
  };
}

function sanitizeNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function storageAvailable(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

function localDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
