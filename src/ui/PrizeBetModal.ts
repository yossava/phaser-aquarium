import { formatNumber } from "../game/economy";
import { htmlElement } from "./dom";
import type { PageButtonFactory } from "./PageOverlay";

export function createPrizeBetGrid<T extends number>(input: {
  betAmounts: T[];
  selectedBetAmount: T;
  createButton: PageButtonFactory;
  onSelect: (betAmount: T) => void;
}): HTMLElement {
  const grid = htmlElement("div", "aq-prize-bet-grid");
  input.betAmounts.forEach((betAmount) => {
    const selected = betAmount === input.selectedBetAmount;
    grid.append(
      input.createButton(
        `C${formatNumber(betAmount)}`,
        `aq-prize-bet-option ${selected ? "selected" : ""}`,
        () => input.onSelect(betAmount),
        selected
      )
    );
  });
  return grid;
}
