import { formatNumber, priceComponents } from "../game/economy";
import { htmlElement, htmlImage } from "./dom";
import type { CoinType, Price, Wallet } from "../types/mechanics";

export function createCostChip(coinAssetPathByType: Record<CoinType, string>, coinType: CoinType, amount: number): HTMLElement {
  return htmlElement("span", "aq-makeup-cost-chip", [
    htmlImage(coinAssetPathByType[coinType], coinType, "aq-makeup-cost-icon"),
    htmlElement("strong", "", [formatNumber(amount)])
  ]);
}

export function createMakeupCostElement(input: {
  price: Price;
  priceWealth: (price: Price) => number;
  coinAssetPathByType: Record<CoinType, string>;
}): HTMLElement {
  if (input.priceWealth(input.price) <= 0) {
    return htmlElement("div", "aq-makeup-cost", ["Free"]);
  }

  const row = htmlElement("div", "aq-makeup-cost aq-makeup-cost-icons", [htmlElement("span", "", ["Price"])]);
  for (const [coinType, amount] of priceComponents(input.price)) {
    row.append(createCostChip(input.coinAssetPathByType, coinType, amount));
  }
  return row;
}

export function createPriceIconRow(input: {
  price: Price;
  label?: string;
  priceWealth: (price: Price) => number;
  coinAssetPathByType: Record<CoinType, string>;
}): HTMLElement {
  const label = input.label ?? "Price";
  if (input.priceWealth(input.price) <= 0) {
    return htmlElement("p", "aq-modal-line", [`${label}: Free`]);
  }

  const row = htmlElement("p", "aq-modal-line aq-modal-price-line", [htmlElement("span", "", [`${label}:`])]);
  for (const [coinType, amount] of priceComponents(input.price)) {
    row.append(createCostChip(input.coinAssetPathByType, coinType, amount));
  }
  return row;
}

export function createCommonCoinValueRow(input: {
  label: string;
  amount: number;
  commonCoinAssetPath: string;
}): HTMLElement {
  return htmlElement("p", "aq-modal-line aq-modal-price-line aq-sell-qty-total", [
    htmlElement("span", "", [input.label]),
    htmlElement("span", "aq-makeup-cost-chip", [
      htmlImage(input.commonCoinAssetPath, "Common coins", "aq-makeup-cost-icon"),
      htmlElement("strong", "", [formatNumber(input.amount)])
    ])
  ]);
}

export function createWalletIconRow(input: {
  label: string;
  wallet: Wallet;
  coinAssetPathByType: Record<CoinType, string>;
}): HTMLElement {
  const row = htmlElement("p", "aq-modal-line aq-modal-price-line aq-sell-qty-total", [
    htmlElement("span", "", [input.label])
  ]);
  const entries = (Object.entries(input.wallet) as Array<[CoinType, number]>).filter(([, amount]) => amount > 0);
  const visibleEntries = entries.length > 0 ? entries : [["common", 0] as [CoinType, number]];
  for (const [coinType, amount] of visibleEntries) {
    row.append(createCostChip(input.coinAssetPathByType, coinType, amount));
  }
  return row;
}
