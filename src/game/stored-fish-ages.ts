export function storedFishAgesFor(agesByFishType: Map<string, number[]>, fishTypeId: string): number[] {
  return [...(agesByFishType.get(fishTypeId) ?? [])].sort((first, second) => second - first);
}

export function setStoredFishAges(
  agesByFishType: Map<string, number[]>,
  fishTypeId: string,
  ages: number[],
  count: number
): void {
  const sanitized = ages
    .filter((ageSeconds) => Number.isFinite(ageSeconds) && ageSeconds > 0)
    .map((ageSeconds) => Math.floor(ageSeconds))
    .sort((first, second) => second - first)
    .slice(0, Math.max(0, count));
  if (sanitized.length === 0) {
    agesByFishType.delete(fishTypeId);
    return;
  }
  agesByFishType.set(fishTypeId, sanitized);
}

export function addStoredFishAge(
  agesByFishType: Map<string, number[]>,
  fishTypeId: string,
  ageSeconds: number,
  count: number
): void {
  if (ageSeconds <= 0) {
    return;
  }
  setStoredFishAges(agesByFishType, fishTypeId, [...storedFishAgesFor(agesByFishType, fishTypeId), Math.floor(ageSeconds)], count);
}

export function takeStoredFishAge(
  agesByFishType: Map<string, number[]>,
  fishTypeId: string,
  countAfterTake: number
): number {
  const ages = storedFishAgesFor(agesByFishType, fishTypeId);
  const ageSeconds = ages.shift() ?? 0;
  setStoredFishAges(agesByFishType, fishTypeId, ages, countAfterTake);
  return ageSeconds;
}
