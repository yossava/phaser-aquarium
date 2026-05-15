import type { CoinType, Price, Rarity, Wallet } from "../types/mechanics";
import { formatNumber, formatPrice } from "./economy";

export type DailyQuestItem = {
  id: string;
  label: string;
  complete: boolean;
  reward: Price;
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
  affordableCommonFish: boolean;
  activeFishCount: number;
  activeDecorationCount: number;
  activeHelperCount: number;
  sickFishCount: number;
  hungryFishCount: number;
  medicineInventory: number;
  feedableFoodInventory: number;
  totalFoodInventory: number;
  storedFishCount: number;
  storedDecorationCount: number;
  rareCoinCount: number;
  superRareCoinCount: number;
  coinDropCount: number;
  cleanliness: number;
  hasFoodDispenser: boolean;
  hasCoinMagnet: boolean;
  hasAutoFoodBuyer: boolean;
  foodDispenserPrice: Price;
  questReward: Price;
  actionCount: (action: string) => number;
  fishPurchaseCount: (coinType?: CoinType) => number;
};

export const fishPurchaseWindowMs = 60 * 60 * 1000;
export const growthTonicPurchaseWindowMs = 60 * 60 * 1000;
export const productionBoostPurchaseWindowMs = 30 * 60 * 1000;
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
  if (!savedGoals || savedGoals.date !== today) {
    return { date: today, claimed: [] };
  }

  return {
    date: today,
    claimed: [...new Set(savedGoals.claimed.filter((entry) => typeof entry === "string"))],
    activeQuestIds: Array.isArray(savedGoals.activeQuestIds)
      ? [...new Set(savedGoals.activeQuestIds.filter((entry) => typeof entry === "string"))]
      : undefined
  };
}

