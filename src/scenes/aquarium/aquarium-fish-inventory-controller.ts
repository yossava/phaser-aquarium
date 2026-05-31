import Phaser from "phaser";
import { fishTypes } from "../../data/content";
import { earn, formatNumber } from "../../game/economy";
import { fishPowerLevelForAgeSeconds as fishPowerLevelForAgeSecondsModel } from "../../game/economy-model";
import { activeFishSellValue as activeFishSellValueModel, storedFishSellValue as storedFishSellValueModel } from "../../game/economy-values";
import { chooseBreedBabyType as chooseBreedBabyTypeModel, findBreedMate as findBreedMateModel } from "../../game/fish-breeding";
import {
  fusionAgeLabel as fusionAgeLabelModel,
  type FishFusionChances,
  type FishFusionSource
} from "../../game/fish-fusion";
import {
  getStoredFishCount as getStoredFishCountModel,
  removeStoredFish as removeStoredFishModel,
  storeActiveFish as storeActiveFishModel,
  storedFishTypeFromCatalog
} from "../../game/fish-inventory";
import { fishHappinessPercent } from "../../game/inventory-page";
import { planStoredFishSale } from "../../game/store-transactions";
import { Fish } from "../../objects/Fish";
import {
  createActiveFishSellConfirmationContent,
  createStarterProtectedSellModalContent,
  createStoredFishSellConfirmationContent,
  type ModalContent
} from "../../ui/SellConfirmationModals";
import { htmlElement, htmlImage } from "../../ui/dom";
import type { CoinType, FishGender, FishType, Price, Wallet } from "../../types/mechanics";
import type { FishFusionPageResult } from "./aquarium-scene-config";

export type AquariumFishInventoryControllerHost = {
  scene: Phaser.Scene;

  // State accessors
  getFishInventoryMap: () => Map<string, number>;
  getFishInventoryAgesMap: () => Map<string, number[]>;
  getFusionPreviewSourceKeys: () => Set<string>;
  setFusionPreviewSourceKeys: (keys: Set<string>) => void;
  getFusionPageResult: () => FishFusionPageResult | undefined;
  setFusionPageResult: (result: FishFusionPageResult | undefined) => void;
  getPendingFusionTimer: () => number | undefined;
  setPendingFusionTimer: (timer: number | undefined) => void;
  getFusionRunToken: () => number;
  setFusionRunToken: (token: number) => void;
  setRecentInventoryDockItemKey: (key: string) => void;

  // Core methods
  activeFish: () => Fish[];
  getFishInventory: (fishTypeId: string) => number;
  totalStoredFishCount: () => number;
  addFishToTank: (type: FishType, x: number, y: number, options?: { gender?: FishGender; tankLevel?: number; ageSeconds?: number; visualAgeSeconds?: number }) => Fish;
  placeFishWithCompatibility: (type: FishType, x: number, y: number) => void;
  removeFishAt: (index: number) => Fish | undefined;
  addFishToInventory: (fishType: FishType, quantity?: number) => void;
  storedFishPowerAgeSeconds: (fishType: FishType) => number;
  fishCatalogPreviewTextureKey: (fishType: FishType) => string;
  ownedFishTypeIds: () => Set<string>;
  removeStoredFish: (fishTypeId: string, quantity?: number) => void;
  canSellFish: () => boolean;
  rarityLabel: (rarity: FishType["rarity"]) => string;
  commonCoinValueRow: (label: string, amount: number) => HTMLElement;
  attachTouchFeedback: (button: HTMLElement) => void;
  projectedActiveProductionPerMinute: () => number;
  maxFishCapacityForLevel: () => number;
  randomFishPlacement: () => Phaser.Math.Vector2;
  returnToTankScreen: () => void;
  floatText: (message: string, x: number, y: number, color: string) => void;
  floatTankText: (message: string, x: number, y: number, color: string) => void;
  refreshUi: (renderControls?: boolean) => void;
  saveNow: () => void;
  closeModal: () => void;
  showModalContent: (content: ModalContent) => void;
  recordDailyQuestAction: (action: string) => void;
  createFoodDock: () => void;
  renderTabControls: () => void;
  ensureTankState: (level: number) => { fishInventory: Map<string, number> };
  getTankStates: () => Map<number, { fishInventory: Map<string, number> }>;
  getTankLevel(): number;
  getWallet: () => Wallet;
  htmlButton: (label: string, className: string, action: () => void, disabled?: boolean) => HTMLButtonElement;

  // Fusion adapter methods
  showFishFusionModal: (preselectedKeys: Iterable<string>) => void;
  fishFusionSources: () => FishFusionSource[];
  fishFusionResultTypes: (sources: FishFusionSource[]) => { normal?: FishType; premium?: FishType };
  fishFusionSourceSellValue: (source: FishFusionSource) => number;
  fishFusionCostFor: (sources: FishFusionSource[]) => Price;
  areFishFusionSourcesAvailable: (sources: FishFusionSource[]) => boolean;
  fishFusionChancesFor: (sources: FishFusionSource[], hasPremium: boolean) => FishFusionChances;
  consumeFishFusionSources: (sources: FishFusionSource[]) => void;
};

