import { formatNumber, formatPrice } from "../game/economy";
import { inventoryCategoryTitle, type InventoryCategoryItem } from "../game/inventory-dock";
import type { Fish } from "../objects/Fish";
import type { HelperCreature } from "../objects/HelperCreature";
import type { Price } from "../types/mechanics";
import { htmlElement, htmlImage } from "./dom";
import type { PageButtonFactory } from "./PageOverlay";

export type FishAlbumRowOptions = {
  fish: Fish;
  index: number;
  happinessPercent: number;
  rarityLabel: string;
  sellValue: number;
  createButton: PageButtonFactory;
  onStore?: (index: number) => void;
  onSell: (index: number) => void;
};

export type HelperAlbumRowOptions = {
  helper: HelperCreature;
  index: number;
  rarityLabel: string;
  sellPrice: Price;
  createButton: PageButtonFactory;
  onSell: (index: number) => void;
};

export type AlbumPageOptions<Tab extends string> = {
  content: HTMLElement;
  inventoryDrillOpen: boolean;
  inventoryTab: Tab;
  createCategoryGrid: () => HTMLElement;
  createDrillHeader: (title: string, onBack: () => void) => HTMLElement;
  onBackToCategories: () => void;
  appendFishTab: (content: HTMLElement) => void;
  appendFusionTab: (content: HTMLElement) => void;
  appendFoodTab: (content: HTMLElement) => void;
  appendDecorTab: (content: HTMLElement) => void;
  appendTankTab: (content: HTMLElement) => void;
  appendCoinsTab: (content: HTMLElement) => void;
};

export type InventoryCategoryGridOptions<Tab extends string> = {
  items: Array<InventoryCategoryItem<Tab>>;
  createDrillMenuCard: (icon: string, label: string, description: string, action: () => void) => HTMLButtonElement;
  createFusionDrillMenuCard: (description: string, action: () => void) => HTMLButtonElement;
  onSelectTab: (tab: Tab) => void;
};

export function appendAlbumPage<Tab extends string>(options: AlbumPageOptions<Tab>): void {
  options.content.classList.add("aq-page-content-scroll");
  if (!options.inventoryDrillOpen) {
    options.content.classList.add("aq-page-content-main-menu");
    options.content.append(options.createCategoryGrid());
    return;
  }

  options.content.append(options.createDrillHeader(inventoryCategoryTitle(options.inventoryTab), options.onBackToCategories));
  if (options.inventoryTab === "fish") {
    options.appendFishTab(options.content);
    return;
  }
  if (options.inventoryTab === "fusion") {
    options.appendFusionTab(options.content);
    return;
  }
  if (options.inventoryTab === "food") {
    options.appendFoodTab(options.content);
    return;
  }
  if (options.inventoryTab === "decor") {
    options.appendDecorTab(options.content);
    return;
  }
  if (options.inventoryTab === "tank") {
    options.appendTankTab(options.content);
    return;
  }
  options.appendCoinsTab(options.content);
}

export function createInventoryCategoryGrid<Tab extends string>(options: InventoryCategoryGridOptions<Tab>): HTMLElement {
  const grid = htmlElement("div", "aq-main-menu-grid");
  options.items.forEach((item) => {
    const action = () => options.onSelectTab(item.tab);
    grid.append(item.tab === "fusion"
      ? options.createFusionDrillMenuCard(item.description, action)
      : options.createDrillMenuCard(item.icon, item.label, item.description, action));
  });
  return grid;
}

export function createFishAlbumRow(options: FishAlbumRowOptions): HTMLElement {
  const { fish, index, happinessPercent, rarityLabel, sellValue, createButton, onStore, onSell } = options;
  const growthStatus = fish.isGrowthLimitedByTank() ? "Max screen size" : "Growing";
  const row = htmlElement("article", "aq-album-row fish");
  const fullnessValue = Math.round(clampPercent(fish.fullnessRatio() * 100));
  const stats = htmlElement("div", "aq-album-stat-grid", [
    createAlbumBarStat("Full", fullnessValue, albumPositiveTone(fullnessValue)),
    createAlbumBarStat("Happy", happinessPercent, albumPositiveTone(happinessPercent))
  ]);
  const status = fish.hudStatusLabel();
  const imageWrap = htmlElement("div", `aq-album-fish-avatar is-${status}`, [
    htmlImage(`/assets/fish/${fish.type.id}.png`, "", "aq-album-row-image fish"),
    htmlElement("span", "", [fish.hudStatusIcon()])
  ]);
  imageWrap.title = `${fish.type.name}: ${status}`;
  const body = htmlElement("div", "aq-album-row-body", [
    htmlElement("h3", "aq-album-row-title", [fish.type.name]),
    htmlElement("p", "aq-album-row-meta", [`${fish.gender} | ${fish.ageLabel()} | ${rarityLabel} | ${fish.state}`]),
    htmlElement("p", "aq-album-row-copy", [`${growthStatus} | ${fish.lengthLabel()} | ${fish.weightLabel()} | ${fish.productionSummary()}`]),
    stats
  ]);
  row.append(
    imageWrap,
    body,
    htmlElement("div", "aq-album-row-actions", [
      ...(onStore ? [createButton("To Inventory", "aq-page-button aq-page-button-good aq-album-row-button", () => onStore(index))] : []),
      createButton(`Sell C${formatNumber(sellValue)}`, "aq-page-button aq-page-button-danger aq-album-row-button", () => onSell(index))
    ])
  );
  return row;
}

export function createHelperAlbumRow(options: HelperAlbumRowOptions): HTMLElement {
  const { helper, index, rarityLabel, sellPrice, createButton, onSell } = options;
  const role = helperRole(helper);
  const row = htmlElement("article", "aq-album-row helper");
  const body = htmlElement("div", "aq-album-row-body", [
    htmlElement("h3", "aq-album-row-title", [helper.type.name]),
    htmlElement("p", "aq-album-row-meta", [`${rarityLabel} | ${role}`]),
    htmlElement("p", "aq-album-row-copy", [`Speed ${formatNumber(helper.type.speed)} | Sell ${formatPrice(sellPrice)}`])
  ]);
  row.append(
    htmlImage(`/assets/helpers/${helper.type.id}.png`, "", "aq-album-row-image helper"),
    body,
    createButton(`Sell ${formatPrice(sellPrice)}`, "aq-page-button aq-page-button-danger aq-album-row-button", () => onSell(index))
  );
  return row;
}

function createAlbumBarStat(label: string, value: number, tone: string): HTMLElement {
  const stat = htmlElement("span", `aq-album-stat aq-album-bar-stat ${tone}`);
  const bar = htmlElement("span", "aq-album-bar");
  const fill = htmlElement("span", "aq-album-bar-fill");
  fill.style.width = `${clampPercent(value)}%`;
  bar.append(fill);
  stat.append(htmlElement("small", "", [label]), bar);
  return stat;
}

function albumPositiveTone(value: number): string {
  if (value >= 70) {
    return "is-good";
  }
  if (value >= 42) {
    return "is-warn";
  }
  return "is-bad";
}

function helperRole(helper: HelperCreature): string {
  if (helper.type.id === "feeder-snail") {
    return "Pet";
  }
  if (helper.type.tankCleanSeconds) {
    return "Auto Cleaner";
  }
  return helper.type.habitatTags.includes("collector") ? "Collector" : "Cleaner";
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}
