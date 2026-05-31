import Phaser from "phaser";
import { fishTypes } from "../../data/content";
import { earn, formatNumber } from "../../game/economy";
import { foodAssetPath } from "../../data/content";
import {
  buildDailyQuestItems,
  coinQuestReward,
  dailyQuestActionCount,
  ensureActiveDailyQuestItems,
  formatDailyQuestReward,
  fishPurchaseWindowMs,
  growthTonicPurchaseWindowMs,
  isQuestComplete,
  isRewardedAdReady,
  normalizeDailyGoals,
  oldestRecentFishPurchase,
  oldestRecentGrowthTonicPurchase,
  oldestRecentProductionBoostPurchase,
  oldestRecentTimeCurrentPurchase,
  productionBoostPurchaseWindowMs,
  rareQuestReward,
  recentFishPurchaseCount,
  recentGrowthTonicPurchaseCount,
  recentProductionBoostPurchaseCount,
  recentTimeCurrentPurchaseCount,
  recordDailyQuestAction,
  recordFishPurchase,
  recordGrowthTonicPurchase,
  recordProductionBoostPurchase,
  recordTimeCurrentPurchase,
  rewardedAdCooldownMs,
  rewardedAdDurationMs,
  rewardedAdCoinReward as questRewardedAdCoinReward,
  rewardedAdRemainingSeconds,
  superRareQuestReward as questSuperRareReward,
  timeCurrentPurchaseWindowMs,
  todayFishPurchaseCount,
  visibleDailyQuestItems,
  type DailyGoalsState,
  type DailyQuestItem,
  type DailyQuestReward,
  type RewardedAdKind,
  type RewardedAdOption,
  type RewardedAdState
} from "../../game/quest-system";
import {
  buildRewardedAdRewardSet,
  rewardedAdOptionsForRewards,
  selectRewardedAdFishReward,
  selectRewardedAdFoodReward,
  selectRewardedAdHelperReward
} from "../../game/rewarded-ad-rewards";
import {
  tankUtilityInfo as tankUtilityInfoModel,
  type TankUtilityId
} from "../../game/dispenser-system";
import { ageBoostFoodTypeId } from "../../game/food-system";
import type { FishType, FoodType, HelperCreatureType, Price, Wallet } from "../../types/mechanics";
import { appendGoalsPageContent } from "../../ui/GoalsPage";
import { createRewardedAdModalView, syncRewardedAdModalView } from "../../ui/RewardedAdFlow";
import type { PageButtonFactory } from "../../ui/PageOverlay";
import type { QuestPresentDrop } from "../../objects/QuestPresentDrop";
import type { Fish } from "../../objects/Fish";
import { autoFoodBuyerDurationMs, coinMagnetDurationMs, coinAssetPathByType, prizeHighlightSoundKey, type AppScreen } from "./aquarium-scene-config";

