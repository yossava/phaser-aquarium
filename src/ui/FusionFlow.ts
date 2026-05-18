import { fishTypes } from "../data/content";
import { canAfford, formatNumber, formatPrice } from "../game/economy";
import { fishFusionDurationMs, type FishFusionSource } from "../game/fish-fusion";
import type { FishType, Price, Wallet } from "../types/mechanics";
import {
  createFusionFinalResult,
  createFusionFishPickerShell,
  createFusionLoadingChamber,
  createFusionMachine,
  createFusionMachinePlaceholder,
  createFusionOutputStage,
  createFusionPageRoot,
  createFusionResultCandidate,
  createFusionResultList,
  createFusionSelectedDockChildren
} from "./FusionPage";
import { createPageEmptyCard } from "./PageOverlay";
import { createHtmlButton, htmlElement, htmlImage } from "./dom";
import { playModalEnter } from "./dom-motion";

export type FishFusionPageResult = {
  label: string;
  fishTypeId: string;
  ageSeconds: number;
};

type FusionOutcome = {
  label: string;
  fishType: FishType;
};

type FusionFlowBase = {
  ageLabel: (seconds: number) => string;
  attachTouchFeedback: (button: HTMLButtonElement) => void;
  resultTypesFor: (sources: FishFusionSource[]) => { normal?: FishType; premium?: FishType };
  chancesFor: (sources: FishFusionSource[], hasPremium: boolean) => { normal: number; premium: number };
  costFor: (sources: FishFusionSource[]) => Price;
  canUseGodMode: () => boolean;
  wallet: () => Wallet;
  floatText: (message: string, color: string) => void;
  areSourcesAvailable: (sources: FishFusionSource[]) => boolean;
  spendPrice: (price: Price) => boolean;
  applyFusionResult: (input: {
    selected: FishFusionSource[];
    resultType: FishType;
    inheritedAge: number;
  }) => void;
  nextFusionToken: () => number;
  setPendingFusionTimer: (timer: number | undefined) => void;
};

export type InventoryFusionPageFlow = FusionFlowBase & {
  sources: FishFusionSource[];
  selectedKeys: () => Set<string>;
  setSelectedKeys: (keys: Set<string>) => void;
  pageResult: () => FishFusionPageResult | undefined;
  setPageResult: (result: FishFusionPageResult | undefined) => void;
  reducedMotion: () => boolean;
  showFishPicker: (slotIndex: 0 | 1, sources: FishFusionSource[]) => void;
  isPageFusionCurrent: (token: number, outputStage: HTMLElement) => boolean;
  afterFusionSuccess: (input: {
    resultLabel: string;
    resultType: FishType;
    inheritedAge: number;
    fusionCost: Price;
  }) => void;
};

