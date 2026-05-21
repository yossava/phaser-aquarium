import { tankUtilityInfo, type TankUtilityId } from "./dispenser-system";
import type { CoinType, FoodTypeId, Price, Rarity, Wallet } from "../types/mechanics";
import { formatNumber, formatPrice } from "./economy";

export type DailyQuestReward =
  | { kind: "coins"; price: Price }
  | { kind: "food"; foodTypeId: FoodTypeId; quantity: number; assignTo?: "oldest-active-fish" }
  | { kind: "fish"; fishTypeId: string; quantity: number }
  | { kind: "utility"; utilityId: TankUtilityId; quantity: number };

export type DailyQuestItem = {
  id: string;
  label: string;
  complete: boolean;
  reward: DailyQuestReward;
  priority?: number;
};

export type DailyGoalsState = {
  date: string;
  claimed: string[];
  activeQuestIds?: string[];
};

export type RewardedAdKind = "common" | "food" | "fish" | "helper";

export type RewardedAdState = {
  kind: RewardedAdKind;
  readyAt: number;
  cooldown?: boolean;
};

export type RewardedAdOption = {
  kind: RewardedAdKind;
  title: string;
  detail: string;
  icon: string;
};

export type RewardedAdCatalogInput = {
  common: { detail: string; icon: string };
  food: { detail: string; icon: string };
  fish: { detail: string; icon: string };
  helper: { detail: string; icon: string };
};

export type BuildDailyQuestItemsInput = {
  questReward: DailyQuestReward;
  fishQuestReward: DailyQuestReward;
  actionCount: (action: string) => number;
  fishPurchaseCount: (coinType?: CoinType) => number;
  phaseOneComplete: () => boolean;
  phaseTwoStarted: () => boolean;
  phaseTwoComplete: () => boolean;
  phaseThreeStarted: () => boolean;
  walletCommon: () => number;
  activeFishCount: () => number;
  storedFishCount: () => number;
  feedableFoodInventory: () => number;
  medicineInventory: () => number;
  sickFishCount: () => number;
  coinDropCount: () => number;
  ownsNewBackground: () => boolean;
  ownsNewSeabed: () => boolean;
  ownsPhaseTwoDecoration: () => boolean;
};

export const fishPurchaseWindowMs = 60 * 60 * 1000;
export const growthTonicPurchaseWindowMs = 60 * 60 * 1000;
export const productionBoostPurchaseWindowMs = 30 * 60 * 1000;
export const timeCurrentPurchaseWindowMs = 60 * 60 * 1000;
export const rewardedAdDurationMs = 30_000;
export const rewardedAdCooldownMs = 10 * 60 * 1000;

const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function timestampsForPrefix(goals: DailyGoalsState, prefix: string, timestampIndex: number, now: number, windowMs: number): number[] {
  return goals.claimed
    .filter((entry) => entry.startsWith(prefix))
    .map((entry) => Number(entry.split(":")[timestampIndex]))
    .filter((timestamp) => Number.isFinite(timestamp) && now - timestamp < windowMs)
    .sort((a, b) => a - b);
}

export function normalizeDailyGoals(savedGoals: DailyGoalsState | undefined, today: string): DailyGoalsState {
  if (!savedGoals) {
    return { date: today, claimed: [] };
  }

  return {
    date: typeof savedGoals.date === "string" ? savedGoals.date : today,
    claimed: [...new Set(savedGoals.claimed.filter((entry) => typeof entry === "string"))],
    activeQuestIds: Array.isArray(savedGoals.activeQuestIds)
      ? [...new Set(savedGoals.activeQuestIds.filter((entry) => typeof entry === "string"))]
      : undefined
  };
}

