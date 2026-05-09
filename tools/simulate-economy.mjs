#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const fishTypes = JSON.parse(fs.readFileSync("src/data/fish-types.json", "utf8"));

const coinTypes = ["common", "rare", "superRare"];
const coinWeight = { common: 1, rare: 100, superRare: 1000 };
const rarityRank = { common: 1, rare: 2, superRare: 3 };
const ageStages = ["baby", "juvenile", "adult", "elder", "master"];
const fishCapacityByTankLevel = { 1: 10, 2: 14, 3: 18, 4: 22, 5: 30 };
const maxFishScreenWidthRatio = 0.5;
const gameWidth = 390;
const tankWidth = 390;
const veryBigScaleMultiplier = 1.55;
const fishLengthDisplayMultiplier = 10;
const secondsPerFishMonth = 60 * 60;
const adultGrowthSeconds = 12 * secondsPerFishMonth;

function cloneWallet(value = {}) {
  return {
    common: value.common ?? 0,
    rare: value.rare ?? 0,
    superRare: value.superRare ?? 0
  };
}

function addWallet(wallet, income) {
  for (const coin of coinTypes) wallet[coin] += income[coin] ?? 0;
}

function subtract(wallet, price) {
  wallet[price.coinType] -= price.amount;
}

function canAfford(wallet, price) {
  return wallet[price.coinType] >= price.amount;
}

function priceWealth(price) {
  return price.amount * coinWeight[price.coinType];
}

function walletWealth(wallet) {
  return wallet.common + wallet.rare * 100 + wallet.superRare * 1000;
}

