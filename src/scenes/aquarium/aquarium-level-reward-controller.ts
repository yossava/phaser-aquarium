import { decorationTypes, fishTypes } from "../../data/content";
import { earn, formatPrice } from "../../game/economy";
import { fishProductionThresholdForLevel, rawTankDisplayLevelFromProduction } from "../../game/level-progression";
import {
  aquariumBackgroundAssetPath,
  aquariumFloorAssetPath,
  decorationSizeOrder,
  decorationSizes
} from "../../game/tank-catalog";
import { coinAssetPathByType, tankUpgradePrices } from "./aquarium-scene-config";
import type { DecorationSize, TankCosmetic } from "../../game/tank-catalog";
import type { TankCosmeticCategory, TankRuntimeState } from "../../game/tank-state";
import type { DecorationType, FishType, Price } from "../../types/mechanics";
import type { Fish } from "../../objects/Fish";
import type { LevelCompletionRewardCard } from "../../ui/RewardModals";

export type LevelCompletionBonusReward = {
  coins?: Price;
  background?: TankCosmetic;
  seabed?: TankCosmetic;
  decoration?: {
    decorationType: DecorationType;
    size: DecorationSize;
  };
};

/**
 * Owns what happens when a tank crosses a display-level threshold: choosing the
 * reward fish, the one-time level-2 bonus pack (coins/background/seabed/decor),
 * granting them to the right tank, and formatting the reward cards. The scene
 * keeps thin wrappers for awardLevelCompletionRewards / the reward cards.
 */
export type AquariumLevelRewardControllerHost = {
  tankLevel: () => number;
  ensureTankState: (level: number) => TankRuntimeState;
  activeFish: () => Fish[];
  storeFish: (fish: Fish) => void;
  clearCoinDrops: () => void;
  addFishToInventory: (fishType: FishType, quantity?: number) => void;
  showLevelCompletionRewardModal: (completedLevel: number, nextLevel: number, rewardFish: FishType[], bonusRewards?: LevelCompletionBonusReward) => void;
  refreshUi: (renderControls?: boolean) => void;
  refreshStoreOverlay: () => void;
  saveNow: (savedAt?: number, immediate?: boolean) => void;
  ownedFishTypeIds: () => Set<string>;
  priceWealth: (price: FishType["price"]) => number;
  tankCosmetics: (category: TankCosmeticCategory) => TankCosmetic[];
  tankCosmeticImageUrl: (asset: TankCosmetic) => string | undefined;
  decorationVariantPrice: (decorationType: DecorationType, size: DecorationSize) => Price;
  decorationInventoryKey: (decorationTypeId: string, size: DecorationSize) => string;
};

export class AquariumLevelRewardController {
  public constructor(private readonly host: AquariumLevelRewardControllerHost) {}

  public awardLevelCompletionRewards(level: number, previousProduction: number, nextProduction: number): boolean {
    const previousLevel = rawTankDisplayLevelFromProduction(previousProduction);
    const nextLevel = rawTankDisplayLevelFromProduction(nextProduction);
    if (nextLevel <= previousLevel) {
      return false;
    }

    const rewardFish: FishType[] = [];
    for (let completedLevel = previousLevel + 1; completedLevel <= nextLevel; completedLevel += 1) {
      const completedThreshold = fishProductionThresholdForLevel(completedLevel);
      rewardFish.push(this.levelRewardFishFor(completedLevel, Math.max(1, Math.floor(completedThreshold * 0.3))));
    }

    if (rewardFish.length === 0) {
      return false;
    }

    const state = this.host.ensureTankState(level);
    const bonusRewards = this.levelCompletionBonusRewards(previousLevel, nextLevel, state);
    if (level === this.host.tankLevel()) {
      this.moveActiveFishToInventory();
      this.host.clearCoinDrops();
      this.grantLevelCompletionBonusRewards(state, bonusRewards);
      rewardFish.forEach((fishType) => this.host.addFishToInventory(fishType));
      this.host.showLevelCompletionRewardModal(previousLevel, nextLevel, rewardFish, bonusRewards);
      this.host.refreshUi();
      this.host.refreshStoreOverlay();
      this.host.saveNow();
    } else {
      this.grantLevelCompletionBonusRewards(state, bonusRewards);
      for (const fishType of rewardFish) {
        state.fishInventory.set(fishType.id, (state.fishInventory.get(fishType.id) ?? 0) + 1);
      }
    }
    return true;
  }

