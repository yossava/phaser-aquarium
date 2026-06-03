import { serverNow } from "../../services/server-time";
import { recordDailyQuestAction as recordDailyQuestActionModel } from "../../game/quest-system";
import { isQuestComplete } from "../../game/quest-system";
import type { DailyGoalsState, DailyQuestItem } from "../../game/quest-system";
import type { Fish } from "../../objects/Fish";
import type { DecorationType, Wallet } from "../../types/mechanics";
import type { TankCosmetic, DecorationSize } from "../../game/tank-catalog";
import type { TankCosmeticCategory } from "../../game/tank-state";

export type AquariumQuestPhaseControllerHost = {
  getDailyGoals: () => DailyGoalsState;
  setDailyGoals: (goals: DailyGoalsState) => void;
  getWallet: () => Wallet;
  activeFish: () => Fish[];
  tankCosmetics: (category: TankCosmeticCategory) => TankCosmetic[];
  tankCosmeticInventory: (category: TankCosmeticCategory, level?: number) => Map<string, number>;
  getDecorationInventory: (key: string) => number;
  setDecorationInventory: (key: string, count: number) => void;
  decorationInventoryKey: (typeId: string, size: DecorationSize) => string;
  defaultTankCosmeticId: (level: number) => string;
  getTankLevel: () => number;
  dailyQuestActionCount: (action: string) => number;
  dailyQuestItems: () => DailyQuestItem[];
  getCleanliness: () => number;
  setCleanliness: (value: number) => void;
  getCleanedAt: () => number;
  setCleanedAt: (value: number) => void;
  getTotalStoredFishCount: () => number;
  ownsTankCosmetic: (asset: TankCosmetic) => boolean;
  phaseTwoDecorationIdentifier: () => DecorationType | undefined;
  ownsPhaseTwoDecorationIdentifier: () => boolean;
  recordDailyQuestAction: (action: string) => void;
  normalizeDailyGoals: (goals: DailyGoalsState) => DailyGoalsState;
  getServerTime: () => number;
};

export class AquariumQuestPhaseController {
  public constructor(private readonly host: AquariumQuestPhaseControllerHost) {}

  public prepareQuestPhaseState(): void {
    if (this.phaseOneComplete() && !this.phaseTwoStarted()) {
      const targetFish = this.host.activeFish()[0];
      if (targetFish) {
        targetFish.state = "ill";
        targetFish.health = Math.min(targetFish.health, 24);
        targetFish.hunger = Math.max(targetFish.hunger, 92);
        targetFish.continuousHungrySeconds = Math.max(targetFish.continuousHungrySeconds, 10 * 60);
        this.grantPhaseTwoStarterItems();
        this.host.setDailyGoals(recordDailyQuestActionModel(this.host.getDailyGoals(), "phase-2-start"));
      }
    }

    if (this.phaseTwoComplete() && !this.phaseThreeStarted()) {
      this.host.setDailyGoals(recordDailyQuestActionModel(this.host.getDailyGoals(), "phase-3-start"));
    }

    if (
      this.phaseThreeStarted() &&
      this.host.dailyQuestActionCount("phase-3-five-fish-in-tank") <= 0 &&
      (this.host.activeFish().length >= 5 || this.host.getDailyGoals().claimed.includes("phase-3-five-fish-in-tank"))
    ) {
      this.host.setDailyGoals(recordDailyQuestActionModel(this.host.getDailyGoals(), "phase-3-five-fish-in-tank"));
    }

    if (
      this.phaseThreeStarted() &&
      this.host.dailyQuestActionCount("phase-3-reach-1k-coins") <= 0 &&
      (this.host.getWallet().common >= 1000 || this.host.getDailyGoals().claimed.includes("phase-3-reach-1k-coins"))
    ) {
      this.host.setDailyGoals(recordDailyQuestActionModel(this.host.getDailyGoals(), "phase-3-reach-1k-coins"));
    }

    if (
      this.phaseThreeStarted() &&
      this.host.dailyQuestActionCount("fuse-fish") <= 0 &&
      this.host.getDailyGoals().claimed.includes("phase-3-five-fish-in-tank") &&
      this.host.getDailyGoals().activeQuestIds?.includes("phase-3-fuse-fish") &&
      this.host.activeFish().length < 5 &&
      this.host.getTotalStoredFishCount() > 0
    ) {
      this.host.setDailyGoals(recordDailyQuestActionModel(this.host.getDailyGoals(), "fuse-fish"));
    }

    if (this.phaseThreeStarted() && this.host.dailyQuestActionCount("buy-dispenser") > 0 && this.host.dailyQuestActionCount("phase-3-dirty-tank") <= 0) {
      this.host.setCleanliness(Math.min(this.host.getCleanliness(), 35));
      this.host.setCleanedAt(this.host.getServerTime());
      this.host.setDailyGoals(recordDailyQuestActionModel(this.host.getDailyGoals(), "phase-3-dirty-tank"));
    }
  }

