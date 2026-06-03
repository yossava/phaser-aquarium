import type { SavedGame } from '../game/save';

let bootstrappedSave: SavedGame | undefined;
let freshStart = false;

export function setBootstrappedSave(save: SavedGame | undefined): void {
  bootstrappedSave = save;
  freshStart = save === undefined;
}

export function getBootstrappedSave(): SavedGame | undefined {
  return bootstrappedSave;
}

export function isFreshStart(): boolean {
  return freshStart;
}
