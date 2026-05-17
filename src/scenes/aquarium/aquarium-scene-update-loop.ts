import {
  fishCoinProductionMaxDelayMs,
  fishCoinProductionMinDelayMs
} from "../../game/economy-model";
import { productionBoostFoodTypeId } from "../../game/food-system";
import {
  coinComboIdleTimeoutMs,
  fishEatSoundKey,
  fishHungrySoundKey,
  hudStatusSyncIntervalSeconds,
  productionBoostDurationMs
} from "./aquarium-scene-config";

type AquariumSceneUpdateTarget = any;

export function runAquariumSceneUpdate(scene: AquariumSceneUpdateTarget, delta: number): void {
  const deltaSeconds = delta / 1000;
  const now = scene.time.now;
  scene.updateStoreOverlayTimer(deltaSeconds);

  if (!scene.shouldRunTankActivity()) {
    return;
  }

  scene.updateTimedUtilities();
  scene.updateTimeCurrent(deltaSeconds);
  scene.updateDailyQuestPlaytime(deltaSeconds);
  const activitySpeedMultiplier = scene.tankActivitySpeedMultiplier();
  const progressDeltaSeconds = deltaSeconds * activitySpeedMultiplier;

  scene.foods.forEach((food: any) => food.update(deltaSeconds));
  scene.removeExpiredFood();
  scene.coinDrops.forEach((coin: any) => coin.update(deltaSeconds));
  scene.updateCoinMagnetRayPulse();
  scene.updateCoinMagnet();
  if (scene.coinComboCount > 0 && now - scene.coinComboLastClaimedAt >= coinComboIdleTimeoutMs) {
    scene.resolveCoinCombo();
  }
  const tankFish = scene.activeFish();
  const activeDecorations = scene.activeDecorations();
  const activeHelpers = scene.activeHelperCreatures();
  scene.updateAirStoneBubbles(deltaSeconds, activeDecorations);
  scene.updateAutoFoodBuyer(tankFish);
  scene.updateFoodDispenser(tankFish);
  scene.updatePendingHelperCreatureDrops(deltaSeconds);
  scene.fishDeliveryBubbles?.update(deltaSeconds, now);
  scene.updateHelperCreatures(deltaSeconds, activeHelpers, progressDeltaSeconds);
  scene.updateTankCleanliness(progressDeltaSeconds, tankFish.length);
  scene.updateDirtyTankOverlay();
  const foodAssignments = scene.assignFoodsToFish(tankFish);
  const controlledFish = scene.controlledFish();
  const fishToRemove: any[] = [];
  for (const currentFish of tankFish) {
    updateFish(scene, currentFish, foodAssignments.get(currentFish) ?? [], deltaSeconds, progressDeltaSeconds, fishToRemove, activitySpeedMultiplier, controlledFish);
  }
  scene.collectCoinsHitByControlledFish();
  scene.updateControlledFishBubbleTrail(deltaSeconds);

  removeDeadFish(scene, fishToRemove);
  runAutosave(scene, deltaSeconds);
  syncHudStatus(scene, deltaSeconds);
}

function updateFish(
  scene: AquariumSceneUpdateTarget,
  currentFish: any,
  assignedFoods: any[],
  deltaSeconds: number,
  progressDeltaSeconds: number,
  fishToRemove: any[],
  activitySpeedMultiplier = 1,
  controlledFish?: any
): void {
  const previousAgeStage = currentFish.ageStage;
  const previousState = currentFish.state;
  const eatenFood = currentFish.update(deltaSeconds, assignedFoods, progressDeltaSeconds, controlledFish);
  if (currentFish.ageStage !== previousAgeStage) {
    scene.saveNow();
  }
  if (previousState !== "hungry" && currentFish.state === "hungry") {
    scene.playSfx(fishHungrySoundKey, { volume: 0.16 });
  }

  if (eatenFood) {
    handleEatenFood(scene, currentFish, eatenFood);
  }

  if (scene.cleanliness < 35 && currentFish.hunger > 72) {
    currentFish.health = Phaser.Math.Clamp(currentFish.health - 1.8 * progressDeltaSeconds, 0, 100);
  }

  scene.updateFishCoinProduction(currentFish, activitySpeedMultiplier);

  if (currentFish.isDeadFromNeglect()) {
    fishToRemove.push(currentFish);
  }
}

