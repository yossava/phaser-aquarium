import Phaser from "phaser";
import { decorationTypes, fishTypes, foodTypes } from "../../data/content";
import { formatNumber } from "../../game/economy";
import { compactDurationLabel as compactDurationLabelModel } from "../../game/inventory-page";
import {
  gameHeight,
  tankBounds
} from "../../game/constants";
import {
  coinMagnetIconPath,
  autoFoodBuyerAssetPath,
  foodDispenserAssetPath,
  foodDispenserPositionStorageKey,
  legacyFoodDispenserPositionStorageKey,
  coinMagnetPositionStorageKey,
  autoFoodBuyerPositionStorageKey,
  loadUtilityPositionY,
  saveUtilityPositionY
} from "../../game/dispenser-system";
import {
  tankMenuVersion,
  tankMenuButtonY,
  menuIconAssetPathByKey,
  foodDockTopBelowMenu
} from "./aquarium-scene-config";
import { createHtmlHudOverlay as createHtmlHudOverlayView } from "../../ui/TankHudOverlay";
import { createTankMenuOverlay as createTankMenuOverlayView } from "../../ui/TankHudOverlay";
import { htmlElement, shouldSuppressHtmlClick } from "../../ui/dom";
import { bindTankSideToolDrag as bindTankSideToolDragInput } from "../../input/html-drag";
import { foodAssetPath } from "../../data/content";
import { timeCurrentFoodTypeId } from "../../game/food-system";
import { decorationSizes } from "../../game/tank-catalog";
import type { AppScreen, PlacementMode } from "./aquarium-scene-config";

export type AquariumHudControllerHost = {
  scene: Phaser.Scene;

  // HUD DOM elements (direct refs)
  gameHudOverlay?: HTMLDivElement;
  gameHudLevelText?: HTMLSpanElement;
  gameHudCommonText?: HTMLSpanElement;
  gameHudRareText?: HTMLSpanElement;
  gameHudSuperRareText?: HTMLSpanElement;
  gameHudQuestChecklist?: HTMLDivElement;
  timeCurrentElement?: HTMLDivElement;
  timeCurrentText?: HTMLSpanElement;
  coinMagnetElement?: HTMLDivElement;
  coinMagnetText?: HTMLSpanElement;
  autoFoodBuyerElement?: HTMLDivElement;
  autoFoodBuyerText?: HTMLSpanElement;
  foodDispenserElement?: HTMLDivElement;
  foodDispenserText?: HTMLSpanElement;

  // Tank menu overlay
  tankMenuOverlay?: HTMLDivElement;
  tankMenuOverlayStateKey: string;

  // Core state
  getActiveScreen(): AppScreen;
  wallet: { common: number; rare: number; superRare: number };
  tankLevel: number;
  cleanliness: number;
  tankLayer: Phaser.GameObjects.Container;
  foodDispenserY: number;
  coinMagnetY: number;
  autoFoodBuyerY: number;
  coinMagnetRay?: Phaser.GameObjects.Graphics;
  getPlacementMode(): PlacementMode;

  // Scene helpers
  tankDisplayLevel(): number;
  tankViewScaleForLevel(): number;
  screenToTankPoint(designX: number, designY: number): Phaser.Math.Vector2;
  tankToScreenPoint(x: number, y: number): { x: number; y: number };
  attachTouchFeedback(element: HTMLElement, releaseOnLeave?: boolean): void;

  // Domain helpers
  activeFish(): Array<{ state: string; hunger: number; health: number }>;
  getCareStatusLabel(): string;
  tankHudSnapshotText(): string;
  tankStatusSnapshotText(): string;
  tankCareSnapshotText(): string;
  getCompactTankNeedIndicator(): string;
  getTankNeedIndicator(): string;
  getTotalDispenserInventory(): number;
  coinMagnetRemainingMinutes(): number;
  autoFoodBuyerRemainingMinutes(): number;
  timeCurrentRemainingSeconds(): number;
  hasCoinMagnet(): boolean;
  hasAutoFoodBuyer(): boolean;
  hasFoodDispenser(): boolean;
  shouldShowCleanlinessWarning(): boolean;
  visibleDailyQuestItems(): Array<{ id: string; label: string; complete: boolean }>;
  dailyGoalUnclaimedCount(): number;
  coinMagnetTankPosition(): Phaser.Math.Vector2;
  coinMagnetRayPoint(): Phaser.Math.Vector2;

  // Food helpers
  getFoodInventory(foodTypeId: string): number;
  foodBadgeLabel(count: number): string;
  openScreen(screen: Exclude<AppScreen, "tank">): void;

  // Modal helpers
  showModal(title: string, lines: string[], actions: Array<{ label: string; fill: number; action: () => void }>, bodyElements?: HTMLElement[]): void;
  closeModal(skipAnimation?: boolean): void;

  // Save
  saveNow(): void;
};

