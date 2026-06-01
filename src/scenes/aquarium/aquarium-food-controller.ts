import Phaser from "phaser";
import { foodTypes } from "../../data/content";
import { gameHeight, gameWidth, tankBounds, toastX, toastY } from "../../game/constants";
import {
  autoFoodBuyerInventoryKey,
  coinMagnetInventoryKey,
  foodDispenserMinIntervalMs,
  foodDispenserOutletRatio,
  foodDispenserPelletScale,
  planAutoFoodBuyerPurchase,
  planFoodDispenserDrop
} from "../../game/dispenser-system";
import { canAfford, formatNumber, spend } from "../../game/economy";
import {
  careFoodTargetForDrop as careFoodTargetForDropModel,
  chooseAutoFoodForFish as chooseAutoFoodForFishModel,
  chooseAutoPurchasableFood as chooseAutoPurchasableFoodModel,
  isDroppableFood,
  medianMealCaloriesNeeded as medianMealCaloriesNeededModel,
  recommendedFoodName,
  refundedFoodInventory,
  reserveFoodForDrop as reserveFoodForDropModel
} from "../../game/food-system";
import { FoodPellet } from "../../objects/FoodPellet";
import type { Fish } from "../../objects/Fish";
import type { FoodType, FoodTypeId, Price, Wallet } from "../../types/mechanics";
import {
  autoFoodBuyerPurchaseCooldownMs,
  autoFoodBuyerPurchaseQuantity,
  maxFoodDrops,
  type PlacementMode
} from "./aquarium-scene-config";

export type AquariumFoodControllerHost = {
  scene: Phaser.Scene;
  getWallet: () => Wallet;
  isDeveloperGodMode: () => boolean;
  getFoods: () => FoodPellet[];
  getFoodPelletPool: () => FoodPellet[];
  getFoodInventory: (foodTypeId: FoodTypeId) => number;
  setFoodInventory: (foodTypeId: FoodTypeId, amount: number) => void;
  getTotalFeedableFoodInventory: () => number;
  getCareFoodTarget: (foodTypeId: FoodTypeId) => Fish | undefined;
  clearCareFoodTarget: (foodTypeId: FoodTypeId) => void;
  activeFish: () => Fish[];
  setSelectedFoodTypeId: (foodTypeId: FoodTypeId) => void;
  setPlacementMode: (mode: PlacementMode) => void;
  getCleanliness: () => number;
  setCleanliness: (cleanliness: number) => void;
  getTankLayer: () => Phaser.GameObjects.Container;
  tankViewScaleForLevel: () => number;
  screenToTankPoint: (x: number, y: number) => Phaser.Math.Vector2;
  getFoodDispenserElement: () => HTMLDivElement | undefined;
  getFoodDispenserY: () => number;
  hasFoodDispenser: () => boolean;
  getNextFoodDispenseAt: () => number;
  setNextFoodDispenseAt: (time: number) => void;
  hasAutoFoodBuyer: () => boolean;
  getNextAutoFoodBuyerPurchaseAt: () => number;
  setNextAutoFoodBuyerPurchaseAt: (time: number) => void;
  autoFoodBuyerTankPosition: () => Phaser.Math.Vector2;
  quantityPrice: (price: Price, quantity: number) => Price;
  priceWealth: (price: Price) => number;
  hasCoinMagnet: () => boolean;
  coinMagnetRemainingMinutes: () => number;
  autoFoodBuyerRemainingMinutes: () => number;
  getCoinMagnetWasActive: () => boolean;
  setCoinMagnetWasActive: (active: boolean) => void;
  getCoinMagnetDisplayedMinutes: () => number;
  setCoinMagnetDisplayedMinutes: (minutes: number) => void;
  getAutoFoodBuyerWasActive: () => boolean;
  setAutoFoodBuyerWasActive: (active: boolean) => void;
  getAutoFoodBuyerDisplayedMinutes: () => number;
  setAutoFoodBuyerDisplayedMinutes: (minutes: number) => void;
  deleteDecorationInventory: (inventoryKey: string) => void;
  clearMagnetCollectingCoins: () => void;
  floatText: (message: string, x: number, y: number, color: string) => void;
  floatTankText: (message: string, x: number, y: number, color: string) => void;
  recordDailyQuestAction: (action: string) => void;
  createFoodDock: () => void;
  refreshUi: (renderControls?: boolean) => void;
  refreshStoreOverlay: () => void;
  saveNow: () => void;
};

