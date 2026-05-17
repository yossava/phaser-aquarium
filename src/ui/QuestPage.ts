import { formatDailyQuestReward, type DailyQuestItem } from "../game/quest-system";
import { htmlElement } from "./dom";
import { createPageEmptyCard, type PageButtonFactory } from "./PageOverlay";

export function createQuestList(
  goals: DailyQuestItem[],
  claimedGoalIds: string[],
  foodNameForId: (foodTypeId: string) => string,
  createButton: PageButtonFactory,
  onClaim: (goalId: string, complete: boolean) => void
): HTMLElement {
  const list = htmlElement("div", "aq-quest-list");
  if (goals.length === 0) {
    list.append(createPageEmptyCard("All quests complete", "Come back tomorrow for a fresh route through the tank."));
    return list;
  }

  const sortedGoals = [...goals].sort((left, right) => questSortRank(left, claimedGoalIds) - questSortRank(right, claimedGoalIds));
  sortedGoals.forEach((goal) => {
    const claimed = claimedGoalIds.includes(goal.id);
    const row = htmlElement("article", `aq-quest-row ${claimed ? "is-muted" : ""} ${goal.complete && !claimed ? "is-ready" : ""}`);
    const status = htmlElement("span", "aq-quest-status", [claimed ? "Done" : goal.complete ? "Ready" : "Todo"]);
    const body = htmlElement("div", "aq-quest-body", [
      htmlElement("h3", "aq-quest-title", [goal.label]),
      htmlElement("p", "aq-quest-reward", [`Reward ${formatDailyQuestReward(goal.reward, foodNameForId)}`])
    ]);
    row.append(
      status,
      body,
      questAction(goal, claimed, createButton, onClaim)
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
  claimed: boolean,
  createButton: PageButtonFactory,
  onClaim: (goalId: string, complete: boolean) => void
): HTMLElement {
  if (claimed) {
    return htmlElement("span", "aq-quest-claimed", ["Claimed"]);
  }

  if (goal.complete) {
    return createButton("Claim", "aq-page-button aq-page-button-good aq-quest-button", () => onClaim(goal.id, goal.complete));
  }

  return htmlElement("span", "aq-quest-pending", [""]);
}