export class AquariumHudController {
  constructor(private readonly host: AquariumHudControllerHost) {}

  // ─── HUD Overlay ───

  public syncHtmlHud(): void {
    if (this.host.getActiveScreen() !== "tank") {
      this.host.gameHudOverlay?.classList.add("hidden");
      return;
    }

    this.host.gameHudOverlay ??= this.createHtmlHudOverlay();
    this.host.gameHudOverlay.classList.remove("hidden");

    const displayLevel = this.host.tankDisplayLevel();
    this.host.gameHudLevelText!.textContent = formatNumber(displayLevel);
    this.host.gameHudCommonText!.textContent = formatNumber(this.host.wallet.common);
    this.host.gameHudRareText!.textContent = formatNumber(this.host.wallet.rare);
    this.host.gameHudSuperRareText!.textContent = formatNumber(this.host.wallet.superRare);
    this.syncTankQuestChecklist();
    this.syncTimeCurrentIndicator();
    if (this.host.foodDispenserText) {
      this.host.foodDispenserText.textContent = this.host.foodBadgeLabel(this.host.getTotalDispenserInventory());
    }
    if (this.host.coinMagnetText) {
      this.host.coinMagnetText.textContent = `${formatNumber(this.host.coinMagnetRemainingMinutes())}m`;
    }
    if (this.host.autoFoodBuyerText) {
      this.host.autoFoodBuyerText.textContent = `${formatNumber(this.host.autoFoodBuyerRemainingMinutes())}m`;
    }
    this.syncAutoFoodBuyerPosition();
    this.syncCoinMagnetPosition();
    this.syncFoodDispenserPosition();
    this.syncFoodDockPosition();
  }

  public createHtmlHudOverlay(): HTMLDivElement {
    const hud = createHtmlHudOverlayView({
      coinMagnetIconPath,
      autoFoodBuyerIconPath: autoFoodBuyerAssetPath,
      foodDispenserIconPath: foodDispenserAssetPath,
      timeCurrentIconPath: foodAssetPath(timeCurrentFoodTypeId),
      attachTouchFeedback: (element, releaseOnLeave) => this.host.attachTouchFeedback(element, releaseOnLeave),
      prepareInfoTarget: (element, title, lines) => this.prepareHudInfoTarget(element, title, lines),
      bindCoinMagnetDrag: (element) => this.bindCoinMagnetDrag(element),
      bindAutoFoodBuyerDrag: (element) => this.bindAutoFoodBuyerDrag(element),
      bindFoodDispenserDrag: (element) => this.bindFoodDispenserDrag(element)
    });
    this.host.gameHudLevelText = hud.levelText;
    this.host.gameHudCommonText = hud.commonText;
    this.host.gameHudRareText = hud.rareText;
    this.host.gameHudSuperRareText = hud.superRareText;
    this.host.gameHudQuestChecklist = hud.questChecklist;
    this.host.timeCurrentElement = hud.timeCurrentElement;
    this.host.timeCurrentText = hud.timeCurrentText;
    this.host.coinMagnetElement = hud.coinMagnetElement;
    this.host.coinMagnetText = hud.coinMagnetText;
    this.host.autoFoodBuyerElement = hud.autoFoodBuyerElement;
    this.host.autoFoodBuyerText = hud.autoFoodBuyerText;
    this.host.foodDispenserElement = hud.foodDispenserElement;
    this.host.foodDispenserText = hud.foodDispenserText;
    document.body.appendChild(hud.overlay);
    return hud.overlay;
  }

