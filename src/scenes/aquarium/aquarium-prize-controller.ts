import Phaser from "phaser";
import { toastX, toastY } from "../../game/constants";
import { canAfford, earn, formatNumber, formatPrice } from "../../game/economy";
import {
  beginPrizeMachineSession,
  recordPrizeMachineSpin,
  recordPrizeMachineWin,
  type PrizeMachineBetAmount,
  type PrizeMachineConfig,
  type PrizeMachineState
} from "../../game/prize-machine";
import type { PrizeWheelPlanner } from "../../game/prize-wheel-planner";
import { type PrizeWheelSegment } from "../../game/prize-machine-wheel";
import {
  awardPreparedPrizeMachineReward,
  commonPrizeResult,
  createPrizeWheelPlannerForAquarium,
  currentPrizeBetAmount as currentPrizeBetAmountModel,
  currentPrizeMachineConfig as currentPrizeMachineConfigModel,
  foodPrizeInventoryAmount,
  nextPrizeFishForRarity,
  selectPrizeBetAmount,
  setPrizeMachineResultState,
  syncPrizeBetAmount
} from "../../game/prize-machine-flow";
import type { DecorationSize } from "../../game/tank-catalog";
import { decorationSizes } from "../../game/tank-catalog";
import type { Fish } from "../../objects/Fish";
import type { DecorationType, FishType, FoodType, FoodTypeId, Price, Rarity, Wallet } from "../../types/mechanics";
import type { PageButtonFactory } from "../../ui/PageOverlay";
import { createPrizeBetGrid } from "../../ui/PrizeBetModal";
import {
  createPrizeMachineArcadeSpinner,
  playPrizeMachineArcadeSpin,
  prizeMachinePointerActionAt
} from "../../ui/PrizeMachineArcade";
import {
  fixedPrizeBetAmounts,
  prizeHighlightSoundKey,
  prizeRewardSoundKey,
  type AppScreen,
  type PlacementMode
} from "./aquarium-scene-config";

export type AquariumPrizeControllerHost = {
  scene: Phaser.Scene;
  runtimeSessionId: number;
  getActiveScreen: () => AppScreen;
  setActiveScreen: (screen: AppScreen) => void;
  setPlacementMode: (mode: PlacementMode) => void;
  hasModal: () => boolean;
  closeModal: () => void;
  closePage: () => void;
  hideStoreOverlay: () => void;
  hideHtmlPageOverlay: () => void;
  hideHtmlPageOverlayClass: () => void;
  createFoodDock: () => void;
  syncHtmlGameInterface: () => void;
  showModal: (title: string, lines: string[], actions: { label: string; fill: number; action: () => void }[], content: HTMLElement[]) => void;
  pageButtonFactory: () => PageButtonFactory;
  floatText: (message: string, x: number, y: number, color: string) => void;
  playSfx: (key: string, config?: Phaser.Types.Sound.SoundConfig) => void;
  saveNow: () => void;
  recordDailyQuestAction: (action: string) => void;
  spendPrice: (price: Price) => boolean;
  priceWealth: (price: Price) => number;
  getWallet: () => Wallet;
  isDeveloperGodMode: () => boolean;
  getPrizeMachine: () => PrizeMachineState;
  setPrizeMachine: (state: PrizeMachineState) => void;
  getSelectedBetIndex: () => number | undefined;
  setSelectedBetIndex: (index: number | undefined) => void;
  getSpinContainer: () => Phaser.GameObjects.Container | undefined;
  setSpinContainer: (container: Phaser.GameObjects.Container | undefined) => void;
  isSpinInProgress: () => boolean;
  setSpinInProgress: (inProgress: boolean) => void;
  getFish: () => readonly Fish[];
  getFishInventory: () => ReadonlyMap<string, number>;
  textureExists: (textureKey: string) => boolean;
  ensureFishTexturesLoaded: (fishType: FishType) => void;
  isDroppableFood: (foodTypeId: FoodTypeId) => boolean;
  isCalorieTrackedFood: (foodTypeId: FoodTypeId) => boolean;
  foodTextureKey: (foodTypeId: FoodTypeId) => string;
  foodSellValue: (foodType: FoodType, storedAmount?: number) => number;
  decorationSellValue: (decorationType: DecorationType, size: DecorationSize, count?: number) => number;
  decorationVariantPrice: (decorationType: DecorationType, size: DecorationSize) => Price;
  coinSellValue: (coinType: "rare" | "superRare", count?: number) => number;
  storedFishSellValue: (fishType: FishType) => number;
  sanitizeDecorationSize: (size: string | undefined) => DecorationSize;
  addFishToInventory: (fishType: FishType, showBubble?: boolean) => void;
  setPrizeCommonFish: (fishType: FishType) => void;
  setPrizeRareFish: (fishType: FishType) => void;
  getFoodInventory: (foodTypeId: FoodTypeId) => number;
  setFoodInventory: (foodTypeId: FoodTypeId, amount: number) => void;
  setRecentInventoryDockItemKey: (key: string) => void;
  decorationInventoryKey: (decorationTypeId: string, size: DecorationSize) => string;
  addDecorationInventory: (inventoryKey: string, amount: number) => void;
  showPrizeCelebration: (title: string, imageUrl: string, detail: string) => void;
};