export class AquariumFoodController {
  public constructor(private readonly host: AquariumFoodControllerHost) {}

  public dropFoodAt(foodTypeId: FoodTypeId, x: number, y: number): void {
    const foodType = foodTypes.find((item) => item.id === foodTypeId);
    if (!foodType || !isDroppableFood(foodType.id) || this.host.getFoodInventory(foodType.id) <= 0) {
      return;
    }
    if (this.host.getFoods().length >= maxFoodDrops) {
      this.host.floatTankText("Too much food", x, y - 18, "#ffdd8a");
      return;
    }

    this.host.setSelectedFoodTypeId(foodType.id);
    const reservedCalories = this.reserveFoodForDrop(foodType);
    if (reservedCalories <= 0) {
      return;
    }
    const targetFish = this.careFoodTargetForDrop(foodType.id);
    const dropX = Phaser.Math.Clamp(x, tankBounds.left + 18, tankBounds.right - 18);
    const dropY = Phaser.Math.Clamp(y, tankBounds.top + 18, tankBounds.bottom - 18);
    const pool = this.host.getFoodPelletPool();
    const pooledPellet = pool.pop();
    let pellet: FoodPellet | undefined;
    if (pooledPellet) {
      pooledPellet.reset(dropX, dropY, foodType, {
        reservedCalories,
        targetFish,
        medicineActsAsFood: foodType.id === "medicine" && !this.host.activeFish().some((fish) => fish.state === "ill" || fish.health < 82)
      });
    } else {
      pellet = new FoodPellet(
        this.host.scene,
        dropX,
        dropY,
        foodType,
        { reservedCalories, targetFish, medicineActsAsFood: foodType.id === "medicine" && !this.host.activeFish().some((fish) => fish.state === "ill" || fish.health < 82) }
      );
    }
    if (targetFish) {
      this.host.clearCareFoodTarget(foodType.id);
    }
    const food = pooledPellet ?? pellet!;
    food.setWorldScaleCompensation(this.host.tankViewScaleForLevel());
    food.addToContainer(this.host.getTankLayer());
    this.host.getFoods().push(food);
    this.host.setCleanliness(Phaser.Math.Clamp(this.host.getCleanliness() - 1.2, 0, 100));
    this.host.recordDailyQuestAction("drop-food");
    this.host.setPlacementMode({ kind: "none" });
    this.host.refreshUi();
    this.host.createFoodDock();
    this.host.saveNow();
  }

  public careFoodTargetForDrop(foodTypeId: FoodTypeId): Fish | undefined {
    return careFoodTargetForDropModel(foodTypeId, this.host.getCareFoodTarget(foodTypeId), this.host.activeFish());
  }

  public reserveFoodForDrop(foodType: FoodType): number {
    const { reservedCalories, nextInventory } = reserveFoodForDropModel(foodType, this.host.getFoodInventory(foodType.id));
    this.host.setFoodInventory(foodType.id, nextInventory);
    return reservedCalories;
  }

  public refundUnusedFood(food: FoodPellet, consumedCalories = 0): void {
    this.host.setFoodInventory(food.foodType.id, refundedFoodInventory({
      foodTypeId: food.foodType.id,
      reservedNutrition: food.reservedNutrition,
      consumedCalories,
      currentInventory: this.host.getFoodInventory(food.foodType.id)
    }));
  }

