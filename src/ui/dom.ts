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
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (button.disabled) {
      return;
    }
    onClick();
    options.afterClick?.();
  });
  return button;
}