export function buildDailyQuestItems(input: BuildDailyQuestItemsInput): DailyQuestItem[] {
  const actionCount = input.actionCount;
  const sickCarePriority = input.sickFishCount > 0 ? 120 : 20;
  const hungryCarePriority = input.hungryFishCount > 0 ? 95 : 35;
  const cleaningPriority = input.cleanliness < 55 ? 82 : input.cleanliness < 75 ? 58 : 24;
  const stockingPriority = input.feedableFoodInventory <= 0 ? 88 : 36;
  const medicinePriority = input.sickFishCount > 0 && input.medicineInventory <= 0 ? 118 : 22;
  const reward = input.questReward;
  return [
    { id: "buy-medicine", label: input.sickFishCount > 0 ? "Buy medicine for a sick fish" : "Buy medicine", complete: actionCount("buy-medicine") > 0, reward, priority: medicinePriority },
    { id: "medicine", label: "Heal a sick fish with medicine", complete: actionCount("medicine") > 0, reward, priority: sickCarePriority + (input.medicineInventory > 0 ? 10 : 0) },
    { id: "buy-food", label: input.feedableFoodInventory <= 0 ? "Restock fish food" : "Buy another food", complete: actionCount("buy-food") > 0, reward, priority: stockingPriority },
    { id: "drop-food", label: "Drop food into the tank", complete: actionCount("drop-food") > 0, reward, priority: input.feedableFoodInventory > 0 ? 72 : 18 },
    { id: "feed", label: input.hungryFishCount > 0 ? "Feed a hungry fish" : "Feed a fish", complete: actionCount("feed") > 0, reward, priority: hungryCarePriority },
    { id: "buy-growth-tonic", label: "Buy Growth Tonic", complete: actionCount("buy-growth-tonic") > 0, reward, priority: 24 },
    { id: "use-growth-tonic", label: "Use Growth Tonic", complete: actionCount("use-growth-tonic") > 0, reward, priority: 23 },
    { id: "clean", label: input.cleanliness < 75 ? "Clean the dirty tank" : "Clean the tank", complete: actionCount("clean") > 0, reward, priority: cleaningPriority },
    { id: "coin", label: `Collect ${formatNumber(1)} coin`, complete: actionCount("coin") > 0, reward, priority: input.coinDropCount > 0 ? 76 : 52 },
    { id: "magnet-coin", label: "Let Coin Magnet collect a coin", complete: actionCount("magnet-coin") > 0, reward, priority: input.hasCoinMagnet && input.coinDropCount > 0 ? 70 : 17 },
    { id: "sell-rare-coins", label: "Convert rare coins", complete: actionCount("sell-rare-coins") > 0, reward, priority: input.rareCoinCount > 0 ? 64 : 13 },
    { id: "sell-super-rare-coins", label: "Convert super rare coins", complete: actionCount("sell-super-rare-coins") > 0, reward, priority: input.superRareCoinCount > 0 ? 63 : 12 },
    { id: "buy-fish", label: input.affordableCommonFish ? "Buy a fish" : "Save coins for a fish", complete: input.fishPurchaseCount() > 0, reward, priority: input.activeFishCount <= 0 ? 92 : 44 },
    { id: "buy-rare-fish", label: "Buy a rare fish", complete: input.fishPurchaseCount("rare") > 0, reward, priority: 20 },
    { id: "buy-super-fish", label: "Buy a super rare fish", complete: input.fishPurchaseCount("superRare") > 0, reward, priority: 19 },
    { id: "place-fish", label: "Drag a fish into the tank", complete: actionCount("place-fish") > 0 || input.activeFishCount > 0, reward, priority: input.activeFishCount <= 0 ? 90 : 38 },
    { id: "move-fish", label: "Move a fish", complete: actionCount("move-fish") > 0, reward, priority: input.activeFishCount > 0 ? 31 : 9 },
    { id: "sell-active-fish", label: "Sell a tank fish", complete: actionCount("sell-active-fish") > 0, reward, priority: input.activeFishCount > 1 ? 29 : 7 },
    { id: "sell-stored-fish", label: "Sell a stored fish", complete: actionCount("sell-stored-fish") > 0, reward, priority: input.storedFishCount > 0 ? 28 : 6 },
    { id: "breed-fish", label: "Breed fish", complete: actionCount("breed-fish") > 0, reward, priority: input.activeFishCount >= 2 ? 27 : 5 },
    { id: "fuse-fish", label: "Fuse two fish", complete: actionCount("fuse-fish") > 0, reward, priority: input.activeFishCount + input.storedFishCount >= 2 ? 33 : 5 },
    { id: "premium-fusion", label: "Create a premium fusion result", complete: actionCount("premium-fusion") > 0, reward, priority: 11 },
    { id: "buy-decoration", label: "Buy a decoration", complete: actionCount("buy-decoration") > 0, reward, priority: input.activeDecorationCount <= 0 ? 42 : 18 },
    { id: "buy-rare-decoration", label: "Buy a rare decoration", complete: actionCount("buy-rare-decoration") > 0, reward, priority: 17 },
    { id: "buy-super-rare-decoration", label: "Buy a super rare decoration", complete: actionCount("buy-super-rare-decoration") > 0, reward, priority: 16 },
    { id: "place-decoration", label: "Place a decoration", complete: actionCount("place-decoration") > 0 || input.activeDecorationCount > 0, reward, priority: input.activeDecorationCount <= 0 ? 40 : 16 },
    { id: "move-decoration", label: "Move a decoration", complete: actionCount("move-decoration") > 0, reward, priority: input.activeDecorationCount > 0 ? 26 : 8 },
    { id: "trash-decoration", label: "Trash a decoration", complete: actionCount("trash-decoration") > 0, reward, priority: input.activeDecorationCount > 0 ? 15 : 4 },
    { id: "sell-decoration", label: "Sell decoration inventory", complete: actionCount("sell-decoration") > 0, reward, priority: input.storedDecorationCount > 0 || input.activeDecorationCount > 0 ? 30 : 6 },
    { id: "buy-helper", label: "Buy a helper", complete: actionCount("buy-helper") > 0, reward, priority: input.activeHelperCount <= 0 ? 34 : 14 },
    { id: "place-helper", label: "Drop a helper into the tank", complete: actionCount("place-helper") > 0 || input.activeHelperCount > 0, reward, priority: input.activeHelperCount <= 0 ? 32 : 12 },
    { id: "sell-helper", label: "Sell a helper", complete: actionCount("sell-helper") > 0, reward, priority: input.activeHelperCount > 0 ? 22 : 5 },
    { id: "helper-coin", label: "Let a helper collect a coin", complete: actionCount("helper-coin") > 0, reward, priority: input.activeHelperCount > 0 && input.coinDropCount > 0 ? 35 : 8 },
    { id: "helper-clean", label: "Let a helper clean the tank", complete: actionCount("helper-clean") > 0, reward, priority: input.activeHelperCount > 0 && input.cleanliness < 90 ? 34 : 8 },
    { id: "helper-food-clean", label: "Let a helper remove food", complete: actionCount("helper-food-clean") > 0, reward, priority: input.activeHelperCount > 0 ? 14 : 4 },
    { id: "buy-dispenser", label: `Buy Food Dispenser (${formatPrice(input.foodDispenserPrice)})`, complete: actionCount("buy-dispenser") > 0 || input.hasFoodDispenser, reward, priority: input.hasFoodDispenser ? 10 : 30 },
    { id: "dispenser-food", label: "Let Food Dispenser drop food", complete: actionCount("dispenser-food") > 0, reward, priority: input.hasFoodDispenser ? 25 : 6 },
    { id: "dispenser-medicine", label: "Let Food Dispenser give medicine", complete: actionCount("dispenser-medicine") > 0, reward, priority: input.hasFoodDispenser && input.sickFishCount > 0 ? 55 : 6 },
    { id: "buy-coin-magnet", label: "Buy Coin Magnet", complete: actionCount("buy-coin-magnet") > 0 || input.hasCoinMagnet, reward, priority: input.hasCoinMagnet ? 9 : 25 },
    { id: "buy-auto-food-buyer", label: "Buy Auto Food Buyer", complete: actionCount("buy-auto-food-buyer") > 0 || input.hasAutoFoodBuyer, reward, priority: input.hasAutoFoodBuyer ? 9 : 24 },
    { id: "auto-buy-food", label: "Let Auto Buyer restock food", complete: actionCount("auto-buy-food") > 0, reward, priority: input.hasAutoFoodBuyer && input.totalFoodInventory <= 0 ? 58 : 7 },
    { id: "buy-background", label: "Buy a tank background", complete: actionCount("buy-background") > 0, reward, priority: 26 },
    { id: "use-background", label: "Change tank background", complete: actionCount("use-background") > 0, reward, priority: 18 },
    { id: "buy-seabed", label: "Buy a seabed", complete: actionCount("buy-seabed") > 0, reward, priority: 25 },
    { id: "use-seabed", label: "Change tank seabed", complete: actionCount("use-seabed") > 0, reward, priority: 18 },
    { id: "tint-cosmetic", label: "Adjust tank cosmetic tint", complete: actionCount("tint-cosmetic") > 0, reward, priority: 14 },
    { id: "rename-tank", label: "Rename a tank", complete: actionCount("rename-tank") > 0, reward, priority: 10 },
    { id: "prize-game", label: "Play Treasure Spin", complete: actionCount("prize-game") > 0, reward, priority: 24 },
    { id: "watch-ad", label: "Watch a rewarded ad", complete: actionCount("watch-ad") > 0, reward, priority: 21 },
    { id: "claim-ad", label: "Claim an ad reward", complete: actionCount("claim-ad") > 0, reward, priority: 20 },
    { id: "claim-food-ad", label: "Claim a food ad reward", complete: actionCount("claim-food-ad") > 0, reward, priority: 12 },
    { id: "claim-fish-ad", label: "Claim a fish ad reward", complete: actionCount("claim-fish-ad") > 0, reward, priority: 12 },
    { id: "claim-helper-ad", label: "Claim a helper ad reward", complete: actionCount("claim-helper-ad") > 0, reward, priority: 12 },
    { id: "claim-coin-ad", label: "Claim a coin ad reward", complete: actionCount("claim-coin-ad") > 0, reward, priority: 12 },
    { id: "sell-food", label: "Sell food inventory", complete: actionCount("sell-food") > 0, reward, priority: input.totalFoodInventory > 0 ? 27 : 6 }
  ].sort((first, second) => (second.priority ?? 0) - (first.priority ?? 0));
}