export class AquariumPrizeController {
  public constructor(private readonly host: AquariumPrizeControllerHost) {}

  public openPrizeMachineArcade(): void {
    this.host.setActiveScreen("prize");
    this.host.setPlacementMode({ kind: "none" });
    this.setPrizeMachine(beginPrizeMachineSession(this.prizeMachine(), this.host.runtimeSessionId));
    this.syncDefaultPrizeBet();
    this.host.closeModal();
    this.host.hideStoreOverlay();
    this.host.hideHtmlPageOverlay();
    this.host.createFoodDock();
    this.host.syncHtmlGameInterface();
    this.host.setPrizeCommonFish(this.nextPrizeFish("common"));
    this.host.setPrizeRareFish(this.nextPrizeRareFish());
    this.ensurePrizeWheelFishTexturesLoaded();
    this.showPrizeMachineSpinner();
  }

  public showPrizeMachineSpinner(): void {
    this.destroyPrizeSpinContainer();
    this.host.setSpinInProgress(false);
    const betAmounts = this.currentPrizeBetAmounts();
    const selectedBetAmount = this.syncCurrentPrizeBetAmount(betAmounts);
    this.host.setSpinContainer(createPrizeMachineArcadeSpinner({
      scene: this.host.scene,
      config: this.currentPrizeMachineConfig(),
      segments: this.createPrizeWheelSegments(),
      commonCoins: this.host.getWallet().common,
      selectedBetAmount,
      actions: {
        onSpin: () => this.spinPrizeMachine(),
        onOpenBetPicker: () => this.showPrizeBetModal(),
        onClose: () => this.host.closePage()
      }
    }));
  }

  public selectPrizeMachineBet(betAmount: PrizeMachineBetAmount): void {
    if (this.host.isSpinInProgress()) {
      return;
    }

    const selection = selectPrizeBetAmount(this.prizeMachine(), this.currentPrizeBetAmounts(), betAmount);
    if (selection.selectedBetIndex !== undefined) {
      this.host.setSelectedBetIndex(selection.selectedBetIndex);
    }
    this.host.closeModal();
    this.setPrizeMachine(selection.state);
    this.ensurePrizeWheelFishTexturesLoaded();
    this.showPrizeMachineSpinner();
    this.host.saveNow();
  }

  public showPrizeBetModal(): void {
    if (this.host.isSpinInProgress()) {
      return;
    }

    const selectedBetAmount = this.syncCurrentPrizeBetAmount();
    const grid = createPrizeBetGrid({
      betAmounts: this.currentPrizeBetAmounts(),
      selectedBetAmount,
      createButton: this.host.pageButtonFactory(),
      onSelect: (betAmount) => this.selectPrizeMachineBet(betAmount)
    });

    this.host.showModal(
      "Select Bet",
      [],
      [{ label: "Cancel", fill: 0x254d68, action: () => this.host.closeModal() }],
      [grid]
    );
  }

  public handleNativePrizePointer(designX: number, designY: number): boolean {
    if (this.host.getActiveScreen() !== "prize" || this.host.hasModal() || !this.host.getSpinContainer()) {
      return false;
    }

    const action = prizeMachinePointerActionAt(designX, designY, this.host.isSpinInProgress());
    if (action === "close") {
      this.host.closePage();
      return true;
    }

    if (action === "spin") {
      this.spinPrizeMachine();
      return true;
    }

    if (action === "bet") {
      this.showPrizeBetModal();
      return true;
    }

    return false;
  }

  public currentPrizeMachineConfig(): PrizeMachineConfig {
    return currentPrizeMachineConfigModel(this.prizeMachine(), this.currentPrizeBetAmounts(), this.host.getSelectedBetIndex());
  }

  public currentPrizeBetAmounts(): PrizeMachineBetAmount[] {
    return [...fixedPrizeBetAmounts];
  }

  private syncDefaultPrizeBet(): void {
    if (this.host.getSelectedBetIndex() !== undefined) {
      return;
    }

    const betAmounts = this.currentPrizeBetAmounts();
    const targetBet = Math.max(1, this.host.getWallet().common / 100);
    const closestBet = betAmounts.reduce((closest, bet) => Math.abs(bet - targetBet) < Math.abs(closest - targetBet) ? bet : closest, betAmounts[0] ?? 1);
    const selection = selectPrizeBetAmount(this.prizeMachine(), betAmounts, closestBet);
    this.setPrizeMachine(selection.state);
    if (selection.selectedBetIndex !== undefined) {
      this.host.setSelectedBetIndex(selection.selectedBetIndex);
    }
  }