export type AquariumDailyGoalsControllerHost = {
  scene: Phaser.Scene;
  getDailyGoals: () => DailyGoalsState;
  setDailyGoals: (goals: DailyGoalsState) => void;
  getRewardedAd: () => RewardedAdState | undefined;
  setRewardedAd: (ad: RewardedAdState | undefined) => void;
  getRewardedAdRefreshTimer: () => Phaser.Time.TimerEvent | undefined;
  setRewardedAdRefreshTimer: (timer: Phaser.Time.TimerEvent | undefined) => void;
  getRewardedAdCountdownText: () => HTMLSpanElement | undefined;
  setRewardedAdCountdownText: (el: HTMLSpanElement | undefined) => void;
  getRewardedAdModalButton: () => HTMLButtonElement | undefined;
  setRewardedAdModalButton: (el: HTMLButtonElement | undefined) => void;
  getQuestPresents: () => Array<{ drop: QuestPresentDrop; reward: DailyQuestReward }>;
  getActiveScreen: () => AppScreen;
  getWallet: () => Wallet;
  activeFish: () => Fish[];
  ownedFishTypeIds: () => Set<string>;
  ownedHelperCreatureTypeIds: () => Set<string>;
  tankDisplayLevel: () => number;
  calculateTotalWealth: () => number;
  totalStoredFishCount: () => number;
  totalFeedableFoodInventory: () => number;
  getFoodInventory: (foodTypeId: string) => number;
  foodInventory: Map<string, number>;
  foodTypeById: (foodTypeId: string) => FoodType | undefined;
  isCalorieTrackedFood: (foodTypeId: string) => boolean;
  isDroppableFood: (foodTypeId: string) => boolean;
  getDecorationInventory: (key: string) => number;
  setDecorationInventory: (key: string, count: number) => void;
  setRecentInventoryDockItemKey: (key: string) => void;
  selectFood: (foodTypeId: string) => void;
  coinMagnetExpiresAt: () => number;
  autoFoodBuyerExpiresAt: () => number;
  setCoinMagnetWasActive: (value: boolean) => void;
  setAutoFoodBuyerWasActive: (value: boolean) => void;
  oldestActiveFish: () => Fish | undefined;
  setCareFoodTargetFish: (foodTypeId: string, fish: Fish | undefined) => void;
  phaseOneComplete: () => boolean;
  phaseTwoStarted: () => boolean;
  phaseTwoComplete: () => boolean;
  phaseThreeStarted: () => boolean;
  phaseThreeCleanQuestActive: () => boolean;
  activeFishCount: () => number;
  sickFishCount: () => number;
  coinDropCount: () => number;
  ownsNewBackground: () => boolean;
  ownsNewSeabed: () => boolean;
  ownsPhaseTwoDecoration: () => boolean;
  floatText: (message: string, x: number, y: number, color: string) => void;
  playSfx: (soundKey: string, options?: { volume?: number }) => void;
  closeModal: (skipAnimation?: boolean) => void;
  refreshUi: (renderControls?: boolean) => void;
  createFoodDock: () => void;
  saveNow: () => void;
  attachTouchFeedback: (button: HTMLButtonElement) => void;
  htmlButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;
  createQuestPresentDrop: (questId: string, reward: DailyQuestReward, label: string) => void;
  showPrizeCelebration: (title: string, imageUrl: string, detail: string, buttonLabel?: string, onClose?: () => void) => void;
  tankUtilityIconPath: (utilityId: TankUtilityId) => string;
  addFishToInventory: (fishType: FishType, quantity?: number) => void;
  recordDailyQuestAction: (action: string) => void;
};

export class AquariumDailyGoalsController {
  public constructor(private readonly host: AquariumDailyGoalsControllerHost) {}

  public appendGoalsPage(content: HTMLElement): void {
    appendGoalsPageContent({
      content,
      goals: this.questPageItems(),
      claimedGoalIds: this.host.getDailyGoals().claimed,
      foodNameForId: (foodTypeId: string) => this.host.foodTypeById(foodTypeId)?.name ?? "Reward",
      fishNameForId: (fishTypeId: string) => fishTypes.find((fishType) => fishType.id === fishTypeId)?.name ?? "Fish",
      rewardedAdOptions: this.rewardedAdOptions(),
      rewardedAd: this.host.getRewardedAd(),
      createButton: (label, className, onClick, disabled = false) => this.host.htmlButton(label, className, onClick, disabled),
      claimDailyGoal: (goalId, complete) => this.claimDailyGoal(goalId, complete),
      claimAllDailyGoals: () => this.claimAllDailyGoals(),
      startRewardedAd: (kind) => this.startRewardedAd(kind),
      claimRewardedAd: (kind) => this.claimRewardedAd(kind)
    });
  }

  public questPageItems(): DailyQuestItem[] {
    const goals = this.normalizeGoals();
    const quests = this.dailyQuestItems();
    const previousActiveIds = goals.activeQuestIds?.join("|") ?? "";
    const nextGoals = ensureActiveDailyQuestItems(goals, quests);
    this.host.setDailyGoals(nextGoals);
    if (previousActiveIds !== (nextGoals.activeQuestIds?.join("|") ?? "")) {
      this.host.saveNow();
    }
    return quests;
  }

