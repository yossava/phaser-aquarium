import { foodAssetPath } from "../data/content";
import { canAfford, formatNumber, formatPrice } from "../game/economy";
import { foodCssFilterFor } from "../game/visuals";
import { isPhaseOneStoreFish, isPhaseOneStoreFood } from "../game/store-catalog";
import type { FishType, FoodType, HelperCreatureType, StoreTab } from "../types/mechanics";
import { createHtmlButton, htmlElement, installHtmlInputShield, playHtmlPageTransition } from "./dom";
import { currentStoreItems, storeItemTier } from "./store/StoreCatalogItems";
import { createStoreBaseCard, createStorePreview, createStorePriceBadge, helperRole } from "./store/StoreCardParts";
import {
  createStoreCategoryMenu,
  createStoreDrillHeader,
  createTankCategoryMenu,
  storeProductTitle,
  type StoreBrowseLevel,
  type TankStoreCategory
} from "./store/StoreNavigation";
import { createStoreHeader } from "./store/StoreHeader";
import type {
  StoreCatalogItem,
  StoreDecorationSize,
  StoreOverlayState,
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
  buyTankCosmetic: (category: StoreTankCosmeticCard["category"], id: string) => void;
  switchTankCosmetic: (category: StoreTankCosmeticCard["category"], id: string) => void;
  buyTankDecoration: (decorationId: string, size: StoreDecorationSize) => void;
  selectTankDecoration: (decorationId: string, size: StoreDecorationSize) => void;
  buyTankUtility: (utilityId: string) => void;
};

export class StoreOverlay {
  private readonly root: HTMLDivElement;
  private readonly ownsRoot: boolean;
  private activeTab: StoreTab = "fish";
  private tankCategory: TankStoreCategory = "background";
  private browseLevel: StoreBrowseLevel = "categories";
  private page = 1;
  private visible = false;
  private lastRenderKey = "";
  private lastStateSignature = "";
  private scrollActive = false;
  private pendingRender = false;
  private scrollIdleTimer: number | undefined;
  private readonly scrollPositions = new Map<string, number>();

  constructor(
    private readonly getState: () => StoreOverlayState,
    private readonly actions: StoreOverlayActions,
    private readonly reducedMotion = false,
    root?: HTMLDivElement
  ) {
    this.root = root ?? document.createElement("div");
    this.ownsRoot = !root;
    this.root.className = "aq-store-shell hidden";
    const stopEvent = (event: Event) => {
      event.stopPropagation();
    };
    this.root.addEventListener("pointerdown", stopEvent);
    this.root.addEventListener("pointerup", stopEvent);
    this.root.addEventListener("click", stopEvent);
    if (this.ownsRoot) {
      document.body.appendChild(this.root);
    }
  }

  show(): void {
    this.root.className = "aq-store-shell";
    if (this.visible) {
      this.render(this.root.childElementCount === 0);
      return;
    }

    this.visible = true;
    this.browseLevel = "categories";
    this.page = 1;
    this.render();
  }

  hide(): void {
    this.visible = false;
    this.pendingRender = false;
    this.scrollActive = false;
    this.clearScrollIdleTimer();
    this.root.classList.add("hidden");
    this.root.replaceChildren();
  }

  refresh(): void {
    if (this.visible) {
      this.render();
    }
  }

  destroy(): void {
    this.clearScrollIdleTimer();
    if (this.ownsRoot) {
      this.root.remove();
    }
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
    if (!force && previousKey === nextKey && this.scrollActive) {
      this.pendingRender = true;
      return;
    }

    this.pendingRender = false;
    this.lastRenderKey = nextKey;
    this.lastStateSignature = nextSignature;
    this.root.replaceChildren(this.createStore(state));
    if (previousKey !== nextKey) {
      playHtmlPageTransition(this.root, this.reducedMotion);
    }
    installHtmlInputShield(this.root);
    const nextScrollTop = previousKey === nextKey ? this.scrollPositions.get(nextKey) ?? 0 : 0;
    const nextScroll = this.root.querySelector(".aq-store-list-scroll");
    if (nextScroll instanceof HTMLElement && nextScrollTop > 0) {
      this.restoreScrollPosition(nextScroll, nextScrollTop);
    }
    this.bindScrollActivity(nextScroll);
  }