  public updateFoodDispenser(tankFish = this.host.activeFish()): void {
    const plan = planFoodDispenserDrop({
      hasFoodDispenser: this.host.hasFoodDispenser(),
      now: this.host.scene.time.now,
      nextFoodDispenseAt: this.host.getNextFoodDispenseAt(),
      foods: this.host.getFoods(),
      maxFoodDrops,
      minIntervalMs: foodDispenserMinIntervalMs,
      tankFish,
      medicineInventory: this.host.getFoodInventory("medicine"),
      foodTypes,
      chooseAutoFoodForFish: (targetFish) => this.chooseAutoFoodForFish(targetFish)
    });
    if (!plan) {
      return;
    }

    this.host.setNextFoodDispenseAt(plan.nextDispenseAt);
    const outlet = this.foodDispenserOutletPosition();
    const reservedCalories = this.reserveFoodForDrop(plan.foodType);
    if (reservedCalories <= 0) {
      return;
    }
    const throwVelocity = this.foodDispenserThrowVelocity(outlet);
    const pool = this.host.getFoodPelletPool();
    const pooledPellet = pool.pop();
    let dispenserPellet: FoodPellet | undefined;
    if (pooledPellet) {
      pooledPellet.reset(outlet.x, outlet.y, plan.foodType, {
        velocityX: throwVelocity.x,
        velocityY: throwVelocity.y,
        displayScale: foodDispenserPelletScale,
        reservedCalories,
        source: "dispenser"
      });
    } else {
      dispenserPellet = new FoodPellet(this.host.scene, outlet.x, outlet.y, plan.foodType, {
        velocityX: throwVelocity.x,
        velocityY: throwVelocity.y,
        displayScale: foodDispenserPelletScale,
        reservedCalories,
        source: "dispenser"
      });
    }
    const dispensedFood = pooledPellet ?? dispenserPellet!;
    dispensedFood.setWorldScaleCompensation(this.host.tankViewScaleForLevel());
    dispensedFood.addToContainer(this.host.getTankLayer());
    this.host.getFoods().push(dispensedFood);
    this.host.setCleanliness(Phaser.Math.Clamp(this.host.getCleanliness() - 0.4, 0, 100));
    this.host.recordDailyQuestAction(plan.isMedicine ? "dispenser-medicine" : "dispenser-food");
    this.host.floatTankText(plan.isMedicine ? "Medicine" : "Food", outlet.x + 18, outlet.y - 10, plan.isMedicine ? "#a8ffb0" : "#f7ff9a");
    this.host.createFoodDock();
    this.host.refreshUi(false);
    this.host.saveNow();
  }

