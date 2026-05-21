import { formatNumber } from "../game/economy";
import { levelProgressToNext } from "../game/level-progression";
import { htmlElement, htmlImage } from "./dom";

export type MainMenuItem = {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  badge?: string;
  disabled?: boolean;
};

export type MainMenuStatusItem = {
  icon: string;
  label: string;
  value: string;
  action?: () => void;
  badge?: string;
};

export function appendMainMenuPage(input: {
  content: HTMLElement;
  items: MainMenuItem[];
  statusItems: MainMenuStatusItem[];
  level: number;
  production: number;
  createButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;
}): void {
  input.content.append(createMainMenuStatusGrid(input));
  const grid = htmlElement("div", "aq-main-menu-grid");
  for (const item of input.items) {
    const button = input.createButton("", "aq-main-menu-card aq-kids-card-groove", item.action, item.disabled);
    button.dataset.menu = item.id;
    const iconWrap = htmlElement("span", "aq-main-menu-icon-wrap", [
      htmlImage(item.icon, "", "aq-main-menu-icon")
    ]);
    if (item.badge) {
      iconWrap.append(htmlElement("span", "aq-main-menu-badge", [item.badge]));
    }
    button.append(iconWrap, htmlElement("span", "aq-main-menu-label", [item.label]));
    grid.append(button);
  }
  input.content.append(grid);
}

function createMainMenuStatusGrid(input: {
  statusItems: MainMenuStatusItem[];
  level: number;
  production: number;
  createButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;
}): HTMLElement {
  const grid = htmlElement("div", "aq-main-menu-status-grid");
  grid.append(createMainMenuLevelStatusCard(input.level, input.production));
  input.statusItems.forEach((item) => {
    const card = item.action
      ? input.createButton("", "aq-main-menu-status-card aq-main-menu-status-button", item.action)
      : htmlElement("div", "aq-main-menu-status-card");
    const iconWrap = htmlElement("span", "aq-main-menu-status-icon-wrap", [
      htmlImage(item.icon, "", "aq-main-menu-status-icon")
    ]);
    if (item.badge) {
      iconWrap.append(htmlElement("span", "aq-main-menu-badge aq-main-menu-status-badge", [item.badge]));
    }
    card.append(
      iconWrap,
      htmlElement("span", "aq-main-menu-status-label", [item.label]),
      htmlElement("strong", "aq-main-menu-status-value", [item.value])
    );
    grid.append(card);
  });
  return grid;
}

function createMainMenuLevelStatusCard(level: number, production: number): HTMLElement {
  const progress = levelProgressToNext(level, production);
  const card = htmlElement("div", "aq-main-menu-status-card aq-main-menu-level-card");
  const ring = htmlElement("span", "aq-main-menu-level-ring", [
    htmlElement("strong", "aq-main-menu-level-number", [formatNumber(progress.level)])
  ]);
  ring.style.setProperty("--level-progress", `${Math.round(progress.ratio * 100)}%`);
  card.append(
    ring,
    htmlElement("span", "aq-main-menu-status-label", ["Level"]),
    htmlElement("strong", "aq-main-menu-status-value aq-main-menu-level-percent", [`${formatNumber(progress.percent)}%`])
  );
  return card;
}

export function createDrillMenuCard(input: {
  icon: string;
  label: string;
  description: string;
  action: () => void;
  createButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;
}): HTMLButtonElement {
  const button = input.createButton("", "aq-main-menu-card aq-kids-card-groove", input.action);
  const iconWrap = htmlElement("span", "aq-main-menu-icon-wrap", [
    htmlImage(input.icon, "", "aq-main-menu-icon")
  ]);
  button.append(
    iconWrap,
    htmlElement("span", "aq-main-menu-label", [input.label]),
    htmlElement("span", "aq-drill-menu-description", [input.description])
  );
  return button;
}