  public visibleDailyQuestItems(): DailyQuestItem[] {
    let quests = this.dailyQuestItems();
    const goals = this.normalizeGoals();
    const readyQuests = quests.filter((quest) => quest.complete && !goals.claimed.includes(quest.id));
    if (readyQuests.length > 0) {
      readyQuests.forEach((quest) => this.dropDailyQuestPresent(quest, false));
      quests = this.dailyQuestItems();
    }
    const previousActiveIds = goals.activeQuestIds?.join("|") ?? "";
    const nextGoals = ensureActiveDailyQuestItems(goals, quests);
    this.host.setDailyGoals(nextGoals);
    const nextActiveIds = nextGoals.activeQuestIds?.join("|") ?? "";
    if (readyQuests.length > 0 || previousActiveIds !== nextActiveIds) {
      this.host.saveNow();
    }
    return visibleDailyQuestItems(nextGoals, quests);
  }

  public currentProductionMinuteQuestReward(): Price {
    return { coinType: "common", amount: Math.max(0, Math.round(this.host.activeFish().reduce((total, fish) => total + fish.mealCaloriesNeeded(), 0) * 1000) / 1000) };
  }

  public fishQuestReward(): DailyQuestReward {
    return { kind: "fish", fishTypeId: this.rewardedAdFishReward().id, quantity: 1 };
  }

  public rareQuestReward(): Price {
    return rareQuestReward(this.host.getWallet());
  }

  public superRareQuestReward(): Price {
    return questSuperRareReward(this.host.getWallet());
  }

  public rewardedAdCoinReward(coinType: "common" | "rare" | "superRare"): Price {
    return questRewardedAdCoinReward(coinType, this.host.tankDisplayLevel(), this.host.getWallet(), this.host.calculateTotalWealth());
  }

  public rewardedAdFoodReward(): FoodType {
    return selectRewardedAdFoodReward({
      mealCaloriesNeeded: this.host.activeFish().map((fish) => fish.mealCaloriesNeeded()),
      isCalorieTrackedFood: (foodTypeId) => this.host.isCalorieTrackedFood(foodTypeId),
      isDroppableFood: (foodTypeId) => this.host.isDroppableFood(foodTypeId)
    });
  }

  public rewardedAdFishReward(): FishType {
    return selectRewardedAdFishReward({
      ownedFishTypeIds: this.host.ownedFishTypeIds(),
      tankLevel: this.host.tankDisplayLevel()
    });
  }

  public rewardedAdHelperReward(): HelperCreatureType {
    return selectRewardedAdHelperReward({
      ownedHelperCreatureTypeIds: this.host.ownedHelperCreatureTypeIds()
    });
  }

  public rewardedAdRewards() {
    return buildRewardedAdRewardSet({
      commonReward: this.rewardedAdCoinReward("common"),
      mealCaloriesNeeded: this.host.activeFish().map((fish) => fish.mealCaloriesNeeded()),
      ownedFishTypeIds: this.host.ownedFishTypeIds(),
      ownedHelperCreatureTypeIds: this.host.ownedHelperCreatureTypeIds(),
      tankLevel: this.host.tankDisplayLevel(),
      isCalorieTrackedFood: (foodTypeId) => this.host.isCalorieTrackedFood(foodTypeId),
      isDroppableFood: (foodTypeId) => this.host.isDroppableFood(foodTypeId)
    });
  }

  public rewardedAdOptions(): RewardedAdOption[] {
    this.clearExpiredRewardedAdCooldown();
    return rewardedAdOptionsForRewards({
      rewards: this.rewardedAdRewards(),
      commonCoinIcon: coinAssetPathByType.common
    });
  }

  public clearExpiredRewardedAdCooldown(): void {
    const ad = this.host.getRewardedAd();
    if (ad?.cooldown === true && isRewardedAdReady(ad)) {
      this.host.setRewardedAd(undefined);
    }
  }

  public startRewardedAd(kind: RewardedAdKind): void {
    this.clearExpiredRewardedAdCooldown();
    const current = this.host.getRewardedAd();
    if (current) {
      if (current.cooldown === true) {
        const remainingSeconds = rewardedAdRemainingSeconds(current);
        this.host.floatText(`Ad cooldown ${formatNumber(remainingSeconds)}s`, 420, 120, "#d7f4ff");
      }
      return;
    }
    this.host.setRewardedAd({ kind, readyAt: Date.now() + rewardedAdDurationMs });
    this.recordDailyQuestAction("watch-ad");
    this.ensureRewardedAdRefreshTimer();
    this.showRewardedAdModal(kind);
  }

