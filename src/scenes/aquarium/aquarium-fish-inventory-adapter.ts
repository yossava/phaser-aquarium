import type Phaser from "phaser";
import type { Fish } from "../../objects/Fish";
import type { FishGender, FishType, Price } from "../../types/mechanics";
import type { AquariumFishInventoryControllerHost } from "./aquarium-fish-inventory-controller";
import type { AquariumSceneCore } from "./AquariumSceneCore";
import { createAquariumFusionAdapter } from "./aquarium-fusion-adapter";
import type { FishFusionChances, FishFusionSource } from "../../game/fish-fusion";
import type { FishFusionPageResult } from "./aquarium-scene-config";
import type { ModalContent } from "../../ui/SellConfirmationModals";

type FishInventoryAdapterScene = Phaser.Scene & {
  fish: Fish[];
  fishInventory: Map<string, number>;
  fishInventoryAges: Map<string, number[]>;
  fusionPreviewSourceKeys: Set<string>;
  fusionPageResult?: FishFusionPageResult;
  pendingFusionTimer?: number;
  fusionRunToken: number;
  recentInventoryDockItemKey?: string;
  tankLevel: number;
  wallet: { common: number; rare: number; superRare: number };

  activeFish(): Fish[];
  getFishInventory(fishTypeId: string): number;
  totalStoredFishCount(): number;
  addFishToTank(type: FishType, x: number, y: number, options?: { gender?: FishGender; tankLevel?: number; ageSeconds?: number; visualAgeSeconds?: number }): Fish;
  placeFishWithCompatibility(type: FishType, x: number, y: number): void;
  removeFishAt(index: number): Fish | undefined;
  addFishToInventory(fishType: FishType, quantity?: number): void;
  storedFishPowerAgeSeconds(fishType: FishType): number;
  fishCatalogPreviewTextureKey(fishType: FishType): string;
  ownedFishTypeIds(): Set<string>;
  removeStoredFish(fishTypeId: string, quantity?: number): void;
  canSellFish(): boolean;
  rarityLabel(rarity: FishType["rarity"]): string;
  commonCoinValueRow(label: string, amount: number): HTMLElement;
  attachTouchFeedback(button: HTMLElement): void;
  projectedActiveProductionPerMinute(): number;
  maxFishCapacityForLevel(): number;
  randomFishPlacement(): Phaser.Math.Vector2;
  returnToTankScreen(): void;
  floatText(message: string, x: number, y: number, color: string): void;
  floatTankText(message: string, x: number, y: number, color: string): void;
  refreshUi(renderControls?: boolean): void;
  saveNow(): void;
  closeModal(): void;
  showModalContent(content: ModalContent): void;
  recordDailyQuestAction(action: string): void;
  createFoodDock(): void;
  renderTabControls(): void;
  ensureTankState(level: number): { fishInventory: Map<string, number> };
  tankStates: Map<number, { fishInventory: Map<string, number> }>;
  htmlButton(label: string, className: string, action: () => void, disabled?: boolean): HTMLButtonElement;
};

export function createAquariumFishInventoryControllerHost(scene: AquariumSceneCore): AquariumFishInventoryControllerHost {
  const s = scene as unknown as FishInventoryAdapterScene;
  const fusion = createAquariumFusionAdapter(scene);
  return {
    scene: s,

    // State accessors
    getFishInventoryMap: () => s.fishInventory,
    getFishInventoryAgesMap: () => s.fishInventoryAges,
    getFusionPreviewSourceKeys: () => s.fusionPreviewSourceKeys,
    setFusionPreviewSourceKeys: (keys) => {
      s.fusionPreviewSourceKeys = keys;
    },
    getFusionPageResult: () => s.fusionPageResult,
    setFusionPageResult: (result) => {
      s.fusionPageResult = result;
    },
    getPendingFusionTimer: () => s.pendingFusionTimer,
    setPendingFusionTimer: (timer) => {
      s.pendingFusionTimer = timer;
    },
    getFusionRunToken: () => s.fusionRunToken,
    setFusionRunToken: (token) => {
      s.fusionRunToken = token;
    },
    setRecentInventoryDockItemKey: (key) => {
      s.recentInventoryDockItemKey = key;
    },

    // Core methods
    activeFish: () => s.activeFish(),
    getFishInventory: (fishTypeId) => s.getFishInventory(fishTypeId),
    totalStoredFishCount: () => s.totalStoredFishCount(),
    addFishToTank: (type, x, y, options) => s.addFishToTank(type, x, y, options),
    placeFishWithCompatibility: (type, x, y) => s.placeFishWithCompatibility(type, x, y),
    removeFishAt: (index) => s.removeFishAt(index),
    addFishToInventory: (fishType, quantity) => s.addFishToInventory(fishType, quantity),
    storedFishPowerAgeSeconds: (fishType) => s.storedFishPowerAgeSeconds(fishType),
    fishCatalogPreviewTextureKey: (fishType) => s.fishCatalogPreviewTextureKey(fishType),
    ownedFishTypeIds: () => s.ownedFishTypeIds(),
    removeStoredFish: (fishTypeId, quantity) => s.removeStoredFish(fishTypeId, quantity),
    canSellFish: () => s.canSellFish(),
    rarityLabel: (rarity) => s.rarityLabel(rarity),
    commonCoinValueRow: (label, amount) => s.commonCoinValueRow(label, amount),
    attachTouchFeedback: (button) => s.attachTouchFeedback(button),
    projectedActiveProductionPerMinute: () => s.projectedActiveProductionPerMinute(),
    maxFishCapacityForLevel: () => s.maxFishCapacityForLevel(),
    randomFishPlacement: () => s.randomFishPlacement(),
    returnToTankScreen: () => s.returnToTankScreen(),
    floatText: (message, x, y, color) => s.floatText(message, x, y, color),
    floatTankText: (message, x, y, color) => s.floatTankText(message, x, y, color),
    refreshUi: (renderControls) => s.refreshUi(renderControls),
    saveNow: () => s.saveNow(),
    closeModal: () => s.closeModal(),
    showModalContent: (content) => s.showModalContent(content),
    recordDailyQuestAction: (action) => s.recordDailyQuestAction(action),
    createFoodDock: () => s.createFoodDock(),
    renderTabControls: () => s.renderTabControls(),
    ensureTankState: (level) => s.ensureTankState(level),
    getTankStates: () => s.tankStates,
    getTankLevel: () => s.tankLevel,
    getWallet: () => s.wallet,
    htmlButton: (label, className, action, disabled) => s.htmlButton(label, className, action, disabled),

    // Fusion adapter methods
    showFishFusionModal: (preselectedKeys) => fusion.showFishFusionModal(preselectedKeys),
    fishFusionSources: () => fusion.fishFusionSources(),
    fishFusionResultTypes: (sources) => fusion.fishFusionResultTypes(sources),
    fishFusionSourceSellValue: (source) => fusion.fishFusionSourceSellValue(source),
    fishFusionCostFor: (sources) => fusion.fishFusionCostFor(sources),
    areFishFusionSourcesAvailable: (sources) => fusion.areFishFusionSourcesAvailable(sources),
    fishFusionChancesFor: (sources, hasPremium) => fusion.fishFusionChancesFor(sources, hasPremium),
    consumeFishFusionSources: (sources) => fusion.consumeFishFusionSources(sources)
  };
}
