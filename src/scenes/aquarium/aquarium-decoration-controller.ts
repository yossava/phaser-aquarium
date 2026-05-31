import Phaser from "phaser";
import { decorationTypes } from "../../data/content";
import { decorationInventoryRowData } from "../../game/inventory-page";
import {
  clearStoredDecorationInventory as clearStoredDecorationInventoryModel,
  consumeStoredDecoration as consumeStoredDecorationModel,
  decorationInventoryKey as decorationInventoryKeyModel,
  getDecorationInventory as getDecorationInventoryModel,
  ownedDecorationCount as ownedDecorationCountModel,
  placedDecorationCount as placedDecorationCountModel,
  removeStoredDecorationInventory as removeStoredDecorationInventoryModel,
  sanitizeDecorationSize as sanitizeDecorationSizeModel
} from "../../game/decoration-inventory";
import { earn, formatNumber } from "../../game/economy";
import {
  clampSellQuantity,
  decorationSaleValue as decorationSaleValueModel
} from "../../game/store-transactions";
import { decorationVariantPrice as tankCatalogDecorationVariantPrice } from "../../game/tank-catalog";
import { createDecorationInventoryCard } from "../../ui/TankInventoryCards";
import { createDecorationInventoryRow as createDecorationInventoryRowView } from "../../ui/InventoryRows";
import { createDecorationSellConfirmationContent, type ModalContent } from "../../ui/SellConfirmationModals";
import {
  defaultDecorationDepth,
  fitDecorationDisplay as fitDecorationDisplayModel,
  moveDecorationWithinTank,
  tankDecorationDepthFromOrder as tankDecorationDepthFromOrderModel
} from "../../game/tank-placement";
import { decorationAtTankPoint } from "../../input/tank-hit-testing";
import type { DecorationType, Price, Wallet } from "../../types/mechanics";
import type { DecorationSize } from "../../game/tank-catalog";
import type { PlacedDecoration } from "../../game/tank-entities";
import { decorationSizes, decorationSizeOrder } from "../../game/tank-catalog";
import { tankViewportBounds, toastX, toastY } from "../../game/constants";
import { gameFontFamily } from "../../game/fonts";
import { executeDecorationPurchase } from "./aquarium-scene-store-purchases";
import type { AppScreen, PlacementMode } from "./aquarium-scene-config";
import type { MakeupDecorationDraft } from "../../game/makeup-mode";

