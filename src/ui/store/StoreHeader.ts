import { formatNumber } from "../../game/economy";
import type { CoinType, Wallet } from "../../types/mechanics";
import { createHtmlButton, htmlElement, htmlImage } from "../dom";

export type StoreHeaderState = {
  wallet: Wallet;
  wealth: number;
  activeTankName: string;
  activeTankLevel: number;
  fishCount: number;
  fishCapacity: number;
};

export function createStoreHeader(state: StoreHeaderState, onClose: () => void): HTMLElement {
  const header = htmlElement("header", "aq-panel mb-1.5 shrink-0 p-2");
  const top = htmlElement("div", "flex items-start gap-2");
  top.append(
    htmlImage("/assets/ui/shop/store_icon.png", "Store", "h-10 w-10 shrink-0 object-contain"),
    htmlElement("div", "min-w-0 flex-1", [
      htmlElement("div", "text-2xl font-black leading-none tracking-wide drop-shadow", ["STORE"]),
      htmlElement("div", "mt-0.5 text-xs font-bold text-cyan-100/80", [
        `${state.activeTankName} L${formatNumber(state.activeTankLevel)} · ${formatNumber(state.fishCount)}/${formatNumber(state.fishCapacity)} fish`
      ])
    ]),
    createHtmlButton("X CLOSE", "min-h-9 rounded-xl border border-white/50 bg-red-600 px-2.5 text-xs font-black text-white shadow-lg shadow-red-950/40", onClose)
  );

  const stats = htmlElement("div", "mt-1.5 grid grid-cols-4 gap-1.5");
  stats.append(
    createCurrencyChip("common", state.wallet.common),
    createCurrencyChip("rare", state.wallet.rare),
    createCurrencyChip("superRare", state.wallet.superRare),
    createCurrencyChip("wealth", state.wealth)
  );
  header.append(top, stats);
  return header;
}

function createCurrencyChip(kind: CoinType | "wealth", amount: number): HTMLElement {
  const iconByKind: Record<CoinType | "wealth", string> = {
    common: "/assets/ui/shop/coin_icon_common.png",
    rare: "/assets/ui/shop/coin_icon_rare.png",
    superRare: "/assets/ui/shop/coin_icon_super_rare.png",
    wealth: "/assets/ui/shop/wealth_icon_treasure.png"
  };
  const labelByKind: Record<CoinType | "wealth", string> = {
    common: "Common",
    rare: "Rare",
    superRare: "Super",
    wealth: "Wealth"
  };
  const chip = htmlElement("div", "aq-chip flex items-center gap-1.5");
  chip.append(
    htmlImage(iconByKind[kind], labelByKind[kind], "h-5 w-5 object-contain"),
    htmlElement("div", "min-w-0", [
      htmlElement("div", "text-[10px] leading-none text-cyan-100/65", [labelByKind[kind]]),
      htmlElement("div", "text-sm leading-tight", [formatNumber(amount)])
    ])
  );
  return chip;
}
