import { formatNumber } from "./economy";

export type TankSummaryFish = {
  state: string;
  ageMonths: () => number;
  isGrowthLimitedByTank: () => boolean;
};

export function tankSummary(input: { fish: TankSummaryFish[]; helperCount: number }): string {
  if (input.fish.length === 0) {
    return input.helperCount > 0 ? `${formatNumber(input.helperCount)} helpers` : "empty";
  }

  const averageMonths = input.fish.reduce((total, currentFish) => total + currentFish.ageMonths(), 0) / input.fish.length;
  const needsCare = input.fish.filter((currentFish) => currentFish.state !== "happy" || currentFish.isGrowthLimitedByTank()).length;
  return `avg ${formatNumber(Math.round(averageMonths))}mo | care ${formatNumber(needsCare)} | help ${formatNumber(input.helperCount)}`;
}

export function tankAccentColor(level: number): number {
  const palette = [0x5ed6e8, 0x62f2a8, 0xffd15c, 0xd379d7, 0x5fa6d6, 0xff8fa3];
  return palette[Math.abs(Math.floor(level - 1)) % palette.length];
}
