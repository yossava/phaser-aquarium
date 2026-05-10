import { fishTypes, foodTypes, helperCreatureTypes } from "../data/content";
import { canAfford, formatNumber, formatPrice } from "../game/economy";
import type { CoinType, FishType, FoodType, HelperCreatureType, Price, Rarity, StoreTab, Wallet } from "../types/mechanics";

const supplyFoodIds = new Set(["medicine", "ageBoost"]);
const hiddenFoodIds = new Set(["creature"]);
type StoreDecorationSize = "s" | "m" | "l" | "xl";
type TankStoreCategory = "tank" | "background" | "seabed" | "tools" | "decorations";
type StoreBrowseLevel = "categories" | "tankCategories" | "products";

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
  includedWallet: Wallet;
};

export type StoreTankCosmeticCard = {
  kind: "tankCosmetic";
  id: string;
  category: "background" | "seabed";
  name: string;
  owned: boolean;
  active: boolean;
  price: Price;
  previewUrl?: string;
  tint: string;
};

export type StoreTankDecorationCard = {
  kind: "tankDecoration";
  id: string;
  name: string;
  rarity: Rarity;
  texture: string;
  happinessBonus: number;
  price: Price;
  owned: boolean;
  variants: Array<{
    size: StoreDecorationSize;
    label: string;
    owned: number;
    price: Price;
  }>;
};

export type StoreTankUtilityCard = {
  kind: "tankUtility";
  id: string;
  name: string;
  description: string;
  icon: string;
  owned: boolean;
  price: Price;
};

export type StoreOverlayState = {
  wallet: Wallet;
  wealth: number;
  activeTankName: string;
  activeTankLevel: number;
  developerGodMode: boolean;
  fishPurchasesInWindow: number;
  fishPurchaseHourlyLimit: number;
  fishPurchaseRestockLabel: string;
  ageBoostPurchaseAvailable: boolean;
  ageBoostRestockLabel: string;
  fishCount: number;
  fishCapacity: number;
  fishOwned: Record<string, number>;
  foodOwned: Record<string, number>;
  helperOwned: Record<string, number>;
  tankCards: StoreTankCard[];
  tankCosmeticCards: StoreTankCosmeticCard[];
  tankDecorationCards: StoreTankDecorationCard[];
  tankUtilityCards: StoreTankUtilityCard[];
};

type StoreOverlayActions = {
  close: () => void;
  buyFish: (fishType: FishType) => void;
  buyFood: (foodType: FoodType, quantity: number) => void;
  buyHelper: (creatureType: HelperCreatureType) => void;
  buyTank: (level: number) => void;
  switchTank: (level: number) => void;
  buyTankCosmetic: (category: StoreTankCosmeticCard["category"], id: string) => void;
  switchTankCosmetic: (category: StoreTankCosmeticCard["category"], id: string) => void;
  buyTankDecoration: (decorationId: string, size: StoreDecorationSize) => void;
  selectTankDecoration: (decorationId: string, size: StoreDecorationSize) => void;
  buyTankUtility: (utilityId: string) => void;
};

export class StoreOverlay {
  private readonly root: HTMLDivElement;
  private activeTab: StoreTab = "fish";
  private tankCategory: TankStoreCategory = "tank";
  private browseLevel: StoreBrowseLevel = "categories";
  private coinFilter: CoinType = "common";
  private page = 1;
  private quantities = new Map<string, number>();
  private quantityHoldDelay?: number;
  private quantityHoldInterval?: number;
  private visible = false;
  private lastRenderKey = "";
  private readonly scrollPositions = new Map<string, number>();

  constructor(
    private readonly getState: () => StoreOverlayState,
    private readonly actions: StoreOverlayActions
  ) {
    this.root = document.createElement("div");
    this.root.className = "aq-store-shell hidden";
    document.body.appendChild(this.root);
  }

