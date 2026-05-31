import Phaser from "phaser";
import { decorationTypes, fishTypes, helperCreatureTypes } from "../../data/content";
import { createAquariumSaveSnapshot } from "../../game/aquarium-persistence";
import { earn } from "../../game/economy";
import {
  beginPrizeMachineSession,
  normalizePrizeMachineState,
  type PrizeMachineState
} from "../../game/prize-machine";
import {
  type DailyGoalsState,
  type DailyQuestReward
} from "../../game/quest-system";
import {
  calculateOfflineSeconds,
  createEmptyWallet,
  loadGame,
  saveGame,
  type OfflineProgress,
  type SavedCoinDrop,
  type SavedDecoration,
  type SavedFish,
  type SavedGame,
  type SavedHelperCreature,
  type SavedQuestPresent,
  type SavedTankState
} from "../../game/save";
import type { TankRuntimeState } from "../../game/tank-state";
import type { CoinDrop } from "../../objects/CoinDrop";
import type { Fish } from "../../objects/Fish";
import type { HelperCreature } from "../../objects/HelperCreature";
import type { QuestPresentDrop } from "../../objects/QuestPresentDrop";
import type { PlacedDecoration } from "../../game/tank-entities";
import type { CoinType, DecorationType, FishType, HelperCreatureType, Wallet } from "../../types/mechanics";
import type { SettingsState } from "./aquarium-settings-controller";
import { maxCoinDrops, maxOwnedTanks } from "./aquarium-scene-config";

export type AquariumScenePersistenceTarget = {
  time: { now: number };
  prizeMachineRuntimeSessionId: number;
  tankStates: Map<number, TankRuntimeState>;
  ownedTankLevels: Set<number>;
  tankNames: Map<number, string>;
  tankLevel: number;
  fishCatalogLevel: number;
  settings: SettingsState;
  dailyGoals: DailyGoalsState;
  prizeMachine: PrizeMachineState;
  offlineProgress: OfflineProgress;
  cleanliness: number;
  cleanedAt: number;
  fish: Fish[];
  coinDrops: CoinDrop[];
  questPresents: Array<{ drop: QuestPresentDrop; reward: DailyQuestReward }>;
  placedDecorations: PlacedDecoration[];
  helperCreatures: HelperCreature[];
  wallet: Wallet;
  foodInventory: Map<string, number>;
  fishInventory: Map<string, number>;
  fishInventoryAges: Map<string, number[]>;
  decorationInventory: Map<string, number>;
  creatureInventory: Map<string, number>;
  tankStatesFromSave: (saved: SavedGame) => Map<number, TankRuntimeState>;
  tankNamesFromRecord: (record: Record<number, string> | undefined) => Map<number, string>;
  hasTankLevel: (level: number) => boolean;
  applyTankState: (level: number) => void;
  applyTankViewScale: () => void;
  normalizeDailyGoals: (goals: DailyGoalsState | undefined) => DailyGoalsState;
  refreshFishTankVisibility: () => void;
  refreshHelperTankVisibility: () => void;
  refreshDecorationTankVisibility: () => void;
  showOfflineSummary: () => void;
  saveNow: (savedAt?: number) => void;
  sortedOwnedTankLevels: () => number[];
  tankNamesRecord: () => Record<number, string>;
  tankStatesRecord: () => Record<string, SavedTankState> | undefined;
  captureActiveTankState: () => void;
  foodInventoryRecord: () => Record<string, number>;
  addDecorationToTank: (decoration: DecorationType, x: number, y: number, size: string | undefined, count: number, depth: number | undefined) => void;
  sanitizeDecorationSize: (size: string | undefined) => string;
  addHelperCreatureToTank: (creatureType: HelperCreatureType, x: number, y: number, targetX: number, count: number) => void;
  addFishToTank: (type: FishType, x: number, y: number, options: { gender?: string; tankLevel?: number }) => Fish;
  createCoinDrop: (x: number, y: number, value: number, coinType: CoinType, isMega: boolean | undefined, options: { landingX?: number; bottomY?: number }) => void;
  createQuestPresentDrop: (questId: string, reward: DailyQuestReward, rewardLabel: string, options: { id?: string; x?: number; y?: number; landingX?: number; bottomY?: number }) => void;
  removeFishAt: (index: number) => Fish | undefined;
  tankDirtRatePerSecond: (activeFishCount: number) => number;
  activeProductionPaceMultiplier: () => number;
  addFishProductionTotal: (tankLevel: number, amount: number) => void;
  ensureTankState: (level: number) => TankRuntimeState;
};

