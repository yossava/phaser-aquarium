import { formatNumber, priceComponents } from "../game/economy";
import { createBlueTintPreviewOverlay } from "./TankInventoryCards";
import { htmlElement, htmlImage, shouldSuppressHtmlClick } from "./dom";
import type { MakeupDraft, MakeupSection } from "../game/makeup-mode";
import type { DecorationSize, TankCosmetic } from "../game/tank-catalog";
import type { TankCosmeticCategory } from "../game/tank-state";
import type { CoinType, DecorationType, Price } from "../types/mechanics";

export type MakeupPanelResult = {
  panel: HTMLElement;
  decorationSettings?: HTMLElement;
};

export function createMakeupPanel(input: {
  draft: MakeupDraft;
  totalCostElement: HTMLElement;
  decorationTypes: DecorationType[];
  decorationSizeOrder: DecorationSize[];
  decorationSizeLabel: (size: DecorationSize) => string;
  tankCosmetics: (category: TankCosmeticCategory) => TankCosmetic[];
  selectedCosmetic: (category: TankCosmeticCategory) => TankCosmetic;
  tankCosmeticImageUrl: (asset: TankCosmetic) => string | undefined;
  hexColor: (color: number) => string;
  ownsTankCosmetic: (asset: TankCosmetic) => boolean;
  rarityIconPath: (rarity: string) => string;
  rarityForPrice: (price: Price) => string;
  coinAssetPathByType: Record<CoinType, string>;
  decorationVariantPrice: (decorationType: DecorationType, size: DecorationSize) => Price;
  renderBlueTintIntensity: (category: TankCosmeticCategory, id: string) => number;
  backgroundScrollLeft: number;
  decorScrollLeft: number;
  attachTouchFeedback: (element: HTMLElement, compact?: boolean) => void;
  onApply: () => void;
  onClose: () => void;
  onSetSection: (section: MakeupSection | undefined) => void;
  onSetDecorationTypeIndex: (index: number, restoreScrollLeft: number) => void;
  onAddDecoration: () => void;
  onSetDecorationSize: (size: DecorationSize) => void;
  onMoveSelectedDecorationDepth: (direction: number) => void;
  onRemoveSelectedDecoration: () => void;
  onSetCosmeticIndex: (category: TankCosmeticCategory, index: number, restoreScrollLeft?: number) => void;
  onSetBlueTint: (category: TankCosmeticCategory, intensity: number) => void;
  onBackgroundScroll: (scrollLeft: number) => void;
  onDecorScroll: (scrollLeft: number) => void;
}): MakeupPanelResult {
  const button = makeupButtonFactory(input.attachTouchFeedback);
  const panel = htmlElement("section", "aq-makeup-panel aq-texture-noise");
  panel.append(
    htmlElement("div", "aq-makeup-header", [
      gameSurface(htmlElement("div", "aq-makeup-title-block aq-kids-panel-groove aq-panel border-t-4 border-amber-300", [
        htmlElement("h2", "aq-makeup-title", ["Makeup"]),
        input.totalCostElement
      ])),
      button("Apply", "good", input.onApply),
      button("Close", "danger", input.onClose)
    ])
  );

  if (!input.draft.section) {
    panel.append(createMakeupSectionPicker(input, button));
    return { panel };
  }

  panel.append(button("< Back", "muted aq-makeup-section-back", () => input.onSetSection(undefined)));

  if (input.draft.section === "background" || input.draft.section === "seabed") {
    panel.append(createMakeupCosmeticCardPicker(input, input.draft.section, button));
    return { panel };
  }

  panel.append(createMakeupDecorTools(input, button));
  const decorationSettings = createMakeupSelectedDecorationSettings(input, button);
  if (decorationSettings) {
    panel.append(decorationSettings);
  }
  return { panel, decorationSettings };
}

function createMakeupSectionPicker(
  input: Parameters<typeof createMakeupPanel>[0],
  button: MakeupButtonFactory
): HTMLElement {
  return gameSurface(htmlElement("div", "aq-makeup-section-picker aq-kids-panel-groove aq-panel border-t-4 border-amber-300", [
    createMakeupSectionCard("Background", "/assets/ui/menu/menu_background_icon.png", () => input.onSetSection("background"), button),
    createMakeupSectionCard("Bed", "/assets/ui/menu/menu_seabed_icon.png", () => input.onSetSection("seabed"), button),
    createMakeupSectionCard("Decor", "/assets/decorations/amethyst-cluster.png", () => input.onSetSection("decor"), button)
  ]));
}

