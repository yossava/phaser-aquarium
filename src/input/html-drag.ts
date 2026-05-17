export type HtmlDragCleanup = () => void;

export function capturePointerSafely(element: HTMLElement, pointerId: number): void {
  try {
    if (!element.hasPointerCapture(pointerId)) {
      element.setPointerCapture(pointerId);
    }
  } catch {
    // Some browsers reject capture if the pointer is already ending or the node moved.
  }
}

export function releasePointerSafely(element: HTMLElement, pointerId: number): void {
  try {
    if (element.hasPointerCapture(pointerId)) {
      element.releasePointerCapture(pointerId);
    }
  } catch {
    // Cleanup must continue even if capture was already lost.
  }
}

export function moveHtmlDragGhost(ghost: HTMLElement, clientX: number, clientY: number): void {
  ghost.style.transform = `translate(${clientX}px, ${clientY}px) translate(-50%, -50%)`;
}

export function startHtmlPointerDrag(input: {
  event: PointerEvent;
  createGhost: () => HTMLElement;
  cancelActiveDrag?: () => void;
  onStart?: (source: HTMLElement) => void;
  onMove?: (clientX: number, clientY: number, event: PointerEvent) => void;
  onDrop?: (clientX: number, clientY: number) => void;
  onCleanup?: (cleanup: HtmlDragCleanup) => void;
  registerCleanup?: (cleanup: HtmlDragCleanup) => void;
  setDragging?: (dragging: boolean) => void;
  touchingClassName?: string;
}): void {
  const { event } = input;
  event.preventDefault();
  event.stopPropagation();

  const source = event.currentTarget;
  if (!(source instanceof HTMLElement)) {
    return;
  }

  input.cancelActiveDrag?.();
  input.setDragging?.(true);
  capturePointerSafely(source, event.pointerId);

  const touchingClassName = input.touchingClassName ?? "is-touching";
  source.classList.add(touchingClassName);
  input.onStart?.(source);

  const ghost = input.createGhost();
  document.body.appendChild(ghost);
  moveHtmlDragGhost(ghost, event.clientX, event.clientY);

  let ended = false;
  let lastClientX = event.clientX;
  let lastClientY = event.clientY;
  const cleanup = () => {
    if (ended) {
      return;
    }
    ended = true;
    source.removeEventListener("pointermove", onMove);
    source.removeEventListener("pointerup", onDrop);
    source.removeEventListener("pointercancel", onCancel);
    source.removeEventListener("lostpointercapture", onLostCapture);
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onDrop);
    window.removeEventListener("pointercancel", onCancel);
    window.removeEventListener("blur", onCancel);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    releasePointerSafely(source, event.pointerId);
    source.classList.remove(touchingClassName);
    ghost.remove();
    input.setDragging?.(false);
    input.onCleanup?.(cleanup);
  };
  const finishDrop = (clientX: number, clientY: number) => {
    cleanup();
    input.onDrop?.(clientX, clientY);
  };
  const onMove = (moveEvent: PointerEvent) => {
    moveEvent.preventDefault();
    lastClientX = moveEvent.clientX;
    lastClientY = moveEvent.clientY;
    moveHtmlDragGhost(ghost, moveEvent.clientX, moveEvent.clientY);
    input.onMove?.(moveEvent.clientX, moveEvent.clientY, moveEvent);
  };
  const onDrop = (endEvent: PointerEvent) => {
    endEvent.preventDefault();
    lastClientX = endEvent.clientX;
    lastClientY = endEvent.clientY;
    finishDrop(lastClientX, lastClientY);
  };
  const onCancel = (cancelEvent?: Event) => {
    cancelEvent?.preventDefault();
    cleanup();
  };
  const onLostCapture = (captureEvent: PointerEvent) => {
    if (captureEvent.buttons === 0) {
      finishDrop(lastClientX, lastClientY);
    }
  };
  const onVisibilityChange = () => {
    if (document.hidden) {
      cleanup();
    }
  };

  input.registerCleanup?.(cleanup);
  source.addEventListener("pointermove", onMove);
  source.addEventListener("pointerup", onDrop);
  source.addEventListener("pointercancel", onCancel);
  source.addEventListener("lostpointercapture", onLostCapture);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onDrop);
  window.addEventListener("pointercancel", onCancel);
  window.addEventListener("blur", onCancel);
  document.addEventListener("visibilitychange", onVisibilityChange);
}

export function bindTankSideToolDrag(element: HTMLElement, input: {
  isEnabled: () => boolean;
  getY: () => number;
  setY: (y: number) => void;
  syncPosition: () => void;
  savePosition: () => void;
  minY: () => number;
  maxY: () => number;
  designHeight: number;
  getCanvasRect: () => DOMRect;
  dragThresholdPx?: number;
}): void {
  let pressed = false;
  let dragging = false;
  let startClientY = 0;
  let startY = input.getY();
  const dragThresholdPx = input.dragThresholdPx ?? 8;
  const cleanup = (pointerId?: number) => {
    pressed = false;
    dragging = false;
    element.classList.remove("is-dragging");
    if (pointerId !== undefined) {
      releasePointerSafely(element, pointerId);
    }
  };
  const move = (event: PointerEvent) => {
    if (!pressed) {
      return;
    }

    event.preventDefault();
    const clientDeltaY = event.clientY - startClientY;
    if (!dragging && Math.abs(clientDeltaY) < dragThresholdPx) {
      return;
    }

    dragging = true;
    element.classList.add("is-dragging");
    const rect = input.getCanvasRect();
    const designDeltaY = rect.height > 0 ? (clientDeltaY / rect.height) * input.designHeight : 0;
    input.setY(clamp(startY + designDeltaY, input.minY(), input.maxY()));
    input.syncPosition();
  };
  const end = (event: PointerEvent) => {
    if (!pressed) {
      return;
    }
    event.preventDefault();
    const shouldSave = dragging;
    cleanup(event.pointerId);
    if (shouldSave) {
      input.savePosition();
    }
  };

  element.addEventListener("pointerdown", (event) => {
    if (!input.isEnabled()) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    pressed = true;
    dragging = false;
    startClientY = event.clientY;
    startY = input.getY();
    capturePointerSafely(element, event.pointerId);
  });
  element.addEventListener("pointermove", move);
  element.addEventListener("pointerup", end);
  element.addEventListener("pointercancel", end);
  element.addEventListener("lostpointercapture", () => cleanup());
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
