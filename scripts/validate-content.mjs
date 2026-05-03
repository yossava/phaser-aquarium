import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dataDir = path.join(root, "src", "data");

const rarities = new Set(["common", "rare", "superRare"]);
const coinTypes = new Set(["common", "rare", "superRare"]);
const foodTypes = new Set(["micro", "basic", "premium", "herb", "protein", "coral", "medicine", "evolve", "event"]);
const ageStages = ["baby", "juvenile", "adult", "elder", "master"];

const errors = [];

async function readJson(fileName) {
  const raw = await readFile(path.join(dataDir, fileName), "utf8");
  return JSON.parse(raw);
}

function fail(message) {
  errors.push(message);
}

function validateUniqueIds(collectionName, items) {
  const seen = new Set();

  for (const item of items) {
    if (!item.id || typeof item.id !== "string") {
      fail(`${collectionName}: item is missing a string id.`);
      continue;
    }

    if (seen.has(item.id)) {
      fail(`${collectionName}: duplicate id "${item.id}".`);
    }

    seen.add(item.id);
  }
}

function validatePrice(collectionName, item) {
  if (!item.price || typeof item.price !== "object") {
    fail(`${collectionName}/${item.id}: missing price.`);
    return;
  }

  if (!coinTypes.has(item.price.coinType)) {
    fail(`${collectionName}/${item.id}: invalid price coin type "${item.price.coinType}".`);
  }

  if (!Number.isFinite(item.price.amount) || item.price.amount < 0) {
    fail(`${collectionName}/${item.id}: price amount must be a non-negative number.`);
  }
}

function validateRarity(collectionName, item) {
  if (!rarities.has(item.rarity)) {
    fail(`${collectionName}/${item.id}: invalid rarity "${item.rarity}".`);
  }
}

function validateFoodRefs(collectionName, item, keys) {
  for (const key of keys) {
    if (!Array.isArray(item[key])) {
      fail(`${collectionName}/${item.id}: ${key} must be an array.`);
      continue;
    }

    for (const foodType of item[key]) {
      if (!foodTypes.has(foodType)) {
        fail(`${collectionName}/${item.id}: invalid food type "${foodType}" in ${key}.`);
      }
    }
  }
}

function validateCoinProduction(collectionName, item, production, context) {
  if (!Array.isArray(production) || production.length === 0) {
    fail(`${collectionName}/${item.id}: ${context} must include production entries.`);
    return;
  }

  for (const entry of production) {
    if (!coinTypes.has(entry.coinType)) {
      fail(`${collectionName}/${item.id}: invalid production coin type "${entry.coinType}" in ${context}.`);
    }

    if (!Number.isFinite(entry.amount) || entry.amount <= 0) {
      fail(`${collectionName}/${item.id}: production amount must be positive in ${context}.`);
    }

    if (!Number.isFinite(entry.intervalSeconds) || entry.intervalSeconds <= 0) {
      fail(`${collectionName}/${item.id}: production interval must be positive in ${context}.`);
    }

    if (!Number.isFinite(entry.chance) || entry.chance <= 0 || entry.chance > 1) {
      fail(`${collectionName}/${item.id}: production chance must be > 0 and <= 1 in ${context}.`);
    }
  }
}

function validateFishTypes(fishTypesData) {
  validateUniqueIds("fish-types", fishTypesData);
  const fishIds = new Set(fishTypesData.map((fish) => fish.id));

  for (const fish of fishTypesData) {
    validateRarity("fish-types", fish);
    validatePrice("fish-types", fish);
    validateFoodRefs("fish-types", fish, ["requiredFoodTypes", "preferredFoodTypes"]);

    if (!Number.isInteger(fish.tankLevel) || fish.tankLevel < 1 || fish.tankLevel > 5) {
      fail(`fish-types/${fish.id}: tankLevel must be an integer from 1 to 5.`);
    }

    if (!fish.sellBaseValue || !coinTypes.has(fish.sellBaseValue.coinType)) {
      fail(`fish-types/${fish.id}: invalid sellBaseValue coin type.`);
    }

    if (!Array.isArray(fish.acquisitionSources) || fish.acquisitionSources.length === 0) {
      fail(`fish-types/${fish.id}: acquisitionSources must not be empty.`);
    }

    for (const key of ["compatibleSpecies", "incompatibleSpecies"]) {
      if (!Array.isArray(fish[key])) {
        fail(`fish-types/${fish.id}: ${key} must be an array.`);
        continue;
      }

      if (key === "incompatibleSpecies" && fish[key].length > 0) {
        fail(`fish-types/${fish.id}: incompatibleSpecies must stay empty because all fish are community-safe.`);
      }

      for (const fishId of fish[key]) {
        if (!fishIds.has(fishId)) {
          fail(`fish-types/${fish.id}: unknown fish id "${fishId}" in ${key}.`);
        }
      }
    }

    if (!fish.ageCurve || typeof fish.ageCurve !== "object") {
      fail(`fish-types/${fish.id}: missing ageCurve.`);
      continue;
    }

    for (const stage of ageStages) {
      const curve = fish.ageCurve[stage];
      if (!curve) {
        fail(`fish-types/${fish.id}: missing age stage "${stage}".`);
        continue;
      }

      if (!Number.isFinite(curve.scale) || curve.scale <= 0) {
        fail(`fish-types/${fish.id}: invalid scale for ${stage}.`);
      }

      if (!Number.isFinite(curve.hungerMultiplier) || curve.hungerMultiplier <= 0) {
        fail(`fish-types/${fish.id}: invalid hungerMultiplier for ${stage}.`);
      }

      validateCoinProduction("fish-types", fish, curve.production, `ageCurve.${stage}`);
    }

    for (const numericKey of [
      "baseScale",
      "maxScale",
      "growthPerSecond",
      "speed",
      "hungerPerSecond",
      "coinDropSeconds",
      "coinValue",
      "tint",
      "illnessResistance"
    ]) {
      if (!Number.isFinite(fish[numericKey])) {
        fail(`fish-types/${fish.id}: ${numericKey} must be numeric.`);
      }
    }
  }
}

