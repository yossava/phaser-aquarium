import { htmlElement, htmlImage } from "./dom";

export type PageScreenMeta = {
  title: string;
  subtitle: string;
  icon: string;
};

export type PageOverlayScreen = "album" | "tanks" | "goals" | "settings";

export type PageScreenMetaInput = {
  screen: PageOverlayScreen;
  fishCount: string;
  helperCount: string;
  ownedTankCount: string;
  maxTankCount: string;
  activeTankName: string;
  dailyGoalsDate: string;
};

export type PageTabDefinition<T extends string> = {
  tab: T;
  label: string;
  icon: string;
};

export type PageButtonFactory = (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;

export function pageScreenMeta(input: PageScreenMetaInput): PageScreenMeta {
  const meta: Record<PageOverlayScreen, PageScreenMeta> = {
    album: {
      title: "Inventory",
      subtitle: `${input.fishCount} fish | food, coins, and stored prizes`,
      icon: "/assets/ui/book.png"
    },
    tanks: {
      title: "Tanks",
      subtitle: `${input.ownedTankCount}/${input.maxTankCount} owned | active ${input.activeTankName}`,
      icon: "/assets/ui/shop/icon_category_tanks.png"
    },
    goals: {
      title: "Quest",
      subtitle: input.dailyGoalsDate,
      icon: "/assets/ui/goals.png"
    },
    settings: {
      title: "Settings",
      subtitle: "Audio, motion, notifications, and save controls",
      icon: "/assets/ui/settings.png"
    }
  };

  return meta[input.screen];
}

export function createPageOverlayRoot(): HTMLDivElement {
  const overlay = document.createElement("div");
  overlay.className = "aq-page-shell hidden";
  const stopEvent = (event: Event) => {
    event.stopPropagation();
  };
  overlay.addEventListener("pointerdown", stopEvent);
  overlay.addEventListener("pointerup", stopEvent);
  overlay.addEventListener("click", stopEvent);
  document.body.appendChild(overlay);
  return overlay;
}

export function createPageEmptyCard(title: string, detail: string): HTMLElement {
  const card = htmlElement("article", "aq-page-card aq-page-empty");
  card.append(htmlElement("h3", "aq-page-card-title", [title]), htmlElement("p", "aq-page-card-copy", [detail]));
  return card;
}

export function createPageTabRow<T extends string>(
  tabs: PageTabDefinition<T>[],
  activeTab: T,
  createButton: PageButtonFactory,
  onSelect: (tab: T) => void
): HTMLElement {
  const row = htmlElement("nav", "mb-2 flex shrink-0 gap-1.5");
  tabs.forEach((item) => {
    const tabButton = createButton("", `aq-tab ${activeTab === item.tab ? "aq-tab-active" : ""}`, () => onSelect(item.tab));
    tabButton.append(htmlImage(item.icon, "", "h-5 w-5 object-contain"), document.createTextNode(item.label));
    row.append(tabButton);
  });
  return row;
}

export function createPagePager(
  currentPage: number,
  maxPage: number,
  createButton: PageButtonFactory,
  formatPageNumber: (value: number) => string,
  onChangePage: (direction: number) => void
): HTMLElement {
  const pager = htmlElement("footer", "mt-2 flex shrink-0 items-center justify-between gap-2");
  const buttonClass = "min-h-9 min-w-14 rounded-xl border border-cyan-200/30 bg-sky-900/80 text-base font-black";
  pager.append(
    createButton("<", buttonClass, () => onChangePage(-1)),
    htmlElement("div", "text-xs font-black text-cyan-100", [
      `Page ${formatPageNumber(currentPage)}/${formatPageNumber(maxPage)}`
    ]),
    createButton(">", buttonClass, () => onChangePage(1))
  );
  return pager;
}

export function createPageShell(meta: PageScreenMeta, closeButton: HTMLButtonElement): { page: HTMLElement; content: HTMLDivElement } {
  const page = htmlElement("section", "aq-page");
  const header = htmlElement("header", "aq-page-header");
  const icon = htmlImage(meta.icon, "", "aq-page-header-icon");
  const titleWrap = htmlElement("div", "min-w-0 flex-1");
  titleWrap.append(
    htmlElement("h1", "aq-page-title", [meta.title]),
    htmlElement("p", "aq-page-subtitle", [meta.subtitle])
  );
  header.append(icon, titleWrap, closeButton);

  const content = htmlElement("div", "aq-page-content");
  page.append(header, content);
  return { page, content };
}

export function capturePageScrollTop(root: HTMLElement | undefined): number {
  const scrollSource = root?.querySelector(".aq-page-content-scroll");
  return scrollSource instanceof HTMLElement ? scrollSource.scrollTop : 0;
}

export function restorePageScrollTop(root: HTMLElement, scrollTop: number): void {
  if (scrollTop <= 0) {
    return;
  }

  const nextScroll = root.querySelector(".aq-page-content-scroll");
  if (nextScroll instanceof HTMLElement) {
    requestAnimationFrame(() => {
      nextScroll.scrollTop = scrollTop;
    });
  }
}