export class AquariumFishInventoryController {
  public constructor(private readonly host: AquariumFishInventoryControllerHost) {}

  public ownedFishTypeIds(): Set<string> {
    const ownedIds = new Set(this.host.activeFish().map((fish) => fish.type.id));
    for (const [fishTypeId, count] of this.host.getFishInventoryMap().entries()) {
      if (count > 0) {
        ownedIds.add(fishTypeId);
      }
    }
    for (const state of this.host.getTankStates().values()) {
      for (const [fishTypeId, count] of state.fishInventory.entries()) {
        if (count > 0) {
          ownedIds.add(fishTypeId);
        }
      }
    }
    return ownedIds;
  }

  // Fish transfer UI
  public appendInventoryFishTab(content: HTMLElement): void {
    content.append(this.createFishTransferBoard());
  }

  public createFishTransferBoard(): HTMLElement {
    const activeFish = this.host.activeFish();
    const storedFish = this.storedFishTypes();
    const board = htmlElement("section", "aq-fish-transfer-board", [
      htmlElement("div", "aq-fish-transfer-header", [
        htmlElement("h2", "aq-page-section-title", ["Fish"]),
        htmlElement("p", "aq-fish-transfer-copy", ["Use move buttons to transfer fish between Inventory and In Tank."])
      ]),
      this.createFishTransferProductionRate()
    ]);
    const tankZone = this.createFishTransferZone({
      zone: "tank",
      title: "In Tank",
      meta: `${formatNumber(activeFish.length)}/${formatNumber(this.host.maxFishCapacityForLevel())}`,
      emptyTitle: "No fish in tank",
      emptyDetail: "Drop inventory fish here."
    });
    const inventoryZone = this.createFishTransferZone({
      zone: "inventory",
      title: "Inventory",
      meta: `${formatNumber(this.host.totalStoredFishCount())}`,
      emptyTitle: "No stored fish",
      emptyDetail: "Drop tank fish here."
    });

    const tankList = tankZone.querySelector<HTMLElement>(".aq-fish-transfer-list");
    const inventoryList = inventoryZone.querySelector<HTMLElement>(".aq-fish-transfer-list");
    activeFish.forEach((fish) => tankList?.append(this.createActiveFishTransferCard(fish)));
    storedFish.forEach((fishType) => inventoryList?.append(this.createStoredFishTransferCard(fishType)));
    board.append(htmlElement("div", "aq-fish-transfer-zones", [inventoryZone, tankZone]));
    return board;
  }

  public createFishTransferProductionRate(): HTMLElement {
    const productionPerSecond = this.host.projectedActiveProductionPerMinute() / 60;
    return htmlElement("div", "aq-fish-transfer-rate", [
      htmlElement("span", "", ["Production"]),
      htmlElement("strong", "", [`C${formatNumber(productionPerSecond)}/s`])
    ]);
  }

  public createFishTransferZone(input: {
    zone: "inventory" | "tank";
    title: string;
    meta: string;
    emptyTitle: string;
    emptyDetail: string;
  }): HTMLElement {
    const list = htmlElement("div", "aq-fish-transfer-list", [
      htmlElement("div", "aq-fish-transfer-empty", [
        htmlElement("strong", "", [input.emptyTitle]),
        htmlElement("span", "", [input.emptyDetail])
      ])
    ]);
    const zone = htmlElement("section", `aq-fish-transfer-zone ${input.zone}`, [
      htmlElement("div", "aq-fish-transfer-zone-head", [
        htmlElement("strong", "", [input.title]),
        htmlElement("span", "", [input.meta])
      ]),
      list
    ]);
    zone.dataset.fishDropZone = input.zone;
    return zone;
  }

