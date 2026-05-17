import { formatNumber } from "../game/economy";
import type { InventoryDockItem } from "../game/inventory-dock";
import { foodCssFilterFor } from "../game/visuals";
import { htmlElement } from "./dom";

export type TankMenuItem = {
  id: string;
  label: string;
  y: number;
  icon: string;
  onClick: () => void;
  badge?: string;
};

export type HtmlHudOverlayElements = {
  overlay: HTMLDivElement;
  levelText: HTMLSpanElement;
  commonText: HTMLSpanElement;
  rareText: HTMLSpanElement;
  superRareText: HTMLSpanElement;
  timeCurrentElement: HTMLDivElement;
  timeCurrentText: HTMLSpanElement;
  coinMagnetElement: HTMLDivElement;
  coinMagnetText: HTMLSpanElement;
  autoFoodBuyerElement: HTMLDivElement;
  autoFoodBuyerText: HTMLSpanElement;
  foodDispenserElement: HTMLDivElement;
  foodDispenserText: HTMLSpanElement;
};

type TouchFeedback = (element: HTMLElement, releaseOnLeave?: boolean) => void;

export function createTankMenuOverlay(input: {
  version: string;
  tankDirty: boolean;
  designHeight: number;
  items: TankMenuItem[];
  attachTouchFeedback: TouchFeedback;
}): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.className = "aq-tank-menu";
  overlay.dataset.version = input.version;

  for (const item of input.items) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "aq-tank-menu-button";
    if (item.id === "menu") {
      button.classList.add("aq-tank-menu-button-plain");
    }
    button.dataset.menu = item.id;
    button.style.top = `${(item.y / input.designHeight) * 100}%`;
    button.setAttribute("aria-label", item.label);
    input.attachTouchFeedback(button, true);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      item.onClick();
    });

    const bubble = document.createElement("span");
    bubble.className = "aq-tank-menu-bubble";
    if (item.id === "menu") {
      bubble.classList.add("aq-tank-menu-bubble-plain");
    }
    const icon = document.createElement("img");
    icon.src = item.icon;
    icon.alt = "";
    icon.draggable = false;
    if (item.id === "menu") {
      icon.classList.add("aq-tank-menu-icon-small");
    }
    bubble.append(icon);
    const badgeLabel = item.badge ?? (item.id === "menu" && input.tankDirty ? "!" : undefined);
    if (badgeLabel) {
      const badge = document.createElement("span");
      badge.className = "aq-tank-menu-badge";
      badge.textContent = badgeLabel;
      bubble.append(badge);
    }
    button.append(bubble, htmlElement("span", "aq-tank-menu-label", [item.label]));
    overlay.append(button);
  }

  return overlay;
}