export function createInventoryFusionPage(input: InventoryFusionPageFlow): HTMLElement {
  const sources = input.sources;
  const fusionList = createFusionPageRoot();
  const canStart = sources.length >= 2;
  const validKeys = new Set(sources.map((source) => source.key));
  input.setSelectedKeys(new Set([...input.selectedKeys()].filter((key) => validKeys.has(key)).slice(0, 2)));

  if (!canStart && !input.pageResult()) {
    fusionList.append(createPageEmptyCard("Need 2 owned fish", "Keep at least two tank or inventory fish to start fusion."));
    return fusionList;
  }

  const selectedDock = htmlElement("div", "aq-fusion-selected-dock");
  const outputStage = createFusionOutputStage();
  const renderSavedResult = () => {
    const savedResult = input.pageResult();
    const resultFish = savedResult ? fishTypes.find((fishType) => fishType.id === savedResult.fishTypeId) : undefined;
    if (!resultFish || !savedResult) {
      outputStage.replaceChildren(createFusionMachinePlaceholder("Choose two fish to reveal Normal and Premium outcomes."));
      return;
    }
    outputStage.replaceChildren(
      createFusionFinalResult({
        label: savedResult.label,
        fishType: resultFish,
        ageSeconds: savedResult.ageSeconds,
        ageLabel: input.ageLabel
      })
    );
  };

  let previewButton: HTMLButtonElement;
  const sourceByKey = new Map(sources.map((source) => [source.key, source]));
  const selectedSourceKeys = (): string[] => [...input.selectedKeys()].filter((key) => sourceByKey.has(key)).slice(0, 2);
  const selectedSources = (): FishFusionSource[] => selectedSourceKeys()
    .map((key) => sourceByKey.get(key))
    .filter((source): source is FishFusionSource => Boolean(source));
  const updatePreviewSelection = () => {
    const selected = selectedSources();
    const fusionCost = selected.length === 2 ? input.costFor(selected) : undefined;
    const canPayFusionCost = !fusionCost || input.canUseGodMode() || canAfford(input.wallet(), fusionCost);
    previewButton.disabled = selected.length !== 2 || !canPayFusionCost;
    previewButton.textContent = selected.length === 2
      ? canPayFusionCost
        ? `Fuse C${formatNumber(fusionCost?.amount ?? 0)}`
        : `Need C${formatNumber(fusionCost?.amount ?? 0)}`
      : `Select ${formatNumber(2 - selected.length)} More`;
    selectedDock.replaceChildren(
      ...createFusionSelectedDockChildren({
        selected,
        sources,
        ageLabel: input.ageLabel,
        attachTouchFeedback: input.attachTouchFeedback,
        onPickSlot: input.showFishPicker
      })
    );
    if (selected.length === 2) {
      const resultTypes = input.resultTypesFor(selected);
      if (resultTypes.normal) {
        const chances = input.chancesFor(selected, Boolean(resultTypes.premium));
        const inheritedAge = Math.max(...selected.map((source) => source.ageSeconds));
        outputStage.replaceChildren(
          ...createFusionResultList({
            normal: resultTypes.normal,
            premium: resultTypes.premium,
            normalChance: chances.normal,
            premiumChance: chances.premium,
            ageSeconds: inheritedAge,
            costAmount: input.costFor(selected).amount,
            ageLabel: input.ageLabel
          })
        );
      } else {
        outputStage.replaceChildren(createFusionMachinePlaceholder("No un-owned fish available."));
      }
    } else {
      renderSavedResult();
    }
  };

  previewButton = createHtmlButton("Select 2 Fish", "aq-fusion-preview-button", () => {
    const selected = selectedSources();
    if (selected.length !== 2) {
      return;
    }
    const resultTypes = input.resultTypesFor(selected);
    const normalResult = resultTypes.normal;
    if (!normalResult) {
      input.floatText("No un-owned fish", "#ffb0a8");
      return;
    }
    const fusionCost = input.costFor(selected);
    if (!input.canUseGodMode() && !canAfford(input.wallet(), fusionCost)) {
      return;
    }

    previewButton.disabled = true;
    previewButton.textContent = "Fusing...";
    const fusionDuration = input.reducedMotion() ? 1200 : fishFusionDurationMs;
    outputStage.replaceChildren(
      createFusionLoadingChamber({
        leftFishType: selected[0].type,
        rightFishType: selected[1].type
      })
    );
    outputStage.style.setProperty("--aq-fusion-duration", `${fusionDuration}ms`);

    const chances = input.chancesFor(selected, Boolean(resultTypes.premium));
    const resultOutcome = rollFusionOutcome({ normal: normalResult, premium: resultTypes.premium }, chances.premium);
    const inheritedAge = Math.max(...selected.map((source) => source.ageSeconds));
    const fusionToken = input.nextFusionToken();

    input.setPendingFusionTimer(window.setTimeout(() => {
      input.setPendingFusionTimer(undefined);
      if (!input.isPageFusionCurrent(fusionToken, outputStage)) {
        return;
      }
      if (!input.areSourcesAvailable(selected)) {
        input.setSelectedKeys(new Set());
        outputStage.style.removeProperty("--aq-fusion-duration");
        updatePreviewSelection();
        outputStage.replaceChildren(createFusionMachinePlaceholder("Fusion source changed. Select two fish again."));
        return;
      }
      if (!input.spendPrice(fusionCost)) {
        outputStage.style.removeProperty("--aq-fusion-duration");
        updatePreviewSelection();
        outputStage.replaceChildren(createFusionMachinePlaceholder(`Need ${formatPrice(fusionCost)} to fuse.`));
        return;
      }
      const resultType = resultOutcome.fishType;
      input.applyFusionResult({ selected, resultType, inheritedAge });
      outputStage.style.removeProperty("--aq-fusion-duration");
      input.setPageResult({
        label: resultOutcome.label,
        fishTypeId: resultType.id,
        ageSeconds: inheritedAge
      });
      input.setSelectedKeys(new Set());
      input.afterFusionSuccess({
        resultLabel: resultOutcome.label,
        resultType,
        inheritedAge,
        fusionCost
      });
      updatePreviewSelection();
    }, fusionDuration));
  }, {
    disabled: input.selectedKeys().size !== 2,
    attachTouchFeedback: input.attachTouchFeedback
  });

  fusionList.append(...createFusionMachine({ selectedDock, outputStage, previewButton }));
  updatePreviewSelection();
  return fusionList;
}

