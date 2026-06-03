import { fishTypes, decorationTypes } from "../../data/content";
import { earn, formatNumber, formatPrice } from "../../game/economy";
import { timeCurrentFoodTypeId } from "../../game/food-system";
import { fishProductionThresholdForLevel, rawTankDisplayLevelFromProduction } from "../../game/level-progression";
import { toastX, toastY } from "../../game/constants";
import {
  coinAssetPathByType,
  tankUpgradePrices,
  type CompatibilitySummary,
  timeCurrentDurationSeconds,
  timeCurrentSpeedMultiplier
} from "./aquarium-scene-config";
import type { DecorationSize, TankCosmetic } from "../../game/tank-catalog";
import type { TankCosmeticCategory } from "../../game/tank-state";
import {
  aquariumBackgroundAssetPath,
  aquariumFloorAssetPath,
  decorationSizeOrder,
  decorationSizes
} from "../../game/tank-catalog";
import type { TankRuntimeState } from "../../game/tank-state";
import type { FishType, FoodTypeId, DecorationType, Price, CoinType } from "../../types/mechanics";
import type { Fish } from "../../objects/Fish";
import type { LevelCompletionRewardCard } from "../../ui/RewardModals";
import type { AquariumCareController } from "./aquarium-care-controller";

export type LevelCompletionBonusReward = {
  coins?: Price;
  background?: TankCosmetic;
  seabed?: TankCosmetic;
  decoration?: {
    decorationType: DecorationType;
    size: DecorationSize;
  };
};

export type AquariumLevelProgressionControllerHost = {
  scene: Phaser.Scene;
  tankLevel: number;
  ensureTankState: (level: number) => TankRuntimeState;
  activeFish: () => Fish[];
  storeFish: (fish: Fish) => void;
  clearCoinDrops: () => void;
  addFishToInventory: (fishType: FishType, quantity?: number) => void;
  showLevelCompletionRewardModal: (completedLevel: number, nextLevel: number, rewardFish: FishType[], bonusRewards?: LevelCompletionBonusReward) => void;
  refreshUi: (renderControls?: boolean) => void;
  refreshStoreOverlay: () => void;
  saveNow: () => void;
  ownedFishTypeIds: () => Set<string>;
  priceWealth: (price: FishType["price"]) => number;
  tankCosmetics: (category: TankCosmeticCategory) => TankCosmetic[];
  decorationVariantPrice: (decorationType: DecorationType, size: DecorationSize) => Price;
  decorationInventoryKey: (decorationTypeId: string, size: DecorationSize) => string;
  tankCosmeticImageUrl: (asset: TankCosmetic) => string | undefined;
  getFoodInventory: (foodTypeId: FoodTypeId) => number;
  setFoodInventory: (foodTypeId: FoodTypeId, amount: number) => void;
  recordDailyQuestAction: (action: string) => void;
  floatText: (message: string, x: number, y: number, color: string) => void;
  closeModal: () => void;
  createFoodDock: () => void;
  setRecentInventoryDockItemKey: (key: string) => void;
  fishInventory: Map<string, number>;
  cleanliness: number;
  phaseThreeCleanQuestActive: () => boolean;
  aquariumCareController: () => AquariumCareController;
};