  show(): void {
    if (this.visible) {
      this.root.classList.remove("hidden");
      this.render();
      return;
    }

    this.visible = true;
    this.browseLevel = "categories";
    this.page = 1;
    this.root.classList.remove("hidden");
    this.render();
  }

  hide(): void {
    this.visible = false;
    this.stopQuantityHold();
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
    const currentScroll = this.root.querySelector(".aq-store-list-scroll");
    const previousKey = this.lastRenderKey;
    if (currentScroll instanceof HTMLElement) {
      this.scrollPositions.set(previousKey, currentScroll.scrollTop);
    }

    const state = this.getState();
    this.page = Math.max(1, this.page);
    const nextKey = this.renderKey();
    this.lastRenderKey = nextKey;
    this.root.replaceChildren(this.createStore(state));
    const nextScrollTop = previousKey === nextKey ? this.scrollPositions.get(nextKey) ?? 0 : 0;
    const nextScroll = this.root.querySelector(".aq-store-list-scroll");
    if (nextScroll instanceof HTMLElement && nextScrollTop > 0) {
      this.restoreScrollPosition(nextScroll, nextScrollTop);
    }
  }

  private restoreScrollPosition(element: HTMLElement, scrollTop: number): void {
    const apply = () => {
      element.scrollTop = scrollTop;
    };
    apply();
    requestAnimationFrame(() => {
      apply();
      requestAnimationFrame(apply);
    });
  }

  private renderKey(): string {
    return `${this.browseLevel}:${this.activeTab}:${this.tankCategory}:${this.coinFilter}`;
  }