export type FusionFishPickerFlow = {
  slotIndex: 0 | 1;
  sources: FishFusionSource[];
  selectedKeys: () => Set<string>;
  setSelectedKeys: (keys: Set<string>) => void;
  setPageResult: (result: FishFusionPageResult | undefined) => void;
  ageLabel: (seconds: number) => string;
  attachTouchFeedback: (button: HTMLButtonElement) => void;
  closeModal: () => void;
  syncHtmlPageOverlay: () => void;
};

export function createFusionFishPickerModal(input: FusionFishPickerFlow): HTMLDivElement {
  const selectedKeys = [...input.selectedKeys()].slice(0, 2);
  const chooseSource = (source: FishFusionSource) => {
    input.setPageResult(undefined);
    selectedKeys[input.slotIndex] = source.key;
    input.setSelectedKeys(new Set(selectedKeys.filter((key, index) => key && selectedKeys.indexOf(key) === index).slice(0, 2)));
    input.closeModal();
    input.syncHtmlPageOverlay();
  };

  return createFusionFishPickerShell({
    slotIndex: input.slotIndex,
    sources: input.sources,
    selectedKeys: input.selectedKeys(),
    ageLabel: input.ageLabel,
    attachTouchFeedback: input.attachTouchFeedback,
    onChoose: chooseSource,
    onCancel: input.closeModal
  });
}

export type FishFusionModalFlow = FusionFlowBase & {
  sources: FishFusionSource[];
  preselectedKeys?: Iterable<string>;
  reducedMotion: () => boolean;
  closeModal: () => void;
  isModalFusionCurrent: (token: number, shell: HTMLElement) => boolean;
  afterFusionSuccess: (input: {
    resultLabel: string;
    resultType: FishType;
    inheritedAge: number;
    fusionCost: Price;
  }) => void;
};

