import { fishTypes, foodTypes, helperCreatureTypes } from "../data/content";
import { canAfford, formatNumber, formatPrice } from "../game/economy";
import type { CoinType, FishType, FoodType, HelperCreatureType, Price, Rarity, StoreTab, Wallet } from "../types/mechanics";

const supplyFoodIds = new Set(["medicine", "evolve", "creature"]);

export type StoreTankCard = {
  level: number;
  name: string;
  displayLevel: number;
  owned: boolean;
  active: boolean;
  fishCount: number;
  fishCapacity: number;
  helperCount: number;
  worth: number;
  price: Price;
};

export type StoreOverlayState = {
  wallet: Wallet;
  wealth: number;
  activeTankName: string;
  activeTankLevel: number;
  fishCount: number;
  fishCapacity: number;
  fishOwned: Record<string, number>;
  foodOwned: Record<string, number>;
  helperOwned: Record<string, number>;
  tankCards: StoreTankCard[];
};

type StoreOverlayActions = {
  close: () => void;
  buyFish: (fishType: FishType) => void;
  buyFood: (foodType: FoodType, quantity: number) => void;
  buyHelper: (creatureType: HelperCreatureType) => void;
  buyTank: (level: number) => void;
  switchTank: (level: number) => void;
};

export class StoreOverlay {
  private readonly root: HTMLDivElement;
  private activeTab: StoreTab = "fish";
  private coinFilter: CoinType = "common";
  private page = 1;
  private quantities = new Map<string, number>();
  private visible = false;

  constructor(
    private readonly getState: () => StoreOverlayState,
    private readonly actions: StoreOverlayActions
  ) {
    this.root = document.createElement("div");
    this.root.className = "aq-store-shell hidden";
    document.body.appendChild(this.root);
  }

  show(): void {
    this.visible = true;
    this.root.classList.remove("hidden");
    this.render();
  }

  hide(): void {
    this.visible = false;
    this.root.classList.add("hidden");
  }

  refresh(): void {
    if (this.visible) {
      this.render();
    }
  }

  destroy(): void {
    this.root.remove();
  }

  private render(): void {
    const state = this.getState();
    this.page = Math.max(1, this.page);
    this.root.replaceChildren(this.createStore(state));
  }

  private createStore(state: StoreOverlayState): HTMLElement {
    const shell = el("section", "aq-store");
    shell.append(
      this.header(state),
      this.tabs(),
      this.rarityFilters(),
      this.catalog(state)
    );
    return shell;
  }

  private header(state: StoreOverlayState): HTMLElement {
    const header = el("header", "aq-panel mb-1.5 shrink-0 p-2");
    const top = el("div", "flex items-start gap-2");
    top.append(
      image("/assets/ui/shop/store_icon.png", "Store", "h-10 w-10 shrink-0 object-contain"),
      div("min-w-0 flex-1", [
        div("text-2xl font-black leading-none tracking-wide drop-shadow", ["STORE"]),
        div("mt-0.5 text-xs font-bold text-cyan-100/80", [`${state.activeTankName} L${formatNumber(state.activeTankLevel)} · ${formatNumber(state.fishCount)}/${formatNumber(state.fishCapacity)} fish`])
      ]),
      button("X CLOSE", "min-h-9 rounded-xl border border-white/50 bg-red-600 px-2.5 text-xs font-black text-white shadow-lg shadow-red-950/40", () => this.actions.close())
    );

    const stats = el("div", "mt-1.5 grid grid-cols-4 gap-1.5");
    stats.append(
      this.currency("common", state.wallet.common),
      this.currency("rare", state.wallet.rare),
      this.currency("superRare", state.wallet.superRare),
      this.currency("wealth", state.wealth)
    );
    header.append(top, stats);
    return header;
  }

  private currency(kind: CoinType | "wealth", amount: number): HTMLElement {
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
    const chip = el("div", "aq-chip flex items-center gap-1.5");
    chip.append(
      image(iconByKind[kind], labelByKind[kind], "h-5 w-5 object-contain"),
      div("min-w-0", [
        div("text-[10px] leading-none text-cyan-100/65", [labelByKind[kind]]),
        div("text-sm leading-tight", [formatNumber(amount)])
      ])
    );
    return chip;
  }