export function restoreAquariumSceneSave(scene: AquariumScenePersistenceTarget): void {
  const saved = loadGame();
  if (!saved) {
    return;
  }

  scene.tankStates = scene.tankStatesFromSave(saved);
  scene.ownedTankLevels = new Set((saved.tank.ownedLevels ?? [1]).filter((level: number) => level >= 1 && level <= maxOwnedTanks));
  scene.ownedTankLevels.add(1);
  scene.tankNames = scene.tankNamesFromRecord(saved.tank.names);
  scene.tankLevel = scene.hasTankLevel(saved.tank.activeLevel ?? saved.tank.level)
    ? Math.max(1, Math.floor(saved.tank.activeLevel ?? saved.tank.level ?? 1))
    : 1;
  scene.applyTankState(scene.tankLevel);
  scene.fishCatalogLevel = 1;
  scene.applyTankViewScale();
  scene.settings = { ...saved.settings };
  scene.dailyGoals = scene.normalizeDailyGoals(saved.dailyGoals);
  scene.prizeMachine = beginPrizeMachineSession(
    normalizePrizeMachineState(saved.prizeMachine),
    scene.prizeMachineRuntimeSessionId
  );
  restoreDecorations(scene, saved.decorations);
  restoreHelperCreatures(scene, saved.helperCreatures);
  restoreFish(scene, saved.fish);
  restoreCoinDrops(scene, saved.coinDrops);
  restoreQuestPresents(scene, saved.questPresents ?? []);
  scene.refreshFishTankVisibility();
  scene.refreshHelperTankVisibility();
  scene.refreshDecorationTankVisibility();

  const elapsedSeconds = calculateOfflineSeconds(saved.savedAt);
  if (elapsedSeconds > 0) {
    scene.offlineProgress = applyAquariumSceneOfflineProgress(scene, elapsedSeconds);
    if (elapsedSeconds >= 60) {
      scene.showOfflineSummary();
    }
    scene.saveNow();
  }
}

export function applyAquariumSceneOfflineProgress(scene: AquariumScenePersistenceTarget, elapsedSeconds: number): OfflineProgress {
  const earned = createEmptyWallet();
  const earnedByTank = new Map<number, Wallet>();
  const offlineDeaths: Fish[] = [];

  for (const currentFish of scene.fish) {
    applyOfflineFishProduction(scene, currentFish, elapsedSeconds, earned, earnedByTank);
    applyOfflineFishCare(currentFish, elapsedSeconds, offlineDeaths);
  }

  for (const deadFish of offlineDeaths) {
    const index = scene.fish.indexOf(deadFish);
    if (index >= 0) {
      scene.removeFishAt(index);
    }
  }

  scene.cleanliness = Phaser.Math.Clamp(
    scene.cleanliness - Math.min(84, elapsedSeconds * scene.tankDirtRatePerSecond(scene.fish.length)),
    0,
    100
  );

  applyOfflineEarningsToTanks(scene, earnedByTank);
  scene.applyTankState(scene.tankLevel);

  return { elapsedSeconds, earned };
}

export function saveAquariumSceneNow(scene: AquariumScenePersistenceTarget, savedAt = Date.now()): void {
  scene.captureActiveTankState();
  saveGame(createAquariumSaveSnapshot({
    savedAt,
    currentTime: scene.time.now,
    wallet: scene.wallet,
    foodInventory: scene.foodInventoryRecord(),
    fishInventory: scene.fishInventory,
    fishInventoryAges: scene.fishInventoryAges,
    decorationInventory: scene.decorationInventory,
    creatureInventory: scene.creatureInventory,
    fish: scene.fish,
    decorations: scene.placedDecorations,
    helperCreatures: scene.helperCreatures,
    coinDrops: scene.coinDrops,
    questPresents: scene.questPresents,
    tank: {
      cleanliness: scene.cleanliness,
      cleanedAt: scene.cleanedAt,
      maxOwnedLevel: Math.max(...scene.sortedOwnedTankLevels()),
      ownedLevels: scene.sortedOwnedTankLevels(),
      activeLevel: scene.tankLevel,
      names: scene.tankNamesRecord(),
      states: scene.tankStatesRecord()
    },
    settings: scene.settings,
    dailyGoals: scene.dailyGoals,
    prizeMachine: scene.prizeMachine
  }));
}

function restoreDecorations(scene: AquariumScenePersistenceTarget, decorations: SavedDecoration[]): void {
  const savedDecorations = [...decorations].sort((first, second) => (first.depth ?? 0) - (second.depth ?? 0));
  for (const savedDecoration of savedDecorations) {
    const decoration = decorationTypes.find((item) => item.id === savedDecoration.typeId);
    if (decoration) {
      scene.addDecorationToTank(
        decoration,
        savedDecoration.x,
        savedDecoration.y,
        scene.sanitizeDecorationSize(savedDecoration.size),
        1,
        savedDecoration.depth
      );
    }
  }
}

function restoreHelperCreatures(scene: AquariumScenePersistenceTarget, helperCreatures: SavedHelperCreature[]): void {
  for (const savedCreature of helperCreatures) {
    const creatureType = helperCreatureTypes.find((item) => item.id === savedCreature.typeId);
    if (creatureType) {
      scene.addHelperCreatureToTank(creatureType, savedCreature.x, savedCreature.y, savedCreature.targetX, 1);
    }
  }
}

