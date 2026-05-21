import { formatDailyQuestReward, type DailyQuestItem } from "../game/quest-system";
import { htmlElement } from "./dom";
import { createPageEmptyCard, type PageButtonFactory } from "./PageOverlay";

export function createQuestList(
  goals: DailyQuestItem[],
  claimedGoalIds: string[],
  foodNameForId: (foodTypeId: string) => string,
  fishNameForId: (fishTypeId: string) => string,
  _createButton: PageButtonFactory,
  _onClaim: (goalId: string, complete: boolean) => void,
  _onClaimAll: () => void
): HTMLElement {
  const list = htmlElement("div", "aq-quest-list");
  if (goals.length === 0) {
    list.append(createPageEmptyCard("All quests complete", "Come back tomorrow for a fresh route through the tank."));
    return list;
  }

  const sortedGoals = [...goals].sort((left, right) => questSortRank(left, claimedGoalIds) - questSortRank(right, claimedGoalIds));
  const readyCount = sortedGoals.filter((goal) => goal.complete && !claimedGoalIds.includes(goal.id)).length;
  if (readyCount > 0) {
    const toolbar = htmlElement("div", "aq-quest-toolbar");
    toolbar.append(
      htmlElement("span", "aq-quest-ready-count", [`${readyCount} dropping to tank`])
    );
    list.append(toolbar);
  }

  sortedGoals.forEach((goal) => {
    const claimed = claimedGoalIds.includes(goal.id);
    const row = htmlElement("article", `aq-quest-row ${claimed ? "is-muted" : ""} ${goal.complete && !claimed ? "is-ready" : ""}`);
    const status = htmlElement("span", "aq-quest-status", [claimed ? "Done" : goal.complete ? "Ready" : "Todo"]);
    const body = htmlElement("div", "aq-quest-body", [
      htmlElement("h3", "aq-quest-title", [goal.label]),
      htmlElement("p", "aq-quest-reward", [`Reward ${formatDailyQuestReward(goal.reward, foodNameForId, fishNameForId)}`])
    ]);
    row.append(
      status,
      body,
      questAction(goal, claimed)
    );
    list.append(row);
  });

  return list;
}

function questSortRank(goal: DailyQuestItem, claimedGoalIds: string[]): number {
  if (goal.complete && !claimedGoalIds.includes(goal.id)) {
    return 0;
  }

  if (claimedGoalIds.includes(goal.id)) {
    return 2;
  }

  return 1;
}

function questAction(
  goal: DailyQuestItem,
  claimed: boolean
): HTMLElement {
  if (claimed) {
    return htmlElement("span", "aq-quest-claimed", ["Dropped"]);
  }

  if (goal.complete) {
    return htmlElement("span", "aq-quest-claimed", ["Dropping"]);
  }

  return htmlElement("span", "aq-quest-pending", [""]);
}