  public syncTankQuestChecklist(): void {
    if (!this.host.gameHudQuestChecklist) {
      return;
    }

    const quests = this.host.visibleDailyQuestItems().slice(0, 3);
    this.host.gameHudQuestChecklist.replaceChildren();
    if (quests.length === 0) {
      this.host.gameHudQuestChecklist.classList.add("hidden");
      return;
    }

    this.host.gameHudQuestChecklist.classList.remove("hidden");
    for (const quest of quests) {
      const row = htmlElement("div", "aq-tank-quest-item");
      row.append(
        htmlElement("span", "aq-tank-quest-label", [quest.label])
      );
      this.host.gameHudQuestChecklist.append(row);
    }
  }

  public syncTimeCurrentIndicator(): void {
    if (!this.host.timeCurrentElement || !this.host.timeCurrentText) {
      return;
    }

    const remainingSeconds = this.host.timeCurrentRemainingSeconds();
    if (remainingSeconds <= 0) {
      this.host.timeCurrentElement.classList.add("hidden");
      this.host.timeCurrentText.textContent = "";
      return;
    }

    this.host.timeCurrentElement.classList.remove("hidden");
    this.host.timeCurrentText.textContent = compactDurationLabelModel(remainingSeconds, formatNumber);
  }

  // ─── Utility Position Syncing ───

  public syncCoinMagnetPosition(): void {
    if (!this.host.coinMagnetElement) {
      return;
    }

    if (!this.host.hasCoinMagnet()) {
      this.host.coinMagnetElement.classList.add("hidden");
      this.syncCoinMagnetRay();
      return;
    }

    this.host.coinMagnetElement.classList.remove("hidden");
    this.host.coinMagnetY = Phaser.Math.Clamp(this.host.coinMagnetY, this.foodDispenserMinY(), this.foodDispenserMaxY());
    const position = this.host.coinMagnetTankPosition();
    const screenPosition = this.host.tankToScreenPoint(position.x, position.y);
    this.host.coinMagnetElement.style.setProperty("--tank-side-tool-left", `${Math.round(screenPosition.x)}px`);
    this.host.coinMagnetElement.style.setProperty("--tank-side-tool-top", `${Math.round(screenPosition.y)}px`);
    this.syncCoinMagnetRay();
  }

  public syncCoinMagnetRay(): void {
    if (!this.host.coinMagnetRay) {
      return;
    }

    this.host.coinMagnetRay.clear();
    if (!this.host.hasCoinMagnet() || !this.shouldShowTankScene()) {
      this.host.coinMagnetRay.setVisible(false);
      return;
    }

    const magnetPoint = this.host.coinMagnetRayPoint();
    const y = magnetPoint.y;
    this.host.coinMagnetRay.setVisible(true);
    this.host.coinMagnetRay.lineStyle(16, 0x55ff8a, 0.04);
    this.host.coinMagnetRay.beginPath();
    this.host.coinMagnetRay.moveTo(tankBounds.left + 4, y);
    this.host.coinMagnetRay.lineTo(tankBounds.right - 4, y);
    this.host.coinMagnetRay.strokePath();
    this.host.coinMagnetRay.lineStyle(7, 0x77ff99, 0.12);
    this.host.coinMagnetRay.beginPath();
    this.host.coinMagnetRay.moveTo(tankBounds.left + 4, y);
    this.host.coinMagnetRay.lineTo(tankBounds.right - 4, y);
    this.host.coinMagnetRay.strokePath();
    this.host.coinMagnetRay.lineStyle(2, 0xd9ffe5, 0.22);
    this.host.coinMagnetRay.beginPath();
    this.host.coinMagnetRay.moveTo(tankBounds.left + 4, y);
    this.host.coinMagnetRay.lineTo(tankBounds.right - 4, y);
    this.host.coinMagnetRay.strokePath();
    this.updateCoinMagnetRayPulse();
  }

