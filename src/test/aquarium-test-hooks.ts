import Phaser from "phaser";
import { decorationTypes, fishTypes, foodTypes, helperCreatureTypes } from "../data/content";
import { tankBounds } from "../game/constants";
import { foodDispenserInventoryKey } from "../game/dispenser-system";
import { earn, formatNumber } from "../game/economy";
import { clearSave, loadGame, mapToRecord } from "../game/save";
import { fishFoodTintFor } from "../game/visuals";
import { FoodPellet } from "../objects/FoodPellet";
import type { AquariumTestSnapshot } from "./aquarium-test-api";
import type { CoinType, FishGender, FoodTypeId, StoreTab } from "../types/mechanics";

type AquariumTestScene = any;

type AquariumTestHooksConfig = {
  maxCoinDrops: number;
  maxFoodDrops: number;
  maxHelperCreatures: number;
  maxOwnedTanks: number;
  maxFishCatalogLevel: number;
  decorationTrashZone: Phaser.Geom.Rectangle;
  overfullHungerFloor: number;
};

export function installAquariumTestHooks(scene: AquariumTestScene, config: AquariumTestHooksConfig): void {
  const {
    maxCoinDrops,
    maxFoodDrops,
    maxHelperCreatures,
    maxOwnedTanks,
    maxFishCatalogLevel,
    decorationTrashZone,
    overfullHungerFloor
  } = config;
  if (!import.meta.env.DEV) {
    return;
  }

  window.__aquariumTest = {
    getSnapshot: () => ({
      coins: scene.wallet.common,
      wallet: { ...scene.wallet },
      foodInventory: scene.getTotalFoodInventory(),
      foodInventoryByType: scene.foodInventoryRecord(),
      foodBuyQuantities: scene.foodBuyQuantityRecord(),
      creatureInventoryByType: mapToRecord(scene.creatureInventory),
      activeScreen: scene.activeScreen,
      activeTab: scene.activeTab,
      storeCoinFilter: scene.storeCoinFilter,
      fishCatalogLevel: scene.fishCatalogLevel,
      placementMode: scene.placementMode.kind,
      fishCount: scene.fish.length,
      activeFishCount: scene.activeFish().length,
      maxFishCapacity: scene.maxFishCapacityForLevel(),
      helperCreatureCount: scene.helperCreatures.length,
      activeHelperCreatureCount: scene.activeHelperCreatures().length,
      maxHelperCreatures,
      tankLevel: scene.tankLevel,
      activeTankSlot: scene.tankLevel,
      ownedTankLevels: scene.sortedOwnedTankLevels(),
      ownedTankCount: scene.ownedTankLevels.size,
      maxOwnedTanks,
      tankDisplayLevel: scene.tankDisplayLevel(),
      maxTankLevel: maxOwnedTanks,
      renderScale: scene.currentRenderScale(),
      tankCanUpgradeIndefinitely: false,
      tankSlotsAreIsolated: true,
      fishCatalogMaxLevel: maxFishCatalogLevel,
      tankViewScale: scene.tankViewScaleForLevel(),
      tankWorldBounds: {
        left: tankBounds.left,
        top: tankBounds.top,
        right: tankBounds.right,
        bottom: tankBounds.bottom,
        width: tankBounds.width,
        height: tankBounds.height
      },
      tankScreenEdges: {
        left: scene.tankToScreenPoint(tankBounds.left, tankBounds.top).x,
        top: scene.tankToScreenPoint(tankBounds.left, tankBounds.top).y,
        right: scene.tankToScreenPoint(tankBounds.right, tankBounds.bottom).x,
        bottom: scene.tankToScreenPoint(tankBounds.right, tankBounds.bottom).y
      },
      totalWealth: scene.calculateTotalWealth(),
      tankWorth: scene.calculateTankNetWorth(),
      nextTankUpgradePrice: scene.getNextTankUpgradePrice(),
      tankNeedIndicator: scene.getTankNeedIndicator(),
      tankHudText: scene.tankHudSnapshotText(),
      tankStatusText: scene.tankStatusSnapshotText(),
      tankCareText: scene.tankCareSnapshotText(),
      fishTypeCount: fishTypes.length,
      helperCreatureTypeCount: helperCreatureTypes.length,
      visibleFishCatalogCount: scene.visibleFishCatalog().length,
      visibleFishCatalogPreviewTextures: scene.visibleFishCatalog().map((fishType: any) => scene.fishCatalogPreviewTextureKey(fishType)),
      visibleStoreCatalogCount: scene.visibleStoreCatalogCount(),
      assetCoverage: scene.assetCoverageSnapshot(),
      dirtyTankOverlay: {
        visible: scene.dirtyTankOverlay?.visible ?? false,
        alpha: scene.dirtyTankOverlay?.alpha ?? 0,
        displayWidth: scene.dirtyTankOverlay?.displayWidth ?? 0,
        displayHeight: scene.dirtyTankOverlay?.displayHeight ?? 0
      },
      numberFormatSamples: {
        small: formatNumber(999),
        thousand: formatNumber(24_700),
        million: formatNumber(67_800_000),
        billion: formatNumber(1_234_000_000)
      },
      foodCount: scene.foods.length,
      coinDropCount: scene.coinDrops.length,
      maxCoinDrops,
      decorationCount: scene.placedDecorations.length,
      decorations: scene.placedDecorations.map((decoration: any) => ({
        typeId: decoration.typeId,
        size: decoration.size,
        x: scene.tankToScreenPoint(decoration.image.x, decoration.image.y).x,
        y: scene.tankToScreenPoint(decoration.image.x, decoration.image.y).y,
        depth: decoration.image.depth
      })),
      decorationTrashTarget: {
        visible: scene.decorationTrashTarget?.visible ?? false,
        x: decorationTrashZone.centerX,
        y: decorationTrashZone.centerY
      },
      cleanliness: scene.cleanliness,
      happiness: scene.calculateTankHappiness(),
      compatibilityScore: scene.calculateCurrentCompatibility().score,
      modalTitle: scene.modalTitle,
      saved: Boolean(loadGame()),
      offlineProgress: {
        elapsedSeconds: scene.offlineProgress.elapsedSeconds,
        earned: { ...scene.offlineProgress.earned }
      },
      fish: scene.fish.map((currentFish: any) => {
        const fishPosition = scene.tankToScreenPoint(currentFish.sprite.x, currentFish.sprite.y);
        const emote = currentFish.getEmoteSnapshot();
        const tailAnimation = currentFish.getTailAnimationSnapshot();
        const emotePosition = scene.tankToScreenPoint(emote.x, emote.y);
        const emojiPosition = scene.tankToScreenPoint(emote.emojiX, emote.emojiY);
        const fullnessRatio = currentFish.fullnessRatio();
        const moodRatio = Phaser.Math.Clamp(currentFish.health / 100, 0, 1);
        const growthBlockedByTank = currentFish.isGrowthLimitedByTank();
        const fullyGrown = currentFish.visualScale() >= currentFish.tankGrowthScaleCap() - 0.01;
        return {
          typeId: currentFish.type.id,
          typeName: currentFish.type.name,
          textureKey: currentFish.textureKey(),
          state: currentFish.state,
          ageLabel: currentFish.ageLabel(),
          ageSeconds: currentFish.ageSeconds,
          ageMonths: currentFish.ageMonths(),
          ageYears: currentFish.ageYears(),
          ageRequiredTankLevel: currentFish.ageRequiredTankLevel(),
          tankLevel: currentFish.tankLevel,
          growthCapAgeYears: currentFish.growthCapAgeYears(),
          lengthCm: currentFish.lengthCm(),
          weightGrams: currentFish.weightGrams(),
          lengthLabel: currentFish.lengthLabel(),
          weightLabel: currentFish.weightLabel(),
          naturalAgeScale: currentFish.naturalAgeScale() * scene.tankViewScaleForLevel(),
          tankGrowthScaleCap: currentFish.tankGrowthScaleCap() * scene.tankViewScaleForLevel(),
          growthBlockedByTank,
          gender: currentFish.gender,
          fatalCareSeconds: currentFish.fatalCareSeconds,
          fatalCareRemainingSeconds: currentFish.fatalCareRemainingSeconds(),
          continuousHungrySeconds: currentFish.continuousHungrySeconds,
          hunger: currentFish.hunger,
          health: currentFish.health,
          x: fishPosition.x,
          y: fishPosition.y,
          scale: currentFish.visualScale() * scene.tankViewScaleForLevel(),
          rotation: currentFish.sprite.rotation,
          displayWidth: currentFish.sprite.displayWidth * scene.tankViewScaleForLevel(),
          displayHeight: currentFish.sprite.displayHeight * scene.tankViewScaleForLevel(),
          veryBigScaleCap: currentFish.veryBigScaleCap() * scene.tankViewScaleForLevel(),
          movementSizeMultiplier: currentFish.movementSizeMultiplier(),
          calorieNeedMultiplier: currentFish.calorieNeedMultiplier(),
          hungerPerSecond: currentFish.hungerPerSecond(),
          mealCaloriesNeeded: currentFish.mealCaloriesNeeded(),
          productionSummary: currentFish.productionSummary(),
          productionOptions: currentFish.productionOptions(),
          bodyTint: currentFish.sprite.tintTopLeft,
          sellValue: scene.activeFishSellValue(currentFish),
          nextCoinDropInMs: Math.max(0, currentFish.nextCoinDropAt - scene.time.now),
          statusBars: {
            careBarsVisible: false,
            y: Math.min(emotePosition.y, fishPosition.y - 1),
            fullnessRatio,
            moodRatio,
            tailTint: fishFoodTintFor(currentFish.type),
            rarityStars: 0,
            fullyGrown,
            growthBlockedByTank,
            emoji: emote.emoji,
            emojiVisible: emote.emojiVisible,
            emojiBubbleVisible: emote.emojiBubbleVisible
          },
          emote: {
            ...emote,
            x: emotePosition.x,
            y: emotePosition.y,
            emojiX: emojiPosition.x,
            emojiY: emojiPosition.y
          },
          tailAnimation
        };
      }),
      foods: scene.foods.map((food: any) => ({
        x: scene.tankToScreenPoint(food.sprite.x, food.sprite.y).x,
        y: scene.tankToScreenPoint(food.sprite.x, food.sprite.y).y,
        displayWidth: food.sprite.displayWidth * scene.tankViewScaleForLevel(),
        foodType: food.foodType.id,
        textureKey: food.sprite.texture.key,
        visualTint: food.visualTint,
        sinkSpeed: food.sinkSpeed * scene.tankViewScaleForLevel(),
        calories: food.foodType.calories,
        densityLevel: food.foodType.densityLevel
      })),
      helperCreatures: scene.helperCreatures.map((helper: any) => ({
        typeId: helper.type.id,
        typeName: helper.type.name,
        tankLevel: helper.tankLevel,
        visible: helper.sprite.visible,
        x: scene.tankToScreenPoint(helper.sprite.x, helper.sprite.y).x,
        y: scene.tankToScreenPoint(helper.sprite.x, helper.sprite.y).y,
        speed: helper.type.speed * scene.tankViewScaleForLevel(),
        sellPrice: scene.helperSellPrice(helper.type)
      })),
      coinsWaiting: scene.coinDrops.map((coin: any) => ({
        x: scene.tankToScreenPoint(coin.sprite.x, coin.sprite.y).x,
        y: scene.tankToScreenPoint(coin.sprite.x, coin.sprite.y).y,
        value: coin.value,
        coinType: coin.coinType,
        textureKey: coin.sprite.texture.key,
        tint: coin.visual.tint,
        textColor: coin.visual.textColor,
        sinkSpeed: coin.sinkSpeed * scene.tankViewScaleForLevel(),
        displayWidth: coin.sprite.displayWidth * scene.tankViewScaleForLevel(),
        labelFontSize: Number.parseFloat(`${coin.valueText.style.fontSize}`) * scene.tankViewScaleForLevel(),
        bottomY: scene.tankToScreenPoint(coin.sprite.x, coin.bottomY).y,
        atBottom: coin.atBottom
      }))
    }),
    setFishVitals: (index: number, hunger: number, health: number) => {
      const targetFish = scene.fish[index];
      if (!targetFish) {
        return;
      }

      targetFish.hunger = Phaser.Math.Clamp(hunger, overfullHungerFloor, 100);
      targetFish.health = Phaser.Math.Clamp(health, 0, 100);
      targetFish.setContinuousHungerSeconds(targetFish.hunger > 68 && targetFish.health < 35 ? 5 * 60 : 0);
      if (!targetFish.isInFatalCareState()) {
        targetFish.fatalCareSeconds = 0;
      }
      targetFish.refreshStatusBars();
    },
    setFishContinuousHungerSeconds: (index: number, seconds: number) => {
      const targetFish = scene.fish[index];
      if (!targetFish) {
        return;
      }

      targetFish.setContinuousHungerSeconds(seconds);
      if (!targetFish.isInFatalCareState()) {
        targetFish.fatalCareSeconds = 0;
      }
      targetFish.refreshStatusBars();
    },
    setFishFatalCareSeconds: (index: number, seconds: number) => {
      const targetFish = scene.fish[index];
      if (!targetFish) {
        return;
      }

      targetFish.fatalCareSeconds = targetFish.isInFatalCareState() ? Phaser.Math.Clamp(seconds, 0, 24 * 60 * 60) : 0;
    },
    setFishPosition: (index: number, x: number, y: number) => {
      const targetFish = scene.fish[index];
      if (!targetFish) {
        return;
      }

      targetFish.sprite.setPosition(
        Phaser.Math.Clamp(x, tankBounds.left + 28, tankBounds.right - 28),
        Phaser.Math.Clamp(y, tankBounds.top + 26, tankBounds.bottom - 26)
      );
      targetFish.refreshStatusBars();
    },
    addFishForTest: (fishTypeId: string, x: number, y: number) => {
      const fishType = fishTypes.find((item) => item.id === fishTypeId);
      if (!fishType) {
        return;
      }

      scene.addFishToTank(
        fishType,
        Phaser.Math.Clamp(x, tankBounds.left + 28, tankBounds.right - 28),
        Phaser.Math.Clamp(y, tankBounds.top + 26, tankBounds.bottom - 26)
      );
      scene.refreshUi();
    },
    setFishGender: (index: number, gender: FishGender) => {
      const targetFish = scene.fish[index];
      if (!targetFish) {
        return;
      }

      targetFish.gender = gender === "F" ? "F" : "M";
      scene.renderTabControls();
      scene.refreshUi();
    },
    removeFishAt: (index: number) => {
      const targetFish = scene.fish[index];
      if (!targetFish) {
        return;
      }

      scene.fish.splice(index, 1);
      targetFish.destroy();
      scene.refreshUi();
    },
    forceCoinReady: (index: number) => {
      const targetFish = scene.fish[index];
      if (!targetFish) {
        return;
      }

      targetFish.nextCoinDropAt = 0;
    },
    forceProductionDrop: (index: number) => {
      const targetFish = scene.fish[index];
      if (!targetFish || targetFish.state === "ill" || scene.coinDrops.length >= maxCoinDrops) {
        return;
      }

      scene.createCoinDrop(targetFish.sprite.x, targetFish.sprite.y - 24, 1, "common");
      scene.refreshUi();
    },
    forceFishAge: (index: number, ageSeconds: number) => {
      const targetFish = scene.fish[index];
      if (!targetFish) {
        return;
      }

      targetFish.setAgeSeconds(ageSeconds);
    },
    saveNow: () => {
      scene.saveNow();
    },
    clearSave: () => {
      clearSave();
    },
    backdateSave: (seconds: number) => {
      scene.saveNow(Date.now() - Math.max(0, seconds) * 1000);
    },
    closeModal: () => {
      scene.closeModal();
    },
    setScreen: (screen: string) => {
      if (screen === "tank") {
        scene.returnToTankScreen();
      } else {
        scene.openScreen(screen);
      }
    },
    setStoreTab: (tab: StoreTab) => {
      scene.activeScreen = "store";
      scene.activeTab = tab;
      scene.syncCoinDropVisibilityAndInput();
      scene.createScreenNav();
      scene.createFoodDock();
      scene.renderTabControls();
      scene.refreshUi(false);
    },
    setStoreCoinFilter: (coinType: CoinType) => {
      if (coinType === "common" || coinType === "rare" || coinType === "superRare") {
        scene.setStoreCoinFilter(coinType);
      }
    },
    setFishCatalogLevel: (level: number) => {
      scene.fishCatalogLevel = Phaser.Math.Clamp(Math.floor(level), 1, maxFishCatalogLevel);
      scene.renderTabControls();
      scene.refreshUi(false);
    },
    buyFish: (fishTypeId: string) => {
      const fishType = fishTypes.find((item) => item.id === fishTypeId);
      if (fishType) {
        scene.buyFish(fishType);
      }
    },
    placeFishFromInventory: (fishTypeId: string, x: number, y: number) => {
      const fishType = fishTypes.find((item) => item.id === fishTypeId);
      if (!fishType) {
        return;
      }
      if (scene.getFishInventory(fishType.id) <= 0) {
        const pendingTankBubble = scene.fishDeliveryBubbles?.bubbles.find((pending: any) => pending.destination === "tank" && pending.type.id === fishType.id);
        if (pendingTankBubble) {
          scene.popFishInventoryBubble(pendingTankBubble);
        }
        return;
      }

      const previousBubbleCount = scene.fishDeliveryBubbles?.bubbles.length ?? 0;
      scene.placeFishWithCompatibility(
        fishType,
        Phaser.Math.Clamp(x, tankBounds.left + 28, tankBounds.right - 28),
        Phaser.Math.Clamp(y, tankBounds.top + 26, tankBounds.bottom - 26)
      );
      const pendingTankBubble = scene.fishDeliveryBubbles?.bubbles
        .slice(previousBubbleCount)
        .find((pending: any) => pending.destination === "tank" && pending.type.id === fishType.id);
      if (pendingTankBubble) {
        scene.popFishInventoryBubble(pendingTankBubble);
      }
    },
    buyFood: (foodTypeId?: FoodTypeId) => {
      const foodType = foodTypes.find((item) => item.id === foodTypeId) ?? scene.getSelectedFoodType();
      scene.buyFood(foodType);
    },
    setFoodBuyQuantity: (foodTypeId: FoodTypeId, quantity: number) => {
      if (foodTypes.some((item) => item.id === foodTypeId)) {
        scene.setFoodBuyQuantity(foodTypeId, quantity);
      }
    },
    addFoodBuyQuantity: (foodTypeId: FoodTypeId, quantity: number) => {
      if (foodTypes.some((item) => item.id === foodTypeId)) {
        scene.addFoodBuyQuantity(foodTypeId, quantity);
      }
    },
    resetFoodBuyQuantity: (foodTypeId: FoodTypeId) => {
      if (foodTypes.some((item) => item.id === foodTypeId)) {
        scene.resetFoodBuyQuantity(foodTypeId);
      }
    },
    buyDecoration: (decorationTypeId: string) => {
      const decorationType = decorationTypes.find((item) => item.id === decorationTypeId);
      if (decorationType) {
        scene.buyDecoration(decorationType);
        scene.selectDecoration(decorationType.id, "m");
      }
    },
    addFoodDispenserForTest: () => {
      scene.decorationInventory.set(foodDispenserInventoryKey, 1);
      scene.createFoodDock();
      scene.refreshUi();
    },
    removeFoodDispenserForTest: () => {
      scene.decorationInventory.delete(foodDispenserInventoryKey);
      scene.createFoodDock();
      scene.refreshUi();
    },
    buyHelperCreature: (creatureTypeId: string) => {
      const creatureType = helperCreatureTypes.find((item) => item.id === creatureTypeId);
      if (creatureType) {
        scene.buyHelperCreature(creatureType);
      }
    },
    addHelperCreatureForTest: (creatureTypeId: string, x: number) => {
      const creatureType = helperCreatureTypes.find((item) => item.id === creatureTypeId);
      if (!creatureType || scene.helperCreatures.length >= maxHelperCreatures) {
        return;
      }
      scene.addHelperCreatureToTank(creatureType, x);
      scene.refreshUi();
    },
    setHelperCreaturePosition: (index: number, x: number) => {
      const helper = scene.helperCreatures[index];
      if (!helper) {
        return;
      }
      helper.sprite.x = Phaser.Math.Clamp(x, tankBounds.left + 24, tankBounds.right - 24);
      helper.restoreProgress(helper.sprite.x);
    },
    clearHelperCreatures: () => {
      for (const helper of scene.helperCreatures) {
        helper.destroy();
      }
      scene.helperCreatures = [];
      scene.refreshUi();
    },
    sellHelperCreatureAt: (index: number) => {
      scene.sellHelperCreatureByIndex(index);
    },
    breedFishAt: (index: number, force?: "same" | "rare") => {
      scene.breedFish(index, force);
    },
    setFoodTool: (foodTypeId: FoodTypeId) => {
      scene.selectFood(foodTypeId);
    },
    openSellOldest: () => {
      scene.sellOldestFish();
    },
    sellFishAt: (index: number) => {
      scene.sellFishByIndex(index);
    },
    addFood: (foodTypeId: FoodTypeId, count: number) => {
      const foodType = foodTypes.find((item) => item.id === foodTypeId);
      const amount = Math.max(0, Math.floor(count));
      const inventoryAmount = foodType && scene.isCalorieTrackedFood(foodType.id) ? foodType.calories * amount : amount;
      scene.foodInventory.set(foodTypeId, scene.getFoodInventory(foodTypeId) + inventoryAmount);
      scene.createFoodDock();
      scene.refreshUi();
    },
    dropFoodForTest: (foodTypeId: FoodTypeId, x: number, y: number) => {
      const foodType = foodTypes.find((item) => item.id === foodTypeId);
      if (!foodType || scene.foods.length >= maxFoodDrops) {
        return;
      }

      const pellet = new FoodPellet(
        scene,
        Phaser.Math.Clamp(x, tankBounds.left + 18, tankBounds.right - 18),
        Phaser.Math.Clamp(y, tankBounds.top + 18, tankBounds.bottom - 18),
        foodType,
        { reservedCalories: foodType.calories }
      );
      pellet.setWorldScaleCompensation(scene.tankViewScaleForLevel());
      pellet.addToContainer(scene.tankLayer);
      scene.foods.push(pellet);
      scene.refreshUi();
    },
    dropStockedFoodForTest: (foodTypeId: FoodTypeId, x: number, y: number) => {
      scene.dropFoodAt(foodTypeId, x, y);
    },
    addWallet: (coinType: CoinType, amount: number) => {
      earn(scene.wallet, coinType, Math.max(0, Math.floor(amount)));
      scene.refreshUi();
    },
    addCoin: (coinType: CoinType, value: number, x: number, y: number) => {
      if (scene.coinDrops.length >= maxCoinDrops) {
        return;
      }
      scene.createCoinDrop(
        Phaser.Math.Clamp(x, tankBounds.left + 18, tankBounds.right - 18),
        Phaser.Math.Clamp(y, tankBounds.top + 18, tankBounds.bottom - 18),
        Math.max(1, Math.floor(value)),
        coinType
      );
      scene.refreshUi();
    },
    clearCoins: () => {
      for (const coin of scene.coinDrops) {
        coin.destroy();
      }
      scene.coinDrops = [];
      scene.refreshUi();
    },
    clearFoods: () => {
      for (const food of scene.foods) {
        food.destroy();
      }
      scene.foods = [];
      scene.refreshUi();
    },
    setCleanliness: (cleanliness: number) => {
      scene.cleanliness = Phaser.Math.Clamp(cleanliness, 0, 100);
      scene.cleaningTank = false;
      scene.updateDirtyTankOverlay();
      scene.refreshUi();
    }
  };
}
