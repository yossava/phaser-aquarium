import type Phaser from "phaser";
import { serverNow } from "../../services/server-time";
import type { DailyGoalsState, DailyQuestItem } from "../../game/quest-system";
import type { Fish } from "../../objects/Fish";
import type { Wallet, DecorationType } from "../../types/mechanics";
import type { TankCosmetic, DecorationSize } from "../../game/tank-catalog";
import type { TankCosmeticCategory } from "../../game/tank-state";
import type { AquariumQuestPhaseControllerHost } from "./aquarium-quest-phase-controller";
import type { AquariumSceneCore } from "./AquariumSceneCore";

type QuestPhaseAdapterScene = Phaser.Scene & {
  dailyGoals: DailyGoalsState;
  wallet: Wallet;
  cleanliness: number;
  cleanedAt: number;
  decorationInventory: Map<string, number>;
  tankLevel: number;
  activeFish: () => Fish[];
  tankCosmetics: (category: TankCosmeticCategory) => TankCosmetic[];
  tankCosmeticInventory: (category: TankCosmeticCategory, level?: number) => Map<string, number>;
  getDecorationInventory: (typeId: string, size: DecorationSize) => number;
  decorationInventoryKey: (typeId: string, size: DecorationSize) => string;
  defaultTankCosmeticId: (level: number) => string;
  dailyQuestActionCount: (action: string) => number;
  dailyQuestItems: () => DailyQuestItem[];
  totalStoredFishCount: () => number;
  ownsTankCosmetic: (asset: TankCosmetic) => boolean;
  aquariumDecorationController: () => { phaseTwoDecoration: () => DecorationType | undefined; ownsPhaseTwoDecoration: () => boolean };
  recordDailyQuestAction: (action: string) => void;
  normalizeDailyGoals: (goals: DailyGoalsState) => DailyGoalsState;
};

export function createAquariumQuestPhaseControllerHost(scene: AquariumSceneCore): AquariumQuestPhaseControllerHost {
  const s = scene as unknown as QuestPhaseAdapterScene;
  return {
    getDailyGoals: () => s.dailyGoals,
    setDailyGoals: (goals) => { s.dailyGoals = goals; },
    getWallet: () => s.wallet,
    activeFish: () => s.activeFish(),
    tankCosmetics: (category) => s.tankCosmetics(category),
    tankCosmeticInventory: (category, level) => s.tankCosmeticInventory(category, level),
    getDecorationInventory: (key) => s.decorationInventory.get(key) ?? 0,
    setDecorationInventory: (key, count) => { s.decorationInventory.set(key, count); },
    decorationInventoryKey: (typeId, size) => s.decorationInventoryKey(typeId, size),
    defaultTankCosmeticId: (level) => s.defaultTankCosmeticId(level),
    getTankLevel: () => s.tankLevel,
    dailyQuestActionCount: (action) => s.dailyQuestActionCount(action),
    dailyQuestItems: () => s.dailyQuestItems(),
    getCleanliness: () => s.cleanliness,
    setCleanliness: (value) => { s.cleanliness = value; },
    getCleanedAt: () => s.cleanedAt,
    setCleanedAt: (value) => { s.cleanedAt = value; },
    getTotalStoredFishCount: () => s.totalStoredFishCount(),
    ownsTankCosmetic: (asset) => s.ownsTankCosmetic(asset),
    phaseTwoDecorationIdentifier: () => s.aquariumDecorationController().phaseTwoDecoration(),
    ownsPhaseTwoDecorationIdentifier: () => s.aquariumDecorationController().ownsPhaseTwoDecoration(),
    recordDailyQuestAction: (action) => s.recordDailyQuestAction(action),
    normalizeDailyGoals: (goals) => s.normalizeDailyGoals(goals),
    getServerTime: () => serverNow(),
  };
}
