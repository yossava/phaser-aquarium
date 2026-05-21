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
  return [
    { id: "phase-1-buy-fish", label: "Buy a fish", complete: input.fishPurchaseCount() > 0, reward: input.questReward },
    { id: "phase-1-buy-food", label: "Buy food", complete: actionCount("buy-food") > 0, reward: input.questReward },
    { id: "phase-1-feed-fish", label: "Feed a fish", complete: actionCount("feed") > 0, reward: input.questReward },
    { id: "phase-1-tap-coin", label: "Tap a coin", complete: actionCount("coin") > 0, reward: input.questReward },
    { id: "phase-1-combo", label: "Make a 2x combo", complete: actionCount("coin-combo-2") > 0, reward: input.fishQuestReward },
    { id: "phase-1-buy-another-fish", label: "Buy another fish", complete: input.fishPurchaseCount() > 1, reward: input.questReward }
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
    activeQuestIds: quests.filter((quest) => !goals.claimed.includes(quest.id)).slice(0, limit).map((quest) => quest.id)
  };
}

export function visibleDailyQuestItems(goals: DailyGoalsState, quests: DailyQuestItem[], limit = 3): DailyQuestItem[] {
  return quests.filter((quest) => !goals.claimed.includes(quest.id)).slice(0, limit);
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
