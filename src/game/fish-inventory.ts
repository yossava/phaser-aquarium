import type { Fish } from "../objects/Fish";
import type { FishType } from "../types/mechanics";
import type { FishFusionSource } from "./fish-fusion";

export function getStoredFishCount(fishInventory: Map<string, number>, fishTypeId: string): number {
  return fishInventory.get(fishTypeId) ?? 0;
}

export function addStoredFish(input: {
  fishInventory: Map<string, number>;
  fishTypeId: string;
  quantity?: number;
}): number {
  const safeQuantity = Math.max(1, Math.floor(input.quantity ?? 1));
  input.fishInventory.set(
    input.fishTypeId,
    getStoredFishCount(input.fishInventory, input.fishTypeId) + safeQuantity
  );
  return safeQuantity;
}

export function removeStoredFish(input: {
  fishInventory: Map<string, number>;
  fishTypeId: string;
  quantity?: number;
  trimStoredFishAges: (fishTypeId: string) => void;
}): void {
  const current = getStoredFishCount(input.fishInventory, input.fishTypeId);
  const next = Math.max(0, current - Math.max(1, Math.floor(input.quantity ?? 1)));
  if (next > 0) {
    input.fishInventory.set(input.fishTypeId, next);
  } else {
    input.fishInventory.delete(input.fishTypeId);
  }
  input.trimStoredFishAges(input.fishTypeId);
}

export function storeActiveFish(input: {
  fish: Fish;
  activeFish: Fish[];
  fishInventory: Map<string, number>;
  addStoredFishAge: (fishTypeId: string, ageSeconds: number) => void;
  removeFishAt: (index: number) => Fish | undefined;
}): boolean {
  const index = input.activeFish.indexOf(input.fish);
  if (index < 0) {
    return false;
  }

  addStoredFish({
    fishInventory: input.fishInventory,
    fishTypeId: input.fish.type.id
  });
  input.addStoredFishAge(input.fish.type.id, input.fish.ageSeconds);
  input.removeFishAt(index);
  return true;
}

export function consumeFishFusionSources(input: {
  sources: FishFusionSource[];
  activeFish: Fish[];
  fishInventory: Map<string, number>;
  getFishInventory: (fishTypeId: string) => number;
  storedFishAgesFor: (fishTypeId: string) => number[];
  setStoredFishAges: (fishTypeId: string, ages: number[]) => void;
  trimStoredFishAges: (fishTypeId: string) => void;
}): void {
  input.sources
    .filter((source): source is Extract<FishFusionSource, { kind: "active" }> => source.kind === "active")
    .sort((first, second) => second.activeIndex - first.activeIndex)
    .forEach((source) => {
      const fish = input.activeFish[source.activeIndex];
      if (!fish || fish.type.id !== source.type.id) {
        return;
      }
      input.activeFish.splice(source.activeIndex, 1);
      fish.destroy();
    });

  input.sources
    .filter((source): source is Extract<FishFusionSource, { kind: "stored" }> => source.kind === "stored")
    .sort((first, second) => (second.storedAgeIndex ?? -1) - (first.storedAgeIndex ?? -1))
    .forEach((source) => consumeStoredFishForFusion(source, input));
}

export function consumeStoredFishForFusion(
  source: Extract<FishFusionSource, { kind: "stored" }>,
  input: {
    fishInventory: Map<string, number>;
    getFishInventory: (fishTypeId: string) => number;
    storedFishAgesFor: (fishTypeId: string) => number[];
    setStoredFishAges: (fishTypeId: string, ages: number[]) => void;
    trimStoredFishAges: (fishTypeId: string) => void;
  }
): void {
  const current = input.getFishInventory(source.type.id);
  if (current <= 1) {
    input.fishInventory.delete(source.type.id);
  } else {
    input.fishInventory.set(source.type.id, current - 1);
  }

  if (source.storedAgeIndex !== undefined) {
    const ages = input.storedFishAgesFor(source.type.id);
    ages.splice(source.storedAgeIndex, 1);
    input.setStoredFishAges(source.type.id, ages);
  }
  input.trimStoredFishAges(source.type.id);
}

export function storedFishTypeFromCatalog(fishTypes: FishType[], fishTypeId: string): FishType | undefined {
  return fishTypes.find((fishType) => fishType.id === fishTypeId);
}
