import Phaser from "phaser";
import { gameHeight, gameWidth } from "../game/constants";
import type { PrizeMachineBetAmount, PrizeMachineConfig } from "../game/prize-machine";
import {
  createPrizeMachineSpinner,
  playPrizeMachineSpin,
  type PrizeMachineSpinActions,
  type PrizeMachineSpinnerActions,
  type PrizeWheelHud,
  type PrizeWheelSegment
} from "../game/prize-machine-wheel";

export type PrizeMachinePointerAction = "close" | "spin" | "bet";

export function createPrizeMachineArcadeSpinner(input: {
  scene: Phaser.Scene;
  config: PrizeMachineConfig;
  segments: PrizeWheelSegment[];
  commonCoins: number;
  selectedBetAmount: PrizeMachineBetAmount;
  actions: PrizeMachineSpinnerActions;
}): Phaser.GameObjects.Container {
  return createPrizeMachineSpinner(
    input.scene,
    input.config,
    input.segments,
    prizeMachineHud(input.commonCoins, input.selectedBetAmount),
    input.actions
  );
}

export function playPrizeMachineArcadeSpin(input: {
  scene: Phaser.Scene;
  config: PrizeMachineConfig;
  segments: PrizeWheelSegment[];
  resultIndex: number;
  commonCoins: number;
  selectedBetAmount: PrizeMachineBetAmount;
  actions: PrizeMachineSpinActions;
}): Phaser.GameObjects.Container {
  return playPrizeMachineSpin(
    input.scene,
    input.config,
    input.segments,
    input.resultIndex,
    prizeMachineHud(input.commonCoins, input.selectedBetAmount),
    input.actions
  );
}

export function prizeMachinePointerActionAt(
  designX: number,
  designY: number,
  spinInProgress: boolean
): PrizeMachinePointerAction | undefined {
  if (spinInProgress) {
    return undefined;
  }

  if (new Phaser.Geom.Rectangle(gameWidth / 2 - 85, gameHeight - 95, 170, 46).contains(designX, designY)) {
    return "close";
  }
  if (new Phaser.Geom.Rectangle(gameWidth / 2 - 115, gameHeight - 158, 230, 52).contains(designX, designY)) {
    return "spin";
  }
  if (new Phaser.Geom.Rectangle(gameWidth / 2 - 78, gameHeight - 217, 156, 38).contains(designX, designY)) {
    return "bet";
  }
  return undefined;
}

function prizeMachineHud(commonCoins: number, selectedBetAmount: PrizeMachineBetAmount): PrizeWheelHud {
  return {
    commonCoins,
    selectedBetAmount
  };
}