  public updateCoinMagnetRayPulse(): void {
    if (!this.host.coinMagnetRay?.visible) { return; }
    const pulse = 0.72 + Math.sin(this.host.scene.time.now * 0.006) * 0.28;
    this.host.coinMagnetRay.setAlpha(pulse);
  }

  public syncAutoFoodBuyerPosition(): void {
    if (!this.host.autoFoodBuyerElement) {
      return;
    }

    if (!this.host.hasAutoFoodBuyer()) {
      this.host.autoFoodBuyerElement.classList.add("hidden");
      return;
    }

    this.host.autoFoodBuyerElement.classList.remove("hidden");
    this.host.autoFoodBuyerY = Phaser.Math.Clamp(this.host.autoFoodBuyerY, this.foodDispenserMinY(), this.foodDispenserMaxY());
    const tankX = tankBounds.left;
    const tankY = Phaser.Math.Clamp(this.host.autoFoodBuyerY, this.foodDispenserMinY(), this.foodDispenserMaxY());
    const screenPosition = this.host.tankToScreenPoint(tankX, tankY);
    this.host.autoFoodBuyerElement.style.setProperty("--tank-side-tool-left", `${Math.round(screenPosition.x)}px`);
    this.host.autoFoodBuyerElement.style.setProperty("--tank-side-tool-top", `${Math.round(screenPosition.y)}px`);
  }

  public syncFoodDispenserPosition(): void {
    if (!this.host.foodDispenserElement) {
      return;
    }

    if (!this.host.hasFoodDispenser()) {
      this.host.foodDispenserElement.classList.add("hidden");
      return;
    }

    this.host.foodDispenserElement.classList.remove("hidden");
    this.host.foodDispenserY = Phaser.Math.Clamp(this.host.foodDispenserY, this.foodDispenserMinY(), this.foodDispenserMaxY());
    const position = this.host.tankToScreenPoint(tankBounds.left, this.host.foodDispenserY);
    this.host.foodDispenserElement.style.setProperty("--food-dispenser-left", `${Math.round(position.x)}px`);
    this.host.foodDispenserElement.style.setProperty("--food-dispenser-top", `${Math.round(position.y)}px`);
  }

  public syncFoodDockPosition(): void {
    if (!this.host.gameHudOverlay || this.host.getActiveScreen() !== "tank") {
      return;
    }

    const rect = this.host.scene.game.canvas.getBoundingClientRect();
    const viewportHeight = Math.max(1, window.innerHeight);
    const frameTop = Phaser.Math.Clamp(rect.top, 0, viewportHeight);
    const frameBottom = Phaser.Math.Clamp(rect.bottom, 0, viewportHeight);
    const frameHeight = Math.max(1, frameBottom - frameTop);
    const frameOffset = (foodDockTopBelowMenu / gameHeight) * frameHeight;
    const foodDock = this.host.gameHudOverlay;
    foodDock.style.setProperty("--food-dock-screen-top", `${Math.round(frameTop + frameOffset)}px`);
    foodDock.style.setProperty("--food-dock-frame-offset", `${Math.round(frameOffset)}px`);
  }

  // ─── Utility Drag Binding ───

