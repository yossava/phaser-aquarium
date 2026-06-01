import { foodAssetPath } from "../data/content";
import { formatNumber } from "../game/economy";
import { decorationSizes, type DecorationSize } from "../game/tank-catalog";
import { foodCssFilterFor } from "../game/visuals";
import type { CoinType, DecorationType, FishType, FoodType, HelperCreatureType, Price, Wallet } from "../types/mechanics";
import { htmlElement, htmlImage } from "./dom";
import type { ModalAction } from "./modal";
import { createSellQuantityModalContent } from "./SellQuantityModal";

export type ModalContent = {
  title: string;
  lines: string[];
  actions: ModalAction[];
  bodyElements?: HTMLElement[];
};

export function createStarterProtectedSellModalContent(input: {
  onClose: () => void;
}): ModalContent {
  return {
    title: "Starter Protected",
    lines: [
      "Keep one fish in the tank."
    ],
    actions: [{ label: "OK", fill: 0x356a35, action: input.onClose }]
  };
}

export function createActiveFishSellConfirmationContent(input: {
  fishType: FishType;
  sellValue: number;
  createValueRow: (label: string, amount: number) => HTMLElement;
  onSell: () => void;
  onCancel: () => void;
}): ModalContent {
  return {
    title: input.fishType.name,
    lines: [],
    actions: sellActions(input.onSell, input.onCancel),
    bodyElements: [
      fishPreview(input.fishType),
      ownedLine("Owned x1"),
      input.createValueRow("Receive", input.sellValue)
    ]
  };
}

export function createStoredFishSellConfirmationContent(input: {
  fishType: FishType;
  count: number;
  valueForQuantity: (quantity: number) => number;
  createValueRow: (label: string, amount: number) => HTMLElement;
  attachTouchFeedback: (button: HTMLElement) => void;
  onSell: (quantity: number) => void;
  onCancel: () => void;
}): ModalContent {
  return inventoryQuantityModal({
    title: input.fishType.name,
    preview: fishPreview(input.fishType),
    ownedLabel: `Owned x${formatNumber(input.count)}`,
    maxQuantity: input.count,
    valueForQuantity: input.valueForQuantity,
    createValueRow: input.createValueRow,
    attachTouchFeedback: input.attachTouchFeedback,
    onSell: input.onSell,
    onCancel: input.onCancel
  });
}

export function createFoodSellConfirmationContent(input: {
  foodType: FoodType;
  ownedLabel: string;
  maxQuantity: number;
  valueForQuantity: (quantity: number) => number;
  createValueRow: (label: string, amount: number) => HTMLElement;
  attachTouchFeedback: (button: HTMLElement) => void;
  onSell: (quantity: number) => void;
  onCancel: () => void;
}): ModalContent {
  const previewImage = htmlImage(foodAssetPath(input.foodType.id), input.foodType.name, "aq-modal-preview-image food");
  previewImage.style.filter = foodCssFilterFor(input.foodType.id);
  return inventoryQuantityModal({
    title: input.foodType.name,
    preview: htmlElement("div", "aq-modal-preview", [previewImage]),
    ownedLabel: input.ownedLabel,
    maxQuantity: input.maxQuantity,
    valueForQuantity: input.valueForQuantity,
    createValueRow: input.createValueRow,
    attachTouchFeedback: input.attachTouchFeedback,
    onSell: input.onSell,
    onCancel: input.onCancel
  });
}

export function createDecorationSellConfirmationContent(input: {
  decorationType: DecorationType;
  size: DecorationSize;
  count: number;
  valueForQuantity: (quantity: number) => number;
  createValueRow: (label: string, amount: number) => HTMLElement;
  attachTouchFeedback: (button: HTMLElement) => void;
  onSell: (quantity: number) => void;
  onCancel: () => void;
}): ModalContent {
  const sizeLabel = decorationSizes[input.size].label;
  return inventoryQuantityModal({
    title: `${input.decorationType.name} ${sizeLabel}`,
    preview: htmlElement("div", "aq-modal-preview", [
      htmlImage(`/assets/decorations/${input.decorationType.id}.png`, input.decorationType.name, "aq-modal-preview-image")
    ]),
    ownedLabel: `Owned x${formatNumber(input.count)}`,
    maxQuantity: input.count,
    valueForQuantity: input.valueForQuantity,
    createValueRow: input.createValueRow,
    attachTouchFeedback: input.attachTouchFeedback,
    onSell: input.onSell,
    onCancel: input.onCancel
  });
}

export function createTankUtilitySellConfirmationContent(input: {
  name: string;
  iconPath: string;
  sellValue: number;
  createValueRow: (label: string, amount: number) => HTMLElement;
  attachTouchFeedback: (button: HTMLElement) => void;
  onSell: (quantity: number) => void;
  onCancel: () => void;
}): ModalContent {
  return inventoryQuantityModal({
    title: input.name,
    preview: htmlElement("div", "aq-modal-preview", [
      htmlImage(input.iconPath, input.name, "aq-modal-preview-image")
    ]),
    ownedLabel: "Owned x1",
    maxQuantity: 1,
    valueForQuantity: () => input.sellValue,
    createValueRow: input.createValueRow,
    attachTouchFeedback: input.attachTouchFeedback,
    onSell: input.onSell,
    onCancel: input.onCancel
  });
}