function createMakeupSectionCard(label: string, icon: string, action: () => void, button: MakeupButtonFactory): HTMLButtonElement {
  const card = button("", "section-card", action);
  card.append(
    htmlImage(icon, "", "aq-makeup-section-icon"),
    htmlElement("span", "", [label])
  );
  return card;
}

function createMakeupDecorTools(
  input: Parameters<typeof createMakeupPanel>[0],
  button: MakeupButtonFactory
): HTMLElement {
  const strip = htmlElement("div", "aq-makeup-cosmetic-strip aq-makeup-decor-strip");
  strip.scrollLeft = input.decorScrollLeft;
  strip.addEventListener("scroll", () => input.onDecorScroll(strip.scrollLeft), { passive: true });
  window.requestAnimationFrame(() => {
    strip.scrollLeft = input.decorScrollLeft;
  });
  input.decorationTypes.forEach((decorationType, index) => {
    strip.append(createMakeupDecorCard(input, decorationType, index, index === input.draft.selectedDecorationTypeIndex, button));
  });
  return htmlElement("div", "aq-makeup-decor-tools aq-texture-noise", [
    strip,
    button("Add", "good", input.onAddDecoration)
  ]);
}

function createMakeupSelectedDecorationSettings(
  input: Parameters<typeof createMakeupPanel>[0],
  button: MakeupButtonFactory
): HTMLElement | undefined {
  const selectedDecorationIndex = input.draft.selectedDecorationIndex;
  const selectedDecoration = selectedDecorationIndex !== undefined ? input.draft.decorations[selectedDecorationIndex] : undefined;
  if (selectedDecorationIndex === undefined || !selectedDecoration) {
    return undefined;
  }

  return gameSurface(htmlElement("div", "aq-makeup-decoration-settings aq-kids-panel-groove aq-panel border-t-4 border-amber-300", [
    htmlElement("div", "aq-makeup-size-row", [
      ...input.decorationSizeOrder.map((size) =>
        button(
          input.decorationSizeLabel(size),
          selectedDecoration.size === size ? "selected" : "muted",
          () => input.onSetDecorationSize(size)
        )
      )
    ]),
    htmlElement("div", "aq-makeup-depth-row", [
      button("Back", "muted", () => input.onMoveSelectedDecorationDepth(-1), selectedDecorationIndex === 0),
      button("Front", "muted", () => input.onMoveSelectedDecorationDepth(1), selectedDecorationIndex === input.draft.decorations.length - 1),
      button("Remove", "danger", input.onRemoveSelectedDecoration)
    ])
  ]));
}

function createMakeupDecorCard(
  input: Parameters<typeof createMakeupPanel>[0],
  decorationType: DecorationType,
  index: number,
  selected: boolean,
  button: MakeupButtonFactory
): HTMLButtonElement {
  const card = button("", `photo-card aq-kids-card-groove ${selected ? "selected" : ""}`, () =>
    input.onSetDecorationTypeIndex(index, input.decorScrollLeft)
  );
  const preview = hexPreviewSurface(htmlElement("span", "aq-makeup-cosmetic-photo"));
  preview.append(
    htmlImage(`/assets/decorations/${decorationType.id}.png`, "", "aq-makeup-cosmetic-image contain"),
    htmlImage(input.rarityIconPath(decorationType.rarity), "", "aq-makeup-cosmetic-rarity")
  );
  card.append(
    preview,
    htmlElement("span", "aq-makeup-cosmetic-name", [decorationType.name]),
    makeupPriceStatusElement(input.decorationVariantPrice(decorationType, input.draft.selectedSize), input.coinAssetPathByType)
  );
  return card;
}

function createMakeupCosmeticCardPicker(
  input: Parameters<typeof createMakeupPanel>[0],
  category: TankCosmeticCategory,
  button: MakeupButtonFactory
): HTMLElement {
  const cosmetics = input.tankCosmetics(category);
  const selectedAsset = input.selectedCosmetic(category);
  const strip = htmlElement("div", "aq-makeup-cosmetic-strip aq-panel aq-texture-noise");
  const restoreScrollLeft = category === "background" ? input.backgroundScrollLeft : 0;
  strip.scrollLeft = restoreScrollLeft;
  strip.addEventListener("scroll", () => {
    if (category === "background") {
      input.onBackgroundScroll(strip.scrollLeft);
    }
  }, { passive: true });
  window.requestAnimationFrame(() => {
    strip.scrollLeft = category === "background" ? input.backgroundScrollLeft : restoreScrollLeft;
  });
  cosmetics.forEach((asset, index) => {
    strip.append(createMakeupCosmeticCard(input, category, asset, index, asset.id === selectedAsset.id, button));
  });

  return htmlElement("div", "aq-makeup-cosmetic-card-tools", [
    strip,
    gameSurface(makeupTintControl(input, category, "vertical"))
  ]);
}

