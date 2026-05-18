import Phaser from "phaser";
import type { PlacedDecoration } from "../../game/tank-entities";
import type { DecorationSize } from "../../game/tank-catalog";
import type { Fish } from "../../objects/Fish";
import type { HelperCreature } from "../../objects/HelperCreature";
import type { DecorationType, FishType } from "../../types/mechanics";
import type { AquariumEntityControllerAdapter } from "./aquarium-entity-controller";
import type { AppScreen, PendingHelperCreatureDrop, PlacementMode } from "./aquarium-scene-config";
import type { AquariumSceneCore } from "./AquariumSceneCore";

type AquariumEntityAdapterScene = Phaser.Scene & {
  input: Phaser.Input.InputPlugin;
  tankLayer: Phaser.GameObjects.Container;
  tankLevel: number;
  activeScreen: AppScreen;
  fish: Fish[];
  placedDecorations: PlacedDecoration[];
  airStoneBubblePool: Phaser.GameObjects.Arc[];
  activeAirStoneBubbles: Set<Phaser.GameObjects.Arc>;
  helperCreatures: HelperCreature[];
  pendingHelperCreatureDrops: PendingHelperCreatureDrop[];
  fishInventory: Map<string, number>;
  draggedFish?: Fish;
  selectedFishIndex?: number;
  placementMode: PlacementMode;
  creatureInventory: Map<string, number>;
  autosaveElapsed: number;
  ensureFishTexturesLoaded: (type: FishType, onLoad: () => void) => void;
  pointerDesignPoint: (pointer: Phaser.Input.Pointer) => Phaser.Math.Vector2;
  screenToTankPoint: (x: number, y: number) => Phaser.Math.Vector2;
  activeFish: () => Fish[];
  maxFishCapacityForLevel: () => number;
  activeFishAtTankPoint: (x: number, y: number) => Fish | undefined;
  showTankFullText: (x: number, y: number) => void;
  takeStoredFishAge: (fishTypeId: string) => number | undefined;
  removeStoredFish: (fishTypeId: string) => void;
  storeFish: (fish: Fish) => void;
  recordDailyQuestAction: (action: string) => void;
  floatText: (message: string, x: number, y: number, color: string) => void;
  floatTankText: (message: string, x: number, y: number, color: string) => void;
  closeModal: () => void;
  refreshUi: () => void;
  createFoodDock: () => void;
  saveNow: () => void;
  getDecorationInventory: (decorationTypeId: string, size: DecorationSize) => number;
  consumeStoredDecoration: (decorationTypeId: string, size: DecorationSize) => void;
  activeDecorations: () => PlacedDecoration[];
  fitDecorationDisplay: (image: Phaser.GameObjects.Image, decoration: DecorationType, size: DecorationSize) => void;
  getCreatureInventory: (creatureTypeId: string) => number;
  activeHelperCreatures: () => HelperCreature[];
  tankViewScaleForLevel: () => number;
};

export function createAquariumEntityControllerAdapter(scene: AquariumSceneCore): AquariumEntityControllerAdapter {
  const aquariumScene = scene as unknown as AquariumEntityAdapterScene;
  return {
    scene: aquariumScene,
    input: aquariumScene.input,
    tankLayer: () => aquariumScene.tankLayer,
    tankLevel: () => aquariumScene.tankLevel,
    activeScreen: () => aquariumScene.activeScreen,
    fish: () => aquariumScene.fish,
    placedDecorations: () => aquariumScene.placedDecorations,
    airStoneBubblePool: () => aquariumScene.airStoneBubblePool,
    activeAirStoneBubbles: () => aquariumScene.activeAirStoneBubbles,
    helperCreatures: () => aquariumScene.helperCreatures,
    pendingHelperCreatureDrops: () => aquariumScene.pendingHelperCreatureDrops,
    fishInventory: () => aquariumScene.fishInventory,
    draggedFish: () => aquariumScene.draggedFish,
    setDraggedFish: (fish) => {
      aquariumScene.draggedFish = fish;
    },
    setSelectedFishIndex: (index) => {
      aquariumScene.selectedFishIndex = index;
    },
    setPlacementMode: (mode) => {
      aquariumScene.placementMode = mode;
    },
    setCreatureInventory: (creatureTypeId, count) => {
      aquariumScene.creatureInventory.set(creatureTypeId, count);
    },
    setAutosaveElapsed: (elapsed) => {
      aquariumScene.autosaveElapsed = elapsed;
    },
    ensureFishTexturesLoaded: (type, onLoad) => aquariumScene.ensureFishTexturesLoaded(type, onLoad),
    pointerDesignPoint: (pointer) => aquariumScene.pointerDesignPoint(pointer),
    screenToTankPoint: (x, y) => aquariumScene.screenToTankPoint(x, y),
    activeFish: () => aquariumScene.activeFish(),
    maxFishCapacityForLevel: () => aquariumScene.maxFishCapacityForLevel(),
    activeFishAtTankPoint: (x, y) => aquariumScene.activeFishAtTankPoint(x, y),
    showTankFullText: (x, y) => aquariumScene.showTankFullText(x, y),
    takeStoredFishAge: (fishTypeId) => aquariumScene.takeStoredFishAge(fishTypeId),
    removeStoredFish: (fishTypeId) => aquariumScene.removeStoredFish(fishTypeId),
    storeFish: (fish) => aquariumScene.storeFish(fish),
    recordDailyQuestAction: (action) => aquariumScene.recordDailyQuestAction(action),
    floatText: (message, x, y, color) => aquariumScene.floatText(message, x, y, color),
    floatTankText: (message, x, y, color) => aquariumScene.floatTankText(message, x, y, color),
    closeModal: () => aquariumScene.closeModal(),
    refreshUi: () => aquariumScene.refreshUi(),
    createFoodDock: () => aquariumScene.createFoodDock(),
    saveNow: () => aquariumScene.saveNow(),
    getDecorationInventory: (decorationTypeId, size) => aquariumScene.getDecorationInventory(decorationTypeId, size),
    consumeStoredDecoration: (decorationTypeId, size) => aquariumScene.consumeStoredDecoration(decorationTypeId, size),
    activeDecorations: () => aquariumScene.activeDecorations(),
    fitDecorationDisplay: (image, decoration, size) => aquariumScene.fitDecorationDisplay(image, decoration, size),
    getCreatureInventory: (creatureTypeId) => aquariumScene.getCreatureInventory(creatureTypeId),
    activeHelperCreatures: () => aquariumScene.activeHelperCreatures(),
    tankViewScaleForLevel: () => aquariumScene.tankViewScaleForLevel()
  };
}