export function createCoinSellConfirmationContent(input: {
  coinType: "rare" | "superRare";
  count: number;
  coinAssetPath: string;
  valueForQuantity: (quantity: number) => number;
  createValueRow: (label: string, amount: number) => HTMLElement;
  attachTouchFeedback: (button: HTMLElement) => void;
  onSell: (quantity: number) => void;
  onCancel: () => void;
}): ModalContent {
  const label = input.coinType === "rare" ? "Rare Coin" : "Super Rare Diamond";
  return inventoryQuantityModal({
    title: label,
    preview: htmlElement("div", "aq-modal-preview", [
      htmlImage(input.coinAssetPath, label, "aq-modal-preview-image")
    ]),
    ownedLabel: `Owned x${formatNumber(input.count)}`,
    maxQuantity: input.count,
    valueForQuantity: input.valueForQuantity,
    createValueRow: input.createValueRow,
    attachTouchFeedback: input.attachTouchFeedback,
    onSell: input.onSell,
    onCancel: input.onCancel
  });
}

export function createHelperSellConfirmationContent(input: {
  helperType: HelperCreatureType;
  sellPrice: Price;
  createPriceRow: (price: Price, label: string) => HTMLElement;
  onSell: () => void;
  onCancel: () => void;
}): ModalContent {
  return {
    title: input.helperType.name,
    lines: [],
    actions: sellActions(input.onSell, input.onCancel),
    bodyElements: [
      htmlElement("div", "aq-modal-preview", [
        htmlImage(helperPreviewPath(input.helperType.id), input.helperType.name, "aq-modal-preview-image")
      ]),
      ownedLine("Owned x1"),
      input.createPriceRow(input.sellPrice, "Receive")
    ]
  };
}

export function createOfflineSummaryContent(input: {
  minutesAway: number;
  earned: Wallet;
  cleanliness: number;
  coinAssetPathByType: Record<CoinType, string>;
  createWalletRow: (label: string, wallet: Wallet) => HTMLElement;
}): HTMLElement[] {
  const earnedEntries = (Object.entries(input.earned) as Array<[CoinType, number]>).filter(([, amount]) => amount > 0);
  const previewCoins = earnedEntries.length > 0 ? earnedEntries : [["common", 0] as [CoinType, number]];
  return [
    htmlElement("div", "aq-modal-preview aq-modal-coin-preview", previewCoins.map(([coinType, amount]) =>
      htmlElement("span", "aq-modal-coin-preview-item", [
        htmlImage(input.coinAssetPathByType[coinType], coinType, "aq-modal-preview-image coin"),
        htmlElement("strong", "", [formatNumber(amount)])
      ])
    )),
    input.createWalletRow("Earned", input.earned),
    ownedLine(`Away ${formatNumber(input.minutesAway)} min`),
    ownedLine(`Clean ${formatNumber(Math.round(input.cleanliness))}%`)
  ];
}

export function createResetConfirmationModalContent(input: {
  onReset: () => void;
  onCancel: () => void;
}): ModalContent {
  return {
    title: "Start Over",
    lines: [
      "Clear your aquarium and start fresh?"
    ],
    actions: [
      { label: "Start Over", fill: 0x76512d, action: input.onReset },
      { label: "Cancel", fill: 0x254d68, action: input.onCancel }
    ]
  };
}

function inventoryQuantityModal(input: {
  title: string;
  preview: HTMLElement;
  ownedLabel: string;
  maxQuantity: number;
  valueForQuantity: (quantity: number) => number;
  createValueRow: (label: string, amount: number) => HTMLElement;
  attachTouchFeedback: (button: HTMLElement) => void;
  onSell: (quantity: number) => void;
  onCancel: () => void;
}): ModalContent {
  const { bodyElements, actions } = createSellQuantityModalContent(input);
  return {
    title: input.title,
    lines: [],
    actions,
    bodyElements
  };
}

function fishPreview(fishType: FishType): HTMLElement {
  return htmlElement("div", "aq-modal-preview", [
    htmlImage(`/assets/fish/${fishType.id}.png`, fishType.name, "aq-modal-preview-image fish")
  ]);
}

function ownedLine(label: string): HTMLElement {
  return htmlElement("p", "aq-modal-owned-line", [label]);
}

function sellActions(onSell: () => void, onCancel: () => void): ModalAction[] {
  return [
    { label: "SELL NOW", fill: 0x76512d, action: onSell },
    { label: "Cancel", fill: 0x254d68, action: onCancel }
  ];
}

function helperPreviewPath(helperTypeId: string): string {
  return helperTypeId === "feeder-snail" ? "/assets/helpers/feeder-snail.png" : `/assets/helpers/${helperTypeId}.png`;
}
