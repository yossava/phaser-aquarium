export function htmlElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  className = "",
  children: Array<Node | string> = []
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  if (className) {
    element.className = className;
  }
  element.append(...children);
  return element;
}

export function htmlImage(src: string, alt: string, className: string): HTMLImageElement {
  const image = document.createElement("img");
  image.src = src;
  image.alt = alt;
  image.className = className;
  image.draggable = false;
  return image;
}

export function createHtmlButton(
  label: string,
  className: string,
  onClick: () => void,
  options: {
    disabled?: boolean;
    attachTouchFeedback?: (button: HTMLButtonElement) => void;
    afterClick?: () => void;
  } = {}
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.disabled = Boolean(options.disabled);
  options.attachTouchFeedback?.(button);

  let pointerArmed = false;
  let ignoreNextClick = false;
  const run = (): void => {
    if (button.disabled) {
      return;
    }
    onClick();
    options.afterClick?.();
  };

  button.addEventListener("pointerdown", (event) => {
    event.stopPropagation();
    pointerArmed = !button.disabled && event.isPrimary && event.button === 0;
  });
  button.addEventListener("pointerup", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!pointerArmed || !event.isPrimary) {
      pointerArmed = false;
      return;
    }
    pointerArmed = false;
    ignoreNextClick = true;
    run();
  });
  button.addEventListener("pointercancel", () => {
    pointerArmed = false;
  });
  button.addEventListener("pointerleave", () => {
    pointerArmed = false;
  });
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (ignoreNextClick) {
      ignoreNextClick = false;
      return;
    }
    run();
  });
  return button;
}
