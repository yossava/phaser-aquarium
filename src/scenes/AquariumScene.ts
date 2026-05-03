import Phaser from "phaser";
import { basicFood, decorationTypes, fishTypes, foodTypes } from "../data/content";
import { controlPanelTop, gameHeight, gameWidth, tankBounds, toastX, toastY } from "../game/constants";
import { canAfford, createWallet, earn, formatPrice, formatWallet, spend } from "../game/economy";
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
import type { CoinType, DecorationType, FishState, FishType, FoodType, FoodTypeId, StoreTab, Wallet } from "../types/mechanics";

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
const maxFishCapacity = 10;
const maxTankLevel = 5;
const rentalMinuteMs = 60_000;
const minRentalMinutes = 1;
const maxRentalMinutes = 60;
const autoFeederPrice: FishType["price"] = { coinType: "common", amount: 18 };
const autoCollectorPrice: FishType["price"] = { coinType: "common", amount: 22 };
const tankUpgradePrices: Record<number, FishType["price"]> = {
  2: { coinType: "common", amount: 100 },
  3: { coinType: "common", amount: 420 },
  4: { coinType: "rare", amount: 8 },
  5: { coinType: "superRare", amount: 3 }
};
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
  fishCatalogLevel: number;
  placementMode: PlacementMode["kind"];
  fishCount: number;
  maxFishCapacity: number;
  tankLevel: number;
  maxTankLevel: number;
  totalWealth: number;
  tankNeedIndicator: string;
  fishTypeCount: number;
  visibleFishCatalogCount: number;
  nextTankUpgradePrice?: FishType["price"];
  foodCount: number;
  coinDropCount: number;
      decorationCount: number;
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
    state: FishState;
    ageStage: string;
    hunger: number;
    health: number;
    x: number;
    y: number;
    scale: number;
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
    };
  }>;
  foods: Array<{ x: number; y: number; foodType: FoodTypeId; textureKey: string; visualTint: number; sinkSpeed: number }>;
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
      setFishPosition: (index: number, x: number, y: number) => void;
      addFishForTest: (fishTypeId: string, x: number, y: number) => void;
      removeFishAt: (index: number) => void;
      forceCoinReady: (index: number) => void;
      forceFishAge: (index: number, ageSeconds: number) => void;
      saveNow: () => void;
      clearSave: () => void;
      backdateSave: (seconds: number) => void;
      closeModal: () => void;
      setScreen: (screen: AppScreen) => void;
      setStoreTab: (tab: StoreTab) => void;
      setFishCatalogLevel: (level: number) => void;
      upgradeTank: () => void;
      buyFish: (fishTypeId: string) => void;
      buyFood: (foodTypeId?: FoodTypeId) => void;
      setFoodBuyQuantity: (foodTypeId: FoodTypeId, quantity: number) => void;
      buyDecoration: (decorationTypeId: string) => void;
      setFoodTool: (foodTypeId: FoodTypeId) => void;
      openSellOldest: () => void;
      sellFishAt: (index: number) => void;
      addFood: (foodTypeId: FoodTypeId, count: number) => void;
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
  private fish: Fish[] = [];
  private foods: FoodPellet[] = [];
  private coinDrops: CoinDrop[] = [];
  private placementMode: PlacementMode = { kind: "none" };
  private activeScreen: AppScreen = "tank";
  private activeTab: StoreTab = "fish";
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
    this.updateRentals();
    this.cleanliness = Phaser.Math.Clamp(
      this.cleanliness - (0.05 + this.fish.length * 0.018 + this.foods.length * 0.045) * deltaSeconds,
      0,
      100
    );
    for (const currentFish of this.fish) {
      const previousAgeStage = currentFish.ageStage;
      const eatenFood = currentFish.update(deltaSeconds, this.foods);
      if (currentFish.ageStage !== previousAgeStage) {
        this.floatText(`${currentFish.ageStage.toUpperCase()}`, currentFish.sprite.x, currentFish.sprite.y - 34, "#d7f4ff");
        this.saveNow();
      }

      if (eatenFood) {
        const ateMedicine = eatenFood.accepted && eatenFood.food.foodType.id === "medicine";
        this.removeFood(eatenFood.food);
        if (ateMedicine) {
          currentFish.applyMedicine(this.time.now);
          this.floatText("Healed", currentFish.sprite.x, currentFish.sprite.y - 26, "#a8ffb0");
        } else {
          this.floatText(eatenFood.accepted ? "Yum" : "Nope", currentFish.sprite.x, currentFish.sprite.y - 26, eatenFood.accepted ? "#f7ff9a" : "#ffb0a8");
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
        tankBounds.centerX,
        tankBounds.centerY,
        tankBounds.width,
        tankBounds.height,
        0xd7f4ff,
        0.18
      )
      .setStrokeStyle(0, 0xffffff, 0);
    this.add.rectangle(tankBounds.centerX, tankBounds.centerY, tankBounds.width, tankBounds.height, 0x0b7097, 1);
    this.add.rectangle(tankBounds.centerX, tankBounds.bottom - 28, tankBounds.width, 56, 0xd5b46d, 1);
    this.add.rectangle(tankBounds.centerX, 0, tankBounds.width, 120, 0x071b2a, 0.34).setOrigin(0.5, 0);

    for (let i = 0; i < 18; i += 1) {
      const bubble = this.add.circle(
        Phaser.Math.Between(tankBounds.left + 20, tankBounds.right - 20),
        Phaser.Math.Between(tankBounds.top + 20, tankBounds.bottom - 40),
        Phaser.Math.Between(2, 6),
        0xd7f4ff,
        0.28
      );
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
      .text(20, 18, "Phaser Aquarium", {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#f8fbff",
        fontStyle: "bold"
      })
      .setDepth(20);
  }

  private createUi(): void {
    this.hudText = this.add.text(20, 50, "", {
      fontFamily: "Arial",
      fontSize: "14px",
      color: "#ffe67a",
      fontStyle: "bold",
      wordWrap: { width: 322 }
    });

    this.statusText = this.add.text(20, 73, "", {
      fontFamily: "Arial",
      fontSize: "12px",
      color: "#eaf9ff",
      wordWrap: { width: 322 }
    });

    this.modeText = this.add.text(20, 94, "", {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#bfeeff",
      wordWrap: { width: 322 }
    });

    this.createScreenNav();
    this.createFoodDock();
    this.createTabs();
    this.renderTabControls();
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

    const visibleFood = foodTypes.filter((foodType) => this.getFoodInventory(foodType.id) > 0).slice(0, 4);
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
      { label: "Fish", tab: "fish", x: 20 },
      { label: "Food", tab: "food", x: 154 },
      { label: "Decor", tab: "decor", x: 288 }
    ];

    for (const tab of tabs) {
      const tabButton = this.createButton(
        tab.x,
        controlPanelTop + 48,
        122,
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
        this.createButton(66, controlPanelTop + 16, 94, 26, `Fish L${this.fishCatalogLevel}`, () => this.changeFishCatalogLevel(1), 0x3c93bd, 12),
        this.createButton(164, controlPanelTop + 16, 42, 26, ">", () => this.changeFishCatalogLevel(1), 0x254d68, 13),
        this.createButton(
          220,
          controlPanelTop + 16,
          124,
          26,
          upgradePrice ? `Tank L${this.tankLevel} ${formatPrice(upgradePrice)}` : `Tank L${this.tankLevel} Max`,
          () => this.upgradeTank(),
          upgradePrice && canAfford(this.wallet, upgradePrice) ? 0x356a35 : 0x76512d,
          9
        )
      );
      this.renderFishCatalog();
      return;
    }

    if (this.activeTab === "food") {
      this.renderFoodCatalog();
      return;
    }

    this.renderDecorationCatalog();
  }

  private renderFishCatalog(): void {
    const visibleFish = fishTypes.filter((fishType) => this.getFishTankLevel(fishType) === this.fishCatalogLevel);
    visibleFish.forEach((fishType, index) => {
      const owned = this.getFishInventory(fishType.id);
      const canUseTank = this.canTankAcceptFish(fishType);
      const buyLabel = canUseTank ? "Buy" : `Need L${this.getFishTankLevel(fishType)}`;
      this.addShopCard({
        x: 20 + (index % 2) * 202,
        y: controlPanelTop + 104 + Math.floor(index / 2) * 84,
        width: 188,
        height: 76,
        title: fishType.name,
        meta: `L${this.getFishTankLevel(fishType)} ${this.rarityStarsLabel(fishType.rarity)} ${this.rarityLabel(fishType.rarity)} | ${formatPrice(fishType.price)} | Own ${owned}`,
        detail: canUseTank ? `Eats ${fishType.preferredFoodTypes.slice(0, 2).join(", ")}` : "Upgrade tank first",
        buyLabel,
        actionLabel: `Place ${owned}`,
        onBuy: () => this.buyFish(fishType),
        onAction: () => this.selectFish(fishType.id),
        accent: fishFoodTintFor(fishType),
        actionFill: owned > 0 && canUseTank ? 0x356a35 : 0x254d68
      });
    });
  }

  private renderFoodCatalog(): void {
    foodTypes.forEach((foodType, index) => {
      const owned = this.getFoodInventory(foodType.id);
      const buyQuantity = this.getFoodBuyQuantity(foodType.id);
      const totalPrice = this.quantityPrice(foodType.price, buyQuantity);
      this.addShopCard({
        x: 20 + (index % 2) * 202,
        y: controlPanelTop + 104 + Math.floor(index / 2) * 112,
        width: 188,
        height: 104,
        title: foodType.name,
        meta: `${this.rarityLabel(foodType.rarity)} | N${foodType.nutrition} | Own ${owned}`,
        detail: foodType.id === "medicine" ? "Heals sick fish" : foodType.acceptedByDefault ? "General food" : "Species food",
        buyLabel: `Buy ${formatPrice(totalPrice)}`,
        actionLabel: `Use ${owned}`,
        onBuy: () => this.buyFood(foodType, buyQuantity),
        onAction: () => this.toggleFoodTool(foodType.id),
        accent: foodTintFor(foodType.id),
        actionFill: owned > 0 ? 0x356a35 : 0x254d68,
        quantity: {
          label: `x${buyQuantity}`,
          onDecrease: () => this.changeFoodBuyQuantity(foodType.id, -1),
          onIncrease: () => this.changeFoodBuyQuantity(foodType.id, 1)
        }
      });
    });
  }

  private renderDecorationCatalog(): void {
    decorationTypes.forEach((decorationType, index) => {
      const owned = this.getDecorationInventory(decorationType.id);
      this.addShopCard({
        x: 20 + (index % 2) * 202,
        y: controlPanelTop + 104 + Math.floor(index / 2) * 84,
        width: 188,
        height: 74,
        title: decorationType.name,
        meta: `${this.rarityLabel(decorationType.rarity)} | +${decorationType.happinessBonus} happy | Own ${owned}`,
        detail: decorationType.habitatTags.slice(0, 2).join(", "),
        buyLabel: `Buy ${formatPrice(decorationType.price)}`,
        actionLabel: `Place ${owned}`,
        onBuy: () => this.buyDecoration(decorationType),
        onAction: () => this.selectDecoration(decorationType.id),
        accent: decorationType.rarity === "rare" ? 0x584f86 : 0x256f95,
        actionFill: owned > 0 ? 0x584f86 : 0x254d68
      });
    });
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
    actionLabel: string;
    onBuy: () => void;
    onAction: () => void;
    accent: number;
    actionFill: number;
    compact?: boolean;
    quantity?: {
      label: string;
      onDecrease: () => void;
      onIncrease: () => void;
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
      const quantityY = options.y + options.height - 52;
      this.tabControls.push(
        this.createButton(options.x + 12, quantityY, 28, 20, "-", options.quantity.onDecrease, 0x254d68, 12),
        this.createButton(options.x + 44, quantityY, 58, 20, options.quantity.label, () => undefined, 0x17364a, 10),
        this.createButton(options.x + 106, quantityY, 28, 20, "+", options.quantity.onIncrease, 0x254d68, 12)
      );
    }

    const buttonY = options.y + options.height - (options.compact ? 12 : 24);
    const buttonHeight = options.compact ? 17 : 20;
    const buttonWidth = options.compact ? 52 : 78;
    this.tabControls.push(
      this.createButton(options.x + options.width - buttonWidth * 2 - 12, buttonY, buttonWidth, buttonHeight, options.buyLabel, options.onBuy, 0x256f95, options.compact ? 8 : 9),
      this.createButton(options.x + options.width - buttonWidth - 6, buttonY, buttonWidth, buttonHeight, options.actionLabel, options.onAction, options.actionFill, options.compact ? 8 : 9)
    );
  }

  private renderScreenControls(): void {
    if (this.activeScreen === "care") {
      const upgradePrice = this.getNextTankUpgradePrice();
      this.tabControls.push(
        this.createInfoLine(20, controlPanelTop + 54, `Tank L${this.tankLevel} | Wealth ${this.calculateTotalWealth()} | ${Math.round(this.cleanliness)}% clean | ${Math.round(this.calculateTankHappiness())}% happy`),
        this.createButton(20, controlPanelTop + 84, 188, 36, "Clean Tank", () => this.cleanTank(), 0x356a35, 13),
        this.createButton(222, controlPanelTop + 84, 188, 36, upgradePrice ? `Upgrade Tank ${formatPrice(upgradePrice)}` : "Tank Maxed", () => this.upgradeTank(), upgradePrice ? 0x76512d : 0x254d68, 12),
        this.createInfoLine(20, controlPanelTop + 130, `Food: ${this.describeFoodInventory()}`),
        this.createInfoLine(20, controlPanelTop + 154, `Fish ${this.fish.length}/${maxFishCapacity} | Decor ${this.placedDecorations.length}/8 | ${this.getTankNeedIndicator()}`),
        this.createInfoLine(20, controlPanelTop + 178, `Rentals: ${this.rentalStatusLabel() || "none active"}`),
        this.createButton(20, controlPanelTop + 202, 30, 30, "-", () => this.changeRentalMinutes("feeder", -1), 0x254d68, 14),
        this.createButton(54, controlPanelTop + 202, 116, 30, `Feed ${this.autoFeederMinutes}m ${formatPrice(this.rentalPrice(autoFeederPrice, this.autoFeederMinutes))}`, () => this.rentAutoFeeder(), this.isAutoFeederActive() ? 0x356a35 : 0x256f95, 9),
        this.createButton(174, controlPanelTop + 202, 30, 30, "+", () => this.changeRentalMinutes("feeder", 1), 0x254d68, 14),
        this.createButton(222, controlPanelTop + 202, 30, 30, "-", () => this.changeRentalMinutes("collector", -1), 0x254d68, 14),
        this.createButton(256, controlPanelTop + 202, 116, 30, `Coin ${this.autoCollectorMinutes}m ${formatPrice(this.rentalPrice(autoCollectorPrice, this.autoCollectorMinutes))}`, () => this.rentAutoCollector(), this.isAutoCollectorActive() ? 0x356a35 : 0x256f95, 9),
        this.createButton(376, controlPanelTop + 202, 30, 30, "+", () => this.changeRentalMinutes("collector", 1), 0x254d68, 14)
      );
      return;
    }

    if (this.activeScreen === "album") {
      const owned = new Set([...this.fish.map((fish) => fish.type.id), ...this.fishInventory.keys()]);
      this.tabControls.push(this.createInfoLine(20, controlPanelTop + 54, `Collection ${owned.size}/${fishTypes.length} | Mastery starts when fish reach elder.`));
      let y = controlPanelTop + 82;
      for (const fishType of fishTypes.slice(0, 4)) {
        const ownedLabel = owned.has(fishType.id) ? "Owned" : fishType.acquisitionSources.includes("event") ? "Event" : "Locked";
        this.tabControls.push(this.createInfoLine(20, y, `${fishType.name} | ${this.rarityLabel(fishType.rarity)} | ${ownedLabel} | Eats ${fishType.preferredFoodTypes.join(", ")}`));
        y += 24;
      }
      return;
    }

    if (this.activeScreen === "goals") {
      this.tabControls.push(
        this.createInfoLine(20, controlPanelTop + 54, `Daily Goals | ${this.dailyGoals.date}`),
        this.createGoalRow(controlPanelTop + 82, "feed", "Feed a fish", this.getTotalFoodInventory() < 3),
        this.createGoalRow(controlPanelTop + 114, "coin", "Collect 1 coin", this.wallet.common > 120 || this.wallet.rare > 0 || this.wallet.superRare > 0),
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
    if (this.fish.length >= maxFishCapacity) {
      this.floatText("Tank full", toastX, toastY, "#ffb0a8");
      return;
    }

    if (!this.canTankAcceptFish(fishType)) {
      this.floatText(`Need Tank L${this.getFishTankLevel(fishType)}`, toastX, toastY, "#ffb0a8");
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
    this.floatText(`${fishType.name} baby`, x, y - 34, "#ffffff");
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
    this.selectedFoodTypeId = foodType.id;
    this.placementMode = { kind: "food", foodTypeId: foodType.id };
    this.floatText(`${foodType.name} x${buyQuantity}`, toastX, toastY, "#a8ffb0");
    if (this.activeScreen !== "tank") {
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
    this.floatText(`Sold ${fishToSell.type.name} +${sellValue}`, toastX, toastY, "#ffe67a");
    fishToSell.destroy();
    this.closeModal();
    this.refreshUi();
    this.saveNow();
  }

  private selectFish(fishTypeId: string): void {
    if (this.getFishInventory(fishTypeId) <= 0) {
      this.floatText("Buy one first", toastX, toastY, "#ffb0a8");
      return;
    }

    const fishType = fishTypes.find((item) => item.id === fishTypeId);
    if (fishType && !this.canTankAcceptFish(fishType)) {
      this.floatText(`Need Tank L${this.getFishTankLevel(fishType)}`, toastX, toastY, "#ffb0a8");
      return;
    }

    this.placementMode = { kind: "fish", fishTypeId };
    if (this.activeScreen !== "tank") {
      this.closePage();
    }
    this.refreshUi();
  }

  private selectFood(foodTypeId = this.selectedFoodTypeId): void {
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
    if (!tankBounds.contains(pointer.x, pointer.y)) {
      return;
    }

    const mode = this.placementMode;

    if (mode.kind === "fish") {
      const type = fishTypes.find((fishType) => fishType.id === mode.fishTypeId);
      if (!type || this.getFishInventory(type.id) <= 0) {
        return;
      }

      if (!this.canTankAcceptFish(type)) {
        this.floatText(`Need Tank L${this.getFishTankLevel(type)}`, toastX, toastY, "#ffb0a8");
        return;
      }

      if (this.fish.length >= maxFishCapacity) {
        this.floatText("Tank full", toastX, toastY, "#ffb0a8");
        return;
      }

      this.placeFishWithCompatibility(type, pointer.x, pointer.y);
      return;
    }

    if (mode.kind === "food") {
      const foodType = foodTypes.find((item) => item.id === mode.foodTypeId) ?? basicFood;
      if (this.getFoodInventory(foodType.id) <= 0) {
        return;
      }

      this.foodInventory.set(foodType.id, this.getFoodInventory(foodType.id) - 1);
      this.foods.push(new FoodPellet(this, pointer.x, pointer.y, foodType));
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

      if (this.placedDecorations.length >= 8) {
        this.floatText("Decor full", toastX, toastY, "#ffb0a8");
        return;
      }

      this.decorationInventory.set(decoration.id, this.getDecorationInventory(decoration.id) - 1);
      this.addDecorationToTank(decoration, pointer.x, pointer.y);
      this.placementMode =
        this.getDecorationInventory(decoration.id) > 0
          ? { kind: "decoration", decorationTypeId: decoration.id }
          : { kind: "none" };
      this.refreshUi();
      this.saveNow();
    }
  }

  private addFishToTank(type: FishType, x: number, y: number): Fish {
    const placedFish = new Fish(this, type, x, y);
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
      this.floatText(`Need Tank L${this.getFishTankLevel(type)}`, toastX, toastY, "#ffb0a8");
      return;
    }

    this.fishInventory.set(type.id, this.getFishInventory(type.id) - 1);
    const placedFish = this.addFishToTank(type, x, y);
    placedFish.markCoinDropped(this.time.now + 2500);

    this.floatText(`${type.name} baby`, x, y - 34, "#ffffff");
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
    this.placedDecorations.push({ typeId: decoration.id, image });
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
    this.cleanliness = saved.tank.cleanliness;
    this.cleanedAt = saved.tank.cleanedAt;
    this.tankLevel = Phaser.Math.Clamp(Math.floor(saved.tank.level ?? 1), 1, maxTankLevel);
    this.fishCatalogLevel = this.tankLevel;
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

    for (const savedFish of saved.fish) {
      const type = fishTypes.find((fishType) => fishType.id === savedFish.typeId);
      if (!type) {
        continue;
      }

      const restoredFish = this.addFishToTank(type, savedFish.x, savedFish.y);
      restoredFish.restoreProgress(
        savedFish.ageSeconds,
        savedFish.hunger,
        savedFish.health,
        this.time.now + savedFish.nextCoinDropInMs
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

    for (const currentFish of this.fish) {
      const production = currentFish.primaryProduction();
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

      currentFish.nextCoinDropAt = this.time.now + production.intervalSeconds * 1000;
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
      fish: this.fish.map((currentFish) => ({
        typeId: currentFish.type.id,
        x: currentFish.sprite.x,
        y: currentFish.sprite.y,
        ageSeconds: currentFish.ageSeconds,
        hunger: currentFish.hunger,
        health: currentFish.health,
        nextCoinDropInMs: Math.max(0, currentFish.nextCoinDropAt - this.time.now)
      })),
      decorations: this.placedDecorations.map((decoration) => ({
        typeId: decoration.typeId,
        x: decoration.image.x,
        y: decoration.image.y
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
    this.floatText(automated ? `Auto +${coin.value}` : `+${coin.value}`, coin.sprite.x, coin.sprite.y - 20, coin.visual.textColor);
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
    this.hudText.setText(`${formatWallet(this.wallet)}  W:${this.calculateTotalWealth()}  F:${this.getTotalFoodInventory()}  Cln:${Math.round(this.cleanliness)}%`);
    this.modeText.setText(this.getModeLabel());
    if (renderControls) {
      this.createFoodDock();
      this.renderTabControls();
    }
    this.refreshStatus();
  }

  private refreshStatus(): void {
    if (this.fish.length === 0) {
      this.statusText.setText("No fish | Shop to start");
      return;
    }

    const counts = this.fish.reduce(
      (summary, currentFish) => {
        summary[currentFish.state] += 1;
        return summary;
      },
      { happy: 0, hungry: 0, ill: 0 } as Record<FishState, number>
    );

    const babies = this.fish.filter((currentFish) => currentFish.ageStage === "baby").length;
    this.statusText.setText(
      `Tank L${this.tankLevel} | Fish ${this.fish.length}/${maxFishCapacity} | Baby ${babies} | H${counts.happy} Hu${counts.hungry} I${counts.ill} | Coin ${this.coinDrops.length}`
    );
  }

  private getModeLabel(): string {
    const mode = this.placementMode;

    if (mode.kind === "fish") {
      const fishType = fishTypes.find((item) => item.id === mode.fishTypeId);
      return `Selected: place ${fishType?.name ?? "fish"} baby in the tank`;
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
      event: "Event"
    };
    return `${labels[foodType.id]}\nx${this.getFoodInventory(foodType.id)}`;
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

  private setFoodBuyQuantity(foodTypeId: FoodTypeId, quantity: number): void {
    this.foodBuyQuantities.set(foodTypeId, Phaser.Math.Clamp(Math.floor(quantity), 1, 99));
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
      .map((foodType) => `${foodType.name} x${this.getFoodInventory(foodType.id)}`);
    return owned.length > 0 ? owned.join(", ") : "empty";
  }

  private getDecorationInventory(decorationTypeId: string): number {
    return this.decorationInventory.get(decorationTypeId) ?? 0;
  }

  private getFishTankLevel(fishType: FishType): number {
    return Phaser.Math.Clamp(Math.floor(fishType.tankLevel ?? 1), 1, maxTankLevel);
  }

  private canTankAcceptFish(fishType: FishType): boolean {
    return this.getFishTankLevel(fishType) <= this.tankLevel;
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
    this.floatText(`Tank L${this.tankLevel}`, toastX, toastY, "#a8ffb0");
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
    const coinDropValue = this.coinDrops.reduce((total, coin) => total + coin.value * coinWealthValue[coin.coinType], 0);

    return Math.round(this.walletWealth() + fishValue + foodValue + storedFishValue + decorationValue + coinDropValue);
  }

  private getTankNeedIndicator(): string {
    const nextLockedFish = fishTypes.find((fishType) => this.getFishTankLevel(fishType) > this.tankLevel);
    const upgradePrice = this.getNextTankUpgradePrice();
    if (upgradePrice && nextLockedFish && canAfford(this.wallet, upgradePrice)) {
      return `Tank L${this.tankLevel}: upgrade ready for L${this.tankLevel + 1} fish`;
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
      return `Next: save ${formatPrice(upgradePrice)} for Tank L${this.tankLevel + 1}`;
    }

    return `Tank L${this.tankLevel}: stable`;
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
    this.floatText(wasActive ? `Auto feed +${this.autoFeederMinutes}m` : `Auto feed ${this.autoFeederMinutes}m`, toastX, toastY, "#a8ffb0");
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
    this.floatText(wasActive ? `Auto coins +${this.autoCollectorMinutes}m` : `Auto coins ${this.autoCollectorMinutes}m`, toastX, toastY, "#a8ffb0");
    this.refreshUi();
    this.saveNow();
  }

  private changeRentalMinutes(rental: "feeder" | "collector", delta: number): void {
    if (rental === "feeder") {
      this.autoFeederMinutes = this.sanitizeRentalMinutes(this.autoFeederMinutes + delta);
      this.floatText(`Feed ${this.autoFeederMinutes}m`, toastX, toastY, "#d7f4ff");
    } else {
      this.autoCollectorMinutes = this.sanitizeRentalMinutes(this.autoCollectorMinutes + delta);
      this.floatText(`Coins ${this.autoCollectorMinutes}m`, toastX, toastY, "#d7f4ff");
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
    this.foods.push(new FoodPellet(this, x, y, foodType));
    this.floatText("Auto feed", x, y - 14, "#f7ff9a");
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

  private chooseAutoFoodForFish(targetFish: Fish): FoodType | undefined {
    const choices = [
      ...targetFish.type.preferredFoodTypes,
      ...targetFish.type.requiredFoodTypes,
      ...foodTypes.filter((foodType) => foodType.acceptedByDefault).map((foodType) => foodType.id)
    ];

    for (const foodTypeId of choices) {
      if (foodTypeId === "medicine" || this.getFoodInventory(foodTypeId) <= 0) {
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
    return foodTypes.filter((foodType) => foodType.id !== "medicine" && this.getFoodInventory(foodType.id) > 0);
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
      active.push(`Feed ${this.remainingRentalSeconds(this.autoFeederEndsAt)}s`);
    }
    if (this.isAutoCollectorActive()) {
      active.push(`Coins ${this.remainingRentalSeconds(this.autoCollectorEndsAt)}s`);
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
    this.floatText("+15 daily", toastX, toastY, "#ffe67a");
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
        `${"*".repeat(rarityStarCount(targetFish.type.rarity))} ${targetFish.type.rarity} | Tank L${this.getFishTankLevel(targetFish.type)} | ${targetFish.ageStage} | ${targetFish.state}`,
        `Hunger ${Math.round(targetFish.hunger)} | Health ${Math.round(targetFish.health)} | Sell C${targetFish.getSellValue()}`,
        `Eats ${requiredFood}; prefers ${preferredFood}`,
        `Produces ${production.amount} ${production.coinType} every ${production.intervalSeconds}s`,
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
    return `${compatibility.score}% community safe`;
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
          "Buy another baby before selling this one."
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
        `Rarity: ${targetFish.type.rarity} | Age: ${targetFish.ageStage}`,
        ...(protectedRarity ? ["Rare and event fish require extra care before selling."] : []),
        `You receive ${formatPrice({ coinType: targetFish.type.sellBaseValue.coinType, amount: targetFish.getSellValue() })}.`
      ],
      [
        { label: "Confirm", fill: 0x76512d, action: () => this.sellFishByIndex(index) },
        { label: "Cancel", fill: 0x254d68, action: () => this.closeModal() }
      ]
    );
  }

  private showOfflineSummary(): void {
    this.showModal(
      "Offline Summary",
      [
        `${Math.floor(this.offlineProgress.elapsedSeconds / 60)} minutes away.`,
        `Earned ${formatWallet(this.offlineProgress.earned)}.`,
        `Cleanliness is ${Math.round(this.cleanliness)}%. Fish grew and got a little hungrier.`
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
        fishCatalogLevel: this.fishCatalogLevel,
        placementMode: this.placementMode.kind,
        fishCount: this.fish.length,
        maxFishCapacity,
        tankLevel: this.tankLevel,
        maxTankLevel,
        totalWealth: this.calculateTotalWealth(),
        tankNeedIndicator: this.getTankNeedIndicator(),
        fishTypeCount: fishTypes.length,
        visibleFishCatalogCount: fishTypes.filter((fishType) => this.getFishTankLevel(fishType) === this.fishCatalogLevel).length,
        nextTankUpgradePrice: this.getNextTankUpgradePrice(),
        foodCount: this.foods.length,
        coinDropCount: this.coinDrops.length,
        maxCoinDrops,
        decorationCount: this.placedDecorations.length,
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
        fish: this.fish.map((currentFish) => ({
          state: currentFish.state,
          ageStage: currentFish.ageStage,
          hunger: currentFish.hunger,
          health: currentFish.health,
          x: currentFish.sprite.x,
          y: currentFish.sprite.y,
          scale: currentFish.sprite.scaleX,
          movementSizeMultiplier: currentFish.movementSizeMultiplier(),
          bodyTint: currentFish.sprite.tintTopLeft,
          sellValue: currentFish.getSellValue(),
          nextCoinDropInMs: Math.max(0, currentFish.nextCoinDropAt - this.time.now),
          statusBars: currentFish.getStatusBarsSnapshot()
        })),
        foods: this.foods.map((food) => ({
          x: food.sprite.x,
          y: food.sprite.y,
          foodType: food.foodType.id,
          textureKey: food.sprite.texture.key,
          visualTint: food.visualTint,
          sinkSpeed: food.sinkSpeed
        })),
        coinsWaiting: this.coinDrops.map((coin) => ({
          x: coin.sprite.x,
          y: coin.sprite.y,
          value: coin.value,
          coinType: coin.coinType,
          tint: coin.visual.tint,
          textColor: coin.visual.textColor,
          sinkSpeed: coin.sinkSpeed,
          bottomY: coin.bottomY,
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
        targetFish.refreshStatusBars();
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
      buyDecoration: (decorationTypeId: string) => {
        const decorationType = decorationTypes.find((item) => item.id === decorationTypeId);
        if (decorationType) {
          this.buyDecoration(decorationType);
        }
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
    this.createCoinTexture();
    this.createDecorationTextures();
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
  }
}
