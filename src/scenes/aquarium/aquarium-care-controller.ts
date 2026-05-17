import { formatNumber } from "../../game/economy";
import {
  calculateTankHappiness as calculateTankHappinessModel,
  isTankDirty as isTankDirtyModel,
  nextTankCleanliness,
  tankDirtRatePerSecond as tankDirtRatePerSecondModel,
  tankNeedIndicator as tankNeedIndicatorModel
} from "../../game/tank-care";
import type { PlacedDecoration } from "../../game/tank-entities";
import type { FishType } from "../../types/mechanics";
import { toastX, toastY } from "../../game/constants";
import { maxCoinDrops, type CompatibilitySummary } from "./aquarium-scene-config";
import type { AquariumSceneCore } from "./AquariumSceneCore";

type CareFish = {
  hunger: number;
  type: FishType;
};

type AquariumCareScene = {
  cleanliness: number;
  cleanedAt: number;
  cleaningTank: boolean;
  foods: unknown[];
  fish: CareFish[];
  coinDrops: unknown[];

  activeFish(): CareFish[];
  activeDecorations(): PlacedDecoration[];
  getTotalFoodInventory(): number;
  tankDisplayLevel(): number;
  fishProductionTotal(): number;
  shouldRunTankActivity(): boolean;
  updateDirtyTankOverlay(): void;
  syncCleanlinessUi(): void;
  refreshUi(renderControls?: boolean): void;
  saveNow(): void;
  floatText(message: string, x: number, y: number, color: string): void;
  recordDailyQuestAction(action: string): void;
};

export class AquariumCareController {
  public constructor(private readonly scene: AquariumCareScene) {}

  public getTankNeedIndicator(): string {
    return this.tankNeedIndicator(false);
  }

  public getCompactTankNeedIndicator(): string {
    return this.tankNeedIndicator(true);
  }

  public calculateTankHappiness(): number {
    return calculateTankHappinessModel({
      activeFishCount: this.scene.activeFish().length,
      activeDecorations: this.scene.activeDecorations(),
      cleanliness: this.scene.cleanliness
    });
  }

  public calculateCurrentCompatibility(): CompatibilitySummary {
    return this.calculateCompatibilityForTypes(this.scene.activeFish().map((currentFish) => currentFish.type));
  }

  public calculateCompatibilityForTypes(_types: FishType[], _candidate?: FishType): CompatibilitySummary {
    return { score: 100, level: "good", warnings: [], incompatibleNames: [] };
  }

  public updateTankCleanliness(deltaSeconds: number, activeFishCount = this.scene.activeFish().length): void {
    if (this.scene.cleaningTank) {
      const previousCleanliness = this.scene.cleanliness;
      this.scene.cleanliness = nextTankCleanliness({
        cleanliness: this.scene.cleanliness,
        deltaSeconds,
        cleaning: true,
        activeFishCount,
        looseFoodCount: this.scene.foods.length
      });
      if (Math.floor(previousCleanliness) !== Math.floor(this.scene.cleanliness)) {
        this.scene.syncCleanlinessUi();
      }
      if (this.scene.cleanliness >= 100) {
        this.scene.cleaningTank = false;
        this.scene.cleanedAt = Date.now();
        this.scene.updateDirtyTankOverlay();
        this.scene.floatText("Tank cleaned", toastX, toastY, "#a8ffb0");
        this.scene.syncCleanlinessUi();
        this.scene.saveNow();
      }
      return;
    }

    this.scene.cleanliness = nextTankCleanliness({
      cleanliness: this.scene.cleanliness,
      deltaSeconds,
      cleaning: false,
      activeFishCount,
      looseFoodCount: this.scene.foods.length
    });
  }

  public isTankDirty(): boolean {
    return isTankDirtyModel(this.scene.cleanliness);
  }

  public finishTankCleaning(): void {
    this.scene.cleanliness = 100;
    this.scene.cleaningTank = false;
    this.scene.cleanedAt = Date.now();
    this.scene.updateDirtyTankOverlay();
    this.scene.syncCleanlinessUi();
    this.scene.refreshUi(false);
    this.scene.saveNow();
  }

  public tankDirtRatePerSecond(activeFishCount: number): number {
    return tankDirtRatePerSecondModel({
      activeFishCount,
      looseFoodCount: this.scene.foods.length
    });
  }

  public cleanTank(): void {
    if (this.scene.cleanliness >= 100) {
      this.scene.cleaningTank = false;
      this.scene.floatText("Already clean", toastX, toastY, "#d7f4ff");
      this.scene.refreshUi(false);
      return;
    }

    if (this.scene.cleaningTank) {
      if (!this.scene.shouldRunTankActivity()) {
        this.finishTankCleaning();
        this.scene.floatText("Tank cleaned", toastX, toastY, "#a8ffb0");
        return;
      }
      this.scene.floatText("Cleaning...", toastX, toastY, "#d7f4ff");
      return;
    }

    this.scene.recordDailyQuestAction("clean");
    if (!this.scene.shouldRunTankActivity()) {
      this.finishTankCleaning();
      this.scene.floatText("Tank cleaned", toastX, toastY, "#a8ffb0");
      return;
    }

    this.scene.cleaningTank = true;
    this.scene.floatText("Cleaning...", toastX, toastY, "#a8ffb0");
    this.scene.refreshUi(false);
    this.scene.saveNow();
  }

  private tankNeedIndicator(compact: boolean): string {
    return tankNeedIndicatorModel({
      activeFishCount: this.scene.activeFish().length,
      totalFoodInventory: this.scene.getTotalFoodInventory(),
      hasHungryFish: this.scene.fish.some((currentFish) => currentFish.hunger >= 45),
      coinDropCount: this.scene.coinDrops.length,
      maxCoinDrops,
      displayLevel: this.scene.tankDisplayLevel(),
      productionTotal: this.scene.fishProductionTotal(),
      formatNumber,
      compact
    });
  }
}

export function createAquariumCareControllerAdapter(scene: AquariumSceneCore): AquariumCareController {
  return new AquariumCareController(scene as unknown as AquariumCareScene);
}
