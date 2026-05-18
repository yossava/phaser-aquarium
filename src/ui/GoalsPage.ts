import type { DailyQuestItem, RewardedAdKind, RewardedAdOption, RewardedAdState } from "../game/quest-system";
import { createQuestList } from "./QuestPage";
import { type PageButtonFactory } from "./PageOverlay";
import { createRewardedAdsPage } from "./RewardedAdsPage";

export function appendGoalsPageContent(input: {
  content: HTMLElement;
  goals: DailyQuestItem[];
  claimedGoalIds: string[];
  foodNameForId: (foodTypeId: string) => string;
  fishNameForId: (fishTypeId: string) => string;
  rewardedAdOptions: RewardedAdOption[];
  rewardedAd: RewardedAdState | undefined;
  createButton: PageButtonFactory;
  claimDailyGoal: (goalId: string, complete: boolean) => void;
  claimAllDailyGoals: () => void;
  startRewardedAd: (kind: RewardedAdKind) => void;
  claimRewardedAd: (kind: RewardedAdKind) => void;
}): void {
  input.content.classList.add("aq-page-content-scroll");
  input.content.append(
    createQuestList(
      input.goals,
      input.claimedGoalIds,
      input.foodNameForId,
      input.fishNameForId,
      input.createButton,
      input.claimDailyGoal,
      input.claimAllDailyGoals
    ),
    createRewardedAdsPage(input.rewardedAdOptions, input.rewardedAd, input.createButton, {
      startRewardedAd: input.startRewardedAd,
      claimRewardedAd: input.claimRewardedAd
    })
  );
}
