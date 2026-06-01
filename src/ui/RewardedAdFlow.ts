import { formatNumber } from "../game/economy";
import { rewardedAdRemainingSeconds, type RewardedAdOption, type RewardedAdState } from "../game/quest-system";
import { createRewardedAdModalShell } from "./modal";

export type RewardedAdModalView = {
  shell: HTMLDivElement;
  countdownText: HTMLSpanElement;
  claimButton: HTMLButtonElement;
};

export function createRewardedAdModalView(input: {
  option: RewardedAdOption | undefined;
  onClaim: () => void;
  attachTouchFeedback?: (button: HTMLButtonElement) => void;
}): RewardedAdModalView {
  return createRewardedAdModalShell({
    icon: input.option?.icon ?? "/assets/ui/shop/coin_icon_common.png",
    rewardDetail: input.option?.detail ?? "bonus",
    onClaim: input.onClaim,
    attachTouchFeedback: input.attachTouchFeedback
  });
}

export function syncRewardedAdModalView(input: {
  ad: RewardedAdState | undefined;
  countdownText: HTMLSpanElement | undefined;
  claimButton: HTMLButtonElement | undefined;
}): void {
  if (!input.ad || !input.countdownText || !input.claimButton) {
    return;
  }

  const remainingSeconds = rewardedAdRemainingSeconds(input.ad);
  input.countdownText.textContent = formatNumber(remainingSeconds);
  if (input.ad.cooldown === true) {
    input.claimButton.disabled = true;
    input.claimButton.textContent = `Wait ${formatNumber(remainingSeconds)}s`;
    return;
  }
  if (remainingSeconds <= 0) {
    input.countdownText.textContent = "Ready";
    input.claimButton.disabled = false;
    input.claimButton.textContent = "Grab Prize";
    return;
  }

  input.claimButton.disabled = true;
  input.claimButton.textContent = `Watching ${formatNumber(remainingSeconds)}s`;
}
