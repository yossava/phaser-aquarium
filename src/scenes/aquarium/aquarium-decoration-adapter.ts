import type Phaser from "phaser";
import type { AquariumDecorationControllerHost } from "./aquarium-decoration-controller";
import type { AquariumSceneCore } from "./AquariumSceneCore";
import { decorationTrashZone } from "./aquarium-scene-config";
import type { DecorationType, Price, Wallet } from "../../types/mechanics";
import type { AppScreen, PlacementMode } from "./aquarium-scene-config";
import type { PlacedDecoration } from "../../game/tank-entities";
import type { MakeupDecorationDraft } from "../../game/makeup-mode";
import type { ModalContent } from "../../ui/SellConfirmationModals";

type DecorationAdapterScene = Phaser.Scene & {
  activeScreen: AppScreen;
  tankLevel: number;
  decorationInventory: Map<string, number>;
  placedDecorations: PlacedDecoration[];
  placementMode: PlacementMode;
  tankLayer: Phaser.GameObjects.Container;
  draggedDecoration?: PlacedDecoration;
  phaserDraggedDecoration?: PlacedDecoration;
  nativeDraggedDecoration?: PlacedDecoration;
  decorationTrashTarget: Phaser.GameObjects.Container;
  decorationTrashBackground: Phaser.GameObjects.Rectangle;
  decorationTrashText: Phaser.GameObjects.Text;
  makeupDraggedDecoration?: MakeupDecorationDraft;
  screenToTankPoint: (designX: number, designY: number) => Phaser.Math.Vector2;
  pointerDesignPoint: (pointer: Phaser.Input.Pointer) => Phaser.Math.Vector2;
  attachTouchFeedback: (element: HTMLElement, releaseOnLeave?: boolean) => void;
  storePurchaseAdapter: () => {
    activeScreen: () => AppScreen;
    closeModal: () => void;
    returnToTankScreen: () => void;
    refreshStoreOverlay: () => void;
    refreshUi: (renderControls?: boolean) => void;
    createFoodDock: () => void;
    saveNow: () => void;
    spendPrice: (price: Price) => boolean;
    floatText: (message: string, color: string) => void;
    setRecentInventoryDockItemKey: (key: string) => void;
    setPlacementMode: (mode: PlacementMode) => void;
    recordDailyQuestAction: (action: string) => void;
  };
  floatText: (message: string, x: number, y: number, color: string) => void;
  floatTankText: (message: string, x: number, y: number, color: string) => void;
  saveNow: () => void;
  refreshUi: (renderControls?: boolean) => void;
  createFoodDock: () => void;
  returnToTankScreen: () => void;
  closeModal: () => void;
  showModalContent: (content: ModalContent) => void;
  recordDailyQuestAction: (action: string) => void;
  commonCoinValueRow: (label: string, amount: number) => HTMLElement;
  htmlButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;
  rarityStarsLabel: (rarity: string) => string;
  wallet: Wallet;
  decorationTrashZone: Phaser.Geom.Rectangle;
};

export function createAquariumDecorationControllerHost(scene: AquariumSceneCore): AquariumDecorationControllerHost {
  const s = scene as unknown as DecorationAdapterScene;
  return {
    scene: s,

    getActiveScreen: () => s.activeScreen,
    getTankLevel: () => s.tankLevel,
    decorationInventory: s.decorationInventory,
    placedDecorations: s.placedDecorations,
    getPlacementMode: () => s.placementMode,
    setPlacementMode: (mode) => {
      s.placementMode = mode;
    },
    tankLayer: s.tankLayer,

    draggedDecoration: s.draggedDecoration,
    phaserDraggedDecoration: s.phaserDraggedDecoration,
    nativeDraggedDecoration: s.nativeDraggedDecoration,

    decorationTrashTarget: s.decorationTrashTarget,
    decorationTrashBackground: s.decorationTrashBackground,
    decorationTrashText: s.decorationTrashText,

    makeupDraggedDecoration: s.makeupDraggedDecoration,

    screenToTankPoint: (designX, designY) => s.screenToTankPoint(designX, designY),
    pointerDesignPoint: (pointer) => s.pointerDesignPoint(pointer),
    storePurchaseAdapter: () => s.storePurchaseAdapter(),

    floatText: (message, x, y, color) => s.floatText(message, x, y, color),
    floatTankText: (message, x, y, color) => s.floatTankText(message, x, y, color),
    attachTouchFeedback: (element, releaseOnLeave) => s.attachTouchFeedback(element, releaseOnLeave),
    saveNow: () => s.saveNow(),
    refreshUi: (renderControls) => s.refreshUi(renderControls),
    createFoodDock: () => s.createFoodDock(),
    returnToTankScreen: () => s.returnToTankScreen(),
    closeModal: () => s.closeModal(),
    showModalContent: (content) => s.showModalContent(content),
    recordDailyQuestAction: (action) => s.recordDailyQuestAction(action),
    commonCoinValueRow: (label, amount) => s.commonCoinValueRow(label, amount),
    htmlButton: (label, className, onClick, disabled) => s.htmlButton(label, className, onClick, disabled),
    rarityStarsLabel: (rarity) => s.rarityStarsLabel(rarity),
    getWallet: () => s.wallet,

    decorationTrashZone
  };
}
