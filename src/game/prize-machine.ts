import type { Price } from "../types/mechanics";

export type PrizeSpinPrize = "rare" | "superRare" | "rareFish" | "premiumCommon" | "food" | "common";

export type PrizeMachineResult = {
  kind: PrizeSpinPrize;
  title: string;
  detail: string;
  at: number;
};

export type PrizeMachineState = {
  premiumCooldownSpins: number;
  lastResult?: PrizeMachineResult;
};

export type PrizeMachineConfig = {
  title: string;
  rewardLabel: string;
  spinCost: Price;
};

export type PrizeSpinOutcome = {
  prize: PrizeSpinPrize;
  spinCost: Price;
  premiumCooldownSpins: number;
};

export const prizeMachineConfig: PrizeMachineConfig = {
  title: "Treasure Spin",
  rewardLabel: "Rare Prizes",
  spinCost: { coinType: "common", amount: 100 }
};

export function createDefaultPrizeMachineState(): PrizeMachineState {
  return { premiumCooldownSpins: 0 };
}

export function normalizePrizeMachineState(source: Partial<PrizeMachineState> | undefined): PrizeMachineState {
  if (!source) {
    return createDefaultPrizeMachineState();
  }

  return {
    premiumCooldownSpins: sanitizeCount(source.premiumCooldownSpins),
    lastResult: normalizeLastResult(source.lastResult)
  };
}

export function runPrizeMachineSpin(
  state: PrizeMachineState,
  random = Math.random
): { state: PrizeMachineState; outcome: PrizeSpinOutcome } {
  const nextState = normalizePrizeMachineState(state);
  if (nextState.premiumCooldownSpins > 0) {
    nextState.premiumCooldownSpins = Math.max(0, nextState.premiumCooldownSpins - 1);
    const prize: PrizeSpinPrize = random() < 0.5 ? "food" : "common";
    return {
      state: nextState,
      outcome: { prize, spinCost: prizeMachineConfig.spinCost, premiumCooldownSpins: nextState.premiumCooldownSpins }
    };
  }

  const roll = random();
  if (roll < 0.1) {
    nextState.premiumCooldownSpins = 10;
    return {
      state: nextState,
      outcome: { prize: "rare", spinCost: prizeMachineConfig.spinCost, premiumCooldownSpins: nextState.premiumCooldownSpins }
    };
  }
  if (roll < 0.15) {
    nextState.premiumCooldownSpins = 10;
    return {
      state: nextState,
      outcome: { prize: "superRare", spinCost: prizeMachineConfig.spinCost, premiumCooldownSpins: nextState.premiumCooldownSpins }
    };
  }
  if (roll < 0.2) {
    nextState.premiumCooldownSpins = 10;
    return {
      state: nextState,
      outcome: { prize: "rareFish", spinCost: prizeMachineConfig.spinCost, premiumCooldownSpins: nextState.premiumCooldownSpins }
    };
  }
  if (roll < 0.3) {
    nextState.premiumCooldownSpins = 10;
    return {
      state: nextState,
      outcome: { prize: "premiumCommon", spinCost: prizeMachineConfig.spinCost, premiumCooldownSpins: nextState.premiumCooldownSpins }
    };
  }

  const prize: PrizeSpinPrize = random() < 0.5 ? "food" : "common";
  return {
    state: nextState,
    outcome: { prize, spinCost: prizeMachineConfig.spinCost, premiumCooldownSpins: nextState.premiumCooldownSpins }
  };
}

function normalizeLastResult(source: PrizeMachineResult | undefined): PrizeMachineResult | undefined {
  const kind = String(source?.kind ?? "");
  if (
    !source ||
    (
      kind !== "rare" &&
      kind !== "superRare" &&
      kind !== "rareFish" &&
      kind !== "premiumCommon" &&
      kind !== "food" &&
      kind !== "common" &&
      kind !== "jackpot"
    )
  ) {
    return undefined;
  }

  const normalizedKind = kind === "jackpot" ? "rare" : kind as PrizeSpinPrize;
  return {
    kind: normalizedKind,
    title: String(source.title ?? ""),
    detail: String(source.detail ?? ""),
    at: sanitizeCount(source.at)
  };
}

function sanitizeCount(value: unknown): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(Number(value))) : 0;
}
