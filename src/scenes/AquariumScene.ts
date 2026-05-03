import Phaser from "phaser";
import { basicFood, decorationTypes, fishTypes, foodTypes, helperCreatureTypes } from "../data/content";
import { controlPanelTop, gameHeight, gameWidth, setTankWorldScale, tankBounds, tankViewportBounds, toastX, toastY } from "../game/constants";
import { canAfford, createWallet, earn, formatNumber, formatPrice, formatWallet, spend } from "../game/economy";
import {
  calculateOfflineSeconds,
  clearSave,
  createEmptyWallet,
  loadGame,
  mapToRecord,
  recordToMap,
  saveGame,
  SAVE_VERSION,
  type OfflineProgress,
  type SavedGame
} from "../game/save";
import { fishFoodTintFor, foodTintFor, rarityStarCount } from "../game/visuals";
import { CoinDrop } from "../objects/CoinDrop";
import { Fish } from "../objects/Fish";
import { FoodPellet } from "../objects/FoodPellet";
import { HelperCreature } from "../objects/HelperCreature";
import type { CoinType, DecorationType, FishGender, FishState, FishType, FoodType, FoodTypeId, HelperCreatureType, StoreTab, Wallet } from "../types/mechanics";

type AppScreen = "tank" | "store" | "care" | "album" | "goals" | "settings";

type PlacementMode =
  | { kind: "none" }
  | { kind: "fish"; fishTypeId: string }
  | { kind: "food"; foodTypeId: FoodTypeId }
  | { kind: "decoration"; decorationTypeId: string };

type PlacedDecoration = {
  typeId: string;
  image: Phaser.GameObjects.Image;
};

type CompatibilitySummary = {
  score: number;
  level: "good";
  warnings: string[];
  incompatibleNames: string[];
};

const maxCoinDrops = 5;
const fishCapacityByTankLevel: Record<number, number> = {
  1: 10,
  2: 14,
  3: 18,
  4: 22,
  5: 30
};
const maxDecorations = 8;
const maxHelperCreatures = 5;
const maxTankLevel = 5;
const rentalMinuteMs = 60_000;
const minRentalMinutes = 1;
const maxRentalMinutes = 60;
const decorationTrashZone = new Phaser.Geom.Rectangle(gameWidth / 2 - 48, gameHeight - 88, 96, 60);
const autoFeederPrice: FishType["price"] = { coinType: "common", amount: 18 };
const autoCollectorPrice: FishType["price"] = { coinType: "common", amount: 22 };
const evolvePillFoodTypeId: FoodTypeId = "evolve";
const maxEvolutionStage = 3;
const foodBulkBuyQuantities = [1, 10, 20, 30, 50];
const tankUpgradePrices: Record<number, FishType["price"]> = {
  2: { coinType: "common", amount: 100 },
  3: { coinType: "common", amount: 420 },
  4: { coinType: "rare", amount: 8 },
  5: { coinType: "superRare", amount: 3 }
};
const tankPatternStyles = [
  { id: "lagoon-ripples", base: 0x0b7097, accent: 0x8be7ff, secondary: 0x2ab6cb, sand: 0xd5b46d },
  { id: "kelp-stripes", base: 0x0b7c88, accent: 0x74e6a7, secondary: 0x16745f, sand: 0xc9b96e },
  { id: "coral-diamonds", base: 0x126f9f, accent: 0xffb07c, secondary: 0x7dc6ff, sand: 0xd8a96b },
  { id: "deep-current", base: 0x143b82, accent: 0x9bd5ff, secondary: 0x4b77c7, sand: 0xc9c078 },
  { id: "starlit-reef", base: 0x1c2a68, accent: 0xffd86b, secondary: 0xb48cff, sand: 0xbfb279 }
] as const;
const coinWealthValue: Record<CoinType, number> = {
  common: 1,
  rare: 100,
  superRare: 1000
};

type AquariumTestSnapshot = {
  coins: number;
  wallet: Wallet;
  foodInventory: number;
  foodInventoryByType: Record<string, number>;
  foodBuyQuantities: Record<string, number>;
  activeScreen: AppScreen;
  activeTab: StoreTab;
  storeCoinFilter: CoinType;
  fishCatalogLevel: number;
  placementMode: PlacementMode["kind"];
  fishCount: number;
  maxFishCapacity: number;
  helperCreatureCount: number;
  maxHelperCreatures: number;
  tankLevel: number;
  maxTankLevel: number;
  tankViewScale: number;
  tankPattern: {
    id: string;
    base: number;
    accent: number;
    secondary: number;
    sand: number;
  };
  tankWorldBounds: { left: number; top: number; right: number; bottom: number; width: number; height: number };
  tankScreenEdges: { left: number; top: number; right: number; bottom: number };
  totalWealth: number;
  tankNeedIndicator: string;
  tankHudText: string;
  tankStatusText: string;
  tankCareText: string;
  fishTypeCount: number;
  helperCreatureTypeCount: number;
  visibleFishCatalogCount: number;
  visibleStoreCatalogCount: number;
  nextTankUpgradePrice?: FishType["price"];
  numberFormatSamples: {
    small: string;
    thousand: string;
    million: string;
    billion: string;
  };
  foodCount: number;
  coinDropCount: number;
      decorationCount: number;
      decorations: Array<{ typeId: string; x: number; y: number; depth: number }>;
      decorationTrashTarget: { visible: boolean; x: number; y: number };
      cleanliness: number;
      happiness: number;
      compatibilityScore: number;
      modalTitle?: string;
  saved: boolean;
  offlineProgress: OfflineProgress;
  rentals: {
    autoFeederRemainingMs: number;
    autoCollectorRemainingMs: number;
    autoFeederActive: boolean;
    autoCollectorActive: boolean;
    autoFeederMinutes: number;
    autoCollectorMinutes: number;
    autoFeederPrice: number;
    autoCollectorPrice: number;
  };
  fish: Array<{
    typeId: string;
    typeName: string;
    state: FishState;
    ageLabel: string;
    ageSeconds: number;
    ageMonths: number;
    ageYears: number;
    growthCapAgeYears: number;
    naturalAgeScale: number;
    tankGrowthScaleCap: number;
    growthBlockedByTank: boolean;
    gender: FishGender;
    evolutionStage: number;
    fatalCareSeconds: number;
    fatalCareRemainingSeconds: number;
    evolutionFee: FishType["price"];
    hunger: number;
    health: number;
    x: number;
    y: number;
    scale: number;
    veryBigScaleCap: number;
    movementSizeMultiplier: number;
    bodyTint: number;
    sellValue: number;
    nextCoinDropInMs: number;
    statusBars: {
      visible: boolean;
      x: number;
      y: number;
      fullnessRatio: number;
      moodRatio: number;
      tailTint: number;
      rarityStars: number;
      fullyGrown: boolean;
      growthBlockedByTank: boolean;
      emoji: string;
      emojiVisible: boolean;
      emojiX: number;
      emojiY: number;
      emojiBubbleVisible: boolean;
    };
  }>;
  foods: Array<{ x: number; y: number; foodType: FoodTypeId; textureKey: string; visualTint: number; sinkSpeed: number }>;
  helperCreatures: Array<{ typeId: string; typeName: string; x: number; y: number; speed: number; sellPrice: FishType["price"]; feedSeconds?: number }>;
  maxCoinDrops: number;
  coinsWaiting: Array<{
    x: number;
    y: number;
    value: number;
    coinType: CoinType;
    tint: number;
    textColor: string;
    sinkSpeed: number;
    bottomY: number;
    atBottom: boolean;
  }>;
};

declare global {
  interface Window {
    __aquariumTest?: {
      getSnapshot: () => AquariumTestSnapshot;
      setFishVitals: (index: number, hunger: number, health: number) => void;
      setFishFatalCareSeconds: (index: number, seconds: number) => void;
      setFishPosition: (index: number, x: number, y: number) => void;
      addFishForTest: (fishTypeId: string, x: number, y: number) => void;
      setFishGender: (index: number, gender: FishGender) => void;
      removeFishAt: (index: number) => void;
      forceCoinReady: (index: number) => void;
      forceFishAge: (index: number, ageSeconds: number) => void;
      saveNow: () => void;
      clearSave: () => void;
      backdateSave: (seconds: number) => void;
      closeModal: () => void;
      setScreen: (screen: AppScreen) => void;
      setStoreTab: (tab: StoreTab) => void;
      setStoreCoinFilter: (coinType: CoinType) => void;
      setFishCatalogLevel: (level: number) => void;
      upgradeTank: () => void;
      buyFish: (fishTypeId: string) => void;
      buyFood: (foodTypeId?: FoodTypeId) => void;
      setFoodBuyQuantity: (foodTypeId: FoodTypeId, quantity: number) => void;
      addFoodBuyQuantity: (foodTypeId: FoodTypeId, quantity: number) => void;
      resetFoodBuyQuantity: (foodTypeId: FoodTypeId) => void;
      buyDecoration: (decorationTypeId: string) => void;
      buyHelperCreature: (creatureTypeId: string) => void;
      addHelperCreatureForTest: (creatureTypeId: string, x: number) => void;
      setHelperCreaturePosition: (index: number, x: number) => void;
      clearHelperCreatures: () => void;
      sellHelperCreatureAt: (index: number) => void;
      evolveFishAt: (index: number, force?: "success" | "death") => void;
      breedFishAt: (index: number, force?: "same" | "rare") => void;
      setFoodTool: (foodTypeId: FoodTypeId) => void;
      openSellOldest: () => void;
      sellFishAt: (index: number) => void;
      addFood: (foodTypeId: FoodTypeId, count: number) => void;
      addWallet: (coinType: CoinType, amount: number) => void;
      addCoin: (coinType: CoinType, value: number, x: number, y: number) => void;
      clearCoins: () => void;
      clearFoods: () => void;
      rentAutoFeeder: () => void;
      rentAutoCollector: () => void;
      setRentalMinutes: (rental: "feeder" | "collector", minutes: number) => void;
      runAutoFeederNow: () => void;
      expireRentals: () => void;
    };
  }
}

export class AquariumScene extends Phaser.Scene {
  private wallet = createWallet(120, 0, 0);
  private foodInventory = new Map<FoodTypeId, number>([[basicFood.id, 3]]);
  private foodBuyQuantities = new Map<FoodTypeId, number>();
  private fishInventory = new Map<string, number>();
  private decorationInventory = new Map<string, number>();
  private creatureInventory = new Map<string, number>();
  private fish: Fish[] = [];
  private foods: FoodPellet[] = [];
  private coinDrops: CoinDrop[] = [];
  private helperCreatures: HelperCreature[] = [];
  private placementMode: PlacementMode = { kind: "none" };
  private activeScreen: AppScreen = "tank";
  private activeTab: StoreTab = "fish";
  private storeCoinFilter: CoinType = "common";
  private selectedFoodTypeId: FoodTypeId = basicFood.id;
  private placedDecorations: PlacedDecoration[] = [];
  private offlineProgress: OfflineProgress = { elapsedSeconds: 0, earned: createEmptyWallet() };
  private autosaveElapsed = 0;
  private cleanliness = 100;
  private cleanedAt = Date.now();
  private settings = { sound: true, music: true, reducedMotion: false, notifications: false };
  private dailyGoals = { date: this.localDateKey(), claimed: [] as string[] };
  private autoFeederEndsAt = 0;
  private autoCollectorEndsAt = 0;
  private nextAutoFeedAt = 0;
  private nextAutoCollectAt = 0;
  private autoFeederMinutes = 1;
  private autoCollectorMinutes = 1;
  private tankLevel = 1;
  private fishCatalogLevel = 1;
  private selectedFishIndex?: number;
  private tankLayer!: Phaser.GameObjects.Container;
  private tankPatternLayer!: Phaser.GameObjects.Container;
  private tankSand!: Phaser.GameObjects.Rectangle;
  private decorationTrashTarget!: Phaser.GameObjects.Container;
  private decorationTrashBackground!: Phaser.GameObjects.Rectangle;
  private decorationTrashText!: Phaser.GameObjects.Text;
  private draggedDecoration?: PlacedDecoration;
  private hudPanel!: Phaser.GameObjects.Graphics;
  private hudText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private modeText!: Phaser.GameObjects.Text;
  private pagePanel?: Phaser.GameObjects.Container;
  private screenButtons: Phaser.GameObjects.Container[] = [];
  private foodButtons: Phaser.GameObjects.Container[] = [];
  private tabButtons: Phaser.GameObjects.Container[] = [];
  private tabControls: Phaser.GameObjects.Container[] = [];
  private modal?: Phaser.GameObjects.Container;
  private modalTitle?: string;

  public constructor() {
    super("AquariumScene");
  }

