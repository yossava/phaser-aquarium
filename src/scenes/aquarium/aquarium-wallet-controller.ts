import Phaser from "phaser";
import { CoinDrop } from "../../objects/CoinDrop";
import { QuestPresentDrop, type QuestPresentDropOptions } from "../../objects/QuestPresentDrop";
import {
  coinCollectDetune as coinCollectDetuneModel,
  collectCoin as collectCoinModel,
  commonWealthValueForCoin,
  createCoinDrop as createCoinDropModel,
  registerCoinCombo as registerCoinComboModel,
  resolveCoinCombo as resolveCoinComboModel,
  type CoinComboState,
  type CoinDropOptions
} from "../../game/coin-production";
import { formatNumber } from "../../game/economy";
import {
  activeUtilityRemainingMinutes,
  coinMagnetInventoryKey,
  utilityExpiresAt
} from "../../game/dispenser-system";
import { compactDurationLabel as compactDurationLabelModel } from "../../game/inventory-page";
import {
  gameHeight,
  gameWidth,
  tankBounds,
  tankViewportBounds
} from "../../game/constants";
import {
  automatedCoinCollectFeeRate,
  coinCollectSoundKey,
  coinComboMaxCount,
  coinComboRewardPercentPerCount,
  coinComboRewardTextDurationMs,
  coinMagnetAttractDurationMs,
  coinMagnetAttractScale,
  coinMagnetRayYOffset,
  maxCoinDrops,
  prizeRewardSoundKey,
  timeCurrentSpeedMultiplier
} from "./aquarium-scene-config";
import type { CoinType, FishState, Wallet } from "../../types/mechanics";
import type { AppScreen, PlacementMode } from "./aquarium-scene-config";
import type { DailyQuestReward } from "../../game/quest-system";
import type { Fish } from "../../objects/Fish";

export type WalletControllerHost = {
  scene: Phaser.Scene;
  wallet: Wallet;
  coinDrops: CoinDrop[];
  magnetCollectingCoins: Set<CoinDrop>;
  coinMagnetPreviousCoinY: Map<CoinDrop, number>;
  coinMagnetY: number;
  coinMagnetElement?: HTMLDivElement;
  coinMagnetText?: HTMLSpanElement;
  coinMagnetRay?: Phaser.GameObjects.Graphics;
  coinMagnetWasActive: boolean;
  coinMagnetDisplayedMinutes: number;
  coinComboCount: number;
  coinComboCollectedValue: number;
  coinComboLastClaimedAt: number;
  coinComboLastPosition: Phaser.Math.Vector2;
  coinComboOverlay?: HTMLDivElement;
  questPresents: Array<{ drop: QuestPresentDrop; reward: DailyQuestReward }>;
  getModal(): boolean;
  getActiveScreen(): AppScreen;
  getHtmlDockDragging(): boolean;
  getTankLevel(): number;
  getCleanliness(): number;
  decorationInventory: Map<string, number>;
  tankLayer: Phaser.GameObjects.Container;
  gameHudCommonText?: HTMLSpanElement;
  gameHudRareText?: HTMLSpanElement;
  gameHudSuperRareText?: HTMLSpanElement;
  tankViewScaleForLevel(): number;
  refreshVisibleTankViewport(): void;
  foodDispenserMinY(): number;
  foodDispenserMaxY(): number;
  addFishProductionTotal(level: number, bonus: number): boolean;
  recordDailyQuestAction(action: string): void;
  dailyQuestActionCount(action: string): number;
  floatCoinClaimText(value: number, coinType: CoinType, x: number, y: number, color: string, automated: boolean, fee?: number): void;
  floatTankText(message: string, x: number, y: number, color: string): void;
  floatText(message: string, x: number, y: number, color: string): void;
  playSfx(key: string, config: Phaser.Types.Sound.SoundConfig): void;
  saveNow(): void;
  refreshUi(renderControls?: boolean): void;
  refreshStatus(): void;
  syncHtmlGameInterface(): void;
  syncHtmlHud(): void;
  createFoodDock(): void;
  closeModal(): void;
  showPrizeCelebration(title: string, imageUrl: string, detail: string, buttonLabel?: string, onClose?: () => void): void;
  grantDailyQuestReward(reward: DailyQuestReward): void;
  dailyQuestRewardLabel(reward: DailyQuestReward): string;
  questRewardImageUrl(reward: DailyQuestReward): string;
  clientPointToDesignPoint(clientX: number, clientY: number): Phaser.Math.Vector2 | null;
  screenToTankPoint(x: number, y: number): Phaser.Math.Vector2;
  shouldShowTankScene(): boolean;
  activeFish(): Fish[];
  getTankName(level: number): string;
  tankDisplayLevel(): number;
  calculateTankHappiness(): number;
  calculateTankNetWorth(): number;
  getTotalFoodInventory(): number;
  getCompactTankNeedIndicator(): string;
  getTankNeedIndicator(): string;
  getHudNeedLabel(): string;
  getPlacementMode(): PlacementMode;
  timeCurrentRemainingSeconds(): number;
};

