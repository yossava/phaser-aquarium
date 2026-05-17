import type Phaser from "phaser";
import type { PlacedDecoration } from "./tank-entities";

type TankVisibleEntity = {
  tankLevel: number;
  setTankVisible: (visible: boolean) => void;
};

type SpriteVisibleEntity = {
  sprite: Phaser.GameObjects.Components.Visible;
};

export function syncMakeupPresentation<CoinVisibleEntity>(input: {
  makeupActive: boolean;
  tankLevel: number;
  fish: Iterable<TankVisibleEntity>;
  helperCreatures: Iterable<TankVisibleEntity>;
  foods: Iterable<SpriteVisibleEntity>;
  pendingHelperCreatureDrops: Iterable<SpriteVisibleEntity & { tankLevel: number }>;
  coinDrops: Iterable<CoinVisibleEntity>;
  setCoinDropVisible: (coin: CoinVisibleEntity, visible: boolean) => void;
  ambientWaterParticles: Iterable<Phaser.GameObjects.Components.Visible>;
  activeAirStoneBubbles: Iterable<Phaser.GameObjects.Components.Visible>;
  placedDecorations: Iterable<PlacedDecoration>;
  dirtyTankOverlay?: Phaser.GameObjects.Components.Visible;
  showDecorationTrashTarget: (show: boolean) => void;
  refreshFishTankVisibility: () => void;
  refreshHelperTankVisibility: () => void;
  refreshDecorationTankVisibility: () => void;
  updateDirtyTankOverlay: () => void;
}): void {
  for (const currentFish of input.fish) {
    currentFish.setTankVisible(!input.makeupActive && currentFish.tankLevel === input.tankLevel);
  }
  for (const helper of input.helperCreatures) {
    helper.setTankVisible(!input.makeupActive && helper.tankLevel === input.tankLevel);
  }
  for (const food of input.foods) {
    food.sprite.setVisible(!input.makeupActive);
  }
  for (const drop of input.pendingHelperCreatureDrops) {
    drop.sprite.setVisible(!input.makeupActive && drop.tankLevel === input.tankLevel);
  }
  for (const coin of input.coinDrops) {
    input.setCoinDropVisible(coin, !input.makeupActive);
  }
  for (const particle of input.ambientWaterParticles) {
    particle.setVisible(!input.makeupActive);
  }
  for (const bubble of input.activeAirStoneBubbles) {
    bubble.setVisible(!input.makeupActive);
  }
  for (const decoration of input.placedDecorations) {
    decoration.image.setVisible(!input.makeupActive && decoration.tankLevel === input.tankLevel);
  }
  if (input.makeupActive) {
    input.dirtyTankOverlay?.setVisible(false);
    input.showDecorationTrashTarget(false);
    return;
  }

  input.refreshFishTankVisibility();
  input.refreshHelperTankVisibility();
  input.refreshDecorationTankVisibility();
  input.updateDirtyTankOverlay();
}
