import Phaser from "phaser";
import { basicFood, decorationTypes, fishTypes } from "../data/content";
import { controlPanelTop, gameHeight, gameWidth, tankBounds, toastX, toastY } from "../game/constants";
import { createWallet, earn, formatPrice, formatWallet, spend } from "../game/economy";
import { CoinDrop } from "../objects/CoinDrop";
import { Fish } from "../objects/Fish";
import { FoodPellet } from "../objects/FoodPellet";
import type { DecorationType, FishState, FishType, StoreTab, Wallet } from "../types/mechanics";

type PlacementMode =
  | { kind: "none" }
  | { kind: "fish"; fishTypeId: string }
  | { kind: "food" }
  | { kind: "decoration"; decorationTypeId: string };

type AquariumTestSnapshot = {
  coins: number;
  wallet: Wallet;
  foodInventory: number;
  activeTab: StoreTab;
  placementMode: PlacementMode["kind"];
  fishCount: number;
  foodCount: number;
  coinDropCount: number;
  decorationCount: number;
  fish: Array<{
    state: FishState;
    ageStage: string;
    hunger: number;
    health: number;
    x: number;
    y: number;
    scale: number;
    sellValue: number;
  }>;
  foods: Array<{ x: number; y: number }>;
  coinsWaiting: Array<{ x: number; y: number; value: number; coinType: string }>;
};

declare global {
  interface Window {
    __aquariumTest?: {
      getSnapshot: () => AquariumTestSnapshot;
      setFishVitals: (index: number, hunger: number, health: number) => void;
      setFishPosition: (index: number, x: number, y: number) => void;
      forceCoinReady: (index: number) => void;
      forceFishAge: (index: number, ageSeconds: number) => void;
    };
  }
}

export class AquariumScene extends Phaser.Scene {
  private wallet = createWallet(120, 0, 0);
  private foodInventory = 3;
  private fishInventory = new Map<string, number>();
  private decorationInventory = new Map<string, number>();
  private fish: Fish[] = [];
  private foods: FoodPellet[] = [];
  private coinDrops: CoinDrop[] = [];
  private placementMode: PlacementMode = { kind: "none" };
  private activeTab: StoreTab = "fish";
  private placedDecorationCount = 0;
  private hudText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private modeText!: Phaser.GameObjects.Text;
  private tabButtons: Phaser.GameObjects.Container[] = [];
  private tabControls: Phaser.GameObjects.Container[] = [];

  public constructor() {
    super("AquariumScene");
  }