  private bindScrollActivity(scrollElement: Element | null): void {
    if (!(scrollElement instanceof HTMLElement)) {
      return;
    }

    scrollElement.addEventListener("scroll", () => {
      this.scrollPositions.set(this.lastRenderKey, scrollElement.scrollTop);
      this.scrollActive = true;
      this.clearScrollIdleTimer();
      this.scrollIdleTimer = window.setTimeout(() => {
        this.scrollActive = false;
        this.scrollIdleTimer = undefined;
        if (this.pendingRender && this.visible) {
          this.render();
        }
      }, 180);
    }, { passive: true });
  }

  private clearScrollIdleTimer(): void {
    if (this.scrollIdleTimer === undefined) {
      return;
    }
    window.clearTimeout(this.scrollIdleTimer);
    this.scrollIdleTimer = undefined;
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
    return `${this.browseLevel}:${this.activeTab}:${this.tankCategory}`;
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
      ageBoostRestockLabel: state.ageBoostRestockLabel,
      productionBoostPurchaseAvailable: state.productionBoostPurchaseAvailable,
      productionBoostRestockLabel: state.productionBoostRestockLabel,
      timeCurrentPurchaseAvailable: state.timeCurrentPurchaseAvailable,
      timeCurrentRestockLabel: state.timeCurrentRestockLabel,
      phaseOneShopLimitActive: state.phaseOneShopLimitActive,
      fishCount: state.fishCount,
      fishCapacity: state.fishCapacity,
      fishOwned: recordEntries(state.fishOwned),
      fishRequiredLevels: recordEntries(state.fishRequiredLevels),
      foodOwned: recordEntries(state.foodOwned),
      helperOwned: recordEntries(state.helperOwned),
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
          this.storeDrillHeader(this.productTitle(), "Pick an item."),
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
    const items = currentStoreItems(state, this.activeTab, this.tankCategory);

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
    if ("kind" in item && item.kind === "tankCosmetic") {
      return this.tankCosmeticCard(item, state);
    }
    if ("kind" in item && item.kind === "tankDecoration") {
      return this.tankDecorationCard(item);
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
    const affordable = state.developerGodMode || canAfford(state.wallet, fish.price);
    const requiredLevel = state.fishRequiredLevels[fish.id] ?? fish.tankLevel;
    const powerLevel = Math.max(1, requiredLevel);
    const levelLocked = !state.developerGodMode && requiredLevel > Math.max(1, state.activeTankLevel);
    const hourlyLimitReached = !state.developerGodMode && state.fishPurchasesInWindow >= state.fishPurchaseHourlyLimit;
    const phaseLocked = state.phaseOneShopLimitActive && !isPhaseOneStoreFish(fish);
    const disabled = phaseLocked || levelLocked || !affordable || hourlyLimitReached;
    const card = createStoreBaseCard(fish.rarity);
    if (phaseLocked || levelLocked) {
      card.classList.add("opacity-70");
    }
    const preview = createStorePreview(`/assets/fish/${fish.id}.png`, fish.name, phaseLocked || levelLocked ? "aq-fish-preview-unpurchased" : "");
    if (phaseLocked || levelLocked) {
      preview.querySelector("img")?.classList.remove("drop-shadow-lg");
    }
    card.append(
      preview,
      div("aq-card-body", [
        div("aq-card-title-row", [
          div("aq-card-title", [fish.name]),
          createStorePriceBadge(fish.price)
        ]),
        div("aq-fish-power-inline", [`Power ${formatNumber(powerLevel)}`]),
        button(
          phaseLocked ? "Coming Soon" : levelLocked ? `Tank Level ${formatNumber(requiredLevel)}` : hourlyLimitReached ? state.fishPurchaseRestockLabel : affordable ? "Buy Fish" : `Need ${formatPrice(fish.price)}`,
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
    const isProductionBoost = food.id === "productionBoost";
    const isTimeCurrent = food.id === "timeCurrent";
    const fishPricedSupply = isAgeBoost || isProductionBoost;
    const affordable = state.developerGodMode || fishPricedSupply || canAfford(state.wallet, food.price);
    const blockedByCooldown = !state.developerGodMode && isAgeBoost && !state.ageBoostPurchaseAvailable;
    const blockedByProductionBoostCooldown = !state.developerGodMode && isProductionBoost && !state.productionBoostPurchaseAvailable;
    const blockedByTimeCurrentCooldown = !state.developerGodMode && isTimeCurrent && !state.timeCurrentPurchaseAvailable;
    const blockedByTimeCurrentOwned = !state.developerGodMode && isTimeCurrent && (state.foodOwned[food.id] ?? 0) > 0;
    const phaseLocked = state.phaseOneShopLimitActive && !isPhaseOneStoreFood(food);
    const buyLabel = fishPricedSupply ? "Select Fish" : this.activeTab === "supply" ? `Buy ${isTimeCurrent ? "Boost" : "Supply"}` : "Buy Food";
    const card = createStoreBaseCard(food.rarity);
    if (phaseLocked) {
      card.classList.add("opacity-70");
    }
    const buttonLabel = phaseLocked
      ? "Coming Soon"
      : blockedByCooldown
      ? state.ageBoostRestockLabel
      : blockedByProductionBoostCooldown
        ? state.productionBoostRestockLabel
      : blockedByTimeCurrentOwned
        ? "Use owned first"
      : blockedByTimeCurrentCooldown
        ? state.timeCurrentRestockLabel
      : affordable
        ? buyLabel
        : `Need ${formatPrice(food.price)}`;
    const supplyExplanation = this.foodSupplyExplanation(food.id);
    const preview = createStorePreview(foodAssetPath(food.id), food.name, "aq-food-preview");
    const previewImage = preview.querySelector("img");
    if (previewImage instanceof HTMLImageElement) {
      previewImage.style.filter = foodCssFilterFor(food.id);
    }

    card.append(
      preview,
      div("flex min-w-0 flex-1 flex-col aq-food-card-body", [
        div("flex items-start justify-between gap-1.5", [
          div("aq-card-title", [food.name]),
          fishPricedSupply ? div("aq-store-price-badge", ["By fish"]) : createStorePriceBadge(food.price)
        ]),
        div("aq-food-cal-pill", [isTimeCurrent ? "x2 speed · 10m" : `${formatNumber(food.calories)} cal`]),
        ...(supplyExplanation ? [div(`aq-card-copy ${isTimeCurrent ? "aq-card-copy-full" : ""}`, [supplyExplanation])] : []),
        button(
          buttonLabel,
          "aq-buy w-full",
          () => this.actions.buyFood(food, 1),
          phaseLocked || !affordable || blockedByCooldown || blockedByProductionBoostCooldown || blockedByTimeCurrentCooldown || blockedByTimeCurrentOwned
        )
      ])
    );
    return card;
  }

  private foodSupplyExplanation(foodId: string): string | undefined {
    if (foodId === "medicine") {
      return "Heals sick fish";
    }
    if (foodId === "ageBoost") {
      return "Speeds up growth";
    }
    if (foodId === "productionBoost") {
      return "Boosts coins 30s";
    }
    if (foodId === "timeCurrent") {
      return "2x speed · 10 min";
    }
    return undefined;
  }

  private helperCard(creature: HelperCreatureType, state: StoreOverlayState): HTMLElement {
    const owned = state.helperOwned[creature.id] ?? 0;
    const affordable = state.developerGodMode || canAfford(state.wallet, creature.price);
    const phaseLocked = state.phaseOneShopLimitActive;
    const texture = creature.id === "feeder-snail" ? "/assets/helpers/feeder-snail.png" : `/assets/helpers/${creature.id}.png`;
    const card = createStoreBaseCard(creature.rarity);
    if (phaseLocked) {
      card.classList.add("opacity-70");
    }
    card.append(
      createStorePreview(texture, creature.name),
      div("aq-card-body", [
        div("aq-card-title-row", [
          div("aq-card-title", [creature.name]),
          createStorePriceBadge(creature.price)
        ]),
        div("aq-card-meta", [helperRole(creature)]),
        div("aq-card-copy", [creature.description]),
        button(phaseLocked ? "Coming Soon" : owned > 0 ? `Owned: ${formatNumber(owned)}` : affordable ? "Hire Helper" : `Need ${formatPrice(creature.price)}`, "aq-buy w-full", () => this.actions.buyHelper(creature), phaseLocked || !affordable)
      ])
    );
    return card;
  }

  private tankCosmeticCard(cosmetic: StoreTankCosmeticCard, state: StoreOverlayState): HTMLElement {
    const affordable = state.developerGodMode || canAfford(state.wallet, cosmetic.price);
    const phaseLocked = state.phaseOneShopLimitActive && !cosmetic.owned;
    const card = createStoreBaseCard(storeItemTier("common", cosmetic.price));
    if (phaseLocked) {
      card.classList.add("opacity-70");
    }
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
  div("mt-0.5 truncate text-xs font-bold text-cyan-100/80", [cosmetic.category === "background" ? "Tank Background" : "Tank Seabed"]),
        button(phaseLocked ? "Coming Soon" : cosmetic.active ? "Current Look" : cosmetic.owned ? "Use Look" : affordable ? "Buy Look" : `Need ${formatPrice(cosmetic.price)}`, "aq-buy mt-auto w-full", () => {
          cosmetic.owned ? this.actions.switchTankCosmetic(cosmetic.category, cosmetic.id) : this.actions.buyTankCosmetic(cosmetic.category, cosmetic.id);
        }, phaseLocked || (!cosmetic.owned && !affordable))
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

  private tankDecorationCard(decoration: StoreTankDecorationCard): HTMLElement {
    const card = createStoreBaseCard(decoration.rarity);
    card.classList.add("aq-decor-card");
    if (this.getState().phaseOneShopLimitActive) {
      card.classList.add("opacity-70");
    }
    card.append(
      createStorePreview(`/assets/decorations/${decoration.id}.png`, decoration.name, "aq-decor-preview"),
      div("aq-decor-card-body", [
        div("flex items-start justify-between gap-1.5", [
          div("min-w-0 truncate text-sm font-black leading-tight", [decoration.name]),
          createStorePriceBadge(decoration.price)
        ]),
        div("aq-decor-shop-note", ["Buy and place this in Background mode."])
      ])
    );
    return card;
  }

  private tankUtilityCard(utility: StoreTankUtilityCard, state: StoreOverlayState): HTMLElement {
    const affordable = state.developerGodMode || canAfford(state.wallet, utility.price);
    const phaseLocked = state.phaseOneShopLimitActive && !utility.owned;
    const timed = Boolean(utility.durationLabel);
    const description = timed
      ? `${utility.description} Lasts: ${utility.durationLabel}.`
      : utility.description;
    const shortDescription = description.length > 40 ? `${description.slice(0, 37).trimEnd()}...` : description;
    const purchaseLabel = timed ? "Rent" : "Buy";
    const card = createStoreBaseCard(storeItemTier("common", utility.price));
    if (phaseLocked) {
      card.classList.add("opacity-70");
    }
    card.append(
      createStorePreview(utility.icon, utility.name),
      div("flex min-w-0 flex-1 flex-col overflow-hidden", [
        div("flex items-start justify-between gap-1.5", [
          div("min-w-0 truncate text-sm font-black leading-tight", [utility.name]),
          utility.owned ? div("aq-chip text-xs", ["Owned"]) : createStorePriceBadge(utility.price)
        ]),
  div("mt-0.5 truncate text-xs font-bold text-cyan-100/80", ["Tool"]),
  div("mt-0.5 line-clamp-2 text-xs leading-tight text-cyan-50/90", [shortDescription]),
        button(phaseLocked ? "Coming Soon" : utility.owned ? "Active" : affordable ? purchaseLabel : `Need ${formatPrice(utility.price)}`, "aq-buy mt-auto w-full", () => {
          if (!utility.owned) {
            this.actions.buyTankUtility(utility.id);
          }
        }, phaseLocked || (!utility.owned && !affordable))
      ])
    );
    return card;
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
