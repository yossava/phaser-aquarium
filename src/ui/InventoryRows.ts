import { formatNumber } from "../game/economy";
import { htmlElement, htmlImage } from "./dom";
import { createPageEmptyCard } from "./PageOverlay";
import type { DecorationSize } from "../game/tank-catalog";
import type { DecorationType, FishType, FoodType } from "../types/mechanics";

export function appendInventoryItemSection(input: {
  content: HTMLElement;
  title?: string;
  items: HTMLElement[];
  emptyTitle: string;
  emptyDetail: string;
  listClassName?: string;
}): void {
  if (input.title) {
    input.content.append(htmlElement("h2", "aq-page-section-title", [input.title]));
  }
  const list = htmlElement("div", input.listClassName ?? "aq-album-list");
  if (input.items.length === 0) {
    list.append(createPageEmptyCard(input.emptyTitle, input.emptyDetail));
  } else {
    list.append(...input.items);
  }
  input.content.append(list);
}

export function createStoredFishInventoryRow(input: {
  fishType: FishType;
  count: number;
  sellValue: number;
  ageCopy: string;
  rarityLabel: string;
  createButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;
  onPlace: () => void;
  onSell: () => void;
}): HTMLElement {
  const row = htmlElement("article", "aq-album-row fish");
  const body = htmlElement("div", "aq-album-row-body", [
    htmlElement("h3", "aq-album-row-title", [input.fishType.name]),
    htmlElement("p", "aq-album-row-meta", [`Inventory x${formatNumber(input.count)} | ${input.rarityLabel}${input.ageCopy}`]),
    htmlElement("p", "aq-album-row-copy", [`Sell converts one fish to C${formatNumber(input.sellValue)}`])
  ]);
  row.append(
    htmlImage(`/assets/fish/${input.fishType.id}.png`, "", "aq-album-row-image fish"),
    body,
    htmlElement("div", "aq-album-row-actions", [
      input.createButton("To Tank", "aq-page-button aq-page-button-good aq-album-row-button", input.onPlace),
      input.createButton(`Sell C${formatNumber(input.sellValue)}`, "aq-page-button aq-page-button-danger aq-album-row-button", input.onSell)
    ])
  );
  return row;
}

export function createFoodInventoryRow(input: {
  foodType: FoodType;
  countLabel: string;
  sellValue: number;
  imageUrl: string;
  imageFilter: string;
  createButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;
  onSell: () => void;
}): HTMLElement {
  const row = htmlElement("article", "aq-album-row food");
  const image = htmlImage(input.imageUrl, "", "aq-album-row-image");
  image.style.filter = input.imageFilter;
  const body = htmlElement("div", "aq-album-row-body", [
    htmlElement("h3", "aq-album-row-title", [input.foodType.name]),
    htmlElement("p", "aq-album-row-meta", [`Owned x${input.countLabel} | ${formatNumber(input.foodType.calories)} cal each`]),
    htmlElement("p", "aq-album-row-copy", [`Sell all for C${formatNumber(input.sellValue)}`])
  ]);
  row.append(
    image,
    body,
    input.createButton(`Sell C${formatNumber(input.sellValue)}`, "aq-page-button aq-page-button-danger aq-album-row-button", input.onSell)
  );
  return row;
}

export function createCoinInventoryRow(input: {
  coinType: "rare" | "superRare";
  count: number;
  value: number;
  icon: string;
  createButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;
  onSell: () => void;
}): HTMLElement {
  const label = input.coinType === "rare" ? "Rare Coin" : "Super Rare Diamond";
  const row = htmlElement("article", "aq-album-row coin");
  const body = htmlElement("div", "aq-album-row-body", [
    htmlElement("h3", "aq-album-row-title", [label]),
    htmlElement("p", "aq-album-row-meta", [`Owned x${formatNumber(input.count)}`]),
    htmlElement("p", "aq-album-row-copy", [`Sell all for C${formatNumber(input.value)}`])
  ]);
  row.append(
    htmlImage(input.icon, "", "aq-album-row-image"),
    body,
    input.createButton(
      `Sell C${formatNumber(input.value)}`,
      "aq-page-button aq-page-button-danger aq-album-row-button",
      input.onSell,
      input.count <= 0
    )
  );
  return row;
}

export function createDecorationInventoryRow(input: {
  decorationType: DecorationType;
  size: DecorationSize;
  sizeLabel: string;
  storedCount: number;
  placedCount: number;
  sellValue: number;
  createButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;
  onSell: () => void;
}): HTMLElement {
  const count = input.storedCount + input.placedCount;
  const row = htmlElement("article", "aq-album-row decor");
  const body = htmlElement("div", "aq-album-row-body", [
    htmlElement("h3", "aq-album-row-title", [input.decorationType.name]),
    htmlElement("p", "aq-album-row-meta", [`${input.sizeLabel} x${formatNumber(count)} | Stored ${formatNumber(input.storedCount)} | Tank ${formatNumber(input.placedCount)}`]),
    htmlElement("p", "aq-album-row-copy", [`Sell all for C${formatNumber(input.sellValue)}`])
  ]);
  row.append(
    htmlImage(`/assets/decorations/${input.decorationType.id}.png`, "", "aq-album-row-image"),
    body,
    input.createButton(
      `Sell C${formatNumber(input.sellValue)}`,
      "aq-page-button aq-page-button-danger aq-album-row-button",
      input.onSell,
      count <= 0
    )
  );
  return row;
}