export function ensureActiveDailyQuestItems(goals: DailyGoalsState, quests: DailyQuestItem[], limit = 3): DailyGoalsState {
  const questById = new Map(quests.map((quest) => [quest.id, quest]));
  const activeQuestIds = (goals.activeQuestIds ?? [])
    .filter((id) => questById.has(id) && !goals.claimed.includes(id))
    .slice(0, limit);

  for (const quest of quests) {
    if (activeQuestIds.length >= limit) {
      break;
    }
    if (!goals.claimed.includes(quest.id) && !activeQuestIds.includes(quest.id)) {
      activeQuestIds.push(quest.id);
    }
  }

  return { ...goals, activeQuestIds };
}

export function visibleDailyQuestItems(goals: DailyGoalsState, quests: DailyQuestItem[], limit = 3): DailyQuestItem[] {
  const questById = new Map(quests.map((quest) => [quest.id, quest]));
  const active = (goals.activeQuestIds ?? [])
    .map((id) => questById.get(id))
    .filter((quest): quest is DailyQuestItem => Boolean(quest))
    .filter((quest) => !goals.claimed.includes(quest.id))
    .slice(0, limit);
  if (active.length >= limit) {
    return active;
  }

  const activeIds = new Set(active.map((quest) => quest.id));
  const fill = quests.filter((goal) => !goals.claimed.includes(goal.id) && !activeIds.has(goal.id));
  return [...active, ...fill].slice(0, limit);
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

export function recordFishPurchase(goals: DailyGoalsState, rarity: Rarity, now = Date.now()): DailyGoalsState {
  return { ...goals, claimed: [...goals.claimed, `fish-buy:${rarity}:${now}:${randomId()}`] };
}

export function recordDailyQuestAction(goals: DailyGoalsState, action: string, now = Date.now()): DailyGoalsState {
  return { ...goals, claimed: [...goals.claimed, `action:${action}:${now}:${randomId()}`] };
}
