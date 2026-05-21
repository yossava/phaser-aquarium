import { normalizePrizeMachineState, type PrizeMachineState } from "./prize-machine";
import type { DailyGoalsState } from "./quest-system";
import { mapToRecord, SAVE_VERSION, type SavedCoinDrop, type SavedGame, type SavedQuestPresent } from "./save";
import { ageMapToRecord } from "./tank-state";
import type { PlacedDecoration } from "./tank-entities";
import type { Fish } from "../objects/Fish";
import type { HelperCreature } from "../objects/HelperCreature";
import type { CoinDrop } from "../objects/CoinDrop";
import type { QuestPresentDrop } from "../objects/QuestPresentDrop";
import type { FoodTypeId, Wallet } from "../types/mechanics";

export function savedCoinDrops(input: {
  coinDrops: CoinDrop[];
  tankLevel: number;
}): SavedCoinDrop[] {
  return input.coinDrops.map((coin) => ({
    tankLevel: input.tankLevel,
    x: coin.sprite.x,
    y: coin.sprite.y,
    value: coin.value,
    coinType: coin.coinType,
    isMega: coin.isMega,
    landingX: coin.landingX,
    bottomY: coin.bottomY
  }));
}

export function savedQuestPresents(input: {
  questPresents: Array<{ drop: QuestPresentDrop; reward: SavedQuestPresent["reward"] }>;
  tankLevel: number;
}): SavedQuestPresent[] {
  return input.questPresents.map(({ drop, reward }) => ({
    id: drop.id,
    questId: drop.questId,
    reward,
    rewardLabel: drop.rewardLabel,
    tankLevel: input.tankLevel,
    x: drop.sprite.x,
    y: drop.sprite.y,
    landingX: drop.landingX,
    bottomY: drop.bottomY
  }));
}

export function createAquariumSaveSnapshot(input: {
  savedAt: number;
  currentTime: number;
  wallet: Wallet;
  foodInventory: Record<FoodTypeId, number>;
  fishInventory: Map<string, number>;
  fishInventoryAges: Map<string, number[]>;
  decorationInventory: Map<string, number>;
  creatureInventory: Map<string, number>;
  fish: Fish[];
  decorations: PlacedDecoration[];
  helperCreatures: HelperCreature[];
  coinDrops: CoinDrop[];
  questPresents: Array<{ drop: QuestPresentDrop; reward: SavedQuestPresent["reward"] }>;
  tank: {
    cleanliness: number;
    cleanedAt: number;
    maxOwnedLevel: number;
    ownedLevels: number[];
    activeLevel: number;
    names: Record<string, string>;
    states: SavedGame["tank"]["states"];
  };
  settings: SavedGame["settings"];
  dailyGoals: DailyGoalsState;
  prizeMachine: PrizeMachineState;
}): SavedGame {
  return {
    version: SAVE_VERSION,
    savedAt: input.savedAt,
    wallet: { ...input.wallet },
    foodInventory: input.foodInventory,
    fishInventory: mapToRecord(input.fishInventory),
    fishInventoryAges: ageMapToRecord(input.fishInventoryAges),
    decorationInventory: mapToRecord(input.decorationInventory),
    creatureInventory: mapToRecord(input.creatureInventory),
    fish: input.fish.map((currentFish) => ({
      typeId: currentFish.type.id,
      x: currentFish.sprite.x,
      y: currentFish.sprite.y,
      ageSeconds: currentFish.ageSeconds,
      visualAgeSeconds: currentFish.visualAgeSeconds,
      hunger: currentFish.hunger,
      health: currentFish.health,
      nextCoinDropInMs: Math.max(0, currentFish.nextCoinDropAt - input.currentTime),
      fatalCareSeconds: currentFish.fatalCareSeconds,
      continuousHungrySeconds: currentFish.continuousHungrySeconds,
      gender: currentFish.gender,
      tankLevel: currentFish.tankLevel
    })),
    decorations: input.decorations.map((decoration) => ({
      typeId: decoration.typeId,
      tankLevel: decoration.tankLevel,
      x: decoration.image.x,
      y: decoration.image.y,
      size: decoration.size,
      depth: decoration.image.depth
    })),
    helperCreatures: input.helperCreatures.map((helper) => ({
      typeId: helper.type.id,
      tankLevel: helper.tankLevel,
      x: helper.sprite.x,
      y: helper.sprite.y,
      targetX: helper.getTargetX()
    })),
    coinDrops: savedCoinDrops({
      coinDrops: input.coinDrops,
      tankLevel: input.tank.activeLevel
    }),
    questPresents: savedQuestPresents({
      questPresents: input.questPresents,
      tankLevel: input.tank.activeLevel
    }),
    tank: {
      cleanliness: input.tank.cleanliness,
      cleanedAt: input.tank.cleanedAt,
      level: input.tank.maxOwnedLevel,
      ownedLevels: input.tank.ownedLevels,
      activeLevel: input.tank.activeLevel,
      names: input.tank.names,
      states: input.tank.states
    },
    settings: { ...input.settings },
    dailyGoals: {
      date: input.dailyGoals.date,
      claimed: [...input.dailyGoals.claimed],
      activeQuestIds: input.dailyGoals.activeQuestIds ? [...input.dailyGoals.activeQuestIds] : undefined
    },
    prizeMachine: normalizePrizeMachineState(input.prizeMachine)
  };
}