  public createActiveFishTransferCard(fish: Fish): HTMLElement {
    const index = this.host.activeFish().indexOf(fish);
    const canSell = this.host.canSellFish();
    const card = this.createFishTransferCard({
      fishType: fish.type,
      badge: "Tank",
      powerLabel: `PWR ${formatNumber(fish.powerLevel())}`,
      meta: `${fish.gender} | Power Lv ${formatNumber(fish.powerLevel())} | ${this.host.rarityLabel(fish.type.rarity)}`,
      detail: fish.productionSummary(),
      statusBars: this.createFishTransferStatusBars(fish),
      transferLabel: "Move to Inventory",
      transferDisabled: false,
      onTransfer: () => this.storeFishByIndex(index),
      actionLabel: canSell ? `Sell C${formatNumber(activeFishSellValueModel(fish))}` : "Phase 3",
      actionClassName: "aq-page-button aq-page-button-danger aq-fish-transfer-action",
      actionDisabled: !canSell,
      onAction: () => this.showSellConfirmation(index)
    });
    return card;
  }

  public createStoredFishTransferCard(fishType: FishType): HTMLElement {
    const count = this.host.getFishInventory(fishType.id);
    const storedPowerAgeSeconds = this.host.storedFishPowerAgeSeconds(fishType);
    const storedPowerLevel = fishPowerLevelForAgeSecondsModel(storedPowerAgeSeconds);
    const canSell = this.host.canSellFish();
    const card = this.createFishTransferCard({
      fishType,
      badge: `x${formatNumber(count)}`,
      powerLabel: `PWR ${formatNumber(storedPowerLevel)}`,
      meta: `Inventory | Power Lv ${formatNumber(storedPowerLevel)} | ${this.host.rarityLabel(fishType.rarity)}`,
      detail: `Sell one for C${formatNumber(storedFishSellValueModel(fishType, storedPowerAgeSeconds))}`,
      transferLabel: "Move to Tank",
      transferDisabled: this.host.activeFish().length >= this.host.maxFishCapacityForLevel(),
      onTransfer: () => this.moveStoredFishToTankFromInventoryPage(fishType.id),
      actionLabel: canSell ? `Sell C${formatNumber(storedFishSellValueModel(fishType, storedPowerAgeSeconds))}` : "Phase 3",
      actionClassName: "aq-page-button aq-page-button-danger aq-fish-transfer-action",
      actionDisabled: !canSell,
      onAction: () => this.showStoredFishSellConfirmation(fishType.id)
    });
    return card;
  }

  public createFishTransferCard(input: {
    fishType: FishType;
    badge: string;
    powerLabel: string;
    meta: string;
    detail: string;
    statusBars?: HTMLElement;
    transferLabel: string;
    transferDisabled: boolean;
    onTransfer: () => void;
    actionLabel: string;
    actionClassName: string;
    actionDisabled?: boolean;
    onAction: () => void;
  }): HTMLElement {
    const card = htmlElement("article", "aq-fish-transfer-card", [
      htmlElement("div", "aq-fish-transfer-image-wrap", [
        htmlImage(`/assets/fish/${input.fishType.id}.png`, "", "aq-fish-transfer-image"),
        htmlElement("span", "aq-fish-transfer-badge", [input.badge])
      ]),
      htmlElement("div", "aq-fish-transfer-card-body", [
        htmlElement("h3", "", [input.fishType.name]),
        htmlElement("span", "aq-fish-power-inline aq-fish-transfer-power-inline", [input.powerLabel]),
        htmlElement("p", "", [input.meta]),
        htmlElement("small", "", [input.detail]),
        ...(input.statusBars ? [input.statusBars] : [])
      ]),
      htmlElement("div", "aq-fish-transfer-actions", [
        this.host.htmlButton(input.transferLabel, "aq-page-button aq-page-button-good aq-fish-transfer-action", input.onTransfer, input.transferDisabled),
        this.host.htmlButton(input.actionLabel, input.actionClassName, input.onAction, input.actionDisabled)
      ])
    ]);
    return card;
  }

  public createFishTransferStatusBars(fish: Fish): HTMLElement {
    const foodPercent = Math.round(Phaser.Math.Clamp(fish.fullnessRatio(), 0, 1) * 100);
    return htmlElement("div", "aq-fish-transfer-status-bars", [
      this.createFishTransferStatusBar("Happy", fishHappinessPercent(fish), "happy"),
      this.createFishTransferStatusBar("Health", fish.health, "health"),
      this.createFishTransferStatusBar("Food", foodPercent, "food")
    ]);
  }