  private tabs(): HTMLElement {
    const tabs: Array<{ tab: StoreTab; label: string; icon: string }> = [
      { tab: "fish", label: "Fish", icon: "/assets/ui/shop/icon_category_fish.png" },
      { tab: "food", label: "Food", icon: "/assets/ui/shop/icon_category_food.png" },
      { tab: "supply", label: "Supply", icon: "/assets/food/creature.png" },
      { tab: "tank", label: "Tanks", icon: "/assets/ui/shop/icon_category_tanks.png" },
      { tab: "creature", label: "Helpers", icon: "/assets/helpers/feeder-snail.png" }
    ];
    const row = el("nav", "mb-1.5 flex shrink-0 gap-1.5");
    tabs.forEach((item) => {
      const tabButton = button("", `aq-tab ${this.activeTab === item.tab ? "aq-tab-active" : ""}`, () => {
        this.activeTab = item.tab;
        this.page = 1;
        this.render();
      });
      tabButton.append(image(item.icon, "", "h-5 w-5 object-contain"), document.createTextNode(item.label));
      row.append(tabButton);
    });
    return row;
  }

  private rarityFilters(): HTMLElement {
    if (this.activeTab === "tank") {
      return div("mb-1 min-h-1 shrink-0");
    }

    const filters: Array<{ coin: CoinType; label: string; icon: string; className: string }> = [
      { coin: "common", label: "Common", icon: "/assets/ui/shop/common_star_badge.png", className: "border-amber-300/70 text-amber-200" },
      { coin: "rare", label: "Rare", icon: "/assets/ui/shop/rare_star_badge.png", className: "border-cyan-300/70 text-cyan-200" },
      { coin: "superRare", label: "Super", icon: "/assets/ui/shop/super_rare_star_badge.png", className: "border-fuchsia-300/70 text-fuchsia-200" }
    ];
    const row = el("div", "mb-1.5 flex shrink-0 gap-1.5");
    filters.forEach((filter) => {
      const filterButton = button("", `aq-rarity ${filter.className} ${this.coinFilter === filter.coin ? "bg-white/15" : "bg-sky-950/55 opacity-75"}`, () => {
        this.coinFilter = filter.coin;
        this.page = 1;
        this.render();
      });
      filterButton.append(image(filter.icon, "", "h-5 w-5 object-contain drop-shadow"), document.createTextNode(filter.label));
      row.append(filterButton);
    });
    return row;
  }

  private catalog(state: StoreOverlayState): HTMLElement {
    const panel = el("main", "aq-panel flex min-h-0 flex-1 flex-col overflow-hidden p-2");
    const content = el("div", "min-h-0 flex-1 overflow-hidden");
    const items = this.currentItems(state);
    const pageSize = 4;
    const maxPage = Math.max(1, Math.ceil(items.length / pageSize));
    this.page = Math.min(this.page, maxPage);
    const pageItems = items.slice((this.page - 1) * pageSize, this.page * pageSize);

    const list = el("div", "grid h-full min-h-0 grid-cols-2 grid-rows-2 gap-2");
    if (pageItems.length === 0) {
      list.append(div("rounded-2xl border border-cyan-200/20 bg-sky-950/60 p-6 text-center text-sm font-bold text-cyan-100/80", ["No items in this lane."]));
    } else {
      pageItems.forEach((item) => list.append(this.cardForItem(item, state)));
    }
    content.append(list);

    const pager = el("footer", "mt-2 flex shrink-0 items-center justify-between gap-2");
    pager.append(
      button("<", "min-h-9 min-w-14 rounded-xl border border-cyan-200/30 bg-sky-900/80 text-base font-black", () => {
        this.page = Math.max(1, this.page - 1);
        this.render();
      }),
      div("text-xs font-black text-cyan-100", [`Page ${formatNumber(this.page)}/${formatNumber(maxPage)}`]),
      button(">", "min-h-9 min-w-14 rounded-xl border border-cyan-200/30 bg-sky-900/80 text-base font-black", () => {
        this.page = Math.min(maxPage, this.page + 1);
        this.render();
      })
    );
    panel.append(content, pager);
    return panel;
  }

  private currentItems(state: StoreOverlayState): Array<FishType | FoodType | HelperCreatureType | StoreTankCard> {
    if (this.activeTab === "fish") {
      return fishTypes.filter((fish) => fish.price.coinType === this.coinFilter);
    }
    if (this.activeTab === "food") {
      return foodTypes.filter((food) => !supplyFoodIds.has(food.id) && food.price.coinType === this.coinFilter);
    }
    if (this.activeTab === "supply") {
      return foodTypes.filter((food) => supplyFoodIds.has(food.id) && food.price.coinType === this.coinFilter);
    }
    if (this.activeTab === "creature") {
      return helperCreatureTypes.filter((creature) => creature.price.coinType === this.coinFilter);
    }
    return state.tankCards;
  }

