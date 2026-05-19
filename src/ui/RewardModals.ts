import { formatNumber } from "../game/economy";
import { htmlElement, htmlImage } from "./dom";
import { playModalEnter } from "./dom-motion";
import type { FishType } from "../types/mechanics";

export function createPrizeCelebrationShell(input: {
  title: string;
  imageUrl: string;
  detail: string;
  buttonLabel: string;
  createButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;
  onClose: () => void;
}): HTMLDivElement {
  const shell = modalShell("aq-modal-shell aq-prize-celebration-shell");
  const closeButton = input.createButton(input.buttonLabel, "aq-modal-button good", input.onClose);
  const panel = htmlElement("section", "aq-modal aq-prize-celebration-modal", [
    htmlElement("h2", "aq-modal-title aq-prize-celebration-title", [input.title]),
    htmlElement("div", "aq-prize-celebration-image-wrap", [
      htmlImage(input.imageUrl, "", "aq-prize-celebration-image")
    ]),
    htmlElement("p", "aq-modal-line aq-prize-celebration-detail", [input.detail]),
    htmlElement("div", "aq-modal-actions single", [closeButton])
  ]);
  shell.append(panel);
  return shell;
}

export function createLevelCompletionRewardShell(input: {
  completedLevel: number;
  nextLevel: number;
  rewardFish: FishType[];
  fallbackFish: FishType;
  bonusRewards?: string[];
  createButton: (label: string, className: string, onClick: () => void, disabled?: boolean) => HTMLButtonElement;
  onClaim: () => void;
}): HTMLDivElement {
  const shell = modalShell("aq-modal-shell aq-level-reward-shell");
  const closeButton = input.createButton("Claim", "aq-modal-button good", input.onClaim);
  const primaryFish = input.rewardFish[0] ?? input.fallbackFish;
  const rewardLabel = input.rewardFish.length > 1
    ? `${primaryFish.name} +${formatNumber(input.rewardFish.length - 1)} fish`
    : primaryFish.name;
  const bonusRewardRows = (input.bonusRewards ?? []).map((reward) => htmlElement("p", "aq-modal-owned-line", [`Reward: ${reward}`]));
  const panel = htmlElement("section", "aq-modal aq-level-reward-modal", [
    htmlElement("h2", "aq-modal-title aq-level-reward-title", [`Level ${formatNumber(input.completedLevel)} Complete!`]),
    htmlElement("div", "aq-level-reward-medallion", [formatNumber(input.nextLevel)]),
    htmlElement("p", "aq-modal-line aq-level-reward-detail", [`Tank reached Level ${formatNumber(input.nextLevel)}.`]),
    htmlElement("div", "aq-modal-preview", [
      htmlImage(`/assets/fish/${primaryFish.id}.png`, primaryFish.name, "aq-modal-preview-image fish")
    ]),
    htmlElement("p", "aq-modal-owned-line", [`Reward: ${rewardLabel}`]),
    ...bonusRewardRows,
    htmlElement("p", "aq-modal-line aq-level-reward-detail", ["Coins kept. Tank fish moved to inventory."]),
    htmlElement("div", "aq-modal-actions single", [closeButton])
  ]);
  shell.append(panel);
  return shell;
}

function modalShell(className: string): HTMLDivElement {
  const shell = htmlElement("div", className);
  const stopEvent = (event: Event) => {
    event.stopPropagation();
  };
  shell.addEventListener("pointerdown", stopEvent);
  shell.addEventListener("pointerup", stopEvent);
  shell.addEventListener("click", stopEvent);
  playModalEnter(shell);
  return shell;
}
