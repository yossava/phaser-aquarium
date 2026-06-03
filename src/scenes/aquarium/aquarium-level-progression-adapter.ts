import type Phaser from "phaser";
import type { Fish } from "../../objects/Fish";
import type {
  FishType,
  FoodTypeId,
  DecorationType,
  Price
} from "../../types/mechanics";
import type { DecorationSize, TankCosmetic } from "../../game/tank-catalog";
import type { TankCosmeticCategory } from "../../game/tank-state";
import type { TankRuntimeState } from "../../game/tank-state";
import type { AquariumSceneCore } from "./AquariumSceneCore";
import type { AquariumLevelProgressionControllerHost, LevelCompletionBonusReward } from "./aquarium-level-progression-controller";
import type { AquariumCareController } from "./aquarium-care-controller";

type AquariumLevelProgressionAdapterScene = Phaser.Scene & {
  tankLevel: number;
  cleanliness: number;
  fishInventory: Map<string, number>;
  foodInventory: Map<FoodTypeId, number>;
  storeOverlay?: { refresh(): void };
  recentInventoryDockItemKey?: string;

  ensureTankState(level: number): TankRuntimeState;
  activeFish(): Fish[];
  storeFish(fish: Fish): void;
  clearCoinDrops(): void;
  addFishToInventory(fishType: FishType, quantity?: number): void;
  showLevelCompletionRewardModal(completedLevel: number, nextLevel: number, rewardFish: FishType[], bonusRewards?: LevelCompletionBonusReward): void;
  refreshUi(renderControls?: boolean): void;
  saveNow(): void;
  ownedFishTypeIds(): Set<string>;
  priceWealth(price: FishType["price"]): number;
  tankCosmetics(category: TankCosmeticCategory): TankCosmetic[];
  decorationVariantPrice(decorationType: DecorationType, size: DecorationSize): Price;
  decorationInventoryKey(decorationTypeId: string, size: DecorationSize): string;
  tankCosmeticImageUrl(asset: TankCosmetic): string | undefined;
  getFoodInventory(foodTypeId: FoodTypeId): number;
  recordDailyQuestAction(action: string): void;
  floatText(message: string, x: number, y: number, color: string): void;
  closeModal(): void;
  createFoodDock(): void;
  phaseThreeCleanQuestActive(): boolean;
  aquariumCareController(): AquariumCareController;
};

export function createAquariumLevelProgressionHost(scene: AquariumSceneCore): AquariumLevelProgressionControllerHost {
  const aquariumScene = scene as unknown as AquariumLevelProgressionAdapterScene;
  return {
    scene: aquariumScene,
    tankLevel: aquariumScene.tankLevel,
    ensureTankState: (level) => aquariumScene.ensureTankState(level),
    activeFish: () => aquariumScene.activeFish(),
    storeFish: (fish) => aquariumScene.storeFish(fish),
    clearCoinDrops: () => aquariumScene.clearCoinDrops(),
    addFishToInventory: (fishType, quantity) => aquariumScene.addFishToInventory(fishType, quantity),
    showLevelCompletionRewardModal: (completedLevel, nextLevel, rewardFish, bonusRewards) => aquariumScene.showLevelCompletionRewardModal(completedLevel, nextLevel, rewardFish, bonusRewards),
    refreshUi: (renderControls) => aquariumScene.refreshUi(renderControls),
    refreshStoreOverlay: () => aquariumScene.storeOverlay?.refresh(),
    saveNow: () => aquariumScene.saveNow(),
    ownedFishTypeIds: () => aquariumScene.ownedFishTypeIds(),
    priceWealth: (price) => aquariumScene.priceWealth(price),
    tankCosmetics: (category) => aquariumScene.tankCosmetics(category),
    decorationVariantPrice: (decorationType, size) => aquariumScene.decorationVariantPrice(decorationType, size),
    decorationInventoryKey: (decorationTypeId, size) => aquariumScene.decorationInventoryKey(decorationTypeId, size),
    tankCosmeticImageUrl: (asset) => aquariumScene.tankCosmeticImageUrl(asset),
    getFoodInventory: (foodTypeId) => aquariumScene.getFoodInventory(foodTypeId),
    setFoodInventory: (foodTypeId, amount) => aquariumScene.foodInventory.set(foodTypeId, amount),
    recordDailyQuestAction: (action) => aquariumScene.recordDailyQuestAction(action),
    floatText: (message, x, y, color) => aquariumScene.floatText(message, x, y, color),
    closeModal: () => aquariumScene.closeModal(),
    createFoodDock: () => aquariumScene.createFoodDock(),
    setRecentInventoryDockItemKey: (key) => { aquariumScene.recentInventoryDockItemKey = key; },
    fishInventory: aquariumScene.fishInventory,
    cleanliness: aquariumScene.cleanliness,
    phaseThreeCleanQuestActive: () => aquariumScene.phaseThreeCleanQuestActive(),
    aquariumCareController: () => aquariumScene.aquariumCareController()
  };
}