  private createStore(state: StoreOverlayState): HTMLElement {
    const shell = el("section", "aq-store");
    shell.append(this.header(state));
    if (this.browseLevel === "categories") {
      shell.append(this.categoryMenu());
    } else if (this.browseLevel === "tankCategories") {
      shell.append(this.drillHeader("Choose Tank Category", "All tank items are grouped here."), this.tankCategoryMenu());
    } else {
      shell.append(this.drillHeader(this.productTitle(), "Choose rarity, then pick an item."), this.rarityFilters(), this.catalog(state));
    }
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

  private categoryMenu(): HTMLElement {
    const tabs: Array<{ tab: StoreTab; label: string; icon: string }> = [
      { tab: "fish", label: "Fish", icon: "/assets/ui/shop/icon_category_fish.png" },
      { tab: "food", label: "Food", icon: "/assets/food/basic.png" },
      { tab: "supply", label: "Medicine", icon: "/assets/food/medicine.png" },
      { tab: "tank", label: "Tanks", icon: "/assets/ui/shop/icon_category_tanks.png" },
      { tab: "creature", label: "Helpers", icon: "/assets/helpers/feeder-snail.png" }
    ];
    const panel = el("main", "aq-panel aq-store-list-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2");
    tabs.forEach((item) => {
      const tabButton = this.categoryCard(item.icon, item.label, this.categoryDescription(item.tab), () => {
        this.activeTab = item.tab;
        this.browseLevel = item.tab === "tank" ? "tankCategories" : "products";
        this.page = 1;
        this.render();
      });
      panel.append(tabButton);
    });
    return panel;
  }

  private categoryDescription(tab: StoreTab): string {
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

  private rarityFilters(): HTMLElement {
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

  private tankCategoryMenu(): HTMLElement {
    const categories: Array<{ category: TankStoreCategory; label: string; icon: string }> = [
      { category: "tank", label: "Tank", icon: "/assets/ui/shop/icon_category_tanks.png" },
      { category: "background", label: "Background", icon: "/assets/ui/shop/rare_star_badge.png" },
      { category: "seabed", label: "Seabed", icon: "/assets/ui/shop/common_star_badge.png" },
      { category: "tools", label: "Tools", icon: "/assets/ui/helper-food-dispenser.png" },
      { category: "decorations", label: "Decor", icon: "/assets/decorations/rock.png" }
    ];
    const panel = el("main", "aq-panel aq-store-list-scroll flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-2");
    categories.forEach((item) => {
      const tabButton = this.categoryCard(item.icon, item.label, this.tankCategoryDescription(item.category), () => {
        this.tankCategory = item.category;
        this.browseLevel = "products";
        this.page = 1;
        this.render();
      });
      panel.append(tabButton);
    });
    return panel;
  }

  private tankCategoryDescription(category: TankStoreCategory): string {
    const descriptions: Record<TankStoreCategory, string> = {
      tank: "Buy another tank slot",
      background: "Change the rear aquarium scene",
      seabed: "Change the sand and floor",
      tools: "Functional aquarium utilities",
      decorations: "Plants, rocks, air stones, and ornaments"
    };
    return descriptions[category];
  }

  private categoryCard(icon: string, title: string, description: string, onClick: () => void): HTMLButtonElement {
    const tabButton = button("", "aq-store-category-card", onClick);
    tabButton.append(
      image(icon, "", "aq-store-category-icon"),
      div("aq-store-category-copy", [
        div("aq-store-category-title", [title]),
        div("aq-store-category-description", [description])
      ]),
      div("aq-store-category-arrow", [">"])
    );
    return tabButton;
  }

  private drillHeader(title: string, subtitle: string): HTMLElement {
    const row = el("div", "mb-1.5 flex shrink-0 items-center gap-2");
    const backTarget: StoreBrowseLevel = this.browseLevel === "products" && this.activeTab === "tank" ? "tankCategories" : "categories";
    row.append(
      button("← BACK", "aq-store-back-button", () => {
        this.browseLevel = backTarget;
        this.page = 1;
        this.render();
      }),
      div("min-w-0 flex-1", [
        div("truncate text-sm font-black leading-tight text-white", [title]),
        div("truncate text-[10px] font-bold text-cyan-100/70", [subtitle])
      ])
    );
    return row;
  }

  private productTitle(): string {
    if (this.activeTab !== "tank") {
      const labels: Record<StoreTab, string> = {
        fish: "Fish",
        food: "Food",
        supply: "Medicine",
        tank: "Tanks",
        decor: "Decor",
        creature: "Helpers"
      };
      return labels[this.activeTab];
    }
    const labels: Record<TankStoreCategory, string> = {
      tank: "Tank",
      background: "Background",
      seabed: "Seabed",
      tools: "Tools",
      decorations: "Decorations"
    };
    return labels[this.tankCategory];
  }

  private catalog(state: StoreOverlayState): HTMLElement {
    const panel = el("main", "aq-panel flex min-h-0 flex-1 flex-col overflow-hidden p-2");
    const content = el("div", "min-h-0 flex-1 overflow-y-auto pr-1 aq-store-list-scroll");
    const items = this.currentItems(state);

    const list = el("div", "aq-store-catalog-list");
    if (items.length === 0) {
      list.append(div("rounded-2xl border border-cyan-200/20 bg-sky-950/60 p-6 text-center text-sm font-bold text-cyan-100/80", ["No items in this lane."]));
    } else {
      items.forEach((item) => list.append(this.cardForItem(item, state)));
    }
    content.append(list);

    panel.append(content);
    return panel;
  }

  private currentItems(state: StoreOverlayState): Array<FishType | FoodType | HelperCreatureType | StoreTankCard | StoreTankCosmeticCard | StoreTankDecorationCard | StoreTankUtilityCard> {
    if (this.activeTab === "fish") {
      return fishTypes.filter((fish) => fish.price.coinType === this.coinFilter);
    }
    if (this.activeTab === "food") {
      return foodTypes.filter((food) => !hiddenFoodIds.has(food.id) && !supplyFoodIds.has(food.id) && food.price.coinType === this.coinFilter);
    }
    if (this.activeTab === "supply") {
      return foodTypes.filter((food) => !hiddenFoodIds.has(food.id) && supplyFoodIds.has(food.id) && food.price.coinType === this.coinFilter);
    }
    if (this.activeTab === "creature") {
      return helperCreatureTypes.filter((creature) => creature.price.coinType === this.coinFilter);
    }
    const tankItemsByCategory: Record<TankStoreCategory, Array<StoreTankCard | StoreTankCosmeticCard | StoreTankDecorationCard | StoreTankUtilityCard>> = {
      tank: state.tankCards,
      background: state.tankCosmeticCards.filter((item) => item.category === "background"),
      seabed: state.tankCosmeticCards.filter((item) => item.category === "seabed"),
      tools: state.tankUtilityCards,
      decorations: state.tankDecorationCards
    };
    if (this.tankCategory === "tank") {
      return state.tankCards.filter((tank) => !tank.owned);
    }
    if (this.tankCategory === "background" || this.tankCategory === "seabed") {
      return tankItemsByCategory[this.tankCategory].filter((item) => !item.owned && item.price.coinType === this.coinFilter);
    }
    return tankItemsByCategory[this.tankCategory].filter((item) => item.owned || item.price.coinType === this.coinFilter);
  }

  private cardForItem(item: FishType | FoodType | HelperCreatureType | StoreTankCard | StoreTankCosmeticCard | StoreTankDecorationCard | StoreTankUtilityCard, state: StoreOverlayState): HTMLElement {
    if ("displayLevel" in item) {
      return this.tankCard(item, state);
    }
    if ("kind" in item && item.kind === "tankCosmetic") {
      return this.tankCosmeticCard(item, state);
    }
    if ("kind" in item && item.kind === "tankDecoration") {
      return this.tankDecorationCard(item, state);
    }
    if ("kind" in item && item.kind === "tankUtility") {
      return this.tankUtilityCard(item, state);
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
    const affordable = state.developerGodMode || canAfford(state.wallet, fish.price);
    const levelLocked = !state.developerGodMode && fish.tankLevel > Math.max(1, state.activeTankLevel);
    const hourlyLimitReached = !state.developerGodMode && state.fishPurchasesInWindow >= state.fishPurchaseHourlyLimit;
    const disabled = levelLocked || !affordable || hourlyLimitReached;
    const card = this.baseCard(fish.rarity);
    if (levelLocked) {
      card.classList.add("opacity-70");
    }
    card.append(
      this.preview(`/assets/fish/${fish.id}.png`, fish.name),
      div("aq-card-body", [
        div("aq-card-title-row", [
          div("aq-card-title", [fish.name]),
          this.priceBadge(fish.price)
        ]),
        div("aq-card-meta", [`Owned ${formatNumber(owned)} · ${this.rarityLabel(fish.rarity)} · L${formatNumber(fish.tankLevel)}`]),
        div("aq-card-copy", [this.productionHint(fish)]),
        button(
          levelLocked ? `Need Tank L${formatNumber(fish.tankLevel)}` : hourlyLimitReached ? state.fishPurchaseRestockLabel : affordable ? "Buy Fish" : `Need ${formatPrice(fish.price)}`,
          "aq-buy w-full",
          () => this.actions.buyFish(fish),
          disabled
        )
      ])
    );
    return card;
  }

  private foodCard(food: FoodType, state: StoreOverlayState): HTMLElement {
    const isAgeBoost = food.id === "ageBoost";
    const quantity = isAgeBoost ? 1 : this.quantities.get(food.id) ?? 1;
    const totalPrice = { coinType: food.price.coinType, amount: food.price.amount * quantity };
    const affordable = state.developerGodMode || canAfford(state.wallet, totalPrice);
    const blockedByCooldown = !state.developerGodMode && isAgeBoost && !state.ageBoostPurchaseAvailable;
    const owned = state.foodOwned[food.id] ?? 0;
    const buyLabel = this.activeTab === "supply" ? "Buy Medicine" : "Buy Food";
    const card = this.baseCard(food.rarity);
    const controls = div("aq-food-qty-row", [
      this.quantityHoldButton("-", food.id, -1, quantity <= 1 || isAgeBoost),
      div("aq-qty aq-qty-value", [formatNumber(quantity)]),
      this.quantityHoldButton("+", food.id, 1, isAgeBoost)
    ]);
    const buttonLabel = blockedByCooldown
      ? state.ageBoostRestockLabel
      : affordable
        ? buyLabel
        : `Need ${formatPrice(totalPrice)}`;
    card.append(
      this.preview(`/assets/food/${food.id}.png`, food.name, `aq-food-preview aq-food-tint-${food.id}`),
      div("flex min-w-0 flex-1 flex-col aq-food-card-body", [
        div("flex items-start justify-between gap-1.5", [
          div("min-w-0 truncate text-sm font-black leading-tight", [food.name]),
          this.priceBadge(totalPrice)
        ]),
        div("mt-0.5 truncate text-[10px] font-bold text-cyan-100/80", [`Owned ${formatNumber(owned)} · ${formatNumber(food.calories)} cal each`]),
        controls,
        button(buttonLabel, "aq-buy w-full", () => this.actions.buyFood(food, quantity), !affordable || blockedByCooldown)
      ])
    );
    return card;
  }

  private quantityHoldButton(label: string, foodId: string, delta: number, disabled = false): HTMLButtonElement {
    const node = el("button", "aq-qty aq-qty-step") as HTMLButtonElement;
    node.type = "button";
    node.textContent = label;
    node.disabled = disabled;
    let pointerStarted = false;

    const applyDelta = (): void => {
      this.changeQuantity(foodId, delta);
    };
    const stop = (): void => this.stopQuantityHold();
    const start = (event: Event): void => {
      event.preventDefault();
      event.stopPropagation();
      if (node.disabled) {
        return;
      }
      pointerStarted = event.type === "pointerdown";
      applyDelta();
      this.stopQuantityHold();
      this.quantityHoldDelay = window.setTimeout(() => {
        this.quantityHoldInterval = window.setInterval(applyDelta, 70);
      }, 320);
      window.addEventListener("pointerup", stop, { once: true });
      window.addEventListener("pointercancel", stop, { once: true });
    };

    node.addEventListener("pointerdown", start);
    node.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (pointerStarted) {
        pointerStarted = false;
        return;
      }
      if (!node.disabled) {
        applyDelta();
      }
    });
    node.addEventListener("contextmenu", (event) => event.preventDefault());
    return node;
  }

  private changeQuantity(foodId: string, delta: number): void {
    const current = this.quantities.get(foodId) ?? 1;
    const next = Math.max(1, Math.min(9999, current + delta));
    if (next === current) {
      this.stopQuantityHold();
      return;
    }
    this.quantities.set(foodId, next);
    this.render();
  }

  private stopQuantityHold(): void {
    if (this.quantityHoldDelay !== undefined) {
      window.clearTimeout(this.quantityHoldDelay);
      this.quantityHoldDelay = undefined;
    }
    if (this.quantityHoldInterval !== undefined) {
      window.clearInterval(this.quantityHoldInterval);
      this.quantityHoldInterval = undefined;
    }
  }

  private helperCard(creature: HelperCreatureType, state: StoreOverlayState): HTMLElement {
    const owned = state.helperOwned[creature.id] ?? 0;
    const affordable = state.developerGodMode || canAfford(state.wallet, creature.price);
    const texture = creature.id === "feeder-snail" ? "/assets/helpers/feeder-snail.png" : `/assets/helpers/${creature.id}.png`;
    const card = this.baseCard(creature.rarity);
    card.append(
      this.preview(texture, creature.name),
      div("aq-card-body", [
        div("aq-card-title-row", [
          div("aq-card-title", [creature.name]),
          this.priceBadge(creature.price)
        ]),
        div("aq-card-meta", [`Owned ${formatNumber(owned)} · ${this.helperRole(creature)}`]),
        div("aq-card-copy", [creature.description]),
        button(affordable ? "Hire Helper" : `Need ${formatPrice(creature.price)}`, "aq-buy w-full", () => this.actions.buyHelper(creature), !affordable)
      ])
    );
    return card;
  }

  private tankCard(tank: StoreTankCard, state: StoreOverlayState): HTMLElement {
    const owned = tank.owned;
    const affordable = state.developerGodMode || canAfford(state.wallet, tank.price);
    const card = this.baseCard(owned ? "rare" : "common");
    card.append(
      div("mx-auto flex h-14 w-20 items-center justify-center rounded-2xl border border-cyan-200/30 bg-cyan-400/15 px-2 text-center text-sm font-black leading-tight", [tank.name]),
      div("flex min-w-0 flex-1 flex-col overflow-hidden", [
        div("flex items-start justify-between gap-1.5", [
          div("min-w-0 truncate text-sm font-black leading-tight", [tank.name]),
          owned ? div("aq-chip text-xs", [tank.active ? "Active" : "Owned"]) : this.priceBadge(tank.price)
        ]),
        div("mt-0.5 truncate text-[10px] font-bold text-amber-200", [`Worth ${formatNumber(tank.worth)}`]),
        !owned ? div("mt-0.5 truncate text-[10px] font-bold text-cyan-100/80", [`Includes C${formatNumber(tank.includedWallet.common)} R${formatNumber(tank.includedWallet.rare)} SR${formatNumber(tank.includedWallet.superRare)}`]) : "",
        div("mt-0.5 text-[10px] leading-tight text-cyan-50/90", [`${formatNumber(tank.fishCount)}/${formatNumber(tank.fishCapacity)} fish · ${formatNumber(tank.helperCount)} helpers`]),
        button(tank.active ? "Current Tank" : owned ? "Switch Tank" : affordable ? `Buy ${tank.name}` : `Need ${formatPrice(tank.price)}`, "aq-buy mt-auto w-full", () => {
          owned ? this.actions.switchTank(tank.level) : this.actions.buyTank(tank.level);
        }, !owned && !affordable)
      ])
    );
    return card;
  }

  private tankCosmeticCard(cosmetic: StoreTankCosmeticCard, state: StoreOverlayState): HTMLElement {
    const affordable = state.developerGodMode || canAfford(state.wallet, cosmetic.price);
    const card = this.baseCard(cosmetic.price.coinType);
    const preview = cosmetic.previewUrl
      ? this.preview(cosmetic.previewUrl, cosmetic.name)
      : div("mx-auto flex h-[clamp(54px,14dvh,82px)] w-full shrink-0 items-center justify-center", [
        div("h-14 w-20 rounded-2xl border border-cyan-100/35 shadow-inner")
      ]);
    const swatch = preview.querySelector("div");
    if (!cosmetic.previewUrl && swatch instanceof HTMLElement) {
      swatch.style.background = cosmetic.tint;
    }
    card.append(
      preview,
      div("flex min-w-0 flex-1 flex-col overflow-hidden", [
        div("flex items-start justify-between gap-1.5", [
          div("min-w-0 truncate text-sm font-black leading-tight", [cosmetic.name]),
          cosmetic.owned ? div("aq-chip text-xs", [cosmetic.active ? "Active" : "Owned"]) : this.priceBadge(cosmetic.price)
        ]),
        div("mt-0.5 truncate text-[10px] font-bold text-cyan-100/80", [cosmetic.category === "background" ? "Tank Background" : "Tank Seabed"]),
        div("mt-0.5 line-clamp-2 text-[10px] leading-tight text-cyan-50/90", [cosmetic.owned ? "Install this look on the active tank." : "Buy and install on the active tank."]),
        button(cosmetic.active ? "Current Look" : cosmetic.owned ? "Use Look" : affordable ? "Buy Look" : `Need ${formatPrice(cosmetic.price)}`, "aq-buy mt-auto w-full", () => {
          cosmetic.owned ? this.actions.switchTankCosmetic(cosmetic.category, cosmetic.id) : this.actions.buyTankCosmetic(cosmetic.category, cosmetic.id);
        }, !cosmetic.owned && !affordable)
      ])
    );
    return card;
  }

  private tankDecorationCard(decoration: StoreTankDecorationCard, state: StoreOverlayState): HTMLElement {
    const card = this.baseCard(decoration.rarity);
    card.classList.add("aq-decor-card");
    const controls = el("div", "aq-decor-size-grid");
    decoration.variants.forEach((variant) => {
      const label = variant.owned > 0
        ? `${variant.label} x${formatNumber(variant.owned)}`
        : `${variant.label} ${formatPrice(variant.price)}`;
      controls.append(
        button(label, "aq-qty", () => {
          variant.owned > 0
            ? this.actions.selectTankDecoration(decoration.id, variant.size)
            : this.actions.buyTankDecoration(decoration.id, variant.size);
        }, variant.owned <= 0 && !state.developerGodMode && !canAfford(state.wallet, variant.price))
      );
    });
    const mediumAffordable = state.developerGodMode || canAfford(state.wallet, decoration.price);
    card.append(
      this.preview(`/assets/decorations/${decoration.id}.png`, decoration.name, "aq-decor-preview"),
      div("aq-decor-card-body", [
        div("flex items-start justify-between gap-1.5", [
          div("min-w-0 truncate text-sm font-black leading-tight", [decoration.name]),
          this.priceBadge(decoration.price)
        ]),
        controls,
        button(mediumAffordable ? "Buy Medium" : `Need ${formatPrice(decoration.price)}`, "aq-buy aq-decor-buy w-full", () => this.actions.buyTankDecoration(decoration.id, "m"), !mediumAffordable)
      ])
    );
    return card;
  }

  private tankUtilityCard(utility: StoreTankUtilityCard, state: StoreOverlayState): HTMLElement {
    const affordable = state.developerGodMode || canAfford(state.wallet, utility.price);
    const card = this.baseCard(utility.price.coinType);
    card.append(
      this.preview(utility.icon, utility.name),
      div("flex min-w-0 flex-1 flex-col overflow-hidden", [
        div("flex items-start justify-between gap-1.5", [
          div("min-w-0 truncate text-sm font-black leading-tight", [utility.name]),
          utility.owned ? div("aq-chip text-xs", ["Owned"]) : this.priceBadge(utility.price)
        ]),
        div("mt-0.5 truncate text-[10px] font-bold text-cyan-100/80", ["Tank Utility"]),
        div("mt-0.5 line-clamp-2 text-[10px] leading-tight text-cyan-50/90", [utility.description]),
        button(utility.owned ? "Installed" : affordable ? "Buy Utility" : `Need ${formatPrice(utility.price)}`, "aq-buy mt-auto w-full", () => {
          if (!utility.owned) {
            this.actions.buyTankUtility(utility.id);
          }
        }, !utility.owned && !affordable)
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

  private preview(src: string, alt: string, className = ""): HTMLElement {
    const wrap = el("div", `aq-card-preview ${className}`.trim());
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
    if (creature.id === "feeder-snail") {
      return "Pet";
    }
    if (creature.tankCleanSeconds) {
      return "Auto Cleaner";
    }
    return creature.habitatTags.includes("collector") ? "Collector" : "Cleaner";
  }

  private productionHint(fish: FishType): string {
    const production = fish.ageCurve.baby.production[0];
    return `Drops ${formatNumber(production.amount)} ${this.rarityLabel(production.coinType)} coins every ${formatNumber(Math.min(10, production.intervalSeconds))}s`;
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

function button(label: string, className: string, onClick: () => void, disabled = false): HTMLButtonElement {
  const node = el("button", className);
  node.type = "button";
  node.disabled = disabled;
  if (label) {
    node.textContent = label;
  }
  node.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!node.disabled) {
      onClick();
    }
  });
  return node;
}
