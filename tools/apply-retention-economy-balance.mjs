#!/usr/bin/env node
import fs from "node:fs";

const fishPath = "src/data/fish-types.json";
const foodPath = "src/data/food-types.json";
const decorationPath = "src/data/decoration-types.json";
const helperPath = "src/data/helper-creature-types.json";

const fishTypes = JSON.parse(fs.readFileSync(fishPath, "utf8"));
const foodTypes = JSON.parse(fs.readFileSync(foodPath, "utf8"));
const decorationTypes = JSON.parse(fs.readFileSync(decorationPath, "utf8"));
const helperTypes = JSON.parse(fs.readFileSync(helperPath, "utf8"));

const stageMultiplier = {
  baby: 1,
  juvenile: 1.18,
  adult: 1.42,
  elder: 1.72,
  master: 2.08
};

const durationByStage = {
  baby: 180,
  juvenile: 480,
  adult: 1200,
  elder: 2100,
  master: 0
};

const moodByStage = {
  baby: 72,
  juvenile: 92,
  adult: 120,
  elder: 148,
  master: 176
};

const hungerByStage = {
  baby: 1.22,
  juvenile: 1.08,
  adult: 1,
  elder: 0.92,
  master: 0.86
};

function byLevelAndRarity(rarity, level) {
  return fishTypes.filter((fish) => fish.rarity === rarity && fish.tankLevel === level);
}

function buildAgeCurve(coinType, baseAmount, baseInterval) {
  return Object.fromEntries(
    Object.keys(stageMultiplier).map((stage) => [
      stage,
      {
        durationSeconds: durationByStage[stage],
        scale: stage === "baby" ? 0.62 : stage === "juvenile" ? 0.82 : stage === "adult" ? 1 : stage === "elder" ? 1.12 : 1.18,
        hungerMultiplier: hungerByStage[stage],
        moodCycleSeconds: moodByStage[stage],
        production: [
          {
            coinType,
            amount: Math.max(1, Math.round(baseAmount * stageMultiplier[stage])),
            intervalSeconds: Math.max(45, Math.round(baseInterval / Math.sqrt(stageMultiplier[stage]))),
            chance: 1
          }
        ]
      }
    ])
  );
}

function rebalanceFishGroup(group, config) {
  group.forEach((fish, index) => {
    const price = config.price(index);
    const sell = Math.max(1, Math.floor(price * config.sellRatio));
    const productionAmount = config.productionAmount(index);
    const productionInterval = config.productionInterval(index);
    fish.price = { coinType: config.coinType, amount: price };
    fish.sellBaseValue = { coinType: config.coinType, amount: sell };
    fish.coinValue = productionAmount;
    fish.coinDropSeconds = productionInterval;
    fish.ageCurve = buildAgeCurve(config.coinType, productionAmount, productionInterval);
  });
}

rebalanceFishGroup(byLevelAndRarity("common", 1), {
  coinType: "common",
  sellRatio: 0.62,
  price: (index) => 60 + index * 8,
  productionAmount: () => 1,
  productionInterval: (index) => 260 - Math.min(70, index * 3)
});

rebalanceFishGroup(byLevelAndRarity("common", 2), {
  coinType: "common",
  sellRatio: 0.62,
  price: (index) => 260 + index * 18,
  productionAmount: () => 1,
  productionInterval: (index) => 210 - Math.min(60, index * 3)
});

rebalanceFishGroup(byLevelAndRarity("rare", 2), {
  coinType: "rare",
  sellRatio: 0.58,
  price: () => 6,
  productionAmount: () => 1,
  productionInterval: () => 3600
});

rebalanceFishGroup(byLevelAndRarity("rare", 3), {
  coinType: "rare",
  sellRatio: 0.58,
  price: (index) => 10 + index * 2,
  productionAmount: () => 1,
  productionInterval: (index) => 3300 - Math.min(900, index * 36)
});

rebalanceFishGroup(byLevelAndRarity("rare", 4), {
  coinType: "rare",
  sellRatio: 0.58,
  price: (index) => 48 + index * 3,
  productionAmount: () => 1,
  productionInterval: (index) => 2700 - Math.min(720, index * 28)
});

rebalanceFishGroup(byLevelAndRarity("superRare", 5), {
  coinType: "superRare",
  sellRatio: 0.55,
  price: (index) => 4 + index * 4,
  productionAmount: (index) => 1 + Math.floor(index / 12),
  productionInterval: (index) => 7200 - Math.min(2700, index * 110)
});

const foodPrices = {
  basic: { coinType: "common", amount: 4 },
  basicMedium: { coinType: "common", amount: 22 },
  basicLarge: { coinType: "common", amount: 110 },
  basicXL: { coinType: "common", amount: 550 },
  micro: { coinType: "common", amount: 5 },
  herb: { coinType: "common", amount: 8 },
  medicine: { coinType: "common", amount: 10 },
  creature: { coinType: "common", amount: 12 },
  premium: { coinType: "rare", amount: 2 },
  protein: { coinType: "rare", amount: 3 },
  coral: { coinType: "rare", amount: 4 },
  event: { coinType: "superRare", amount: 2 }
};

for (const food of foodTypes) {
  if (foodPrices[food.id]) {
    food.price = foodPrices[food.id];
  }
}

const decorationPrices = {
  plant: { coinType: "common", amount: 120 },
  rock: { coinType: "common", amount: 150 },
  driftwood: { coinType: "common", amount: 260 },
  "bubble-stone": { coinType: "common", amount: 340 },
  "air-stone": { coinType: "common", amount: 420 },
  "moss-cave": { coinType: "common", amount: 500 },
  castle: { coinType: "rare", amount: 12 },
  "coral-fan": { coinType: "rare", amount: 18 },
  "shell-tower": { coinType: "rare", amount: 24 },
  "treasure-chest": { coinType: "rare", amount: 30 },
  "crystal-arch": { coinType: "superRare", amount: 5 },
  "neon-anemone": { coinType: "superRare", amount: 8 },
  "pearl-statue": { coinType: "superRare", amount: 12 }
};

for (const decoration of decorationTypes) {
  if (decorationPrices[decoration.id]) {
    decoration.price = decorationPrices[decoration.id];
  }
}

const helperPrices = {
  shrimp: { coinType: "common", amount: 650 },
  "feeder-snail": { coinType: "common", amount: 900 },
  shell: { coinType: "rare", amount: 35 },
  "auto-cleaner": { coinType: "rare", amount: 50 },
  crab: { coinType: "superRare", amount: 15 }
};

for (const helper of helperTypes) {
  if (helperPrices[helper.id]) {
    helper.price = helperPrices[helper.id];
  }
}

fs.writeFileSync(fishPath, `${JSON.stringify(fishTypes, null, 2)}\n`);
fs.writeFileSync(foodPath, `${JSON.stringify(foodTypes, null, 2)}\n`);
fs.writeFileSync(decorationPath, `${JSON.stringify(decorationTypes, null, 2)}\n`);
fs.writeFileSync(helperPath, `${JSON.stringify(helperTypes, null, 2)}\n`);

console.log("Applied retention economy balance to fish, food, decorations, and helpers.");