  public bindFoodDispenserDrag(element: HTMLElement): void {
    bindTankSideToolDragInput(element, {
      isEnabled: () => this.host.getActiveScreen() === "tank",
      getY: () => this.host.foodDispenserY,
      setY: (y) => {
        this.host.foodDispenserY = y;
      },
      syncPosition: () => this.syncFoodDispenserPosition(),
      savePosition: () => this.saveFoodDispenserY(),
      minY: () => this.foodDispenserMinY(),
      maxY: () => this.foodDispenserMaxY(),
      designHeight: gameHeight,
      getCanvasRect: () => this.host.scene.game.canvas.getBoundingClientRect()
    });
  }

  public bindCoinMagnetDrag(element: HTMLElement): void {
    bindTankSideToolDragInput(element, {
      isEnabled: () => this.host.getActiveScreen() === "tank",
      getY: () => this.host.coinMagnetY,
      setY: (y) => {
        this.host.coinMagnetY = y;
      },
      syncPosition: () => this.syncCoinMagnetPosition(),
      savePosition: () => this.saveCoinMagnetY(),
      minY: () => this.foodDispenserMinY(),
      maxY: () => this.foodDispenserMaxY(),
      designHeight: gameHeight,
      getCanvasRect: () => this.host.scene.game.canvas.getBoundingClientRect()
    });
  }

  public bindAutoFoodBuyerDrag(element: HTMLElement): void {
    bindTankSideToolDragInput(element, {
      isEnabled: () => this.host.getActiveScreen() === "tank",
      getY: () => this.host.autoFoodBuyerY,
      setY: (y) => {
        this.host.autoFoodBuyerY = y;
      },
      syncPosition: () => this.syncAutoFoodBuyerPosition(),
      savePosition: () => this.saveAutoFoodBuyerY(),
      minY: () => this.foodDispenserMinY(),
      maxY: () => this.foodDispenserMaxY(),
      designHeight: gameHeight,
      getCanvasRect: () => this.host.scene.game.canvas.getBoundingClientRect()
    });
  }

  // ─── Utility Position Persistence ───

  public loadFoodDispenserY(): void {
    this.host.foodDispenserY = loadUtilityPositionY({
      storageKey: foodDispenserPositionStorageKey,
      fallbackStorageKey: legacyFoodDispenserPositionStorageKey,
      fallbackY: this.host.foodDispenserY,
      minY: this.foodDispenserMinY(),
      maxY: this.foodDispenserMaxY()
    });
  }

  public saveFoodDispenserY(): void {
    saveUtilityPositionY({
      storageKey: foodDispenserPositionStorageKey,
      y: this.host.foodDispenserY,
      removeStorageKey: legacyFoodDispenserPositionStorageKey
    });
  }

  public loadCoinMagnetY(): void {
    this.host.coinMagnetY = loadUtilityPositionY({
      storageKey: coinMagnetPositionStorageKey,
      fallbackY: this.host.coinMagnetY,
      minY: this.foodDispenserMinY(),
      maxY: this.foodDispenserMaxY()
    });
  }

  public saveCoinMagnetY(): void {
    saveUtilityPositionY({
      storageKey: coinMagnetPositionStorageKey,
      y: this.host.coinMagnetY
    });
  }

  public loadAutoFoodBuyerY(): void {
    this.host.autoFoodBuyerY = loadUtilityPositionY({
      storageKey: autoFoodBuyerPositionStorageKey,
      fallbackY: this.host.autoFoodBuyerY,
      minY: this.foodDispenserMinY(),
      maxY: this.foodDispenserMaxY()
    });
  }

  public saveAutoFoodBuyerY(): void {
    saveUtilityPositionY({
      storageKey: autoFoodBuyerPositionStorageKey,
      y: this.host.autoFoodBuyerY
    });
  }

  public foodDispenserMinY(): number {
    return tankBounds.top + 164;
  }

  public foodDispenserMaxY(): number {
    return tankBounds.bottom - 8;
  }

  // ─── Tank Menu Overlay ───

