import { createHtmlButton, htmlElement, shouldSuppressHtmlClick } from "../dom";

export type QuantityHoldState = {
  delay?: number;
  interval?: number;
  pointerStarted: boolean;
  releaseController?: AbortController;
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
    stopQuantityHold(holdState);
    onDelta();
    holdState.delay = window.setTimeout(() => {
      holdState.interval = window.setInterval(onDelta, 70);
    }, 320);
    holdState.releaseController = new AbortController();
    const releaseOptions = { capture: true, once: true, signal: holdState.releaseController.signal };
    window.addEventListener("pointerup", stop, releaseOptions);
    window.addEventListener("pointercancel", stop, releaseOptions);
    window.addEventListener("blur", stop, releaseOptions);
    document.addEventListener("visibilitychange", stop, releaseOptions);
  };

  node.addEventListener("pointerdown", start);
  node.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (holdState.pointerStarted) {
      holdState.pointerStarted = false;
      return;
    }
    if (shouldSuppressHtmlClick()) {
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
  if (holdState.releaseController !== undefined) {
    holdState.releaseController.abort();
    holdState.releaseController = undefined;
  }
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
