import { toastX, toastY } from "../../game/constants";
import { formatPrice } from "../../game/economy";
import {
  createFishFusionSources,
  fishFusionChancesFor as fishFusionChancesForModel,
  fishFusionCostFor as fishFusionCostForModel,
  fishFusionResultTypes as fishFusionResultTypesModel,
  fishFusionSourceSellValue as fishFusionSourceSellValueModel,
  type FishFusionChances,
  type FishFusionSource
} from "../../game/fish-fusion";
import { consumeFishFusionSources as consumeFishFusionSourcesModel } from "../../game/fish-inventory";
import type { Fish } from "../../objects/Fish";
import {
  createFishFusionModal,
  createFusionFishPickerModal,
  createInventoryFusionPage
} from "../../ui/FusionFlow";
import type { FishType, Price, Wallet } from "../../types/mechanics";
import type { AppScreen, FishFusionPageResult } from "./aquarium-scene-config";
import type { AquariumSceneCore } from "./AquariumSceneCore";

type AquariumFusionScene = {
  activeScreen: AppScreen;
  developerGodMode: boolean;
  fish: Fish[];
  fishInventory: Map<string, number>;
  fusionPageResult?: FishFusionPageResult;
  fusionPreviewSourceKeys: Set<string>;
  fusionRunToken: number;
  modal?: HTMLDivElement;
  modalTitle?: string;
  pendingFusionTimer?: number;
  settings: { reducedMotion: boolean };
  wallet: Wallet;

  activeFish(): Fish[];
  activeFishSellValue(fish: Fish): number;
  addFishToInventory(fishType: FishType): void;
  addStoredFishAge(fishTypeId: string, ageSeconds: number): void;
  areFishFusionSourcesAvailable?(sources: FishFusionSource[]): boolean;
  attachTouchFeedback(button: HTMLButtonElement): void;
  captureActiveTankState(): void;
  closeModal(): void;
  closePage(): void;
  createFoodDock(): void;
  ensureFishTexturesLoaded(fishType: FishType): boolean;
  fishFusionChancesFor?(sources: FishFusionSource[], hasPremium: boolean): FishFusionChances;
  fishFusionCostFor?(sources: FishFusionSource[]): Price;
  fishFusionResultTypes?(sources: FishFusionSource[]): { normal?: FishType; premium?: FishType };
  fishFusionSourceSellValue?(source: FishFusionSource): number;
  fishFusionSources?(): FishFusionSource[];
  floatText(message: string, x: number, y: number, color: string): void;
  fusionAgeLabel(ageSeconds: number): string;
  getFishInventory(fishTypeId: string): number;
  ownedFishTypeIds(): Set<string>;
  priceWealth(price: Price): number;
  recordDailyQuestAction(action: string): void;
  refreshStatus(): void;
  refreshUi(): void;
  saveNow(): void;
  setStoredFishAges(fishTypeId: string, ages: number[]): void;
  showPrizeCelebration(title: string, imageUrl: string, detail: string, actionLabel: string, onClose: () => void): void;
  spendPrice(price: Price): boolean;
  storedFishAgesFor(fishTypeId: string): number[];
  storedFishSellValue(fishType: FishType): number;
  syncCoinDropVisibilityAndInput(): void;
  syncHtmlGameInterface(): void;
  syncHtmlPageOverlay(): void;
  trimStoredFishAges(fishTypeId: string): void;
};

export type AquariumFusionAdapter = {
  appendInventoryFusionTab(content: HTMLElement): void;
  showFusionFishPicker(slotIndex: 0 | 1, sources: FishFusionSource[]): void;
  showFishFusionModal(preselectedKeys?: Iterable<string>): void;
  fishFusionSources(): FishFusionSource[];
  fishFusionResultTypes(sources: FishFusionSource[]): { normal?: FishType; premium?: FishType };
  fishFusionSourceSellValue(source: FishFusionSource): number;
  fishFusionCostFor(sources: FishFusionSource[]): Price;
  areFishFusionSourcesAvailable(sources: FishFusionSource[]): boolean;
  fishFusionChancesFor(sources: FishFusionSource[], hasPremium: boolean): FishFusionChances;
  consumeFishFusionSources(sources: FishFusionSource[]): void;
};