  public syncTankMenuOverlay(): void {
    if (this.host.getActiveScreen() !== "tank") {
      this.host.tankMenuOverlay?.classList.add("hidden");
      return;
    }

    const nextStateKey = `${tankMenuVersion}:${this.host.shouldShowCleanlinessWarning()}:${this.host.dailyGoalUnclaimedCount()}`;
    if (this.host.tankMenuOverlay && (this.host.tankMenuOverlay.dataset.version !== tankMenuVersion || this.host.tankMenuOverlayStateKey !== nextStateKey)) {
      this.destroyTankMenuOverlay();
    }
    this.host.tankMenuOverlay ??= this.createTankMenuOverlay();
    this.host.tankMenuOverlayStateKey = nextStateKey;
    this.host.tankMenuOverlay.classList.remove("hidden");
  }

  public createTankMenuOverlay(): HTMLDivElement {
    const overlay = createTankMenuOverlayView({
      version: tankMenuVersion,
      tankDirty: this.host.shouldShowCleanlinessWarning(),
      designHeight: gameHeight,
      items: [
        {
          id: "menu",
          label: "Menu",
          y: tankMenuButtonY,
          icon: menuIconAssetPathByKey["ui-menu"],
          onClick: () => this.host.openScreen("menu")
        }
      ],
      attachTouchFeedback: (element, releaseOnLeave) => this.host.attachTouchFeedback(element, releaseOnLeave)
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  public destroyTankMenuOverlay(): void {
    this.host.tankMenuOverlay?.remove();
    this.host.tankMenuOverlay = undefined;
    this.host.tankMenuOverlayStateKey = "";
  }

  // ─── HUD Info / Action Targets ───

  public prepareHudInfoTarget(element: HTMLElement, title: string, lines: string[]): void {
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");
    element.setAttribute("aria-label", `Show ${title} definition`);
    element.classList.add("aq-hud-info-target");
    this.host.attachTouchFeedback(element, true);
    const show = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event instanceof MouseEvent && shouldSuppressHtmlClick()) {
        return;
      }
      this.host.showModal(title, lines, [{ label: "Close", fill: 0x254d68, action: () => this.host.closeModal() }]);
    };
    element.addEventListener("click", show);
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        show(event);
      }
    });
  }

  public prepareHudActionTarget(element: HTMLElement, label: string, action: () => void): void {
    element.setAttribute("role", "button");
    element.setAttribute("tabindex", "0");
    element.setAttribute("aria-label", label);
    element.classList.add("aq-hud-info-target");
    this.host.attachTouchFeedback(element, true);
    const run = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event instanceof MouseEvent && shouldSuppressHtmlClick()) {
        return;
      }
      action();
    };
    element.addEventListener("click", run);
    element.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        run(event);
      }
    });
  }

  // ─── Status Labels ───

  public getHudNeedLabel(): string {
    if (this.host.getPlacementMode().kind !== "none") {
      return this.getModeLabel();
    }
    return this.host.getCompactTankNeedIndicator();
  }

  public getModeLabel(): string {
    const mode = this.host.getPlacementMode();

    if (mode.kind === "fish") {
      const fishType = fishTypes.find((item) => item.id === mode.fishTypeId);
      return `Selected: place ${fishType?.name ?? "fish"} in the tank`;
    }

    if (mode.kind === "food") {
      const foodType = foodTypes.find((item) => item.id === mode.foodTypeId);
      return `Selected: drop ${foodType?.name ?? "food"} in the tank`;
    }

    if (mode.kind === "decoration") {
      const decorationType = decorationTypes.find((item) => item.id === mode.decorationTypeId);
      return `Selected: place ${decorationType?.name ?? "decoration"} ${decorationSizes[mode.size].label}`;
    }

    return this.host.getTankNeedIndicator();
  }

  // ─── Visibility ───

  public shouldShowTankScene(): boolean {
    return this.host.getActiveScreen() === "tank" || this.host.getActiveScreen() === "makeup";
  }
}
