#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const outputDir = path.join("artifacts", "economy");
const outputPath = path.join(outputDir, "balanced-long-term-projection.json");

const checkpointDays = [1, 3, 7, 14, 30, 60, 90, 180, 365, 730, 1095, 1825, 3650];

const tiers = [
  { id: "common", unlockLevel: 1, basePower: 18, powerGrowth: 1.018, paybackBase: 0.28, paybackGrowth: 0.012 },
  { id: "rare", unlockLevel: 7, basePower: 75, powerGrowth: 1.017, paybackBase: 1.2, paybackGrowth: 0.02 },
  { id: "superRare", unlockLevel: 18, basePower: 260, powerGrowth: 1.015, paybackBase: 3.5, paybackGrowth: 0.03 },
  { id: "prestige", unlockLevel: 45, basePower: 820, powerGrowth: 1.013, paybackBase: 8, paybackGrowth: 0.04 },
  { id: "legend", unlockLevel: 90, basePower: 2100, powerGrowth: 1.011, paybackBase: 18, paybackGrowth: 0.055 },
  { id: "ancient", unlockLevel: 180, basePower: 5200, powerGrowth: 1.009, paybackBase: 36, paybackGrowth: 0.07 },
  { id: "cosmic", unlockLevel: 360, basePower: 11800, powerGrowth: 1.007, paybackBase: 70, paybackGrowth: 0.09 }
];

