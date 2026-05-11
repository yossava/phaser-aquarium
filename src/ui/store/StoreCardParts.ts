import { formatNumber } from "../../game/economy";
import { priceComponents } from "../../game/economy";
import type { CoinType, HelperCreatureType, Price, Rarity } from "../../types/mechanics";
import { htmlElement, htmlImage } from "../dom";

export function createStoreBaseCard(rarity: Rarity): HTMLElement {
  const classByRarity: Record<Rarity, string> = {
    common: "border-emerald-300/45",
    rare: "border-cyan-300/55",
    superRare: "border-fuchsia-300/65"
  };
  return htmlElement("article", `aq-card ${classByRarity[rarity]}`);
}

export function createStorePreview(src: string, alt: string, className = ""): HTMLElement {
  const wrap = htmlElement("div", `aq-card-preview ${className}`.trim());
  wrap.append(htmlImage(src, alt, "max-h-full max-w-[94%] object-contain drop-shadow-lg"));
  return wrap;
}

export function createStorePriceBadge(price: Price): HTMLElement {
  const iconByCoin: Record<CoinType, string> = {
    common: "/assets/ui/shop/coin_icon_common.png",
    rare: "/assets/ui/shop/coin_icon_rare.png",
    superRare: "/assets/ui/shop/coin_icon_super_rare.png"
  };
  const badge = htmlElement("div", "flex shrink-0 items-center gap-0.5 rounded-full border border-cyan-200/25 bg-sky-950/80 px-1.5 py-0.5 text-xs font-black text-amber-200");
  priceComponents(price).forEach(([coinType, amount], index) => {
    if (index > 0) {
      badge.append(document.createTextNode("+"));
    }
    badge.append(htmlImage(iconByCoin[coinType], "", "h-4 w-4 object-contain"), document.createTextNode(formatNumber(amount)));
  });
  return badge;
}

export function storeRarityLabel(rarity: Rarity | CoinType): string {
  return rarity === "superRare" ? "Super Rare" : rarity === "rare" ? "Rare" : "Common";
}

export function helperRole(creature: HelperCreatureType): string {
  if (creature.id === "feeder-snail") {
    return "Pet";
  }
  if (creature.tankCleanSeconds) {
    return "Auto Cleaner";
  }
  return creature.habitatTags.includes("collector") ? "Collector" : "Cleaner";
}