  private cardForItem(item: FishType | FoodType | HelperCreatureType | StoreTankCard, state: StoreOverlayState): HTMLElement {
    if ("displayLevel" in item) {
      return this.tankCard(item, state);
    }
    if ("calories" in item) {
      return this.foodCard(item, state);
    }
    if ("feedSeconds" in item || "cleanupSeconds" in item) {
      return this.helperCard(item, state);
    }
    return this.fishCard(item, state);
  }

  private fishCard(fish: FishType, state: StoreOverlayState): HTMLElement {
    const owned = state.fishOwned[fish.id] ?? 0;
    const card = this.baseCard(fish.rarity);
    card.append(
      this.preview(`/assets/fish/${fish.id}.png`, fish.name),
      div("flex min-w-0 flex-1 flex-col overflow-hidden", [
        div("flex items-start justify-between gap-1.5", [
          div("min-w-0 truncate text-sm font-black leading-tight", [fish.name]),
          this.priceBadge(fish.price)
        ]),
        div("mt-0.5 truncate text-[10px] font-bold text-cyan-100/80", [`Owned ${formatNumber(owned)} · ${this.rarityLabel(fish.rarity)}`]),
        div("mt-0.5 line-clamp-2 text-[10px] leading-tight text-cyan-50/90", [this.productionHint(fish)]),
        button(canAfford(state.wallet, fish.price) ? "Buy Fish" : `Need ${formatPrice(fish.price)}`, "aq-buy mt-auto w-full disabled:opacity-45", () => this.actions.buyFish(fish))
      ])
    );
    return card;
  }

  private foodCard(food: FoodType, state: StoreOverlayState): HTMLElement {
    const quantity = this.quantities.get(food.id) ?? 1;
    const totalPrice = { coinType: food.price.coinType, amount: food.price.amount * quantity };
    const owned = state.foodOwned[food.id] ?? 0;
    const buyLabel = this.activeTab === "supply" ? "Buy Supply" : "Buy Food";
    const card = this.baseCard(food.rarity);
    const controls = el("div", "mt-1.5 grid grid-cols-3 gap-1");
    [1, 10, 100, 500, 1000].forEach((amount) => {
      controls.append(button(`+${formatNumber(amount)}`, "aq-qty", () => {
        this.quantities.set(food.id, Math.min(9999, quantity + amount));
        this.render();
      }));
    });
    card.append(
      this.preview(`/assets/food/${food.id}.png`, food.name),
      div("flex min-w-0 flex-1 flex-col overflow-hidden", [
        div("flex items-start justify-between gap-1.5", [
          div("min-w-0 truncate text-sm font-black leading-tight", [food.name]),
          this.priceBadge(totalPrice)
        ]),
        div("mt-0.5 truncate text-[10px] font-bold text-cyan-100/80", [`Owned ${formatNumber(owned)} · ${formatNumber(food.calories)} cal each`]),
        div("mt-1 flex items-center gap-1 text-[10px]", [
          button(`Qty ${formatNumber(quantity)}`, "aq-qty flex-1", () => undefined),
          button("Reset", "aq-qty", () => {
            this.quantities.set(food.id, 1);
            this.render();
          })
        ]),
        controls,
        button(canAfford(state.wallet, totalPrice) ? buyLabel : `Need ${formatPrice(totalPrice)}`, "aq-buy mt-auto w-full", () => this.actions.buyFood(food, quantity))
      ])
    );
    return card;
  }

  private helperCard(creature: HelperCreatureType, state: StoreOverlayState): HTMLElement {
    const owned = state.helperOwned[creature.id] ?? 0;
    const texture = creature.id === "feeder-snail" ? "/assets/helpers/feeder-snail.png" : `/assets/helpers/${creature.id}.png`;
    const card = this.baseCard(creature.rarity);
    card.append(
      this.preview(texture, creature.name),
      div("flex min-w-0 flex-1 flex-col overflow-hidden", [
        div("flex items-start justify-between gap-1.5", [
          div("min-w-0 truncate text-sm font-black leading-tight", [creature.name]),
          this.priceBadge(creature.price)
        ]),
        div("mt-0.5 truncate text-[10px] font-bold text-cyan-100/80", [`Owned ${formatNumber(owned)} · ${this.helperRole(creature)}`]),
        div("mt-0.5 line-clamp-2 text-[10px] leading-tight text-cyan-50/90", [creature.description]),
        button(canAfford(state.wallet, creature.price) ? "Hire Helper" : `Need ${formatPrice(creature.price)}`, "aq-buy mt-auto w-full", () => this.actions.buyHelper(creature))
      ])
    );
    return card;
  }