export function createHtmlHudOverlay(input: {
  coinMagnetIconPath: string;
  autoFoodBuyerIconPath: string;
  foodDispenserIconPath: string;
  timeCurrentIconPath: string;
  attachTouchFeedback: TouchFeedback;
  prepareInfoTarget: (element: HTMLElement, title: string, lines: string[]) => void;
  bindCoinMagnetDrag: (element: HTMLElement) => void;
  bindAutoFoodBuyerDrag: (element: HTMLElement) => void;
  bindFoodDispenserDrag: (element: HTMLElement) => void;
}): HtmlHudOverlayElements {
  const overlay = document.createElement("div");
  overlay.className = "aq-game-hud";

  const panel = document.createElement("section");
  panel.className = "aq-game-stat-panel";

  const summary = document.createElement("div");
  summary.className = "aq-game-tank-summary";
  const badge = document.createElement("div");
  badge.className = "aq-game-level-badge";
  input.prepareInfoTarget(badge, "Level", [
    "Your tank level is based on the total value of this tank.",
    "Higher level unlocks better fish and gives the tank more room to grow."
  ]);
  const levelText = document.createElement("span");
  badge.append(levelText);
  summary.prepend(badge);

  const wallet = document.createElement("div");
  wallet.className = "aq-game-wallet-grid";
  const commonText = createHudChip(wallet, "/assets/ui/shop/coin_icon_common.png", "Common", input.prepareInfoTarget, [
    "Common coins are the basic money used for early fish, food, medicine, decorations, and starter tank items.",
    "Most young fish produce common coins."
  ]);
  const rareText = createHudChip(wallet, "/assets/ui/shop/coin_icon_rare.png", "Rare", input.prepareInfoTarget, [
    "Rare currency is used for stronger rare fish and higher-value shop items.",
    "It comes from quests, ads, events, and later reward systems."
  ]);
  const superRareText = createHudChip(wallet, "/assets/ui/shop/coin_icon_super_rare.png", "Super Rare", input.prepareInfoTarget, [
    "Super rare diamonds are premium progression currency for the most valuable fish and items.",
    "They come from special quests, ads, events, and late progression rewards."
  ]);

  const timeCurrent = createTimeCurrentIndicator(input.timeCurrentIconPath, input.prepareInfoTarget);
  panel.append(summary, wallet);
  const coinMagnet = createTankSideTool("aq-tank-side-tool aq-coin-magnet-tool", input.coinMagnetIconPath, "Coin magnet", "aq-coin-magnet-count");
  const autoFoodBuyer = createTankSideTool(
    "aq-tank-side-tool aq-auto-food-buyer-tool",
    input.autoFoodBuyerIconPath,
    "Auto food buyer",
    "aq-auto-food-buyer-count"
  );
  const foodDispenser = createTankSideTool(
    "aq-tank-side-tool aq-food-dispenser",
    input.foodDispenserIconPath,
    "Fish food dispenser",
    "aq-food-dispenser-count"
  );
  input.bindCoinMagnetDrag(coinMagnet.element);
  input.bindAutoFoodBuyerDrag(autoFoodBuyer.element);
  input.bindFoodDispenserDrag(foodDispenser.element);

  overlay.append(panel, timeCurrent.element, autoFoodBuyer.element, coinMagnet.element, foodDispenser.element);
  return {
    overlay,
    levelText,
    commonText,
    rareText,
    superRareText,
    timeCurrentElement: timeCurrent.element,
    timeCurrentText: timeCurrent.text,
    coinMagnetElement: coinMagnet.element,
    coinMagnetText: coinMagnet.text,
    autoFoodBuyerElement: autoFoodBuyer.element,
    autoFoodBuyerText: autoFoodBuyer.text,
    foodDispenserElement: foodDispenser.element,
    foodDispenserText: foodDispenser.text
  };
}

function createHudChip(
  parent: HTMLElement,
  iconSrc: string,
  label: string,
  prepareInfoTarget: (element: HTMLElement, title: string, lines: string[]) => void,
  definition: string[]
): HTMLSpanElement {
  const chip = document.createElement("div");
  chip.className = "aq-game-wallet-chip";
  prepareInfoTarget(chip, label, definition);
  const icon = document.createElement("img");
  icon.src = iconSrc;
  icon.alt = label;
  icon.draggable = false;
  const text = document.createElement("span");
  chip.append(icon, text);
  parent.append(chip);
  return text;
}

function createTimeCurrentIndicator(
  iconSrc: string,
  prepareInfoTarget: (element: HTMLElement, title: string, lines: string[]) => void
): {
  element: HTMLDivElement;
  text: HTMLSpanElement;
} {
  const element = document.createElement("div");
  element.className = "aq-time-current-indicator hidden";
  prepareInfoTarget(element, "Time Current", [
    "The active tank is running faster while this current is flowing.",
    "Fish grow, produce, get hungry, and tank activity all move at the boosted pace."
  ]);
  const icon = document.createElement("img");
  icon.src = iconSrc;
  icon.alt = "";
  icon.draggable = false;
  const multiplier = htmlElement("strong", "", ["x2"]);
  const text = document.createElement("span");
  element.append(icon, multiplier, text);
  return { element, text };
}