const scenarios = [
  {
    id: "regular",
    label: "Regular check-in player",
    sessionsPerDay: 5,
    minutesPerSession: 5,
    offlineBankHours: 3,
    activeClaimEfficiency: 0.94,
    goalCompletionRate: 0.95,
    spendReserveRatio: 0.3
  },
  {
    id: "casual",
    label: "Casual check-in player",
    sessionsPerDay: 3,
    minutesPerSession: 4,
    offlineBankHours: 3,
    activeClaimEfficiency: 0.82,
    goalCompletionRate: 0.72,
    spendReserveRatio: 0.4
  },
  {
    id: "idle",
    label: "One daily visit player",
    sessionsPerDay: 1,
    minutesPerSession: 6,
    offlineBankHours: 3,
    activeClaimEfficiency: 0.72,
    goalCompletionRate: 0.28,
    spendReserveRatio: 0.5
  }
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function fmt(value) {
  if (value >= 1e15) return `${(value / 1e15).toFixed(1)}Qa`;
  if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return `${Math.round(value)}`;
}

function capacityForLevel(level) {
  return 8 + Math.floor(level * 1.15) + Math.floor(Math.sqrt(level) * 3);
}

function targetDaysForNextLevel(level, params) {
  const early = params.earlyCadence;
  if (level < 5) return early;
  if (level < 10) return early * 1.75;
  if (level < 20) return early * 3.1;
  if (level < 40) return early * 5.3;
  if (level < 75) return early * 8.5;
  if (level < 125) return early * 13;
  if (level < 200) return early * 20;
  if (level < 350) return early * 33;
  return early * (45 + Math.log2(level / 350 + 1) * 14);
}

function availableTiers(level) {
  return tiers.filter((tier) => level >= tier.unlockLevel);
}

function tierForPurchase(level) {
  return availableTiers(level).at(-1) ?? tiers[0];
}

function fishPowerForTier(tier, level, params) {
  const effectiveLevel = Math.max(0, level - tier.unlockLevel);
  return tier.basePower * params.fishPowerScale * Math.pow(tier.powerGrowth, effectiveLevel);
}

function fishPaybackDays(tier, level, params) {
  const effectiveLevel = Math.max(0, level - tier.unlockLevel);
  return (tier.paybackBase + effectiveLevel * tier.paybackGrowth) * params.fishPaybackScale;
}

function upgradeCost(state, params) {
  const days = targetDaysForNextLevel(state.level, params);
  const dailyBase = Math.max(45, state.dailyIncomeBeforeMaintenance);
  const levelFloor = 80 * Math.pow(state.level + 1, params.levelCostPower);
  return (dailyBase * days + levelFloor) * params.upgradeCostScale;
}

function sessionCollectionRatio(scenario) {
  const sessionCount = Math.max(0, Math.floor(scenario.sessionsPerDay));
  if (sessionCount <= 0) return 0;
  const activeHours = (sessionCount * scenario.minutesPerSession) / 60;
  const gapHours = 24 / sessionCount;
  const bankedHours = sessionCount * Math.min(scenario.offlineBankHours, gapHours);
  const collectibleHours = Math.min(24, activeHours + bankedHours);
  return clamp((collectibleHours / 24) * scenario.activeClaimEfficiency, 0, 1);
}

function firstWeekGoalBonusRatio(day, scenario) {
  const schedule = [0, 0.55, 0.42, 0.3, 0.22, 0.16, 0.1, 0.06];
  const base = day <= 7 ? schedule[day] : day <= 30 ? 0.025 : 0;
  return base * scenario.goalCompletionRate;
}

function retentionFrictionRatio(day, scenario) {
  if (scenario.sessionsPerDay >= 3) return 0;
  if (day <= 1) return 0;
  if (day <= 7) return 0.08;
  return 0.14;
}

function dailyFishPurchaseLimit(day, state, scenario) {
  if (day <= 0) return 0;
  const firstWeek = [0, 5, 3, 3, 3, 3, 4, 4];
  if (day <= 7) {
    return Math.max(1, Math.round(firstWeek[day] * scenario.goalCompletionRate));
  }
  return Math.max(2, Math.floor(3 + state.level / 24 + scenario.sessionsPerDay / 2));
}

function buyFish(state, params, scenario, maxPurchases = Infinity) {
  let bought = 0;
  const cap = capacityForLevel(state.level);
  while (state.fishCount < cap && bought < maxPurchases) {
    const tier = tierForPurchase(state.level);
    const power = fishPowerForTier(tier, state.level, params);
    const price = power * fishPaybackDays(tier, state.level, params);
    const reserve = upgradeCost(state, params) * scenario.spendReserveRatio;
    if (state.wallet - reserve < price) break;
    state.wallet -= price;
    state.fishCount += 1;
    state.fishPower += power;
    state.fishByTier[tier.id] = (state.fishByTier[tier.id] ?? 0) + 1;
    bought += 1;
  }
  return bought;
}

function collectMilestones(prevLevel, level) {
  return tiers
    .filter((tier) => prevLevel < tier.unlockLevel && level >= tier.unlockLevel)
    .map((tier) => `Unlocked ${tier.id} fish`);
}

function simulateScenario(params, scenario, days = 3650) {
  const starterTier = tiers[0];
  const state = {
    day: 0,
    level: 1,
    wallet: 120,
    fishCount: 1,
    fishPower: fishPowerForTier(starterTier, 1, params),
    fishByTier: { common: 1 },
    dailyIncomeBeforeMaintenance: 0,
    dailyIncomeNet: 0,
    lastUpgradeDay: 0,
    longestUpgradeGap: 0,
    upgrades: []
  };
  const timeline = [];
  const events = [];

  for (let day = 1; day <= days; day += 1) {
    const tankBonus = 1 + Math.log1p(state.level) * params.tankBonusScale;
    const collectionRatio = sessionCollectionRatio(scenario);
    const grossFishIncome = state.fishPower * tankBonus * collectionRatio;
    const goalBonus = grossFishIncome * firstWeekGoalBonusRatio(day, scenario);
    state.dailyIncomeBeforeMaintenance = grossFishIncome + goalBonus;
    const maintenance = state.dailyIncomeBeforeMaintenance * params.maintenanceRate;
    const friction = state.dailyIncomeBeforeMaintenance * retentionFrictionRatio(day, scenario);
    state.dailyIncomeNet = Math.max(0, state.dailyIncomeBeforeMaintenance - maintenance - friction);
    state.wallet += state.dailyIncomeNet;

    const bought = buyFish(state, params, scenario, dailyFishPurchaseLimit(day, state, scenario));
    let upgraded = 0;
    let safety = 0;
    while (safety < 1000) {
      const cost = upgradeCost(state, params);
      if (state.wallet < cost) break;
      state.wallet -= cost;
      const previous = state.level;
      state.level += 1;
      upgraded += 1;
      const gap = day - state.lastUpgradeDay;
      state.longestUpgradeGap = Math.max(state.longestUpgradeGap, gap);
      state.lastUpgradeDay = day;
      state.upgrades.push({ day, level: state.level, gapDays: gap, cost });
      const milestones = collectMilestones(previous, state.level);
      for (const milestone of milestones) events.push({ day, level: state.level, milestone });
      safety += 1;
    }

    timeline.push({
      day,
      level: state.level,
      wallet: state.wallet,
      fishCount: state.fishCount,
      capacity: capacityForLevel(state.level),
      dailyGross: state.dailyIncomeBeforeMaintenance,
      dailyNet: state.dailyIncomeNet,
      collectionRatio,
      goalBonus,
      bought,
      upgraded,
      nextUpgradeCost: upgradeCost(state, params),
      estimatedDaysToNextLevel: state.dailyIncomeNet > 0 ? upgradeCost(state, params) / state.dailyIncomeNet : Infinity,
      fishByTier: { ...state.fishByTier }
    });
  }

  return { scenario: scenario.id, label: scenario.label, timeline, events, state };
}

function checkpointRows(result) {
  return checkpointDays.map((day) => {
    const row = result.timeline[Math.min(day, result.timeline.length) - 1];
    return {
      day,
      level: row.level,
      fish: `${row.fishCount}/${row.capacity}`,
      dailyNet: row.dailyNet,
      wallet: row.wallet,
      nextLevelDays: row.estimatedDaysToNextLevel,
      tierMix: row.fishByTier
    };
  });
}

function scoreRun(regular, casual, idle) {
  const regularTargets = {
    1: 2,
    7: 5,
    30: 15,
    90: 34,
    365: 88,
    730: 145,
    1825: 250,
    3650: 380
  };
  const casualTargets = {
    7: 4,
    30: 10,
    365: 68,
    1825: 190,
    3650: 300
  };
  const idleTargets = {
    7: 2,
    30: 5,
    365: 35,
    1825: 115,
    3650: 190
  };
  let score = 0;
  for (const [dayText, target] of Object.entries(regularTargets)) {
    const day = Number(dayText);
    const level = regular.timeline[day - 1].level;
    score += Math.abs(Math.log((level + 1) / (target + 1))) * 12;
  }
  for (const [dayText, target] of Object.entries(casualTargets)) {
    const day = Number(dayText);
    const level = casual.timeline[day - 1].level;
    score += Math.abs(Math.log((level + 1) / (target + 1))) * 8;
  }
  for (const [dayText, target] of Object.entries(idleTargets)) {
    const day = Number(dayText);
    const level = idle.timeline[day - 1].level;
    score += Math.abs(Math.log((level + 1) / (target + 1))) * 6;
  }

  const activeFinal = regular.timeline.at(-1);
  const casualFinal = casual.timeline.at(-1);
  const idleFinal = idle.timeline.at(-1);
  if (activeFinal.estimatedDaysToNextLevel > 75) score += (activeFinal.estimatedDaysToNextLevel - 75) * 0.5;
  if (activeFinal.estimatedDaysToNextLevel < 12) score += (12 - activeFinal.estimatedDaysToNextLevel) * 2;
  if (casualFinal.estimatedDaysToNextLevel > 120) score += (casualFinal.estimatedDaysToNextLevel - 120) * 0.25;
  if (idleFinal.level > activeFinal.level * 0.65) score += (idleFinal.level - activeFinal.level * 0.65) * 0.35;
  if (activeFinal.fishCount < activeFinal.capacity * 0.55) score += 15;
  if (activeFinal.fishCount > activeFinal.capacity) score += 1000;
  return score;
}

function tune() {
  const candidates = [];
  for (const earlyCadence of [0.38, 0.45, 0.52]) {
    for (const upgradeCostScale of [0.72, 0.84, 0.96, 1.08]) {
      for (const fishPowerScale of [0.8, 0.95, 1.1]) {
        for (const fishPaybackScale of [0.9, 1.05, 1.2]) {
          for (const tankBonusScale of [0.075, 0.09, 0.105]) {
            for (const levelCostPower of [1.18, 1.26, 1.34]) {
              const params = {
                earlyCadence,
                upgradeCostScale,
                fishPowerScale,
                fishPaybackScale,
                tankBonusScale,
                levelCostPower,
                maintenanceRate: 0.14
              };
              const active = simulateScenario(params, scenarios[0]);
              const casual = simulateScenario(params, scenarios[1]);
              const idle = simulateScenario(params, scenarios[2]);
              candidates.push({ params, score: scoreRun(active, casual, idle), active, casual, idle });
            }
          }
        }
      }
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  return candidates;
}

function markdownRows(rows) {
  return rows.map((row) => ({
    day: row.day,
    level: row.level,
    fish: row.fish,
    dailyNet: fmt(row.dailyNet),
    wallet: fmt(row.wallet),
    nextLevelDays: row.nextLevelDays.toFixed(1)
  }));
}

const top = tune().slice(0, 8);
const best = top[0];
const report = {
  generatedAt: new Date().toISOString(),
  model: {
    unit: "normalized common-value wealth",
    designIntent: "Tank level is the durable long-term progression gate. Fish produce income, shop items create sinks, and later tiers unlock by level.",
    limitations: [
      "This is a target balance projection, not the current shipped data.",
      "It models daily session behavior, not every individual coin tap.",
      "Currencies are normalized into wealth units so we can design multi-year curves before applying exact common/rare/superRare prices."
    ],
    retentionMechanics: {
      offlineCoinBank: "Unclaimed production is only banked for a limited number of hours per check-in.",
      firstWeekGoals: "Goal rewards supplement Day 1-7 income, then taper so fish income becomes the main economy.",
      inactiveFriction: "One-visit-per-day play has lower goal completion and light care/cleanliness friction after Day 1."
    }
  },
  bestParams: best.params,
  tuningTopScores: top.map((candidate) => ({ score: Number(candidate.score.toFixed(3)), params: candidate.params })),
  active: {
    checkpoints: checkpointRows(best.active),
    events: best.active.events
  },
  casual: {
    checkpoints: checkpointRows(best.casual),
    events: best.casual.events
  },
  idle: {
    checkpoints: checkpointRows(best.idle),
    events: best.idle.events
  },
  priceRules: {
    fishPayback: tiers.map((tier) => ({
      tier: tier.id,
      unlockLevel: tier.unlockLevel,
      startingPaybackDays: Number((tier.paybackBase * best.params.fishPaybackScale).toFixed(2)),
      pricingRule: "fish price = projected daily income from this fish * target payback days"
    })),
    recurringSinks: {
      foodAndCare: "12-16% of gross income for an active player",
      medicine: "15-30 minutes of current tier income",
      helper: "6-18 hours of current tier income, higher if it automates collection",
      decorations: "2-8 hours for ordinary decor, 1-7 days for prestige decor",
      backgroundAndSeabed: "1-3 days early, 1-4 weeks late",
      tanks: "main progression sink; priced from targetDaysForNextLevel"
    }
  },
  tables: {
    active: markdownRows(checkpointRows(best.active)),
    casual: markdownRows(checkpointRows(best.casual)),
    idle: markdownRows(checkpointRows(best.idle))
  }
};

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

console.log(`Balanced economy tuning complete. Best score: ${best.score.toFixed(3)}`);
console.log(`Wrote ${outputPath}`);
console.log("\nRegular check-in projection");
console.table(report.tables.active);
console.log("\nCasual projection");
console.table(report.tables.casual);
console.log("\nOne daily visit projection");
console.table(report.tables.idle);
console.log("\nBest params");
console.table([best.params]);
