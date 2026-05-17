import Phaser from "phaser";
import { foodAssetPath } from "../../data/content";
import { formatNumber, formatPrice, priceComponents } from "../../game/economy";
import { foodCssFilterFor } from "../../game/visuals";
import type { CoinType, FishType, FoodType, Price } from "../../types/mechanics";
import { createHtmlButton, htmlElement, htmlImage } from "../dom";
import type { ModalAction } from "../modal";
import { createCostChip } from "../PriceRows";

export type StorePurchaseModalContent = {
  bodyElements: HTMLElement[];
  actions: ModalAction[];
};

export function createFishBuyQuantityModalContent(options: {
  fishType: FishType;
  maxQuantity: number;
  owned: number;
  coinAssetPathByType: Record<CoinType, string>;
  quantityPrice: (price: Price, quantity: number) => Price;
  attachTouchFeedback: (button: HTMLButtonElement) => void;
  onBuy: (quantity: number) => void;
  onCancel: () => void;
}): StorePurchaseModalContent {
  const previewImage = htmlImage(`/assets/fish/${options.fishType.id}.png`, options.fishType.name, "aq-modal-preview-image fish");
  if (options.owned <= 0) {
    previewImage.classList.remove("drop-shadow-lg");
  }

  return createBuyQuantityModalContent({
    preview: htmlElement("div", "aq-modal-preview", [previewImage]),
    price: options.fishType.price,
    buyLabel: "BUY NOW",
    initialQuantity: 1,
    maxQuantity: options.maxQuantity,
    disableQuantityButtonsAtOne: false,
    coinAssetPathByType: options.coinAssetPathByType,
    quantityPrice: options.quantityPrice,
    attachTouchFeedback: options.attachTouchFeedback,
    onBuy: options.onBuy,
    onCancel: options.onCancel
  });
}

export function createFoodBuyQuantityModalContent(options: {
  foodType: FoodType;
  initialQuantity: number;
  maxQuantity: number;
  coinAssetPathByType: Record<CoinType, string>;
  quantityPrice: (price: Price, quantity: number) => Price;
  attachTouchFeedback: (button: HTMLButtonElement) => void;
  onBuy: (quantity: number) => void;
  onCancel: () => void;
}): StorePurchaseModalContent {
  const previewImage = htmlImage(foodAssetPath(options.foodType.id), options.foodType.name, "aq-modal-preview-image food");
  previewImage.style.filter = foodCssFilterFor(options.foodType.id);

  return createBuyQuantityModalContent({
    preview: htmlElement("div", "aq-modal-preview", [previewImage]),
    price: options.foodType.price,
    buyLabel: options.foodType.id === "medicine" ? "BUY MEDICINE" : "BUY NOW",
    initialQuantity: options.initialQuantity,
    maxQuantity: options.maxQuantity,
    disableQuantityButtonsAtOne: true,
    coinAssetPathByType: options.coinAssetPathByType,
    quantityPrice: options.quantityPrice,
    attachTouchFeedback: options.attachTouchFeedback,
    onBuy: options.onBuy,
    onCancel: options.onCancel
  });
}

export type StoreFishSelectionCandidate = {
  type: FishType;
  productionBoostUntil: number;
  ageLabel: () => string;
};

export function createGrowthTonicFishModalContent<TFish extends StoreFishSelectionCandidate>(options: {
  candidates: TFish[];
  walletCanAfford: (price: Price) => boolean;
  developerGodMode: boolean;
  priceForFish: (fish: TFish) => Price;
  priceIconRow: (price: Price, label: string) => HTMLElement;
  fishIndex: (fish: TFish) => number;
  createButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;
  attachTouchFeedback: (button: HTMLButtonElement) => void;
  onBuy: (fish: TFish) => void;
  onCancel: () => void;
}): HTMLElement[] {
  return createFishSelectionModalContent({
    candidates: options.candidates,
    titleLines: [
      "Select which fish gets +3 months of growth.",
      "Price is 15% of fish value, from C100 to C15K."
    ],
    selectedFish: options.candidates[0],
    walletCanAfford: options.walletCanAfford,
    developerGodMode: options.developerGodMode,
    priceForFish: options.priceForFish,
    priceElement: (fish) => options.priceIconRow(options.priceForFish(fish), "Price"),
    fishPriceLabel: (fish) => formatPrice(options.priceForFish(fish)),
    fishIndex: options.fishIndex,
    createButton: options.createButton,
    attachTouchFeedback: options.attachTouchFeedback,
    onBuy: options.onBuy,
    onCancel: options.onCancel
  });
}

