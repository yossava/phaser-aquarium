import { formatNumber } from "../game/economy";
import { htmlElement, htmlImage } from "./dom";
import type { DecorationType } from "../types/mechanics";

export function createBlueTintPreviewOverlay(intensity: number): HTMLElement {
  const overlay = htmlElement("div", "aq-blue-tint-preview");
  updateBlueTintPreviewOverlay(overlay, intensity);
  return overlay;
}

export function updateBlueTintPreviewOverlay(overlay: HTMLElement, intensity: number): void {
  overlay.style.opacity = String(Math.round(Math.max(0, Math.min(100, intensity))) / 100);
}

export function createTankCosmeticInventoryCard(input: {
  name: string;
  selected: boolean;
  imageUrl?: string;
  tintColor: string;
  blueTintIntensity: number;
  createButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;
  attachTouchFeedback: (element: HTMLElement) => void;
  onApply: () => void;
}): HTMLElement {
  const card = htmlElement("article", `aq-tank-grid-card ${input.selected ? "is-active" : ""}`);
  input.attachTouchFeedback(card);
  if (input.imageUrl) {
    card.append(htmlImage(input.imageUrl, "", "aq-tank-grid-image cover"));
  } else {
    card.style.backgroundColor = input.tintColor;
  }
  card.append(
    createBlueTintPreviewOverlay(input.blueTintIntensity),
    htmlElement("div", "aq-tank-grid-overlay", [
      htmlElement("span", "aq-page-mini-title", [input.name]),
      htmlElement("span", "aq-page-mini-meta", [input.selected ? "Active" : "Owned"]),
      input.createButton(
        input.selected ? "Active" : "Apply",
        "aq-page-button aq-page-button-good aq-cosmetic-apply-button",
        input.onApply,
        input.selected
      )
    ])
  );
  return card;
}

export function createTankLevelInventoryCard(input: {
  displayLevel: number;
  active: boolean;
  owned: boolean;
  name: string;
  fishCount: number;
  capacity: number;
  productionTotal: number;
  summary: string;
  imageUrl?: string;
  accentColor: string;
  createButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;
  attachTouchFeedback: (element: HTMLElement) => void;
  shouldSuppressClick: () => boolean;
  onSwitch: () => void;
  onOpenMakeup: () => void;
}): HTMLElement {
  const card = htmlElement("article", `aq-tank-grid-card ${input.active ? "is-active" : ""}`);
  input.attachTouchFeedback(card);
  if (input.owned && !input.active) {
    card.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!input.shouldSuppressClick()) {
        input.onSwitch();
      }
    });
  }
  if (input.imageUrl) {
    card.append(htmlImage(input.imageUrl, "", "aq-tank-grid-image cover"));
  } else {
    card.style.setProperty("--tank-accent", input.accentColor);
  }

  const overlay = htmlElement("div", "aq-tank-grid-overlay", [
    htmlElement("span", "aq-page-tank-level", [`Level ${formatNumber(input.displayLevel)}`]),
    htmlElement("h3", "aq-page-card-title", [input.name]),
    htmlElement("p", "aq-page-card-meta", [
      `${input.owned ? "Owned" : "Locked"} | ${formatNumber(input.fishCount)}/${formatNumber(input.capacity)} fish`
    ]),
    htmlElement("p", "aq-page-card-copy", [`Produced ${formatNumber(input.productionTotal)} | ${input.summary}`])
  ]);
  if (input.owned) {
    if (input.active) {
      overlay.append(
        htmlElement("div", "aq-page-actions compact", [
          input.createButton("Background", "aq-page-button aq-page-button-good aq-tank-background-button", input.onOpenMakeup)
        ])
      );
    } else {
      overlay.append(htmlElement("p", "aq-page-card-meta", ["Tap card to activate"]));
    }
  } else {
    overlay.append(htmlElement("p", "aq-page-card-meta", ["Available in Shop"]));
  }
  card.append(overlay);
  return card;
}

export function createDecorationInventoryCard(input: {
  decorationType: DecorationType;
  rarityLabel: string;
  sizeRows: Array<{
    label: string;
    sellValue: number;
    selectDisabled: boolean;
    onSelect: () => void;
    onSell: () => void;
  }>;
  createButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;
}): HTMLElement {
  const card = htmlElement("article", "aq-tank-grid-card");
  const sizeGrid = htmlElement("div", "aq-page-size-grid");
  for (const row of input.sizeRows) {
    sizeGrid.append(
      input.createButton(row.label, "aq-page-size-button owned", row.onSelect, row.selectDisabled),
      input.createButton(`Sell C${formatNumber(row.sellValue)}`, "aq-page-size-button danger", row.onSell)
    );
  }
  card.append(
    htmlImage(`/assets/decorations/${input.decorationType.id}.png`, "", "aq-tank-grid-image contain"),
    htmlElement("div", "aq-tank-grid-overlay", [
      htmlElement("h3", "aq-page-card-title", [input.decorationType.name]),
      htmlElement("p", "aq-page-card-meta", [`${input.rarityLabel} | +${formatNumber(input.decorationType.happinessBonus)} happy`]),
      sizeGrid
    ])
  );
  return card;
}

export function createTankUtilityInventoryCard(input: {
  id: string;
  name: string;
  icon: string;
  meta: string;
  copy: string;
  sellValue: number;
  createButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;
  onSell: (id: string) => void;
}): HTMLElement {
  const card = htmlElement("article", "aq-tank-grid-card");
  card.append(
    htmlImage(input.icon, "", "aq-tank-grid-image contain"),
    htmlElement("div", "aq-tank-grid-overlay", [
      htmlElement("h3", "aq-page-card-title", [input.name]),
      htmlElement("p", "aq-page-card-meta", [input.meta]),
      htmlElement("p", "aq-page-card-copy", [input.copy]),
      input.createButton(`Sell C${formatNumber(input.sellValue)}`, "aq-page-button aq-page-button-danger", () => input.onSell(input.id))
    ])
  );
  return card;
}
