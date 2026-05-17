import { fishTypes } from "../data/content";
import type { Fish } from "../objects/Fish";
import type { FishType } from "../types/mechanics";

export function findBreedMate(fish: Fish[], index: number): number | undefined {
  const parent = fish[index];
  if (!parent) {
    return undefined;
  }

  const mateIndex = fish.findIndex(
    (candidate, candidateIndex) =>
      candidateIndex !== index &&
      candidate.tankLevel === parent.tankLevel &&
      candidate.type.id === parent.type.id &&
      candidate.gender !== parent.gender
  );
  return mateIndex >= 0 ? mateIndex : undefined;
}

export function chooseBreedBabyType(input: {
  parentType: FishType;
  force?: "same" | "rare";
  randomPercent: () => number;
  randomChoice: <T>(items: T[]) => T | undefined;
}): FishType {
  const shouldRare = input.force === "rare" || (input.force !== "same" && input.randomPercent() <= 30);
  if (!shouldRare) {
    return input.parentType;
  }

  const rareChoices = fishTypes.filter((fishType) => fishType.rarity === "rare");
  return input.randomChoice(rareChoices) ?? input.parentType;
}
