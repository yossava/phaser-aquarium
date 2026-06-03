import type Phaser from "phaser";
import { formatNumber } from "../../game/economy";
import { Fish } from "../../objects/Fish";
import { BubblePopSceneKey, type BubblePopResult } from "../BubblePopScene";
import { ReefDropSceneKey, type ReefDropResult } from "../ReefDropScene";
import type { PrizeMachineBetAmount } from "../../game/prize-machine";
import type { FishType, Rarity } from "../../types/mechanics";
import type { AquariumMenuController } from "./aquarium-menu-controller";
import type { AquariumPrizeController } from "./aquarium-prize-controller";
import type { AquariumDailyGoalsController } from "./aquarium-daily-goals-controller";

export type AquariumMinigameControllerHost = {
  scene: Phaser.Scene;
  activeFish: () => Fish[];
  aquariumMenuController: () => AquariumMenuController;
  prizeController: () => AquariumPrizeController;
  aquariumDailyGoalsController: () => AquariumDailyGoalsController;
  getReefDropPauseToken: () => number;
  setReefDropPauseToken: (value: number) => void;
  getBubblePopPauseToken: () => number;
  setBubblePopPauseToken: (value: number) => void;
};

export class AquariumMinigameController {
  public constructor(private readonly host: AquariumMinigameControllerHost) {}

  public openPrizeMachineArcade(): void {
    this.host.aquariumMenuController().openPrizeMachineArcade();
  }

  public openReefDropGame(): void {
    this.host.aquariumMenuController().openReefDropGame();
  }

  public openBubblePopGame(): void {
    this.host.aquariumMenuController().openBubblePopGame();
  }

  public completeBubblePopGame(result: BubblePopResult): void {
    this.host.aquariumMenuController().completeBubblePopGame(result);
  }

  public completeReefDropGame(result: ReefDropResult): void {
    this.host.aquariumMenuController().completeReefDropGame(result);
  }

  public activeFishProductionPerMinute(): number {
    return this.host.activeFish().reduce((total, fish) => {
      if (fish.state === "ill" || fish.currentFullnessCalories() <= 0) {
        return total;
      }
      return total + fish.projectedProductionPerMinute();
    }, 0);
  }

  public gameTimeLabel(): string {
    const secondsPerGameHour = 5;
    const hoursPerGameDay = 24;
    const daysPerGameYear = 360;
    const totalGameHours = Math.max(0, Math.floor(this.currentGameTimeSeconds() / secondsPerGameHour));
    const totalGameDays = Math.floor(totalGameHours / hoursPerGameDay);
    const years = Math.floor(totalGameDays / daysPerGameYear);
    const days = totalGameDays % daysPerGameYear;
    if (years <= 0) {
      return `${formatNumber(days)} ${days === 1 ? "day" : "days"}`;
    }
    return `${formatNumber(years)} ${years === 1 ? "year" : "years"} ${formatNumber(days)} ${days === 1 ? "day" : "days"}`;
  }

  public currentGameTimeSeconds(): number {
    const activeAges = this.host.activeFish().map((fish) => fish.ageSeconds);
    return Math.max(0, ...activeAges);
  }

  public returnFromReefDropGame(): void {
    this.host.aquariumMenuController().returnFromReefDropGame();
  }

  public returnFromBubblePopGame(): void {
    this.host.aquariumMenuController().returnFromBubblePopGame();
  }

  public hideReefDropSceneImmediately(): void {
    let reefDropScene: Phaser.Scene;
    try {
      reefDropScene = this.host.scene.scene.get(ReefDropSceneKey);
    } catch {
      return;
    }
    if (!reefDropScene) {
      return;
    }
    reefDropScene.input.enabled = false;
    reefDropScene.tweens.killAll();
    reefDropScene.time.removeAllEvents();
    [...reefDropScene.children.getChildren()].forEach((child) => {
      (child as Phaser.GameObjects.GameObject & { setVisible?: (value: boolean) => unknown }).setVisible?.(false);
      child.destroy();
    });
    reefDropScene.children.removeAll(true);
    reefDropScene.cameras.cameras.forEach((camera) => {
      camera.visible = false;
    });
    reefDropScene.sys.setVisible(false);
    reefDropScene.sys.setActive(false);
  }