function validateFoodTypes(foodTypesData) {
  validateUniqueIds("food-types", foodTypesData);

  for (const food of foodTypesData) {
    if (!foodTypes.has(food.id)) {
      fail(`food-types/${food.id}: id must be a known FoodType.`);
    }

    validateRarity("food-types", food);
    validatePrice("food-types", food);

    if (!Number.isFinite(food.nutrition) || food.nutrition <= 0) {
      fail(`food-types/${food.id}: nutrition must be positive.`);
    }

    if (!Number.isFinite(food.calories) || food.calories <= 0) {
      fail(`food-types/${food.id}: calories must be positive.`);
    }

    if (!Number.isInteger(food.densityLevel) || food.densityLevel < 1 || food.densityLevel > 5) {
      fail(`food-types/${food.id}: densityLevel must be an integer from 1 to 5.`);
    }
  }
}

function validateDecorationTypes(decorationTypesData) {
  validateUniqueIds("decoration-types", decorationTypesData);

  for (const decoration of decorationTypesData) {
    validateRarity("decoration-types", decoration);
    validatePrice("decoration-types", decoration);

    if (!decoration.texture || typeof decoration.texture !== "string") {
      fail(`decoration-types/${decoration.id}: texture must be a string.`);
    }

    if (!Array.isArray(decoration.habitatTags)) {
      fail(`decoration-types/${decoration.id}: habitatTags must be an array.`);
    }

    if (!Number.isFinite(decoration.happinessBonus)) {
      fail(`decoration-types/${decoration.id}: happinessBonus must be numeric.`);
    }
  }
}

function validateHelperCreatureTypes(helperCreatureTypesData) {
  validateUniqueIds("helper-creature-types", helperCreatureTypesData);

  for (const helper of helperCreatureTypesData) {
    validateRarity("helper-creature-types", helper);
    validatePrice("helper-creature-types", helper);

    if (!helper.texture || typeof helper.texture !== "string") {
      fail(`helper-creature-types/${helper.id}: texture must be a string.`);
    }

    if (!Number.isFinite(helper.speed) || helper.speed <= 0) {
      fail(`helper-creature-types/${helper.id}: speed must be positive.`);
    }

    if (!Number.isFinite(helper.coinCollectSeconds) || helper.coinCollectSeconds <= 0) {
      fail(`helper-creature-types/${helper.id}: coinCollectSeconds must be positive.`);
    }

    if (!Number.isFinite(helper.cleanupSeconds) || helper.cleanupSeconds <= 0) {
      fail(`helper-creature-types/${helper.id}: cleanupSeconds must be positive.`);
    }

    if (helper.feedSeconds !== undefined && (!Number.isFinite(helper.feedSeconds) || helper.feedSeconds <= 0)) {
      fail(`helper-creature-types/${helper.id}: feedSeconds must be positive when present.`);
    }

    if (!Array.isArray(helper.habitatTags)) {
      fail(`helper-creature-types/${helper.id}: habitatTags must be an array.`);
    }
  }
}

const fishTypesData = await readJson("fish-types.json");
const foodTypesData = await readJson("food-types.json");
const decorationTypesData = await readJson("decoration-types.json");
const helperCreatureTypesData = await readJson("helper-creature-types.json");

validateFishTypes(fishTypesData);
validateFoodTypes(foodTypesData);
validateDecorationTypes(decorationTypesData);
validateHelperCreatureTypes(helperCreatureTypesData);

if (fishTypesData.length < 50) {
  fail(`fish-types: expected at least 50 fish, found ${fishTypesData.length}.`);
}

for (let level = 1; level <= 5; level += 1) {
  const count = fishTypesData.filter((fish) => fish.tankLevel === level).length;
  if (count < 10) {
    fail(`fish-types: expected at least 10 fish for tankLevel ${level}, found ${count}.`);
  }
}

if (errors.length > 0) {
  console.error("Content validation failed:");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Content validation passed: ${fishTypesData.length} fish, ${foodTypesData.length} food, ${decorationTypesData.length} decorations, ${helperCreatureTypesData.length} helpers.`
);