export function createFishFusionModal(input: FishFusionModalFlow): HTMLDivElement | undefined {
  const sources = input.sources;
  if (sources.length < 2) {
    input.floatText("Need 2 fish", "#ffb0a8");
    return undefined;
  }

  const validKeys = new Set(sources.map((source) => source.key));
  const selectedKeys = new Set([...(input.preselectedKeys ?? [])].filter((key) => validKeys.has(key)).slice(0, 2));
  const selectedSources = (): FishFusionSource[] => sources.filter((source) => selectedKeys.has(source.key));

  const shell = htmlElement("div", "aq-modal-shell aq-fusion-modal-shell");
  const stopEvent = (event: Event) => {
    event.stopPropagation();
  };
  shell.addEventListener("pointerdown", stopEvent);
  shell.addEventListener("pointerup", stopEvent);
  shell.addEventListener("click", stopEvent);

  const selectedLabel = htmlElement("p", "aq-modal-line aq-fusion-selected", ["Select 2 fish"]);
  const resultStage = htmlElement("div", "aq-fusion-result-stage", [
    htmlElement("p", "aq-fusion-result-copy", ["Select 2 fish to preview the result."])
  ]);
  const sourceGrid = htmlElement("div", "aq-fusion-source-grid");
  let fuseButton: HTMLButtonElement;

  const updateSelection = () => {
    const selected = selectedSources();
    selectedLabel.textContent = selected.length === 0
      ? "Select 2 fish"
      : selected.map((source) => `${source.type.name} (${source.label})`).join(" + ");
    fuseButton.disabled = selected.length !== 2;
    fuseButton.textContent = selected.length === 2 ? `FUSE C${formatNumber(input.costFor(selected).amount)}` : "FUSE";
    const resultTypes = selected.length === 2 ? input.resultTypesFor(selected) : undefined;
    if (resultTypes?.normal) {
      const inheritedAge = Math.max(...selected.map((source) => source.ageSeconds));
      const chances = input.chancesFor(selected, Boolean(resultTypes.premium));
      resultStage.replaceChildren(
        htmlElement("div", "aq-fusion-result-candidates", [
          createFusionResultCandidate({ label: "Normal", fishType: resultTypes.normal, chance: chances.normal }),
          resultTypes.premium
            ? createFusionResultCandidate({ label: "Premium", fishType: resultTypes.premium, chance: chances.premium })
            : htmlElement("div", "aq-fusion-result-card unavailable", [
              htmlElement("span", "aq-fusion-result-tier", ["Premium"]),
              htmlElement("p", "aq-fusion-result-copy", ["No premium fish available"])
            ])
        ]),
        htmlElement("p", "aq-fusion-result-copy", [`Age ${input.ageLabel(inheritedAge)} | Always succeeds`])
      );
    } else {
      resultStage.replaceChildren(
        htmlElement("p", "aq-fusion-result-copy", [selected.length === 2 ? "No un-owned fish available." : "Select 2 fish to preview the result."])
      );
    }
    sourceGrid.querySelectorAll<HTMLButtonElement>(".aq-fusion-source-button").forEach((button) => {
      button.classList.toggle("selected", selectedKeys.has(button.dataset.sourceKey ?? ""));
    });
  };

  sources.forEach((source) => {
    const sourceButton = createHtmlButton("", "aq-fusion-source-button", () => {
      if (selectedKeys.has(source.key)) {
        selectedKeys.delete(source.key);
      } else if (selectedKeys.size < 2) {
        selectedKeys.add(source.key);
      }
      updateSelection();
    }, { attachTouchFeedback: input.attachTouchFeedback });
    sourceButton.dataset.sourceKey = source.key;
    sourceButton.append(
      htmlImage(`/assets/fish/${source.type.id}.png`, "", "aq-fusion-source-image"),
      htmlElement("span", "aq-fusion-source-name", [source.type.name]),
      htmlElement("span", "aq-fusion-source-meta", [`${source.label} | ${input.ageLabel(source.ageSeconds)}`])
    );
    sourceGrid.append(sourceButton);
  });

  const closeButton = createHtmlButton("Cancel", "aq-modal-button muted", input.closeModal, {
    attachTouchFeedback: input.attachTouchFeedback
  });
  fuseButton = createHtmlButton("FUSE", "aq-modal-button good", () => {
    const selected = selectedSources();
    if (selected.length !== 2) {
      return;
    }
    const resultTypes = input.resultTypesFor(selected);
    const normalResult = resultTypes.normal;
    if (!normalResult) {
      input.floatText("No un-owned fish", "#ffb0a8");
      return;
    }
    const fusionCost = input.costFor(selected);
    if (!input.canUseGodMode() && !canAfford(input.wallet(), fusionCost)) {
      return;
    }

    fuseButton.disabled = true;
    closeButton.disabled = true;
    sourceGrid.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
      button.disabled = true;
    });
    resultStage.classList.add("processing");
    resultStage.replaceChildren(
      htmlElement("div", "aq-fusion-spinner"),
      htmlElement("p", "aq-fusion-result-copy", ["Fusing..."])
    );

    const chances = input.chancesFor(selected, Boolean(resultTypes.premium));
    const resultOutcome = rollFusionOutcome({ normal: normalResult, premium: resultTypes.premium }, chances.premium);
    const inheritedAge = Math.max(...selected.map((source) => source.ageSeconds));
    const fusionToken = input.nextFusionToken();
    const unlockFusionControls = () => {
      closeButton.disabled = false;
      sourceGrid.querySelectorAll<HTMLButtonElement>("button").forEach((button) => {
        button.disabled = false;
      });
      updateSelection();
    };

    input.setPendingFusionTimer(window.setTimeout(() => {
      input.setPendingFusionTimer(undefined);
      if (!input.isModalFusionCurrent(fusionToken, shell)) {
        return;
      }
      if (!input.areSourcesAvailable(selected)) {
        resultStage.classList.remove("processing");
        selectedKeys.clear();
        unlockFusionControls();
        resultStage.replaceChildren(htmlElement("p", "aq-fusion-result-copy", ["Fusion source changed. Select two fish again."]));
        return;
      }
      if (!input.spendPrice(fusionCost)) {
        resultStage.classList.remove("processing");
        unlockFusionControls();
        resultStage.replaceChildren(htmlElement("p", "aq-fusion-result-copy", [`Need ${formatPrice(fusionCost)} to fuse.`]));
        return;
      }
      const resultType = resultOutcome.fishType;
      input.applyFusionResult({ selected, resultType, inheritedAge });
      resultStage.classList.remove("processing");
      resultStage.replaceChildren(
        htmlImage(`/assets/fish/${resultType.id}.png`, "", "aq-fusion-result-image"),
        htmlElement("p", "aq-fusion-result-copy success", [`${resultOutcome.label} success: ${resultType.name} inventory | ${input.ageLabel(inheritedAge)}`])
      );
      closeButton.textContent = "Close";
      closeButton.disabled = false;
      input.afterFusionSuccess({
        resultLabel: resultOutcome.label,
        resultType,
        inheritedAge,
        fusionCost
      });
    }, input.reducedMotion() ? 250 : 1400));
  }, {
    disabled: true,
    attachTouchFeedback: input.attachTouchFeedback
  });

  const panel = htmlElement("section", "aq-modal aq-fusion-modal", [
    htmlElement("div", "aq-fusion-modal-header", [
      htmlElement("span", "aq-fusion-modal-badge", ["Fusion Lab"]),
      htmlElement("h2", "aq-modal-title aq-fusion-modal-title", ["Preview Results"])
    ]),
    htmlElement("div", "aq-modal-body aq-fusion-modal-body", [
      htmlElement("p", "aq-modal-line", ["Cost is shown on the Fuse button. Fusion always succeeds. Close-age fish have better Premium chance."]),
      selectedLabel,
      sourceGrid,
      resultStage
    ]),
    htmlElement("div", "aq-modal-actions", [fuseButton, closeButton])
  ]);
  shell.append(panel);
  playModalEnter(shell);
  updateSelection();
  return shell;
}

function rollFusionOutcome(
  resultTypes: { normal: FishType; premium?: FishType },
  premiumChance: number
): FusionOutcome {
  return resultTypes.premium && Math.random() < premiumChance
    ? { label: "Premium", fishType: resultTypes.premium }
    : { label: "Normal", fishType: resultTypes.normal };
}