export class AquariumWalletController {
  constructor(private readonly host: WalletControllerHost) {}

  public createCoinDrop(
    x: number,
    y: number,
    value: number,
    coinType: CoinType,
    isMega = false,
    options: CoinDropOptions = {}
  ): CoinDrop {
    this.makeRoomForCoinDrop();
    const visibleBounds = tankViewportBounds;
    const horizontalPadding = 34 / Math.max(0.01, this.host.tankViewScaleForLevel());
    const minVisibleX = Math.max(tankBounds.left + horizontalPadding, visibleBounds.left + horizontalPadding);
    const maxVisibleX = Math.min(tankBounds.right - horizontalPadding, visibleBounds.right - horizontalPadding);
    const fallbackX = Phaser.Math.Clamp(visibleBounds.centerX || tankBounds.centerX, tankBounds.left + horizontalPadding, tankBounds.right - horizontalPadding);
    const clampedVisibleX = (targetX: number) => (minVisibleX <= maxVisibleX ? Phaser.Math.Clamp(targetX, minVisibleX, maxVisibleX) : fallbackX);
    const landingX = clampedVisibleX(options.landingX ?? x);
    const maxBottomY = this.visibleCoinBottomDesignY();
    const bottomBand = Math.round(gameWidth * 0.08);
    const bottomY = Phaser.Math.Clamp(
      options.bottomY ?? Phaser.Math.Between(Math.round(maxBottomY - bottomBand), Math.round(maxBottomY)),
      tankBounds.top + 80,
      maxBottomY
    );
    const visibleX = clampedVisibleX(x);
    const visibleY = Phaser.Math.Clamp(y, visibleBounds.top + 24, maxBottomY);

    return createCoinDropModel({
      scene: this.host.scene,
      x: visibleX,
      y: visibleY,
      value,
      coinType,
      isMega,
      options: { ...options, landingX, bottomY },
      tankViewScale: this.host.tankViewScaleForLevel(),
      tankLayer: this.host.tankLayer,
      coinDrops: this.host.coinDrops,
      coinMagnetPreviousCoinY: this.host.coinMagnetPreviousCoinY,
      visible: this.host.getActiveScreen() !== "makeup",
      canManuallyCollectTankCoins: () => this.canManuallyCollectTankCoins(),
      collectCoin: (coin, automated) => this.collectCoin(coin, automated),
      setCoinDropVisible: (coin, visible) => this.setCoinDropVisible(coin, visible)
    });
  }

  public makeRoomForCoinDrop(): void {
    while (this.host.coinDrops.length >= maxCoinDrops) {
      this.removeOldestCoinDrop();
    }
  }

  public trimExcessCoinDrops(): void {
    while (this.host.coinDrops.length > maxCoinDrops) {
      this.removeOldestCoinDrop();
    }
  }

  public removeOldestCoinDrop(): void {
    const overflowCoin = this.host.coinDrops.shift();
    if (!overflowCoin) {
      return;
    }
    this.host.coinMagnetPreviousCoinY.delete(overflowCoin);
    this.host.magnetCollectingCoins.delete(overflowCoin);
    overflowCoin.destroy();
  }

  public setCoinDropVisible(coin: CoinDrop, visible: boolean): void {
    coin.sprite.setVisible(visible);
    coin.hitZone.setVisible(visible);
    coin.shimmer.setVisible(visible);
    coin.valueText.setVisible(visible);
    if (visible && this.canManuallyCollectTankCoins()) {
      coin.hitZone.setInteractive({ useHandCursor: true });
      coin.sprite.setInteractive({ useHandCursor: true });
    } else {
      coin.hitZone.disableInteractive();
      coin.sprite.disableInteractive();
    }
  }

  public syncCoinDropVisibilityAndInput(): void {
    const visible = this.host.getActiveScreen() !== "makeup";
    for (const coin of this.host.coinDrops) {
      this.setCoinDropVisible(coin, visible);
    }
  }

