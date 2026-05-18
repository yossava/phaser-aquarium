import { formatNumber } from "../game/economy";
import { htmlElement, htmlImage, createHtmlButton } from "./dom";
import { playModalEnter } from "./dom-motion";
import type { FishFusionSource } from "../game/fish-fusion";
import type { FishType } from "../types/mechanics";

export function createFusionPageRoot(): HTMLElement {
  const root = htmlElement("div", "aq-fusion-page");
  root.append(createFusionHero());
  return root;
}

export function createFusionHero(): HTMLElement {
  return htmlElement("section", "aq-fusion-hero", [
    htmlElement("div", "aq-fusion-hero-art", [
      htmlImage("/assets/fish/goldfish.png", "", "aq-fusion-hero-fish left"),
      htmlImage("/assets/fish/guppy.png", "", "aq-fusion-hero-fish right"),
      htmlElement("span", "aq-fusion-hero-glow")
    ]),
    htmlElement("div", "aq-fusion-hero-copy", [
      htmlElement("h2", "aq-fusion-hero-title", ["Select 2 Fish for Fusion"]),
      htmlElement("p", "aq-fusion-hero-meta", ["Guaranteed fusion. Premium chance rewards close ages."])
    ])
  ]);
}

export function createFusionMachine(input: {
  selectedDock: HTMLElement;
  outputStage: HTMLElement;
  previewButton: HTMLButtonElement;
}): HTMLElement[] {
  return [
    htmlElement("section", "aq-fusion-machine", [
      input.selectedDock,
      htmlElement("div", "aq-fusion-result-divider", [
        htmlElement("span", "aq-fusion-result-divider-line"),
        htmlElement("span", "aq-fusion-result-divider-text", ["Possible Results"]),
        htmlElement("span", "aq-fusion-result-divider-line")
      ]),
      input.outputStage,
      htmlElement("div", "aq-fusion-stat-strip", [
        htmlElement("span", "aq-fusion-stat-pill", ["Always succeeds"]),
        htmlElement("span", "aq-fusion-stat-pill", ["Premium rewards close ages"])
      ])
    ]),
    htmlElement("div", "aq-fusion-action-bar", [input.previewButton])
  ];
}

export function createFusionOutputStage(): HTMLElement {
  return htmlElement("div", "aq-fusion-machine-output", [
    createFusionMachinePlaceholder("Choose two fish to reveal Normal and Premium outcomes.")
  ]);
}

export function createFusionMachinePlaceholder(copy: string): HTMLElement {
  return htmlElement("p", "aq-fusion-machine-placeholder", [copy]);
}

export function createFusionSelectedDockChildren(input: {
  selected: FishFusionSource[];
  sources: FishFusionSource[];
  ageLabel: (seconds: number) => string;
  attachTouchFeedback: (button: HTMLButtonElement) => void;
  onPickSlot: (slotIndex: 0 | 1, sources: FishFusionSource[]) => void;
}): HTMLElement[] {
  return [0, 1].flatMap((slotIndex) => {
    const source = input.selected[slotIndex];
    const slotButton = createHtmlButton("", `aq-fusion-selected-slot ${source ? "filled" : ""}`, () => {
      input.onPickSlot(slotIndex as 0 | 1, input.sources);
    }, { attachTouchFeedback: input.attachTouchFeedback });
    slotButton.append(...(source
      ? [
        htmlElement("span", "aq-fusion-selected-remove", ["x"]),
        htmlImage(`/assets/fish/${source.type.id}.png`, "", "aq-fusion-selected-image"),
        htmlElement("span", "aq-fusion-selected-name", [source.type.name]),
        htmlElement("span", "aq-fusion-selected-tag", [input.ageLabel(source.ageSeconds)])
      ]
      : [
        htmlElement("span", "aq-fusion-selected-empty", [`Slot ${formatNumber(slotIndex + 1)}`])
      ]));
    return slotIndex === 0
      ? [
        slotButton,
        htmlElement("div", "aq-fusion-plus-core", [
          htmlElement("span", "aq-fusion-core-ring"),
          htmlElement("span", "aq-fusion-core-symbol", ["+"])
        ])
      ]
      : [slotButton];
  });
}

export function createFusionFinalResult(input: {
  label: string;
  fishType: FishType;
  ageSeconds: number;
  ageLabel: (seconds: number) => string;
}): HTMLElement {
  return htmlElement("div", "aq-fusion-final-result", [
    htmlElement("span", "aq-fusion-result-tier", [input.label]),
    htmlImage(`/assets/fish/${input.fishType.id}.png`, "", "aq-fusion-result-image"),
    htmlElement("p", "aq-fusion-result-name", [input.fishType.name]),
    htmlElement("p", "aq-fusion-result-copy success", [`Inventory | ${input.ageLabel(input.ageSeconds)}`])
  ]);
}