  public removeReefDropScene(): void {
    this.host.setReefDropPauseToken(this.host.getReefDropPauseToken() + 1);
    let reefDropScene: Phaser.Scene;
    try {
      reefDropScene = this.host.scene.scene.get(ReefDropSceneKey);
    } catch {
      return;
    }
    if (!reefDropScene) {
      return;
    }
    this.hideReefDropSceneImmediately();
    this.host.scene.scene.setVisible(false, ReefDropSceneKey);
    this.host.scene.scene.setActive(false, ReefDropSceneKey);
    this.host.scene.scene.sleep(ReefDropSceneKey);
    this.host.scene.scene.stop(ReefDropSceneKey);
    this.host.scene.scene.remove(ReefDropSceneKey);
  }

  public hideBubblePopSceneImmediately(): void {
    let bubblePopScene: Phaser.Scene;
    try {
      bubblePopScene = this.host.scene.scene.get(BubblePopSceneKey);
    } catch {
      return;
    }
    if (!bubblePopScene) {
      return;
    }
    bubblePopScene.input.enabled = false;
    bubblePopScene.tweens.killAll();
    bubblePopScene.time.removeAllEvents();
    [...bubblePopScene.children.getChildren()].forEach((child) => {
      (child as Phaser.GameObjects.GameObject & { setVisible?: (value: boolean) => unknown }).setVisible?.(false);
      child.destroy();
    });
    bubblePopScene.children.removeAll(true);
    bubblePopScene.cameras.cameras.forEach((camera) => {
      camera.visible = false;
    });
    bubblePopScene.sys.setVisible(false);
    bubblePopScene.sys.setActive(false);
  }

  public removeBubblePopScene(): void {
    this.host.setBubblePopPauseToken(this.host.getBubblePopPauseToken() + 1);
    let bubblePopScene: Phaser.Scene;
    try {
      bubblePopScene = this.host.scene.scene.get(BubblePopSceneKey);
    } catch {
      return;
    }
    if (!bubblePopScene) {
      return;
    }
    this.hideBubblePopSceneImmediately();
    this.host.scene.scene.setVisible(false, BubblePopSceneKey);
    this.host.scene.scene.setActive(false, BubblePopSceneKey);
    this.host.scene.scene.sleep(BubblePopSceneKey);
    this.host.scene.scene.stop(BubblePopSceneKey);
    this.host.scene.scene.remove(BubblePopSceneKey);
  }

  public showPrizeMachineSpinner(): void {
    this.host.prizeController().showPrizeMachineSpinner();
  }

  public selectPrizeMachineBet(betAmount: PrizeMachineBetAmount): void {
    this.host.prizeController().selectPrizeMachineBet(betAmount);
  }

  public showPrizeBetModal(): void {
    this.host.prizeController().showPrizeBetModal();
  }

  public handleNativePrizePointer(designX: number, designY: number): boolean {
    return this.host.prizeController().handleNativePrizePointer(designX, designY);
  }

  public currentPrizeMachineConfig() {
    return this.host.prizeController().currentPrizeMachineConfig();
  }

  public currentPrizeBetAmounts(): PrizeMachineBetAmount[] {
    return this.host.prizeController().currentPrizeBetAmounts();
  }

  public currentPrizeBetAmount(betAmounts = this.currentPrizeBetAmounts()): PrizeMachineBetAmount {
    return this.host.prizeController().currentPrizeBetAmount(betAmounts);
  }

  public syncCurrentPrizeBetAmount(betAmounts = this.currentPrizeBetAmounts()): PrizeMachineBetAmount {
    return this.host.prizeController().syncCurrentPrizeBetAmount(betAmounts);
  }

  public spinPrizeMachine(): void {
    this.host.prizeController().spinPrizeMachine();
  }

  public createPrizeWheelPlanner() {
    return this.host.prizeController().createPrizeWheelPlanner();
  }

  public createPrizeWheelSegments() {
    return this.host.prizeController().createPrizeWheelSegments();
  }

  public ensurePrizeWheelFishTexturesLoaded(): void {
    this.host.prizeController().ensurePrizeWheelFishTexturesLoaded();
  }

  public destroyPrizeSpinContainer(): void {
    this.host.prizeController().destroyPrizeSpinContainer();
  }

  public nextPrizeRareFish(): FishType {
    return this.host.prizeController().nextPrizeRareFish();
  }

  public nextPrizeFish(rarity: Rarity): FishType {
    return this.host.prizeController().nextPrizeFish(rarity);
  }

  public rewardedAdFishReward(): FishType {
    return this.host.aquariumDailyGoalsController().rewardedAdFishReward();
  }
}