export function buildDailyQuestItems(input: BuildDailyQuestItemsInput): DailyQuestItem[] {
  const actionCount = input.actionCount;
  const firstFishBought = input.fishPurchaseCount() > 0;
  const movedFishToTank = actionCount("place-fish") > 0;
  const foodBought = actionCount("buy-food") > 0;
  const fishFed = actionCount("feed") > 0;
  const coinTapped = actionCount("coin") > 0;
  const comboMade = actionCount("coin-combo-2") > 0;
  const anotherFishBought = input.fishPurchaseCount() > 1;
  const phaseTwoStarted = input.phaseTwoStarted();
  const phaseTwoUnlocked = input.phaseOneComplete() || phaseTwoStarted;
  const phaseThreeStarted = input.phaseThreeStarted();
  const phaseThreeUnlocked = input.phaseTwoComplete() || phaseThreeStarted;
  const activeFishCount = input.activeFishCount();
  const storedFishCount = input.storedFishCount();
  const feedableFoodInventory = input.feedableFoodInventory();
  const medicineInventory = input.medicineInventory();
  const sickFishCount = input.sickFishCount();
  const coinDropCount = input.coinDropCount();
  const conditionalQuest = (condition: boolean, quest: DailyQuestItem): DailyQuestItem[] => condition || quest.complete ? [quest] : [];
  const moveFishToTankQuest = input.storedFishCount() > 0 || movedFishToTank
    ? [{ id: "phase-1-move-fish-to-tank", label: "Move a fish to the tank", complete: movedFishToTank, reward: input.questReward }]
    : [];
  const phaseOneQuests = [
    { id: "phase-1-buy-fish", label: "Buy a fish", complete: firstFishBought, reward: input.questReward },
    ...moveFishToTankQuest,
    ...conditionalQuest(activeFishCount > 0, { id: "phase-1-buy-food", label: "Buy food", complete: foodBought, reward: input.questReward }),
    ...conditionalQuest(activeFishCount > 0 && feedableFoodInventory > 0, { id: "phase-1-feed-fish", label: "Feed a fish", complete: fishFed, reward: input.questReward }),
    ...conditionalQuest(coinDropCount > 0, { id: "phase-1-tap-coin", label: "Tap a coin", complete: coinTapped, reward: input.questReward }),
    ...conditionalQuest(coinTapped, { id: "phase-1-combo", label: "Make a 2x combo", complete: comboMade, reward: input.fishQuestReward }),
    ...conditionalQuest(firstFishBought && (activeFishCount > 0 || storedFishCount > 0), { id: "phase-1-buy-another-fish", label: "Buy another fish", complete: anotherFishBought, reward: input.questReward })
  ];
  if (!phaseTwoUnlocked) {
    return phaseOneQuests;
  }

  const medicineBought = actionCount("buy-medicine") > 0;
  const fishHealed = actionCount("medicine") > 0;
  const backgroundChanged = actionCount("use-background") > 0;
  const seabedChanged = actionCount("use-seabed") > 0;
  const decorationPlaced = actionCount("place-decoration") > 0;
  const phaseTwoQuests = [
    ...phaseOneQuests,
    ...conditionalQuest(sickFishCount > 0, { id: "phase-2-buy-medicine", label: "Buy medicine", complete: medicineBought, reward: input.questReward }),
    ...conditionalQuest(sickFishCount > 0 && medicineInventory > 0, { id: "phase-2-heal-fish", label: "Heal a fish", complete: fishHealed, reward: input.questReward }),
    ...conditionalQuest(fishHealed && input.ownsNewBackground(), { id: "phase-2-change-background", label: "Change the background", complete: backgroundChanged, reward: input.questReward }),
    ...conditionalQuest(fishHealed && input.ownsNewSeabed(), { id: "phase-2-change-sand", label: "Change the sand", complete: seabedChanged, reward: input.questReward }),
    ...conditionalQuest(fishHealed && input.ownsPhaseTwoDecoration(), { id: "phase-2-place-decor", label: "Place decor", complete: decorationPlaced, reward: input.questReward })
  ];
  if (!phaseThreeUnlocked) {
    return phaseTwoQuests;
  }

  const spinnerPlayed = actionCount("prize-game") > 0;
  const fiveFishInTank = activeFishCount >= 5 || actionCount("phase-3-five-fish-in-tank") > 0;
  const fishFused = actionCount("fuse-fish") > 0;
  const combo30Made = actionCount("coin-combo-30") > 0;
  const reached1kCoins = input.walletCommon() >= 1000 || actionCount("phase-3-reach-1k-coins") > 0;
  const shrimpBought = actionCount("buy-helper-shrimp") > 0;
  const foodDispenserBought = actionCount("buy-dispenser") > 0;
  const tankDirtied = actionCount("phase-3-dirty-tank") > 0;
  const tankCleaned = actionCount("phase-3-clean") > 0;
  return [
    ...phaseTwoQuests,
    { id: "phase-3-play-spinner", label: "Play Games: Treasure Spinner", complete: spinnerPlayed, reward: input.questReward },
    ...conditionalQuest(spinnerPlayed, { id: "phase-3-five-fish-in-tank", label: "Have 5 fish in the tank", complete: fiveFishInTank, reward: input.questReward }),
    ...conditionalQuest(fiveFishInTank, { id: "phase-3-fuse-fish", label: "Fuse fish", complete: fishFused, reward: input.questReward }),
    ...conditionalQuest(fishFused, { id: "phase-3-coin-combo-30", label: "Make a 30x combo", complete: combo30Made, reward: input.questReward }),
    ...conditionalQuest(combo30Made, { id: "phase-3-buy-cleaner-shrimp", label: "Buy a cleaner shrimp", complete: shrimpBought, reward: input.questReward }),
    ...conditionalQuest(shrimpBought, { id: "phase-3-buy-food-dispenser", label: "Buy a food dispenser", complete: foodDispenserBought, reward: input.questReward }),
    ...conditionalQuest(foodDispenserBought || tankDirtied, { id: "phase-3-clean-tank", label: "Clean the tank", complete: tankCleaned, reward: input.questReward }),
    ...conditionalQuest(tankCleaned, { id: "phase-3-reach-1k-coins", label: "Reach 1k coins", complete: reached1kCoins, reward: input.questReward })
  ];
}

