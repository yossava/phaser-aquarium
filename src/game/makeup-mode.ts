import type Phaser from "phaser";
import { createEmptyWallet } from "./save";
import type { DecorationSize, TankCosmetic } from "./tank-catalog";
import type { CoinType, DecorationType, Price, Wallet } from "../types/mechanics";

export type MakeupSection = "background" | "seabed" | "decor";

export type MakeupDecorationDraft = {
  typeId: string;
  originalTypeId?: string;
  originalSize?: DecorationSize;
  size: DecorationSize;
  x: number;
  y: number;
  depth: number;
  image: Phaser.GameObjects.Image;
};

export type MakeupDraft = {
  section?: MakeupSection;
  backgroundIndex: number;
  seabedIndex: number;
  backgroundTintById: Map<string, number>;
  seabedTintById: Map<string, number>;
  selectedDecorationTypeIndex: number;
  selectedSize: DecorationSize;
  selectedDecorationIndex?: number;
  decorations: MakeupDecorationDraft[];
};

export type MakeupDecorationCostEntry = {
  line: string;
  price: Price;
  count: number;
};

export function makeupDecorationDisplayDepth(index: number): number {
  return 11 + index * 0.05;
}

export function priceComponentAmount(price: Price, coinType: CoinType): number {
  if (price.coinType === coinType) {
    return price.amount;
  }
  if (coinType === "rare") {
    return price.rareAmount ?? 0;
  }
  if (coinType === "superRare") {
    return price.superRareAmount ?? 0;
  }
  return 0;
}

export function addPriceToWallet(total: Wallet, price: Price, multiplier = 1): void {
  for (const [coinType, amount] of priceComponents(price)) {
    total[coinType] += Math.max(0, Math.floor(amount * multiplier));
  }
}

export function walletToPrice(wallet: Wallet): Price {
  return {
    coinType: "common",
    amount: Math.max(0, Math.floor(wallet.common)),
    rareAmount: wallet.rare > 0 ? Math.max(0, Math.floor(wallet.rare)) : undefined,
    superRareAmount: wallet.superRare > 0 ? Math.max(0, Math.floor(wallet.superRare)) : undefined
  };
}

export function decorationSizeUpgradePrice(input: {
  decorationType: DecorationType;
  fromSize: DecorationSize;
  toSize: DecorationSize;
  decorationVariantPrice: (decorationType: DecorationType, size: DecorationSize) => Price;
}): Price {
  const fromPrice = input.decorationVariantPrice(input.decorationType, input.fromSize);
  const toPrice = input.decorationVariantPrice(input.decorationType, input.toSize);
  const total = createEmptyWallet();
  for (const coinType of ["common", "rare", "superRare"] as const) {
    const fromAmount = priceComponentAmount(fromPrice, coinType);
    const toAmount = priceComponentAmount(toPrice, coinType);
    total[coinType] = Math.max(0, toAmount - fromAmount);
  }
  return walletToPrice(total);
}

export function makeupDecorationCostEntries(input: {
  draft: MakeupDraft | undefined;
  decorationTypes: DecorationType[];
  decorationSizeLabel: (size: DecorationSize) => string;
  decorationInventoryKey: (decorationTypeId: string, size: DecorationSize) => string;
  getDecorationInventory: (decorationTypeId: string, size: DecorationSize) => number;
  decorationVariantPrice: (decorationType: DecorationType, size: DecorationSize) => Price;
  priceWealth: (price: Price) => number;
  formatNumber: (value: number) => string;
}): MakeupDecorationCostEntry[] {
  if (!input.draft) {
    return [];
  }

  const entries: MakeupDecorationCostEntry[] = [];
  const newDecorationCounts = new Map<string, { type: DecorationType; size: DecorationSize; count: number }>();
  for (const decoration of input.draft.decorations) {
    const decorationType = input.decorationTypes.find((item) => item.id === decoration.typeId);
    if (!decorationType) {
      continue;
    }

    if (decoration.originalTypeId === decoration.typeId && decoration.originalSize) {
      const upgradePrice = decorationSizeUpgradePrice({
        decorationType,
        fromSize: decoration.originalSize,
        toSize: decoration.size,
        decorationVariantPrice: input.decorationVariantPrice
      });
      if (input.priceWealth(upgradePrice) > 0) {
        entries.push({
          line: `Decor upgrade: ${decorationType.name} ${input.decorationSizeLabel(decoration.originalSize)} -> ${input.decorationSizeLabel(decoration.size)}`,
          price: upgradePrice,
          count: 1
        });
      }
      continue;
    }

    const key = input.decorationInventoryKey(decoration.typeId, decoration.size);
    const current = newDecorationCounts.get(key) ?? { type: decorationType, size: decoration.size, count: 0 };
    current.count += 1;
    newDecorationCounts.set(key, current);
  }

  for (const entry of newDecorationCounts.values()) {
    const storedCount = input.getDecorationInventory(entry.type.id, entry.size);
    const purchaseCount = Math.max(0, entry.count - storedCount);
    if (purchaseCount > 0) {
      entries.push({
        line: `Decor: ${entry.type.name} ${input.decorationSizeLabel(entry.size)} x${input.formatNumber(purchaseCount)}`,
        price: input.decorationVariantPrice(entry.type, entry.size),
        count: purchaseCount
      });
    }
  }

  return entries;
}

export function makeupTotalCost(input: {
  draft: MakeupDraft | undefined;
  background: TankCosmetic;
  seabed: TankCosmetic;
  ownsTankCosmetic: (asset: TankCosmetic) => boolean;
  decorationCostEntries: MakeupDecorationCostEntry[];
}): Price {
  if (!input.draft) {
    return { coinType: "common", amount: 0 };
  }

  const total = createEmptyWallet();
  if (!input.ownsTankCosmetic(input.background)) {
    addPriceToWallet(total, input.background.price);
  }
  if (!input.ownsTankCosmetic(input.seabed)) {
    addPriceToWallet(total, input.seabed.price);
  }

  for (const entry of input.decorationCostEntries) {
    addPriceToWallet(total, entry.price, entry.count);
  }

  return walletToPrice(total);
}

export function makeupPurchaseLines(input: {
  draft: MakeupDraft | undefined;
  background: TankCosmetic;
  seabed: TankCosmetic;
  ownsTankCosmetic: (asset: TankCosmetic) => boolean;
  decorationCostEntries: MakeupDecorationCostEntry[];
}): string[] {
  if (!input.draft) {
    return [];
  }

  const purchases: string[] = [];
  if (!input.ownsTankCosmetic(input.background)) {
    purchases.push(`Background: ${input.background.name}`);
  }
  if (!input.ownsTankCosmetic(input.seabed)) {
    purchases.push(`Bed: ${input.seabed.name}`);
  }

  purchases.push(...input.decorationCostEntries.map((entry) => entry.line));
  return purchases;
}

function priceComponents(price: Price): Array<[CoinType, number]> {
  const merged: Wallet = createEmptyWallet();
  merged[price.coinType] += Math.max(0, Math.floor(price.amount));
  merged.rare += Math.max(0, Math.floor(price.rareAmount ?? 0));
  merged.superRare += Math.max(0, Math.floor(price.superRareAmount ?? 0));
  return (Object.entries(merged) as Array<[CoinType, number]>).filter(([, amount]) => amount > 0);
}