  public createFishTransferStatusBar(label: string, value: number, tone: "happy" | "health" | "food"): HTMLElement {
    const percent = Math.round(Phaser.Math.Clamp(value, 0, 100));
    const fill = htmlElement("span", `aq-fish-transfer-status-fill ${tone}`);
    fill.style.width = `${percent}%`;
    return htmlElement("div", "aq-fish-transfer-status-row", [
      htmlElement("span", "aq-fish-transfer-status-label", [label]),
      htmlElement("span", "aq-fish-transfer-status-track", [fill]),
      htmlElement("span", "aq-fish-transfer-status-value", [`${formatNumber(percent)}%`])
    ]);
  }

  // Fish movement
  public moveStoredFishToTankFromInventoryPage(fishTypeId: string | undefined): void {
    const fishType = fishTypes.find((candidate) => candidate.id === fishTypeId);
    if (!fishType || this.host.getFishInventory(fishType.id) <= 0) {
      this.host.floatText("No fish in inventory", toastX, toastY, "#ffb0a8");
      return;
    }
    if (this.host.activeFish().length >= this.host.maxFishCapacityForLevel()) {
      this.host.floatText("Tank full - move a fish to inventory first", toastX, toastY, "#ffb0a8");
      return;
    }

    const position = this.host.randomFishPlacement();
    this.host.removeStoredFish(fishType.id);
    this.host.addFishToTank(fishType, position.x, position.y, { tankLevel: this.host.getTankLevel() });
    this.host.recordDailyQuestAction("move-fish");
    this.host.recordDailyQuestAction("place-fish");
    this.host.floatText(`${fishType.name} moved to tank`, toastX, toastY, "#d7f4ff");
    this.host.refreshUi();
    this.host.createFoodDock();
    this.host.saveNow();
  }

  public storeFishByIndex(index: number): void {
    const fish = this.host.activeFish()[index];
    if (!fish) {
      this.host.floatText("No fish to store", toastX, toastY, "#ffb0a8");
      return;
    }

    const name = fish.type.name;
    this.storeFish(fish);
    this.host.recordDailyQuestAction("move-fish");
    this.host.floatText(`${name} moved to inventory`, toastX, toastY, "#d7f4ff");
    this.host.closeModal();
    this.host.refreshUi();
    this.host.createFoodDock();
    this.host.saveNow();
  }

  public storeFish(fish: Fish): void {
    const stored = storeActiveFishModel({
      fish,
      activeFish: this.host.activeFish(),
      fishInventory: this.host.getFishInventoryMap(),
      removeFishAt: (index) => this.host.removeFishAt(index)
    });
    if (!stored) {
      return;
    }

    this.host.setRecentInventoryDockItemKey("fish-menu:fish-menu");
  }

  public prepareFishPlacement(fishTypeId: string): void {
    const fishType = fishTypes.find((candidate) => candidate.id === fishTypeId);
    if (!fishType || this.host.getFishInventory(fishTypeId) <= 0) {
      this.host.floatText("No fish in inventory", toastX, toastY, "#ffb0a8");
      return;
    }

    if (this.host.activeFish().length >= this.host.maxFishCapacityForLevel()) {
      this.host.floatText("Tank full - move a fish to inventory first", toastX, toastY, "#ffb0a8");
      return;
    }

    this.host.returnToTankScreen();
    const position = this.host.randomFishPlacement();
    this.host.placeFishWithCompatibility(fishType, position.x, position.y);
  }

  // Breeding
  public breedFish(index: number, force?: "same" | "rare"): void {
    const parent = this.host.activeFish()[index];
    const mateIndex = findBreedMateModel(this.host.activeFish(), index);
    if (!parent || mateIndex === undefined) {
      this.host.floatText("Need M+F pair", toastX, toastY, "#ffb0a8");
      return;
    }

    if (this.host.activeFish().length >= this.host.maxFishCapacityForLevel()) {
      this.host.floatText("Active tank full", toastX, toastY, "#ffb0a8");
      return;
    }

    const babyType = chooseBreedBabyTypeModel({
      parentType: parent.type,
      force,
      randomPercent: () => Phaser.Math.Between(1, 100),
      randomChoice: (items) => Phaser.Utils.Array.GetRandom(items)
    });
    const position = this.host.randomFishPlacement();
    this.host.addFishToTank(babyType, position.x, position.y, { tankLevel: this.host.getTankLevel() });
    this.host.recordDailyQuestAction("breed-fish");
    this.host.floatTankText(`${babyType.name} moved in`, position.x, position.y - 34, "#ffffff");
    this.host.renderTabControls();
    this.host.refreshUi();
    this.host.saveNow();
  }

