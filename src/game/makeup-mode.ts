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

export function createMakeupDraft(input: {
  backgroundIndex: number;
  seabedIndex: number;
  backgroundTintById: Map<string, number>;
  seabedTintById: Map<string, number>;
}): MakeupDraft {
  return {
    section: undefined,
    backgroundIndex: Math.max(0, input.backgroundIndex),
    seabedIndex: Math.max(0, input.seabedIndex),
    backgroundTintById: new Map(input.backgroundTintById),
    seabedTintById: new Map(input.seabedTintById),
    selectedDecorationTypeIndex: 0,
    selectedSize: "m",
    decorations: []
  };
}

export function makeupSelectedCosmetic(
  draft: MakeupDraft | undefined,
  category: "background" | "seabed",
  cosmetics: TankCosmetic[]
): TankCosmetic {
  const index = category === "background" ? draft?.backgroundIndex ?? 0 : draft?.seabedIndex ?? 0;
  return cosmetics[index] ?? cosmetics[0]!;
}

export function setMakeupSection(draft: MakeupDraft | undefined, section: MakeupSection | undefined): boolean {
  if (!draft) {
    return false;
  }
  draft.section = section;
  return true;
}

export function setMakeupCosmeticIndex(input: {
  draft: MakeupDraft | undefined;
  category: "background" | "seabed";
  index: number;
  cosmetics: TankCosmetic[];
}): boolean {
  if (!input.draft || !input.cosmetics[input.index]) {
    return false;
  }
  if (input.category === "background") {
    input.draft.backgroundIndex = input.index;
  } else {
    input.draft.seabedIndex = input.index;
  }
  return true;
}

export function cycleMakeupCosmetic(input: {
  draft: MakeupDraft | undefined;
  category: "background" | "seabed";
  direction: number;
  cosmetics: TankCosmetic[];
}): boolean {
  if (!input.draft || input.cosmetics.length === 0) {
    return false;
  }
  const current = input.category === "background" ? input.draft.backgroundIndex : input.draft.seabedIndex;
  const next = (current + input.direction + input.cosmetics.length) % input.cosmetics.length;
  return setMakeupCosmeticIndex({ ...input, index: next });
}

export function setMakeupBlueTint(input: {
  draft: MakeupDraft | undefined;
  category: "background" | "seabed";
  selectedAssetId: string;
  intensity: number;
}): boolean {
  if (!input.draft) {
    return false;
  }
  const normalizedIntensity = Math.round(Math.max(0, Math.min(100, input.intensity)));
  const tintMap = input.category === "background" ? input.draft.backgroundTintById : input.draft.seabedTintById;
  if (normalizedIntensity > 0) {
    tintMap.set(input.selectedAssetId, normalizedIntensity);
  } else {
    tintMap.delete(input.selectedAssetId);
  }
  return true;
}

export function cycleMakeupDecorationType(input: {
  draft: MakeupDraft | undefined;
  direction: number;
  decorationTypeCount: number;
}): boolean {
  if (!input.draft || input.decorationTypeCount <= 0) {
    return false;
  }
  input.draft.selectedDecorationTypeIndex = (
    input.draft.selectedDecorationTypeIndex +
    input.direction +
    input.decorationTypeCount
  ) % input.decorationTypeCount;
  return true;
}

export function setMakeupDecorationTypeIndex(input: {
  draft: MakeupDraft | undefined;
  index: number;
  decorationTypeCount: number;
}): boolean {
  if (!input.draft || input.index < 0 || input.index >= input.decorationTypeCount) {
    return false;
  }
  input.draft.selectedDecorationTypeIndex = input.index;
  return true;
}

export function selectedMakeupDecoration(draft: MakeupDraft | undefined): MakeupDecorationDraft | undefined {
  return draft?.selectedDecorationIndex !== undefined ? draft.decorations[draft.selectedDecorationIndex] : undefined;
}

