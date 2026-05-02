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

export function formatWallet(wallet: Wallet): string {
  return `C:${wallet.common}  R:${wallet.rare}  SR:${wallet.superRare}`;
}

export function formatPrice(price: Price): string {
  const labelByCoin: Record<CoinType, string> = {
    common: "C",
    rare: "R",
    superRare: "SR"
  };

  return `${labelByCoin[price.coinType]}${price.amount}`;
}

