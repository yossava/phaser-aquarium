import { createHtmlButton, htmlElement, htmlImage } from "./dom";

export type ModalAction = {
  label: string;
  fill: number;
  action: () => void;
};

export function createModalShell(options: {
  title: string;
  lines: string[];
  actions: ModalAction[];
  attachTouchFeedback?: (button: HTMLButtonElement) => void;
  afterAction?: () => void;
  preventPointerDefault?: boolean;
}): HTMLDivElement {
  const shell = htmlElement("div", "aq-modal-shell");
  const stopEvent = (event: Event) => {
    if (options.preventPointerDefault) {
      event.preventDefault();
    }
    event.stopPropagation();
  };
  shell.addEventListener("pointerdown", stopEvent);
  shell.addEventListener("click", stopEvent);

  const panel = htmlElement("section", "aq-modal");
  panel.append(
    htmlElement("h2", "aq-modal-title", [options.title]),
    htmlElement("div", "aq-modal-body", options.lines.map((line) => htmlElement("p", "aq-modal-line", [line])))
  );

  const actionRow = htmlElement("div", `aq-modal-actions ${options.actions.length === 1 ? "single" : ""}`);
  options.actions.forEach((action) => {
    actionRow.append(createModalButton(action, options.attachTouchFeedback, options.afterAction));
  });
  panel.append(actionRow);

  shell.append(panel);
  return shell;
}

export function createRewardedAdModalShell(options: {
  icon: string;
  rewardDetail: string;
  onClaim: () => void;
  attachTouchFeedback?: (button: HTMLButtonElement) => void;
}): {
  shell: HTMLDivElement;
  countdownText: HTMLSpanElement;
  claimButton: HTMLButtonElement;
} {
  const shell = htmlElement("div", "aq-modal-shell aq-ad-modal-shell");
  const stopEvent = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  shell.addEventListener("pointerdown", stopEvent);
  shell.addEventListener("click", stopEvent);

  const countdownText = htmlElement("span", "aq-ad-countdown", ["30"]);
  const claimButton = createHtmlButton("Watching 30s", "aq-modal-button good aq-ad-claim-button", options.onClaim, {
    disabled: true,
    attachTouchFeedback: options.attachTouchFeedback
  });

  const panel = htmlElement("section", "aq-modal aq-ad-modal");
  panel.append(
    htmlElement("h2", "aq-modal-title", ["Rewarded Ad"]),
    htmlElement("div", "aq-ad-video", [
      htmlElement("div", "aq-ad-video-screen", [
        htmlImage(options.icon, "", "aq-ad-video-icon"),
        htmlElement("span", "aq-ad-video-label", ["Sponsored Break"])
      ])
    ]),
    htmlElement("div", "aq-modal-body aq-ad-modal-body", [
      htmlElement("p", "aq-modal-line", [`Reward: ${options.rewardDetail}`]),
      htmlElement("p", "aq-modal-line", ["Please wait until the ad finishes."])
    ]),
    htmlElement("div", "aq-ad-countdown-wrap", [
      countdownText,
      htmlElement("span", "aq-ad-countdown-unit", ["s"])
    ]),
    htmlElement("div", "aq-modal-actions single", [claimButton])
  );

  shell.append(panel);
  return { shell, countdownText, claimButton };
}

function createModalButton(
  action: ModalAction,
  attachTouchFeedback: ((button: HTMLButtonElement) => void) | undefined,
  afterAction: (() => void) | undefined
): HTMLButtonElement {
  return createHtmlButton(action.label, `aq-modal-button ${modalButtonTone(action.fill)}`, action.action, {
    attachTouchFeedback,
    afterClick: afterAction
  });
}

function modalButtonTone(fill: number): string {
  if (fill === 0x76512d) {
    return "danger";
  }

  if (fill === 0x356a35) {
    return "good";
  }

  return "muted";
}
