import { createHtmlButton, htmlElement } from "../dom";

export type QuantityHoldState = {
  delay?: number;
  interval?: number;
  pointerStarted: boolean;
};

export function createQuantityHoldState(): QuantityHoldState {
  return { pointerStarted: false };
}

export function createQuantityHoldButton(
  label: string,
  disabled: boolean,
  holdState: QuantityHoldState,
  onDelta: () => void
): HTMLButtonElement {
  const node = htmlElement("button", "aq-qty aq-qty-step") as HTMLButtonElement;
  node.type = "button";
  node.textContent = label;
  node.disabled = disabled;

  const stop = (): void => stopQuantityHold(holdState);
  const start = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    if (node.disabled) {
      return;
    }

    holdState.pointerStarted = event.type === "pointerdown";
    onDelta();
    stopQuantityHold(holdState);
    holdState.delay = window.setTimeout(() => {
      holdState.interval = window.setInterval(onDelta, 70);
    }, 320);
    window.addEventListener("pointerup", stop, { once: true });
    window.addEventListener("pointercancel", stop, { once: true });
  };

  node.addEventListener("pointerdown", start);
  node.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (holdState.pointerStarted) {
      holdState.pointerStarted = false;
      return;
    }
    if (!node.disabled) {
      onDelta();
    }
  });
  node.addEventListener("contextmenu", (event) => event.preventDefault());
  return node;
}

export function createQuantityValue(value: string): HTMLElement {
  return htmlElement("div", "aq-qty aq-qty-value", [value]);
}

export function stopQuantityHold(holdState: QuantityHoldState): void {
  if (holdState.delay !== undefined) {
    window.clearTimeout(holdState.delay);
    holdState.delay = undefined;
  }
  if (holdState.interval !== undefined) {
    window.clearInterval(holdState.interval);
    holdState.interval = undefined;
  }
}

export function createPlainButton(label: string, className: string, onClick: () => void, disabled = false): HTMLButtonElement {
  return createHtmlButton(label, className, onClick, { disabled });
}
