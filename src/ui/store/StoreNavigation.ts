import { foodDispenserAssetPath } from "../../game/dispenser-system";
import type { CoinType, StoreTab } from "../../types/mechanics";
import { createHtmlButton, htmlElement, htmlImage } from "../dom";

export type TankStoreCategory = "tank" | "background" | "seabed" | "tools" | "decorations";
export type StoreBrowseLevel = "categories" | "tankCategories" | "products";

export function createStoreCategoryMenu(onSelect: (tab: StoreTab) => void): HTMLElement {
  const tabs: Array<{ tab: StoreTab; label: string; icon: string }> = [
    { tab: "fish", label: "Fish", icon: "/assets/ui/shop/icon_category_fish.png" },
    { tab: "food", label: "Food", icon: "/assets/food/basic.png" },
    { tab: "supply", label: "Medicine", icon: "/assets/food/medicine.png" },
    { tab: "tank", label: "Tanks", icon: "/assets/ui/shop/icon_category_tanks.png" },
    { tab: "creature", label: "Helpers", icon: "/assets/helpers/feeder-snail.png" }
  ];
  const panel = htmlElement("main", "aq-panel aq-store-list-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2");
  tabs.forEach((item) => {
    panel.append(createCategoryCard(item.icon, item.label, storeCategoryDescription(item.tab), () => onSelect(item.tab)));
  });
  return panel;
}

export function createTankCategoryMenu(onSelect: (category: TankStoreCategory) => void): HTMLElement {
  const categories: Array<{ category: TankStoreCategory; label: string; icon: string }> = [
    { category: "tank", label: "Tank", icon: "/assets/ui/shop/icon_category_tanks.png" },
    { category: "background", label: "Background", icon: "/assets/ui/shop/rare_star_badge.png" },
    { category: "seabed", label: "Seabed", icon: "/assets/ui/shop/common_star_badge.png" },
    { category: "tools", label: "Tools", icon: foodDispenserAssetPath },
    { category: "decorations", label: "Decor", icon: "/assets/decorations/rock.png" }
  ];
  const panel = htmlElement("main", "aq-panel aq-store-list-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2");
  categories.forEach((item) => {
    panel.append(createCategoryCard(item.icon, item.label, tankCategoryDescription(item.category), () => onSelect(item.category)));
  });
  return panel;
}

export function createStoreRarityFilters(activeFilter: CoinType, onSelect: (coinType: CoinType) => void): HTMLElement {
  const filters: Array<{ coin: CoinType; label: string; icon: string; className: string }> = [
    { coin: "common", label: "Common", icon: "/assets/ui/shop/common_star_badge.png", className: "border-amber-300/70 text-amber-200" },
    { coin: "rare", label: "Rare", icon: "/assets/ui/shop/rare_star_badge.png", className: "border-cyan-300/70 text-cyan-200" },
    { coin: "superRare", label: "Super", icon: "/assets/ui/shop/super_rare_star_badge.png", className: "border-fuchsia-300/70 text-fuchsia-200" }
  ];
  const row = htmlElement("div", "mb-1.5 flex shrink-0 gap-1.5");
  filters.forEach((filter) => {
    const filterButton = button("", `aq-rarity ${filter.className} ${activeFilter === filter.coin ? "bg-white/15" : "bg-sky-950/55 opacity-75"}`, () => onSelect(filter.coin));
    filterButton.append(image(filter.icon, "", "h-5 w-5 object-contain drop-shadow"), document.createTextNode(filter.label));
    row.append(filterButton);
  });
  return row;
}

export function createStoreDrillHeader(title: string, subtitle: string, onBack: () => void): HTMLElement {
  const row = htmlElement("div", "mb-1.5 flex shrink-0 items-center gap-2");
  row.append(
    button("← BACK", "aq-store-back-button", onBack),
    htmlElement("div", "min-w-0 flex-1", [
      htmlElement("div", "truncate text-sm font-black leading-tight text-white", [title]),
      htmlElement("div", "truncate text-[10px] font-bold text-cyan-100/70", [subtitle])
    ])
  );
  return row;
}

export function storeProductTitle(activeTab: StoreTab, tankCategory: TankStoreCategory): string {
  if (activeTab !== "tank") {
    const labels: Record<StoreTab, string> = {
      fish: "Fish",
      food: "Food",
      supply: "Medicine",
      tank: "Tanks",
      decor: "Decor",
      creature: "Helpers"
    };
    return labels[activeTab];
  }

  const labels: Record<TankStoreCategory, string> = {
    tank: "Tank",
    background: "Background",
    seabed: "Seabed",
    tools: "Tools",
    decorations: "Decorations"
  };
  return labels[tankCategory];
}

function storeCategoryDescription(tab: StoreTab): string {
  const descriptions: Record<StoreTab, string> = {
    fish: "Collect fish for this tank",
    food: "Food for each fish size",
    supply: "Medicine and growth tonic",
    tank: "Tanks, themes, tools, and decor",
    decor: "Tank decorations",
    creature: "Helper pets and cleaners"
  };
  return descriptions[tab];
}

function tankCategoryDescription(category: TankStoreCategory): string {
  const descriptions: Record<TankStoreCategory, string> = {
    tank: "Buy another tank slot",
    background: "Change the rear aquarium scene",
    seabed: "Change the sand and floor",
    tools: "Functional aquarium utilities",
    decorations: "Plants, rocks, air stones, and ornaments"
  };
  return descriptions[category];
}

function createCategoryCard(icon: string, title: string, description: string, onClick: () => void): HTMLButtonElement {
  const tabButton = button("", "aq-store-category-card", onClick);
  tabButton.append(
    image(icon, "", "aq-store-category-icon"),
    htmlElement("div", "aq-store-category-copy", [
      htmlElement("div", "aq-store-category-title", [title]),
      htmlElement("div", "aq-store-category-description", [description])
    ]),
    htmlElement("div", "aq-store-category-arrow", [">"])
  );
  return tabButton;
}

function image(src: string, alt: string, className: string): HTMLImageElement {
  return htmlImage(src, alt, className);
}

function button(label: string, className: string, onClick: () => void, disabled = false): HTMLButtonElement {
  return createHtmlButton(label, className, onClick, { disabled });
}