  public create(): void {
    this.createTextures();
    this.createWorld();
    this.createUi();
    this.restoreSavedGame();
    this.installTestHooks();
    this.refreshUi();

    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.handleTankPointer(pointer);
    });
  }

  public update(_time: number, delta: number): void {
    const deltaSeconds = delta / 1000;
    const now = this.time.now;

    this.foods.forEach((food) => food.update(deltaSeconds));
    this.coinDrops.forEach((coin) => coin.update(deltaSeconds));
    this.updateHelperCreatures(deltaSeconds);
    this.updateRentals();
    this.cleanliness = Phaser.Math.Clamp(
      this.cleanliness - (0.05 + this.fish.length * 0.018 + this.foods.length * 0.045) * deltaSeconds,
      0,
      100
    );
    const fishToRemove: Fish[] = [];
    for (const currentFish of this.fish) {
      const previousAgeStage = currentFish.ageStage;
      const eatenFood = currentFish.update(deltaSeconds, this.foods);
      if (currentFish.ageStage !== previousAgeStage) {
        this.saveNow();
      }

      if (eatenFood) {
        const ateMedicine = eatenFood.accepted && eatenFood.food.foodType.id === "medicine";
        this.removeFood(eatenFood.food);
        if (ateMedicine) {
          currentFish.applyMedicine(this.time.now);
          this.floatTankText("Healed", currentFish.sprite.x, currentFish.sprite.y - 26, "#a8ffb0");
        } else {
          this.floatTankText(eatenFood.accepted ? "Yum" : "Nope", currentFish.sprite.x, currentFish.sprite.y - 26, eatenFood.accepted ? "#f7ff9a" : "#ffb0a8");
        }
        if (!eatenFood.accepted) {
          this.cleanliness = Phaser.Math.Clamp(this.cleanliness - 4, 0, 100);
        }
        this.saveNow();
      }

      if (currentFish.canDropCoin(now) && this.coinDrops.length < maxCoinDrops) {
        currentFish.markCoinDropped(now);
        this.dropCoin(currentFish);
      }

      if (this.cleanliness < 35 && currentFish.hunger > 72) {
        currentFish.health = Phaser.Math.Clamp(currentFish.health - 1.8 * deltaSeconds, 0, 100);
      }

      if (currentFish.isDeadFromNeglect()) {
        fishToRemove.push(currentFish);
      }
    }

    if (fishToRemove.length > 0) {
      for (const deadFish of fishToRemove) {
        const index = this.fish.indexOf(deadFish);
        if (index < 0) {
          continue;
        }
        const x = deadFish.sprite.x;
        const y = deadFish.sprite.y;
        const name = deadFish.type.name;
        this.removeFishAt(index);
        this.floatTankText(`${name} died`, x, y - 30, "#ff8f9a");
      }
      this.closeModal();
      this.renderTabControls();
      this.refreshUi();
      this.saveNow();
    }

    this.updateAutoCollector();

    this.autosaveElapsed += deltaSeconds;
    if (this.autosaveElapsed >= 5) {
      this.autosaveElapsed = 0;
      this.saveNow();
    }

    this.refreshStatus();
  }

  private createWorld(): void {
    this.cameras.main.setBackgroundColor("#071b2a");

    this.add.rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0x071b2a);
    this.add
      .rectangle(
        tankViewportBounds.centerX,
        tankViewportBounds.centerY,
        tankViewportBounds.width,
        tankViewportBounds.height,
        0xd7f4ff,
        0.18
      )
      .setStrokeStyle(0, 0xffffff, 0);
    this.tankLayer = this.add.container(0, 0).setDepth(2);
    this.tankPatternLayer = this.add.container(0, 0);
    this.tankLayer.add(this.tankPatternLayer);
    this.applyTankViewScale();
    this.renderTankPattern();
    this.tankSand = this.add.rectangle(
      tankBounds.centerX,
      tankBounds.bottom - 28,
      tankBounds.width,
      56,
      this.currentTankPattern().sand,
      1
    );
    this.tankLayer.add(this.tankSand);
    this.layoutTankSand();
    this.add.rectangle(tankViewportBounds.centerX, 0, tankViewportBounds.width, 120, 0x071b2a, 0.34).setOrigin(0.5, 0).setDepth(18);

    for (let i = 0; i < 18; i += 1) {
      const bubble = this.add.circle(
        Phaser.Math.Between(tankBounds.left + 20, tankBounds.right - 20),
        Phaser.Math.Between(tankBounds.top + 20, tankBounds.bottom - 40),
        Phaser.Math.Between(2, 6),
        0xd7f4ff,
        0.28
      );
      this.tankLayer.add(bubble);
      this.tweens.add({
        targets: bubble,
        y: tankBounds.top + Phaser.Math.Between(8, 60),
        alpha: 0,
        duration: Phaser.Math.Between(3500, 7600),
        repeat: -1,
        delay: Phaser.Math.Between(0, 3500),
        onRepeat: () => {
          bubble.x = Phaser.Math.Between(tankBounds.left + 20, tankBounds.right - 20);
          bubble.y = tankBounds.bottom - Phaser.Math.Between(30, 90);
          bubble.alpha = 0.28;
        }
      });
    }

    this.add
      .text(18, 14, "Aquarium", {
        fontFamily: "Arial",
        fontSize: "17px",
        color: "#f8fbff",
        fontStyle: "bold"
      })
      .setDepth(20);
  }

  private createUi(): void {
    this.hudPanel = this.add.graphics().setDepth(19);
    this.drawHudPanel();

    this.hudText = this.add.text(22, 42, "", {
      fontFamily: "Arial",
      fontSize: "12px",
      color: "#ffe67a",
      fontStyle: "bold",
      fixedWidth: 300,
      wordWrap: { width: 300 }
    }).setDepth(24);

    this.statusText = this.add.text(22, 64, "", {
      fontFamily: "Arial",
      fontSize: "12px",
      color: "#eaf9ff",
      fontStyle: "bold",
      fixedWidth: 300,
      wordWrap: { width: 300 }
    }).setDepth(24);

    this.modeText = this.add.text(22, 86, "", {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#bfeeff",
      fixedWidth: 300,
      wordWrap: { width: 300 }
    }).setDepth(24);

    this.createScreenNav();
    this.createFoodDock();
    this.createDecorationTrashTarget();
    this.createTabs();
    this.renderTabControls();
  }

  private drawHudPanel(): void {
    this.hudPanel.clear();
    this.hudPanel.fillStyle(0x061826, 0.82);
    this.hudPanel.fillRoundedRect(14, 36, 318, 74, 10);
    this.hudPanel.lineStyle(1, 0x9bdfff, 0.35);
    this.hudPanel.strokeRoundedRect(14, 36, 318, 74, 10);
  }

  private createDecorationTrashTarget(): void {
    const centerX = decorationTrashZone.centerX;
    const centerY = decorationTrashZone.centerY;
    this.decorationTrashBackground = this.add
      .rectangle(0, 0, decorationTrashZone.width, decorationTrashZone.height, 0x351726, 0.94)
      .setStrokeStyle(2, 0xff8fa3, 0.8);
    const lid = this.add.rectangle(0, -18, 40, 5, 0xff8fa3, 0.92);
    const bin = this.add.rectangle(0, 1, 34, 28, 0x10283a, 1).setStrokeStyle(2, 0xffccd5, 0.85);
    this.decorationTrashText = this.add
      .text(0, 23, "Trash", {
        fontFamily: "Arial",
        fontSize: "11px",
        color: "#ffccd5",
        fontStyle: "bold"
      })
      .setOrigin(0.5);
    this.decorationTrashTarget = this.add
      .container(centerX, centerY, [this.decorationTrashBackground, lid, bin, this.decorationTrashText])
      .setDepth(28)
      .setVisible(false);
  }

  private showDecorationTrashTarget(show: boolean): void {
    if (!this.decorationTrashTarget) {
      return;
    }

    this.decorationTrashTarget.setVisible(show && this.activeScreen === "tank");
    if (!show) {
      this.highlightDecorationTrashTarget(false);
    }
  }

  private highlightDecorationTrashTarget(active: boolean): void {
    if (!this.decorationTrashBackground || !this.decorationTrashText) {
      return;
    }

    this.decorationTrashBackground.setFillStyle(active ? 0x6b1f38 : 0x351726, active ? 0.98 : 0.94);
    this.decorationTrashBackground.setStrokeStyle(2, active ? 0xffd166 : 0xff8fa3, active ? 1 : 0.8);
    this.decorationTrashText.setColor(active ? "#ffe39a" : "#ffccd5");
  }

  private tankViewScaleForLevel(level = this.tankLevel): number {
    return Phaser.Math.Clamp(1 - (Phaser.Math.Clamp(level, 1, maxTankLevel) - 1) * 0.06, 0.76, 1);
  }

  private maxFishCapacityForLevel(level = this.tankLevel): number {
    return fishCapacityByTankLevel[Phaser.Math.Clamp(level, 1, maxTankLevel)] ?? fishCapacityByTankLevel[1];
  }

  private currentTankPattern() {
    return tankPatternStyles[Phaser.Math.Clamp(this.tankLevel, 1, maxTankLevel) - 1];
  }

  private renderTankPattern(): void {
    if (!this.tankPatternLayer) {
      return;
    }

    const style = this.currentTankPattern();
    this.tankPatternLayer.removeAll(true);
    this.tankPatternLayer.add(
      this.add.rectangle(tankBounds.centerX, tankBounds.centerY, tankBounds.width, tankBounds.height, style.base, 1)
    );

    const pattern = this.add.graphics();
    switch (style.id) {
      case "lagoon-ripples":
        pattern.lineStyle(2, style.accent, 0.18);
        for (let y = tankBounds.top + 92; y < tankBounds.bottom - 80; y += 68) {
          pattern.beginPath();
          for (let x = tankBounds.left + 18; x <= tankBounds.right - 18; x += 18) {
            const waveY = y + Math.sin((x + y) / 38) * 8;
            if (x === tankBounds.left + 18) {
              pattern.moveTo(x, waveY);
            } else {
              pattern.lineTo(x, waveY);
            }
          }
          pattern.strokePath();
        }
        break;
      case "kelp-stripes":
        for (let x = tankBounds.left + 28; x < tankBounds.right; x += 58) {
          pattern.lineStyle(8, style.secondary, 0.2);
          pattern.beginPath();
          pattern.moveTo(x, tankBounds.bottom - 64);
          for (let step = 1; step <= 14; step += 1) {
            const t = step / 14;
            const inverse = 1 - t;
            const leafX = inverse * inverse * x + 2 * inverse * t * (x + 22) + t * t * (x - 6);
            const leafY =
              inverse * inverse * (tankBounds.bottom - 64) +
              2 * inverse * t * (tankBounds.centerY + 70) +
              t * t * (tankBounds.top + 110);
            pattern.lineTo(leafX, leafY);
          }
          pattern.strokePath();
          pattern.fillStyle(style.accent, 0.16);
          for (let y = tankBounds.bottom - 120; y > tankBounds.top + 140; y -= 86) {
            pattern.fillEllipse(x + 12, y, 28, 12);
          }
        }
        break;
      case "coral-diamonds":
        pattern.lineStyle(2, style.accent, 0.16);
        for (let y = tankBounds.top + 96; y < tankBounds.bottom - 90; y += 72) {
          for (let x = tankBounds.left + 42; x < tankBounds.right - 24; x += 72) {
            pattern.strokePoints(
              [
                new Phaser.Math.Vector2(x, y - 18),
                new Phaser.Math.Vector2(x + 24, y),
                new Phaser.Math.Vector2(x, y + 18),
                new Phaser.Math.Vector2(x - 24, y),
                new Phaser.Math.Vector2(x, y - 18)
              ],
              false
            );
          }
        }
        break;
      case "deep-current":
        pattern.lineStyle(3, style.accent, 0.13);
        for (let y = tankBounds.top + 92; y < tankBounds.bottom - 80; y += 74) {
          pattern.beginPath();
          pattern.moveTo(tankBounds.left + 18, y);
          for (let step = 1; step <= 18; step += 1) {
            const t = step / 18;
            const inverse = 1 - t;
            const currentX =
              inverse ** 3 * (tankBounds.left + 18) +
              3 * inverse * inverse * t * (tankBounds.left + 150) +
              3 * inverse * t * t * (tankBounds.right - 150) +
              t ** 3 * (tankBounds.right - 18);
            const currentY =
              inverse ** 3 * y +
              3 * inverse * inverse * t * (y + 42) +
              3 * inverse * t * t * (y - 42) +
              t ** 3 * y;
            pattern.lineTo(currentX, currentY);
          }
          pattern.strokePath();
        }
        pattern.fillStyle(style.secondary, 0.14);
        for (let i = 0; i < 14; i += 1) {
          pattern.fillCircle(
            tankBounds.left + 34 + (i % 7) * 58,
            tankBounds.top + 134 + Math.floor(i / 7) * 248,
            5 + (i % 3)
          );
        }
        break;
      case "starlit-reef":
        pattern.fillStyle(style.secondary, 0.18);
        for (let y = tankBounds.top + 120; y < tankBounds.bottom - 90; y += 90) {
          for (let x = tankBounds.left + 38; x < tankBounds.right - 18; x += 86) {
            pattern.fillCircle(x, y, 4);
            pattern.lineStyle(2, style.accent, 0.2);
            pattern.lineBetween(x - 10, y, x + 10, y);
            pattern.lineBetween(x, y - 10, x, y + 10);
          }
        }
        break;
    }
    this.tankPatternLayer.add(pattern);

    const border = this.add
      .rectangle(tankBounds.centerX, tankBounds.centerY, tankBounds.width, tankBounds.height, style.base, 0)
      .setStrokeStyle(2, 0xbcefff, 0.15);
    this.tankPatternLayer.add(border);

    if (this.tankSand) {
      this.tankSand.setFillStyle(style.sand, 1);
    }
  }

  private applyTankViewScale(): void {
    if (!this.tankLayer) {
      return;
    }

    const scale = this.tankViewScaleForLevel();
    setTankWorldScale(scale);
    this.tankLayer.setScale(scale);
    this.tankLayer.setPosition(
      tankViewportBounds.centerX - tankBounds.centerX * scale,
      tankViewportBounds.centerY - tankBounds.centerY * scale
    );
    this.layoutTankSand();
  }

  private layoutTankSand(): void {
    if (!this.tankSand) {
      return;
    }

    this.tankSand.setPosition(tankBounds.centerX, tankBounds.bottom - 28);
    this.tankSand.setSize(tankBounds.width, 56);
  }

  private screenToTankPoint(x: number, y: number): Phaser.Math.Vector2 {
    const scale = this.tankViewScaleForLevel();
    return new Phaser.Math.Vector2(
      Phaser.Math.Clamp((x - this.tankLayer.x) / scale, tankBounds.left, tankBounds.right),
      Phaser.Math.Clamp((y - this.tankLayer.y) / scale, tankBounds.top, tankBounds.bottom)
    );
  }

  private tankToScreenPoint(x: number, y: number): { x: number; y: number } {
    const scale = this.tankViewScaleForLevel();
    return {
      x: this.tankLayer.x + x * scale,
      y: this.tankLayer.y + y * scale
    };
  }

  private createScreenNav(): void {
    this.screenButtons.forEach((button) => button.destroy(true));
    this.screenButtons = [];

    if (this.activeScreen !== "tank") {
      return;
    }

    const screens: { label: string; screen: Exclude<AppScreen, "tank">; y: number }[] = [
      { label: "Shop", screen: "store", y: 176 },
      { label: "Care", screen: "care", y: 238 },
      { label: "Book", screen: "album", y: 300 },
      { label: "Goal", screen: "goals", y: 362 },
      { label: "Set", screen: "settings", y: 424 }
    ];

    for (const screen of screens) {
      this.screenButtons.push(
        this.createIconButton(
          gameWidth - 42,
          screen.y,
          screen.label,
          () => {
            this.openScreen(screen.screen);
          },
          0x10283a
        )
      );
    }
  }

  private createFoodDock(): void {
    this.foodButtons.forEach((button) => button.destroy(true));
    this.foodButtons = [];

    if (this.activeScreen !== "tank") {
      return;
    }

    const visibleFood = foodTypes.filter((foodType) => this.isDroppableFood(foodType.id) && this.getFoodInventory(foodType.id) > 0).slice(0, 4);
    visibleFood.forEach((foodType, index) => {
      const y = 176 + index * 62;
      this.foodButtons.push(
        this.createIconButton(
          42,
          y,
          this.foodIconLabel(foodType),
          () => this.toggleFoodTool(foodType.id),
          this.placementMode.kind === "food" && this.placementMode.foodTypeId === foodType.id ? foodTintFor(foodType.id) : 0x10283a
        )
      );
    });
  }

  private createIconButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    fill: number
  ): Phaser.GameObjects.Container {
    const background = this.add.circle(0, 0, 28, fill, 0.94).setStrokeStyle(2, 0xbcefff, 0.7);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Arial",
        fontSize: "10px",
        color: "#ffffff",
        align: "center",
        fixedWidth: 52
      })
      .setOrigin(0.5);
    const button = this.add.container(x, y, [background, text]);
    button.setSize(56, 56);
    button.setDepth(35);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  private openScreen(screen: Exclude<AppScreen, "tank">): void {
    this.activeScreen = screen;
    this.placementMode = { kind: "none" };
    this.closeModal();
    this.createScreenNav();
    this.createFoodDock();
    this.createTabs();
    this.renderTabControls();
    this.refreshUi(false);
  }

  private closePage(): void {
    this.activeScreen = "tank";
    this.pagePanel?.destroy(true);
    this.pagePanel = undefined;
    this.tabControls.forEach((control) => control.destroy(true));
    this.tabControls = [];
    this.tabButtons.forEach((button) => button.destroy(true));
    this.tabButtons = [];
    this.createScreenNav();
    this.createFoodDock();
    this.refreshUi(false);
  }

  private createTabs(): void {
    this.tabButtons.forEach((button) => button.destroy(true));
    this.tabButtons = [];

    if (this.activeScreen !== "store") {
      return;
    }

    const tabs: { label: string; tab: StoreTab; x: number }[] = [
      { label: "Fish", tab: "fish", x: 16 },
      { label: "Food", tab: "food", x: 118 },
      { label: "Decor", tab: "decor", x: 220 },
      { label: "Help", tab: "creature", x: 322 }
    ];

    for (const tab of tabs) {
      const tabButton = this.createButton(
        tab.x,
        controlPanelTop + 48,
        92,
        28,
        tab.label,
        () => {
          this.activeTab = tab.tab;
          this.createTabs();
          this.renderTabControls();
          this.refreshUi(false);
        },
        this.activeTab === tab.tab ? 0x3c93bd : 0x254d68,
        14
      ).setDepth(72);
      this.tabButtons.push(tabButton);
    }
  }

  private renderTabControls(): void {
    this.tabControls.forEach((control) => control.destroy(true));
    this.tabControls = [];
    this.pagePanel?.destroy(true);
    this.pagePanel = undefined;

    if (this.activeScreen === "tank") {
      return;
    }

    this.createPagePanel(this.pageTitle());

    if (this.activeScreen !== "store") {
      this.renderScreenControls();
      return;
    }

    if (this.activeTab === "fish") {
      const upgradePrice = this.getNextTankUpgradePrice();
      this.tabControls.push(
        this.createButton(20, controlPanelTop + 16, 42, 26, "<", () => this.changeFishCatalogLevel(-1), 0x254d68, 13),
        this.createButton(66, controlPanelTop + 16, 94, 26, `Fish L${formatNumber(this.fishCatalogLevel)}`, () => this.changeFishCatalogLevel(1), 0x3c93bd, 12),
        this.createButton(164, controlPanelTop + 16, 42, 26, ">", () => this.changeFishCatalogLevel(1), 0x254d68, 13),
        this.createButton(
          220,
          controlPanelTop + 16,
          124,
          26,
          upgradePrice ? `Tank L${formatNumber(this.tankLevel)} ${formatPrice(upgradePrice)}` : `Tank L${formatNumber(this.tankLevel)} Max`,
          () => this.upgradeTank(),
          upgradePrice && canAfford(this.wallet, upgradePrice) ? 0x356a35 : 0x76512d,
          9
        )
      );
      this.renderStoreCoinFilter();
      this.renderFishCatalog();
      return;
    }

    this.renderStoreCoinFilter();

    if (this.activeTab === "food") {
      this.renderFoodCatalog();
      return;
    }

    if (this.activeTab === "decor") {
      this.renderDecorationCatalog();
      return;
    }

    this.renderHelperCreatureCatalog();
  }

  private renderFishCatalog(): void {
    const visibleFish = this.visibleFishCatalog();
    this.renderEmptyStoreMessage(visibleFish.length, controlPanelTop + 138);
    visibleFish.forEach((fishType, index) => {
      const owned = this.getFishInventory(fishType.id);
      const canUseTank = this.canTankAcceptFish(fishType);
      const buyLabel = canUseTank ? "Buy" : `Need L${this.getFishTankLevel(fishType)}`;
      this.addShopCard({
        x: 20 + (index % 2) * 202,
        y: controlPanelTop + 136 + Math.floor(index / 2) * 84,
        width: 188,
        height: 76,
        title: fishType.name,
        meta: `L${formatNumber(this.getFishTankLevel(fishType))} ${this.rarityStarsLabel(fishType.rarity)} ${this.rarityLabel(fishType.rarity)} | ${formatPrice(fishType.price)} | Own ${formatNumber(owned)}`,
        detail: canUseTank ? `Eats ${fishType.preferredFoodTypes.slice(0, 2).join(", ")}` : "Upgrade tank first",
        buyLabel,
        onBuy: () => this.buyFish(fishType),
        accent: fishFoodTintFor(fishType)
      });
    });
  }

  private renderFoodCatalog(): void {
    const visibleFoods = this.visibleFoodCatalog();
    this.renderEmptyStoreMessage(visibleFoods.length, controlPanelTop + 138);
    visibleFoods.forEach((foodType, index) => {
      const owned = this.getFoodInventory(foodType.id);
      const buyQuantity = this.getFoodBuyQuantity(foodType.id);
      const totalPrice = this.quantityPrice(foodType.price, buyQuantity);
      this.addShopCard({
        x: 20 + (index % 2) * 202,
        y: controlPanelTop + 136 + Math.floor(index / 2) * 140,
        width: 188,
        height: 132,
        title: foodType.name,
        meta: `${this.rarityLabel(foodType.rarity)} | N${formatNumber(foodType.nutrition)} | Own ${formatNumber(owned)}`,
        detail: foodType.id === evolvePillFoodTypeId ? "50% evolve chance" : foodType.id === "medicine" ? "Heals sick fish" : foodType.acceptedByDefault ? "General food" : "Species food",
        buyLabel: `Buy ${formatPrice(totalPrice)}`,
        onBuy: () => this.buyFood(foodType, buyQuantity),
        accent: foodTintFor(foodType.id),
        quantity: {
          label: `x${formatNumber(buyQuantity)}`,
          onReset: () => this.resetFoodBuyQuantity(foodType.id),
          presets: foodBulkBuyQuantities,
          onAdd: (quantity) => this.addFoodBuyQuantity(foodType.id, quantity)
        }
      });
    });
  }

  private renderDecorationCatalog(): void {
    const visibleDecorations = this.visibleDecorationCatalog();
    this.renderEmptyStoreMessage(visibleDecorations.length, controlPanelTop + 138);
    visibleDecorations.forEach((decorationType, index) => {
      const owned = this.getDecorationInventory(decorationType.id);
      this.addShopCard({
        x: 20 + (index % 2) * 202,
        y: controlPanelTop + 136 + Math.floor(index / 2) * 84,
        width: 188,
        height: 74,
        title: decorationType.name,
        meta: `${this.rarityLabel(decorationType.rarity)} | +${formatNumber(decorationType.happinessBonus)} happy | Own ${formatNumber(owned)}`,
        detail: decorationType.habitatTags.slice(0, 2).join(", "),
        buyLabel: `Buy ${formatPrice(decorationType.price)}`,
        onBuy: () => this.buyDecoration(decorationType),
        accent: this.rarityCatalogAccent(decorationType.rarity)
      });
    });
  }

  private renderHelperCreatureCatalog(): void {
    const visibleCreatures = this.visibleHelperCreatureCatalog();
    this.renderEmptyStoreMessage(visibleCreatures.length, controlPanelTop + 138);
    visibleCreatures.forEach((creatureType, index) => {
      const owned = this.helperCreatures.filter((helper) => helper.type.id === creatureType.id).length + this.getCreatureInventory(creatureType.id);
      this.addShopCard({
        x: 20 + (index % 2) * 202,
        y: controlPanelTop + 136 + Math.floor(index / 2) * 90,
        width: 188,
        height: 82,
        title: creatureType.name,
        meta: `${this.rarityLabel(creatureType.rarity)} | ${formatPrice(creatureType.price)} | Own ${formatNumber(owned)}`,
        detail: creatureType.feedSeconds
          ? `Feeds fish | every ${formatNumber(creatureType.feedSeconds)}s`
          : `Cleans food | coins ${formatNumber(creatureType.coinCollectSeconds)}s`,
        buyLabel: "Buy",
        onBuy: () => this.buyHelperCreature(creatureType),
        accent: this.rarityCatalogAccent(creatureType.rarity)
      });
    });
  }

  private renderStoreCoinFilter(): void {
    const coinLanes: Array<{ coinType: CoinType; label: string; fill: number }> = [
      { coinType: "common", label: "Common C", fill: 0x99722b },
      { coinType: "rare", label: "Rare R", fill: 0x236f8c },
      { coinType: "superRare", label: "Super SR", fill: 0x7b3f98 }
    ];

    coinLanes.forEach((lane, index) => {
      const active = this.storeCoinFilter === lane.coinType;
      this.tabControls.push(
        this.createButton(
          20 + index * 134,
          controlPanelTop + 82,
          122,
          28,
          lane.label,
          () => this.setStoreCoinFilter(lane.coinType),
          active ? lane.fill : 0x254d68,
          11
        )
      );
    });
  }

  private renderEmptyStoreMessage(visibleCount: number, y: number): void {
    if (visibleCount > 0) {
      return;
    }

    this.tabControls.push(
      this.createInfoLine(
        20,
        y,
        `No ${this.storeCoinLabel(this.storeCoinFilter)} items in this section. Try another coin lane or fish tank level.`
      )
    );
  }

  private visibleFishCatalog(): FishType[] {
    return fishTypes.filter(
      (fishType) =>
        this.getFishTankLevel(fishType) === this.fishCatalogLevel &&
        this.matchesStoreCoinFilter(fishType.price)
    );
  }

  private visibleFoodCatalog(): FoodType[] {
    return foodTypes.filter((foodType) => this.matchesStoreCoinFilter(foodType.price));
  }

  private visibleDecorationCatalog(): DecorationType[] {
    return decorationTypes.filter((decorationType) => this.matchesStoreCoinFilter(decorationType.price));
  }

  private visibleHelperCreatureCatalog(): HelperCreatureType[] {
    return helperCreatureTypes.filter((creatureType) => this.matchesStoreCoinFilter(creatureType.price));
  }

  private visibleStoreCatalogCount(): number {
    if (this.activeTab === "fish") {
      return this.visibleFishCatalog().length;
    }

    if (this.activeTab === "food") {
      return this.visibleFoodCatalog().length;
    }

    if (this.activeTab === "decor") {
      return this.visibleDecorationCatalog().length;
    }

    return this.visibleHelperCreatureCatalog().length;
  }

  private matchesStoreCoinFilter(price: FishType["price"]): boolean {
    return price.coinType === this.storeCoinFilter;
  }

  private setStoreCoinFilter(coinType: CoinType): void {
    this.storeCoinFilter = coinType;
    this.renderTabControls();
    this.refreshUi(false);
  }

  private storeCoinLabel(coinType: CoinType): string {
    const labelByCoin: Record<CoinType, string> = {
      common: "Common",
      rare: "Rare",
      superRare: "Super Rare"
    };

    return labelByCoin[coinType];
  }

  private rarityCatalogAccent(rarity: DecorationType["rarity"]): number {
    const accentByRarity: Record<DecorationType["rarity"], number> = {
      common: 0x4ca37a,
      rare: 0x5fa6d6,
      superRare: 0xd379d7
    };

    return accentByRarity[rarity];
  }

  private addShopCard(options: {
    x: number;
    y: number;
    width: number;
    height: number;
    title: string;
    meta: string;
    detail: string;
    buyLabel: string;
    onBuy: () => void;
    accent: number;
    compact?: boolean;
    quantity?: {
      label: string;
      onReset: () => void;
      presets?: number[];
      onAdd?: (quantity: number) => void;
    };
  }): void {
    const background = this.add
      .rectangle(options.width / 2, options.height / 2, options.width, options.height, 0x17364a, 0.98)
      .setStrokeStyle(1, options.accent, 0.9);
    const stripe = this.add.rectangle(4, options.height / 2, 4, options.height - 8, options.accent, 1);
    const title = this.add.text(12, 5, options.title, {
      fontFamily: "Arial",
      fontSize: options.compact ? "11px" : "12px",
      color: "#ffffff",
      fontStyle: "bold",
      fixedWidth: options.compact ? 76 : options.width - 24
    });
    const meta = this.add.text(12, options.compact ? 18 : 22, options.meta, {
      fontFamily: "Arial",
      fontSize: "9px",
      color: "#ffe67a",
      fixedWidth: options.compact ? 76 : options.width - 24
    });
    const detail = this.add.text(12, options.compact ? 29 : 36, options.detail, {
      fontFamily: "Arial",
      fontSize: "9px",
      color: "#cfeeff",
      fixedWidth: options.compact ? 56 : options.width - 24
    });
    const card = this.add
      .container(options.x, options.y, [background, stripe, title, meta, detail])
      .setDepth(this.activeScreen === "tank" ? 21 : 71);
    this.tabControls.push(card);

    if (options.quantity) {
      const quantityY = options.y + options.height - 76;
      this.tabControls.push(
        this.createButton(options.x + 12, quantityY, 108, 20, `Qty ${options.quantity.label}`, () => undefined, 0x17364a, 10),
        this.createButton(options.x + 124, quantityY, 52, 20, "Reset", options.quantity.onReset, 0x76512d, 8)
      );

      if (options.quantity.presets && options.quantity.onAdd) {
        const presetY = options.y + options.height - 50;
        options.quantity.presets.forEach((quantity, index) => {
          this.tabControls.push(
            this.createButton(
              options.x + 12 + index * 33,
              presetY,
              29,
              20,
              `x${formatNumber(quantity)}`,
              () => options.quantity?.onAdd?.(quantity),
              0x254d68,
              8
            )
          );
        });
      }
    }

    const buttonY = options.y + options.height - (options.compact ? 12 : 24);
    const buttonHeight = options.compact ? 17 : 20;
    const buttonWidth = options.compact ? 76 : options.width - 24;
    this.tabControls.push(
      this.createButton(options.x + 12, buttonY, buttonWidth, buttonHeight, options.buyLabel, options.onBuy, 0x256f95, options.compact ? 8 : 9)
    );
  }

  private renderFishStatsPage(): void {
    this.tabControls.push(
      this.createInfoLine(
        20,
        controlPanelTop + 52,
        `Fish ${formatNumber(this.fish.length)}/${formatNumber(this.maxFishCapacityForLevel())} | Helpers ${formatNumber(this.helperCreatures.length)}/${formatNumber(maxHelperCreatures)} | Evolve Pills ${formatNumber(this.getFoodInventory(evolvePillFoodTypeId))}`
      )
    );

    if (this.fish.length === 0) {
      this.tabControls.push(this.createInfoLine(20, controlPanelTop + 84, "No fish in the tank. Buy one from Shop."));
    } else {
      this.fish.forEach((targetFish, index) => {
        this.addFishStatsCard(targetFish, index);
      });
    }

    this.renderHelperStatsSection();
  }

  private addFishStatsCard(targetFish: Fish, index: number): void {
    const x = 20 + (index % 2) * 202;
    const y = controlPanelTop + 84 + Math.floor(index / 2) * 92;
    const width = 188;
    const height = 84;
    const accent = fishFoodTintFor(targetFish.type);
    const background = this.add.rectangle(width / 2, height / 2, width, height, 0x17364a, 0.98).setStrokeStyle(1, accent, 0.9);
    const stripe = this.add.rectangle(4, height / 2, 4, height - 8, accent, 1);
    const title = this.add.text(12, 5, `${formatNumber(index + 1)}. ${targetFish.type.name}`, {
      fontFamily: "Arial",
      fontSize: "12px",
      color: "#ffffff",
      fontStyle: "bold",
      fixedWidth: width - 24
    });
    const meta = this.add.text(12, 22, `${targetFish.gender} | Age ${targetFish.ageLabel()}`, {
      fontFamily: "Arial",
      fontSize: "9px",
      color: "#ffe67a",
      fixedWidth: width - 24
    });
    const growthStatus = targetFish.isGrowthLimitedByTank() ? "Tank too small" : `Evo ${formatNumber(targetFish.evolutionStage)}/${formatNumber(maxEvolutionStage)}`;
    const detail = this.add.text(12, 36, `${this.rarityLabel(targetFish.type.rarity)} L${formatNumber(this.getFishTankLevel(targetFish.type))} | ${growthStatus}`, {
      fontFamily: "Arial",
      fontSize: "9px",
      color: "#cfeeff",
      fixedWidth: width - 24
    });
    const worth = this.add.text(12, 49, `Worth ${formatPrice({ coinType: targetFish.type.sellBaseValue.coinType, amount: targetFish.getSellValue() })}`, {
      fontFamily: "Arial",
      fontSize: "9px",
      color: "#cfeeff",
      fixedWidth: width - 24
    });
    const card = this.add.container(x, y, [background, stripe, title, meta, detail, worth]).setDepth(71);
    this.tabControls.push(card);

    this.tabControls.push(
      this.createButton(x + 12, y + height - 24, 48, 18, "Sell", () => this.showSellConfirmation(index), 0x76512d, 8),
      this.createButton(x + 66, y + height - 24, 52, 18, "Evo", () => this.tryEvolveFish(index), targetFish.canEvolve() ? 0x584f86 : 0x254d68, 8),
      this.createButton(x + 124, y + height - 24, 52, 18, "Breed", () => this.breedFish(index), this.findBreedMate(index) === undefined ? 0x254d68 : 0x356a35, 8)
    );
  }

  private renderHelperStatsSection(): void {
    const fishRows = Math.max(1, Math.ceil(this.fish.length / 2));
    const startY = controlPanelTop + 84 + fishRows * 92 + 14;
    this.tabControls.push(
      this.createInfoLine(
        20,
        startY,
        `Helper creatures | Sell helpers here to clean up tank utility slots`
      )
    );

    if (this.helperCreatures.length === 0) {
      this.tabControls.push(this.createInfoLine(20, startY + 28, "No helpers hired. Buy shrimp, shell, crab, or feeder snail from Shop."));
      return;
    }

    this.helperCreatures.forEach((helper, index) => {
      this.addHelperStatsCard(helper, index, startY + 32);
    });
  }

  private addHelperStatsCard(helper: HelperCreature, index: number, baseY: number): void {
    const x = 20 + (index % 2) * 202;
    const y = baseY + Math.floor(index / 2) * 74;
    const width = 188;
    const height = 66;
    const accent = this.rarityCatalogAccent(helper.type.rarity);
    const background = this.add.rectangle(width / 2, height / 2, width, height, 0x17364a, 0.98).setStrokeStyle(1, accent, 0.9);
    const stripe = this.add.rectangle(4, height / 2, 4, height - 8, accent, 1);
    const title = this.add.text(12, 5, `${formatNumber(index + 1)}. ${helper.type.name}`, {
      fontFamily: "Arial",
      fontSize: "12px",
      color: "#ffffff",
      fontStyle: "bold",
      fixedWidth: width - 24
    });
    const role = helper.type.feedSeconds ? "Feeder" : helper.type.habitatTags.includes("collector") ? "Collector" : "Cleaner";
    const meta = this.add.text(12, 22, `${this.rarityLabel(helper.type.rarity)} | ${role} | Speed ${formatNumber(helper.type.speed)}`, {
      fontFamily: "Arial",
      fontSize: "9px",
      color: "#ffe67a",
      fixedWidth: width - 24
    });
    const detail = this.add.text(12, 36, `Sell ${formatPrice(this.helperSellPrice(helper.type))}`, {
      fontFamily: "Arial",
      fontSize: "9px",
      color: "#cfeeff",
      fixedWidth: width - 24
    });
    const card = this.add.container(x, y, [background, stripe, title, meta, detail]).setDepth(71);
    this.tabControls.push(card);
    this.tabControls.push(
      this.createButton(x + width - 64, y + height - 18, 52, 18, "Sell", () => this.showHelperSellConfirmation(index), 0x76512d, 8)
    );
  }

  private renderScreenControls(): void {
    if (this.activeScreen === "care") {
      const upgradePrice = this.getNextTankUpgradePrice();
      this.tabControls.push(
        this.createInfoLine(20, controlPanelTop + 54, `Tank L${formatNumber(this.tankLevel)} | Wealth ${formatNumber(this.calculateTotalWealth())} | ${formatNumber(Math.round(this.cleanliness))}% clean | ${formatNumber(Math.round(this.calculateTankHappiness()))}% happy`),
        this.createButton(20, controlPanelTop + 84, 188, 36, "Clean Tank", () => this.cleanTank(), 0x356a35, 13),
        this.createButton(222, controlPanelTop + 84, 188, 36, upgradePrice ? `Upgrade Tank ${formatPrice(upgradePrice)}` : "Tank Maxed", () => this.upgradeTank(), upgradePrice ? 0x76512d : 0x254d68, 12),
        this.createInfoLine(20, controlPanelTop + 130, `Food: ${this.describeFoodInventory()}`),
        this.createInfoLine(20, controlPanelTop + 154, `Fish ${formatNumber(this.fish.length)}/${formatNumber(this.maxFishCapacityForLevel())} | Decor ${formatNumber(this.placedDecorations.length)}/${formatNumber(maxDecorations)} | ${this.getTankNeedIndicator()}`),
        this.createInfoLine(20, controlPanelTop + 178, `Rentals: ${this.rentalStatusLabel() || "none active"}`),
        this.createButton(20, controlPanelTop + 202, 30, 30, "-", () => this.changeRentalMinutes("feeder", -1), 0x254d68, 14),
        this.createButton(54, controlPanelTop + 202, 116, 30, `Feed ${formatNumber(this.autoFeederMinutes)}m ${formatPrice(this.rentalPrice(autoFeederPrice, this.autoFeederMinutes))}`, () => this.rentAutoFeeder(), this.isAutoFeederActive() ? 0x356a35 : 0x256f95, 9),
        this.createButton(174, controlPanelTop + 202, 30, 30, "+", () => this.changeRentalMinutes("feeder", 1), 0x254d68, 14),
        this.createButton(222, controlPanelTop + 202, 30, 30, "-", () => this.changeRentalMinutes("collector", -1), 0x254d68, 14),
        this.createButton(256, controlPanelTop + 202, 116, 30, `Coin ${formatNumber(this.autoCollectorMinutes)}m ${formatPrice(this.rentalPrice(autoCollectorPrice, this.autoCollectorMinutes))}`, () => this.rentAutoCollector(), this.isAutoCollectorActive() ? 0x356a35 : 0x256f95, 9),
        this.createButton(376, controlPanelTop + 202, 30, 30, "+", () => this.changeRentalMinutes("collector", 1), 0x254d68, 14)
      );
      return;
    }

    if (this.activeScreen === "album") {
      this.renderFishStatsPage();
      return;
    }

    if (this.activeScreen === "goals") {
      this.tabControls.push(
        this.createInfoLine(20, controlPanelTop + 54, `Daily Goals | ${this.dailyGoals.date}`),
        this.createGoalRow(controlPanelTop + 82, "feed", "Feed a fish", this.getTotalFoodInventory() < 3),
        this.createGoalRow(controlPanelTop + 114, "coin", `Collect ${formatNumber(1)} coin`, this.wallet.common > 120 || this.wallet.rare > 0 || this.wallet.superRare > 0),
        this.createGoalRow(controlPanelTop + 146, "decorate", "Place a decoration", this.placedDecorations.length > 0)
      );
      return;
    }

    this.tabControls.push(
      this.createButton(20, controlPanelTop + 58, 188, 32, `Sound ${this.settings.sound ? "On" : "Off"}`, () => this.toggleSetting("sound"), 0x254d68, 13),
      this.createButton(222, controlPanelTop + 58, 188, 32, `Music ${this.settings.music ? "On" : "Off"}`, () => this.toggleSetting("music"), 0x254d68, 13),
      this.createButton(20, controlPanelTop + 98, 188, 32, `Motion ${this.settings.reducedMotion ? "Low" : "Full"}`, () => this.toggleSetting("reducedMotion"), 0x254d68, 13),
      this.createButton(222, controlPanelTop + 98, 188, 32, `Notify ${this.settings.notifications ? "On" : "Off"}`, () => this.toggleSetting("notifications"), 0x254d68, 13),
      this.createButton(20, controlPanelTop + 140, 188, 32, "Offline Summary", () => this.showOfflineSummary(), 0x356a35, 13),
      this.createButton(222, controlPanelTop + 140, 188, 32, "Reset Save", () => this.showResetConfirmation(), 0x76512d, 13)
    );
  }

  private addControlRow(
    y: number,
    buyLabel: string,
    placeLabel: string,
    onBuy: () => void,
    onPlace: () => void,
    placeFill: number
  ): void {
    this.tabControls.push(
      this.createButton(20, y, 250, 28, buyLabel, onBuy, 0x256f95, 12),
      this.createButton(284, y, 126, 28, placeLabel, onPlace, placeFill, 11)
    );
  }

  private createInfoLine(x: number, y: number, label: string): Phaser.GameObjects.Container {
    const text = this.add.text(0, 0, label, {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#eaf9ff",
      fixedWidth: 390,
      wordWrap: { width: 390 }
    });
    const container = this.add.container(x, y, [text]);
    container.setDepth(this.activeScreen === "tank" ? 22 : 72);
    return container;
  }

  private createGoalRow(y: number, id: string, label: string, complete: boolean): Phaser.GameObjects.Container {
    const claimed = this.dailyGoals.claimed.includes(id);
    return this.createButton(
      20,
      y,
      390,
      28,
      `${claimed ? "Done" : complete ? "Claim" : "Open"} | ${label} | +C15`,
      () => this.claimDailyGoal(id, complete),
      claimed ? 0x254d68 : complete ? 0x356a35 : 0x256f95,
      12
    );
  }

  private createPagePanel(title: string): void {
    const background = this.add
      .rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0x071b2a, 1)
      .setStrokeStyle(2, 0x75c9e8, 0.65);
    background.setInteractive();
    background.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
    });
    const header = this.add.rectangle(gameWidth / 2, 36, gameWidth, 72, 0x10283a, 1);
    const titleText = this.add.text(20, 20, title, {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#ffffff",
      fontStyle: "bold"
    });
    const closeButton = this.createButton(330, 18, 80, 34, "Tank", () => this.closePage(), 0x76512d, 13);
    this.pagePanel = this.add.container(0, 0, [background, header, titleText, closeButton]).setDepth(60);
  }

  private pageTitle(): string {
    const titles: Record<AppScreen, string> = {
      tank: "Tank",
      store: "Store",
      care: "Care",
      album: "Album",
      goals: "Goals",
      settings: "Settings"
    };
    return titles[this.activeScreen];
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
    fill = 0x256f95,
    fontSize = 13
  ): Phaser.GameObjects.Container {
    const background = this.add
      .rectangle(0, 0, width, height, fill, 1)
      .setStrokeStyle(1, 0xbcefff, 0.5);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Arial",
        fontSize: `${fontSize}px`,
        color: "#ffffff",
        align: "center",
        fixedWidth: width - 10
      })
      .setOrigin(0.5);
    const button = this.add.container(x + width / 2, y + height / 2, [background, text]);
    button.setSize(width, height);
    button.setDepth(this.activeScreen === "tank" ? 22 : 72);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerover", () => background.setFillStyle(0x3c93bd));
    button.on("pointerout", () => background.setFillStyle(fill));
    button.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      onClick();
    });
    return button;
  }

  private buyFish(fishType: FishType): void {
    if (this.fish.length >= this.maxFishCapacityForLevel()) {
      this.floatText("Tank full", toastX, toastY, "#ffb0a8");
      return;
    }

    if (!this.canTankAcceptFish(fishType)) {
      this.floatText(`Need Tank L${formatNumber(this.getFishTankLevel(fishType))}`, toastX, toastY, "#ffb0a8");
      this.fishCatalogLevel = this.getFishTankLevel(fishType);
      this.refreshUi();
      return;
    }

    if (!canAfford(this.wallet, fishType.price)) {
      this.floatText(`Need ${formatPrice(fishType.price)}`, toastX, toastY, "#ffb0a8");
      return;
    }

    const position = this.randomFishPlacement();
    this.buyAndAddFishToTank(fishType, position.x, position.y);
  }

  private buyAndAddFishToTank(fishType: FishType, x: number, y: number): void {
    if (!this.spendPrice(fishType.price)) {
      return;
    }

    const placedFish = this.addFishToTank(fishType, x, y);
    placedFish.markCoinDropped(this.time.now + 2500);
    this.floatTankText(`${fishType.name} added`, x, y - 34, "#ffffff");
    this.placementMode = { kind: "none" };
    this.closeModal();
    this.refreshUi();
    this.saveNow();
  }

  private buyFood(foodType = this.getSelectedFoodType(), quantity = this.getFoodBuyQuantity(foodType.id)): void {
    const buyQuantity = Phaser.Math.Clamp(Math.floor(quantity), 1, 99);
    const totalPrice = this.quantityPrice(foodType.price, buyQuantity);
    if (!this.spendPrice(totalPrice)) {
      return;
    }

    this.foodInventory.set(foodType.id, this.getFoodInventory(foodType.id) + buyQuantity);
    if (this.isDroppableFood(foodType.id)) {
      this.selectedFoodTypeId = foodType.id;
      this.placementMode = { kind: "food", foodTypeId: foodType.id };
    } else {
      this.placementMode = { kind: "none" };
    }
    this.floatText(`${foodType.name} x${formatNumber(buyQuantity)}`, toastX, toastY, "#a8ffb0");
    if (this.activeScreen !== "tank" && this.isDroppableFood(foodType.id)) {
      this.closePage();
    }
    this.refreshUi();
    this.createFoodDock();
    this.saveNow();
  }

  private buyDecoration(decorationType: DecorationType): void {
    if (!this.spendPrice(decorationType.price)) {
      return;
    }

    this.decorationInventory.set(
      decorationType.id,
      this.getDecorationInventory(decorationType.id) + 1
    );
    this.placementMode = { kind: "decoration", decorationTypeId: decorationType.id };
    this.floatText(`${decorationType.name} bought`, toastX, toastY, "#a8ffb0");
    if (this.activeScreen !== "tank") {
      this.closePage();
    }
    this.refreshUi();
    this.saveNow();
  }

  private buyHelperCreature(creatureType: HelperCreatureType): void {
    if (this.helperCreatures.length >= maxHelperCreatures) {
      this.floatText("Helpers full", toastX, toastY, "#ffb0a8");
      return;
    }

    if (!this.spendPrice(creatureType.price)) {
      return;
    }

    const x = Phaser.Math.Between(tankBounds.left + 70, tankBounds.right - 70);
    this.addHelperCreatureToTank(creatureType, x);
    this.placementMode = { kind: "none" };
    this.floatTankText(`${creatureType.name} hired`, x, tankBounds.bottom - 62, "#a8ffb0");
    if (this.activeScreen !== "tank") {
      this.closePage();
    }
    this.refreshUi();
    this.saveNow();
  }

  private sellOldestFish(): void {
    if (this.fish.length === 0) {
      this.floatText("No fish to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    this.showSellConfirmation(0);
  }

  private sellFishByIndex(index: number): void {
    const fishToSell = this.fish[index];
    if (!fishToSell) {
      this.floatText("No fish to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    if (this.fish.length <= 1) {
      this.floatText("Keep one fish", toastX, toastY, "#ffb0a8");
      this.closeModal();
      return;
    }

    const sellValue = fishToSell.getSellValue();
    this.fish.splice(index, 1);
    earn(this.wallet, fishToSell.type.sellBaseValue.coinType, sellValue);
    this.floatText(`Sold ${fishToSell.type.name} +${formatNumber(sellValue)}`, toastX, toastY, "#ffe67a");
    fishToSell.destroy();
    this.closeModal();
    this.refreshUi();
    this.saveNow();
  }

  private helperSellPrice(creatureType: HelperCreatureType): HelperCreatureType["price"] {
    return {
      coinType: creatureType.price.coinType,
      amount: Math.max(1, Math.floor(creatureType.price.amount * 0.65))
    };
  }

  private sellHelperCreatureByIndex(index: number): void {
    const helperToSell = this.helperCreatures[index];
    if (!helperToSell) {
      this.floatText("No helper to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellPrice = this.helperSellPrice(helperToSell.type);
    this.helperCreatures.splice(index, 1);
    earn(this.wallet, sellPrice.coinType, sellPrice.amount);
    this.floatTankText(`Sold ${helperToSell.type.name}`, helperToSell.sprite.x, helperToSell.sprite.y - 24, "#ffe67a");
    helperToSell.destroy();
    this.closeModal();
    this.renderTabControls();
    this.refreshUi();
    this.saveNow();
  }

  private tryEvolveFish(index: number, force?: "success" | "death"): void {
    const targetFish = this.fish[index];
    if (!targetFish) {
      this.floatText("No fish to evolve", toastX, toastY, "#ffb0a8");
      return;
    }

    if (!targetFish.canEvolve()) {
      this.floatText("Max evolution", toastX, toastY, "#d7f4ff");
      return;
    }

    if (this.getFoodInventory(evolvePillFoodTypeId) <= 0) {
      this.floatText("Need Evolve Pill", toastX, toastY, "#ffb0a8");
      return;
    }

    const fee = this.evolutionFee(targetFish);
    if (!this.spendPrice(fee)) {
      return;
    }

    this.foodInventory.set(evolvePillFoodTypeId, this.getFoodInventory(evolvePillFoodTypeId) - 1);
    const success = force === "success" || (force !== "death" && Phaser.Math.Between(0, 1) === 1);
    if (success) {
      targetFish.evolve();
      targetFish.markCoinDropped(this.time.now + 2500);
      this.floatTankText(`Evolved ${targetFish.type.name}`, targetFish.sprite.x, targetFish.sprite.y - 34, "#f2dcff");
    } else {
      this.removeFishAt(index);
      this.floatText("Evolution failed", toastX, toastY, "#ff8f9a");
    }

    this.closeModal();
    this.renderTabControls();
    this.refreshUi();
    this.saveNow();
  }

  private breedFish(index: number, force?: "same" | "rare"): void {
    const parent = this.fish[index];
    const mateIndex = this.findBreedMate(index);
    if (!parent || mateIndex === undefined) {
      this.floatText("Need M+F pair", toastX, toastY, "#ffb0a8");
      return;
    }

    if (this.fish.length >= this.maxFishCapacityForLevel()) {
      this.floatText("Tank full", toastX, toastY, "#ffb0a8");
      return;
    }

    const babyType = this.chooseBreedBabyType(parent.type, force);
    const position = this.randomFishPlacement();
    const baby = this.addFishToTank(babyType, position.x, position.y);
    baby.markCoinDropped(this.time.now + 2500);
    this.floatTankText(`${babyType.name} added`, position.x, position.y - 34, "#ffffff");
    this.renderTabControls();
    this.refreshUi();
    this.saveNow();
  }

  private removeFishAt(index: number): Fish | undefined {
    const [removedFish] = this.fish.splice(index, 1);
    if (removedFish) {
      removedFish.destroy();
    }
    return removedFish;
  }

  private selectFish(fishTypeId: string): void {
    if (this.getFishInventory(fishTypeId) <= 0) {
      this.floatText("Buy one first", toastX, toastY, "#ffb0a8");
      return;
    }

    const fishType = fishTypes.find((item) => item.id === fishTypeId);
    if (fishType && !this.canTankAcceptFish(fishType)) {
      this.floatText(`Need Tank L${formatNumber(this.getFishTankLevel(fishType))}`, toastX, toastY, "#ffb0a8");
      return;
    }

    this.placementMode = { kind: "fish", fishTypeId };
    if (this.activeScreen !== "tank") {
      this.closePage();
    }
    this.refreshUi();
  }

  private selectFood(foodTypeId = this.selectedFoodTypeId): void {
    if (!this.isDroppableFood(foodTypeId)) {
      this.floatText("Use from Book", toastX, toastY, "#d7f4ff");
      this.openScreen("album");
      return;
    }

    if (this.getFoodInventory(foodTypeId) <= 0) {
      this.floatText("No food left", toastX, toastY, "#ffb0a8");
      return;
    }

    this.selectedFoodTypeId = foodTypeId;
    this.placementMode = { kind: "food", foodTypeId };
    if (this.activeScreen !== "tank") {
      this.closePage();
    }
    this.refreshUi();
    this.createFoodDock();
  }

  private toggleFoodTool(foodTypeId: FoodTypeId): void {
    if (this.placementMode.kind === "food" && this.placementMode.foodTypeId === foodTypeId) {
      this.placementMode = { kind: "none" };
    } else {
      this.selectFood(foodTypeId);
      return;
    }

    this.refreshUi();
    this.createFoodDock();
  }

  private selectDecoration(decorationTypeId: string): void {
    if (this.getDecorationInventory(decorationTypeId) <= 0) {
      this.floatText("Buy one first", toastX, toastY, "#ffb0a8");
      return;
    }

    this.placementMode = { kind: "decoration", decorationTypeId };
    if (this.activeScreen !== "tank") {
      this.closePage();
    }
    this.refreshUi();
  }

  private handleTankPointer(pointer: Phaser.Input.Pointer): void {
    if (!tankViewportBounds.contains(pointer.x, pointer.y)) {
      return;
    }

    const mode = this.placementMode;
    const tankPoint = this.screenToTankPoint(pointer.x, pointer.y);

    if (mode.kind === "fish") {
      const type = fishTypes.find((fishType) => fishType.id === mode.fishTypeId);
      if (!type || this.getFishInventory(type.id) <= 0) {
        return;
      }

      if (!this.canTankAcceptFish(type)) {
        this.floatText(`Need Tank L${formatNumber(this.getFishTankLevel(type))}`, toastX, toastY, "#ffb0a8");
        return;
      }

      if (this.fish.length >= this.maxFishCapacityForLevel()) {
        this.floatText("Tank full", toastX, toastY, "#ffb0a8");
        return;
      }

      this.placeFishWithCompatibility(type, tankPoint.x, tankPoint.y);
      return;
    }

    if (mode.kind === "food") {
      const foodType = foodTypes.find((item) => item.id === mode.foodTypeId) ?? basicFood;
      if (this.getFoodInventory(foodType.id) <= 0) {
        return;
      }

      this.foodInventory.set(foodType.id, this.getFoodInventory(foodType.id) - 1);
      const pellet = new FoodPellet(this, tankPoint.x, tankPoint.y, foodType);
      pellet.addToContainer(this.tankLayer);
      this.foods.push(pellet);
      this.cleanliness = Phaser.Math.Clamp(this.cleanliness - 1.2, 0, 100);
      this.placementMode = this.getFoodInventory(foodType.id) > 0 ? { kind: "food", foodTypeId: foodType.id } : { kind: "none" };
      this.refreshUi();
      this.createFoodDock();
      this.saveNow();
      return;
    }

    if (mode.kind === "decoration") {
      const decoration = decorationTypes.find((item) => item.id === mode.decorationTypeId);
      if (!decoration || this.getDecorationInventory(decoration.id) <= 0) {
        return;
      }

      if (this.placedDecorations.length >= maxDecorations) {
        this.floatText("Decor full", toastX, toastY, "#ffb0a8");
        return;
      }

      this.decorationInventory.set(decoration.id, this.getDecorationInventory(decoration.id) - 1);
      this.addDecorationToTank(decoration, tankPoint.x, tankPoint.y);
      this.placementMode =
        this.getDecorationInventory(decoration.id) > 0
          ? { kind: "decoration", decorationTypeId: decoration.id }
          : { kind: "none" };
      this.refreshUi();
      this.saveNow();
    }
  }

  private addFishToTank(type: FishType, x: number, y: number, options: { gender?: FishGender; evolutionStage?: number } = {}): Fish {
    const placedFish = new Fish(this, type, x, y, options);
    placedFish.addToContainer(this.tankLayer);
    placedFish.sprite.setInteractive({ useHandCursor: true });
    placedFish.sprite.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.selectedFishIndex = this.fish.indexOf(placedFish);
      this.showFishDetails(placedFish);
    });
    this.fish.push(placedFish);
    return placedFish;
  }

  private placeFishWithCompatibility(type: FishType, x: number, y: number): void {
    if (!this.canTankAcceptFish(type)) {
      this.floatText(`Need Tank L${formatNumber(this.getFishTankLevel(type))}`, toastX, toastY, "#ffb0a8");
      return;
    }

    this.fishInventory.set(type.id, this.getFishInventory(type.id) - 1);
    const placedFish = this.addFishToTank(type, x, y);
    placedFish.markCoinDropped(this.time.now + 2500);

    this.floatTankText(`${type.name} added`, x, y - 34, "#ffffff");
    this.placementMode = { kind: "none" };
    this.closeModal();
    this.refreshUi();
    this.saveNow();
  }

  private randomFishPlacement(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      Phaser.Math.Between(tankBounds.left + 70, tankBounds.right - 70),
      Phaser.Math.Between(tankBounds.top + 150, tankBounds.bottom - 120)
    );
  }

  private addDecorationToTank(decoration: DecorationType, x: number, y: number): void {
    const image = this.add.image(x, y, decoration.texture).setDepth(y > tankBounds.bottom - 80 ? 5 : 3);
    image.setInteractive({ useHandCursor: true, draggable: true });
    this.tankLayer.add(image);
    const placedDecoration = { typeId: decoration.id, image };
    this.placedDecorations.push(placedDecoration);
    this.input.setDraggable(image);
    this.bindDecorationDrag(placedDecoration);
  }

  private bindDecorationDrag(decoration: PlacedDecoration): void {
    decoration.image.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
    });
    decoration.image.on("dragstart", () => {
      if (this.activeScreen !== "tank") {
        return;
      }

      this.draggedDecoration = decoration;
      decoration.image.setAlpha(0.78);
      decoration.image.setDepth(9);
      this.showDecorationTrashTarget(true);
      this.floatTankText("Drag to move", decoration.image.x, decoration.image.y - 36, "#d7f4ff");
    });
    decoration.image.on("drag", (pointer: Phaser.Input.Pointer) => {
      if (this.draggedDecoration !== decoration || this.activeScreen !== "tank") {
        return;
      }

      const tankPoint = this.screenToTankPoint(pointer.x, pointer.y);
      this.moveDecoration(decoration, tankPoint.x, tankPoint.y);
      this.highlightDecorationTrashTarget(decorationTrashZone.contains(pointer.x, pointer.y));
    });
    decoration.image.on("dragend", (pointer: Phaser.Input.Pointer) => {
      if (this.draggedDecoration !== decoration) {
        return;
      }

      decoration.image.setAlpha(1);
      this.showDecorationTrashTarget(false);
      this.draggedDecoration = undefined;

      if (this.activeScreen === "tank" && decorationTrashZone.contains(pointer.x, pointer.y)) {
        this.trashDecoration(decoration);
        return;
      }

      this.saveNow();
    });
  }

  private moveDecoration(decoration: PlacedDecoration, x: number, y: number): void {
    decoration.image.setPosition(
      Phaser.Math.Clamp(x, tankBounds.left + 24, tankBounds.right - 24),
      Phaser.Math.Clamp(y, tankBounds.top + 118, tankBounds.bottom - 30)
    );
    decoration.image.setDepth(this.draggedDecoration === decoration ? 9 : decoration.image.y > tankBounds.bottom - 80 ? 5 : 3);
  }

  private trashDecoration(decoration: PlacedDecoration): void {
    const index = this.placedDecorations.indexOf(decoration);
    if (index < 0) {
      return;
    }

    this.placedDecorations.splice(index, 1);
    const x = decoration.image.x;
    const y = decoration.image.y;
    decoration.image.destroy();
    this.floatTankText("Trashed", x, y - 24, "#ffccd5");
    this.refreshUi();
    this.saveNow();
  }

  private addHelperCreatureToTank(creatureType: HelperCreatureType, x: number, y = tankBounds.bottom - 36, targetX = x): HelperCreature {
    const yBounds = creatureType.feedSeconds
      ? { min: tankBounds.top + 132, max: tankBounds.bottom - 64 }
      : { min: tankBounds.bottom - 48, max: tankBounds.bottom - 28 };
    const helper = new HelperCreature(
      this,
      creatureType,
      Phaser.Math.Clamp(x, tankBounds.left + 24, tankBounds.right - 24),
      Phaser.Math.Clamp(y, yBounds.min, yBounds.max)
    );
    helper.restoreProgress(targetX);
    helper.addToContainer(this.tankLayer);
    helper.sprite.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.floatTankText(`${creatureType.name}: ${creatureType.feedSeconds ? "feeder" : "helper"}`, helper.sprite.x, helper.sprite.y - 24, "#d7f4ff");
    });
    this.helperCreatures.push(helper);
    return helper;
  }

  private restoreSavedGame(): void {
    const saved = loadGame();
    if (!saved) {
      return;
    }

    this.wallet = { ...saved.wallet };
    this.foodInventory = recordToMap(saved.foodInventory) as Map<FoodTypeId, number>;
    this.fishInventory = recordToMap(saved.fishInventory);
    this.decorationInventory = recordToMap(saved.decorationInventory);
    this.creatureInventory = recordToMap(saved.creatureInventory);
    this.cleanliness = saved.tank.cleanliness;
    this.cleanedAt = saved.tank.cleanedAt;
    this.tankLevel = Phaser.Math.Clamp(Math.floor(saved.tank.level ?? 1), 1, maxTankLevel);
    this.fishCatalogLevel = this.tankLevel;
    this.applyTankViewScale();
    this.renderTankPattern();
    this.settings = { ...saved.settings };
    this.dailyGoals = this.normalizeDailyGoals(saved.dailyGoals);
    this.autoFeederEndsAt = Math.max(0, saved.rentals?.autoFeederEndsAt ?? 0);
    this.autoCollectorEndsAt = Math.max(0, saved.rentals?.autoCollectorEndsAt ?? 0);
    this.autoFeederMinutes = this.sanitizeRentalMinutes(saved.rentals?.autoFeederMinutes ?? 1);
    this.autoCollectorMinutes = this.sanitizeRentalMinutes(saved.rentals?.autoCollectorMinutes ?? 1);

    for (const savedDecoration of saved.decorations) {
      const decoration = decorationTypes.find((item) => item.id === savedDecoration.typeId);
      if (decoration) {
        this.addDecorationToTank(decoration, savedDecoration.x, savedDecoration.y);
      }
    }

    for (const savedCreature of saved.helperCreatures) {
      const creatureType = helperCreatureTypes.find((item) => item.id === savedCreature.typeId);
      if (creatureType) {
        this.addHelperCreatureToTank(creatureType, savedCreature.x, savedCreature.y, savedCreature.targetX);
      }
    }

    for (const savedFish of saved.fish) {
      const type = fishTypes.find((fishType) => fishType.id === savedFish.typeId);
      if (!type) {
        continue;
      }

      const restoredFish = this.addFishToTank(type, savedFish.x, savedFish.y, {
        gender: savedFish.gender,
        evolutionStage: savedFish.evolutionStage
      });
      restoredFish.restoreProgress(
        savedFish.ageSeconds,
        savedFish.hunger,
        savedFish.health,
        this.time.now + savedFish.nextCoinDropInMs,
        savedFish.fatalCareSeconds
      );
    }

    const elapsedSeconds = calculateOfflineSeconds(saved.savedAt);
    if (elapsedSeconds > 0) {
      this.offlineProgress = this.applyOfflineProgress(elapsedSeconds);
      if (elapsedSeconds >= 60) {
        this.showOfflineSummary();
      }
      this.saveNow();
    }
  }

  private applyOfflineProgress(elapsedSeconds: number): OfflineProgress {
    const earned = createEmptyWallet();
    const offlineDeaths: Fish[] = [];

    for (const currentFish of this.fish) {
      const production = currentFish.primaryProduction();
      const wasInFatalCareState = currentFish.isInFatalCareState();
      const canProduce = currentFish.health >= 35 && currentFish.hunger < 86;
      if (canProduce) {
        const dropCount = Math.min(40, Math.floor(elapsedSeconds / production.intervalSeconds));
        earned[production.coinType] += dropCount * production.amount;
      }

      currentFish.setAgeSeconds(currentFish.ageSeconds + elapsedSeconds);
      currentFish.hunger = Phaser.Math.Clamp(
        currentFish.hunger + Math.min(52, currentFish.type.hungerPerSecond * elapsedSeconds * 0.045),
        0,
        100
      );

      if (currentFish.hunger > 86) {
        currentFish.health = Phaser.Math.Clamp(currentFish.health - Math.min(45, elapsedSeconds / 120), 0, 100);
      }

      currentFish.addFatalCareSeconds(wasInFatalCareState ? elapsedSeconds : 0);
      if (currentFish.isDeadFromNeglect()) {
        offlineDeaths.push(currentFish);
      }

      currentFish.nextCoinDropAt = this.time.now + production.intervalSeconds * 1000;
    }

    for (const deadFish of offlineDeaths) {
      const index = this.fish.indexOf(deadFish);
      if (index >= 0) {
        this.removeFishAt(index);
      }
    }

    this.cleanliness = Phaser.Math.Clamp(
      this.cleanliness - Math.min(50, elapsedSeconds * (0.0015 + this.fish.length * 0.0004)),
      0,
      100
    );

    for (const coinType of Object.keys(earned) as Array<keyof Wallet>) {
      if (earned[coinType] > 0) {
        earn(this.wallet, coinType, earned[coinType]);
      }
    }

    return { elapsedSeconds, earned };
  }

  private saveNow(savedAt = Date.now()): void {
    const snapshot: SavedGame = {
      version: SAVE_VERSION,
      savedAt,
      wallet: { ...this.wallet },
      foodInventory: this.foodInventoryRecord(),
      fishInventory: mapToRecord(this.fishInventory),
      decorationInventory: mapToRecord(this.decorationInventory),
      creatureInventory: mapToRecord(this.creatureInventory),
      fish: this.fish.map((currentFish) => ({
        typeId: currentFish.type.id,
        x: currentFish.sprite.x,
        y: currentFish.sprite.y,
        ageSeconds: currentFish.ageSeconds,
        hunger: currentFish.hunger,
        health: currentFish.health,
        nextCoinDropInMs: Math.max(0, currentFish.nextCoinDropAt - this.time.now),
        fatalCareSeconds: currentFish.fatalCareSeconds,
        gender: currentFish.gender,
        evolutionStage: currentFish.evolutionStage
      })),
      decorations: this.placedDecorations.map((decoration) => ({
        typeId: decoration.typeId,
        x: decoration.image.x,
        y: decoration.image.y
      })),
      helperCreatures: this.helperCreatures.map((helper) => ({
        typeId: helper.type.id,
        x: helper.sprite.x,
        y: helper.sprite.y,
        targetX: helper.getTargetX()
      })),
      tank: {
        cleanliness: this.cleanliness,
        cleanedAt: this.cleanedAt,
        level: this.tankLevel
      },
      settings: { ...this.settings },
      dailyGoals: {
        date: this.dailyGoals.date,
        claimed: [...this.dailyGoals.claimed]
      },
      rentals: {
        autoFeederEndsAt: this.isAutoFeederActive() ? this.autoFeederEndsAt : 0,
        autoCollectorEndsAt: this.isAutoCollectorActive() ? this.autoCollectorEndsAt : 0,
        autoFeederMinutes: this.autoFeederMinutes,
        autoCollectorMinutes: this.autoCollectorMinutes
      }
    };

    saveGame(snapshot);
  }

  private spendPrice(price: FishType["price"]): boolean {
    if (!spend(this.wallet, price)) {
      this.floatText(`Need ${formatPrice(price)}`, toastX, toastY, "#ffb0a8");
      return false;
    }

    return true;
  }

  private dropCoin(fish: Fish): void {
    const production = fish.activeProduction();
    this.createCoinDrop(fish.sprite.x, fish.sprite.y - 24, production.amount, production.coinType);
  }

  private createCoinDrop(x: number, y: number, value: number, coinType: CoinType): CoinDrop {
    const coin = new CoinDrop(this, x, y, value, coinType);
    coin.addToContainer(this.tankLayer);
    coin.sprite.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.collectCoin(coin, false);
    });
    this.coinDrops.push(coin);
    return coin;
  }

  private collectCoin(coin: CoinDrop, automated: boolean): void {
    if (!this.coinDrops.includes(coin)) {
      return;
    }

    earn(this.wallet, coin.coinType, coin.value);
    this.floatTankText(automated ? `Auto +${formatNumber(coin.value)}` : `+${formatNumber(coin.value)}`, coin.sprite.x, coin.sprite.y - 20, coin.visual.textColor);
    this.coinDrops = this.coinDrops.filter((drop) => drop !== coin);
    coin.destroy();
    this.refreshUi();
    this.saveNow();
  }

  private removeFood(food: FoodPellet): void {
    this.foods = this.foods.filter((item) => item !== food);
    food.destroy();
  }

  private refreshUi(renderControls = true): void {
    this.hudText.setText(`${formatWallet(this.wallet)} | W:${formatNumber(this.calculateTotalWealth())}`);
    this.modeText.setText(this.getCareStatusLabel());
    if (renderControls) {
      this.createFoodDock();
      this.renderTabControls();
    }
    this.refreshStatus();
  }

  private refreshStatus(): void {
    if (this.fish.length === 0) {
      this.statusText.setText(`Tank L${formatNumber(this.tankLevel)} | Fish 0/${formatNumber(this.maxFishCapacityForLevel())} | Coin ${formatNumber(this.coinDrops.length)}`);
      this.modeText.setText(this.getCareStatusLabel());
      return;
    }

    const counts = this.fish.reduce(
      (summary, currentFish) => {
        summary[currentFish.state] += 1;
        return summary;
      },
      { happy: 0, hungry: 0, ill: 0 } as Record<FishState, number>
    );

    this.statusText.setText(
      `Tank L${formatNumber(this.tankLevel)} | Fish ${formatNumber(this.fish.length)}/${formatNumber(this.maxFishCapacityForLevel())} | H${formatNumber(counts.happy)} Hu${formatNumber(counts.hungry)} I${formatNumber(counts.ill)} | Coin ${formatNumber(this.coinDrops.length)}`
    );
    this.modeText.setText(this.getCareStatusLabel());
  }

  private getCareStatusLabel(): string {
    const actionLabel = this.placementMode.kind === "none" ? this.getCompactTankNeedIndicator() : this.getModeLabel();
    return `Food ${formatNumber(this.getTotalFoodInventory())} | Clean ${formatNumber(Math.round(this.cleanliness))}% | Happy ${formatNumber(Math.round(this.calculateTankHappiness()))}% | ${actionLabel}`;
  }

  private getModeLabel(): string {
    const mode = this.placementMode;

    if (mode.kind === "fish") {
      const fishType = fishTypes.find((item) => item.id === mode.fishTypeId);
      return `Selected: place ${fishType?.name ?? "fish"} in the tank`;
    }

    if (mode.kind === "food") {
      const foodType = foodTypes.find((item) => item.id === mode.foodTypeId);
      return `Selected: drop ${foodType?.name ?? "food"} in the tank`;
    }

    if (mode.kind === "decoration") {
      const decorationType = decorationTypes.find((item) => item.id === mode.decorationTypeId);
      return `Selected: place ${decorationType?.name ?? "decoration"}`;
    }

    return this.rentalStatusLabel() || this.getTankNeedIndicator();
  }

  private foodIconLabel(foodType: FoodType): string {
    const labels: Record<FoodTypeId, string> = {
      micro: "Micro",
      basic: "Food",
      premium: "Prem",
      herb: "Herb",
      protein: "Prot",
      coral: "Coral",
      medicine: "Med",
      evolve: "Evolve",
      event: "Event"
    };
    return `${labels[foodType.id]}\nx${formatNumber(this.getFoodInventory(foodType.id))}`;
  }

  private isDroppableFood(foodTypeId: FoodTypeId): boolean {
    return foodTypeId !== evolvePillFoodTypeId;
  }

  private getFishInventory(fishTypeId: string): number {
    return this.fishInventory.get(fishTypeId) ?? 0;
  }

  private getFoodInventory(foodTypeId: FoodTypeId): number {
    return this.foodInventory.get(foodTypeId) ?? 0;
  }

  private getFoodBuyQuantity(foodTypeId: FoodTypeId): number {
    return this.foodBuyQuantities.get(foodTypeId) ?? 1;
  }

  private changeFoodBuyQuantity(foodTypeId: FoodTypeId, delta: number): void {
    const quantity = Phaser.Math.Clamp(this.getFoodBuyQuantity(foodTypeId) + delta, 1, 99);
    this.foodBuyQuantities.set(foodTypeId, quantity);
    this.renderTabControls();
    this.refreshUi(false);
  }

  private addFoodBuyQuantity(foodTypeId: FoodTypeId, quantityToAdd: number): void {
    const currentQuantity = this.getFoodBuyQuantity(foodTypeId);
    const nextQuantity = this.foodBuyQuantities.has(foodTypeId) ? currentQuantity + quantityToAdd : quantityToAdd;
    this.foodBuyQuantities.set(foodTypeId, Phaser.Math.Clamp(Math.floor(nextQuantity), 1, 99));
    this.renderTabControls();
    this.refreshUi(false);
  }

  private setFoodBuyQuantity(foodTypeId: FoodTypeId, quantity: number): void {
    if (quantity <= 0) {
      this.resetFoodBuyQuantity(foodTypeId);
      return;
    }

    this.foodBuyQuantities.set(foodTypeId, Phaser.Math.Clamp(Math.floor(quantity), 1, 99));
    this.renderTabControls();
    this.refreshUi(false);
  }

  private resetFoodBuyQuantity(foodTypeId: FoodTypeId): void {
    this.foodBuyQuantities.delete(foodTypeId);
    this.renderTabControls();
    this.refreshUi(false);
  }

  private foodBuyQuantityRecord(): Record<string, number> {
    return Object.fromEntries(foodTypes.map((foodType) => [foodType.id, this.getFoodBuyQuantity(foodType.id)]));
  }

  private quantityPrice(price: FishType["price"], quantity: number): FishType["price"] {
    return {
      coinType: price.coinType,
      amount: price.amount * Phaser.Math.Clamp(Math.floor(quantity), 1, 99)
    };
  }

  private getTotalFoodInventory(): number {
    return [...this.foodInventory.values()].reduce((total, count) => total + count, 0);
  }

  private foodInventoryRecord(): Record<FoodTypeId, number> {
    return Object.fromEntries(
      [...this.foodInventory.entries()].filter(([, count]) => count > 0)
    ) as Record<FoodTypeId, number>;
  }

  private getSelectedFoodType(): FoodType {
    return foodTypes.find((foodType) => foodType.id === this.selectedFoodTypeId) ?? basicFood;
  }

  private cycleSelectedFood(): void {
    const currentIndex = foodTypes.findIndex((foodType) => foodType.id === this.selectedFoodTypeId);
    const nextFood = foodTypes[(currentIndex + 1 + foodTypes.length) % foodTypes.length];
    this.selectedFoodTypeId = nextFood.id;
    this.placementMode = { kind: "none" };
    this.refreshUi();
  }

  private describeFoodInventory(): string {
    const owned = foodTypes
      .filter((foodType) => this.getFoodInventory(foodType.id) > 0)
      .map((foodType) => `${foodType.name} x${formatNumber(this.getFoodInventory(foodType.id))}`);
    return owned.length > 0 ? owned.join(", ") : "empty";
  }

  private getDecorationInventory(decorationTypeId: string): number {
    return this.decorationInventory.get(decorationTypeId) ?? 0;
  }

  private getCreatureInventory(creatureTypeId: string): number {
    return this.creatureInventory.get(creatureTypeId) ?? 0;
  }

  private getFishTankLevel(fishType: FishType): number {
    return Phaser.Math.Clamp(Math.floor(fishType.tankLevel ?? 1), 1, maxTankLevel);
  }

  private canTankAcceptFish(fishType: FishType): boolean {
    return this.getFishTankLevel(fishType) <= this.tankLevel;
  }

  private evolutionFee(targetFish: Fish): FishType["price"] {
    const coinType = targetFish.type.price.coinType;
    const amount = Math.max(8, Math.ceil(targetFish.type.price.amount * (0.5 + targetFish.evolutionStage * 0.35)));
    return { coinType, amount };
  }

  private findBreedMate(index: number): number | undefined {
    const parent = this.fish[index];
    if (!parent) {
      return undefined;
    }

    return this.fish.findIndex(
      (candidate, candidateIndex) =>
        candidateIndex !== index &&
        candidate.type.id === parent.type.id &&
        candidate.gender !== parent.gender
    );
  }

  private chooseBreedBabyType(parentType: FishType, force?: "same" | "rare"): FishType {
    const shouldRare = force === "rare" || (force !== "same" && Phaser.Math.Between(1, 100) <= 30);
    if (!shouldRare) {
      return parentType;
    }

    const rareChoices = fishTypes.filter(
      (fishType) =>
        fishType.rarity === "rare" &&
        this.canTankAcceptFish(fishType)
    );
    return Phaser.Utils.Array.GetRandom(rareChoices) ?? parentType;
  }

  private changeFishCatalogLevel(delta: number): void {
    this.fishCatalogLevel = Phaser.Math.Wrap(this.fishCatalogLevel - 1 + delta, 0, maxTankLevel) + 1;
    this.renderTabControls();
  }

  private getNextTankUpgradePrice(): FishType["price"] | undefined {
    return this.tankLevel < maxTankLevel ? tankUpgradePrices[this.tankLevel + 1] : undefined;
  }

  private upgradeTank(): void {
    const price = this.getNextTankUpgradePrice();
    if (!price) {
      this.floatText("Tank maxed", toastX, toastY, "#d7f4ff");
      return;
    }

    if (!this.spendPrice(price)) {
      return;
    }

    this.tankLevel = Phaser.Math.Clamp(this.tankLevel + 1, 1, maxTankLevel);
    this.fishCatalogLevel = this.tankLevel;
    this.applyTankViewScale();
    this.renderTankPattern();
    this.floatText(`Tank L${formatNumber(this.tankLevel)}`, toastX, toastY, "#a8ffb0");
    this.refreshUi();
    this.saveNow();
  }

  private walletWealth(wallet = this.wallet): number {
    return wallet.common * coinWealthValue.common + wallet.rare * coinWealthValue.rare + wallet.superRare * coinWealthValue.superRare;
  }

  private priceWealth(price: FishType["price"]): number {
    return price.amount * coinWealthValue[price.coinType];
  }

  private calculateTotalWealth(): number {
    const fishValue = this.fish.reduce((total, currentFish) => total + this.priceWealth({
      coinType: currentFish.type.sellBaseValue.coinType,
      amount: currentFish.getSellValue()
    }), 0);
    const foodValue = [...this.foodInventory.entries()].reduce((total, [foodTypeId, count]) => {
      const foodType = foodTypes.find((item) => item.id === foodTypeId);
      return total + (foodType ? this.priceWealth(foodType.price) * count : 0);
    }, 0);
    const storedFishValue = [...this.fishInventory.entries()].reduce((total, [fishTypeId, count]) => {
      const fishType = fishTypes.find((item) => item.id === fishTypeId);
      return total + (fishType ? this.priceWealth(fishType.sellBaseValue) * count : 0);
    }, 0);
    const decorationValue = [...this.decorationInventory.entries()].reduce((total, [decorationTypeId, count]) => {
      const decorationType = decorationTypes.find((item) => item.id === decorationTypeId);
      return total + (decorationType ? this.priceWealth(decorationType.price) * count : 0);
    }, 0);
    const helperInventoryValue = [...this.creatureInventory.entries()].reduce((total, [creatureTypeId, count]) => {
      const creatureType = helperCreatureTypes.find((item) => item.id === creatureTypeId);
      return total + (creatureType ? this.priceWealth(creatureType.price) * count : 0);
    }, 0);
    const helperValue = this.helperCreatures.reduce((total, helper) => total + this.priceWealth(helper.type.price), 0);
    const coinDropValue = this.coinDrops.reduce((total, coin) => total + coin.value * coinWealthValue[coin.coinType], 0);

    return Math.round(this.walletWealth() + fishValue + foodValue + storedFishValue + decorationValue + helperInventoryValue + helperValue + coinDropValue);
  }

  private getTankNeedIndicator(): string {
    const nextLockedFish = fishTypes.find((fishType) => this.getFishTankLevel(fishType) > this.tankLevel);
    const upgradePrice = this.getNextTankUpgradePrice();
    const growthBlockedFish = this.fish.find((currentFish) => currentFish.isGrowthLimitedByTank());
    if (upgradePrice && growthBlockedFish) {
      return `Tank L${formatNumber(this.tankLevel)}: ${growthBlockedFish.type.name} needs L${formatNumber(this.tankLevel + 1)} room`;
    }

    if (upgradePrice && nextLockedFish && canAfford(this.wallet, upgradePrice)) {
      return `Tank L${formatNumber(this.tankLevel)}: upgrade ready for L${formatNumber(this.tankLevel + 1)} fish`;
    }

    if (this.fish.length === 0) {
      return "Tank needs a fish from Shop";
    }

    if (this.getTotalFoodInventory() === 0 && this.fish.some((currentFish) => currentFish.hunger >= 45)) {
      return "Tank needs food purchase";
    }

    if (this.coinDrops.length >= maxCoinDrops) {
      return "Tank needs coin collection";
    }

    if (upgradePrice && nextLockedFish) {
      return `Next: save ${formatPrice(upgradePrice)} for Tank L${formatNumber(this.tankLevel + 1)}`;
    }

    return `Tank L${formatNumber(this.tankLevel)}: stable`;
  }

  private getCompactTankNeedIndicator(): string {
    const nextLockedFish = fishTypes.find((fishType) => this.getFishTankLevel(fishType) > this.tankLevel);
    const upgradePrice = this.getNextTankUpgradePrice();
    if (upgradePrice && this.fish.some((currentFish) => currentFish.isGrowthLimitedByTank())) {
      return `Need bigger tank`;
    }

    if (upgradePrice && nextLockedFish && canAfford(this.wallet, upgradePrice)) {
      return `Upgrade ready L${formatNumber(this.tankLevel + 1)}`;
    }

    if (this.fish.length === 0) {
      return "Need fish";
    }

    if (this.getTotalFoodInventory() === 0 && this.fish.some((currentFish) => currentFish.hunger >= 45)) {
      return "Need food";
    }

    if (this.coinDrops.length >= maxCoinDrops) {
      return "Collect coins";
    }

    if (upgradePrice && nextLockedFish) {
      return `Next ${formatPrice(upgradePrice)} -> L${formatNumber(this.tankLevel + 1)}`;
    }

    return `Stable L${formatNumber(this.tankLevel)}`;
  }

  private calculateTankHappiness(): number {
    const decorationBonus = this.placedDecorations.reduce((total, placedDecoration) => {
      const decoration = decorationTypes.find((item) => item.id === placedDecoration.typeId);
      return total + (decoration?.happinessBonus ?? 0);
    }, 0);
    const crowdingPenalty = Math.max(0, this.fish.length - 4) * 8 + Math.max(0, this.placedDecorations.length - 6) * 4;
    const cleanlinessPenalty = Math.max(0, 75 - this.cleanliness) * 0.55;
    return Phaser.Math.Clamp(68 + decorationBonus - crowdingPenalty - cleanlinessPenalty, 0, 100);
  }

  private calculateCurrentCompatibility(): CompatibilitySummary {
    return this.calculateCompatibilityForTypes(this.fish.map((currentFish) => currentFish.type));
  }

  private calculatePlacementCompatibility(candidate: FishType): CompatibilitySummary {
    return this.calculateCompatibilityForTypes([...this.fish.map((currentFish) => currentFish.type), candidate], candidate);
  }

  private calculateCompatibilityForTypes(_types: FishType[], _candidate?: FishType): CompatibilitySummary {
    return { score: 100, level: "good", warnings: [], incompatibleNames: [] };
  }

  private cleanTank(): void {
    if (this.cleanliness >= 96) {
      this.floatText("Already clean", toastX, toastY, "#d7f4ff");
      return;
    }

    this.cleanliness = 100;
    this.cleanedAt = Date.now();
    this.floatText("Tank cleaned", toastX, toastY, "#a8ffb0");
    this.refreshUi();
    this.saveNow();
  }

  private rentAutoFeeder(): void {
    if (this.getFeedableFoodTypes().length === 0) {
      this.floatText("Buy food first", toastX, toastY, "#ffb0a8");
      return;
    }

    const wasActive = this.isAutoFeederActive();
    const price = this.rentalPrice(autoFeederPrice, this.autoFeederMinutes);
    if (!this.spendPrice(price)) {
      return;
    }

    this.autoFeederEndsAt = this.extendRentalEnd(this.autoFeederEndsAt, this.autoFeederMinutes);
    if (!wasActive) {
      this.nextAutoFeedAt = 0;
    }
    this.floatText(wasActive ? `Auto feed +${formatNumber(this.autoFeederMinutes)}m` : `Auto feed ${formatNumber(this.autoFeederMinutes)}m`, toastX, toastY, "#a8ffb0");
    this.refreshUi();
    this.saveNow();
  }

  private rentAutoCollector(): void {
    const wasActive = this.isAutoCollectorActive();
    const price = this.rentalPrice(autoCollectorPrice, this.autoCollectorMinutes);
    if (!this.spendPrice(price)) {
      return;
    }

    this.autoCollectorEndsAt = this.extendRentalEnd(this.autoCollectorEndsAt, this.autoCollectorMinutes);
    if (!wasActive) {
      this.nextAutoCollectAt = 0;
    }
    this.floatText(wasActive ? `Auto coins +${formatNumber(this.autoCollectorMinutes)}m` : `Auto coins ${formatNumber(this.autoCollectorMinutes)}m`, toastX, toastY, "#a8ffb0");
    this.refreshUi();
    this.saveNow();
  }

  private changeRentalMinutes(rental: "feeder" | "collector", delta: number): void {
    if (rental === "feeder") {
      this.autoFeederMinutes = this.sanitizeRentalMinutes(this.autoFeederMinutes + delta);
      this.floatText(`Feed ${formatNumber(this.autoFeederMinutes)}m`, toastX, toastY, "#d7f4ff");
    } else {
      this.autoCollectorMinutes = this.sanitizeRentalMinutes(this.autoCollectorMinutes + delta);
      this.floatText(`Coins ${formatNumber(this.autoCollectorMinutes)}m`, toastX, toastY, "#d7f4ff");
    }

    this.refreshUi();
    this.saveNow();
  }

  private setRentalMinutes(rental: "feeder" | "collector", minutes: number): void {
    if (rental === "feeder") {
      this.autoFeederMinutes = this.sanitizeRentalMinutes(minutes);
    } else {
      this.autoCollectorMinutes = this.sanitizeRentalMinutes(minutes);
    }

    this.refreshUi();
    this.saveNow();
  }

  private sanitizeRentalMinutes(minutes: number): number {
    return Phaser.Math.Clamp(Math.floor(minutes), minRentalMinutes, maxRentalMinutes);
  }

  private rentalPrice(basePrice: FishType["price"], minutes: number): FishType["price"] {
    return {
      coinType: basePrice.coinType,
      amount: basePrice.amount * this.sanitizeRentalMinutes(minutes)
    };
  }

  private extendRentalEnd(currentEndsAt: number, minutes: number): number {
    return Math.max(Date.now(), currentEndsAt) + this.sanitizeRentalMinutes(minutes) * rentalMinuteMs;
  }

  private updateRentals(): void {
    this.updateAutoFeeder();

    if (this.autoFeederEndsAt > 0 && !this.isAutoFeederActive()) {
      this.autoFeederEndsAt = 0;
      this.floatText("Auto feeder ended", toastX, toastY, "#d7f4ff");
      this.refreshUi(false);
      this.saveNow();
    }

    if (this.autoCollectorEndsAt > 0 && !this.isAutoCollectorActive()) {
      this.autoCollectorEndsAt = 0;
      this.floatText("Auto coins ended", toastX, toastY, "#d7f4ff");
      this.refreshUi(false);
      this.saveNow();
    }
  }

  private updateAutoFeeder(): void {
    if (!this.isAutoFeederActive() || this.time.now < this.nextAutoFeedAt) {
      return;
    }

    this.nextAutoFeedAt = this.time.now + 3200;
    const fishNeedingFood = this.fish
      .filter((currentFish) => currentFish.health >= 35 && currentFish.hunger >= 50)
      .sort((first, second) => second.hunger - first.hunger);
    if (fishNeedingFood.length === 0) {
      return;
    }

    let droppedCount = 0;
    for (const targetFish of fishNeedingFood) {
      const foodType = this.chooseAutoFoodForFish(targetFish);
      if (!foodType) {
        continue;
      }

      this.dropAutoFood(foodType);
      droppedCount += 1;
    }

    if (droppedCount === 0) {
      return;
    }

    this.cleanliness = Phaser.Math.Clamp(this.cleanliness - 0.6 * droppedCount, 0, 100);
    this.createFoodDock();
    this.refreshUi(false);
    this.saveNow();
  }

  private dropAutoFood(foodType: FoodType): void {
    this.foodInventory.set(foodType.id, this.getFoodInventory(foodType.id) - 1);
    const x = Phaser.Math.Between(tankBounds.left + 36, tankBounds.right - 36);
    const y = tankBounds.top + Phaser.Math.Between(138, 176);
    const pellet = new FoodPellet(this, x, y, foodType);
    pellet.addToContainer(this.tankLayer);
    this.foods.push(pellet);
    this.floatTankText("Auto feed", x, y - 14, "#f7ff9a");
  }

  private updateAutoCollector(): void {
    if (!this.isAutoCollectorActive() || this.time.now < this.nextAutoCollectAt) {
      return;
    }

    this.nextAutoCollectAt = this.time.now + 350;
    const settledCoins = this.coinDrops.filter((coin) => coin.atBottom);
    for (const coin of settledCoins) {
      this.collectCoin(coin, true);
    }
  }

  private updateHelperCreatures(deltaSeconds: number): void {
    for (const helper of this.helperCreatures) {
      const action = helper.update(deltaSeconds, this.coinDrops, this.foods, this.fish);
      if (!action) {
        continue;
      }

      if (action.kind === "coin" && this.coinDrops.includes(action.coin)) {
        this.collectCoin(action.coin, true);
        this.floatTankText(`${helper.type.name} coin`, helper.sprite.x, helper.sprite.y - 20, "#ffe67a");
      }

      if (action.kind === "food" && this.foods.includes(action.food)) {
        this.removeFood(action.food);
        this.cleanliness = Phaser.Math.Clamp(this.cleanliness + 1.4, 0, 100);
        this.floatTankText("Cleaned", helper.sprite.x, helper.sprite.y - 20, "#a8ffb0");
        this.saveNow();
      }

      if (action.kind === "feed" && this.fish.includes(action.fish)) {
        const foodType = this.chooseAutoFoodForFish(action.fish);
        if (!foodType) {
          continue;
        }

        this.dropHelperFood(helper, action.fish, foodType);
      }
    }
  }

  private dropHelperFood(helper: HelperCreature, targetFish: Fish, foodType: FoodType): void {
    this.foodInventory.set(foodType.id, this.getFoodInventory(foodType.id) - 1);
    const direction = helper.sprite.x < tankBounds.centerX ? 1 : -1;
    const x = Phaser.Math.Clamp(helper.sprite.x + direction * 28, tankBounds.left + 28, tankBounds.right - 28);
    const y = Phaser.Math.Clamp(helper.sprite.y, tankBounds.top + 138, tankBounds.bottom - 120);
    const pellet = new FoodPellet(this, x, y, foodType, { velocityX: direction * 82 });
    pellet.addToContainer(this.tankLayer);
    this.foods.push(pellet);
    this.cleanliness = Phaser.Math.Clamp(this.cleanliness - 0.4, 0, 100);
    this.floatTankText(`${helper.type.name} tossed food`, x, y - 14, "#f7ff9a");
    this.createFoodDock();
    this.refreshUi(false);
    this.saveNow();
  }

  private chooseAutoFoodForFish(targetFish: Fish): FoodType | undefined {
    const choices = [
      ...targetFish.type.preferredFoodTypes,
      ...targetFish.type.requiredFoodTypes,
      ...foodTypes.filter((foodType) => foodType.acceptedByDefault).map((foodType) => foodType.id)
    ];

    for (const foodTypeId of choices) {
      if (foodTypeId === "medicine" || !this.isDroppableFood(foodTypeId) || this.getFoodInventory(foodTypeId) <= 0) {
        continue;
      }

      const foodType = foodTypes.find((item) => item.id === foodTypeId);
      if (foodType) {
        return foodType;
      }
    }

    return undefined;
  }

  private getFeedableFoodTypes(): FoodType[] {
    return foodTypes.filter((foodType) => foodType.id !== "medicine" && this.isDroppableFood(foodType.id) && this.getFoodInventory(foodType.id) > 0);
  }

  private isAutoFeederActive(): boolean {
    return this.autoFeederEndsAt > Date.now();
  }

  private isAutoCollectorActive(): boolean {
    return this.autoCollectorEndsAt > Date.now();
  }

  private remainingRentalSeconds(endsAt: number): number {
    return Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
  }

  private rentalStatusLabel(): string {
    const active: string[] = [];
    if (this.isAutoFeederActive()) {
      active.push(`Feed ${formatNumber(this.remainingRentalSeconds(this.autoFeederEndsAt))}s`);
    }
    if (this.isAutoCollectorActive()) {
      active.push(`Coins ${formatNumber(this.remainingRentalSeconds(this.autoCollectorEndsAt))}s`);
    }
    return active.join(" | ");
  }

  private normalizeDailyGoals(savedGoals: { date: string; claimed: string[] }): { date: string; claimed: string[] } {
    const today = this.localDateKey();
    if (savedGoals.date !== today) {
      return { date: today, claimed: [] };
    }

    return { date: today, claimed: savedGoals.claimed };
  }

  private localDateKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private claimDailyGoal(id: string, complete: boolean): void {
    if (this.dailyGoals.claimed.includes(id)) {
      this.floatText("Already claimed", toastX, toastY, "#d7f4ff");
      return;
    }

    if (!complete) {
      this.floatText("Goal not done", toastX, toastY, "#ffb0a8");
      return;
    }

    this.dailyGoals.claimed.push(id);
    earn(this.wallet, "common", 15);
    this.floatText(`+${formatNumber(15)} daily`, toastX, toastY, "#ffe67a");
    this.refreshUi();
    this.saveNow();
  }

  private toggleSetting(key: keyof typeof this.settings): void {
    this.settings[key] = !this.settings[key];
    this.refreshUi();
    this.saveNow();
  }

  private rarityLabel(rarity: FishType["rarity"]): string {
    const labels: Record<FishType["rarity"], string> = {
      common: "C",
      rare: "R",
      superRare: "SR"
    };
    return labels[rarity];
  }

  private rarityStarsLabel(rarity: FishType["rarity"]): string {
    return "*".repeat(rarityStarCount(rarity));
  }

  private showFirstFishDetails(): void {
    const targetFish = this.selectedFishIndex !== undefined ? this.fish[this.selectedFishIndex] : this.fish[0];
    if (!targetFish) {
      this.floatText("No fish yet", toastX, toastY, "#ffb0a8");
      return;
    }

    this.showFishDetails(targetFish);
  }

  private showFishDetails(targetFish: Fish): void {
    const index = this.fish.indexOf(targetFish);
    this.selectedFishIndex = index >= 0 ? index : undefined;
    const production = targetFish.primaryProduction();
    const preferredFood = targetFish.type.preferredFoodTypes.join(", ");
    const requiredFood = targetFish.type.requiredFoodTypes.join(", ");
    this.showModal(
      `${targetFish.type.name} Details`,
      [
        `${"*".repeat(rarityStarCount(targetFish.type.rarity))} ${targetFish.type.rarity} | Tank L${formatNumber(this.getFishTankLevel(targetFish.type))} | Age ${targetFish.ageLabel()} | ${targetFish.state}`,
        `Gender ${targetFish.gender} | Evo ${formatNumber(targetFish.evolutionStage)}/${formatNumber(maxEvolutionStage)} | Sell ${formatPrice({ coinType: targetFish.type.sellBaseValue.coinType, amount: targetFish.getSellValue() })}`,
        `Hunger ${formatNumber(Math.round(targetFish.hunger))} | Health ${formatNumber(Math.round(targetFish.health))} | Evolve ${formatPrice(this.evolutionFee(targetFish))}`,
        `Eats ${requiredFood}; prefers ${preferredFood}`,
        `Produces ${formatNumber(production.amount)} ${production.coinType} every ${formatNumber(production.intervalSeconds)}s`,
        `Community: ${this.describeCompatibility(targetFish.type)}`
      ],
      [
        { label: "Sell", fill: 0x76512d, action: () => this.showSellConfirmation(index) },
        { label: "Close", fill: 0x254d68, action: () => this.closeModal() }
      ]
    );
  }

  private describeCompatibility(_fishType: FishType): string {
    const compatibility = this.calculateCurrentCompatibility();
    return `${formatNumber(compatibility.score)}% community safe`;
  }

  private showSellConfirmation(index: number): void {
    const targetFish = this.fish[index];
    if (!targetFish) {
      this.floatText("No fish to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    if (this.fish.length <= 1) {
      this.showModal(
        "Starter Protected",
        [
          "Keep at least one fish in the tank.",
          "Buy another fish before selling this one."
        ],
        [{ label: "OK", fill: 0x356a35, action: () => this.closeModal() }]
      );
      return;
    }

    const protectedRarity = targetFish.type.rarity !== "common" || targetFish.type.acquisitionSources.includes("event");
    this.showModal(
      protectedRarity ? "Sell Rare Fish" : "Sell Fish",
      [
        `${targetFish.type.name} will leave this tank.`,
        `Rarity: ${targetFish.type.rarity} | Age ${targetFish.ageLabel()}`,
        ...(protectedRarity ? ["Rare and event fish require extra care before selling."] : []),
        `You receive ${formatPrice({ coinType: targetFish.type.sellBaseValue.coinType, amount: targetFish.getSellValue() })}.`
      ],
      [
        { label: "Confirm", fill: 0x76512d, action: () => this.sellFishByIndex(index) },
        { label: "Cancel", fill: 0x254d68, action: () => this.closeModal() }
      ]
    );
  }

  private showHelperSellConfirmation(index: number): void {
    const targetHelper = this.helperCreatures[index];
    if (!targetHelper) {
      this.floatText("No helper to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellPrice = this.helperSellPrice(targetHelper.type);
    this.showModal(
      "Sell Helper",
      [
        `${targetHelper.type.name} will leave this tank.`,
        `Role: ${targetHelper.type.feedSeconds ? "Feeder" : targetHelper.type.habitatTags.join(", ")}`,
        `You receive ${formatPrice(sellPrice)}.`
      ],
      [
        { label: "Confirm", fill: 0x76512d, action: () => this.sellHelperCreatureByIndex(index) },
        { label: "Cancel", fill: 0x254d68, action: () => this.closeModal() }
      ]
    );
  }

  private showOfflineSummary(): void {
    this.showModal(
      "Offline Summary",
      [
        `${formatNumber(Math.floor(this.offlineProgress.elapsedSeconds / 60))} minutes away.`,
        `Earned ${formatWallet(this.offlineProgress.earned)}.`,
        `Cleanliness is ${formatNumber(Math.round(this.cleanliness))}%. Fish grew and got a little hungrier.`
      ],
      [{ label: "Continue", fill: 0x356a35, action: () => this.closeModal() }]
    );
  }

  private showResetConfirmation(): void {
    this.showModal(
      "Reset Save",
      ["This clears the local aquarium save on this device.", "The page will return to the starter wallet and food."],
      [
        {
          label: "Reset",
          fill: 0x76512d,
          action: () => {
            clearSave();
            window.location.reload();
          }
        },
        { label: "Cancel", fill: 0x254d68, action: () => this.closeModal() }
      ]
    );
  }

  private showModal(
    title: string,
    lines: string[],
    actions: Array<{ label: string; fill: number; action: () => void }>
  ): void {
    this.closeModal();
    this.modalTitle = title;

    const background = this.add.rectangle(0, 0, 360, 240, 0x10283a, 0.98).setStrokeStyle(2, 0xbcefff, 0.75);
    background.setInteractive();
    background.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
    });
    const titleText = this.add.text(-160, -104, title, {
      fontFamily: "Arial",
      fontSize: "17px",
      color: "#ffffff",
      fontStyle: "bold",
      fixedWidth: 320
    });
    const bodyText = this.add.text(-160, -72, lines.join("\n"), {
      fontFamily: "Arial",
      fontSize: "12px",
      color: "#eaf9ff",
      fixedWidth: 320,
      lineSpacing: 7,
      wordWrap: { width: 320 }
    });
    const children: Phaser.GameObjects.GameObject[] = [background, titleText, bodyText];

    actions.forEach((action, index) => {
      const width = actions.length === 1 ? 300 : 142;
      const x = actions.length === 1 ? -150 : -150 + index * 158;
      children.push(this.createModalButton(x, 78, width, action.label, action.fill, action.action));
    });

    this.modal = this.add.container(gameWidth / 2, gameHeight / 2 - 10, children).setDepth(80);
  }

  private createModalButton(
    x: number,
    y: number,
    width: number,
    label: string,
    fill: number,
    action: () => void
  ): Phaser.GameObjects.Container {
    const background = this.add.rectangle(0, 0, width, 36, fill, 1).setStrokeStyle(1, 0xbcefff, 0.55);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: "Arial",
        fontSize: "13px",
        color: "#ffffff",
        fixedWidth: width - 8,
        align: "center"
      })
      .setOrigin(0.5);
    const button = this.add.container(x + width / 2, y, [background, text]);
    button.setSize(width, 36);
    button.setInteractive({ useHandCursor: true });
    button.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      action();
    });
    return button;
  }

  private closeModal(): void {
    this.modal?.destroy(true);
    this.modal = undefined;
    this.modalTitle = undefined;
  }

  private floatText(message: string, x: number, y: number, color: string): void {
    const text = this.add
      .text(x, y, message, {
        fontFamily: "Arial",
        fontSize: "16px",
        color,
        stroke: "#062033",
        strokeThickness: 4
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.tweens.add({
      targets: text,
      y: y - 28,
      alpha: 0,
      duration: 950,
      ease: "Sine.out",
      onComplete: () => text.destroy()
    });
  }

  private floatTankText(message: string, x: number, y: number, color: string): void {
    const position = this.tankToScreenPoint(x, y);
    this.floatText(message, position.x, position.y, color);
  }

  private installTestHooks(): void {
    if (!import.meta.env.DEV) {
      return;
    }

    window.__aquariumTest = {
      getSnapshot: () => ({
        coins: this.wallet.common,
        wallet: { ...this.wallet },
        foodInventory: this.getTotalFoodInventory(),
        foodInventoryByType: this.foodInventoryRecord(),
        foodBuyQuantities: this.foodBuyQuantityRecord(),
        activeScreen: this.activeScreen,
        activeTab: this.activeTab,
        storeCoinFilter: this.storeCoinFilter,
        fishCatalogLevel: this.fishCatalogLevel,
        placementMode: this.placementMode.kind,
        fishCount: this.fish.length,
        maxFishCapacity: this.maxFishCapacityForLevel(),
        helperCreatureCount: this.helperCreatures.length,
        maxHelperCreatures,
        tankLevel: this.tankLevel,
        maxTankLevel,
        tankViewScale: this.tankViewScaleForLevel(),
        tankPattern: { ...this.currentTankPattern() },
        tankWorldBounds: {
          left: tankBounds.left,
          top: tankBounds.top,
          right: tankBounds.right,
          bottom: tankBounds.bottom,
          width: tankBounds.width,
          height: tankBounds.height
        },
        tankScreenEdges: {
          left: this.tankToScreenPoint(tankBounds.left, tankBounds.top).x,
          top: this.tankToScreenPoint(tankBounds.left, tankBounds.top).y,
          right: this.tankToScreenPoint(tankBounds.right, tankBounds.bottom).x,
          bottom: this.tankToScreenPoint(tankBounds.right, tankBounds.bottom).y
        },
        totalWealth: this.calculateTotalWealth(),
        tankNeedIndicator: this.getTankNeedIndicator(),
        tankHudText: this.hudText.text,
        tankStatusText: this.statusText.text,
        tankCareText: this.modeText.text,
        fishTypeCount: fishTypes.length,
        helperCreatureTypeCount: helperCreatureTypes.length,
        visibleFishCatalogCount: this.visibleFishCatalog().length,
        visibleStoreCatalogCount: this.visibleStoreCatalogCount(),
        nextTankUpgradePrice: this.getNextTankUpgradePrice(),
        numberFormatSamples: {
          small: formatNumber(999),
          thousand: formatNumber(24_700),
          million: formatNumber(67_800_000),
          billion: formatNumber(1_234_000_000)
        },
        foodCount: this.foods.length,
        coinDropCount: this.coinDrops.length,
        maxCoinDrops,
        decorationCount: this.placedDecorations.length,
        decorations: this.placedDecorations.map((decoration) => ({
          typeId: decoration.typeId,
          x: this.tankToScreenPoint(decoration.image.x, decoration.image.y).x,
          y: this.tankToScreenPoint(decoration.image.x, decoration.image.y).y,
          depth: decoration.image.depth
        })),
        decorationTrashTarget: {
          visible: this.decorationTrashTarget?.visible ?? false,
          x: decorationTrashZone.centerX,
          y: decorationTrashZone.centerY
        },
        cleanliness: this.cleanliness,
        happiness: this.calculateTankHappiness(),
        compatibilityScore: this.calculateCurrentCompatibility().score,
        modalTitle: this.modalTitle,
        saved: Boolean(loadGame()),
        offlineProgress: {
          elapsedSeconds: this.offlineProgress.elapsedSeconds,
          earned: { ...this.offlineProgress.earned }
        },
        rentals: {
          autoFeederRemainingMs: Math.max(0, this.autoFeederEndsAt - Date.now()),
          autoCollectorRemainingMs: Math.max(0, this.autoCollectorEndsAt - Date.now()),
          autoFeederActive: this.isAutoFeederActive(),
          autoCollectorActive: this.isAutoCollectorActive(),
          autoFeederMinutes: this.autoFeederMinutes,
          autoCollectorMinutes: this.autoCollectorMinutes,
          autoFeederPrice: this.rentalPrice(autoFeederPrice, this.autoFeederMinutes).amount,
          autoCollectorPrice: this.rentalPrice(autoCollectorPrice, this.autoCollectorMinutes).amount
        },
        fish: this.fish.map((currentFish) => {
          const fishPosition = this.tankToScreenPoint(currentFish.sprite.x, currentFish.sprite.y);
          const statusBars = currentFish.getStatusBarsSnapshot();
          const statusPosition = this.tankToScreenPoint(statusBars.x, statusBars.y);
          const emojiPosition = this.tankToScreenPoint(statusBars.emojiX, statusBars.emojiY);
          return {
            typeId: currentFish.type.id,
            typeName: currentFish.type.name,
            state: currentFish.state,
            ageLabel: currentFish.ageLabel(),
            ageSeconds: currentFish.ageSeconds,
            ageMonths: currentFish.ageMonths(),
            ageYears: currentFish.ageYears(),
            growthCapAgeYears: currentFish.growthCapAgeYears(),
            naturalAgeScale: currentFish.naturalAgeScale() * this.tankViewScaleForLevel(),
            tankGrowthScaleCap: currentFish.tankGrowthScaleCap() * this.tankViewScaleForLevel(),
            growthBlockedByTank: currentFish.isGrowthLimitedByTank(),
            gender: currentFish.gender,
            evolutionStage: currentFish.evolutionStage,
            fatalCareSeconds: currentFish.fatalCareSeconds,
            fatalCareRemainingSeconds: currentFish.fatalCareRemainingSeconds(),
            evolutionFee: this.evolutionFee(currentFish),
            hunger: currentFish.hunger,
            health: currentFish.health,
            x: fishPosition.x,
            y: fishPosition.y,
            scale: currentFish.sprite.scaleX * this.tankViewScaleForLevel(),
            veryBigScaleCap: currentFish.veryBigScaleCap() * this.tankViewScaleForLevel(),
            movementSizeMultiplier: currentFish.movementSizeMultiplier(),
            bodyTint: currentFish.sprite.tintTopLeft,
            sellValue: currentFish.getSellValue(),
            nextCoinDropInMs: Math.max(0, currentFish.nextCoinDropAt - this.time.now),
            statusBars: {
              ...statusBars,
              x: statusPosition.x,
              y: statusPosition.y,
              emojiX: emojiPosition.x,
              emojiY: emojiPosition.y
            }
          };
        }),
        foods: this.foods.map((food) => ({
          x: this.tankToScreenPoint(food.sprite.x, food.sprite.y).x,
          y: this.tankToScreenPoint(food.sprite.x, food.sprite.y).y,
          foodType: food.foodType.id,
          textureKey: food.sprite.texture.key,
          visualTint: food.visualTint,
          sinkSpeed: food.sinkSpeed * this.tankViewScaleForLevel()
        })),
        helperCreatures: this.helperCreatures.map((helper) => ({
          typeId: helper.type.id,
          typeName: helper.type.name,
          x: this.tankToScreenPoint(helper.sprite.x, helper.sprite.y).x,
          y: this.tankToScreenPoint(helper.sprite.x, helper.sprite.y).y,
          speed: helper.type.speed * this.tankViewScaleForLevel(),
          sellPrice: this.helperSellPrice(helper.type),
          feedSeconds: helper.type.feedSeconds
        })),
        coinsWaiting: this.coinDrops.map((coin) => ({
          x: this.tankToScreenPoint(coin.sprite.x, coin.sprite.y).x,
          y: this.tankToScreenPoint(coin.sprite.x, coin.sprite.y).y,
          value: coin.value,
          coinType: coin.coinType,
          tint: coin.visual.tint,
          textColor: coin.visual.textColor,
          sinkSpeed: coin.sinkSpeed * this.tankViewScaleForLevel(),
          bottomY: this.tankToScreenPoint(coin.sprite.x, coin.bottomY).y,
          atBottom: coin.atBottom
        }))
      }),
      setFishVitals: (index: number, hunger: number, health: number) => {
        const targetFish = this.fish[index];
        if (!targetFish) {
          return;
        }

        targetFish.hunger = Phaser.Math.Clamp(hunger, 0, 100);
        targetFish.health = Phaser.Math.Clamp(health, 0, 100);
        targetFish.state = targetFish.health < 35 ? "ill" : targetFish.hunger > 68 ? "hungry" : "happy";
        if (!targetFish.isInFatalCareState()) {
          targetFish.fatalCareSeconds = 0;
        }
        targetFish.refreshStatusBars();
      },
      setFishFatalCareSeconds: (index: number, seconds: number) => {
        const targetFish = this.fish[index];
        if (!targetFish) {
          return;
        }

        targetFish.fatalCareSeconds = targetFish.isInFatalCareState() ? Phaser.Math.Clamp(seconds, 0, 3600) : 0;
      },
      setFishPosition: (index: number, x: number, y: number) => {
        const targetFish = this.fish[index];
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

        this.addFishToTank(
          fishType,
          Phaser.Math.Clamp(x, tankBounds.left + 28, tankBounds.right - 28),
          Phaser.Math.Clamp(y, tankBounds.top + 26, tankBounds.bottom - 26)
        );
        this.refreshUi();
      },
      setFishGender: (index: number, gender: FishGender) => {
        const targetFish = this.fish[index];
        if (!targetFish) {
          return;
        }

        targetFish.gender = gender === "F" ? "F" : "M";
        this.renderTabControls();
        this.refreshUi();
      },
      removeFishAt: (index: number) => {
        const targetFish = this.fish[index];
        if (!targetFish) {
          return;
        }

        this.fish.splice(index, 1);
        targetFish.destroy();
        this.refreshUi();
      },
      forceCoinReady: (index: number) => {
        const targetFish = this.fish[index];
        if (!targetFish) {
          return;
        }

        targetFish.nextCoinDropAt = 0;
      },
      forceFishAge: (index: number, ageSeconds: number) => {
        const targetFish = this.fish[index];
        if (!targetFish) {
          return;
        }

        targetFish.setAgeSeconds(ageSeconds);
      },
      saveNow: () => {
        this.saveNow();
      },
      clearSave: () => {
        clearSave();
      },
      backdateSave: (seconds: number) => {
        this.saveNow(Date.now() - Math.max(0, seconds) * 1000);
      },
      closeModal: () => {
        this.closeModal();
      },
      setScreen: (screen: AppScreen) => {
        if (screen === "tank") {
          this.closePage();
        } else {
          this.openScreen(screen);
        }
      },
      setStoreTab: (tab: StoreTab) => {
        this.activeScreen = "store";
        this.activeTab = tab;
        this.createScreenNav();
        this.createFoodDock();
        this.createTabs();
        this.renderTabControls();
        this.refreshUi(false);
      },
      setStoreCoinFilter: (coinType: CoinType) => {
        if (coinType === "common" || coinType === "rare" || coinType === "superRare") {
          this.setStoreCoinFilter(coinType);
        }
      },
      setFishCatalogLevel: (level: number) => {
        this.fishCatalogLevel = Phaser.Math.Clamp(Math.floor(level), 1, maxTankLevel);
        this.renderTabControls();
        this.refreshUi(false);
      },
      upgradeTank: () => {
        this.upgradeTank();
      },
      buyFish: (fishTypeId: string) => {
        const fishType = fishTypes.find((item) => item.id === fishTypeId);
        if (fishType) {
          this.buyFish(fishType);
        }
      },
      buyFood: (foodTypeId?: FoodTypeId) => {
        const foodType = foodTypes.find((item) => item.id === foodTypeId) ?? this.getSelectedFoodType();
        this.buyFood(foodType);
      },
      setFoodBuyQuantity: (foodTypeId: FoodTypeId, quantity: number) => {
        if (foodTypes.some((item) => item.id === foodTypeId)) {
          this.setFoodBuyQuantity(foodTypeId, quantity);
        }
      },
      addFoodBuyQuantity: (foodTypeId: FoodTypeId, quantity: number) => {
        if (foodTypes.some((item) => item.id === foodTypeId)) {
          this.addFoodBuyQuantity(foodTypeId, quantity);
        }
      },
      resetFoodBuyQuantity: (foodTypeId: FoodTypeId) => {
        if (foodTypes.some((item) => item.id === foodTypeId)) {
          this.resetFoodBuyQuantity(foodTypeId);
        }
      },
      buyDecoration: (decorationTypeId: string) => {
        const decorationType = decorationTypes.find((item) => item.id === decorationTypeId);
        if (decorationType) {
          this.buyDecoration(decorationType);
        }
      },
      buyHelperCreature: (creatureTypeId: string) => {
        const creatureType = helperCreatureTypes.find((item) => item.id === creatureTypeId);
        if (creatureType) {
          this.buyHelperCreature(creatureType);
        }
      },
      addHelperCreatureForTest: (creatureTypeId: string, x: number) => {
        const creatureType = helperCreatureTypes.find((item) => item.id === creatureTypeId);
        if (!creatureType || this.helperCreatures.length >= maxHelperCreatures) {
          return;
        }
        this.addHelperCreatureToTank(creatureType, x);
        this.refreshUi();
      },
      setHelperCreaturePosition: (index: number, x: number) => {
        const helper = this.helperCreatures[index];
        if (!helper) {
          return;
        }
        helper.sprite.x = Phaser.Math.Clamp(x, tankBounds.left + 24, tankBounds.right - 24);
        helper.restoreProgress(helper.sprite.x);
      },
      clearHelperCreatures: () => {
        for (const helper of this.helperCreatures) {
          helper.destroy();
        }
        this.helperCreatures = [];
        this.refreshUi();
      },
      sellHelperCreatureAt: (index: number) => {
        this.sellHelperCreatureByIndex(index);
      },
      evolveFishAt: (index: number, force?: "success" | "death") => {
        this.tryEvolveFish(index, force);
      },
      breedFishAt: (index: number, force?: "same" | "rare") => {
        this.breedFish(index, force);
      },
      setFoodTool: (foodTypeId: FoodTypeId) => {
        this.selectFood(foodTypeId);
      },
      openSellOldest: () => {
        this.sellOldestFish();
      },
      sellFishAt: (index: number) => {
        this.sellFishByIndex(index);
      },
      addFood: (foodTypeId: FoodTypeId, count: number) => {
        this.foodInventory.set(foodTypeId, this.getFoodInventory(foodTypeId) + Math.max(0, Math.floor(count)));
        this.createFoodDock();
        this.refreshUi();
      },
      addWallet: (coinType: CoinType, amount: number) => {
        earn(this.wallet, coinType, Math.max(0, Math.floor(amount)));
        this.refreshUi();
      },
      addCoin: (coinType: CoinType, value: number, x: number, y: number) => {
        this.createCoinDrop(
          Phaser.Math.Clamp(x, tankBounds.left + 18, tankBounds.right - 18),
          Phaser.Math.Clamp(y, tankBounds.top + 18, tankBounds.bottom - 18),
          Math.max(1, Math.floor(value)),
          coinType
        );
        this.refreshUi();
      },
      clearCoins: () => {
        for (const coin of this.coinDrops) {
          coin.destroy();
        }
        this.coinDrops = [];
        this.refreshUi();
      },
      clearFoods: () => {
        for (const food of this.foods) {
          food.destroy();
        }
        this.foods = [];
        this.refreshUi();
      },
      rentAutoFeeder: () => {
        this.rentAutoFeeder();
      },
      rentAutoCollector: () => {
        this.rentAutoCollector();
      },
      setRentalMinutes: (rental: "feeder" | "collector", minutes: number) => {
        this.setRentalMinutes(rental, minutes);
      },
      runAutoFeederNow: () => {
        this.nextAutoFeedAt = 0;
        this.updateAutoFeeder();
      },
      expireRentals: () => {
        this.autoFeederEndsAt = 0;
        this.autoCollectorEndsAt = 0;
        this.refreshUi();
        this.saveNow();
      }
    };
  }

  private createTextures(): void {
    this.createFishTexture();
    this.createFoodTexture();
    this.createMedicineTexture();
    this.createEvolvePillTexture();
    this.createCoinTexture();
    this.createDecorationTextures();
    this.createHelperCreatureTextures();
  }

  private createFishTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillTriangle(12, 24, 0, 10, 0, 38);
    graphics.fillEllipse(34, 24, 52, 30);
    graphics.fillStyle(0xfff1a8, 1);
    graphics.fillEllipse(43, 18, 12, 8);
    graphics.fillStyle(0x082033, 1);
    graphics.fillCircle(48, 17, 3);
    graphics.lineStyle(2, 0x082033, 0.24);
    graphics.beginPath();
    graphics.arc(26, 27, 10, 0.1, 1.3);
    graphics.strokePath();
    graphics.generateTexture("fish-base", 64, 48);
    graphics.destroy();
  }

  private createFoodTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffd15c, 1);
    graphics.fillCircle(8, 8, 7);
    graphics.fillStyle(0xfff0a0, 1);
    graphics.fillCircle(6, 6, 2);
    graphics.generateTexture("food", 16, 16);
    graphics.destroy();
  }

  private createMedicineTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x43d66f, 1);
    graphics.fillRoundedRect(1, 3, 22, 12, 6);
    graphics.lineStyle(2, 0xd8ffe4, 0.9);
    graphics.strokeRoundedRect(1, 3, 22, 12, 6);
    graphics.lineStyle(2, 0x1c8f48, 0.75);
    graphics.lineBetween(12, 4, 12, 14);
    graphics.fillStyle(0xcaffd7, 0.9);
    graphics.fillCircle(7, 7, 2);
    graphics.generateTexture("medicine-pill", 24, 18);
    graphics.destroy();
  }

  private createEvolvePillTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xb47cff, 1);
    graphics.fillRoundedRect(1, 3, 22, 12, 6);
    graphics.lineStyle(2, 0xf2dcff, 0.95);
    graphics.strokeRoundedRect(1, 3, 22, 12, 6);
    graphics.lineStyle(2, 0x6d3abf, 0.75);
    graphics.lineBetween(12, 4, 12, 14);
    graphics.fillStyle(0xffffff, 0.95);
    graphics.fillCircle(7, 7, 2);
    graphics.fillCircle(17, 11, 2);
    graphics.generateTexture("evolve-pill", 24, 18);
    graphics.destroy();
  }

  private createCoinTexture(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(14, 14, 13);
    graphics.lineStyle(3, 0xfff2a8, 1);
    graphics.strokeCircle(14, 14, 9);
    graphics.lineStyle(2, 0x9d6a00, 0.75);
    graphics.strokeCircle(14, 14, 13);
    graphics.generateTexture("coin", 28, 28);
    graphics.destroy();
  }

  private createDecorationTextures(): void {
    const plant = this.add.graphics();
    plant.fillStyle(0x216b3a, 1);
    plant.fillRect(27, 46, 10, 26);
    plant.fillStyle(0x3bb35f, 1);
    plant.fillEllipse(22, 44, 16, 42);
    plant.fillEllipse(40, 40, 16, 46);
    plant.fillEllipse(31, 28, 18, 50);
    plant.fillStyle(0x784d28, 1);
    plant.fillRect(18, 68, 28, 8);
    plant.generateTexture("decor-plant", 64, 80);
    plant.destroy();

    const rock = this.add.graphics();
    rock.fillStyle(0x69747c, 1);
    rock.fillEllipse(34, 42, 58, 36);
    rock.fillStyle(0x87929a, 1);
    rock.fillEllipse(23, 34, 22, 18);
    rock.fillEllipse(44, 33, 26, 22);
    rock.generateTexture("decor-rock", 72, 64);
    rock.destroy();

    const castle = this.add.graphics();
    castle.fillStyle(0x9a8eca, 1);
    castle.fillRect(18, 28, 54, 48);
    castle.fillRect(10, 18, 18, 58);
    castle.fillRect(62, 18, 18, 58);
    castle.fillStyle(0x5d5387, 1);
    castle.fillTriangle(10, 18, 19, 4, 28, 18);
    castle.fillTriangle(62, 18, 71, 4, 80, 18);
    castle.fillStyle(0x342d52, 1);
    castle.fillRoundedRect(38, 48, 14, 28, 7);
    castle.fillRect(29, 36, 9, 10);
    castle.fillRect(54, 36, 9, 10);
    castle.generateTexture("decor-castle", 92, 86);
    castle.destroy();

    const crystal = this.add.graphics();
    crystal.fillStyle(0x9ff8ff, 0.95);
    crystal.fillTriangle(46, 6, 18, 72, 74, 72);
    crystal.fillStyle(0xe0fbff, 0.9);
    crystal.fillTriangle(46, 6, 38, 72, 58, 72);
    crystal.fillStyle(0xb48cff, 0.95);
    crystal.fillTriangle(22, 28, 4, 78, 42, 78);
    crystal.fillStyle(0xff9bed, 0.9);
    crystal.fillTriangle(70, 28, 50, 78, 88, 78);
    crystal.lineStyle(2, 0xffffff, 0.7);
    crystal.lineBetween(46, 6, 46, 72);
    crystal.lineBetween(22, 28, 28, 78);
    crystal.lineBetween(70, 28, 64, 78);
    crystal.generateTexture("decor-crystal", 92, 86);
    crystal.destroy();
  }

  private createHelperCreatureTextures(): void {
    const shrimp = this.add.graphics();
    shrimp.fillStyle(0xff8f73, 1);
    shrimp.fillEllipse(24, 18, 34, 18);
    shrimp.fillTriangle(8, 18, 0, 10, 0, 26);
    shrimp.lineStyle(2, 0xffd0c4, 0.9);
    shrimp.lineBetween(30, 16, 44, 8);
    shrimp.lineBetween(30, 20, 44, 28);
    shrimp.lineStyle(2, 0x6b2735, 0.55);
    shrimp.lineBetween(12, 28, 12, 36);
    shrimp.lineBetween(24, 28, 24, 36);
    shrimp.generateTexture("helper-shrimp", 48, 40);
    shrimp.destroy();

    const shell = this.add.graphics();
    shell.fillStyle(0xc7d3d9, 1);
    shell.fillEllipse(26, 22, 42, 26);
    shell.fillStyle(0x8fa0a8, 1);
    shell.fillEllipse(17, 18, 14, 10);
    shell.lineStyle(2, 0x5b6b73, 0.65);
    shell.lineBetween(26, 9, 26, 34);
    shell.lineBetween(15, 14, 36, 30);
    shell.lineBetween(36, 14, 15, 30);
    shell.fillStyle(0x31444d, 1);
    shell.fillCircle(40, 18, 2);
    shell.generateTexture("helper-shell", 52, 42);
    shell.destroy();

    const crab = this.add.graphics();
    crab.fillStyle(0xe2574c, 1);
    crab.fillEllipse(26, 22, 34, 24);
    crab.fillCircle(10, 14, 7);
    crab.fillCircle(42, 14, 7);
    crab.lineStyle(3, 0xffa08f, 0.9);
    crab.lineBetween(10, 31, 2, 38);
    crab.lineBetween(20, 34, 14, 42);
    crab.lineBetween(32, 34, 38, 42);
    crab.lineBetween(42, 31, 50, 38);
    crab.fillStyle(0x1d1f2a, 1);
    crab.fillCircle(21, 16, 2);
    crab.fillCircle(31, 16, 2);
    crab.generateTexture("helper-crab", 54, 46);
    crab.destroy();

    const feederSnail = this.add.graphics();
    feederSnail.fillStyle(0x6fd39b, 1);
    feederSnail.fillEllipse(27, 24, 38, 24);
    feederSnail.fillStyle(0xf2c46d, 1);
    feederSnail.fillCircle(21, 20, 12);
    feederSnail.lineStyle(3, 0x9c6a2e, 0.65);
    feederSnail.beginPath();
    feederSnail.arc(21, 20, 8, 0.2, 5.7);
    feederSnail.strokePath();
    feederSnail.fillStyle(0xb6f7cf, 1);
    feederSnail.fillEllipse(42, 21, 18, 14);
    feederSnail.lineStyle(2, 0xd8ffe7, 0.9);
    feederSnail.lineBetween(45, 14, 51, 5);
    feederSnail.lineBetween(48, 15, 56, 8);
    feederSnail.fillStyle(0x1d1f2a, 1);
    feederSnail.fillCircle(52, 5, 2);
    feederSnail.fillCircle(57, 8, 2);
    feederSnail.fillStyle(0xffd15c, 1);
    feederSnail.fillCircle(40, 34, 4);
    feederSnail.generateTexture("helper-feeder-snail", 62, 46);
    feederSnail.destroy();
  }
}