export type AquariumDecorationControllerHost = {
  scene: Phaser.Scene;
  getActiveScreen(): AppScreen;
  getTankLevel(): number;
  decorationInventory: Map<string, number>;
  placedDecorations: PlacedDecoration[];
  getPlacementMode(): PlacementMode;
  setPlacementMode(mode: PlacementMode): void;
  tankLayer: Phaser.GameObjects.Container;
  draggedDecoration?: PlacedDecoration;
  phaserDraggedDecoration?: PlacedDecoration;
  nativeDraggedDecoration?: PlacedDecoration;
  decorationTrashTarget: Phaser.GameObjects.Container;
  decorationTrashBackground: Phaser.GameObjects.Rectangle;
  decorationTrashText: Phaser.GameObjects.Text;
  makeupDraggedDecoration?: MakeupDecorationDraft;
  screenToTankPoint(designX: number, designY: number): Phaser.Math.Vector2;
  pointerDesignPoint(pointer: Phaser.Input.Pointer): Phaser.Math.Vector2;
  storePurchaseAdapter(): {
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
  floatText(message: string, x: number, y: number, color: string): void;
  floatTankText(message: string, x: number, y: number, color: string): void;
  attachTouchFeedback(element: HTMLElement, releaseOnLeave?: boolean): void;
  saveNow(): void;
  refreshUi(renderControls?: boolean): void;
  createFoodDock(): void;
  returnToTankScreen(): void;
  closeModal(): void;
  showModalContent(content: ModalContent): void;
  recordDailyQuestAction(action: string): void;
  commonCoinValueRow(label: string, amount: number): HTMLElement;
  htmlButton(label: string, className: string, onClick: () => void, disabled?: boolean): HTMLButtonElement;
  rarityStarsLabel(rarity: string): string;
  getWallet(): Wallet;
  decorationTrashZone: Phaser.Geom.Rectangle;
};

export class AquariumDecorationController {
  constructor(private readonly host: AquariumDecorationControllerHost) {}

  public decorationInventoryKey(decorationTypeId: string, size: DecorationSize): string {
    return decorationInventoryKeyModel(decorationTypeId, size);
  }

  public sanitizeDecorationSize(size: string | undefined): DecorationSize {
    return sanitizeDecorationSizeModel(size, decorationSizeOrder);
  }

  public decorationVariantPrice(decorationType: DecorationType, size: DecorationSize): Price {
    return tankCatalogDecorationVariantPrice(decorationType, size);
  }

  public getDecorationInventory(decorationTypeId: string, size: DecorationSize = "m"): number {
    return getDecorationInventoryModel(this.host.decorationInventory, decorationTypeId, size);
  }

  public consumeStoredDecoration(decorationTypeId: string, size: DecorationSize): void {
    consumeStoredDecorationModel(this.host.decorationInventory, decorationTypeId, size);
  }

  public getPlacedDecorationCount(decorationTypeId: string, size: DecorationSize, level = this.host.getTankLevel()): number {
    return placedDecorationCountModel({
      decorations: this.host.placedDecorations, decorationTypeId, size, level, validSizes: decorationSizeOrder
    });
  }

  public getOwnedDecorationCount(decorationTypeId: string, size: DecorationSize, level = this.host.getTankLevel()): number {
    return ownedDecorationCountModel({
      inventory: this.host.decorationInventory, decorations: this.host.placedDecorations, decorationTypeId, size, level, validSizes: decorationSizeOrder
    });
  }

  public clearStoredDecorationInventory(decorationTypeId: string, size: DecorationSize): void {
    clearStoredDecorationInventoryModel(this.host.decorationInventory, decorationTypeId, size);
  }

  public removeStoredDecorationInventory(decorationTypeId: string, size: DecorationSize, quantity: number): number {
    return removeStoredDecorationInventoryModel({ inventory: this.host.decorationInventory, decorationTypeId, size, quantity });
  }

  public removePlacedDecorationsFromActiveTank(decorationTypeId: string, size: DecorationSize, quantity = Number.POSITIVE_INFINITY): number {
    const kept: PlacedDecoration[] = [];
    let removed = 0;
    const max = Math.max(0, Math.floor(quantity));
    for (const d of this.host.placedDecorations) {
      if (d.tankLevel === this.host.getTankLevel() && d.typeId === decorationTypeId && this.sanitizeDecorationSize(d.size) === size && removed < max) {
        d.image.destroy();
        removed += 1;
      } else {
        kept.push(d);
      }
    }
    this.host.placedDecorations.length = 0;
    this.host.placedDecorations.push(...kept);
    return removed;
  }

  public removeAllPlacedDecorationsFromActiveTank(): void {
    const kept: PlacedDecoration[] = [];
    for (const d of this.host.placedDecorations) {
      if (d.tankLevel === this.host.getTankLevel()) { d.image.destroy(); } else { kept.push(d); }
    }
    this.host.placedDecorations.length = 0;
    this.host.placedDecorations.push(...kept);
  }

  public activeDecorations(): PlacedDecoration[] {
    return this.host.placedDecorations.filter((d) => d.tankLevel === this.host.getTankLevel());
  }

  public decorationsInTank(level: number): PlacedDecoration[] {
    return this.host.placedDecorations.filter((d) => d.tankLevel === level);
  }

  public decorationAtTankPoint(designX: number, designY: number): PlacedDecoration | undefined {
    if (this.host.getActiveScreen() !== "tank") { return undefined; }
    const tp = this.host.screenToTankPoint(designX, designY);
    return decorationAtTankPoint(this.activeDecorations(), tp.x, tp.y);
  }

  public fitDecorationDisplay(image: Phaser.GameObjects.Image, decoration: DecorationType, size: DecorationSize = "m"): void {
    fitDecorationDisplayModel(image, decoration, size);
  }

  public tankDecorationDepthFromOrder(index: number): number {
    return tankDecorationDepthFromOrderModel(index);
  }

  public refreshDecorationTankVisibility(): void {
    for (const d of this.host.placedDecorations) { d.image.setVisible(d.tankLevel === this.host.getTankLevel()); }
  }

  public createDecorationTrashTarget(): void {
    const z = this.host.decorationTrashZone;
    const cx = z.centerX;
    const cy = z.centerY;
    this.host.decorationTrashBackground = this.host.scene.add.rectangle(0, 0, z.width, z.height, 0x351726, 0.94).setStrokeStyle(2, 0xff8fa3, 0.8);
    const lid = this.host.scene.add.rectangle(0, -18, 40, 5, 0xff8fa3, 0.92);
    const bin = this.host.scene.add.rectangle(0, 1, 34, 28, 0x10283a, 1).setStrokeStyle(2, 0xffccd5, 0.85);
    this.host.decorationTrashText = this.host.scene.add.text(0, 23, "Trash", { fontFamily: gameFontFamily, fontSize: "11px", color: "#ffccd5", fontStyle: "bold" }).setOrigin(0.5);
    this.host.decorationTrashTarget = this.host.scene.add.container(cx, cy, [this.host.decorationTrashBackground, lid, bin, this.host.decorationTrashText]).setDepth(28).setVisible(false);
  }

  public showDecorationTrashTarget(show: boolean): void {
    if (!this.host.decorationTrashTarget) { return; }
    this.host.decorationTrashTarget.setVisible(show && this.host.getActiveScreen() === "tank");
    if (!show) { this.highlightDecorationTrashTarget(false); }
  }

  public highlightDecorationTrashTarget(active: boolean): void {
    if (!this.host.decorationTrashBackground || !this.host.decorationTrashText) { return; }
    this.host.decorationTrashBackground.setFillStyle(active ? 0x6b1f38 : 0x351726, active ? 0.98 : 0.94);
    this.host.decorationTrashBackground.setStrokeStyle(2, active ? 0xffd166 : 0xff8fa3, active ? 1 : 0.8);
    this.host.decorationTrashText.setColor(active ? "#ffe39a" : "#ffccd5");
  }

  public placeDecorationFromInventory(decoration: DecorationType, size: DecorationSize, x: number, y: number): void {
    if (this.getDecorationInventory(decoration.id, size) <= 0) {
      this.host.floatText(`No ${decorationSizes[size].label} ${decoration.name}`, toastX, toastY, "#ffb0a8");
      return;
    }
    this.consumeStoredDecoration(decoration.id, size);
    this.addDecorationToTank(decoration, x, y, size);
    this.host.setPlacementMode({ kind: "none" });
    this.host.recordDailyQuestAction("place-decoration");
    this.host.createFoodDock();
    this.host.refreshUi(false);
    this.host.saveNow();
  }

  public addDecorationToTank(
    decoration: DecorationType, x: number, y: number, size: DecorationSize = "m",
    tankLevel = this.host.getTankLevel(), depth = defaultDecorationDepth(y)
  ): void {
    const img = this.host.scene.add.image(x, y, decoration.texture).setDepth(depth);
    this.fitDecorationDisplay(img, decoration, size);
    img.setInteractive({ useHandCursor: true });
    this.host.tankLayer.add(img);
    const placed: PlacedDecoration = { typeId: decoration.id, size, image: img, tankLevel };
    this.host.placedDecorations.push(placed);
    img.on("pointerdown", (pointer: Phaser.Input.Pointer, _px: number, _py: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      if (this.host.getActiveScreen() === "tank") { this.beginTankDecorationDrag(placed); }
      else if (this.host.getActiveScreen() === "makeup") { this.beginPhaserDecorationDrag(placed); }
    });
  }

  public selectDecoration(decorationTypeId: string, size: DecorationSize = "m"): void {
    if (this.getDecorationInventory(decorationTypeId, size) <= 0) { this.host.floatText("Buy one first", toastX, toastY, "#ffb0a8"); return; }
    this.host.setPlacementMode({ kind: "decoration", decorationTypeId, size });
    if (this.host.getActiveScreen() !== "tank") { this.host.returnToTankScreen(); }
    this.host.refreshUi();
  }

  public bindDecorationPointerGuard(decoration: PlacedDecoration): void { decoration.image.disableInteractive(); }
  public startPhaserDecorationHold(_d: PlacedDecoration, _p: Phaser.Input.Pointer): void {}

  public beginTankDecorationDrag(decoration: PlacedDecoration): void {
    if (this.host.getActiveScreen() !== "tank") { return; }
    this.host.draggedDecoration = decoration;
    decoration.image.setAlpha(0.78).setDepth(9);
    this.host.tankLayer.bringToTop(decoration.image);
  }

  public updateTankDecorationDragAtDesignPoint(pointerPoint: Phaser.Math.Vector2): void {
    if (this.host.getActiveScreen() !== "tank" || !this.host.draggedDecoration) { return; }
    const tp = this.host.screenToTankPoint(pointerPoint.x, pointerPoint.y);
    this.moveDecoration(this.host.draggedDecoration, tp.x, tp.y);
  }

  public endTankDecorationDrag(): void {
    const d = this.host.draggedDecoration;
    if (!d) { return; }
    d.image.setAlpha(1);
    this.moveDecoration(d, d.image.x, d.image.y);
    this.host.draggedDecoration = undefined;
    this.host.nativeDraggedDecoration = undefined;
    this.host.recordDailyQuestAction("move-decoration");
    this.host.saveNow();
  }

  public beginPhaserDecorationDrag(decoration: PlacedDecoration): void {
    if (this.host.nativeDraggedDecoration || this.host.getActiveScreen() !== "makeup") { return; }
    this.host.phaserDraggedDecoration = decoration;
    this.host.draggedDecoration = decoration;
    decoration.image.setAlpha(0.78).setDepth(9);
    this.showDecorationTrashTarget(true);
  }

  public updatePhaserDecorationDrag(pointer: Phaser.Input.Pointer): void {
    if (this.host.nativeDraggedDecoration || this.host.getActiveScreen() !== "makeup") { return; }
    const pp = this.host.pointerDesignPoint(pointer);
    if (!this.host.phaserDraggedDecoration) { return; }
    const tp = this.host.screenToTankPoint(pp.x, pp.y);
    this.moveDecoration(this.host.phaserDraggedDecoration, tp.x, tp.y);
    this.highlightDecorationTrashTarget(this.host.decorationTrashZone.contains(pp.x, pp.y));
  }

  public endPhaserDecorationDrag(pointer: Phaser.Input.Pointer): void {
    const d = this.host.phaserDraggedDecoration;
    if (!d || this.host.nativeDraggedDecoration) { return; }
    d.image.setAlpha(1);
    this.showDecorationTrashTarget(false);
    const pp = this.host.pointerDesignPoint(pointer);
    if (this.host.getActiveScreen() === "makeup" && this.host.decorationTrashZone.contains(pp.x, pp.y)) {
      this.trashDecoration(d);
    } else if (this.host.getActiveScreen() === "makeup" && tankViewportBounds.contains(pp.x, pp.y)) {
      const tp = this.host.screenToTankPoint(pp.x, pp.y);
      this.moveDecoration(d, tp.x, tp.y);
      this.host.recordDailyQuestAction("move-decoration");
      this.host.saveNow();
    }
    this.host.draggedDecoration = undefined;
    this.host.phaserDraggedDecoration = undefined;
  }

  public moveDecoration(decoration: PlacedDecoration, x: number, y: number): void {
    moveDecorationWithinTank(decoration, x, y, this.host.draggedDecoration === decoration);
  }

  public trashDecoration(decoration: PlacedDecoration): void {
    const idx = this.host.placedDecorations.indexOf(decoration);
    if (idx < 0) { return; }
    this.host.placedDecorations.splice(idx, 1);
    const x = decoration.image.x;
    const y = decoration.image.y;
    decoration.image.destroy();
    this.host.recordDailyQuestAction("trash-decoration");
    this.host.floatTankText("Trashed", x, y - 24, "#ffccd5");
    this.host.refreshUi();
    this.host.saveNow();
  }

  public buyDecoration(decorationType: DecorationType, size: DecorationSize = "m"): void {
    const price = this.decorationVariantPrice(decorationType, size);
    const adapter = this.host.storePurchaseAdapter();
    executeDecorationPurchase({
      ...adapter,
      decorationInventoryKey: (dtId, dSize) => this.decorationInventoryKey(dtId, dSize),
      getDecorationInventory: (key) => this.host.decorationInventory.get(key) ?? 0,
      setDecorationInventory: (key, count) => this.host.decorationInventory.set(key, count)
    }, decorationType, size, price);
  }

  public buyDecorationFromStore(decorationTypeId: string, size: DecorationSize): void {
    const dt = decorationTypes.find((item) => item.id === decorationTypeId);
    if (dt) { this.buyDecoration(dt, size); }
  }

  public decorationSellValue(decorationType: DecorationType, size: DecorationSize, count = this.getOwnedDecorationCount(decorationType.id, size)): number {
    return decorationSaleValueModel({ decorationType, size, count, decorationVariantPrice: (item, itemSize) => this.decorationVariantPrice(item, itemSize) });
  }

  public sellDecorationInventory(decorationTypeId: string, size: DecorationSize, quantity?: number): void {
    const dt = decorationTypes.find((item) => item.id === decorationTypeId);
    const count = this.getOwnedDecorationCount(decorationTypeId, size);
    if (!dt || count <= 0) { this.host.floatText("No decor to sell", toastX, toastY, "#ffb0a8"); return; }
    const sq = clampSellQuantity(quantity, count);
    const sv = this.decorationSellValue(dt, size, sq);
    const storedSold = this.removeStoredDecorationInventory(decorationTypeId, size, sq);
    this.removePlacedDecorationsFromActiveTank(decorationTypeId, size, sq - storedSold);
    earn(this.host.getWallet(), "common", sv);
    this.host.recordDailyQuestAction("sell-decoration");
    this.host.floatText(`Sold ${dt.name} x${formatNumber(sq)} +C${formatNumber(sv)}`, toastX, toastY, "#ffe67a");
    this.host.closeModal();
    this.host.createFoodDock();
    this.host.refreshUi();
    this.host.saveNow();
  }

  public showDecorationSellConfirmation(decorationTypeId: string, size: DecorationSize): void {
    const dt = decorationTypes.find((item) => item.id === decorationTypeId);
    const count = this.getOwnedDecorationCount(decorationTypeId, size);
    if (!dt || count <= 0) { this.host.floatText("No decor to sell", toastX, toastY, "#ffb0a8"); return; }
    this.host.showModalContent(createDecorationSellConfirmationContent({
      decorationType: dt, size, count,
      valueForQuantity: (q) => this.decorationSellValue(dt, size, q),
      createValueRow: (l, a) => this.host.commonCoinValueRow(l, a),
      attachTouchFeedback: (b) => this.host.attachTouchFeedback(b),
      onSell: (q) => this.sellDecorationInventory(decorationTypeId, size, q),
      onCancel: () => this.host.closeModal()
    }));
  }

  public createDecorationHtmlCard(decorationType: DecorationType): HTMLElement {
    const sizeRows = decorationSizeOrder.flatMap((size) => {
      const stored = this.getDecorationInventory(decorationType.id, size);
      const placed = this.getPlacedDecorationCount(decorationType.id, size);
      const owned = stored + placed;
      if (owned <= 0) { return []; }
      const label = stored > 0 ? `${decorationSizes[size].label} x${formatNumber(stored)}` : `${decorationSizes[size].label} in tank x${formatNumber(placed)}`;
      return [{ label, sellValue: this.decorationSellValue(decorationType, size, owned), selectDisabled: stored <= 0, onSelect: () => this.selectDecoration(decorationType.id, size), onSell: () => this.showDecorationSellConfirmation(decorationType.id, size) }];
    });
    return createDecorationInventoryCard({ decorationType, rarityLabel: this.host.rarityStarsLabel(decorationType.rarity), sizeRows, createButton: (l, c, o, d) => this.host.htmlButton(l, c, o, d) });
  }

  public createDecorationInventoryRow(decorationType: DecorationType, size: DecorationSize): HTMLElement {
    const sc = this.getDecorationInventory(decorationType.id, size);
    const pc = this.getPlacedDecorationCount(decorationType.id, size);
    const row = decorationInventoryRowData({ decorationType, size, storedCount: sc, placedCount: pc, sellValue: this.decorationSellValue(decorationType, size, sc + pc) });
    return createDecorationInventoryRowView({ ...row, createButton: (l, c, o, d) => this.host.htmlButton(l, c, o, d), onSell: () => this.showDecorationSellConfirmation(decorationType.id, size) });
  }

  public phaseTwoDecoration(): DecorationType | undefined { return decorationTypes[0]; }

  public ownsPhaseTwoDecoration(): boolean {
    const d = this.phaseTwoDecoration();
    return Boolean(d && this.getDecorationInventory(d.id, "m") > 0);
  }
}