  public currentPrizeBetAmount(betAmounts = this.currentPrizeBetAmounts()): PrizeMachineBetAmount {
    return currentPrizeBetAmountModel(this.prizeMachine(), betAmounts, this.host.getSelectedBetIndex());
  }

  public syncCurrentPrizeBetAmount(betAmounts = this.currentPrizeBetAmounts()): PrizeMachineBetAmount {
    const result = syncPrizeBetAmount(this.prizeMachine(), betAmounts, this.host.getSelectedBetIndex());
    this.setPrizeMachine(result.state);
    return result.selectedBetAmount;
  }

  public spinPrizeMachine(): void {
    if (this.host.isSpinInProgress()) {
      return;
    }

    this.syncCurrentPrizeBetAmount();
    const config = this.currentPrizeMachineConfig();
    if (!this.host.spendPrice(config.spinCost)) {
      this.host.floatText(`Need ${formatPrice(config.spinCost)}`, toastX, toastY, "#ffb0a8");
      if (!this.host.getSpinContainer()) {
        this.host.closePage();
      }
      return;
    }

    this.setPrizeMachine(recordPrizeMachineSpin(this.prizeMachine(), this.host.priceWealth(config.spinCost)));
    const prizePlanner = this.createPrizeWheelPlanner();
    const segments = prizePlanner.createSegments();
    const preparedReward = prizePlanner.choosePreparedReward(segments);
    const preparedRewardValue = prizePlanner.rewardResaleValue(preparedReward);
    this.host.setSpinInProgress(true);
    this.host.hideHtmlPageOverlayClass();
    this.destroyPrizeSpinContainer();
    let rewardApplied = false;
    const applyPrizeReward = () => {
      if (rewardApplied) {
        return;
      }
      rewardApplied = true;
      this.host.setSpinInProgress(false);
      this.awardPrizeMachinePreparedReward(preparedReward);
      this.setPrizeMachine(recordPrizeMachineWin(
        this.prizeMachine(),
        preparedRewardValue,
        prizePlanner.rewardKey(preparedReward)
      ));

      this.host.recordDailyQuestAction("prize-game");
      this.host.createFoodDock();
      this.host.saveNow();
    };
    const resultBetAmounts = this.currentPrizeBetAmounts();
    const resultSelectedBetAmount = this.currentPrizeBetAmount(resultBetAmounts);
    this.host.setSpinContainer(playPrizeMachineArcadeSpin({
      scene: this.host.scene,
      config,
      segments,
      resultIndex: preparedReward.segmentIndex,
      commonCoins: this.host.getWallet().common,
      selectedBetAmount: resultSelectedBetAmount,
      actions: {
        onRewardReady: applyPrizeReward,
        onOpenBetPicker: () => {
          applyPrizeReward();
          this.showPrizeBetModal();
        },
        onSpinAgain: () => {
          applyPrizeReward();
          this.syncCurrentPrizeBetAmount();
          const nextConfig = this.currentPrizeMachineConfig();
          if (!this.host.isDeveloperGodMode() && !canAfford(this.host.getWallet(), nextConfig.spinCost)) {
            this.host.floatText(`Need ${formatPrice(nextConfig.spinCost)}`, toastX, toastY, "#ffb0a8");
            return;
          }
          this.destroyPrizeSpinContainer();
          this.spinPrizeMachine();
        },
        onClose: () => {
          applyPrizeReward();
          this.host.closePage();
        },
        getCommonCoins: () => this.host.getWallet().common,
        getSelectedBetAmount: () => this.syncCurrentPrizeBetAmount(),
        onHighlight: () => this.host.playSfx(prizeHighlightSoundKey, { volume: 0.12 }),
        onStop: () => this.host.playSfx(prizeRewardSoundKey, { volume: 0.18 })
      }
    }));
  }

  public createPrizeWheelPlanner(): PrizeWheelPlanner {
    return createPrizeWheelPlannerForAquarium({
      prizeMachine: this.prizeMachine(),
      fish: this.host.getFish(),
      fishInventory: this.host.getFishInventory(),
      textureExists: this.host.textureExists,
      isDroppableFood: this.host.isDroppableFood,
      isCalorieTrackedFood: this.host.isCalorieTrackedFood,
      foodTextureKey: this.host.foodTextureKey,
      foodSellValue: this.host.foodSellValue,
      decorationSellValue: this.host.decorationSellValue,
      decorationVariantPrice: this.host.decorationVariantPrice,
      priceWealth: this.host.priceWealth,
      coinSellValue: this.host.coinSellValue,
      storedFishSellValue: this.host.storedFishSellValue,
      sanitizeDecorationSize: this.host.sanitizeDecorationSize
    });
  }