export function clearSelectedMakeupDecoration(draft: MakeupDraft | undefined): boolean {
  if (!draft || draft.selectedDecorationIndex === undefined) {
    return false;
  }
  draft.selectedDecorationIndex = undefined;
  return true;
}

export function setMakeupDecorationSize(input: {
  draft: MakeupDraft | undefined;
  size: DecorationSize;
}): MakeupDecorationDraft | undefined {
  if (!input.draft) {
    return undefined;
  }
  input.draft.selectedSize = input.size;
  const selectedDecoration = selectedMakeupDecoration(input.draft);
  if (selectedDecoration) {
    selectedDecoration.size = input.size;
  }
  return selectedDecoration;
}

export function selectMakeupDecoration(input: {
  draft: MakeupDraft | undefined;
  decoration: MakeupDecorationDraft;
}): boolean {
  if (!input.draft) {
    return false;
  }
  const index = input.draft.decorations.indexOf(input.decoration);
  if (index < 0) {
    return false;
  }
  input.draft.section = "decor";
  input.draft.selectedDecorationIndex = index;
  input.draft.selectedSize = input.decoration.size;
  return true;
}

export function moveMakeupDecoration(input: {
  decoration: MakeupDecorationDraft | undefined;
  x: number;
  y: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}): boolean {
  if (!input.decoration) {
    return false;
  }
  input.decoration.x = Math.max(input.minX, Math.min(input.maxX, input.x));
  input.decoration.y = Math.max(input.minY, Math.min(input.maxY, input.y));
  input.decoration.image.setPosition(input.decoration.x, input.decoration.y);
  return true;
}

export function makeupDecorationAtPoint(input: {
  draft: MakeupDraft | undefined;
  tankX: number;
  tankY: number;
}): MakeupDecorationDraft | undefined {
  if (input.draft?.section !== "decor") {
    return undefined;
  }
  return input.draft.decorations
    .filter((decoration) => {
      const radiusX = Math.max(34, decoration.image.displayWidth * 0.58);
      const radiusY = Math.max(34, decoration.image.displayHeight * 0.58);
      return Math.abs(input.tankX - decoration.x) <= radiusX && Math.abs(input.tankY - decoration.y) <= radiusY;
    })
    .sort((first, second) => second.depth - first.depth || second.y - first.y)[0];
}

export function moveSelectedMakeupDecorationDepth(input: {
  draft: MakeupDraft | undefined;
  direction: number;
}): boolean {
  if (!input.draft || input.draft.selectedDecorationIndex === undefined) {
    return false;
  }
  const currentIndex = input.draft.selectedDecorationIndex;
  const nextIndex = Math.max(0, Math.min(input.draft.decorations.length - 1, currentIndex + input.direction));
  if (nextIndex === currentIndex) {
    return false;
  }
  const [decoration] = input.draft.decorations.splice(currentIndex, 1);
  if (!decoration) {
    return false;
  }
  input.draft.decorations.splice(nextIndex, 0, decoration);
  input.draft.selectedDecorationIndex = nextIndex;
  return true;
}

export function syncMakeupDecorationDepths(input: {
  draft: MakeupDraft | undefined;
  draggedDecoration?: MakeupDecorationDraft;
  bringToTop: (image: Phaser.GameObjects.Image) => void;
}): void {
  input.draft?.decorations.forEach((decoration, index) => {
    decoration.depth = index;
    if (decoration !== input.draggedDecoration) {
      decoration.image.setDepth(makeupDecorationDisplayDepth(index));
    }
    input.bringToTop(decoration.image);
  });
}

export function removeSelectedMakeupDecoration(draft: MakeupDraft | undefined): MakeupDecorationDraft | undefined {
  if (!draft || draft.selectedDecorationIndex === undefined) {
    return undefined;
  }
  const [removed] = draft.decorations.splice(draft.selectedDecorationIndex, 1);
  draft.selectedDecorationIndex = undefined;
  return removed;
}

export function destroyMakeupDraft(draft: MakeupDraft | undefined): void {
  for (const decoration of draft?.decorations ?? []) {
    decoration.image.destroy();
  }
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