function handleEatenFood(scene: AquariumSceneUpdateTarget, currentFish: any, eatenFood: any): void {
  const ateMedicine = eatenFood.accepted && eatenFood.food.foodType.id === "medicine" && !eatenFood.food.medicineActsAsFood;
  const ateMedicineAsFood = eatenFood.accepted && eatenFood.food.foodType.id === "medicine" && eatenFood.food.medicineActsAsFood;
  const ateAgeBoost = eatenFood.accepted && eatenFood.food.foodType.id === "ageBoost";
  const ateProductionBoost = eatenFood.accepted && eatenFood.food.foodType.id === productionBoostFoodTypeId;
  if (eatenFood.accepted) {
    scene.playSfx(fishEatSoundKey, { volume: 0.18 });
  }
  if (eatenFood.accepted && !ateMedicine && !ateAgeBoost && !ateProductionBoost) {
    if (!ateMedicineAsFood) {
      scene.recordDailyQuestAction("feed");
    }
    scene.showMissedFoodEmotes(eatenFood.food, currentFish);
    if (currentFish.nextCoinDropAt <= scene.time.now) {
      currentFish.postponeCoinProduction(scene.time.now, Phaser.Math.Between(fishCoinProductionMinDelayMs, fishCoinProductionMaxDelayMs));
    }
  }
  scene.refundUnusedFood(eatenFood.food, eatenFood.consumedCalories);
  scene.removeFood(eatenFood.food);
  if (ateMedicine) {
    currentFish.applyMedicine(scene.time.now);
    scene.recordDailyQuestAction("medicine");
    scene.floatTankText("Healed", currentFish.sprite.x, currentFish.sprite.y - 26, "#a8ffb0");
  } else if (ateAgeBoost) {
    currentFish.applyAgeBoost(3);
    scene.recordDailyQuestAction("use-growth-tonic");
    scene.floatTankText("+3 months", currentFish.sprite.x, currentFish.sprite.y - 26, "#d9c2ff");
  } else if (ateProductionBoost) {
    currentFish.applyProductionBoost(scene.time.now, productionBoostDurationMs);
    scene.recordDailyQuestAction("use-production-boost");
    scene.floatTankText("5x Production", currentFish.sprite.x, currentFish.sprite.y - 26, "#ffd34d");
  } else if (eatenFood.reason === "tooSmall") {
    currentFish.showFoodNeedMessage(scene.foodNeedMessage(eatenFood.neededMealCalories));
  } else {
    scene.floatTankText(eatenFood.accepted ? "Yum" : "Nope", currentFish.sprite.x, currentFish.sprite.y - 26, eatenFood.accepted ? "#f7ff9a" : "#ffb0a8");
  }
  if (!eatenFood.accepted) {
    scene.cleanliness = Phaser.Math.Clamp(scene.cleanliness - 4, 0, 100);
  }
  scene.saveNow();
}

function removeDeadFish(scene: AquariumSceneUpdateTarget, fishToRemove: any[]): void {
  if (fishToRemove.length === 0) {
    return;
  }

  for (const deadFish of fishToRemove) {
    const index = scene.fish.indexOf(deadFish);
    if (index < 0) {
      continue;
    }
    const x = deadFish.sprite.x;
    const y = deadFish.sprite.y;
    const name = deadFish.type.name;
    scene.removeFishAt(index);
    scene.floatTankText(`${name} died`, x, y - 30, "#ff8f9a");
  }
  scene.closeModal();
  scene.renderTabControls();
  scene.refreshUi();
  scene.saveNow();
}

function runAutosave(scene: AquariumSceneUpdateTarget, deltaSeconds: number): void {
  scene.autosaveElapsed += deltaSeconds;
  if (scene.autosaveElapsed >= 5) {
    scene.autosaveElapsed = 0;
    scene.saveNow();
  }
}

function syncHudStatus(scene: AquariumSceneUpdateTarget, deltaSeconds: number): void {
  scene.hudStatusSyncElapsed += deltaSeconds;
  if (scene.hudStatusSyncElapsed >= hudStatusSyncIntervalSeconds) {
    scene.hudStatusSyncElapsed = 0;
    scene.refreshStatus();
  }
}