  public ensureRewardedAdRefreshTimer(): void {
    if (this.host.getRewardedAdRefreshTimer()) {
      return;
    }
    const timer = this.host.scene.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (!this.host.getRewardedAd()) {
          this.host.getRewardedAdRefreshTimer()?.remove(false);
          this.host.setRewardedAdRefreshTimer(undefined);
          return;
        }
        this.updateRewardedAdModal();
        if (this.host.getActiveScreen() === "goals") {
          this.host.refreshUi(false);
        }
        const ad = this.host.getRewardedAd();
        if (ad && isRewardedAdReady(ad) && ad.cooldown === true) {
          this.host.setRewardedAd(undefined);
          if (this.host.getActiveScreen() === "goals") {
            this.host.refreshUi(false);
          }
          this.host.getRewardedAdRefreshTimer()?.remove(false);
          this.host.setRewardedAdRefreshTimer(undefined);
        }
      }
    });
    this.host.setRewardedAdRefreshTimer(timer);
  }

  public showRewardedAdModal(kind: RewardedAdKind): void {
    const option = this.rewardedAdOptions().find((item) => item.kind === kind);
    this.host.closeModal();
    const modal = createRewardedAdModalView({
      option,
      onClaim: () => this.claimRewardedAd(kind),
      attachTouchFeedback: (button) => this.host.attachTouchFeedback(button)
    });
    this.host.setRewardedAdCountdownText(modal.countdownText);
    this.host.setRewardedAdModalButton(modal.claimButton);
    document.body.appendChild(modal.shell);
  }

  public updateRewardedAdModal(): void {
    syncRewardedAdModalView({
      ad: this.host.getRewardedAd(),
      countdownText: this.host.getRewardedAdCountdownText(),
      claimButton: this.host.getRewardedAdModalButton()
    });
  }

  public claimRewardedAd(kind: RewardedAdKind): void {
    const ad = this.host.getRewardedAd();
    if (!ad || ad.kind !== kind || ad.cooldown === true || !isRewardedAdReady(ad)) {
      return;
    }

    if (kind === "common") {
      const reward = this.rewardedAdCoinReward(kind);
      earn(this.host.getWallet(), reward.coinType, reward.amount);
      this.host.floatText(`+${formatNumber(reward.amount)} ad`, 420, 120, "#ffe67a");
    } else if (kind === "food") {
      const foodType = this.rewardedAdFoodReward();
      const inventoryAmount = this.host.isCalorieTrackedFood(foodType.id) ? foodType.calories : 1;
      this.host.foodInventory.set(foodType.id, this.host.getFoodInventory(foodType.id) + inventoryAmount);
      this.host.setRecentInventoryDockItemKey(`food:${foodType.id}`);
      if (this.host.isDroppableFood(foodType.id)) {
        this.host.selectFood(foodType.id);
      }
      this.host.floatText(`+${foodType.name}`, 420, 120, "#ffe67a");
    } else if (kind === "fish") {
      const fishType = this.rewardedAdFishReward();
      this.host.addFishToInventory(fishType);
      this.host.floatText(`${fishType.name} in inventory`, 420, 120, "#a8ffb0");
    } else {
      const creatureType = this.rewardedAdHelperReward();
      this.host.floatText(`+${creatureType.name}`, 420, 120, "#a8ffb0");
    }

    this.recordDailyQuestAction("claim-ad");
    this.recordDailyQuestAction(kind === "common" ? "claim-coin-ad" : `claim-${kind}-ad`);
    this.host.setRewardedAd({ kind, readyAt: Date.now() + rewardedAdCooldownMs, cooldown: true });
    this.ensureRewardedAdRefreshTimer();
    this.host.closeModal();
    this.host.refreshUi();
    this.host.createFoodDock();
    this.host.saveNow();
  }

  public dailyQuestActionCount(action: string): number {
    return dailyQuestActionCount(this.normalizeGoals(), action);
  }

  public todayFishPurchaseCount(coinType?: "common" | "rare" | "superRare"): number {
    return todayFishPurchaseCount(this.normalizeGoals(), coinType);
  }

  public recentFishPurchaseCount(coinType?: "common" | "rare" | "superRare", now = Date.now()): number {
    return recentFishPurchaseCount(this.normalizeGoals(), coinType, now);
  }

  public hourlyFishPurchaseLimit(): number {
    const level = this.host.tankDisplayLevel();
    if (level <= 1) return 5;
    if (level <= 2) return 4;
    if (level <= 4) return 6;
    return 9999;
  }

  public canBuyAnotherFishThisHour(): boolean {
    return this.recentFishPurchaseCount() < this.hourlyFishPurchaseLimit();
  }

  public fishPurchaseRestockLabel(now = Date.now()): string {
    const oldest = oldestRecentFishPurchase(this.normalizeGoals(), now);
    if (!oldest) return "Hourly Limit";
    const remainingSeconds = Math.ceil((oldest + fishPurchaseWindowMs - now) / 1000);
    return `Restock ${formatNumber(remainingSeconds)}`;
  }

  public recentGrowthTonicPurchaseCount(now = Date.now()): number {
    return recentGrowthTonicPurchaseCount(this.normalizeGoals(), now);
  }

  public canBuyGrowthTonicThisHour(): boolean {
    return this.recentGrowthTonicPurchaseCount() === 0;
  }

  public growthTonicPurchaseRestockLabel(now = Date.now()): string {
    const oldest = oldestRecentGrowthTonicPurchase(this.normalizeGoals(), now);
    if (!oldest) return "1 per hour";
    const remainingSeconds = Math.ceil((oldest + growthTonicPurchaseWindowMs - now) / 1000);
    return `Restock ${formatNumber(remainingSeconds)}`;
  }

  public recordGrowthTonicPurchase(): void {
    this.host.setDailyGoals(recordGrowthTonicPurchase(this.normalizeGoals()));
  }

  public recentProductionBoostPurchaseCount(now = Date.now()): number {
    return recentProductionBoostPurchaseCount(this.normalizeGoals(), now);
  }

  public canBuyProductionBoostNow(): boolean {
    return this.recentProductionBoostPurchaseCount() === 0;
  }

  public productionBoostPurchaseRestockLabel(now = Date.now()): string {
    const oldest = oldestRecentProductionBoostPurchase(this.normalizeGoals(), now);
    if (!oldest) return "30m restock";
    const remainingSeconds = Math.ceil((oldest + productionBoostPurchaseWindowMs - now) / 1000);
    return `Restock ${formatNumber(remainingSeconds)}`;
  }

  public recordProductionBoostPurchase(): void {
    this.host.setDailyGoals(recordProductionBoostPurchase(this.normalizeGoals()));
  }

  public recentTimeCurrentPurchaseCount(now = Date.now()): number {
    return recentTimeCurrentPurchaseCount(this.normalizeGoals(), now);
  }

  public canBuyTimeCurrentNow(): boolean {
    return this.recentTimeCurrentPurchaseCount() === 0;
  }

  public timeCurrentPurchaseRestockLabel(now = Date.now()): string {
    const oldest = oldestRecentTimeCurrentPurchase(this.normalizeGoals(), now);
    if (!oldest) return "1h restock";
    const remainingSeconds = Math.ceil((oldest + timeCurrentPurchaseWindowMs - now) / 1000);
    return `Restock ${formatNumber(remainingSeconds)}`;
  }

  public recordTimeCurrentPurchase(): void {
    this.host.setDailyGoals(recordTimeCurrentPurchase(this.normalizeGoals()));
  }

  public recordFishPurchase(fishType: FishType): void {
    this.host.setDailyGoals(recordFishPurchase(this.normalizeGoals(), fishType.rarity));
    this.autoDropCompletedDailyQuestPresents();
  }

  public recordDailyQuestAction(action: string): void {
    const goals = normalizeDailyGoals(this.normalizeGoals(), this.todayDateKey());
    this.host.setDailyGoals(recordDailyQuestAction(goals, action));
    if (action === "clean" && this.host.phaseThreeCleanQuestActive() && this.dailyQuestActionCount("phase-3-clean") <= 0) {
      this.host.setDailyGoals(recordDailyQuestAction(this.normalizeGoals(), "phase-3-clean"));
    }
    this.autoDropCompletedDailyQuestPresents();
  }

  public claimDailyGoal(id: string, complete: boolean): void {
    const goals = this.normalizeGoals();
    const quest = this.dailyQuestItems().find((item) => item.id === id);
    if (goals.claimed.includes(id)) {
      this.host.floatText("Already claimed", 420, 120, "#d7f4ff");
      return;
    }
    if (!complete) {
      this.host.floatText("Quest not done", 420, 120, "#ffb0a8");
      return;
    }
    if (!quest) {
      return;
    }
    this.dropDailyQuestPresent(quest);
  }

  public showQuestRewardModal(quest: DailyQuestItem): void {
    this.host.showPrizeCelebration(
      "Quest Reward!",
      this.questRewardImageUrl(quest.reward),
      this.dailyQuestRewardLabel(quest.reward),
      "Claim",
      () => this.finishClaimDailyGoal(quest)
    );
  }

  public finishClaimDailyGoal(quest: DailyQuestItem): void {
    if (!this.markDailyGoalClaimed(quest)) {
      return;
    }
    this.host.setDailyGoals(ensureActiveDailyQuestItems(this.normalizeGoals(), this.dailyQuestItems()));
    this.grantDailyQuestReward(quest.reward);
    this.host.floatText(`+${this.dailyQuestRewardLabel(quest.reward)} quest`, 420, 120, "#ffe67a");
    this.host.refreshUi();
    this.host.createFoodDock();
    this.host.saveNow();
  }

  public claimAllDailyGoals(): void {
    const goals = this.normalizeGoals();
    const readyQuests = this.dailyQuestItems().filter((quest) => quest.complete && !goals.claimed.includes(quest.id));
    if (readyQuests.length === 0) {
      this.host.floatText("No quests ready", 420, 120, "#d7f4ff");
      return;
    }
    readyQuests.forEach((quest) => this.dropDailyQuestPresent(quest, false));
    this.host.setDailyGoals(ensureActiveDailyQuestItems(this.normalizeGoals(), this.dailyQuestItems()));
    this.host.floatText(`${formatNumber(readyQuests.length)} prizes dropped`, 420, 120, "#ffe67a");
    this.host.refreshUi();
    this.host.saveNow();
  }

  public autoDropCompletedDailyQuestPresents(): void {
    const goals = this.normalizeGoals();
    const readyQuests = this.dailyQuestItems().filter((quest) => quest.complete && !goals.claimed.includes(quest.id));
    if (readyQuests.length === 0) {
      return;
    }
    readyQuests.forEach((quest) => this.dropDailyQuestPresent(quest, false));
    this.host.setDailyGoals(ensureActiveDailyQuestItems(this.normalizeGoals(), this.dailyQuestItems()));
    this.host.refreshUi(false);
    this.host.saveNow();
  }

  public dropDailyQuestPresent(quest: DailyQuestItem, notify = true): void {
    if (this.host.getQuestPresents().some((present) => present.drop.questId === quest.id)) {
      this.markDailyGoalClaimed(quest);
      return;
    }
    if (!this.markDailyGoalClaimed(quest)) {
      return;
    }
    const label = this.dailyQuestRewardLabel(quest.reward);
    this.host.createQuestPresentDrop(quest.id, quest.reward, label);
    this.host.playSfx(prizeHighlightSoundKey, { volume: 0.16 });
    if (notify) {
      this.host.floatText("Prize dropped in tank", 420, 120, "#ffe67a");
    }
    this.host.saveNow();
  }

  public markDailyGoalClaimed(quest: DailyQuestItem): boolean {
    const goals = this.normalizeGoals();
    if (goals.claimed.includes(quest.id)) {
      return false;
    }
    goals.claimed.push(quest.id);
    this.host.setDailyGoals(goals);
    return true;
  }

  public grantDailyQuestReward(reward: DailyQuestReward): void {
    if (reward.kind === "coins") {
      earn(this.host.getWallet(), reward.price.coinType, reward.price.amount);
      if (reward.price.rareAmount) {
        earn(this.host.getWallet(), "rare", reward.price.rareAmount);
      }
      if (reward.price.superRareAmount) {
        earn(this.host.getWallet(), "superRare", reward.price.superRareAmount);
      }
      return;
    }
    if (reward.kind === "fish") {
      const fishType = fishTypes.find((candidate) => candidate.id === reward.fishTypeId) ?? fishTypes[0];
      if (fishType) {
        this.host.addFishToInventory(fishType, Math.max(1, Math.floor(reward.quantity)));
      }
      return;
    }
    if (reward.kind === "utility") {
      const utility = tankUtilityInfoModel(reward.utilityId);
      if (!utility) {
        return;
      }
      const quantity = Math.max(1, Math.floor(reward.quantity));
      if (utility.id === "coin-magnet") {
        this.host.setDecorationInventory(utility.inventoryKey, Math.max(this.host.coinMagnetExpiresAt(), Date.now()) + coinMagnetDurationMs * quantity);
        this.host.setCoinMagnetWasActive(false);
      }
      if (utility.id === "auto-food-buyer") {
        this.host.setDecorationInventory(utility.inventoryKey, Math.max(this.host.autoFoodBuyerExpiresAt(), Date.now()) + autoFoodBuyerDurationMs * quantity);
        this.host.setAutoFoodBuyerWasActive(false);
      } else if (utility.id !== "coin-magnet") {
        this.host.setDecorationInventory(utility.inventoryKey, 1);
      }
      this.host.setRecentInventoryDockItemKey(`utility:${utility.id}`);
      return;
    }
    const quantity = Math.max(1, Math.floor(reward.quantity));
    this.host.foodInventory.set(reward.foodTypeId, this.host.getFoodInventory(reward.foodTypeId) + quantity);
    this.host.setRecentInventoryDockItemKey(`food:${reward.foodTypeId}`);
    if (reward.foodTypeId === ageBoostFoodTypeId && reward.assignTo === "oldest-active-fish") {
      const oldestFish = this.host.oldestActiveFish();
      if (oldestFish) {
        this.host.setCareFoodTargetFish(reward.foodTypeId, oldestFish);
      }
    }
    if (this.host.isDroppableFood(reward.foodTypeId)) {
      this.host.selectFood(reward.foodTypeId);
    }
  }

  public questRewardImageUrl(reward: DailyQuestReward): string {
    if (reward.kind === "coins") {
      return coinAssetPathByType[reward.price.coinType];
    }
    if (reward.kind === "fish") {
      return `/assets/fish/${reward.fishTypeId}.png`;
    }
    if (reward.kind === "utility") {
      return this.host.tankUtilityIconPath(reward.utilityId);
    }
    return foodAssetPath(reward.foodTypeId);
  }

  public dailyQuestRewardLabel(reward: DailyQuestReward): string {
    return formatDailyQuestReward(
      reward,
      (foodTypeId) => this.host.foodTypeById(foodTypeId)?.name ?? "Reward",
      (fishTypeId) => fishTypes.find((fishType) => fishType.id === fishTypeId)?.name ?? "Fish",
      (utilityId) => tankUtilityInfoModel(utilityId)?.name ?? "Tool"
    );
  }

  private dailyQuestItems(): DailyQuestItem[] {
    return buildDailyQuestItems({
      questReward: coinQuestReward(this.currentProductionMinuteQuestReward()),
      fishQuestReward: this.fishQuestReward(),
      actionCount: (action) => this.dailyQuestActionCount(action),
      fishPurchaseCount: (coinType) => this.todayFishPurchaseCount(coinType as "common" | "rare" | "superRare" | undefined),
      phaseOneComplete: () => this.host.phaseOneComplete(),
      phaseTwoStarted: () => this.host.phaseTwoStarted(),
      phaseTwoComplete: () => this.host.phaseTwoComplete(),
      phaseThreeStarted: () => this.host.phaseThreeStarted(),
      walletCommon: () => this.host.getWallet().common,
      activeFishCount: () => this.host.activeFishCount(),
      storedFishCount: () => this.host.totalStoredFishCount(),
      feedableFoodInventory: () => this.host.totalFeedableFoodInventory(),
      medicineInventory: () => this.host.getFoodInventory("medicine"),
      sickFishCount: () => this.host.sickFishCount(),
      coinDropCount: () => this.host.coinDropCount(),
      ownsNewBackground: () => this.host.ownsNewBackground(),
      ownsNewSeabed: () => this.host.ownsNewSeabed(),
      ownsPhaseTwoDecoration: () => this.host.ownsPhaseTwoDecoration()
    });
  }

  private normalizeGoals(): DailyGoalsState {
    return normalizeDailyGoals(this.host.getDailyGoals(), this.todayDateKey());
  }

  private todayDateKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