  public levelCompletionBonusRewardCards(rewards: LevelCompletionBonusReward): LevelCompletionRewardCard[] {
    const cards: LevelCompletionRewardCard[] = [];
    if (rewards.coins) {
      cards.push({
        title: formatPrice(rewards.coins),
        detail: "Coins",
        imageUrl: coinAssetPathByType[rewards.coins.coinType],
        imageClassName: "coin"
      });
    }
    if (rewards.background) {
      cards.push({
        title: rewards.background.name,
        detail: "Background",
        imageUrl: this.host.tankCosmeticImageUrl(rewards.background) ?? aquariumBackgroundAssetPath,
        imageClassName: "background"
      });
    }
    if (rewards.seabed) {
      cards.push({
        title: rewards.seabed.name,
        detail: "Sand",
        imageUrl: this.host.tankCosmeticImageUrl(rewards.seabed) ?? aquariumFloorAssetPath,
        imageClassName: "sand"
      });
    }
    if (rewards.decoration) {
      cards.push({
        title: `${rewards.decoration.decorationType.name} ${decorationSizes[rewards.decoration.size].label}`,
        detail: "Decor",
        imageUrl: `/assets/decorations/${rewards.decoration.decorationType.id}.png`,
        imageClassName: "decor"
      });
    }
    return cards;
  }

  private levelRewardFishFor(completedLevel: number, targetValue: number): FishType {
    const unlockedLevel = Math.max(1, completedLevel + 1);
    const ownedIds = this.host.ownedFishTypeIds();
    const unlockedFish = fishTypes.filter((fishType) => fishType.tankLevel <= unlockedLevel);
    const unownedFish = unlockedFish.filter((fishType) => !ownedIds.has(fishType.id));
    const pool = unownedFish.length > 0 ? unownedFish : unlockedFish.length > 0 ? unlockedFish : fishTypes;
    return [...pool].sort((first, second) => {
      const firstDelta = Math.abs(this.host.priceWealth(first.price) - targetValue);
      const secondDelta = Math.abs(this.host.priceWealth(second.price) - targetValue);
      return firstDelta - secondDelta || first.tankLevel - second.tankLevel || this.host.priceWealth(first.price) - this.host.priceWealth(second.price);
    })[0];
  }

  private levelCompletionBonusRewards(previousLevel: number, nextLevel: number, state: TankRuntimeState): LevelCompletionBonusReward {
    if (previousLevel !== 1 || nextLevel < 2) {
      return {};
    }

    return {
      coins: tankUpgradePrices[2],
      background: this.cheapestUnownedTankCosmetic("background", state),
      seabed: this.cheapestUnownedTankCosmetic("seabed", state),
      decoration: this.cheapestDecorationReward()
    };
  }

  private grantLevelCompletionBonusRewards(state: TankRuntimeState, rewards: LevelCompletionBonusReward): void {
    if (rewards.coins) {
      earn(state.wallet, rewards.coins.coinType, rewards.coins.amount);
      if (rewards.coins.rareAmount !== undefined) {
        earn(state.wallet, "rare", rewards.coins.rareAmount);
      }
      if (rewards.coins.superRareAmount !== undefined) {
        earn(state.wallet, "superRare", rewards.coins.superRareAmount);
      }
    }

    if (rewards.background) {
      state.backgroundInventory.set(rewards.background.id, (state.backgroundInventory.get(rewards.background.id) ?? 0) + 1);
    }
    if (rewards.seabed) {
      state.seabedInventory.set(rewards.seabed.id, (state.seabedInventory.get(rewards.seabed.id) ?? 0) + 1);
    }
    if (rewards.decoration) {
      const key = this.host.decorationInventoryKey(rewards.decoration.decorationType.id, rewards.decoration.size);
      state.decorationInventory.set(key, (state.decorationInventory.get(key) ?? 0) + 1);
    }
  }

  private cheapestUnownedTankCosmetic(category: TankCosmeticCategory, state: TankRuntimeState): TankCosmetic | undefined {
    const inventory = category === "background" ? state.backgroundInventory : state.seabedInventory;
    return [...this.host.tankCosmetics(category)]
      .filter((cosmetic) => this.host.priceWealth(cosmetic.price) > 0 && (inventory.get(cosmetic.id) ?? 0) <= 0)
      .sort((first, second) => this.host.priceWealth(first.price) - this.host.priceWealth(second.price) || first.name.localeCompare(second.name))[0];
  }

  private cheapestDecorationReward(): LevelCompletionBonusReward["decoration"] {
    const candidates = decorationTypes.flatMap((decorationType) =>
      decorationSizeOrder.map((size) => ({
        decorationType,
        size,
        price: this.host.decorationVariantPrice(decorationType, size)
      }))
    );
    const cheapest = candidates.sort((first, second) =>
      this.host.priceWealth(first.price) - this.host.priceWealth(second.price) ||
      first.decorationType.name.localeCompare(second.decorationType.name) ||
      decorationSizeOrder.indexOf(first.size) - decorationSizeOrder.indexOf(second.size)
    )[0];
    return cheapest ? { decorationType: cheapest.decorationType, size: cheapest.size } : undefined;
  }

  private moveActiveFishToInventory(): void {
    for (const fish of [...this.host.activeFish()]) {
      this.host.storeFish(fish);
    }
  }
}
