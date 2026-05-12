import { foodAssetPath } from "../data/content";
import { canAfford, formatNumber, formatPrice } from "../game/economy";
import { foodCssFilterFor } from "../game/visuals";
import type { CoinType, FishType, FoodType, HelperCreatureType, Price, StoreTab } from "../types/mechanics";
import { createHtmlButton, htmlElement } from "./dom";
import { currentStoreItems, storeItemTier } from "./store/StoreCatalogItems";
import { createStoreBaseCard, createStorePreview, createStorePriceBadge, helperRole, storeRarityLabel } from "./store/StoreCardParts";
import {
  createStoreCategoryMenu,
  createStoreDrillHeader,
  createStoreRarityFilters,
  createTankCategoryMenu,
  storeProductTitle,
  type StoreBrowseLevel,
  type TankStoreCategory
} from "./store/StoreNavigation";
import {
  createQuantityHoldButton,
  createQuantityHoldState,
  createQuantityValue,
  stopQuantityHold,
  type QuantityHoldState
} from "./store/StoreQuantityControl";
import { createStoreHeader } from "./store/StoreHeader";
import type {
  StoreCatalogItem,
  StoreDecorationSize,
  StoreOverlayState,
  StoreTankCard,
  StoreTankCosmeticCard,
  StoreTankDecorationCard,
  StoreTankUtilityCard
} from "./store/StoreTypes";