function createTankSideTool(className: string, iconSrc: string, alt: string, countClassName: string): {
  element: HTMLDivElement;
  text: HTMLSpanElement;
} {
  const element = document.createElement("div");
  element.className = className;
  const icon = document.createElement("img");
  icon.src = iconSrc;
  icon.alt = alt;
  icon.draggable = false;
  const text = document.createElement("span");
  text.className = `aq-tank-side-tool-count ${countClassName}`;
  element.append(icon, text);
  return { element, text };
}

export function createHtmlFoodDock(): HTMLDivElement {
  const dock = document.createElement("div");
  dock.className = "aq-food-dock";
  return dock;
}

export function createInventoryDockPager(input: {
  page: number;
  pageCount: number;
  attachTouchFeedback: TouchFeedback;
  shouldSuppressClick: () => boolean;
  onPrevious: () => void;
  onNext: () => void;
}): HTMLDivElement {
  const pager = document.createElement("div");
  pager.className = "aq-food-dock-pager";
  const previous = createInventoryDockPageButton("<", input.onPrevious, input);
  const next = createInventoryDockPageButton(">", input.onNext, input);
  const label = document.createElement("span");
  label.className = "aq-food-dock-page-label";
  label.textContent = `${formatNumber(input.page + 1)}/${formatNumber(input.pageCount)}`;
  pager.append(previous, label, next);
  return pager;
}

function createInventoryDockPageButton(
  label: string,
  onClick: () => void,
  input: Pick<Parameters<typeof createInventoryDockPager>[0], "attachTouchFeedback" | "shouldSuppressClick">
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "aq-food-dock-page-button";
  button.textContent = label;
  input.attachTouchFeedback(button);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (input.shouldSuppressClick()) {
      return;
    }
    onClick();
  });
  return button;
}

export function createHtmlInventoryDockButton(input: {
  item: InventoryDockItem;
  badgeLabel: string;
  attachTouchFeedback: TouchFeedback;
  onFishMenuClick: (event: MouseEvent) => void;
  onStartDrag: (event: PointerEvent, item: InventoryDockItem) => void;
}): HTMLButtonElement {
  const { item } = input;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "aq-food-button";
  button.setAttribute("aria-label", `${item.label} x${input.badgeLabel}`);
  input.attachTouchFeedback(button);

  const bubble = document.createElement("span");
  bubble.className = "aq-food-button-bubble";
  bubble.append(createInventoryDockIcon(item));

  const count = document.createElement("span");
  count.className = "aq-food-button-count";
  if (item.kind === "utility" && item.id === "coin-magnet") {
    count.classList.add("is-timer");
    count.textContent = `${formatNumber(item.count)}m`;
  } else {
    count.textContent = input.badgeLabel;
  }
  bubble.append(count);

  const label = document.createElement("span");
  label.className = "aq-food-button-label";
  label.textContent = item.label;

  button.append(bubble, label);
  if (item.kind === "fish-menu") {
    button.addEventListener("click", input.onFishMenuClick);
    return button;
  }
  button.addEventListener("pointerdown", (event) => input.onStartDrag(event, item));
  return button;
}

export function createFoodDragGhost(item: InventoryDockItem): HTMLDivElement {
  const ghost = document.createElement("div");
  ghost.className = "aq-food-drag-ghost";
  ghost.append(createInventoryDockIcon(item));
  return ghost;
}

function createInventoryDockIcon(item: InventoryDockItem): HTMLImageElement {
  const icon = document.createElement("img");
  icon.src = item.icon;
  icon.alt = "";
  icon.draggable = false;
  if (item.kind === "food") {
    icon.classList.add("aq-food-icon", `aq-food-icon-${item.id}`);
    icon.style.filter = foodCssFilterFor(item.id);
  }
  return icon;
}
