import type { AquariumSceneCore } from "./AquariumSceneCore";
import type { AquariumProductionControllerHost } from "./aquarium-production-controller";
import type { Fish } from "../../objects/Fish";
import type { TankRuntimeState } from "../../game/tank-state";

type AquariumProductionAdapterScene = {
  tankLevel: number;
  ensureTankState(level: number): TankRuntimeState;
  activeFish(): Fish[];
  sortedOwnedTankLevels(): number[];
  updateFrameKey(): number;
  awardLevelCompletionRewards(level: number, previousProduction: number, nextProduction: number): boolean;
  calculateTankNetWorth(level?: number): number;
  tankDisplayLevel(level?: number): number;
};

export function createAquariumProductionControllerHost(scene: AquariumSceneCore): AquariumProductionControllerHost {
  const aquariumScene = scene as unknown as AquariumProductionAdapterScene;
  return {
    tankLevel: () => aquariumScene.tankLevel,
    ensureTankState: (level) => aquariumScene.ensureTankState(level),
    activeFish: () => aquariumScene.activeFish(),
    sortedOwnedTankLevels: () => aquariumScene.sortedOwnedTankLevels(),
    updateFrameKey: () => aquariumScene.updateFrameKey(),
    awardLevelCompletionRewards: (level, previousProduction, nextProduction) =>
      aquariumScene.awardLevelCompletionRewards(level, previousProduction, nextProduction),
    calculateTankNetWorth: (level) => aquariumScene.calculateTankNetWorth(level),
    tankDisplayLevel: (level) => aquariumScene.tankDisplayLevel(level)
  };
}