export function createProductionBoostFishModalContent<TFish extends StoreFishSelectionCandidate>(options: {
  candidates: TFish[];
  availableFish: TFish[];
  now: number;
  walletCanAfford: (price: Price) => boolean;
  developerGodMode: boolean;
  priceForFish: (fish: TFish) => Price;
  fishIndex: (fish: TFish) => number;
  createButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;
  attachTouchFeedback: (button: HTMLButtonElement) => void;
  onBuy: (fish: TFish) => void;
  onCancel: () => void;
}): HTMLElement[] {
  return createFishSelectionModalContent({
    candidates: options.candidates,
    titleLines: [
      "Select which fish gets the boost. Only that fish will eat the pill.",
      "Effect: 5x production speed and 5x fullness use for 30s."
    ],
    selectedFish: options.availableFish[0],
    walletCanAfford: options.walletCanAfford,
    developerGodMode: options.developerGodMode,
    priceForFish: options.priceForFish,
    priceElement: (fish) => htmlElement("p", "aq-modal-line aq-sell-qty-total", [
      `Price ${formatPrice(options.priceForFish(fish))}`
    ]),
    fishPriceLabel: (fish) => fish.productionBoostUntil > options.now ? "Active" : formatPrice(options.priceForFish(fish)),
    fishDisabled: (fish) => fish.productionBoostUntil > options.now,
    fishIndex: options.fishIndex,
    createButton: options.createButton,
    attachTouchFeedback: options.attachTouchFeedback,
    onBuy: options.onBuy,
    onCancel: options.onCancel
  });
}

function createBuyQuantityModalContent(options: {
  preview: HTMLElement;
  price: Price;
  buyLabel: string;
  initialQuantity: number;
  maxQuantity: number;
  disableQuantityButtonsAtOne: boolean;
  coinAssetPathByType: Record<CoinType, string>;
  quantityPrice: (price: Price, quantity: number) => Price;
  attachTouchFeedback: (button: HTMLButtonElement) => void;
  onBuy: (quantity: number) => void;
  onCancel: () => void;
}): StorePurchaseModalContent {
  const maxQuantity = Math.max(1, Math.floor(options.maxQuantity));
  let selectedQuantity = Phaser.Math.Clamp(Math.floor(options.initialQuantity), 1, maxQuantity);
  const quantityText = htmlElement("strong", "aq-sell-qty-value", [formatNumber(selectedQuantity)]);
  const totalText = htmlElement("p", "aq-modal-line aq-modal-price-line aq-sell-qty-total");
  const renderTotalPrice = () => {
    totalText.replaceChildren(htmlElement("span", "", ["Total"]));
    for (const [coinType, amount] of priceComponents(options.quantityPrice(options.price, selectedQuantity))) {
      totalText.append(createCostChip(options.coinAssetPathByType, coinType, amount));
    }
  };
  const update = () => {
    selectedQuantity = Phaser.Math.Clamp(Math.floor(selectedQuantity), 1, maxQuantity);
    quantityText.textContent = formatNumber(selectedQuantity);
    renderTotalPrice();
  };
  const setQuantity = (quantity: number) => {
    selectedQuantity = quantity;
    update();
  };
  const quantityPicker = htmlElement("div", "aq-sell-qty-picker", [
    createHtmlButton("-", "aq-sell-qty-step", () => setQuantity(selectedQuantity - 1), {
      disabled: options.disableQuantityButtonsAtOne && maxQuantity <= 1,
      attachTouchFeedback: options.attachTouchFeedback
    }),
    htmlElement("div", "aq-sell-qty-display", [quantityText]),
    createHtmlButton("+", "aq-sell-qty-step", () => setQuantity(selectedQuantity + 1), {
      disabled: options.disableQuantityButtonsAtOne && maxQuantity <= 1,
      attachTouchFeedback: options.attachTouchFeedback
    })
  ]);
  renderTotalPrice();

  return {
    bodyElements: [
      options.preview,
      quantityPicker,
      totalText
    ],
    actions: [
      { label: options.buyLabel, fill: 0x356a35, action: () => options.onBuy(selectedQuantity) },
      { label: "Cancel", fill: 0x254d68, action: options.onCancel }
    ]
  };
}

