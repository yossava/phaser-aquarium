import Phaser from "phaser";
import type { MakeupDecorationDraft } from "../game/makeup-mode";
import type { PlacedDecoration } from "../game/tank-entities";
import type { CoinDrop } from "../objects/CoinDrop";
import type { Fish } from "../objects/Fish";
import {
  capturePointerSafely,
  releasePointerSafely
} from "./html-drag";
import { installNativeCanvasInputFallback } from "./native-canvas-input";

type AquariumNativeCanvasInputScene = {
  game: Phaser.Game;
  activeScreen: string;
  htmlDockDragging: boolean;
  clientPointToDesignPoint: (clientX: number, clientY: number) => Phaser.Math.Vector2 | undefined;
  screenToTankPoint: (designX: number, designY: number) => Phaser.Math.Vector2;
  handleNativePrizePointer: (designX: number, designY: number) => boolean;
  makeupDecorationAtPointer: (designX: number, designY: number) => MakeupDecorationDraft | undefined;
  selectMakeupDecoration: (decoration: MakeupDecorationDraft) => void;
  nativeMakeupDraggedDecoration?: MakeupDecorationDraft;
  makeupDraggedDecoration?: MakeupDecorationDraft;
  updateMakeupDecorationDragAtDesignPoint: (point: Phaser.Math.Vector2) => void;
  endMakeupDecorationDrag: () => void;
  coinAtPointer: (designX: number, designY: number) => CoinDrop | undefined;
  collectCoin: (coin: CoinDrop, automated: boolean) => void;
  fishAtPointer: (designX: number, designY: number) => Fish | undefined;
  nativeDraggedFish?: Fish;
  draggedFish?: Fish;
  decorationAtPointer: (designX: number, designY: number) => PlacedDecoration | undefined;
  nativeDraggedDecoration?: PlacedDecoration;
  draggedDecoration?: PlacedDecoration;
  beginTankDecorationDrag: (decoration: PlacedDecoration) => void;
  updateTankDecorationDragAtDesignPoint: (point: Phaser.Math.Vector2) => void;
  endTankDecorationDrag: () => void;
  fish: Fish[];
  selectedFishIndex?: number;
  tankLayer: Phaser.GameObjects.Layer;
  saveNow: () => void;
  recordDailyQuestAction: (action: string) => void;
};

export function installAquariumNativeCanvasInputFallback(scene: unknown): () => void {
  const host = scene as AquariumNativeCanvasInputScene;

  return installNativeCanvasInputFallback({
    canvas: host.game.canvas,
    activeScreen: () => host.activeScreen,
    htmlDockDragging: () => host.htmlDockDragging,
    designPointFromEvent: (event) => host.clientPointToDesignPoint(event.clientX, event.clientY),
    screenToTankPoint: (designX, designY) => host.screenToTankPoint(designX, designY),
    capturePointer: capturePointerSafely,
    releasePointer: releasePointerSafely,
    handlePrizePointer: (designX, designY) => host.handleNativePrizePointer(designX, designY),
    makeupDecorationAtPointer: (designX, designY) => host.makeupDecorationAtPointer(designX, designY),
    selectMakeupDecoration: (decoration) => host.selectMakeupDecoration(decoration),
    beginMakeupDecorationDrag: (decoration) => {
      host.nativeMakeupDraggedDecoration = decoration;
      host.makeupDraggedDecoration = decoration;
      decoration.image.setAlpha(0.72).setDepth(20);
    },
    updateMakeupDecorationDragAtDesignPoint: (point) => host.updateMakeupDecorationDragAtDesignPoint(point),
    endMakeupDecorationDrag: () => {
      host.nativeMakeupDraggedDecoration = undefined;
      host.endMakeupDecorationDrag();
    },
    coinAtPointer: (designX, designY) => host.coinAtPointer(designX, designY),
    collectCoin: (coin, automated) => host.collectCoin(coin, automated),
    fishAtPointer: (designX, designY) => host.fishAtPointer(designX, designY),
    setNativeDraggedFish: (fish) => {
      host.nativeDraggedFish = fish;
    },
    setDraggedFish: (fish) => {
      host.draggedFish = fish;
    },
    setNativeDraggedDecoration: (decoration) => {
      host.nativeDraggedDecoration = decoration;
    },
    setDraggedDecoration: (decoration) => {
      host.draggedDecoration = decoration;
    },
    decorationAtPointer: (designX, designY) => host.decorationAtPointer(designX, designY),
    beginTankDecorationDrag: (decoration) => host.beginTankDecorationDrag(decoration),
    updateTankDecorationDragAtDesignPoint: (point) => host.updateTankDecorationDragAtDesignPoint(point),
    endTankDecorationDrag: () => {
      host.nativeDraggedDecoration = undefined;
      host.endTankDecorationDrag();
    },
    selectFish: (fish) => {
      host.selectedFishIndex = host.fish.indexOf(fish);
    },
    bringMakeupDecorationToTop: (decoration) => host.tankLayer.bringToTop(decoration.image),
    saveNow: () => host.saveNow(),
    recordDailyQuestAction: (action) => host.recordDailyQuestAction(action)
  });
}