  public createPrizeWheelSegments(): PrizeWheelSegment[] {
    return this.createPrizeWheelPlanner().createSegments();
  }

  public ensurePrizeWheelFishTexturesLoaded(): void {
    this.createPrizeWheelPlanner()
      .fishPrizePool()
      .slice(0, 8)
      .forEach((fishType) => this.host.ensureFishTexturesLoaded(fishType));
  }

  public destroyPrizeSpinContainer(): void {
    this.host.getSpinContainer()?.destroy(true);
    this.host.setSpinContainer(undefined);
  }

  public nextPrizeRareFish(): FishType {
    return this.nextPrizeFish("rare");
  }

  public nextPrizeFish(rarity: Rarity): FishType {
    return nextPrizeFishForRarity(rarity, this.host.getFish(), this.host.getFishInventory());
  }

  private awardPrizeMachinePreparedReward(reward: Parameters<typeof awardPreparedPrizeMachineReward>[0]): void {
    awardPreparedPrizeMachineReward(reward, {
      rare: (amount) => this.awardPrizeMachineRare(amount),
      superRare: (amount) => this.awardPrizeMachineSuperRare(amount),
      rareFish: (fishType) => this.awardPrizeMachineRareFish(fishType),
      common: (amount) => this.awardPrizeMachineCommon(amount),
      food: (foodType, quantity) => this.awardPrizeMachineFood(foodType, quantity),
      decoration: (decorationType, size) => this.awardPrizeMachineDecoration(decorationType, size)
    });
  }

  private awardPrizeMachineRare(amount: number): void {
    earn(this.host.getWallet(), "rare", amount);
    this.setPrizeMachineResult("rare", `R${formatNumber(amount)} Prize!`, "Rare coins dropped from the spinner.");
    this.host.showPrizeCelebration("Rare Coin!", "/assets/ui/shop/coin_icon_rare.png", `You won R${formatNumber(amount)}.`);
  }

  private awardPrizeMachineSuperRare(amount: number): void {
    earn(this.host.getWallet(), "superRare", amount);
    this.setPrizeMachineResult("superRare", `SR${formatNumber(amount)} Prize!`, "Super rare diamonds dropped from the spinner.");
    this.host.showPrizeCelebration("Super Rare!", "/assets/ui/shop/coin_icon_super_rare.png", `You won SR${formatNumber(amount)}.`);
  }

  private awardPrizeMachineRareFish(fishType: FishType): void {
    this.host.addFishToInventory(fishType, false);
    this.setPrizeMachineResult("rareFish", `${fishType.name} Prize!`, "The fish is waiting in your Inventory.");
    this.host.showPrizeCelebration(`${fishType.name}!`, `/assets/fish/${fishType.id}.png`, "A fish is waiting in your Inventory.");
    if (fishType.rarity === "common") {
      this.host.setPrizeCommonFish(this.nextPrizeFish("common"));
    } else {
      this.host.setPrizeRareFish(this.nextPrizeRareFish());
    }
  }

  private awardPrizeMachineFood(foodType: FoodType, quantity: number): void {
    const amount = foodPrizeInventoryAmount(foodType, quantity, this.host.isCalorieTrackedFood);
    this.host.setFoodInventory(foodType.id, this.host.getFoodInventory(foodType.id) + amount);
    this.host.setRecentInventoryDockItemKey(`food:${foodType.id}`);
    this.setPrizeMachineResult("food", `Food Prize: ${foodType.name}`, `+${formatNumber(amount)} cal food.`);
  }

  private awardPrizeMachineDecoration(decorationType: DecorationType, size: DecorationSize): void {
    const inventoryKey = this.host.decorationInventoryKey(decorationType.id, size);
    this.host.addDecorationInventory(inventoryKey, 1);
    this.host.setRecentInventoryDockItemKey(`decoration:${decorationType.id}:${size}`);
    this.setPrizeMachineResult(
      "decoration",
      `${decorationType.name} ${decorationSizes[size].label} Prize!`,
      "The decoration is waiting in your Inventory."
    );
  }

  private awardPrizeMachineCommon(amount: number): void {
    earn(this.host.getWallet(), "common", amount);
    const result = commonPrizeResult(amount);
    this.setPrizeMachineResult("common", result.title, result.detail);
  }

  private setPrizeMachineResult(kind: Parameters<typeof setPrizeMachineResultState>[1], title: string, detail: string): void {
    this.setPrizeMachine(setPrizeMachineResultState(this.prizeMachine(), kind, title, detail));
  }

  private prizeMachine(): PrizeMachineState {
    return this.host.getPrizeMachine();
  }

  private setPrizeMachine(state: PrizeMachineState): void {
    this.host.setPrizeMachine(state);
  }
}
