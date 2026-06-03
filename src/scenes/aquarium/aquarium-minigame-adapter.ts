import type Phaser from "phaser";
import type { Fish } from "../../objects/Fish";
import type { AquariumSceneCore } from "./AquariumSceneCore";
import type { AquariumMinigameControllerHost } from "./aquarium-minigame-controller";
import type { AquariumMenuController } from "./aquarium-menu-controller";
import type { AquariumPrizeController } from "./aquarium-prize-controller";
import type { AquariumDailyGoalsController } from "./aquarium-daily-goals-controller";

type AquariumMinigameAdapterScene = Phaser.Scene & {
  reefDropPauseToken: number;
  bubblePopPauseToken: number;
  activeFish: () => Fish[];
  aquariumMenuController: () => AquariumMenuController;
  prizeController: () => AquariumPrizeController;
  aquariumDailyGoalsController: () => AquariumDailyGoalsController;
};

export function createAquariumMinigameHost(scene: AquariumSceneCore): AquariumMinigameControllerHost {
  const aquariumScene = scene as unknown as AquariumMinigameAdapterScene;
  return {
    scene: aquariumScene,
    activeFish: () => aquariumScene.activeFish(),
    aquariumMenuController: () => aquariumScene.aquariumMenuController(),
    prizeController: () => aquariumScene.prizeController(),
    aquariumDailyGoalsController: () => aquariumScene.aquariumDailyGoalsController(),
    getReefDropPauseToken: () => aquariumScene.reefDropPauseToken,
    setReefDropPauseToken: (value) => {
      aquariumScene.reefDropPauseToken = value;
    },
    getBubblePopPauseToken: () => aquariumScene.bubblePopPauseToken,
    setBubblePopPauseToken: (value) => {
      aquariumScene.bubblePopPauseToken = value;
    }
  };
}
