import { htmlElement, htmlImage, installHtmlInputShield, playHtmlPageTransition } from "./dom";

export type PageScreenMeta = {
  title: string;
  subtitle: string;
  icon: string;
};

export type PageOverlayScreen = "menu" | "games" | "album" | "goals" | "settings";
export type PageOverlayHiddenScreen = "tank" | "store" | "prize" | "makeup";
export type PageOverlayAppScreen = PageOverlayScreen | PageOverlayHiddenScreen;

export type PageScreenMetaInput = {
  screen: PageOverlayScreen;
  fishCount: string;
  helperCount: string;
  dailyGoalsDate: string;
};

export type PageButtonFactory = (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;

export type PageOverlaySyncInput = {
  activeScreen: PageOverlayAppScreen;
  overlay: HTMLDivElement | undefined;
  renderKey: string;
  scrollTop: number;
  reducedMotion: boolean;
  forceTransition?: boolean;
  createOverlay: () => HTMLDivElement;
  createPage: () => HTMLElement;
  getRenderKey: () => string;
};

export type PageOverlaySyncResult = {
  overlay: HTMLDivElement | undefined;
  renderKey: string;
  scrollTop: number;
};

export type PageShellContentInput = {
  activeScreen: PageOverlayScreen;
  meta: PageScreenMeta;
  closeButton: HTMLButtonElement;
  appendMainMenuPage: (content: HTMLElement) => void;
  appendGamesPage: (content: HTMLElement) => void;
  appendAlbumPage: (content: HTMLElement) => void;
  appendGoalsPage: (content: HTMLElement) => void;
  appendSettingsPage: (content: HTMLElement) => void;
};

export function pageScreenMeta(input: PageScreenMetaInput): PageScreenMeta {
  const meta: Record<PageOverlayScreen, PageScreenMeta> = {
    menu: {
      title: "Menu",
      subtitle: "Choose where to go",
      icon: "/assets/ui/menu/menu_tank_hub_icon.png"
    },
    games: {
      title: "Games",
      subtitle: "Play mini games",
      icon: "/assets/ui/menu/menu_game_shell.png"
    },
    album: {
      title: "Inventory",
      subtitle: `${input.fishCount} fish | food, coins, and stored prizes`,
      icon: "/assets/ui/book.png"
    },
    goals: {
      title: "Quest",
      subtitle: input.dailyGoalsDate,
      icon: "/assets/ui/goals.png"
    },
    settings: {
      title: "Settings",
      subtitle: "Sounds, wiggles, alerts, and saves",
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

export function shouldShowPageOverlay(screen: PageOverlayAppScreen): screen is PageOverlayScreen {
  return screen === "menu" || screen === "games" || screen === "album" || screen === "goals" || screen === "settings";
}

export function hidePageOverlay(overlay: HTMLDivElement | undefined): void {
  overlay?.classList.add("hidden");
  overlay?.replaceChildren();
}

export function syncPageOverlay(input: PageOverlaySyncInput): PageOverlaySyncResult {
  if (!shouldShowPageOverlay(input.activeScreen)) {
    hidePageOverlay(input.overlay);
    return {
      overlay: input.overlay,
      renderKey: input.renderKey,
      scrollTop: input.scrollTop
    };
  }

  const existingOverlay = input.overlay;
  const overlay = existingOverlay ?? input.createOverlay();
  const wasHidden = !existingOverlay || overlay.classList.contains("hidden") || overlay.childElementCount === 0;
  const previousKey = input.renderKey;
  const scrollTop = capturePageScrollTop(overlay);
  const nextKey = input.getRenderKey();
  overlay.className = "aq-page-shell";
  overlay.classList.remove("hidden");
  overlay.replaceChildren(input.createPage());
  if (input.forceTransition || wasHidden || previousKey !== nextKey) {
    playHtmlPageTransition(overlay, input.reducedMotion);
  }
  installHtmlInputShield(overlay);
  if (previousKey === nextKey && scrollTop > 0) {
    restorePageScrollTop(overlay, scrollTop);
  }

  return {
    overlay,
    renderKey: nextKey,
    scrollTop
  };
}

export function createPageShellContent(input: PageShellContentInput): HTMLElement {
  const { page, content } = createPageShell(input.meta, input.closeButton);
  if (input.activeScreen === "menu") {
    content.classList.add("aq-page-content-main-menu");
    input.appendMainMenuPage(content);
  } else if (input.activeScreen === "games") {
    content.classList.add("aq-page-content-main-menu");
    input.appendGamesPage(content);
  } else if (input.activeScreen === "album") {
    input.appendAlbumPage(content);
  } else if (input.activeScreen === "goals") {
    input.appendGoalsPage(content);
  } else {
    input.appendSettingsPage(content);
  }

  return page;
}

export function createPageEmptyCard(title: string, detail: string): HTMLElement {
  const card = htmlElement("article", "aq-page-card aq-page-empty");
  card.append(htmlElement("h3", "aq-page-card-title", [title]), htmlElement("p", "aq-page-card-copy", [detail]));
  return card;
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
  const page = htmlElement("section", "aq-page aq-kids-page-surface");
  const header = htmlElement("header", "aq-page-header");
  const icon = htmlImage(meta.icon, "", "aq-page-header-icon");
  const titleWrap = htmlElement("div", "min-w-0 flex-1");
  titleWrap.append(
    htmlElement("h1", "aq-page-title", [meta.title]),
    htmlElement("p", "aq-page-subtitle", [meta.subtitle])
  );
  header.append(icon, titleWrap, closeButton);

  const content = htmlElement("div", "aq-page-content aq-kids-panel-groove");
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
