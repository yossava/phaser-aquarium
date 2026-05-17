import type { DecorationSize, TankCosmetic } from "./tank-catalog";
import type { TankCosmeticCategory, TankRuntimeState } from "./tank-state";
import type { MakeupDecorationCostEntry, MakeupDraft } from "./makeup-mode";
import type { DecorationType, Price } from "../types/mechanics";

export type MakeupApplyResult = {
  applied: boolean;
  boughtDecorationCount: number;
};

export function applyMakeupLook(input: {
  draft: MakeupDraft | undefined;
  decorationTypes: DecorationType[];
  tankLevel: number;
  makeupTotalCost: () => Price;
  priceWealth: (price: Price) => number;
  spendPrice: (price: Price) => boolean;
  makeupDecorationCostEntries: () => MakeupDecorationCostEntry[];
  makeupSelectedCosmetic: (category: TankCosmeticCategory) => TankCosmetic;
  ensureTankState: (level: number) => TankRuntimeState;
  ownsTankCosmetic: (asset: TankCosmetic) => boolean;
  addTankCosmeticToInventory: (category: TankCosmeticCategory, assetId: string) => void;
  recordDailyQuestAction: (action: "buy-background" | "buy-seabed" | "buy-decoration" | "place-decoration") => void;
  renderTankCosmeticBlueTintIntensity: (category: TankCosmeticCategory, assetId: string) => number;
  applyTankCosmeticBlueTint: (category: TankCosmeticCategory, assetId: string, intensity: number) => void;
  removeAllPlacedDecorationsFromActiveTank: () => void;
  getDecorationInventory: (decorationTypeId: string, size: DecorationSize) => number;
  consumeStoredDecoration: (decorationTypeId: string, size: DecorationSize) => void;
  addDecorationToTank: (decorationType: DecorationType, x: number, y: number, size: DecorationSize, tankLevel: number, depth: number) => void;
  tankDecorationDepthFromOrder: (index: number) => number;
}): MakeupApplyResult {
  if (!input.draft) {
    return { applied: false, boughtDecorationCount: 0 };
  }

  const cost = input.makeupTotalCost();
  if (input.priceWealth(cost) > 0 && !input.spendPrice(cost)) {
    return { applied: false, boughtDecorationCount: 0 };
  }

  const boughtDecorationCount = input.makeupDecorationCostEntries().length;
  const background = input.makeupSelectedCosmetic("background");
  const seabed = input.makeupSelectedCosmetic("seabed");
  const state = input.ensureTankState(input.tankLevel);

  if (!input.ownsTankCosmetic(background)) {
    input.addTankCosmeticToInventory("background", background.id);
    input.recordDailyQuestAction("buy-background");
  }
  if (!input.ownsTankCosmetic(seabed)) {
    input.addTankCosmeticToInventory("seabed", seabed.id);
    input.recordDailyQuestAction("buy-seabed");
  }

  state.selectedBackgroundId = background.id;
  state.selectedSeabedId = seabed.id;
  input.applyTankCosmeticBlueTint("background", background.id, input.renderTankCosmeticBlueTintIntensity("background", background.id));
  input.applyTankCosmeticBlueTint("seabed", seabed.id, input.renderTankCosmeticBlueTintIntensity("seabed", seabed.id));

  const draftDecorations = [...input.draft.decorations];
  input.removeAllPlacedDecorationsFromActiveTank();
  input.draft.decorations = [];
  for (const [index, decoration] of draftDecorations.entries()) {
    const decorationType = input.decorationTypes.find((item) => item.id === decoration.typeId);
    decoration.image.destroy();
    if (!decorationType) {
      continue;
    }

    const isExistingPlacedDecoration = decoration.originalTypeId === decoration.typeId && Boolean(decoration.originalSize);
    if (!isExistingPlacedDecoration && input.getDecorationInventory(decoration.typeId, decoration.size) > 0) {
      input.consumeStoredDecoration(decoration.typeId, decoration.size);
    }
    input.addDecorationToTank(decorationType, decoration.x, decoration.y, decoration.size, input.tankLevel, input.tankDecorationDepthFromOrder(index));
    input.recordDailyQuestAction("place-decoration");
  }

  if (boughtDecorationCount > 0) {
    input.recordDailyQuestAction("buy-decoration");
  }

  return { applied: true, boughtDecorationCount };
}