function restoreFish(scene: AquariumScenePersistenceTarget, fish: SavedFish[]): void {
  for (const savedFish of fish) {
    const type = fishTypes.find((fishType) => fishType.id === savedFish.typeId);
    if (!type) {
      continue;
    }

    const restoredFish = scene.addFishToTank(type, savedFish.x, savedFish.y, {
      gender: savedFish.gender,
      tankLevel: savedFish.tankLevel ?? 1
    });
    restoredFish.restoreProgress(
      savedFish.ageSeconds,
      savedFish.hunger,
      savedFish.health,
      scene.time.now + savedFish.nextCoinDropInMs,
      savedFish.fatalCareSeconds,
      savedFish.continuousHungrySeconds,
      savedFish.visualAgeSeconds
    );
  }
}

function restoreCoinDrops(scene: AquariumScenePersistenceTarget, coinDrops: SavedCoinDrop[]): void {
  for (const savedCoin of coinDrops) {
    if ((savedCoin.tankLevel ?? scene.tankLevel) !== scene.tankLevel || scene.coinDrops.length >= maxCoinDrops) {
      continue;
    }
    scene.createCoinDrop(
      savedCoin.x,
      savedCoin.y,
      savedCoin.value,
      savedCoin.coinType,
      savedCoin.isMega,
      {
        landingX: savedCoin.landingX,
        bottomY: savedCoin.bottomY
      }
    );
  }
}

function restoreQuestPresents(scene: AquariumScenePersistenceTarget, questPresents: SavedQuestPresent[]): void {
  for (const savedPresent of questPresents) {
    if ((savedPresent.tankLevel ?? scene.tankLevel) !== scene.tankLevel) {
      continue;
    }
    scene.createQuestPresentDrop(savedPresent.questId, savedPresent.reward, savedPresent.rewardLabel, {
      id: savedPresent.id,
      x: savedPresent.x,
      y: savedPresent.y,
      landingX: savedPresent.landingX,
      bottomY: savedPresent.bottomY
    });
  }
}

function applyOfflineFishProduction(
  scene: AquariumScenePersistenceTarget,
  currentFish: Fish,
  elapsedSeconds: number,
  earned: Wallet,
  earnedByTank: Map<number, Wallet>
): void {
  const canProduce = currentFish.state !== "ill" && currentFish.health >= 35 && currentFish.hunger < 86;
  if (!canProduce) {
    return;
  }

  const paceMultiplier = scene.activeProductionPaceMultiplier();
  const targetCalories = (currentFish.fullCaloriesNeed() / 3600) * elapsedSeconds * paceMultiplier;
  const convertedCalories = Math.min(currentFish.currentFullnessCalories(), targetCalories);
  const producedValue = currentFish.coinProductionValueForCalories(convertedCalories);
  const amount = producedValue < 1
    ? Math.floor(producedValue * 10) / 10
    : Math.floor(producedValue);
  if (amount < 0.1 || producedValue <= 0) {
    return;
  }

  const consumedCalories = Math.min(convertedCalories, convertedCalories * (amount / producedValue));
  currentFish.consumeFullnessCalories(consumedCalories);
  scene.addFishProductionTotal(currentFish.tankLevel, amount);
  earned.common += amount;
  const tankEarned = earnedByTank.get(currentFish.tankLevel) ?? createEmptyWallet();
  tankEarned.common += amount;
  earnedByTank.set(currentFish.tankLevel, tankEarned);
}

function applyOfflineFishCare(currentFish: Fish, elapsedSeconds: number, offlineDeaths: Fish[]): void {
  const hungerBeforeOffline = currentFish.hunger;
  currentFish.setAgeSeconds(currentFish.ageSeconds + elapsedSeconds);

  if (currentFish.hunger > 68) {
    const hungerIncrease = currentFish.hunger - hungerBeforeOffline;
    const thresholdCrossingSeconds = hungerBeforeOffline > 68 || hungerIncrease <= 0
      ? 0
      : Phaser.Math.Clamp(((68 - hungerBeforeOffline) / hungerIncrease) * elapsedSeconds, 0, elapsedSeconds);
    currentFish.addContinuousHungerSeconds(elapsedSeconds - thresholdCrossingSeconds);
  } else {
    currentFish.setContinuousHungerSeconds(0);
  }

  if (currentFish.hunger > 86) {
    currentFish.health = Phaser.Math.Clamp(currentFish.health - Math.min(45, elapsedSeconds / 120), 0, 100);
  }

  currentFish.addFatalCareSeconds(currentFish.isInFatalCareState() ? elapsedSeconds : 0);
  if (currentFish.isDeadFromNeglect()) {
    offlineDeaths.push(currentFish);
  }

  currentFish.nextCoinDropAt = 0;
  currentFish.resumeAfterOfflineProgress();
}

function applyOfflineEarningsToTanks(scene: AquariumScenePersistenceTarget, earnedByTank: Map<number, Wallet>): void {
  for (const [level, tankEarned] of earnedByTank) {
    const state = scene.ensureTankState(level);
    for (const coinType of Object.keys(tankEarned) as Array<keyof Wallet>) {
      if (tankEarned[coinType] > 0) {
        earn(state.wallet, coinType, tankEarned[coinType]);
      }
    }
  }
}