  public visibleCoinBottomDesignY(): number {
    this.host.refreshVisibleTankViewport();
    const scale = Math.max(0.01, this.host.tankViewScaleForLevel());
    const visualPadding = Math.max(34, 46 / scale);
    return Phaser.Math.Clamp(tankViewportBounds.bottom - visualPadding, tankBounds.top + 80, tankBounds.bottom - 8);
  }

  public collectCoin(coin: CoinDrop, automated: boolean): void {
    collectCoinModel({
      coin,
      automated,
      coinDrops: this.host.coinDrops,
      coinMagnetPreviousCoinY: this.host.coinMagnetPreviousCoinY,
      wallet: this.host.wallet,
      automatedFeeRate: automatedCoinCollectFeeRate,
      canManuallyCollectTankCoins: () => this.canManuallyCollectTankCoins(),
      recordDailyQuestAction: (action) => this.host.recordDailyQuestAction(action),
      floatCoinClaimText: (value, coinType, x, y, color, automatedClaim, fee) => {
        this.host.floatCoinClaimText(value, coinType, x, y, color, automatedClaim, fee);
      },
      playManualCollect: (collectedCoin, claimedValue) => {
        this.host.playSfx(coinCollectSoundKey, { volume: 0.24, detune: this.coinCollectDetune(collectedCoin.coinType) });
        this.registerCoinCombo(
          collectedCoin.sprite.x,
          collectedCoin.sprite.y - 42,
          commonWealthValueForCoin(collectedCoin.coinType, claimedValue)
        );
      },
      setCoinDrops: (coinDrops) => {
        this.host.coinDrops = coinDrops;
      },
      refreshUi: () => this.host.refreshUi(false),
      saveNow: () => this.host.saveNow()
    });
  }

  public coinCollectDetune(coinType: CoinType): number {
    return coinCollectDetuneModel(coinType);
  }

  public updateCoinMagnet(): void {
    if (!this.hasCoinMagnet() || this.host.getModal() || this.host.coinDrops.length === 0) {
      for (const coin of this.host.coinDrops) {
        this.host.coinMagnetPreviousCoinY.set(coin, coin.sprite.y);
      }
      return;
    }

    const position = this.coinMagnetRayPoint();
    for (const coin of this.host.coinDrops) {
      const previousY = this.host.coinMagnetPreviousCoinY.get(coin) ?? coin.sprite.y;
      this.host.coinMagnetPreviousCoinY.set(coin, coin.sprite.y);
      if (this.host.magnetCollectingCoins.has(coin)) {
        continue;
      }
      if (previousY < position.y && coin.sprite.y >= position.y) {
        this.pullCoinToMagnet(coin, position.x, position.y);
      }
    }
  }

  public canManuallyCollectTankCoins(): boolean {
    return this.host.getActiveScreen() === "tank" && !this.host.getModal() && !this.host.getHtmlDockDragging();
  }

  public canManuallyCollectTankPresents(): boolean {
    return this.host.getActiveScreen() === "tank" && !this.host.getModal() && !this.host.getHtmlDockDragging();
  }

  public useCoinMagnetAtClientPoint(clientX: number, clientY: number, showEmptyMessage: boolean): void {
    const point = this.host.clientPointToDesignPoint(clientX, clientY);
    if (!point || !tankViewportBounds.contains(point.x, point.y)) {
      return;
    }

    const tankPoint = this.host.screenToTankPoint(point.x, point.y);
    this.useCoinMagnetAt(tankPoint.x, tankPoint.y, showEmptyMessage);
  }

  public useCoinMagnetAt(x: number, y: number, showEmptyMessage = true): void {
    if (!this.hasCoinMagnet()) {
      return;
    }

    const coinToCollect = this.host.coinDrops.find((coin) => !this.host.magnetCollectingCoins.has(coin) && coin.sprite.y >= y);
    if (coinToCollect) {
      this.pullCoinToMagnet(coinToCollect, x, y);
    } else if (showEmptyMessage) {
      this.host.floatTankText("No coins past line", x, y - 22, "#d7f4ff");
    }
  }

