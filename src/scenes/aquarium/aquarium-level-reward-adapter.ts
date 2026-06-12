import type { AquariumSceneCore } from "./AquariumSceneCore";
import type { AquariumLevelRewardControllerHost, LevelCompletionBonusReward } from "./aquarium-level-reward-controller";
import type { DecorationSize, TankCosmetic } from "../../game/tank-catalog";
import type { TankCosmeticCategory, TankRuntimeState } from "../../game/tank-state";
import type { DecorationType, FishType, Price } from "../../types/mechanics";
import type { Fish } from "../../objects/Fish";

type AquariumLevelRewardAdapterScene = {
  tankLevel: number;
  ensureTankState(level: number): TankRuntimeState;
  activeFish(): Fish[];
  storeFish(fish: Fish): void;
  clearCoinDrops(): void;
  addFishToInventory(fishType: FishType, quantity?: number): void;
  showLevelCompletionRewardModal(completedLevel: number, nextLevel: number, rewardFish: FishType[], bonusRewards?: LevelCompletionBonusReward): void;
  refreshUi(renderControls?: boolean): void;
  storeOverlay?: { refresh(): void };
  saveNow(savedAt?: number, immediate?: boolean): void;
  ownedFishTypeIds(): Set<string>;
  priceWealth(price: FishType["price"]): number;
  tankCosmetics(category: TankCosmeticCategory): TankCosmetic[];
  tankCosmeticImageUrl(asset: TankCosmetic): string | undefined;
  decorationVariantPrice(decorationType: DecorationType, size: DecorationSize): Price;
  decorationInventoryKey(decorationTypeId: string, size: DecorationSize): string;
};

export function createAquariumLevelRewardControllerHost(scene: AquariumSceneCore): AquariumLevelRewardControllerHost {
  const aquariumScene = scene as unknown as AquariumLevelRewardAdapterScene;
  return {
    tankLevel: () => aquariumScene.tankLevel,
    ensureTankState: (level) => aquariumScene.ensureTankState(level),
    activeFish: () => aquariumScene.activeFish(),
    storeFish: (fish) => aquariumScene.storeFish(fish),
    clearCoinDrops: () => aquariumScene.clearCoinDrops(),
    addFishToInventory: (fishType, quantity) => aquariumScene.addFishToInventory(fishType, quantity),
    showLevelCompletionRewardModal: (completedLevel, nextLevel, rewardFish, bonusRewards) =>
      aquariumScene.showLevelCompletionRewardModal(completedLevel, nextLevel, rewardFish, bonusRewards),
    refreshUi: (renderControls) => aquariumScene.refreshUi(renderControls),
    refreshStoreOverlay: () => aquariumScene.storeOverlay?.refresh(),
    saveNow: (savedAt, immediate) => aquariumScene.saveNow(savedAt, immediate),
    ownedFishTypeIds: () => aquariumScene.ownedFishTypeIds(),
    priceWealth: (price) => aquariumScene.priceWealth(price),
    tankCosmetics: (category) => aquariumScene.tankCosmetics(category),
    tankCosmeticImageUrl: (asset) => aquariumScene.tankCosmeticImageUrl(asset),
    decorationVariantPrice: (decorationType, size) => aquariumScene.decorationVariantPrice(decorationType, size),
    decorationInventoryKey: (decorationTypeId, size) => aquariumScene.decorationInventoryKey(decorationTypeId, size)
  };
}