  private tankCard(tank: StoreTankCard, state: StoreOverlayState): HTMLElement {
    const owned = tank.owned;
    const card = this.baseCard(owned ? "rare" : "common");
    card.append(
      div("mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/30 bg-cyan-400/15 text-2xl font-black", [`L${formatNumber(tank.displayLevel)}`]),
      div("flex min-w-0 flex-1 flex-col overflow-hidden", [
        div("flex items-start justify-between gap-1.5", [
          div("min-w-0 truncate text-sm font-black leading-tight", [tank.name]),
          owned ? div("aq-chip text-xs", [tank.active ? "Active" : "Owned"]) : this.priceBadge(tank.price)
        ]),
        div("mt-0.5 truncate text-[10px] font-bold text-amber-200", [`Worth ${formatNumber(tank.worth)}`]),
        div("mt-0.5 text-[10px] leading-tight text-cyan-50/90", [`${formatNumber(tank.fishCount)}/${formatNumber(tank.fishCapacity)} fish · ${formatNumber(tank.helperCount)} helpers`]),
        button(tank.active ? "Current Tank" : owned ? "Switch Tank" : canAfford(state.wallet, tank.price) ? "Buy Tank" : `Need ${formatPrice(tank.price)}`, "aq-buy mt-auto w-full", () => {
          owned ? this.actions.switchTank(tank.level) : this.actions.buyTank(tank.level);
        })
      ])
    );
    return card;
  }

  private baseCard(rarity: Rarity): HTMLElement {
    const classByRarity: Record<Rarity, string> = {
      common: "border-emerald-300/45",
      rare: "border-cyan-300/55",
      superRare: "border-fuchsia-300/65"
    };
    return el("article", `aq-card ${classByRarity[rarity]}`);
  }

  private preview(src: string, alt: string): HTMLElement {
    const wrap = el("div", "mx-auto flex h-[clamp(54px,14dvh,82px)] w-full shrink-0 items-center justify-center");
    wrap.append(image(src, alt, "max-h-full max-w-[94%] object-contain drop-shadow-lg"));
    return wrap;
  }

  private priceBadge(price: Price): HTMLElement {
    const iconByCoin: Record<CoinType, string> = {
      common: "/assets/ui/shop/coin_icon_common.png",
      rare: "/assets/ui/shop/coin_icon_rare.png",
      superRare: "/assets/ui/shop/coin_icon_super_rare.png"
    };
    const badge = el("div", "flex shrink-0 items-center gap-0.5 rounded-full border border-cyan-200/25 bg-sky-950/80 px-1.5 py-0.5 text-xs font-black text-amber-200");
    badge.append(image(iconByCoin[price.coinType], "", "h-4 w-4 object-contain"), document.createTextNode(formatNumber(price.amount)));
    return badge;
  }

  private rarityLabel(rarity: Rarity | CoinType): string {
    return rarity === "superRare" ? "Super Rare" : rarity === "rare" ? "Rare" : "Common";
  }

  private helperRole(creature: HelperCreatureType): string {
    if (creature.feedSeconds) {
      return "Feeder";
    }
    if (creature.tankCleanSeconds) {
      return "Auto Cleaner";
    }
    return creature.habitatTags.includes("collector") ? "Collector" : "Cleaner";
  }

  private productionHint(fish: FishType): string {
    const production = fish.ageCurve.baby.production[0];
    return `Drops ${formatNumber(production.amount)} ${this.rarityLabel(production.coinType)} coins every ${formatNumber(production.intervalSeconds)}s`;
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) {
    node.className = className;
  }
  return node;
}

function div(className: string, children: Array<Node | string> = []): HTMLDivElement {
  const node = el("div", className);
  node.append(...children);
  return node;
}

function image(src: string, alt: string, className: string): HTMLImageElement {
  const node = el("img", className);
  node.src = src;
  node.alt = alt;
  node.draggable = false;
  return node;
}

function button(label: string, className: string, onClick: () => void): HTMLButtonElement {
  const node = el("button", className);
  node.type = "button";
  if (label) {
    node.textContent = label;
  }
  node.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return node;
}
