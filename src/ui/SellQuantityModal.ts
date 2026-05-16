import Phaser from "phaser";
import { formatNumber } from "../game/economy";
import { createHtmlButton, htmlElement } from "./dom";
import type { ModalAction } from "./modal";

export type SellQuantityModalContent = {
  bodyElements: HTMLElement[];
  actions: ModalAction[];
};

export function createSellQuantityModalContent(options: {
  preview: HTMLElement;
  ownedLabel: string;
  maxQuantity: number;
  valueForQuantity: (quantity: number) => number;
  createValueRow: (label: string, amount: number) => HTMLElement;
  attachTouchFeedback: (button: HTMLElement) => void;
  onSell: (quantity: number) => void;
  onCancel: () => void;
}): SellQuantityModalContent {
  const maxQuantity = Math.max(1, Math.floor(options.maxQuantity));
  let selectedQuantity = 1;
  const quantityText = htmlElement("strong", "aq-sell-qty-value", [formatNumber(selectedQuantity)]);
  const valueText = options.createValueRow("Receive", options.valueForQuantity(selectedQuantity));
  const update = () => {
    selectedQuantity = Phaser.Math.Clamp(Math.floor(selectedQuantity), 1, maxQuantity);
    quantityText.textContent = formatNumber(selectedQuantity);
    const nextValueText = options.createValueRow("Receive", options.valueForQuantity(selectedQuantity));
    valueText.replaceChildren(...Array.from(nextValueText.childNodes));
  };
  const setQuantity = (quantity: number) => {
    selectedQuantity = quantity;
    update();
  };
  const quantityPicker = htmlElement("div", "aq-sell-qty-picker aq-sell-qty-picker-with-max", [
    createHtmlButton("-", "aq-sell-qty-step", () => setQuantity(selectedQuantity - 1), {
      disabled: maxQuantity <= 1,
      attachTouchFeedback: options.attachTouchFeedback
    }),
    htmlElement("div", "aq-sell-qty-display", [quantityText]),
    createHtmlButton("+", "aq-sell-qty-step", () => setQuantity(selectedQuantity + 1), {
      disabled: maxQuantity <= 1,
      attachTouchFeedback: options.attachTouchFeedback
    }),
    createHtmlButton("MAX", "aq-sell-qty-step aq-sell-qty-max-button", () => setQuantity(maxQuantity), {
      disabled: maxQuantity <= 1,
      attachTouchFeedback: options.attachTouchFeedback
    })
  ]);

  return {
    bodyElements: [
      options.preview,
      htmlElement("p", "aq-modal-owned-line", [options.ownedLabel]),
      quantityPicker,
      valueText
    ],
    actions: [
      { label: "SELL NOW", fill: 0x76512d, action: () => options.onSell(selectedQuantity) },
      { label: "Cancel", fill: 0x254d68, action: options.onCancel }
    ]
  };
}