  // Selling
  public showSellConfirmation(index: number): void {
    if (!this.host.canSellFish()) {
      this.host.floatText("Fish selling unlocks in Phase 3", toastX, toastY, "#d7f4ff");
      return;
    }

    const targetFish = this.host.activeFish()[index];
    if (!targetFish) {
      this.host.floatText("No fish to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    if (this.host.activeFish().length <= 1) {
      this.host.showModalContent(createStarterProtectedSellModalContent({
        onClose: () => this.host.closeModal()
      }));
      return;
    }

    const sellValue = activeFishSellValueModel(targetFish);
    this.host.showModalContent(createActiveFishSellConfirmationContent({
      fishType: targetFish.type,
      sellValue,
      createValueRow: (label, amount) => this.host.commonCoinValueRow(label, amount),
      onSell: () => this.sellFishByIndex(index),
      onCancel: () => this.host.closeModal()
    }));
  }

  public showStoredFishSellConfirmation(fishTypeId: string): void {
    if (!this.host.canSellFish()) {
      this.host.floatText("Fish selling unlocks in Phase 3", toastX, toastY, "#d7f4ff");
      return;
    }

    const fishType = fishTypes.find((item) => item.id === fishTypeId);
    const count = this.host.getFishInventory(fishTypeId);
    if (!fishType || count <= 0) {
      this.host.floatText("No fish in inventory", toastX, toastY, "#ffb0a8");
      return;
    }

    this.host.showModalContent(createStoredFishSellConfirmationContent({
      fishType,
      count,
      valueForQuantity: (quantity) => this.storedFishSellValueForQuantity(fishType, quantity),
      createValueRow: (label, amount) => this.host.commonCoinValueRow(label, amount),
      attachTouchFeedback: (button) => this.host.attachTouchFeedback(button),
      onSell: (quantity) => this.sellStoredFish(fishTypeId, quantity),
      onCancel: () => this.host.closeModal()
    }));
  }

  public sellFishByIndex(index: number): void {
    if (!this.host.canSellFish()) {
      this.host.floatText("Fish selling unlocks in Phase 3", toastX, toastY, "#d7f4ff");
      this.host.closeModal();
      return;
    }

    const fishToSell = this.host.activeFish()[index];
    if (!fishToSell) {
      this.host.floatText("No fish to sell", toastX, toastY, "#ffb0a8");
      return;
    }

    if (this.host.activeFish().length <= 1) {
      this.host.floatText("Keep one fish", toastX, toastY, "#ffb0a8");
      this.host.closeModal();
      return;
    }

    const commonSellValue = activeFishSellValueModel(fishToSell);
    this.host.removeFishAt(index);
    earn(this.host.getWallet(), "common", commonSellValue);
    this.host.recordDailyQuestAction("sell-fish");
    this.host.recordDailyQuestAction("sell-active-fish");
    this.host.floatText(`Sold ${fishToSell.type.name} +C${formatNumber(commonSellValue)}`, toastX, toastY, "#ffe67a");
    fishToSell.destroy();
    this.host.closeModal();
    this.host.refreshUi();
    this.host.saveNow();
  }

  public sellStoredFish(fishTypeId: string, quantity = 1): void {
    if (!this.host.canSellFish()) {
      this.host.floatText("Fish selling unlocks in Phase 3", toastX, toastY, "#d7f4ff");
      this.host.closeModal();
      return;
    }

    const fishType = storedFishTypeFromCatalog(fishTypes, fishTypeId);
    const current = this.host.getFishInventory(fishTypeId);
    if (!fishType || current <= 0) {
      this.host.floatText("No fish in inventory", toastX, toastY, "#ffb0a8");
      return;
    }

    const salePlan = planStoredFishSale({
      fishType,
      current,
      requestedQuantity: quantity,
      sellValue: this.storedFishSellValueForQuantity(fishType, Math.min(current, Math.max(1, Math.floor(quantity))))
    });
    for (let index = 0; index < salePlan.sellQuantity; index += 1) {
      this.takeStoredFishAge(fishTypeId);
    }
    this.host.removeStoredFish(fishTypeId, salePlan.sellQuantity);
    earn(this.host.getWallet(), "common", salePlan.sellValue);
    this.host.recordDailyQuestAction("sell-fish");
    this.host.recordDailyQuestAction("sell-stored-fish");
    this.host.floatText(`Sold ${fishType.name} x${formatNumber(salePlan.sellQuantity)} +C${formatNumber(salePlan.sellValue)}`, toastX, toastY, "#ffe67a");
    this.host.closeModal();
    this.host.refreshUi();
    this.host.saveNow();
  }

  public removeStoredFish(fishTypeId: string, quantity = 1): void {
    removeStoredFishModel({
      fishInventory: this.host.getFishInventoryMap(),
      fishTypeId,
      quantity,
      trimStoredFishAges: (trimFishTypeId) => this.trimStoredFishAges(trimFishTypeId)
    });
  }

  public storedFishSellValueForQuantity(fishType: FishType, quantity: number): number {
    const sellQuantity = Math.max(1, Math.floor(quantity));
    let total = 0;
    for (let index = 0; index < sellQuantity; index += 1) {
      total += storedFishSellValueModel(fishType, 0);
    }
    return total;
  }

  // Ages
  public storedFishAgesFor(fishTypeId: string): number[] {
    return [...(this.host.getFishInventoryAgesMap().get(fishTypeId) ?? [])];
  }

  public addStoredFishAge(fishTypeId: string, ageSeconds: number): void {
    if (!Number.isFinite(ageSeconds)) {
      return;
    }

    const ages = this.host.getFishInventoryAgesMap().get(fishTypeId) ?? [];
    ages.push(Math.max(0, Math.floor(ageSeconds)));
    this.host.getFishInventoryAgesMap().set(fishTypeId, ages);
  }

  public takeStoredFishAge(fishTypeId: string): number {
    const ages = this.host.getFishInventoryAgesMap().get(fishTypeId);
    if (!ages || ages.length === 0) {
      return 0;
    }

    const ageSeconds = ages.shift() ?? 0;
    if (ages.length === 0) {
      this.host.getFishInventoryAgesMap().delete(fishTypeId);
    }
    return ageSeconds;
  }

  public setStoredFishAges(fishTypeId: string, ages: number[]): void {
    const normalizedAges = ages
      .filter((ageSeconds) => Number.isFinite(ageSeconds))
      .map((ageSeconds) => Math.max(0, Math.floor(ageSeconds)));
    if (normalizedAges.length === 0) {
      this.host.getFishInventoryAgesMap().delete(fishTypeId);
      return;
    }

    this.host.getFishInventoryAgesMap().set(fishTypeId, normalizedAges);
  }

  public trimStoredFishAges(fishTypeId: string): void {
    this.setStoredFishAges(fishTypeId, this.storedFishAgesFor(fishTypeId));
  }

  public fusionAgeLabel(ageSeconds: number): string {
    return fusionAgeLabelModel(ageSeconds);
  }

  public fishPowerLevelForAgeSeconds(ageSeconds: number): number {
    return fishPowerLevelForAgeSecondsModel(ageSeconds);
  }

  public storedFishPowerAgeSeconds(fishType: FishType): number {
    const ages = this.host.getFishInventoryAgesMap().get(fishType.id) ?? [];
    if (ages.length === 0) {
      return 0;
    }

    return ages.reduce((maxAge, ageSeconds) => Math.max(maxAge, ageSeconds), 0);
  }

  // Fusion
  public showFishFusionModal(preselectedKeys: Iterable<string> = []): void {
    this.host.showFishFusionModal(preselectedKeys);
  }

  public fishFusionSources(): FishFusionSource[] {
    return this.host.fishFusionSources();
  }

  public fishFusionResultTypes(sources: FishFusionSource[]): { normal?: FishType; premium?: FishType } {
    return this.host.fishFusionResultTypes(sources);
  }

  public fishFusionSourceSellValue(source: FishFusionSource): number {
    return this.host.fishFusionSourceSellValue(source);
  }

  public fishFusionCostFor(sources: FishFusionSource[]): Price {
    return this.host.fishFusionCostFor(sources);
  }

  public areFishFusionSourcesAvailable(sources: FishFusionSource[]): boolean {
    return this.host.areFishFusionSourcesAvailable(sources);
  }

  public fishFusionChancesFor(sources: FishFusionSource[], hasPremium: boolean): FishFusionChances {
    return this.host.fishFusionChancesFor(sources, hasPremium);
  }

  public consumeFishFusionSources(sources: FishFusionSource[]): void {
    this.host.consumeFishFusionSources(sources);
  }

  // Helpers
  private storedFishTypes(): FishType[] {
    return fishTypes.filter((fishType) => this.host.getFishInventory(fishType.id) > 0);
  }
}

const toastX = 215;
const toastY = 420;
