import { fishTypes, foodTypes, helperCreatureTypes } from "../data/content";
import { canAfford, formatNumber, formatPrice } from "../game/economy";
import type { CoinType, FishType, FoodType, HelperCreatureType, Price, Rarity, StoreTab, Wallet } from "../types/mechanics";

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
    const header = el("header", "aq-panel mb-3 p-3");
    const top = el("div", "flex items-start gap-3");
    top.append(
      image("/assets/ui/shop/store_icon.png", "Store", "h-14 w-14 shrink-0 object-contain"),
      div("min-w-0 flex-1", [
        div("text-3xl font-black tracking-wide drop-shadow", ["STORE"]),
        div("mt-0.5 text-xs font-bold text-cyan-100/80", [`${state.activeTankName} L${formatNumber(state.activeTankLevel)} · ${formatNumber(state.fishCount)}/${formatNumber(state.fishCapacity)} fish`])
      ]),
      button("X", "min-h-11 min-w-11 rounded-xl border border-white/25 bg-white/15 text-lg font-black", () => this.actions.close())
    );

    const stats = el("div", "mt-3 grid grid-cols-2 gap-2");
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
    const chip = el("div", "aq-chip flex items-center gap-2");
    chip.append(
      image(iconByKind[kind], labelByKind[kind], "h-7 w-7 object-contain"),
      div("min-w-0", [
        div("text-[10px] leading-none text-cyan-100/65", [labelByKind[kind]]),
        div("text-base leading-tight", [formatNumber(amount)])
      ])
    );
    return chip;
  }

  private tabs(): HTMLElement {
    const tabs: Array<{ tab: StoreTab; label: string; icon: string }> = [
      { tab: "fish", label: "Fish", icon: "/assets/ui/shop/icon_category_fish.png" },
      { tab: "food", label: "Food", icon: "/assets/ui/shop/icon_category_food.png" },
      { tab: "tank", label: "Tanks", icon: "/assets/ui/shop/icon_category_tanks.png" },
      { tab: "creature", label: "Helpers", icon: "/assets/helpers/feeder-snail.png" }
    ];
    const row = el("nav", "mb-3 flex gap-2");
    tabs.forEach((item) => {
      const tabButton = button("", `aq-tab ${this.activeTab === item.tab ? "aq-tab-active" : ""}`, () => {
        this.activeTab = item.tab;
        this.page = 1;
        this.render();
      });
      tabButton.append(image(item.icon, "", "h-6 w-6 object-contain"), document.createTextNode(item.label));
      row.append(tabButton);
    });
    return row;
  }

  private rarityFilters(): HTMLElement {
    if (this.activeTab === "tank") {
      return div("mb-3 min-h-2");
    }

    const filters: Array<{ coin: CoinType; label: string; className: string }> = [
      { coin: "common", label: "Common", className: "border-amber-300/70 text-amber-200" },
      { coin: "rare", label: "Rare", className: "border-cyan-300/70 text-cyan-200" },
      { coin: "superRare", label: "Super", className: "border-fuchsia-300/70 text-fuchsia-200" }
    ];
    const row = el("div", "mb-3 flex gap-2");
    filters.forEach((filter) => {
      row.append(button(filter.label, `aq-rarity ${filter.className} ${this.coinFilter === filter.coin ? "bg-white/15" : "bg-sky-950/55 opacity-75"}`, () => {
        this.coinFilter = filter.coin;
        this.page = 1;
        this.render();
      }));
    });
    return row;
  }

  private catalog(state: StoreOverlayState): HTMLElement {
    const panel = el("main", "aq-panel flex h-[calc(100dvh-250px)] min-h-[420px] flex-col overflow-hidden p-3");
    const content = el("div", "min-h-0 flex-1 overflow-y-auto pr-1");
    const items = this.currentItems(state);
    const pageSize = this.activeTab === "food" ? 4 : 5;
    const maxPage = Math.max(1, Math.ceil(items.length / pageSize));
    this.page = Math.min(this.page, maxPage);
    const pageItems = items.slice((this.page - 1) * pageSize, this.page * pageSize);

    const list = el("div", "grid gap-3");
    if (pageItems.length === 0) {
      list.append(div("rounded-2xl border border-cyan-200/20 bg-sky-950/60 p-6 text-center text-sm font-bold text-cyan-100/80", ["No items in this lane."]));
    } else {
      pageItems.forEach((item) => list.append(this.cardForItem(item, state)));
    }
    content.append(list);

    const pager = el("footer", "mt-3 flex items-center justify-between gap-3");
    pager.append(
      button("<", "min-h-11 min-w-16 rounded-xl border border-cyan-200/30 bg-sky-900/80 text-lg font-black", () => {
        this.page = Math.max(1, this.page - 1);
        this.render();
      }),
      div("text-sm font-black text-cyan-100", [`Page ${formatNumber(this.page)}/${formatNumber(maxPage)}`]),
      button(">", "min-h-11 min-w-16 rounded-xl border border-cyan-200/30 bg-sky-900/80 text-lg font-black", () => {
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
      return foodTypes.filter((food) => food.price.coinType === this.coinFilter);
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
      div("min-w-0", [
        div("flex items-start justify-between gap-2", [
          div("truncate text-xl font-black", [fish.name]),
          this.priceBadge(fish.price)
        ]),
        div("mt-1 text-sm font-bold text-cyan-100/80", [`Owned ${formatNumber(owned)} · ${this.rarityLabel(fish.rarity)}`]),
        div("mt-1 text-sm text-cyan-50/90", [this.productionHint(fish)]),
        button(canAfford(state.wallet, fish.price) ? "Buy Fish" : `Need ${formatPrice(fish.price)}`, "aq-buy mt-3 w-full disabled:opacity-45", () => this.actions.buyFish(fish))
      ])
    );
    return card;
  }

  private foodCard(food: FoodType, state: StoreOverlayState): HTMLElement {
    const quantity = this.quantities.get(food.id) ?? 1;
    const totalPrice = { coinType: food.price.coinType, amount: food.price.amount * quantity };
    const owned = state.foodOwned[food.id] ?? 0;
    const card = this.baseCard(food.rarity);
    const controls = el("div", "mt-3 grid grid-cols-5 gap-2");
    [1, 10, 100, 500, 1000].forEach((amount) => {
      controls.append(button(`+${formatNumber(amount)}`, "aq-qty", () => {
        this.quantities.set(food.id, Math.min(9999, quantity + amount));
        this.render();
      }));
    });
    card.append(
      this.preview(`/assets/food/${food.id}.png`, food.name),
      div("min-w-0", [
        div("flex items-start justify-between gap-2", [
          div("truncate text-xl font-black", [food.name]),
          this.priceBadge(totalPrice)
        ]),
        div("mt-1 text-sm font-bold text-cyan-100/80", [`Owned ${formatNumber(owned)} · ${formatNumber(food.calories)} cal each`]),
        div("mt-2 flex items-center gap-2", [
          button(`Qty ${formatNumber(quantity)}`, "aq-qty flex-1", () => undefined),
          button("Reset", "aq-qty", () => {
            this.quantities.set(food.id, 1);
            this.render();
          })
        ]),
        controls,
        button(canAfford(state.wallet, totalPrice) ? "Buy Food" : `Need ${formatPrice(totalPrice)}`, "aq-buy mt-3 w-full", () => this.actions.buyFood(food, quantity))
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
      div("min-w-0", [
        div("flex items-start justify-between gap-2", [
          div("truncate text-xl font-black", [creature.name]),
          this.priceBadge(creature.price)
        ]),
        div("mt-1 text-sm font-bold text-cyan-100/80", [`Owned ${formatNumber(owned)} · ${creature.feedSeconds ? "Feeder" : "Cleaner"}`]),
        div("mt-1 text-sm text-cyan-50/90", [creature.description]),
        button(canAfford(state.wallet, creature.price) ? "Hire Helper" : `Need ${formatPrice(creature.price)}`, "aq-buy mt-3 w-full", () => this.actions.buyHelper(creature))
      ])
    );
    return card;
  }

  private tankCard(tank: StoreTankCard, state: StoreOverlayState): HTMLElement {
    const owned = tank.owned;
    const card = this.baseCard(owned ? "rare" : "common");
    card.append(
      div("flex h-24 w-24 items-center justify-center rounded-2xl border border-cyan-200/30 bg-cyan-400/15 text-3xl font-black", [`L${formatNumber(tank.displayLevel)}`]),
      div("min-w-0", [
        div("flex items-start justify-between gap-2", [
          div("truncate text-xl font-black", [tank.name]),
          owned ? div("aq-chip text-xs", [tank.active ? "Active" : "Owned"]) : this.priceBadge(tank.price)
        ]),
        div("mt-1 text-sm font-bold text-amber-200", [`Worth ${formatNumber(tank.worth)}`]),
        div("mt-1 text-sm text-cyan-50/90", [`${formatNumber(tank.fishCount)}/${formatNumber(tank.fishCapacity)} fish · ${formatNumber(tank.helperCount)} helpers`]),
        button(tank.active ? "Current Tank" : owned ? "Switch Tank" : canAfford(state.wallet, tank.price) ? "Buy Tank" : `Need ${formatPrice(tank.price)}`, "aq-buy mt-3 w-full", () => {
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
    const wrap = el("div", "flex h-24 w-24 items-center justify-center rounded-full border border-cyan-200/30 bg-cyan-300/10");
    wrap.append(image(src, alt, "max-h-20 max-w-20 object-contain drop-shadow-lg"));
    return wrap;
  }

  private priceBadge(price: Price): HTMLElement {
    const iconByCoin: Record<CoinType, string> = {
      common: "/assets/ui/shop/coin_icon_common.png",
      rare: "/assets/ui/shop/coin_icon_rare.png",
      superRare: "/assets/ui/shop/coin_icon_super_rare.png"
    };
    const badge = el("div", "flex shrink-0 items-center gap-1 rounded-full border border-cyan-200/25 bg-sky-950/80 px-2 py-1 text-sm font-black text-amber-200");
    badge.append(image(iconByCoin[price.coinType], "", "h-5 w-5 object-contain"), document.createTextNode(formatNumber(price.amount)));
    return badge;
  }

  private rarityLabel(rarity: Rarity | CoinType): string {
    return rarity === "superRare" ? "Super Rare" : rarity === "rare" ? "Rare" : "Common";
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