export function createAquariumFusionAdapter(scene: AquariumSceneCore): AquariumFusionAdapter {
  const aquariumScene = scene as unknown as AquariumFusionScene;

  const sources = () => createFishFusionSources({
    activeFish: aquariumScene.activeFish(),
    fishInventory: aquariumScene.fishInventory,
    storedFishAgesFor: (fishTypeId) => aquariumScene.storedFishAgesFor(fishTypeId)
  });

  const resultTypes = (fishSources: FishFusionSource[]) => fishFusionResultTypesModel({
    sources: fishSources,
    ownedFishTypeIds: aquariumScene.ownedFishTypeIds(),
    activeFish: aquariumScene.fish,
    activeFishSellValue: (fish) => aquariumScene.activeFishSellValue(fish),
    storedFishSellValue: (fishType) => aquariumScene.storedFishSellValue(fishType),
    priceWealth: (price) => aquariumScene.priceWealth(price)
  });

  const sourceSellValue = (source: FishFusionSource) => fishFusionSourceSellValueModel(source, {
    activeFish: aquariumScene.fish,
    activeFishSellValue: (fish) => aquariumScene.activeFishSellValue(fish),
    storedFishSellValue: (fishType) => aquariumScene.storedFishSellValue(fishType)
  });

  const costFor = (fishSources: FishFusionSource[]) => fishFusionCostForModel(fishSources, sourceSellValue);
  const areSourcesAvailable = (fishSources: FishFusionSource[]) => {
    const availableKeys = new Set(sources().map((source) => source.key));
    return fishSources.every((source) => availableKeys.has(source.key));
  };

  const applyFusionResult = (input: {
    selected: FishFusionSource[];
    resultType: FishType;
    inheritedAge: number;
  }) => {
    aquariumScene.captureActiveTankState();
    consumeSources(input.selected);
    aquariumScene.addFishToInventory(input.resultType);
    aquariumScene.addStoredFishAge(input.resultType.id, input.inheritedAge);
    aquariumScene.ensureFishTexturesLoaded(input.resultType);
  };

  const baseFlow = () => ({
    reducedMotion: () => aquariumScene.settings.reducedMotion,
    ageLabel: (seconds: number) => aquariumScene.fusionAgeLabel(seconds),
    attachTouchFeedback: (button: HTMLButtonElement) => aquariumScene.attachTouchFeedback(button),
    resultTypesFor: resultTypes,
    chancesFor: (fishSources: FishFusionSource[], hasPremium: boolean) => fishFusionChancesForModel(fishSources, hasPremium),
    costFor,
    canUseGodMode: () => aquariumScene.developerGodMode,
    wallet: () => aquariumScene.wallet,
    floatText: (message: string, color: string) => aquariumScene.floatText(message, toastX, toastY, color),
    areSourcesAvailable,
    spendPrice: (price: Price) => aquariumScene.spendPrice(price),
    applyFusionResult,
    nextFusionToken: () => ++aquariumScene.fusionRunToken,
    setPendingFusionTimer: (timer: number | undefined) => {
      aquariumScene.pendingFusionTimer = timer;
    }
  });

  const consumeSources = (fishSources: FishFusionSource[]) => {
    consumeFishFusionSourcesModel({
      sources: fishSources,
      activeFish: aquariumScene.fish,
      fishInventory: aquariumScene.fishInventory,
      getFishInventory: (fishTypeId) => aquariumScene.getFishInventory(fishTypeId),
      storedFishAgesFor: (fishTypeId) => aquariumScene.storedFishAgesFor(fishTypeId),
      setStoredFishAges: (fishTypeId, ages) => aquariumScene.setStoredFishAges(fishTypeId, ages),
      trimStoredFishAges: (fishTypeId) => aquariumScene.trimStoredFishAges(fishTypeId)
    });
  };

  return {
    appendInventoryFusionTab(content) {
      content.append(createInventoryFusionPage({
        ...baseFlow(),
        sources: sources(),
        selectedKeys: () => aquariumScene.fusionPreviewSourceKeys,
        setSelectedKeys: (keys) => {
          aquariumScene.fusionPreviewSourceKeys = keys;
        },
        pageResult: () => aquariumScene.fusionPageResult,
        setPageResult: (result) => {
          aquariumScene.fusionPageResult = result;
        },
        showFishPicker: (slotIndex, fishSources) => this.showFusionFishPicker(slotIndex, fishSources),
        isPageFusionCurrent: (token, outputStage) =>
          token === aquariumScene.fusionRunToken &&
          aquariumScene.activeScreen === "album" &&
          document.body.contains(outputStage),
        afterFusionSuccess: ({ resultLabel, resultType, inheritedAge, fusionCost }) => {
          aquariumScene.floatText(`-${formatPrice(fusionCost)} fusion`, toastX, toastY, "#ffdc7a");
          aquariumScene.floatText(`${resultType.name} moved to inventory`, toastX, toastY, "#a8ffb0");
          aquariumScene.createFoodDock();
          aquariumScene.saveNow();
          aquariumScene.refreshStatus();
          aquariumScene.syncHtmlGameInterface();
          aquariumScene.showPrizeCelebration(
            `Fusion ${resultLabel}!`,
            `/assets/fish/${resultType.id}.png`,
            `${resultType.name} inventory | ${aquariumScene.fusionAgeLabel(inheritedAge)}`,
            "Close",
            () => aquariumScene.closePage()
          );
        }
      }));
    },

    showFusionFishPicker(slotIndex, fishSources) {
      aquariumScene.closeModal();
      aquariumScene.modalTitle = "Choose Fish";
      const shell = createFusionFishPickerModal({
        slotIndex,
        sources: fishSources,
        selectedKeys: () => aquariumScene.fusionPreviewSourceKeys,
        setSelectedKeys: (keys) => {
          aquariumScene.fusionPreviewSourceKeys = keys;
        },
        setPageResult: (result) => {
          aquariumScene.fusionPageResult = result;
        },
        ageLabel: (seconds) => aquariumScene.fusionAgeLabel(seconds),
        attachTouchFeedback: (button) => aquariumScene.attachTouchFeedback(button),
        closeModal: () => aquariumScene.closeModal(),
        syncHtmlPageOverlay: () => aquariumScene.syncHtmlPageOverlay()
      });
      document.body.appendChild(shell);
      aquariumScene.modal = shell;
      aquariumScene.syncCoinDropVisibilityAndInput();
    },

    showFishFusionModal(preselectedKeys: Iterable<string> = []) {
      const fishSources = sources();
      if (fishSources.length < 2) {
        aquariumScene.floatText("Need 2 fish", toastX, toastY, "#ffb0a8");
        return;
      }

      aquariumScene.closeModal();
      aquariumScene.modalTitle = "Fusion";
      const shell = createFishFusionModal({
        ...baseFlow(),
        sources: fishSources,
        preselectedKeys,
        closeModal: () => aquariumScene.closeModal(),
        isModalFusionCurrent: (token, shellElement) =>
          token === aquariumScene.fusionRunToken &&
          aquariumScene.modal === shellElement &&
          document.body.contains(shellElement),
        afterFusionSuccess: ({ resultLabel, resultType, fusionCost }) => {
          aquariumScene.recordDailyQuestAction("fuse-fish");
          if (resultLabel === "Premium") {
            aquariumScene.recordDailyQuestAction("premium-fusion");
          }
          aquariumScene.floatText(`-${formatPrice(fusionCost)} fusion`, toastX, toastY, "#ffdc7a");
          aquariumScene.floatText(`${resultType.name} moved to inventory`, toastX, toastY, "#a8ffb0");
          aquariumScene.createFoodDock();
          aquariumScene.refreshUi();
          aquariumScene.saveNow();
        }
      });
      if (!shell) {
        return;
      }
      document.body.appendChild(shell);
      aquariumScene.modal = shell;
      aquariumScene.syncCoinDropVisibilityAndInput();
    },

    fishFusionSources: sources,
    fishFusionResultTypes: resultTypes,
    fishFusionSourceSellValue: sourceSellValue,
    fishFusionCostFor: costFor,
    areFishFusionSourcesAvailable: areSourcesAvailable,
    fishFusionChancesFor: (fishSources, hasPremium) => fishFusionChancesForModel(fishSources, hasPremium),
    consumeFishFusionSources: consumeSources
  };
}