  public create(): void {
    this.createTextures();
    this.createWorld();
    this.createUi();
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

    for (const currentFish of this.fish) {
      const eatenFood = currentFish.update(deltaSeconds, this.foods);
      if (eatenFood) {
        this.removeFood(eatenFood);
        this.floatText("Yum", currentFish.sprite.x, currentFish.sprite.y - 26, "#f7ff9a");
      }

      if (currentFish.canDropCoin(now)) {
        currentFish.markCoinDropped(now);
        this.dropCoin(currentFish);
      }
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
        tankBounds.width + 16,
        tankBounds.height + 16,
        0xd7f4ff,
        0.92
      )
      .setStrokeStyle(5, 0xffffff, 0.9);
    this.add.rectangle(tankBounds.centerX, tankBounds.centerY, tankBounds.width, tankBounds.height, 0x0b7097, 1);
    this.add.rectangle(tankBounds.centerX, tankBounds.bottom - 18, tankBounds.width, 36, 0xd5b46d, 1);

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
      fontSize: "15px",
      color: "#ffe67a",
      fontStyle: "bold"
    });

    this.modeText = this.add.text(20, 534, "", {
      fontFamily: "Arial",
      fontSize: "12px",
      color: "#cfeeff",
      wordWrap: { width: 390 }
    });

    this.statusText = this.add.text(20, 550, "", {
      fontFamily: "Arial",
      fontSize: "11px",
      color: "#eaf9ff",
      wordWrap: { width: 390 }
    });

    this.add
      .rectangle(gameWidth / 2, 660, 394, 184, 0x10283a, 0.96)
      .setStrokeStyle(2, 0x75c9e8, 0.55)
      .setDepth(18);

    this.createTabs();
    this.renderTabControls();
  }

  private createTabs(): void {
    this.tabButtons.forEach((button) => button.destroy(true));
    this.tabButtons = [];

    const tabs: { label: string; tab: StoreTab; x: number }[] = [
      { label: "Fish", tab: "fish", x: 20 },
      { label: "Food", tab: "food", x: 154 },
      { label: "Decor", tab: "decor", x: 288 }
    ];

    for (const tab of tabs) {
      const tabButton = this.createButton(
        tab.x,
        controlPanelTop + 12,
        122,
        32,
        tab.label,
        () => {
          this.activeTab = tab.tab;
          this.createTabs();
          this.renderTabControls();
          this.refreshUi(false);
        },
        this.activeTab === tab.tab ? 0x3c93bd : 0x254d68,
        14
      ).setDepth(21);
      this.tabButtons.push(tabButton);
    }
  }

  private renderTabControls(): void {
    this.tabControls.forEach((control) => control.destroy(true));
    this.tabControls = [];

    if (this.activeTab === "fish") {
      let y = controlPanelTop + 54;
      for (const fishType of fishTypes) {
        this.addControlRow(
          y,
          `${fishType.name} ${formatPrice(fishType.price)}`,
          `Place x${this.getFishInventory(fishType.id)}`,
          () => this.buyFish(fishType),
          () => this.selectFish(fishType.id),
          0x256f95
        );
        y += 38;
      }

      const sellLabel = this.fish.length > 0 ? `Sell Oldest +${this.fish[0].getSellValue()}` : "Sell Fish";
      this.tabControls.push(
        this.createButton(20, y + 2, 390, 28, sellLabel, () => this.sellOldestFish(), 0x76512d, 12)
      );
      return;
    }

    if (this.activeTab === "food") {
      this.tabControls.push(
        this.createButton(
          20,
          controlPanelTop + 62,
          188,
          44,
          `Buy Food ${formatPrice(basicFood.price)}`,
          () => this.buyFood(),
          0x256f95,
          15
        ),
        this.createButton(222, controlPanelTop + 62, 188, 44, `Drop Food x${this.foodInventory}`, () => this.selectFood(), 0x356a35, 15)
      );
      this.tabControls.push(
        this.createButton(20, controlPanelTop + 120, 390, 42, "Tap the tank after choosing food", () => this.selectFood(), 0x254d68, 14)
      );
      return;
    }

    let y = controlPanelTop + 54;
    for (const decorationType of decorationTypes) {
      this.addControlRow(
        y,
        `${decorationType.name} ${formatPrice(decorationType.price)}`,
        `Place x${this.getDecorationInventory(decorationType.id)}`,
        () => this.buyDecoration(decorationType),
        () => this.selectDecoration(decorationType.id),
        0x584f86
      );
      y += 40;
    }
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
      this.createButton(20, y, 250, 34, buyLabel, onBuy, 0x256f95, 13),
      this.createButton(284, y, 126, 34, placeLabel, onPlace, placeFill, 12)
    );
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
    button.setDepth(22);
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
    if (!this.spendPrice(fishType.price)) {
      return;
    }

    this.fishInventory.set(fishType.id, this.getFishInventory(fishType.id) + 1);
    this.placementMode = { kind: "fish", fishTypeId: fishType.id };
    this.floatText(`${fishType.name} bought`, toastX, toastY, "#a8ffb0");
    this.refreshUi();
  }

  private buyFood(): void {
    if (!this.spendPrice(basicFood.price)) {
      return;
    }

    this.foodInventory += 1;
    this.placementMode = { kind: "food" };
    this.floatText("Food bought", toastX, toastY, "#a8ffb0");
    this.refreshUi();
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
    this.refreshUi();
  }

  private sellOldestFish(): void {
    const fishToSell = this.fish.shift();
    if (!fishToSell) {
      this.floatText("No fish to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    const sellValue = fishToSell.getSellValue();
    earn(this.wallet, fishToSell.type.sellBaseValue.coinType, sellValue);
    this.floatText(`Sold ${fishToSell.type.name} +${sellValue}`, toastX, toastY, "#ffe67a");
    fishToSell.destroy();
    this.refreshUi();
  }

  private selectFish(fishTypeId: string): void {
    if (this.getFishInventory(fishTypeId) <= 0) {
      this.floatText("Buy one first", toastX, toastY, "#ffb0a8");
      return;
    }

    this.placementMode = { kind: "fish", fishTypeId };
    this.refreshUi();
  }

  private selectFood(): void {
    if (this.foodInventory <= 0) {
      this.floatText("No food left", toastX, toastY, "#ffb0a8");
      return;
    }

    this.placementMode = { kind: "food" };
    this.refreshUi();
  }

  private selectDecoration(decorationTypeId: string): void {
    if (this.getDecorationInventory(decorationTypeId) <= 0) {
      this.floatText("Buy one first", toastX, toastY, "#ffb0a8");
      return;
    }

    this.placementMode = { kind: "decoration", decorationTypeId };
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

      this.fishInventory.set(type.id, this.getFishInventory(type.id) - 1);
      const placedFish = new Fish(this, type, pointer.x, pointer.y);
      placedFish.sprite.setInteractive({ useHandCursor: true });
      placedFish.sprite.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
        event.stopPropagation();
        this.activeTab = "fish";
        this.createTabs();
        this.renderTabControls();
        this.floatText(`${placedFish.type.name}: ${placedFish.ageStage}`, placedFish.sprite.x, placedFish.sprite.y - 38, "#eaf9ff");
      });
      placedFish.markCoinDropped(this.time.now + 2500);
      this.fish.push(placedFish);
      this.floatText(`${type.name} baby`, pointer.x, pointer.y - 34, "#ffffff");
      this.placementMode = { kind: "none" };
      this.refreshUi();
      return;
    }

    if (mode.kind === "food") {
      if (this.foodInventory <= 0) {
        return;
      }

      this.foodInventory -= 1;
      this.foods.push(new FoodPellet(this, pointer.x, pointer.y));
      this.placementMode = this.foodInventory > 0 ? { kind: "food" } : { kind: "none" };
      this.refreshUi();
      return;
    }

    if (mode.kind === "decoration") {
      const decoration = decorationTypes.find((item) => item.id === mode.decorationTypeId);
      if (!decoration || this.getDecorationInventory(decoration.id) <= 0) {
        return;
      }

      this.decorationInventory.set(decoration.id, this.getDecorationInventory(decoration.id) - 1);
      this.add.image(pointer.x, pointer.y, decoration.texture).setDepth(pointer.y > tankBounds.bottom - 80 ? 5 : 3);
      this.placedDecorationCount += 1;
      this.placementMode =
        this.getDecorationInventory(decoration.id) > 0
          ? { kind: "decoration", decorationTypeId: decoration.id }
          : { kind: "none" };
      this.refreshUi();
    }
  }

  private spendPrice(price: FishType["price"]): boolean {
    if (!spend(this.wallet, price)) {
      this.floatText(`Need ${formatPrice(price)}`, toastX, toastY, "#ffb0a8");
      return false;
    }

    return true;
  }

  private dropCoin(fish: Fish): void {
    const production = fish.primaryProduction();
    const coin = new CoinDrop(this, fish.sprite.x, fish.sprite.y - 24, production.amount, production.coinType);
    coin.sprite.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      earn(this.wallet, coin.coinType, coin.value);
      this.floatText(`+${coin.value}`, coin.sprite.x, coin.sprite.y - 20, "#ffe67a");
      this.coinDrops = this.coinDrops.filter((drop) => drop !== coin);
      coin.destroy();
      this.refreshUi();
    });
    this.coinDrops.push(coin);

    this.tweens.add({
      targets: [coin.sprite, coin.valueText],
      y: "-=10",
      yoyo: true,
      duration: 900,
      repeat: -1,
      ease: "Sine.inOut"
    });
  }

  private removeFood(food: FoodPellet): void {
    this.foods = this.foods.filter((item) => item !== food);
    food.destroy();
  }

  private refreshUi(renderControls = true): void {
    this.hudText.setText(`${formatWallet(this.wallet)}  Food:${this.foodInventory}`);
    this.modeText.setText(this.getModeLabel());
    if (renderControls) {
      this.renderTabControls();
    }
    this.refreshStatus();
  }

  private refreshStatus(): void {
    if (this.fish.length === 0) {
      this.statusText.setText("Buy a baby fish, place it in the tank, then drop food when it gets hungry.");
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
      `Fish: ${this.fish.length} | Babies: ${babies} | Happy: ${counts.happy} | Hungry: ${counts.hungry} | Ill: ${counts.ill} | Coins waiting: ${this.coinDrops.length}`
    );
  }

  private getModeLabel(): string {
    const mode = this.placementMode;

    if (mode.kind === "fish") {
      const fishType = fishTypes.find((item) => item.id === mode.fishTypeId);
      return `Selected: place ${fishType?.name ?? "fish"} baby in the tank`;
    }

    if (mode.kind === "food") {
      return "Selected: drop food in the tank";
    }

    if (mode.kind === "decoration") {
      const decorationType = decorationTypes.find((item) => item.id === mode.decorationTypeId);
      return `Selected: place ${decorationType?.name ?? "decoration"}`;
    }

    return "Select something from inventory, then click inside the tank.";
  }

  private getFishInventory(fishTypeId: string): number {
    return this.fishInventory.get(fishTypeId) ?? 0;
  }

  private getDecorationInventory(decorationTypeId: string): number {
    return this.decorationInventory.get(decorationTypeId) ?? 0;
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
        foodInventory: this.foodInventory,
        activeTab: this.activeTab,
        placementMode: this.placementMode.kind,
        fishCount: this.fish.length,
        foodCount: this.foods.length,
        coinDropCount: this.coinDrops.length,
        decorationCount: this.placedDecorationCount,
        fish: this.fish.map((currentFish) => ({
          state: currentFish.state,
          ageStage: currentFish.ageStage,
          hunger: currentFish.hunger,
          health: currentFish.health,
          x: currentFish.sprite.x,
          y: currentFish.sprite.y,
          scale: currentFish.sprite.scaleX,
          sellValue: currentFish.getSellValue()
        })),
        foods: this.foods.map((food) => ({ x: food.sprite.x, y: food.sprite.y })),
        coinsWaiting: this.coinDrops.map((coin) => ({
          x: coin.sprite.x,
          y: coin.sprite.y,
          value: coin.value,
          coinType: coin.coinType
        }))
      }),
      setFishVitals: (index: number, hunger: number, health: number) => {
        const targetFish = this.fish[index];
        if (!targetFish) {
          return;
        }

        targetFish.hunger = Phaser.Math.Clamp(hunger, 0, 100);
        targetFish.health = Phaser.Math.Clamp(health, 0, 100);
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

        targetFish.ageSeconds = ageSeconds;
      }
    };
  }

  private createTextures(): void {
    this.createFishTexture();
    this.createFoodTexture();
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

