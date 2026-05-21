import Phaser from "phaser";
import { CoinDrop } from "../objects/CoinDrop";
import type { Fish } from "../objects/Fish";
import type { CoinType, Wallet } from "../types/mechanics";
import { earn } from "./economy";
import { coinWealthValue } from "./economy-values";

export type CoinDropOptions = { landingX?: number; bottomY?: number; sinkSpeed?: number };

export type CoinComboState = {
  count: number;
  collectedValue: number;
  lastClaimedAt: number;
  lastPosition: Phaser.Math.Vector2;
};

export function updateFishCoinProduction(input: {
  fish: Fish;
  now: number;
  coinDropCount: number;
  maxCoinDrops: number;
  minDelayMs: number;
  maxDelayMs: number;
  activeProductionPaceMultiplier: number;
  minimumCoinDropValue?: number;
  randomBetween: (min: number, max: number) => number;
  addFishProductionTotal: (tankLevel: number, value: number) => boolean;
  createCoinDrop: (x: number, y: number, value: number, coinType: CoinType, isMega: boolean, options?: CoinDropOptions) => void;
}): void {
  const { fish, now } = input;
  const minimumCoinDropValue = Math.max(0, input.minimumCoinDropValue ?? 0);
  if (!fish.canDropCoin(now)) {
    if (fish.nextCoinDropAt > 0 && now >= fish.nextCoinDropAt) {
      fish.postponeCoinProduction(now, input.randomBetween(input.minDelayMs, input.maxDelayMs));
    }
    return;
  }

  if (input.coinDropCount >= input.maxCoinDrops && !fish.hasActiveProductionBoost(now)) {
    const cappedValue = fish.takeCoinProductionDrop(now, input.activeProductionPaceMultiplier);
    if (cappedValue > 0) {
      input.addFishProductionTotal(fish.tankLevel, cappedValue);
    }
    return;
  }

  const value = Math.max(
    fish.takeCoinProductionDrop(now, input.activeProductionPaceMultiplier),
    minimumCoinDropValue
  );
  if (value <= 0) {
    return;
  }

  const leveledUp = input.addFishProductionTotal(fish.tankLevel, value);
  if (leveledUp && minimumCoinDropValue <= 0) {
    return;
  }

  const boostedDrop = fish.hasActiveProductionBoost(now);
  const dropX = fish.sprite.x + (boostedDrop ? 0 : input.randomBetween(-18, 18));
  input.createCoinDrop(
    dropX,
    fish.sprite.y + input.randomBetween(-28, -14),
    value,
    "common",
    false,
    boostedDrop ? { landingX: dropX } : {}
  );
}

export function createCoinDrop(input: {
  scene: Phaser.Scene;
  x: number;
  y: number;
  value: number;
  coinType: CoinType;
  isMega: boolean;
  options?: CoinDropOptions;
  tankViewScale: number;
  tankLayer: Phaser.GameObjects.Container;
  coinDrops: CoinDrop[];
  coinMagnetPreviousCoinY: Map<CoinDrop, number>;
  visible: boolean;
  canManuallyCollectTankCoins: () => boolean;
  collectCoin: (coin: CoinDrop, automated: boolean) => void;
  setCoinDropVisible: (coin: CoinDrop, visible: boolean) => void;
}): CoinDrop {
  const coin = new CoinDrop(input.scene, input.x, input.y, input.value, input.coinType, input.isMega, input.options ?? {});
  coin.setWorldScaleCompensation(input.tankViewScale);
  coin.addToContainer(input.tankLayer);
  const collect = (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
    event.stopPropagation();
    if (!input.canManuallyCollectTankCoins()) {
      return;
    }
    input.collectCoin(coin, false);
  };
  coin.hitZone.on("pointerdown", collect);
  coin.sprite.on("pointerdown", collect);
  input.coinDrops.push(coin);
  input.coinMagnetPreviousCoinY.set(coin, coin.sprite.y);
  input.setCoinDropVisible(coin, input.visible);
  return coin;
}

export function collectCoin(input: {
  coin: CoinDrop;
  automated: boolean;
  coinDrops: CoinDrop[];
  coinMagnetPreviousCoinY: Map<CoinDrop, number>;
  wallet: Wallet;
  automatedFeeRate: number;
  canManuallyCollectTankCoins: () => boolean;
  recordDailyQuestAction: (action: string) => void;
  floatCoinClaimText: (value: number, coinType: CoinType, x: number, y: number, color: string, automated: boolean, fee?: number) => void;
  playManualCollect: (coin: CoinDrop, claimedValue: number) => void;
  setCoinDrops: (coinDrops: CoinDrop[]) => void;
  refreshUi: () => void;
  saveNow: () => void;
}): void {
  if (!input.coinDrops.includes(input.coin)) {
    return;
  }
  if (!input.automated && !input.canManuallyCollectTankCoins()) {
    return;
  }

  const fee = input.automated ? Math.floor(input.coin.value * input.automatedFeeRate) : 0;
  const claimedValue = Math.max(0, input.coin.value - fee);
  earn(input.wallet, input.coin.coinType, claimedValue);
  if (!input.automated) {
    input.recordDailyQuestAction("coin");
  }
  input.floatCoinClaimText(
    claimedValue,
    input.coin.coinType,
    input.coin.sprite.x,
    input.coin.sprite.y - 20,
    input.coin.visual.textColor,
    input.automated,
    fee
  );
  if (!input.automated) {
    input.playManualCollect(input.coin, claimedValue);
  }
  input.setCoinDrops(input.coinDrops.filter((drop) => drop !== input.coin));
  input.coinMagnetPreviousCoinY.delete(input.coin);
  input.coin.destroy();
  input.refreshUi();
  input.saveNow();
}

export function coinCollectDetune(coinType: CoinType): number {
  if (coinType === "rare") {
    return 220;
  }
  if (coinType === "superRare") {
    return 440;
  }
  return 120;
}

export function registerCoinCombo(input: {
  state: CoinComboState;
  now: number;
  x: number;
  y: number;
  collectedCommonValue: number;
  maxCount: number;
}): { state: CoinComboState; showMessage?: string; shouldResolve: boolean } {
  const count = Math.min(input.maxCount, input.state.count + 1);
  const state = {
    count,
    collectedValue: input.state.collectedValue + Math.max(0, input.collectedCommonValue),
    lastClaimedAt: input.now,
    lastPosition: input.state.lastPosition.set(input.x, input.y)
  };

  return {
    state,
    showMessage: count >= 2 ? `${count}x COMBO` : undefined,
    shouldResolve: count >= input.maxCount
  };
}

export function resolveCoinCombo(input: {
  state: CoinComboState;
  wallet: Wallet;
  rewardPercentPerCount: number;
}): { nextState: CoinComboState; bonus: number; position: Phaser.Math.Vector2 } {
  const comboCount = input.state.count;
  const collectedValue = input.state.collectedValue;
  const position = input.state.lastPosition.clone();
  const nextState = {
    count: 0,
    collectedValue: 0,
    lastClaimedAt: 0,
    lastPosition: input.state.lastPosition
  };

  const bonusPercent = comboCount * input.rewardPercentPerCount;
  const bonus = Math.floor(collectedValue * (bonusPercent / 100));
  if (bonus > 0) {
    earn(input.wallet, "common", bonus);
  }

  return { nextState, bonus, position };
}

export function commonWealthValueForCoin(coinType: CoinType, value: number): number {
  return value * coinWealthValue[coinType];
}
