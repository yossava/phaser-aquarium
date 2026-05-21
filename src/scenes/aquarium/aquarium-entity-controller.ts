import Phaser from "phaser";
import { addStoredFish as addStoredFishModel } from "../../game/fish-inventory";
import {
  activeHelperCreatureCountWithPending as activeHelperCreatureCountWithPendingModel,
  defaultDecorationDepth,
  fitPendingHelperCreatureDrop as fitPendingHelperCreatureDropModel,
  helperCreatureDropSpawn
} from "../../game/tank-placement";
import type { PlacedDecoration } from "../../game/tank-entities";
import { Fish } from "../../objects/Fish";
import { HelperCreature } from "../../objects/HelperCreature";
import type { DecorationType, FishGender, FishType, HelperCreatureType } from "../../types/mechanics";
import { tankBounds, tankViewportBounds, toastX, toastY } from "../../game/constants";
import type { DecorationSize } from "../../game/tank-catalog";
import {
  helperCreatureDropDisplayWidths,
  helperCreatureDropSpeed,
  helperCreatureSeabedY,
  maxDecorations,
  maxHelperCreatures,
  type AppScreen,
  type PendingHelperCreatureDrop,
  type PlacementMode
} from "./aquarium-scene-config";

export type AquariumEntityControllerAdapter = {
  scene: Phaser.Scene;
  input: Phaser.Input.InputPlugin;
  tankLayer: () => Phaser.GameObjects.Container;
  tankLevel: () => number;
  activeScreen: () => AppScreen;
  fish: () => Fish[];
  placedDecorations: () => PlacedDecoration[];
  airStoneBubblePool: () => Phaser.GameObjects.Arc[];
  activeAirStoneBubbles: () => Set<Phaser.GameObjects.Arc>;
  helperCreatures: () => HelperCreature[];
  pendingHelperCreatureDrops: () => PendingHelperCreatureDrop[];
  fishInventory: () => Map<string, number>;
  draggedFish: () => Fish | undefined;
  setDraggedFish: (fish: Fish | undefined) => void;
  setSelectedFishIndex: (index: number | undefined) => void;
  setPlacementMode: (mode: PlacementMode) => void;
  setCreatureInventory: (creatureTypeId: string, count: number) => void;
  setAutosaveElapsed: (elapsed: number) => void;
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

export class AquariumEntityController {
  constructor(private readonly adapter: AquariumEntityControllerAdapter) {}

  addFishToTank(type: FishType, x: number, y: number, options: { gender?: FishGender; tankLevel?: number; ageSeconds?: number; visualAgeSeconds?: number } = {}): Fish {
    const placedFish = new Fish(this.adapter.scene, type, x, y, options);
    if (options.ageSeconds && options.ageSeconds > 0) {
      placedFish.setAgeSeconds(options.ageSeconds);
      placedFish.setVisualAgeSeconds(options.visualAgeSeconds ?? options.ageSeconds);
    } else if (options.visualAgeSeconds !== undefined) {
      placedFish.setVisualAgeSeconds(options.visualAgeSeconds);
    }
    this.adapter.ensureFishTexturesLoaded(type, () => placedFish.refreshTextureIfAvailable());
    placedFish.addToContainer(this.adapter.tankLayer());
    placedFish.setTankVisible(placedFish.tankLevel === this.adapter.tankLevel());
    placedFish.sprite.setInteractive({ useHandCursor: true, draggable: true });
    this.adapter.input.setDraggable(placedFish.sprite, true);
    placedFish.sprite.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.adapter.setSelectedFishIndex(this.adapter.fish().indexOf(placedFish));
    });
    placedFish.sprite.on("dragstart", (_pointer: Phaser.Input.Pointer) => {
      if (this.adapter.activeScreen() !== "tank" || placedFish.tankLevel !== this.adapter.tankLevel()) {
        return;
      }

      this.adapter.setDraggedFish(placedFish);
      this.adapter.setSelectedFishIndex(this.adapter.fish().indexOf(placedFish));
      placedFish.beginManualDrag();
      placedFish.sprite.setDepth(14);
    });
    placedFish.sprite.on("drag", (pointer: Phaser.Input.Pointer) => {
      if (this.adapter.draggedFish() !== placedFish || this.adapter.activeScreen() !== "tank") {
        return;
      }

      const pointerPoint = this.adapter.pointerDesignPoint(pointer);
      const tankPoint = this.adapter.screenToTankPoint(pointerPoint.x, pointerPoint.y);
      placedFish.moveManuallyTo(tankPoint.x, tankPoint.y);
    });
    placedFish.sprite.on("dragend", (pointer: Phaser.Input.Pointer) => {
      if (this.adapter.draggedFish() !== placedFish) {
        return;
      }

      const pointerPoint = this.adapter.pointerDesignPoint(pointer);
      if (this.adapter.activeScreen() === "tank" && tankViewportBounds.contains(pointerPoint.x, pointerPoint.y)) {
        const tankPoint = this.adapter.screenToTankPoint(pointerPoint.x, pointerPoint.y);
        placedFish.moveManuallyTo(tankPoint.x, tankPoint.y);
      }
      placedFish.endManualDrag();
      placedFish.sprite.setDepth(8);
      this.adapter.setDraggedFish(undefined);
      this.adapter.recordDailyQuestAction("move-fish");
      this.adapter.saveNow();
    });
    this.adapter.fish().push(placedFish);
    return placedFish;
  }

  placeFishWithCompatibility(type: FishType, x: number, y: number): void {
    const exchangeTarget = this.adapter.activeFish().length >= this.adapter.maxFishCapacityForLevel()
      ? this.adapter.activeFishAtTankPoint(x, y)
      : undefined;
    if (this.adapter.activeFish().length >= this.adapter.maxFishCapacityForLevel() && !exchangeTarget) {
      this.adapter.showTankFullText(x, y);
      return;
    }

    this.adapter.takeStoredFishAge(type.id);
    this.adapter.removeStoredFish(type.id);
    if (exchangeTarget) {
      this.adapter.storeFish(exchangeTarget);
    }
    this.addFishToTank(type, x, y, {
      tankLevel: this.adapter.tankLevel()
    });
    this.adapter.recordDailyQuestAction("place-fish");

    this.adapter.floatTankText(exchangeTarget ? `${type.name} swapped in` : `${type.name} moved in`, x, y - 34, "#ffffff");
    this.adapter.setPlacementMode({ kind: "none" });
    this.adapter.closeModal();
    this.adapter.refreshUi();
    this.adapter.createFoodDock();
    this.adapter.saveNow();
  }

  addFishToInventory(fishType: FishType, quantity = 1): void {
    addStoredFishModel({
      fishInventory: this.adapter.fishInventory(),
      fishTypeId: fishType.id,
      quantity
    });
  }

  addDecorationToTank(
    decoration: DecorationType,
    x: number,
    y: number,
    size: DecorationSize = "m",
    tankLevel = this.adapter.tankLevel(),
    depth = defaultDecorationDepth(y)
  ): void {
    const image = this.adapter.scene.add.image(x, y, decoration.texture).setDepth(depth);
    this.adapter.fitDecorationDisplay(image, decoration, size);
    this.adapter.tankLayer().add(image);
    const placedDecoration = { typeId: decoration.id, size, image, tankLevel };
    image.setVisible(placedDecoration.tankLevel === this.adapter.tankLevel());
    this.adapter.placedDecorations().push(placedDecoration);
  }

  placeDecorationFromInventory(decoration: DecorationType, size: DecorationSize, x: number, y: number): void {
    if (this.adapter.getDecorationInventory(decoration.id, size) <= 0) {
      this.adapter.floatText("Buy one first", toastX, toastY, "#ffb0a8");
      return;
    }

    if (this.adapter.activeDecorations().length >= maxDecorations) {
      this.adapter.floatText("Decor full", toastX, toastY, "#ffb0a8");
      return;
    }

    this.adapter.consumeStoredDecoration(decoration.id, size);
    this.addDecorationToTank(decoration, x, y, size);
    this.adapter.recordDailyQuestAction("place-decoration");
    this.adapter.setPlacementMode({ kind: "none" });
    this.adapter.refreshUi();
    this.adapter.createFoodDock();
    this.adapter.saveNow();
  }

  updateAirStoneBubbles(deltaSeconds: number, activeDecorations: PlacedDecoration[]): void {
    if (this.adapter.activeScreen() === "makeup") {
      return;
    }

    if (this.adapter.activeAirStoneBubbles().size >= 16) {
      return;
    }

    for (const decoration of activeDecorations) {
      if (decoration.typeId !== "air-stone" || !decoration.image.visible) {
        continue;
      }

      decoration.bubbleCooldown = Math.max(0, (decoration.bubbleCooldown ?? 0) - deltaSeconds);
      if (decoration.bubbleCooldown > 0) {
        continue;
      }

      decoration.bubbleCooldown = Phaser.Math.FloatBetween(0.4, 0.85);
      this.spawnAirStoneBubble(decoration);
    }
  }

  spawnAirStoneBubble(decoration: PlacedDecoration): void {
    const startX = decoration.image.x + Phaser.Math.Between(-8, 8);
    const startY = decoration.image.y - decoration.image.displayHeight * 0.24 + Phaser.Math.Between(-3, 4);
    const radius = Phaser.Math.FloatBetween(1.5, 3.2);
    const reusedBubble = this.adapter.airStoneBubblePool().pop();
    const bubble = reusedBubble ?? this.adapter.scene.add.circle(0, 0, 2.4, 0xd7f4ff, 0.34);
    if (!reusedBubble) {
      this.adapter.tankLayer().add(bubble);
    }
    bubble
      .setPosition(startX, startY)
      .setScale(radius / 2.4)
      .setAlpha(0.34)
      .setVisible(true)
      .setActive(true)
      .setFillStyle(0xd7f4ff, 0.34)
      .setStrokeStyle(1, 0xffffff, 0.42)
      .setDepth(Math.max(6, decoration.image.depth + 1));
    this.adapter.activeAirStoneBubbles().add(bubble);
    this.adapter.scene.tweens.add({
      targets: bubble,
      x: startX + Phaser.Math.Between(-10, 10),
      y: Math.max(tankBounds.top + 22, startY - Phaser.Math.Between(86, 148)),
      alpha: 0,
      scale: Phaser.Math.FloatBetween(1.15, 1.55),
      duration: Phaser.Math.Between(1700, 2800),
      ease: "Sine.easeOut",
      onComplete: () => {
        this.adapter.activeAirStoneBubbles().delete(bubble);
        bubble.setVisible(false).setActive(false);
        if (this.adapter.airStoneBubblePool().length < 16) {
          this.adapter.airStoneBubblePool().push(bubble);
        } else {
          bubble.destroy();
        }
      }
    });
  }

  addHelperCreatureToTank(creatureType: HelperCreatureType, x: number, y = tankBounds.bottom - 36, targetX = x, tankLevel = this.adapter.tankLevel()): HelperCreature {
    const yBounds = { min: tankBounds.bottom - 48, max: tankBounds.bottom - 28 };
    const helper = new HelperCreature(
      this.adapter.scene,
      creatureType,
      Phaser.Math.Clamp(x, tankBounds.left + 24, tankBounds.right - 24),
      Phaser.Math.Clamp(y, yBounds.min, yBounds.max),
      { tankLevel }
    );
    helper.restoreProgress(targetX);
    helper.addToContainer(this.adapter.tankLayer());
    helper.setTankVisible(helper.tankLevel === this.adapter.tankLevel());
    helper.sprite.on("pointerdown", (_pointer: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.adapter.floatTankText(
        creatureType.name,
        helper.sprite.x,
        helper.sprite.y - 24,
        "#d7f4ff"
      );
    });
    this.adapter.helperCreatures().push(helper);
    return helper;
  }

  dropHelperCreatureFromInventory(creatureType: HelperCreatureType, x: number, y: number): void {
    if (this.adapter.getCreatureInventory(creatureType.id) <= 0) {
      this.adapter.floatText("Hire one first", toastX, toastY, "#ffb0a8");
      return;
    }

    if (this.activeHelperCreatureCountWithPending() >= maxHelperCreatures) {
      this.adapter.floatText("Helpers full in this tank", toastX, toastY, "#ffb0a8");
      return;
    }

    this.adapter.setCreatureInventory(creatureType.id, Math.max(0, this.adapter.getCreatureInventory(creatureType.id) - 1));
    this.adapter.recordDailyQuestAction("place-helper");
    this.createPendingHelperCreatureDrop(creatureType, x, y);
    this.adapter.floatTankText(`${creatureType.name} dropped`, x, y - 24, "#d7f4ff");
    this.adapter.setPlacementMode({ kind: "none" });
    this.adapter.refreshUi();
    this.adapter.createFoodDock();
  }

  activeHelperCreatureCountWithPending(): number {
    return activeHelperCreatureCountWithPendingModel({
      helpers: this.adapter.activeHelperCreatures(),
      pendingDrops: this.adapter.pendingHelperCreatureDrops(),
      tankLevel: this.adapter.tankLevel()
    });
  }

  createPendingHelperCreatureDrop(creatureType: HelperCreatureType, x: number, y: number): void {
    const drop: PendingHelperCreatureDrop = helperCreatureDropSpawn({
      creatureType,
      x,
      y,
      tankLevel: this.adapter.tankLevel(),
      seabedY: helperCreatureSeabedY,
      createImage: (imageX, imageY, texture) => this.adapter.scene.add.image(imageX, imageY, texture)
    });
    drop.sprite.setDepth(9);
    drop.sprite.setVisible(drop.tankLevel === this.adapter.tankLevel());
    this.fitPendingHelperCreatureDrop(drop, this.adapter.tankViewScaleForLevel());
    this.adapter.tankLayer().add(drop.sprite);
    this.adapter.pendingHelperCreatureDrops().push(drop);
    this.adapter.setAutosaveElapsed(0);
  }

  updatePendingHelperCreatureDrops(deltaSeconds: number): void {
    if (this.adapter.pendingHelperCreatureDrops().length === 0) {
      return;
    }

    const landedDrops: PendingHelperCreatureDrop[] = [];
    for (const drop of this.adapter.pendingHelperCreatureDrops()) {
      drop.sprite.y = Math.min(helperCreatureSeabedY, drop.sprite.y + helperCreatureDropSpeed * deltaSeconds);
      if (drop.sprite.y >= helperCreatureSeabedY - 0.5) {
        landedDrops.push(drop);
      }
    }

    for (const drop of landedDrops) {
      this.landPendingHelperCreatureDrop(drop);
    }
  }

  landPendingHelperCreatureDrop(drop: PendingHelperCreatureDrop): void {
    const index = this.adapter.pendingHelperCreatureDrops().indexOf(drop);
    if (index < 0) {
      return;
    }

    this.adapter.pendingHelperCreatureDrops().splice(index, 1);
    const x = drop.sprite.x;
    const y = helperCreatureSeabedY;
    drop.sprite.destroy();
    const helper = this.addHelperCreatureToTank(drop.type, x, y, drop.targetX, drop.tankLevel);
    this.adapter.floatTankText(`${drop.type.name} active`, helper.sprite.x, tankBounds.bottom - 62, "#a8ffb0");
    this.adapter.refreshUi();
    this.adapter.saveNow();
  }

  fitPendingHelperCreatureDrop(drop: PendingHelperCreatureDrop, tankViewScale: number): void {
    fitPendingHelperCreatureDropModel(drop, tankViewScale, helperCreatureDropDisplayWidths);
  }
}