export function coinQuestReward(price: Price): DailyQuestReward {
  return { kind: "coins", price };
}

export function formatDailyQuestReward(
  reward: DailyQuestReward,
  foodNameForId: (foodTypeId: FoodTypeId) => string,
  fishNameForId: (fishTypeId: string) => string = () => "Fish",
  utilityNameForId: (utilityId: TankUtilityId) => string = (utilityId) => tankUtilityInfo(utilityId)?.name ?? "Tool"
): string {
  if (reward.kind === "coins") {
    return formatPrice(reward.price);
  }

  const quantity = Math.max(1, Math.floor(reward.quantity));
  if (reward.kind === "fish") {
    return `${fishNameForId(reward.fishTypeId)} x${formatNumber(quantity)}`;
  }

  if (reward.kind === "utility") {
    return `${utilityNameForId(reward.utilityId)} x${formatNumber(quantity)}`;
  }

  return `${foodNameForId(reward.foodTypeId)} x${formatNumber(quantity)}`;
}

export function ensureActiveDailyQuestItems(goals: DailyGoalsState, quests: DailyQuestItem[], limit = 3): DailyGoalsState {
  return {
    ...goals,
    activeQuestIds: quests.filter((quest) => !isQuestComplete(goals, quest)).slice(0, limit).map((quest) => quest.id)
  };
}

export function visibleDailyQuestItems(goals: DailyGoalsState, quests: DailyQuestItem[], limit = 3): DailyQuestItem[] {
  return quests.filter((quest) => !isQuestComplete(goals, quest)).slice(0, limit);
}

export function isQuestComplete(goals: DailyGoalsState, quest: DailyQuestItem): boolean {
  return quest.complete || goals.claimed.includes(quest.id);
}

export function commonQuestReward(tankWorth: number): Price {
  return { coinType: "common", amount: clamp(Math.round(Math.max(1, tankWorth) * 0.05), 1, Number.MAX_SAFE_INTEGER) };
}

export function rareQuestReward(wallet: Wallet): Price {
  return { coinType: "rare", amount: clamp(Math.round(Math.max(2, wallet.rare * 0.08)), 1, 25) };
}

export function superRareQuestReward(wallet: Wallet): Price {
  return { coinType: "superRare", amount: clamp(Math.round(Math.max(1, wallet.superRare * 0.08)), 1, 12) };
}

export function rewardedAdCoinReward(coinType: CoinType, level: number, wallet: Wallet, totalWealth: number): Price {
  if (coinType === "rare") {
    void level;
    void totalWealth;
    return { coinType: "rare", amount: clamp(Math.round(Math.max(1, wallet.rare * 0.02)), 1, 5) };
  }
  if (coinType === "superRare") {
    void level;
    void totalWealth;
    return { coinType: "superRare", amount: clamp(Math.round(Math.max(1, wallet.superRare * 0.02)), 1, 2) };
  }
  void level;
  void wallet;
  return { coinType: "common", amount: clamp(Math.round(Math.max(25, totalWealth * 0.012)), 25, 1000) };
}

