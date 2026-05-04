import type { CoinType, Price, Wallet } from "../types/mechanics";

export function createWallet(common = 0, rare = 0, superRare = 0): Wallet {
  return { common, rare, superRare };
}

export function canAfford(wallet: Wallet, price: Price): boolean {
  return wallet[price.coinType] >= price.amount;
}

export function spend(wallet: Wallet, price: Price): boolean {
  if (!canAfford(wallet, price)) {
    return false;
  }

  wallet[price.coinType] -= price.amount;
  return true;
}

export function earn(wallet: Wallet, coinType: CoinType, amount: number): void {
  wallet[coinType] += amount;
}

export function formatNumber(value: number): string {
  const sign = value < 0 ? "-" : "";
  const absoluteValue = Math.abs(value);
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

  return `${labelByCoin[price.coinType]}${formatNumber(price.amount)}`;
}

export function formatPriceLong(price: Price): string {
  const labelByCoin: Record<CoinType, string> = {
    common: "Common",
    rare: "Rare",
    superRare: "Super Rare"
  };

  return `${formatNumber(price.amount)} ${labelByCoin[price.coinType]}`;
}