export class AquariumLevelProgressionController {
  public constructor(private readonly host: AquariumLevelProgressionControllerHost) {}

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
    if (level === this.host.tankLevel) {
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

  public levelRewardFishFor(completedLevel: number, targetValue: number): FishType {
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

  public levelCompletionBonusRewards(previousLevel: number, nextLevel: number, state: TankRuntimeState): LevelCompletionBonusReward {
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

  public grantLevelCompletionBonusRewards(state: TankRuntimeState, rewards: LevelCompletionBonusReward): void {
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

  public cheapestUnownedTankCosmetic(category: TankCosmeticCategory, state: TankRuntimeState): TankCosmetic | undefined {
    const inventory = category === "background" ? state.backgroundInventory : state.seabedInventory;
    return [...this.host.tankCosmetics(category)]
      .filter((cosmetic) => this.host.priceWealth(cosmetic.price) > 0 && (inventory.get(cosmetic.id) ?? 0) <= 0)
      .sort((first, second) => this.host.priceWealth(first.price) - this.host.priceWealth(second.price) || first.name.localeCompare(second.name))[0];
  }

  public cheapestDecorationReward(): LevelCompletionBonusReward["decoration"] {
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

  public levelCompletionBonusRewardCards(rewards: LevelCompletionBonusReward): LevelCompletionRewardCard[] {
    const cards: LevelCompletionRewardCard[] = [];
    if (rewards.coins) {
      cards.push({
        title: formatPrice(rewards.coins),
        detail: "Coins",
        imageUrl: coinAssetPathByType[rewards.coins.coinType as CoinType],
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

  public moveActiveFishToInventory(): void {
    for (const fish of [...this.host.activeFish()]) {
      this.host.storeFish(fish);
    }
  }

  public updateTimeCurrent(deltaSeconds: number): void {
    const state = this.host.ensureTankState(this.host.tankLevel);
    if ((state.timeCurrentRemainingSeconds ?? 0) <= 0) {
      state.timeCurrentRemainingSeconds = 0;
      return;
    }

    state.timeCurrentRemainingSeconds = Math.max(0, state.timeCurrentRemainingSeconds - Math.max(0, deltaSeconds));
  }

  public useTimeCurrentBoost(): void {
    if (this.host.getFoodInventory(timeCurrentFoodTypeId) <= 0) {
      this.host.floatText("No Time Current left", toastX, toastY, "#ffb0a8");
      return;
    }

    const state = this.host.ensureTankState(this.host.tankLevel);
    this.host.setFoodInventory(timeCurrentFoodTypeId, Math.max(0, this.host.getFoodInventory(timeCurrentFoodTypeId) - 1));
    state.timeCurrentRemainingSeconds = Math.max(0, state.timeCurrentRemainingSeconds ?? 0) + timeCurrentDurationSeconds;
    this.host.setRecentInventoryDockItemKey(`food:${timeCurrentFoodTypeId}`);
    this.host.recordDailyQuestAction("use-time-current");
    this.host.floatText(`Time Current x${formatNumber(timeCurrentSpeedMultiplier)} active`, toastX, toastY, "#8be9ff");
    this.host.closeModal();
    this.host.refreshUi();
    this.host.createFoodDock();
    this.host.refreshUi(false);
    this.host.saveNow();
  }

  public totalStoredFishCount(): number {
    return [...this.host.fishInventory.values()].reduce((total, count) => total + Math.max(0, count), 0);
  }

  public calculateTankHappiness(): number {
    return this.host.aquariumCareController().calculateTankHappiness();
  }

  public calculateCurrentCompatibility(): CompatibilitySummary {
    return this.host.aquariumCareController().calculateCurrentCompatibility();
  }

  public calculateCompatibilityForTypes(types: FishType[], candidate?: FishType): CompatibilitySummary {
    return this.host.aquariumCareController().calculateCompatibilityForTypes(types, candidate);
  }

  public isTankDirty(): boolean {
    return this.host.aquariumCareController().isTankDirty();
  }

  public shouldShowCleanlinessWarning(): boolean {
    return Math.round(this.host.cleanliness) < 50 || this.host.phaseThreeCleanQuestActive();
  }

  public finishTankCleaning(): void {
    this.host.aquariumCareController().finishTankCleaning();
  }

  public tankDirtRatePerSecond(activeFishCount: number): number {
    return this.host.aquariumCareController().tankDirtRatePerSecond(activeFishCount);
  }

  public cleanTank(): void {
    this.host.aquariumCareController().cleanTank();
  }
}