  public phaseOneComplete(): boolean {
    const requiredQuestIds = [
      "phase-1-buy-fish",
      "phase-1-buy-food",
      "phase-1-feed-fish",
      "phase-1-tap-coin",
      "phase-1-combo",
      "phase-1-buy-another-fish"
    ];
    return requiredQuestIds.every((questId) => this.host.getDailyGoals().claimed.includes(questId));
  }

  public phaseTwoStarted(): boolean {
    return this.host.dailyQuestActionCount("phase-2-start") > 0;
  }

  public phaseTwoComplete(): boolean {
    const requiredQuestIds = [
      "phase-2-buy-medicine",
      "phase-2-heal-fish",
      "phase-2-change-background",
      "phase-2-change-sand",
      "phase-2-place-decor"
    ];
    return requiredQuestIds.every((questId) => this.host.getDailyGoals().claimed.includes(questId));
  }

  public phaseThreeStarted(): boolean {
    return this.host.dailyQuestActionCount("phase-3-start") > 0;
  }

  public canSellFish(): boolean {
    return this.phaseThreeStarted();
  }

  public phaseThreeCleanQuestActive(): boolean {
    return this.phaseThreeStarted() &&
      this.host.dailyQuestActionCount("phase-3-dirty-tank") > 0 &&
      !this.host.getDailyGoals().claimed.includes("phase-3-clean-tank");
  }

  public sickFishCount(): number {
    return this.host.activeFish().filter((fish) => fish.state === "ill" || fish.health < 82).length;
  }

  public phaseTwoBackground(): TankCosmetic | undefined {
    return this.host.tankCosmetics("background").find((asset) => asset.id !== this.host.defaultTankCosmeticId(this.host.getTankLevel()));
  }

  public phaseTwoSeabed(): TankCosmetic | undefined {
    return this.host.tankCosmetics("seabed").find((asset) => asset.id !== this.host.defaultTankCosmeticId(this.host.getTankLevel()));
  }

  public phaseTwoDecoration(): DecorationType | undefined {
    return this.host.phaseTwoDecorationIdentifier();
  }

  public ownsPhaseTwoDecoration(): boolean {
    return this.host.ownsPhaseTwoDecorationIdentifier();
  }

  public ownsPhaseTwoBackground(): boolean {
    const asset = this.phaseTwoBackground();
    return Boolean(asset && this.host.ownsTankCosmetic(asset));
  }

  public ownsPhaseTwoSeabed(): boolean {
    const asset = this.phaseTwoSeabed();
    return Boolean(asset && this.host.ownsTankCosmetic(asset));
  }

  public grantPhaseTwoStarterItems(): void {
    const background = this.phaseTwoBackground();
    if (background) {
      this.host.tankCosmeticInventory("background").set(background.id, Math.max(1, this.host.tankCosmeticInventory("background").get(background.id) ?? 0));
    }

    const seabed = this.phaseTwoSeabed();
    if (seabed) {
      this.host.tankCosmeticInventory("seabed").set(seabed.id, Math.max(1, this.host.tankCosmeticInventory("seabed").get(seabed.id) ?? 0));
    }

    const decoration = this.phaseTwoDecoration();
    if (decoration) {
      const key = this.host.decorationInventoryKey(decoration.id, "m");
      this.host.setDecorationInventory(key, Math.max(1, this.host.getDecorationInventory(key) ?? 0));
    }
  }

  public dailyGoalUnclaimedCount(): number {
    return this.host.dailyQuestItems().filter((quest) => quest.complete && !this.host.getDailyGoals().claimed.includes(quest.id)).length;
  }

  public phaseOneShopLimitActive(): boolean {
    return this.host.dailyQuestItems().some((quest) => quest.id.startsWith("phase-1-") && !this.isDailyQuestComplete(quest));
  }

  public phaseTwoTankMenuLimitActive(): boolean {
    const cosmeticQuestIds = [
      "phase-2-change-background",
      "phase-2-change-sand",
      "phase-2-place-decor"
    ];
    return this.phaseTwoStarted() &&
      this.host.dailyQuestActionCount("medicine") > 0 &&
      this.host.dailyQuestItems().some((quest) => cosmeticQuestIds.includes(quest.id) && !this.isDailyQuestComplete(quest));
  }

  public isDailyQuestComplete(quest: DailyQuestItem): boolean {
    return isQuestComplete(this.host.getDailyGoals(), quest);
  }
}