function smoothGrowthRatio(value) {
  const x = clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hatchlingScale(fish) {
  return fish.baseScale * 0.42;
}

function oneMonthScale(fish) {
  return fish.baseScale * 0.64;
}

function sixMonthScale(fish) {
  return fish.baseScale * 0.84;
}

function oneYearScale(fish) {
  return fish.baseScale;
}

function maxGrowthScale(fish) {
  return fish.maxScale * veryBigScaleMultiplier;
}

function slowAdultGrowthScale(start, end, ageSeconds) {
  const extraYears = Math.max(0, (ageSeconds - adultGrowthSeconds) / (12 * secondsPerFishMonth));
  return lerp(start, end, 1 - Math.exp(-extraYears / 18));
}

function rawAgeScale(fish, ageSecondsValue) {
  const ageSeconds = Math.max(0, ageSecondsValue);
  if (ageSeconds <= secondsPerFishMonth) {
    return lerp(hatchlingScale(fish), oneMonthScale(fish), smoothGrowthRatio(ageSeconds / secondsPerFishMonth));
  }
  if (ageSeconds <= adultGrowthSeconds / 2) {
    return lerp(oneMonthScale(fish), sixMonthScale(fish), smoothGrowthRatio((ageSeconds - secondsPerFishMonth) / (adultGrowthSeconds / 2 - secondsPerFishMonth)));
  }
  if (ageSeconds <= adultGrowthSeconds) {
    return lerp(sixMonthScale(fish), oneYearScale(fish), smoothGrowthRatio((ageSeconds - adultGrowthSeconds / 2) / (adultGrowthSeconds / 2)));
  }
  return slowAdultGrowthScale(oneYearScale(fish), maxGrowthScale(fish), ageSeconds);
}

function adultLengthCm(fish) {
  const speciesScaleRatio = clamp((fish.maxScale - 1.17) / 0.56, 0, 1);
  return lerp(8, 32, speciesScaleRatio) * fishLengthDisplayMultiplier;
}

function biologicalGrowthRatio(fish, ageSeconds) {
  const babyScale = hatchlingScale(fish);
  const maxScale = maxGrowthScale(fish);
  return clamp((rawAgeScale(fish, ageSeconds) - babyScale) / Math.max(0.01, maxScale - babyScale), 0, 1);
}

function calorieNeedMultiplier(fish, ageSeconds) {
  const speciesSizeRatio = clamp((adultLengthCm(fish) / fishLengthDisplayMultiplier - 8) / 24, 0, 1);
  const speciesMultiplier = lerp(0.95, 1.18, speciesSizeRatio);
  return lerp(0.72, 3.8, biologicalGrowthRatio(fish, ageSeconds)) * speciesMultiplier;
}

function productionCareMultiplier(fish, ageSeconds) {
  return Math.max(1, Math.pow(calorieNeedMultiplier(fish, ageSeconds), 1.08));
}

function scaleProduction(fish, ageSeconds, production, index) {
  const multiplier = productionCareMultiplier(fish, ageSeconds);
  const primaryMultiplier = index === 0 ? multiplier : Math.sqrt(multiplier);
  const speedup = lerp(1, 1.18, clamp(multiplier / 4, 0, 1));
  return {
    ...production,
    amount: Math.max(1, Math.ceil(production.amount * primaryMultiplier)),
    intervalSeconds: Math.max(4, Math.round(production.intervalSeconds / speedup))
  };
}

function ageStage(fish, ageSecondsValue) {
  let remaining = ageSecondsValue;
  for (const stage of ageStages) {
    const duration = fish.ageCurve[stage].durationSeconds * 60;
    if (duration === 0 || remaining < duration) return stage;
    remaining -= duration;
  }
  return "master";
}

function productionOptions(fish, ageSeconds) {
  const stage = ageStage(fish, ageSeconds);
  const base = fish.ageCurve[stage].production.length > 0
    ? fish.ageCurve[stage].production
    : [{ coinType: "common", amount: fish.coinValue, intervalSeconds: fish.coinDropSeconds, chance: 1 }];
  return base.map((entry, index) => scaleProduction(fish, ageSeconds, entry, index));
}

function expectedIncomePerHour(fish, ageSeconds) {
  const income = cloneWallet();
  for (const production of productionOptions(fish, ageSeconds)) {
    income[production.coinType] += (production.amount * production.chance * 3600) / production.intervalSeconds;
  }
  return income;
}

function expectedWealthPerHour(fish, ageSeconds) {
  return walletWealth(expectedIncomePerHour(fish, ageSeconds));
}

function tankDisplayLevel(netWorth) {
  return Math.max(1, Math.floor(Math.log10(Math.max(1, netWorth) / 250 + 1)) + 1);
}

function maxCapacity(netWorth) {
  const level = tankDisplayLevel(netWorth);
  return level <= 5 ? fishCapacityByTankLevel[Math.max(1, level)] ?? 10 : fishCapacityByTankLevel[5] + (level - 5) * 6;
}

function fishSellWealthApprox(fish) {
  return priceWealth(fish.sellBaseValue);
}

function netWorth(state, mode) {
  const fishValue = state.fish.reduce((total, owned) => total + fishSellWealthApprox(owned.type), 0);
  if (mode === "current-double-count") {
    return walletWealth(state.wallet) + fishValue * 2;
  }
  return walletWealth(state.wallet) + fishValue;
}

function rankCandidate(fish, state, hour) {
  const expected = expectedWealthPerHour(fish, 0);
  const costWealth = Math.max(1, priceWealth(fish.price));
  const roi = expected / costWealth;
  return { fish, roi, expected, rank: rarityRank[fish.rarity] };
}

function dailyFishPurchaseLimit(state) {
  const level = tankDisplayLevel(netWorth(state, "corrected"));
  if (level <= 1) return 5;
  if (level <= 2) return 4;
  if (level <= 4) return 6;
  return Number.POSITIVE_INFINITY;
}

function buyUntilBlocked(state, mode, purchaseLimit = Number.POSITIVE_INFINITY) {
  let bought = 0;
  const purchases = [];
  while (bought < purchaseLimit && state.fish.length < maxCapacity(netWorth(state, mode))) {
    const tankLevel = tankDisplayLevel(netWorth(state, mode));
    const affordable = fishTypes
      .filter((fish) => fish.tankLevel <= tankLevel && canAfford(state.wallet, fish.price))
      .map((fish) => rankCandidate(fish, state))
      .sort((a, b) => b.rank - a.rank || b.roi - a.roi || a.fish.price.amount - b.fish.price.amount);
    const pick = affordable[0];
    if (!pick) break;
    subtract(state.wallet, pick.fish.price);
    state.fish.push({ type: pick.fish, ageSeconds: 0 });
    purchases.push(pick.fish.id);
    bought += 1;
  }
  return { bought, purchases };
}

function simulate({ hours = 72, mode = "corrected", buyCadenceHours = 1 } = {}) {
  const state = {
    wallet: cloneWallet({ common: 120 }),
    fish: [{ type: fishTypes.find((fish) => fish.id === "goldfish") ?? fishTypes[0], ageSeconds: 0 }]
  };
  const timeline = [];
  for (let hour = 1; hour <= hours; hour += 1) {
    const income = cloneWallet();
    for (const owned of state.fish) {
      addWallet(income, expectedIncomePerHour(owned.type, owned.ageSeconds));
      owned.ageSeconds += 3600;
    }
    addWallet(state.wallet, income);
    let bought = 0;
    if (hour % buyCadenceHours === 0 && hour % 24 === 1) {
      bought = buyUntilBlocked(state, mode, dailyFishPurchaseLimit(state)).bought;
    }
    const counts = state.fish.reduce((acc, owned) => {
      acc[owned.type.rarity] += 1;
      return acc;
    }, { common: 0, rare: 0, superRare: 0 });
    timeline.push({
      hour,
      day: hour / 24,
      income,
      bought,
      wallet: cloneWallet(state.wallet),
      fishCount: state.fish.length,
      counts,
      netWorth: netWorth(state, mode),
      tankLevel: tankDisplayLevel(netWorth(state, mode)),
      capacity: maxCapacity(netWorth(state, mode))
    });
  }
  return { mode, timeline, final: timeline.at(-1), state };
}

function fmt(value) {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return `${Math.round(value)}`;
}

function walletString(wallet) {
  return `C ${fmt(wallet.common)} | R ${fmt(wallet.rare)} | SR ${fmt(wallet.superRare)}`;
}

function rowAt(timeline, hour) {
  return timeline.find((row) => row.hour === hour) ?? timeline.at(-1);
}

function summarize(result) {
  const checkpoints = [1, 2, 4, 8, 12, 24, 48, 72, 168].filter((hour) => hour <= result.timeline.length);
  return checkpoints.map((hour) => {
    const row = rowAt(result.timeline, hour);
    return {
      hour,
      wallet: walletString(row.wallet),
      income: walletString(row.income),
      fish: `${row.fishCount} (${row.counts.common}C/${row.counts.rare}R/${row.counts.superRare}SR)`,
      tankLevel: row.tankLevel,
      capacity: row.capacity,
      netWorth: fmt(row.netWorth)
    };
  });
}

const hours = Number.parseInt(process.argv[2] ?? "168", 10);
const corrected = simulate({ hours, mode: "corrected" });
const current = simulate({ hours, mode: "current-double-count" });

const report = {
  assumptions: {
    startingWallet: "120 common",
    startFish: 1,
    strategy: "Once per day, buy until blocked by the tank's daily fish purchase limit. Prefer superRare, then rare, then common; within rarity choose best expected hourly wealth ROI.",
    collection: "Perfect: every dropped coin is claimed immediately.",
    care: "Perfect: fish stay happy; food cost ignored.",
    catalogGating: "Fish are gated by current displayed tank level and purchase currency.",
    production: "Expected value per hour from fish age curves. Multi-production options are treated as expected additive output."
  },
  correctedCapacity: summarize(corrected),
  currentDoubleCountCapacity: summarize(current),
  finalCorrected: corrected.final,
  finalCurrent: current.final,
  topRoiByCurrency: coinTypes.map((coinType) => ({
    coinType,
    fish: fishTypes
      .filter((fish) => fish.price.coinType === coinType)
      .map((fish) => ({ id: fish.id, name: fish.name, rarity: fish.rarity, price: fish.price, tankLevel: fish.tankLevel, evPerHour: expectedIncomePerHour(fish, 0), wealthPerHour: expectedWealthPerHour(fish, 0), roi: expectedWealthPerHour(fish, 0) / Math.max(1, priceWealth(fish.price)) }))
      .sort((a, b) => b.roi - a.roi)
      .slice(0, 10)
  }))
};

fs.mkdirSync("artifacts/economy", { recursive: true });
fs.writeFileSync(path.join("artifacts/economy", "economy-sim-results.json"), JSON.stringify(report, null, 2));

console.log(`Economy simulation (${hours}h)`);
console.log("\\nCorrected net worth capacity");
console.table(report.correctedCapacity);
console.log("\\nCurrent double-count net worth capacity");
console.table(report.currentDoubleCountCapacity);
console.log("\\nTop ROI by purchase currency");
for (const group of report.topRoiByCurrency) {
  console.log(`\\n${group.coinType}`);
  console.table(group.fish.map((fish) => ({
    id: fish.id,
    rarity: fish.rarity,
    price: `${fish.price.amount} ${fish.price.coinType}`,
    wealthPerHour: fmt(fish.wealthPerHour),
    roi: fish.roi.toFixed(2),
    income: walletString(fish.evPerHour)
  })));
}
console.log("\\nWrote artifacts/economy/economy-sim-results.json");