export function createFusionResultCandidate(input: {
  label: string;
  fishType: FishType;
  chance: number;
}): HTMLElement {
  return htmlElement("div", "aq-fusion-result-card", [
    htmlElement("span", "aq-fusion-result-tier", [input.label]),
    htmlImage(`/assets/fish/${input.fishType.id}.png`, "", "aq-fusion-result-image"),
    htmlElement("p", "aq-fusion-result-name", [input.fishType.name]),
    htmlElement("p", "aq-fusion-result-copy", [`Chance ${fusionChanceLabel(input.chance)}`])
  ]);
}

export function createUnavailablePremiumFusionResult(): HTMLElement {
  return htmlElement("div", "aq-fusion-result-card unavailable", [
    htmlElement("span", "aq-fusion-result-tier", ["Premium"]),
    htmlElement("p", "aq-fusion-result-copy", ["No premium fish available"])
  ]);
}

export function createFusionResultList(input: {
  normal: FishType;
  premium?: FishType;
  normalChance: number;
  premiumChance: number;
  ageSeconds: number;
  costAmount: number;
  ageLabel: (seconds: number) => string;
}): HTMLElement[] {
  return [
    htmlElement("div", "aq-fusion-machine-results", [
      createFusionResultCandidate({ label: "Normal", fishType: input.normal, chance: input.normalChance }),
      input.premium
        ? createFusionResultCandidate({ label: "Premium", fishType: input.premium, chance: input.premiumChance })
        : createUnavailablePremiumFusionResult()
    ]),
    htmlElement("p", "aq-fusion-machine-meta", [`Result age ${input.ageLabel(input.ageSeconds)} | Cost C${formatNumber(input.costAmount)}`])
  ];
}

export function createFusionLoadingChamber(input: {
  leftFishType: FishType;
  rightFishType: FishType;
}): HTMLElement {
  return htmlElement("div", "aq-fusion-chamber", [
    htmlElement("div", "aq-fusion-chamber-window", [
      htmlImage(`/assets/fish/${input.leftFishType.id}.png`, "", "aq-fusion-chamber-fish left"),
      htmlElement("div", "aq-fusion-chamber-core"),
      htmlImage(`/assets/fish/${input.rightFishType.id}.png`, "", "aq-fusion-chamber-fish right")
    ]),
    htmlElement("div", "aq-fusion-chamber-status", [
      htmlElement("span", "", ["Mixing DNA"]),
      htmlElement("span", "", ["Growing fins"]),
      htmlElement("span", "", ["Final shine"])
    ]),
    htmlElement("div", "aq-fusion-chamber-progress", [
      htmlElement("span")
    ]),
    htmlElement("p", "aq-fusion-loading-title", ["Fusion in progress"]),
    htmlElement("p", "aq-fusion-result-copy", ["Preparing your new inventory fish"])
  ]);
}

export function createFusionFishPickerShell(input: {
  slotIndex: 0 | 1;
  sources: FishFusionSource[];
  selectedKeys: Set<string>;
  ageLabel: (seconds: number) => string;
  attachTouchFeedback: (button: HTMLButtonElement) => void;
  onChoose: (source: FishFusionSource) => void;
  onCancel: () => void;
}): HTMLDivElement {
  const shell = htmlElement("div", "aq-modal-shell aq-fusion-picker-shell");
  const stopEvent = (event: Event) => {
    event.stopPropagation();
  };
  shell.addEventListener("pointerdown", stopEvent);
  shell.addEventListener("pointerup", stopEvent);
  shell.addEventListener("click", stopEvent);

  const grid = htmlElement("div", "aq-fusion-picker-grid");
  input.sources.forEach((source) => {
    const selected = input.selectedKeys.has(source.key);
    const sourceButton = createHtmlButton("", `aq-fusion-preview-card ${selected ? "selected" : ""}`, () => input.onChoose(source), {
      attachTouchFeedback: input.attachTouchFeedback
    });
    sourceButton.append(
      htmlImage(`/assets/fish/${source.type.id}.png`, "", "aq-fusion-preview-image"),
      htmlElement("span", "aq-fusion-preview-name", [source.type.name]),
      htmlElement("span", "aq-fusion-preview-meta", [`${source.label} | ${input.ageLabel(source.ageSeconds)}`])
    );
    grid.append(sourceButton);
  });

  const closeButton = createHtmlButton("Cancel", "aq-modal-button muted", input.onCancel, {
    attachTouchFeedback: input.attachTouchFeedback
  });
  shell.append(
    htmlElement("section", "aq-modal aq-fusion-picker-modal", [
      htmlElement("div", "aq-fusion-modal-header", [
        htmlElement("span", "aq-fusion-modal-badge", [`Slot ${formatNumber(input.slotIndex + 1)}`]),
        htmlElement("h2", "aq-modal-title aq-fusion-modal-title", ["Choose Fish"])
      ]),
      htmlElement("div", "aq-modal-body aq-fusion-picker-body", [grid]),
      htmlElement("div", "aq-modal-actions single", [closeButton])
    ])
  );
  playModalEnter(shell);
  return shell;
}

function fusionChanceLabel(chance: number): string {
  const clampedChance = Math.max(0, Math.min(1, chance));
  return `${formatNumber(Math.round(clampedChance * 100))}%`;
}
