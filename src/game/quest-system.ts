import type { CoinType, Price, Rarity, Wallet } from "../types/mechanics";
import { formatNumber, formatPrice } from "./economy";

export type DailyQuestItem = {
  id: string;
  label: string;
  complete: boolean;
  reward: Price;
};

export type DailyGoalsState = {
  date: string;
  claimed: string[];
};

export type RewardedAdKind = "common" | "rare" | "superRare" | "ageBoost";

export type RewardedAdState = {
  kind: RewardedAdKind;
  readyAt: number;
};

export type RewardedAdOption = {
  kind: RewardedAdKind;
  title: string;
  detail: string;
  icon: string;
};

export type BuildDailyQuestItemsInput = {
  affordableCommonFish: boolean;
  nextTankName?: string;
  nextTankPrice?: Price;
  maxOwnedTanksReached: boolean;
  activeFishCount: number;
  activeDecorationCount: number;
  activeHelperCount: number;
  hasFoodDispenser: boolean;
  foodDispenserPrice: Price;
  actionCount: (action: string) => number;
  fishPurchaseCount: (coinType?: CoinType) => number;
  commonReward: (weight?: number) => Price;
  rareReward: () => Price;
  superRareReward: () => Price;
};

export const fishPurchaseWindowMs = 60 * 60 * 1000;
export const growthTonicPurchaseWindowMs = 60 * 60 * 1000;
export const rewardedAdDurationMs = 30_000;

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
  if (!savedGoals || savedGoals.date !== today) {
    return { date: today, claimed: [] };
  }

  return { date: today, claimed: [...new Set(savedGoals.claimed.filter((entry) => typeof entry === "string"))] };
}

export function buildDailyQuestItems(input: BuildDailyQuestItemsInput): DailyQuestItem[] {
  const actionCount = input.actionCount;
  return [
    { id: "buy-fish", label: input.affordableCommonFish ? "Buy a fish" : "Save coins for a fish", complete: input.fishPurchaseCount() > 0, reward: input.commonReward(1) },
    { id: "place-fish", label: "Drag a fish into the tank", complete: actionCount("place-fish") > 0 || input.activeFishCount > 0, reward: input.commonReward(0.75) },
    { id: "buy-food", label: "Buy another food", complete: actionCount("buy-food") > 0, reward: input.commonReward(0.7) },
    { id: "feed", label: "Feed a fish", complete: actionCount("feed") > 0, reward: input.commonReward(0.7) },
    { id: "coin", label: `Collect ${formatNumber(1)} coin`, complete: actionCount("coin") > 0, reward: input.commonReward(0.65) },
    { id: "clean", label: "Clean the tank", complete: actionCount("clean") > 0, reward: input.commonReward(0.85) },
    { id: "buy-medicine", label: "Buy medicine", complete: actionCount("buy-medicine") > 0, reward: input.commonReward(0.55) },
    { id: "medicine", label: "Heal a sick fish with medicine", complete: actionCount("medicine") > 0, reward: input.commonReward(1.25) },
    { id: "buy-decoration", label: "Buy a decoration", complete: actionCount("buy-decoration") > 0, reward: input.commonReward(1) },
    { id: "place-decoration", label: "Place a decoration", complete: actionCount("place-decoration") > 0 || input.activeDecorationCount > 0, reward: input.commonReward(0.8) },
    { id: "buy-helper", label: "Buy a helper", complete: actionCount("buy-helper") > 0, reward: input.commonReward(1.2) },
    { id: "place-helper", label: "Drop a helper into the tank", complete: actionCount("place-helper") > 0 || input.activeHelperCount > 0, reward: input.commonReward(0.9) },
    { id: "buy-dispenser", label: `Buy Food Dispenser (${formatPrice(input.foodDispenserPrice)})`, complete: actionCount("buy-dispenser") > 0 || input.hasFoodDispenser, reward: input.commonReward(1.35) },
    { id: "buy-background", label: "Buy a tank background", complete: actionCount("buy-background") > 0, reward: input.commonReward(1) },
    { id: "buy-seabed", label: "Buy a seabed", complete: actionCount("buy-seabed") > 0, reward: input.commonReward(1) },
    {
      id: "buy-tank",
      label: input.nextTankPrice ? `Buy ${input.nextTankName ?? "new tank"} (${formatPrice(input.nextTankPrice)})` : "Own every tank",
      complete: actionCount("buy-tank") > 0 || input.maxOwnedTanksReached,
      reward: input.commonReward(1.8)
    },
    { id: "buy-rare-fish", label: "Buy a rare fish", complete: input.fishPurchaseCount("rare") > 0, reward: input.rareReward() },
    { id: "buy-super-fish", label: "Buy a super rare fish", complete: input.fishPurchaseCount("superRare") > 0, reward: input.superRareReward() }
  ];
}

