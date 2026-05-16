import type { CoinType, Price, Wallet } from "../types/mechanics";

export function createWallet(common = 0, rare = 0, superRare = 0): Wallet {
  return { common, rare, superRare };
}

export function canAfford(wallet: Wallet, price: Price): boolean {
  return priceComponents(price).every(([coinType, amount]) => wallet[coinType] >= amount);
}

export function spend(wallet: Wallet, price: Price): boolean {
  if (!canAfford(wallet, price)) {
    return false;
  }

  for (const [coinType, amount] of priceComponents(price)) {
    wallet[coinType] -= amount;
  }
  return true;
}

export function earn(wallet: Wallet, coinType: CoinType, amount: number): void {
  wallet[coinType] += amount;
}

export function formatNumber(value: number): string {
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);
  const hasFraction = Math.abs(absoluteValue - Math.round(absoluteValue)) > 0.001;
  const suffixes = [
    { value: 1_000_000_000_000, label: "T" },
    { value: 1_000_000_000, label: "B" },
    { value: 1_000_000, label: "M" },
    { value: 1_000, label: "K" }
  ];

  for (const suffix of suffixes) {
    if (absoluteValue >= suffix.value) {
      return `${sign}${(absoluteValue / suffix.value).toFixed(1)}${suffix.label}`;
    }
  }

  if (absoluteValue > 0 && absoluteValue < 100 && hasFraction) {
    return `${sign}${absoluteValue.toFixed(1).replace(/\.0$/, "")}`;
  }

  return `${sign}${Math.round(absoluteValue)}`;
}

export function formatWallet(wallet: Wallet): string {
  return `C:${formatNumber(wallet.common)}  R:${formatNumber(wallet.rare)}  SR:${formatNumber(wallet.superRare)}`;
}

export function formatPrice(price: Price): string {
  const labelByCoin: Record<CoinType, string> = {
    common: "C",
    rare: "R",
    superRare: "SR"
  };

  return priceComponents(price)
    .map(([coinType, amount]) => `${labelByCoin[coinType]}${formatNumber(amount)}`)
    .join(" + ");
}

export function formatPriceLong(price: Price): string {
  const labelByCoin: Record<CoinType, string> = {
    common: "Common",
    rare: "Rare",
    superRare: "Super Rare"
  };

  return priceComponents(price)
    .map(([coinType, amount]) => `${formatNumber(amount)} ${labelByCoin[coinType]}`)
    .join(" + ");
}

export function priceComponents(price: Price): Array<[CoinType, number]> {
  const merged: Wallet = createWallet();
  merged[price.coinType] += Math.max(0, Math.floor(price.amount));
  merged.rare += Math.max(0, Math.floor(price.rareAmount ?? 0));
  merged.superRare += Math.max(0, Math.floor(price.superRareAmount ?? 0));
  return (Object.entries(merged) as Array<[CoinType, number]>).filter(([, amount]) => amount > 0);
}