  public pullCoinToMagnet(coinToCollect: CoinDrop, x: number, y: number): void {
    if (!this.host.coinDrops.includes(coinToCollect) || this.host.magnetCollectingCoins.has(coinToCollect)) {
      return;
    }

    this.host.magnetCollectingCoins.add(coinToCollect);
    coinToCollect.hitZone.disableInteractive();
    coinToCollect.sprite.disableInteractive();
    this.host.scene.tweens.add({
      targets: [coinToCollect.sprite, coinToCollect.hitZone, coinToCollect.shimmer, coinToCollect.valueText],
      x,
      y,
      scale: coinMagnetAttractScale,
      duration: coinMagnetAttractDurationMs,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.host.magnetCollectingCoins.delete(coinToCollect);
        this.host.recordDailyQuestAction("magnet-coin");
        this.collectCoin(coinToCollect, false);
      }
    });
  }

  public coinMagnetTankPosition(): Phaser.Math.Vector2 {
    return new Phaser.Math.Vector2(
      tankBounds.left,
      Phaser.Math.Clamp(this.host.coinMagnetY, this.host.foodDispenserMinY(), this.host.foodDispenserMaxY())
    );
  }

  public coinMagnetRayY(): number {
    return this.coinMagnetRayPoint().y;
  }

  public coinMagnetRayPoint(): Phaser.Math.Vector2 {
    const icon = this.host.coinMagnetElement?.querySelector("img");
    const iconRect = icon?.getBoundingClientRect();
    const canvasRect = this.host.scene.game.canvas.getBoundingClientRect();
    if (iconRect && iconRect.width > 0 && iconRect.height > 0 && canvasRect.width > 0 && canvasRect.height > 0) {
      const rayClientX = iconRect.left + iconRect.width * 0.78;
      const rayClientY = iconRect.top + iconRect.height * 0.5;
      const designX = ((rayClientX - canvasRect.left) / canvasRect.width) * gameWidth;
      const designY = ((rayClientY - canvasRect.top) / canvasRect.height) * gameHeight;
      const tankPoint = this.host.screenToTankPoint(designX, designY);
      return new Phaser.Math.Vector2(
        Phaser.Math.Clamp(tankPoint.x, tankBounds.left, tankBounds.right),
        Phaser.Math.Clamp(tankPoint.y, this.host.foodDispenserMinY(), this.host.foodDispenserMaxY())
      );
    }

    const fallback = this.coinMagnetTankPosition();
    return new Phaser.Math.Vector2(
      fallback.x,
      Phaser.Math.Clamp(fallback.y + coinMagnetRayYOffset, this.host.foodDispenserMinY(), this.host.foodDispenserMaxY())
    );
  }

  public hasCoinMagnet(): boolean {
    return this.coinMagnetExpiresAt() > Date.now();
  }

  public coinMagnetExpiresAt(): number {
    return utilityExpiresAt(this.host.decorationInventory, coinMagnetInventoryKey);
  }

  public coinMagnetRemainingMinutes(): number {
    return activeUtilityRemainingMinutes(this.coinMagnetExpiresAt());
  }

  public registerCoinCombo(x: number, y: number, collectedCommonValue: number): void {
    const result = registerCoinComboModel({
      state: this.coinComboState(),
      now: this.host.scene.time.now,
      x,
      y,
      collectedCommonValue,
      maxCount: coinComboMaxCount
    });
    this.applyCoinComboState(result.state);
    if (result.state.count >= 2 && this.host.dailyQuestActionCount("coin-combo-2") <= 0) {
      this.host.recordDailyQuestAction("coin-combo-2");
    }
    if (result.state.count >= 10 && this.host.dailyQuestActionCount("coin-combo-10") <= 0) {
      this.host.recordDailyQuestAction("coin-combo-10");
    }
    if (result.state.count >= 20 && this.host.dailyQuestActionCount("coin-combo-20") <= 0) {
      this.host.recordDailyQuestAction("coin-combo-20");
    }
    if (result.state.count >= 30 && this.host.dailyQuestActionCount("coin-combo-30") <= 0) {
      this.host.recordDailyQuestAction("coin-combo-30");
    }

    if (result.showMessage) {
      this.showCoinComboOverlay(result.showMessage);
    }

    if (result.shouldResolve) {
      this.resolveCoinCombo();
    }
  }

  public resolveCoinCombo(): void {
    const { nextState, bonus, position } = resolveCoinComboModel({
      state: this.coinComboState(),
      wallet: this.host.wallet,
      rewardPercentPerCount: coinComboRewardPercentPerCount
    });
    this.applyCoinComboState(nextState);
    if (bonus <= 0) {
      return;
    }

    const leveledUp = this.host.addFishProductionTotal(this.host.getTankLevel(), bonus);
    this.showCoinComboOverlay(`COMBO BONUS C${formatNumber(bonus)}!`, true, coinComboRewardTextDurationMs);
    this.host.floatTankText(`COMBO BONUS C${formatNumber(bonus)}!`, position.x, position.y - 24, "#55ff8a");
    this.host.refreshUi(!leveledUp);
    this.host.saveNow();
  }

  public coinComboState(): CoinComboState {
    return {
      count: this.host.coinComboCount,
      collectedValue: this.host.coinComboCollectedValue,
      lastClaimedAt: this.host.coinComboLastClaimedAt,
      lastPosition: this.host.coinComboLastPosition
    };
  }

  public applyCoinComboState(state: CoinComboState): void {
    this.host.coinComboCount = state.count;
    this.host.coinComboCollectedValue = state.collectedValue;
    this.host.coinComboLastClaimedAt = state.lastClaimedAt;
    this.host.coinComboLastPosition = state.lastPosition;
  }

  public showCoinComboOverlay(message: string, bonus = false, durationMs?: number): void {
    this.host.coinComboOverlay ??= this.createCoinComboOverlay();
    this.host.coinComboOverlay.textContent = message;
    this.host.coinComboOverlay.classList.toggle("is-bonus", bonus);
    this.host.coinComboOverlay.style.animationDuration = durationMs ? `${durationMs}ms` : "";
    this.host.coinComboOverlay.classList.remove("is-showing");
    this.host.coinComboOverlay.getBoundingClientRect();
    this.host.coinComboOverlay.classList.add("is-showing");
  }

  public createCoinComboOverlay(): HTMLDivElement {
    const overlay = document.createElement("div");
    overlay.className = "aq-coin-combo";
    overlay.setAttribute("aria-live", "polite");
    document.body.appendChild(overlay);
    return overlay;
  }

  public createQuestPresentDrop(
    questId: string,
    reward: DailyQuestReward,
    rewardLabel = this.host.dailyQuestRewardLabel(reward),
    options: QuestPresentDropOptions & { id?: string; x?: number; y?: number } = {}
  ): QuestPresentDrop {
    const visibleBounds = tankViewportBounds;
    const horizontalPadding = 38 / Math.max(0.01, this.host.tankViewScaleForLevel());
    const minVisibleX = Math.max(tankBounds.left + horizontalPadding, visibleBounds.left + horizontalPadding);
    const maxVisibleX = Math.min(tankBounds.right - horizontalPadding, visibleBounds.right - horizontalPadding);
    const fallbackX = Phaser.Math.Clamp(visibleBounds.centerX || tankBounds.centerX, tankBounds.left + horizontalPadding, tankBounds.right - horizontalPadding);
    const clampedVisibleX = (targetX: number) => (minVisibleX <= maxVisibleX ? Phaser.Math.Clamp(targetX, minVisibleX, maxVisibleX) : fallbackX);
    const maxBottomY = this.visibleCoinBottomDesignY();
    const bottomBand = Math.round(gameWidth * 0.08);
    const randomX = minVisibleX <= maxVisibleX
      ? Phaser.Math.Between(Math.round(minVisibleX), Math.round(maxVisibleX))
      : fallbackX;
    const x = clampedVisibleX(options.x ?? randomX);
    const y = Phaser.Math.Clamp(options.y ?? tankViewportBounds.top + 36, visibleBounds.top + 24, maxBottomY);
    const landingX = clampedVisibleX(options.landingX ?? x);
    const bottomY = Phaser.Math.Clamp(
      options.bottomY ?? Phaser.Math.Between(Math.round(maxBottomY - bottomBand), Math.round(maxBottomY)),
      tankBounds.top + 80,
      maxBottomY
    );
    const drop = new QuestPresentDrop(
      this.host.scene,
      x,
      y,
      options.id ?? `quest-present:${questId}:${Date.now()}:${Phaser.Math.Between(1000, 9999)}`,
      questId,
      rewardLabel,
      { ...options, landingX, bottomY }
    );
    drop.setWorldScaleCompensation(this.host.tankViewScaleForLevel());
    drop.addToContainer(this.host.tankLayer);
    const collect = (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.collectQuestPresent(drop);
    };
    drop.hitZone.on("pointerdown", collect);
    drop.sprite.on("pointerdown", collect);
    this.host.questPresents.push({ drop, reward });
    this.syncQuestPresentVisibilityAndInput();
    return drop;
  }

  public collectQuestPresent(drop: QuestPresentDrop): void {
    if (!this.canManuallyCollectTankPresents()) {
      return;
    }
    const present = this.host.questPresents.find((candidate) => candidate.drop === drop);
    if (!present) {
      return;
    }

    if (present.reward.kind === "coins") {
      this.claimQuestPresentReward(present.drop, "combo");
      return;
    }

    this.showQuestPresentModal(present);
  }

  public showQuestPresentModal(present: { drop: QuestPresentDrop; reward: DailyQuestReward }): void {
    this.host.showPrizeCelebration(
      "Present Prize!",
      this.host.questRewardImageUrl(present.reward),
      present.drop.rewardLabel,
      "Claim",
      () => this.claimQuestPresentReward(present.drop)
    );
  }

  public claimQuestPresentReward(drop: QuestPresentDrop, display: "modal" | "combo" = "modal"): void {
    const present = this.host.questPresents.find((candidate) => candidate.drop === drop);
    if (!present) {
      return;
    }

    this.host.grantDailyQuestReward(present.reward);
    this.host.playSfx(prizeRewardSoundKey, { volume: 0.2 });
    if (display === "combo") {
      this.showCoinComboOverlay(`QUEST PRIZE +${present.drop.rewardLabel}!`, true, coinComboRewardTextDurationMs);
    } else {
      this.host.floatText(`+${present.drop.rewardLabel} quest`, present.drop.sprite.x, present.drop.sprite.y - 24, "#ffe67a");
    }
    present.drop.destroy();
    this.host.questPresents = this.host.questPresents.filter((candidate) => candidate !== present);
    this.host.refreshUi();
    this.host.createFoodDock();
    this.host.saveNow();
  }

  public setQuestPresentVisible(present: QuestPresentDrop, visible: boolean): void {
    present.sprite.setVisible(visible);
    present.hitZone.setVisible(visible);
    present.labelText.setVisible(visible);
    if (visible && this.canManuallyCollectTankPresents()) {
      present.hitZone.setInteractive({ useHandCursor: true });
      present.sprite.setInteractive({ useHandCursor: true });
    } else {
      present.hitZone.disableInteractive();
      present.sprite.disableInteractive();
    }
  }

  public syncQuestPresentVisibilityAndInput(): void {
    const visible = this.host.getActiveScreen() === "tank";
    for (const present of this.host.questPresents) {
      this.setQuestPresentVisible(present.drop, visible);
    }
  }

  public tankHudSnapshotText(): string {
    return `C:${formatNumber(this.host.wallet.common)}   R:${formatNumber(this.host.wallet.rare)}   SR:${formatNumber(this.host.wallet.superRare)}   W:${formatNumber(this.host.calculateTankNetWorth())}`;
  }

  public tankStatusSnapshotText(): string {
    return `${this.host.getTankName(this.host.getTankLevel())} Lv${formatNumber(this.host.tankDisplayLevel())}`;
  }

  public tankCareSnapshotText(): string {
    const counts = this.host.activeFish().reduce(
      (summary, currentFish) => {
        summary[currentFish.state] += 1;
        return summary;
      },
      { happy: 0, hungry: 0, ill: 0 } as Record<FishState, number>
    );
    const needLabel = this.host.activeFish().length > 0
      ? `${this.host.getHudNeedLabel()}   H${formatNumber(counts.happy)} Hu${formatNumber(counts.hungry)} I${formatNumber(counts.ill)}`
      : this.host.getHudNeedLabel();
    return `${this.getCareStatusLabel()} | ${needLabel}`;
  }

  public getCareStatusLabel(): string {
    const boostLabel = this.host.timeCurrentRemainingSeconds() > 0
      ? `   Current x${formatNumber(timeCurrentSpeedMultiplier)} ${compactDurationLabelModel(this.host.timeCurrentRemainingSeconds(), formatNumber)}`
      : "";
    return `Food ${formatNumber(this.host.getTotalFoodInventory())}   Clean ${formatNumber(Math.round(this.host.getCleanliness()))}%   Happy ${formatNumber(Math.round(this.host.calculateTankHappiness()))}%${boostLabel}`;
  }

  public destroy(): void {
    this.host.coinComboOverlay?.remove();
    this.host.coinComboOverlay = undefined;
    this.host.questPresents.forEach((present) => present.drop.destroy());
    this.host.questPresents = [];
  }
}
