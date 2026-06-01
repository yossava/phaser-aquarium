import { rewardedAdRemainingSeconds, type RewardedAdKind, type RewardedAdOption, type RewardedAdState } from "../game/quest-system";
import { formatNumber } from "../game/economy";
import { htmlElement, htmlImage } from "./dom";
import type { PageButtonFactory } from "./PageOverlay";

export type RewardedAdsPageActions = {
  startRewardedAd: (kind: RewardedAdKind) => void;
  claimRewardedAd: (kind: RewardedAdKind) => void;
};

export function createRewardedAdsPage(
  options: RewardedAdOption[],
  activeAd: RewardedAdState | undefined,
  createButton: PageButtonFactory,
  actions: RewardedAdsPageActions
): HTMLElement {
  const section = htmlElement("section", "aq-rewarded-ad-section");
  section.append(
    htmlElement("h2", "aq-page-section-title", ["Free Stuff"]),
    htmlElement("p", "aq-rewarded-ad-copy", ["Watch ads to get free stuff!"])
  );

  const list = htmlElement("div", "aq-rewarded-ad-list");
  options.forEach((option) => list.append(createRewardedAdCard(option, activeAd, createButton, actions)));
  section.append(list);
  return section;
}

function createRewardedAdCard(
  option: RewardedAdOption,
  activeAd: RewardedAdState | undefined,
  createButton: PageButtonFactory,
  actions: RewardedAdsPageActions
): HTMLElement {
  const active = activeAd?.kind === option.kind;
  const blocked = activeAd !== undefined && !active;
  const remainingSeconds = active && activeAd ? rewardedAdRemainingSeconds(activeAd) : 0;
  const coolingDown = active && activeAd?.cooldown === true;
  const ready = active && !coolingDown && remainingSeconds <= 0;
  const card = htmlElement("article", `aq-rewarded-ad-card ${ready ? "is-ready" : ""}`);
  const buttonLabel = coolingDown ? `Wait ${formatNumber(remainingSeconds)}s` : active ? `Watching ${formatNumber(remainingSeconds)}s` : blocked ? "Wait" : "Watch";
  const buttonClass = `aq-page-button ${active || blocked ? "aq-page-button-muted" : ""} aq-rewarded-ad-button`;
  card.append(
    htmlImage(option.icon, "", "aq-rewarded-ad-icon"),
    htmlElement("div", "aq-rewarded-ad-body", [
      htmlElement("h3", "aq-rewarded-ad-title", [option.title]),
      htmlElement("p", "aq-rewarded-ad-reward", [option.detail])
    ]),
    ready
      ? createButton("Claim", "aq-page-button aq-page-button-good aq-rewarded-ad-button", () => actions.claimRewardedAd(option.kind))
      : createButton(buttonLabel, buttonClass, () => actions.startRewardedAd(option.kind), active || blocked)
  );

  return card;
}