export function rewardedAdOptions(input: RewardedAdCatalogInput): RewardedAdOption[] {
  return [
    { kind: "common", title: "Common Coins", detail: input.common.detail, icon: input.common.icon },
    { kind: "food", title: "Food Pack", detail: input.food.detail, icon: input.food.icon },
    { kind: "fish", title: "Fish", detail: input.fish.detail, icon: input.fish.icon },
    { kind: "helper", title: "Helper", detail: input.helper.detail, icon: input.helper.icon }
  ];
}

export function rewardedAdRemainingSeconds(ad: RewardedAdState, now = Date.now()): number {
  return Math.max(0, Math.ceil((ad.readyAt - now) / 1000));
}

export function isRewardedAdReady(ad: RewardedAdState, now = Date.now()): boolean {
  return now >= ad.readyAt;
}

export function dailyQuestActionCount(goals: DailyGoalsState, action: string): number {
  return goals.claimed.filter((entry) => entry.startsWith(`action:${action}:`)).length;
}

export function todayFishPurchaseCount(goals: DailyGoalsState, coinType?: CoinType): number {
  const prefix = coinType ? `fish-buy:${coinType}:` : "fish-buy:";
  return goals.claimed.filter((entry) => entry.startsWith(prefix)).length;
}

export function recentFishPurchaseCount(goals: DailyGoalsState, coinType?: CoinType, now = Date.now()): number {
  return timestampsForPrefix(goals, coinType ? `fish-buy:${coinType}:` : "fish-buy:", 2, now, fishPurchaseWindowMs).length;
}

export function oldestRecentFishPurchase(goals: DailyGoalsState, now = Date.now()): number | undefined {
  return timestampsForPrefix(goals, "fish-buy:", 2, now, fishPurchaseWindowMs)[0];
}

export function recentGrowthTonicPurchaseCount(goals: DailyGoalsState, now = Date.now()): number {
  return timestampsForPrefix(goals, "growth-tonic-buy:", 1, now, growthTonicPurchaseWindowMs).length;
}

export function oldestRecentGrowthTonicPurchase(goals: DailyGoalsState, now = Date.now()): number | undefined {
  return timestampsForPrefix(goals, "growth-tonic-buy:", 1, now, growthTonicPurchaseWindowMs)[0];
}

export function recordGrowthTonicPurchase(goals: DailyGoalsState, now = Date.now()): DailyGoalsState {
  return { ...goals, claimed: [...goals.claimed, `growth-tonic-buy:${now}:${randomId()}`] };
}

export function recentProductionBoostPurchaseCount(goals: DailyGoalsState, now = Date.now()): number {
  return timestampsForPrefix(goals, "production-boost-buy:", 1, now, productionBoostPurchaseWindowMs).length;
}

export function oldestRecentProductionBoostPurchase(goals: DailyGoalsState, now = Date.now()): number | undefined {
  return timestampsForPrefix(goals, "production-boost-buy:", 1, now, productionBoostPurchaseWindowMs)[0];
}

export function recordProductionBoostPurchase(goals: DailyGoalsState, now = Date.now()): DailyGoalsState {
  return { ...goals, claimed: [...goals.claimed, `production-boost-buy:${now}:${randomId()}`] };
}

export function recentTimeCurrentPurchaseCount(goals: DailyGoalsState, now = Date.now()): number {
  return timestampsForPrefix(goals, "time-current-buy:", 1, now, timeCurrentPurchaseWindowMs).length;
}

export function oldestRecentTimeCurrentPurchase(goals: DailyGoalsState, now = Date.now()): number | undefined {
  return timestampsForPrefix(goals, "time-current-buy:", 1, now, timeCurrentPurchaseWindowMs)[0];
}

export function recordTimeCurrentPurchase(goals: DailyGoalsState, now = Date.now()): DailyGoalsState {
  return { ...goals, claimed: [...goals.claimed, `time-current-buy:${now}:${randomId()}`] };
}

export function recordFishPurchase(goals: DailyGoalsState, rarity: Rarity, now = Date.now()): DailyGoalsState {
  return { ...goals, claimed: [...goals.claimed, `fish-buy:${rarity}:${now}:${randomId()}`] };
}

export function recordDailyQuestAction(goals: DailyGoalsState, action: string, now = Date.now()): DailyGoalsState {
  return { ...goals, claimed: [...goals.claimed, `action:${action}:${now}:${randomId()}`] };
}
