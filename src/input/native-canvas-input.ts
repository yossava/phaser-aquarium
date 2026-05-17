import Phaser from "phaser";
import { tankViewportBounds } from "../game/constants";
import type { PendingFishBubble } from "../game/fish-delivery-bubbles";
import type { MakeupDecorationDraft } from "../game/makeup-mode";
import type { CoinDrop } from "../objects/CoinDrop";
import type { Fish } from "../objects/Fish";

export type NativeCanvasScreen = "tank" | "makeup" | "prize" | string;

export function installNativeCanvasInputFallback(input: {
  canvas: HTMLCanvasElement;
  activeScreen: () => NativeCanvasScreen;
  htmlDockDragging: () => boolean;
  designPointFromEvent: (event: PointerEvent) => Phaser.Math.Vector2 | undefined;
  screenToTankPoint: (designX: number, designY: number) => Phaser.Math.Vector2;
  capturePointer: (element: HTMLElement, pointerId: number) => void;
  releasePointer: (element: HTMLElement, pointerId: number) => void;
  handlePrizePointer: (designX: number, designY: number) => boolean;
  makeupDecorationAtPointer: (designX: number, designY: number) => MakeupDecorationDraft | undefined;
  selectMakeupDecoration: (decoration: MakeupDecorationDraft) => void;
  beginMakeupDecorationDrag: (decoration: MakeupDecorationDraft) => void;
  updateMakeupDecorationDragAtDesignPoint: (point: Phaser.Math.Vector2) => void;
  endMakeupDecorationDrag: () => void;
  fishBubbleAtPointer: (designX: number, designY: number) => PendingFishBubble | undefined;
  popFishBubble: (pending: PendingFishBubble) => void;
  coinAtPointer: (designX: number, designY: number) => CoinDrop | undefined;
  collectCoin: (coin: CoinDrop, automated: boolean) => void;
  fishAtPointer: (designX: number, designY: number) => Fish | undefined;
  setNativeDraggedFish: (fish: Fish | undefined) => void;
  setDraggedFish: (fish: Fish | undefined) => void;
  selectFish: (fish: Fish) => void;
  bringMakeupDecorationToTop: (decoration: MakeupDecorationDraft) => void;
  saveNow: () => void;
  recordDailyQuestAction: (action: string) => void;
}): () => void {
  let activePointerId: number | undefined;
  let nativeDraggedFish: Fish | undefined;
  let nativeMakeupDraggedDecoration: MakeupDecorationDraft | undefined;

  const endNativeFishDrag = (event?: PointerEvent) => {
    if (!nativeDraggedFish) {
      return;
    }

    const fish = nativeDraggedFish;
    const point = event ? input.designPointFromEvent(event) : undefined;
    if (point && tankViewportBounds.contains(point.x, point.y) && input.activeScreen() === "tank") {
      const tankPoint = input.screenToTankPoint(point.x, point.y);
      fish.moveManuallyTo(tankPoint.x, tankPoint.y);
    }

    fish.endManualDrag();
    fish.sprite.setDepth(8);
    nativeDraggedFish = undefined;
    input.setDraggedFish(undefined);
    input.setNativeDraggedFish(undefined);
    activePointerId = undefined;
    input.recordDailyQuestAction("move-fish");
    input.saveNow();
  };

  const endNativeMakeupDecorationDrag = (event?: PointerEvent) => {
    if (!nativeMakeupDraggedDecoration) {
      return;
    }

    const point = event ? input.designPointFromEvent(event) : undefined;
    if (point) {
      input.updateMakeupDecorationDragAtDesignPoint(point);
    }
    nativeMakeupDraggedDecoration = undefined;
    input.endMakeupDecorationDrag();
    activePointerId = undefined;
  };

  const beginNativeFishDrag = (fish: Fish, pointerId: number) => {
    activePointerId = pointerId;
    input.capturePointer(input.canvas, pointerId);
    nativeDraggedFish = fish;
    input.setNativeDraggedFish(fish);
    input.setDraggedFish(fish);
    input.selectFish(fish);
    fish.beginManualDrag();
    fish.sprite.setDepth(14);
  };

  const beginNativeMakeupDecorationDrag = (decoration: MakeupDecorationDraft, point: Phaser.Math.Vector2, pointerId: number) => {
    activePointerId = pointerId;
    input.capturePointer(input.canvas, pointerId);
    nativeMakeupDraggedDecoration = decoration;
    input.selectMakeupDecoration(decoration);
    input.beginMakeupDecorationDrag(decoration);
    input.bringMakeupDecorationToTop(decoration);
    input.updateMakeupDecorationDragAtDesignPoint(point);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (input.activeScreen() === "prize") {
      const point = input.designPointFromEvent(event);
      if (point && input.handlePrizePointer(point.x, point.y)) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    if (event.button !== 0 || input.htmlDockDragging()) {
      return;
    }

    const point = input.designPointFromEvent(event);
    if (!point || !tankViewportBounds.contains(point.x, point.y)) {
      return;
    }

    if (input.activeScreen() === "makeup") {
      const decoration = input.makeupDecorationAtPointer(point.x, point.y);
      if (!decoration) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      beginNativeMakeupDecorationDrag(decoration, point, event.pointerId);
      return;
    }

    if (input.activeScreen() !== "tank") {
      return;
    }

    const tappedFishBubble = input.fishBubbleAtPointer(point.x, point.y);
    if (tappedFishBubble) {
      event.preventDefault();
      event.stopPropagation();
      input.popFishBubble(tappedFishBubble);
      return;
    }

    const tappedCoin = input.coinAtPointer(point.x, point.y);
    if (tappedCoin) {
      event.preventDefault();
      event.stopPropagation();
      input.collectCoin(tappedCoin, false);
      return;
    }

    const fish = input.fishAtPointer(point.x, point.y);
    if (fish) {
      event.preventDefault();
      event.stopPropagation();
      beginNativeFishDrag(fish, event.pointerId);
      return;
    }

  };

  const onPointerMove = (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) {
      return;
    }

    const point = input.designPointFromEvent(event);
    if (!point) {
      return;
    }

    event.preventDefault();
    const tankPoint = input.screenToTankPoint(point.x, point.y);
    if (nativeMakeupDraggedDecoration && input.activeScreen() === "makeup") {
      input.updateMakeupDecorationDragAtDesignPoint(point);
      return;
    }
    if (nativeDraggedFish) {
      nativeDraggedFish.moveManuallyTo(tankPoint.x, tankPoint.y);
    }
  };

  const endPointer = (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    input.releasePointer(input.canvas, event.pointerId);
    endNativeMakeupDecorationDrag(event);
    endNativeFishDrag(event);
    activePointerId = undefined;
  };

  input.canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
  input.canvas.addEventListener("pointermove", onPointerMove, { passive: false });
  input.canvas.addEventListener("pointerup", endPointer, { passive: false });
  input.canvas.addEventListener("pointercancel", endPointer, { passive: false });

  return () => {
    input.canvas.removeEventListener("pointerdown", onPointerDown);
    input.canvas.removeEventListener("pointermove", onPointerMove);
    input.canvas.removeEventListener("pointerup", endPointer);
    input.canvas.removeEventListener("pointercancel", endPointer);
    endNativeMakeupDecorationDrag();
    endNativeFishDrag();
  };
}