function createMakeupCosmeticCard(
  input: Parameters<typeof createMakeupPanel>[0],
  category: TankCosmeticCategory,
  asset: TankCosmetic,
  index: number,
  selected: boolean,
  button: MakeupButtonFactory
): HTMLButtonElement {
  const card = button("", `photo-card aq-kids-card-groove ${selected ? "selected" : ""}`, () =>
    input.onSetCosmeticIndex(category, index, category === "background" ? input.backgroundScrollLeft : undefined)
  );
  const imageUrl = input.tankCosmeticImageUrl(asset);
  const preview = hexPreviewSurface(htmlElement("span", "aq-makeup-cosmetic-photo"));
  if (imageUrl) {
    preview.append(htmlImage(imageUrl, "", "aq-makeup-cosmetic-image"));
  } else {
    preview.style.backgroundColor = input.hexColor(asset.tint);
  }
  preview.append(createBlueTintPreviewOverlay(input.renderBlueTintIntensity(category, asset.id)));
  preview.append(htmlImage(input.rarityIconPath(input.rarityForPrice(asset.price)), "", "aq-makeup-cosmetic-rarity"));
  card.append(
    preview,
    htmlElement("span", "aq-makeup-cosmetic-name", [asset.name]),
    makeupCosmeticStatusElement(asset, input)
  );
  return card;
}

function makeupCosmeticStatusElement(asset: TankCosmetic, input: Parameters<typeof createMakeupPanel>[0]): HTMLElement {
  if (input.ownsTankCosmetic(asset)) {
    return htmlElement("span", "aq-makeup-cosmetic-status owned", ["Owned"]);
  }

  return makeupPriceStatusElement(asset.price, input.coinAssetPathByType);
}

function makeupPriceStatusElement(price: Price, coinAssetPathByType: Record<CoinType, string>): HTMLElement {
  const status = htmlElement("span", "aq-makeup-cosmetic-status price");
  for (const [coinType, amount] of priceComponents(price)) {
    status.append(
      htmlElement("span", "aq-makeup-cost-chip", [
        htmlImage(coinAssetPathByType[coinType], coinType, "aq-makeup-cost-icon"),
        htmlElement("strong", "", [formatNumber(amount)])
      ])
    );
  }
  return status;
}

function makeupTintControl(
  input: Parameters<typeof createMakeupPanel>[0],
  category: TankCosmeticCategory,
  orientation: "horizontal" | "vertical" = "horizontal"
): HTMLElement {
  const selectedAsset = input.selectedCosmetic(category);
  const value = Math.round(input.renderBlueTintIntensity(category, selectedAsset.id));
  const valueText = htmlElement("span", "", [`${formatNumber(value)}%`]);
  const rangeInput = document.createElement("input");
  rangeInput.className = `aq-makeup-tint-range ${orientation}`;
  rangeInput.type = "range";
  rangeInput.min = "0";
  rangeInput.max = "100";
  rangeInput.step = "1";
  rangeInput.value = String(value);
  rangeInput.addEventListener("pointerdown", (event) => event.stopPropagation());
  rangeInput.addEventListener("click", (event) => event.stopPropagation());
  rangeInput.addEventListener("input", (event) => {
    event.stopPropagation();
    const nextValue = Number(rangeInput.value);
    valueText.textContent = `${formatNumber(nextValue)}%`;
    input.onSetBlueTint(category, nextValue);
  });
  return htmlElement("label", `aq-makeup-tint-control ${orientation}`, [
    htmlElement("span", "", ["Tint"]),
    rangeInput,
    valueText
  ]);
}

type MakeupButtonFactory = (label: string, tone: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;

function makeupButtonFactory(attachTouchFeedback: (element: HTMLElement, compact?: boolean) => void): MakeupButtonFactory {
  return (label, tone, onClick, disabled = false) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `aq-makeup-button arcade-button ${tone}`;
    button.disabled = disabled;
    button.textContent = label;
    attachTouchFeedback(button, true);
    button.addEventListener("pointerdown", (event) => {
      event.stopPropagation();
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (!shouldSuppressHtmlClick() && !button.disabled) {
        onClick();
      }
    });
    return button;
  };
}

function gameSurface<T extends HTMLElement>(element: T): T {
  element.style.backdropFilter = "none";
  return element;
}

function hexPreviewSurface<T extends HTMLElement>(element: T): T {
  element.classList.add("aq-kids-card-groove");
  element.style.backdropFilter = "none";
  element.style.boxShadow = "inset 0 2px 0 rgba(255,255,255,0.18), inset 0 -4px 0 rgba(2,20,36,0.38)";
  return element;
}