  public foodDispenserOutletPosition(): Phaser.Math.Vector2 {
    const sourceElement = this.host.getFoodDispenserElement()?.querySelector("img") ?? this.host.getFoodDispenserElement();
    const dispenserRect = sourceElement?.getBoundingClientRect();
    const canvasRect = this.host.scene.game.canvas.getBoundingClientRect();
    if (dispenserRect && dispenserRect.width > 0 && dispenserRect.height > 0 && canvasRect.width > 0 && canvasRect.height > 0) {
      const clientX = dispenserRect.left + dispenserRect.width * foodDispenserOutletRatio.x;
      const clientY = dispenserRect.top + dispenserRect.height * foodDispenserOutletRatio.y;
      const designX = Phaser.Math.Clamp(((clientX - canvasRect.left) / canvasRect.width) * gameWidth, 0, gameWidth);
      const designY = Phaser.Math.Clamp(((clientY - canvasRect.top) / canvasRect.height) * gameHeight, 0, gameHeight);
      return this.host.screenToTankPoint(designX, designY);
    }

    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp(tankBounds.left + 58, tankBounds.left + 12, tankBounds.right - 12),
      Phaser.Math.Clamp(this.host.getFoodDispenserY() + 34, tankBounds.top + 24, tankBounds.bottom - 18)
    );
  }

  public foodDispenserThrowVelocity(outlet: Phaser.Math.Vector2): Phaser.Math.Vector2 {
    const target = new Phaser.Math.Vector2((tankBounds.left + tankBounds.right) / 2, (tankBounds.top + tankBounds.bottom) / 2);
    const direction = target.subtract(outlet);
    if (direction.lengthSq() <= 1) {
      return new Phaser.Math.Vector2(0, 18);
    }

    const distance = direction.length();
    const power = Phaser.Math.Clamp(distance * 1.35, 150, 280);
    return direction.normalize().scale(power);
  }

  public chooseAutoFoodForFish(targetFish: Fish): FoodType | undefined {
    return chooseAutoFoodForFishModel(foodTypes, targetFish, (foodTypeId) => this.host.getFoodInventory(foodTypeId));
  }

  public updateAutoFoodBuyer(tankFish = this.host.activeFish()): void {
    const plan = planAutoFoodBuyerPurchase({
      hasAutoFoodBuyer: this.host.hasAutoFoodBuyer(),
      now: this.host.scene.time.now,
      nextPurchaseAt: this.host.getNextAutoFoodBuyerPurchaseAt(),
      looseFoodCount: this.host.getFoods().length,
      maxFoodDrops,
      feedableFoodInventory: this.host.getTotalFeedableFoodInventory(),
      purchaseQuantity: autoFoodBuyerPurchaseQuantity,
      purchaseCooldownMs: autoFoodBuyerPurchaseCooldownMs,
      chooseFoodType: () => this.chooseAutoPurchasableFood(tankFish),
      quantityPrice: (price, quantity) => this.host.quantityPrice(price, quantity)
    });
    if (!plan) {
      return;
    }

    if (!this.host.isDeveloperGodMode() && !spend(this.host.getWallet(), plan.totalPrice)) {
      this.host.setNextAutoFoodBuyerPurchaseAt(this.host.scene.time.now + autoFoodBuyerPurchaseCooldownMs);
      return;
    }

    this.host.setFoodInventory(plan.foodType.id, this.host.getFoodInventory(plan.foodType.id) + plan.foodType.calories * autoFoodBuyerPurchaseQuantity);
    this.host.setNextAutoFoodBuyerPurchaseAt(plan.nextPurchaseAt);
    this.host.recordDailyQuestAction("buy-food");
    this.host.recordDailyQuestAction("auto-buy-food");
    const position = this.host.autoFoodBuyerTankPosition();
    this.host.floatTankText(`Bought ${plan.foodType.name} x${formatNumber(autoFoodBuyerPurchaseQuantity)}`, position.x + 22, position.y - 10, "#a8ffb0");
    this.host.createFoodDock();
    this.host.refreshUi(false);
    this.host.saveNow();
  }

  public chooseAutoPurchasableFood(tankFish = this.host.activeFish()): FoodType | undefined {
    return chooseAutoPurchasableFoodModel({
      foodTypes,
      tankFish,
      developerGodMode: this.host.isDeveloperGodMode(),
      canAfford: (price) => canAfford(this.host.getWallet(), price),
      priceWealth: (price) => this.host.priceWealth(price)
    });
  }

  public medianMealCaloriesNeeded(tankFish = this.host.activeFish()): number {
    return medianMealCaloriesNeededModel(tankFish);
  }

  public foodNeedMessage(targetCalories: number): string {
    return recommendedFoodName(foodTypes, targetCalories);
  }

  public updateTimedUtilities(): void {
    const coinMagnetActive = this.host.hasCoinMagnet();
    const remainingMinutes = coinMagnetActive ? this.host.coinMagnetRemainingMinutes() : 0;
    const autoFoodBuyerActive = this.host.hasAutoFoodBuyer();
    const autoFoodBuyerRemainingMinutes = autoFoodBuyerActive ? this.host.autoFoodBuyerRemainingMinutes() : 0;
    if (
      coinMagnetActive === this.host.getCoinMagnetWasActive() &&
      remainingMinutes === this.host.getCoinMagnetDisplayedMinutes() &&
      autoFoodBuyerActive === this.host.getAutoFoodBuyerWasActive() &&
      autoFoodBuyerRemainingMinutes === this.host.getAutoFoodBuyerDisplayedMinutes()
    ) {
      return;
    }

    const wasActive = this.host.getCoinMagnetWasActive();
    this.host.setCoinMagnetWasActive(coinMagnetActive);
    this.host.setCoinMagnetDisplayedMinutes(remainingMinutes);
    if (wasActive && !coinMagnetActive) {
      this.host.deleteDecorationInventory(coinMagnetInventoryKey);
      this.host.clearMagnetCollectingCoins();
      this.host.floatText("Coin Magnet expired", toastX, toastY, "#d7f4ff");
      this.host.saveNow();
    }
    const autoBuyerWasActive = this.host.getAutoFoodBuyerWasActive();
    this.host.setAutoFoodBuyerWasActive(autoFoodBuyerActive);
    this.host.setAutoFoodBuyerDisplayedMinutes(autoFoodBuyerRemainingMinutes);
    if (autoBuyerWasActive && !autoFoodBuyerActive) {
      this.host.deleteDecorationInventory(autoFoodBuyerInventoryKey);
      this.host.floatText("Auto Buyer expired", toastX, toastY, "#d7f4ff");
      this.host.saveNow();
    }
    this.host.createFoodDock();
    this.host.refreshStoreOverlay();
  }
}