export function visibleDailyQuestItems(goals: DailyGoalsState, quests: DailyQuestItem[], limit = 3): DailyQuestItem[] {
  const unclaimed = quests.filter((goal) => !goals.claimed.includes(goal.id));
  const ready = unclaimed.filter((goal) => goal.complete);
  const todo = unclaimed.filter((goal) => !goal.complete);
  return [...ready, ...todo].slice(0, limit);
}

function dailyCommonQuestReward(level: number): number {
  if (level <= 2) {
    return 45;
  }
  if (level <= 5) {
    return 30;
  }
  return 15;
}

export function commonQuestReward(level: number, wallet: Wallet, totalWealth: number, weight = 1): Price {
  const walletFactor = wallet.common * 0.08;
  const wealthFactor = totalWealth * 0.006;
  const levelFactor = level * 12;
  const base = Math.max(dailyCommonQuestReward(level), walletFactor, wealthFactor, levelFactor);
  return { coinType: "common", amount: clamp(Math.round(base * weight), 10, 2500) };
}

export function rareQuestReward(wallet: Wallet): Price {
  return { coinType: "rare", amount: clamp(Math.round(Math.max(2, wallet.rare * 0.08)), 1, 25) };
}

export function superRareQuestReward(wallet: Wallet): Price {
  return { coinType: "superRare", amount: clamp(Math.round(Math.max(1, wallet.superRare * 0.08)), 1, 12) };
}

export function rewardedAdCoinReward(coinType: CoinType, level: number, wallet: Wallet, totalWealth: number): Price {
  if (coinType === "rare") {
    return rareQuestReward(wallet);
  }
  if (coinType === "superRare") {
    return superRareQuestReward(wallet);
  }
  return commonQuestReward(level, wallet, totalWealth, 0.9);
}

export function rewardedAdOptions(rewardForCoin: (coinType: CoinType) => Price): RewardedAdOption[] {
  return [
    { kind: "common", title: "Common Coins", detail: formatPrice(rewardForCoin("common")), icon: "/assets/ui/shop/coin_icon_common.png" },
    { kind: "rare", title: "Rare Coins", detail: formatPrice(rewardForCoin("rare")), icon: "/assets/ui/shop/coin_icon_rare.png" },
    { kind: "superRare", title: "Ultra Rare Coins", detail: formatPrice(rewardForCoin("superRare")), icon: "/assets/ui/shop/coin_icon_super_rare.png" },
    { kind: "ageBoost", title: "Growth Tonic", detail: "1 age booster pill", icon: "/assets/food/ageBoost.png" }
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

export function recordFishPurchase(goals: DailyGoalsState, rarity: Rarity, now = Date.now()): DailyGoalsState {
  return { ...goals, claimed: [...goals.claimed, `fish-buy:${rarity}:${now}:${randomId()}`] };
}

export function recordDailyQuestAction(goals: DailyGoalsState, action: string, now = Date.now()): DailyGoalsState {
  return { ...goals, claimed: [...goals.claimed, `action:${action}:${now}:${randomId()}`] };
}
