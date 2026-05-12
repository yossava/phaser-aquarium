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
  selectedBetAmount: PrizeMachineBetAmount;
  sessionId: number;
  sessionGainPerSpin: number;
  sessionSpinCount: number;
  sessionSpent: number;
  sessionWonValue: number;
  recentPrizeKeys: string[];
  plannedPremiumPrize?: PrizeSpinPrize;
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
export const prizeMachineBetAmounts = [1, 10, 100, 500, 1000, 10000] as const;
export type PrizeMachineBetAmount = typeof prizeMachineBetAmounts[number];

export function prizeMachineConfigForBet(betAmount: number): PrizeMachineConfig {
  return {
    ...prizeMachineConfig,
    spinCost: { coinType: "common", amount: normalizeBetAmount(betAmount) }
  };
}

export function createDefaultPrizeMachineState(): PrizeMachineState {
  return {
    premiumCooldownSpins: 0,
    selectedBetAmount: 100,
    sessionId: 0,
    sessionGainPerSpin: 0,
    sessionSpinCount: 0,
    sessionSpent: 0,
    sessionWonValue: 0,
    recentPrizeKeys: []
  };
}

export function normalizePrizeMachineState(source: Partial<PrizeMachineState> | undefined): PrizeMachineState {
  if (!source) {
    return createDefaultPrizeMachineState();
  }

  return {
    premiumCooldownSpins: sanitizeCount(source.premiumCooldownSpins),
    selectedBetAmount: normalizeBetAmount(source.selectedBetAmount),
    sessionId: sanitizeCount(source.sessionId),
    sessionGainPerSpin: sanitizeGainRate(source.sessionGainPerSpin),
    sessionSpinCount: sanitizeCount(source.sessionSpinCount),
    sessionSpent: sanitizeCount(source.sessionSpent),
    sessionWonValue: sanitizeCount(source.sessionWonValue),
    recentPrizeKeys: sanitizeRecentPrizeKeys(source.recentPrizeKeys),
    plannedPremiumPrize: normalizePremiumPrize(source.plannedPremiumPrize),
    lastResult: normalizeLastResult(source.lastResult)
  };
}

export function setPrizeMachineBet(state: PrizeMachineState, betAmount: number): PrizeMachineState {
  const normalized = normalizePrizeMachineState(state);
  const selectedBetAmount = normalizeBetAmount(betAmount);
  if (normalized.selectedBetAmount === selectedBetAmount) {
    return normalized;
  }

  return {
    ...normalized,
    selectedBetAmount,
    recentPrizeKeys: [],
    plannedPremiumPrize: undefined
  };
}

export function beginPrizeMachineSession(
  state: PrizeMachineState,
  sessionId: number,
  random = Math.random
): PrizeMachineState {
  const normalized = normalizePrizeMachineState(state);
  const nextSessionId = sanitizeCount(sessionId);
  if (normalized.sessionId === nextSessionId) {
    return normalized;
  }

  return {
    ...normalized,
    premiumCooldownSpins: 0,
    sessionId: nextSessionId,
    sessionGainPerSpin: random() * 0.002 - 0.001,
    sessionSpinCount: 0,
    sessionSpent: 0,
    sessionWonValue: 0,
    recentPrizeKeys: [],
    plannedPremiumPrize: undefined
  };
}

export function recordPrizeMachineSpin(state: PrizeMachineState, spinCostValue: number): PrizeMachineState {
  const normalized = normalizePrizeMachineState(state);
  return {
    ...normalized,
    sessionSpinCount: normalized.sessionSpinCount + 1,
    sessionSpent: normalized.sessionSpent + Math.max(0, Math.floor(spinCostValue))
  };
}

export function recordPrizeMachineWin(
  state: PrizeMachineState,
  wonResaleValue: number,
  prizeKey?: string,
  clearPlannedPremium = false
): PrizeMachineState {
  const normalized = normalizePrizeMachineState(state);
  return {
    ...normalized,
    sessionWonValue: normalized.sessionWonValue + Math.max(0, Math.floor(wonResaleValue)),
    recentPrizeKeys: prizeKey ? [prizeKey, ...normalized.recentPrizeKeys.filter((key) => key !== prizeKey)].slice(0, 2) : normalized.recentPrizeKeys,
    plannedPremiumPrize: clearPlannedPremium ? undefined : normalized.plannedPremiumPrize
  };
}

export function prizeMachineTargetResaleValue(state: PrizeMachineState): number {
  const normalized = normalizePrizeMachineState(state);
  const gainMultiplier = 1 + normalized.sessionGainPerSpin * normalized.sessionSpinCount;
  return Math.max(0, normalized.sessionSpent * gainMultiplier);
}

export function prizeMachineOwedResaleValue(state: PrizeMachineState): number {
  const normalized = normalizePrizeMachineState(state);
  return prizeMachineTargetResaleValue(normalized) - normalized.sessionWonValue;
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

function normalizePremiumPrize(source: unknown): PrizeSpinPrize | undefined {
  return source === "rare" || source === "superRare" || source === "rareFish" || source === "premiumCommon"
    ? source
    : undefined;
}

function normalizeBetAmount(source: unknown): PrizeMachineBetAmount {
  const numeric = Number(source);
  return prizeMachineBetAmounts.includes(numeric as PrizeMachineBetAmount) ? numeric as PrizeMachineBetAmount : 100;
}

function sanitizeRecentPrizeKeys(source: unknown): string[] {
  return Array.isArray(source)
    ? source.filter((item): item is string => typeof item === "string" && item.length > 0).slice(0, 2)
    : [];
}

function sanitizeCount(value: unknown): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(Number(value))) : 0;
}

function sanitizeGainRate(value: unknown): number {
  return Number.isFinite(value) ? Math.max(-0.001, Math.min(0.001, Number(value))) : 0;
}