function createFishSelectionModalContent<TFish extends StoreFishSelectionCandidate>(options: {
  candidates: TFish[];
  titleLines: string[];
  selectedFish: TFish;
  walletCanAfford: (price: Price) => boolean;
  developerGodMode: boolean;
  priceForFish: (fish: TFish) => Price;
  priceElement: (fish: TFish) => HTMLElement;
  fishPriceLabel: (fish: TFish) => string;
  fishDisabled?: (fish: TFish) => boolean;
  fishIndex: (fish: TFish) => number;
  createButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;
  attachTouchFeedback: (button: HTMLButtonElement) => void;
  onBuy: (fish: TFish) => void;
  onCancel: () => void;
}): HTMLElement[] {
  let selectedFish = options.selectedFish;
  const selectedName = htmlElement("strong", "aq-production-boost-selected", [selectedFish.type.name]);
  const selectedAge = htmlElement("strong", "aq-production-boost-selected", [selectedFish.ageLabel()]);
  const priceText = options.priceElement(selectedFish);
  let buyButton: HTMLButtonElement;
  const grid = htmlElement("div", "aq-production-boost-fish-grid");
  const renderPrice = () => {
    const nextPrice = options.priceElement(selectedFish);
    priceText.replaceChildren(...Array.from(nextPrice.childNodes));
  };
  const updateSelection = () => {
    selectedName.textContent = selectedFish.type.name;
    selectedAge.textContent = selectedFish.ageLabel();
    renderPrice();
    buyButton.disabled = !options.developerGodMode && !options.walletCanAfford(options.priceForFish(selectedFish));
    grid.querySelectorAll("[data-fish-index]").forEach((element) => {
      element.classList.toggle("selected", Number((element as HTMLElement).dataset.fishIndex) === options.fishIndex(selectedFish));
    });
  };

  options.candidates.forEach((fish) => {
    const button = createHtmlButton("", `aq-production-boost-fish ${fish === selectedFish ? "selected" : ""}`, () => {
      selectedFish = fish;
      updateSelection();
    }, {
      disabled: options.fishDisabled?.(fish) ?? false,
      attachTouchFeedback: options.attachTouchFeedback
    });
    button.dataset.fishIndex = String(options.fishIndex(fish));
    button.append(
      htmlImage(`/assets/fish/${fish.type.id}.png`, "", "aq-production-boost-fish-image"),
      htmlElement("span", "aq-production-boost-fish-name", [fish.type.name]),
      htmlElement("span", "aq-production-boost-fish-age", [`Age ${fish.ageLabel()}`]),
      htmlElement("span", "aq-production-boost-fish-price", [options.fishPriceLabel(fish)])
    );
    grid.append(button);
  });

  buyButton = options.createButton("BUY", "aq-modal-button good", () => options.onBuy(selectedFish));
  updateSelection();

  return [
    ...options.titleLines.map((line) => htmlElement("p", "aq-modal-line", [line])),
    grid,
    htmlElement("p", "aq-modal-line", ["Selected: ", selectedName, " | Age ", selectedAge]),
    priceText,
    htmlElement("div", "aq-modal-actions single", [
      buyButton,
      options.createButton("Cancel", "aq-modal-button muted", options.onCancel)
    ])
  ];
}