export type { StoreOverlayState } from "./store/StoreTypes";

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
  private readonly quantityHoldState: QuantityHoldState = createQuantityHoldState();
  private visible = false;
  private lastRenderKey = "";
  private lastStateSignature = "";
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

  private render(force = false): void {
    const currentScroll = this.root.querySelector(".aq-store-list-scroll");
    const previousKey = this.lastRenderKey;
    if (currentScroll instanceof HTMLElement) {
      this.scrollPositions.set(previousKey, currentScroll.scrollTop);
    }

    const state = this.getState();
    this.page = Math.max(1, this.page);
    const nextKey = this.renderKey();
    const nextSignature = this.stateSignature(state);
    if (!force && previousKey === nextKey && this.lastStateSignature === nextSignature) {
      return;
    }

    this.lastRenderKey = nextKey;
    this.lastStateSignature = nextSignature;
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

  private stateSignature(state: StoreOverlayState): string {
    const recordEntries = (record: Record<string, number>) => Object.entries(record).sort(([left], [right]) => left.localeCompare(right));
    return JSON.stringify({
      wallet: state.wallet,
      wealth: state.wealth,
      activeTankName: state.activeTankName,
      activeTankLevel: state.activeTankLevel,
      developerGodMode: state.developerGodMode,
      fishPurchasesInWindow: state.fishPurchasesInWindow,
      fishPurchaseHourlyLimit: state.fishPurchaseHourlyLimit,
      ageBoostPurchaseAvailable: state.ageBoostPurchaseAvailable,
      fishCount: state.fishCount,
      fishCapacity: state.fishCapacity,
      fishOwned: recordEntries(state.fishOwned),
      foodOwned: recordEntries(state.foodOwned),
      helperOwned: recordEntries(state.helperOwned),
      tankCards: state.tankCards.map((tank) => [
        tank.level,
        tank.owned,
        tank.active,
        tank.fishCount,
        tank.fishCapacity,
        tank.helperCount,
        tank.worth
      ]),
      tankCosmeticCards: state.tankCosmeticCards.map((cosmetic) => [
        cosmetic.id,
        cosmetic.category,
        cosmetic.owned,
        cosmetic.active,
        cosmetic.blueTintIntensity
      ]),
      tankDecorationCards: state.tankDecorationCards.map((decoration) => [
        decoration.id,
        decoration.owned,
        decoration.variants.map((variant) => [variant.size, variant.owned])
      ]),
      tankUtilityCards: state.tankUtilityCards.map((utility) => [utility.id, utility.owned])
    });
  }

  private createStore(state: StoreOverlayState): HTMLElement {
    const shell = el("section", "aq-store");
    shell.append(createStoreHeader(state, () => this.actions.close()));
    if (this.browseLevel === "categories") {
      shell.append(createStoreCategoryMenu((tab) => this.openCategory(tab)));
    } else if (this.browseLevel === "tankCategories") {
      shell.append(
        this.storeDrillHeader("Choose Tank Category", "All tank items are grouped here."),
        createTankCategoryMenu((category) => this.openTankCategory(category))
      );
    } else {
      const productSections = this.activeTab === "food"
        ? [this.storeDrillHeader(this.productTitle(), "Choose food size, then pick an item."), this.catalog(state)]
        : [
          this.storeDrillHeader(this.productTitle(), "Choose rarity, then pick an item."),
          createStoreRarityFilters(this.coinFilter, (coinFilter) => this.setCoinFilter(coinFilter)),
          this.catalog(state)
        ];
      shell.append(...productSections);
    }
    return shell;
  }

  private openCategory(tab: StoreTab): void {
    this.activeTab = tab;
    this.browseLevel = tab === "tank" ? "tankCategories" : "products";
    this.page = 1;
    this.render();
  }

  private openTankCategory(category: TankStoreCategory): void {
    this.tankCategory = category;
    this.browseLevel = "products";
    this.page = 1;
    this.render();
  }

  private setCoinFilter(coinFilter: CoinType): void {
    this.coinFilter = coinFilter;
    this.page = 1;
    this.render();
  }

  private storeDrillHeader(title: string, subtitle: string): HTMLElement {
    const backTarget: StoreBrowseLevel = this.browseLevel === "products" && this.activeTab === "tank" ? "tankCategories" : "categories";
    return createStoreDrillHeader(title, subtitle, () => {
        this.browseLevel = backTarget;
        this.page = 1;
        this.render();
    });
  }

  private productTitle(): string {
    return storeProductTitle(this.activeTab, this.tankCategory);
  }

  private catalog(state: StoreOverlayState): HTMLElement {
    const panel = el("main", "aq-panel flex min-h-0 flex-1 flex-col overflow-hidden p-2");
    const content = el("div", "min-h-0 flex-1 overflow-y-auto pr-1 aq-store-list-scroll");
    const items = currentStoreItems(state, this.activeTab, this.tankCategory, this.coinFilter);

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

  private cardForItem(item: StoreCatalogItem, state: StoreOverlayState): HTMLElement {
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
    const card = createStoreBaseCard(fish.rarity);
    if (levelLocked) {
      card.classList.add("opacity-70");
    }
    card.append(
      createStorePreview(`/assets/fish/${fish.id}.png`, fish.name),
      div("aq-card-body", [
        div("aq-card-title-row", [
          div("aq-card-title", [fish.name]),
          createStorePriceBadge(fish.price)
        ]),
        div("aq-card-meta", [`Owned ${formatNumber(owned)} · ${storeRarityLabel(fish.rarity)} · L${formatNumber(fish.tankLevel)}`]),
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
    const totalPrice: Price = {
      coinType: food.price.coinType,
      amount: food.price.amount * quantity,
      rareAmount: (food.price.rareAmount ?? 0) * quantity || undefined,
      superRareAmount: (food.price.superRareAmount ?? 0) * quantity || undefined
    };
    const affordable = state.developerGodMode || canAfford(state.wallet, totalPrice);
    const blockedByCooldown = !state.developerGodMode && isAgeBoost && !state.ageBoostPurchaseAvailable;
    const owned = state.foodOwned[food.id] ?? 0;
    const metaText = owned > 0
      ? `Owned ${formatNumber(owned)} · ${formatNumber(food.calories)} cal each`
      : `${formatNumber(food.calories)} cal each`;
    const buyLabel = this.activeTab === "supply" ? "Buy Medicine" : "Buy Food";
    const card = createStoreBaseCard(food.rarity);
    const controls = div("aq-food-qty-row", [
      this.quantityHoldButton("-", food.id, -1, quantity <= 1 || isAgeBoost),
      createQuantityValue(formatNumber(quantity)),
      this.quantityHoldButton("+", food.id, 1, isAgeBoost)
    ]);
    const buttonLabel = blockedByCooldown
      ? state.ageBoostRestockLabel
      : affordable
        ? buyLabel
        : `Need ${formatPrice(totalPrice)}`;
    const preview = createStorePreview(foodAssetPath(food.id), food.name, "aq-food-preview");
    const previewImage = preview.querySelector("img");
    if (previewImage instanceof HTMLImageElement) {
      previewImage.style.filter = foodCssFilterFor(food.id);
    }

    card.append(
      preview,
      div("flex min-w-0 flex-1 flex-col aq-food-card-body", [
        div("flex items-start justify-between gap-1.5", [
          div("min-w-0 truncate text-sm font-black leading-tight", [food.name]),
          createStorePriceBadge(totalPrice)
        ]),
        div("mt-0.5 truncate text-[10px] font-bold text-cyan-100/80", [metaText]),
        controls,
        button(buttonLabel, "aq-buy w-full", () => this.actions.buyFood(food, quantity), !affordable || blockedByCooldown)
      ])
    );
    return card;
  }

  private quantityHoldButton(label: string, foodId: string, delta: number, disabled = false): HTMLButtonElement {
    return createQuantityHoldButton(label, disabled, this.quantityHoldState, () => this.changeQuantity(foodId, delta));
  }

  private changeQuantity(foodId: string, delta: number): void {
    const current = this.quantities.get(foodId) ?? 1;
    const next = Math.max(1, Math.min(9999, current + delta));
    if (next === current) {
      this.stopQuantityHold();
      return;
    }
    this.quantities.set(foodId, next);
    this.render(true);
  }

  private stopQuantityHold(): void {
    stopQuantityHold(this.quantityHoldState);
  }

  private helperCard(creature: HelperCreatureType, state: StoreOverlayState): HTMLElement {
    const owned = state.helperOwned[creature.id] ?? 0;
    const affordable = state.developerGodMode || canAfford(state.wallet, creature.price);
    const texture = creature.id === "feeder-snail" ? "/assets/helpers/feeder-snail.png" : `/assets/helpers/${creature.id}.png`;
    const card = createStoreBaseCard(creature.rarity);
    card.append(
      createStorePreview(texture, creature.name),
      div("aq-card-body", [
        div("aq-card-title-row", [
          div("aq-card-title", [creature.name]),
          createStorePriceBadge(creature.price)
        ]),
        div("aq-card-meta", [`Owned ${formatNumber(owned)} · ${helperRole(creature)}`]),
        div("aq-card-copy", [creature.description]),
        button(affordable ? "Hire Helper" : `Need ${formatPrice(creature.price)}`, "aq-buy w-full", () => this.actions.buyHelper(creature), !affordable)
      ])
    );
    return card;
  }

  private tankCard(tank: StoreTankCard, state: StoreOverlayState): HTMLElement {
    const owned = tank.owned;
    const affordable = state.developerGodMode || canAfford(state.wallet, tank.price);
    const card = createStoreBaseCard(owned ? "rare" : "common");
    card.append(
      div("mx-auto flex h-14 w-20 items-center justify-center rounded-2xl border border-cyan-200/30 bg-cyan-400/15 px-2 text-center text-sm font-black leading-tight", [tank.name]),
      div("flex min-w-0 flex-1 flex-col overflow-hidden", [
        div("flex items-start justify-between gap-1.5", [
          div("min-w-0 truncate text-sm font-black leading-tight", [tank.name]),
          owned ? div("aq-chip text-xs", [tank.active ? "Active" : "Owned"]) : createStorePriceBadge(tank.price)
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
    const card = createStoreBaseCard(storeItemTier("common", cosmetic.price));
    const preview = cosmetic.previewUrl
      ? createStorePreview(cosmetic.previewUrl, cosmetic.name)
      : div("relative mx-auto flex h-[clamp(54px,14dvh,82px)] w-full shrink-0 items-center justify-center overflow-hidden rounded-xl", [
        div("h-14 w-20 rounded-2xl border border-cyan-100/35 shadow-inner")
      ]);
    const swatch = preview.querySelector("div");
    if (!cosmetic.previewUrl && swatch instanceof HTMLElement) {
      swatch.style.background = cosmetic.tint;
    }
    const tintPreview = this.blueTintPreviewOverlay(cosmetic.blueTintIntensity);
    preview.append(tintPreview);
    card.append(
      preview,
      div("flex min-w-0 flex-1 flex-col overflow-hidden", [
        div("flex items-start justify-between gap-1.5", [
          div("min-w-0 truncate text-sm font-black leading-tight", [cosmetic.name]),
          cosmetic.owned ? div("aq-chip text-xs", [cosmetic.active ? "Active" : "Owned"]) : createStorePriceBadge(cosmetic.price)
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

  private blueTintPreviewOverlay(intensity: number): HTMLDivElement {
    const overlay = div("aq-blue-tint-preview");
    this.updateBlueTintPreview(overlay, intensity);
    return overlay;
  }

  private updateBlueTintPreview(overlay: HTMLElement, intensity: number): void {
    overlay.style.opacity = String(Math.max(0, Math.min(100, Math.round(intensity))) / 100);
  }

  private tankDecorationCard(decoration: StoreTankDecorationCard, state: StoreOverlayState): HTMLElement {
    const card = createStoreBaseCard(decoration.rarity);
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
      createStorePreview(`/assets/decorations/${decoration.id}.png`, decoration.name, "aq-decor-preview"),
      div("aq-decor-card-body", [
        div("flex items-start justify-between gap-1.5", [
          div("min-w-0 truncate text-sm font-black leading-tight", [decoration.name]),
          createStorePriceBadge(decoration.price)
        ]),
        controls,
        button(mediumAffordable ? "Buy Medium" : `Need ${formatPrice(decoration.price)}`, "aq-buy aq-decor-buy w-full", () => this.actions.buyTankDecoration(decoration.id, "m"), !mediumAffordable)
      ])
    );
    return card;
  }

  private tankUtilityCard(utility: StoreTankUtilityCard, state: StoreOverlayState): HTMLElement {
    const affordable = state.developerGodMode || canAfford(state.wallet, utility.price);
    const card = createStoreBaseCard(storeItemTier("common", utility.price));
    card.append(
      createStorePreview(utility.icon, utility.name),
      div("flex min-w-0 flex-1 flex-col overflow-hidden", [
        div("flex items-start justify-between gap-1.5", [
          div("min-w-0 truncate text-sm font-black leading-tight", [utility.name]),
          utility.owned ? div("aq-chip text-xs", ["Owned"]) : createStorePriceBadge(utility.price)
        ]),
        div("mt-0.5 truncate text-[10px] font-bold text-cyan-100/80", ["Tank Utility"]),
        div("mt-0.5 line-clamp-2 text-[10px] leading-tight text-cyan-50/90", [utility.description]),
        button(utility.owned ? utility.id === "coin-magnet" ? "In Dock" : "Installed" : affordable ? "Buy Utility" : `Need ${formatPrice(utility.price)}`, "aq-buy mt-auto w-full", () => {
          if (!utility.owned) {
            this.actions.buyTankUtility(utility.id);
          }
        }, !utility.owned && !affordable)
      ])
    );
    return card;
  }

  private productionHint(fish: FishType): string {
    const tokenHint = fish.rarity === "common" ? "" : " Rare tokens gate the purchase; production is still Common.";
    return `Converts fullness into Common coins every 5-30s.${tokenHint}`;
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className = ""): HTMLElementTagNameMap[K] {
  return htmlElement(tag, className);
}

function div(className: string, children: Array<Node | string> = []): HTMLDivElement {
  return htmlElement("div", className, children);
}

function button(label: string, className: string, onClick: () => void, disabled = false): HTMLButtonElement {
  return createHtmlButton(label, className, onClick, { disabled });
}
