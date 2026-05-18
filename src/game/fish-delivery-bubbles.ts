import Phaser from "phaser";
import { tankBounds } from "./constants";
import { formatNumber } from "./economy";
import { gameFontFamily } from "./fonts";
import type { Fish } from "../objects/Fish";
import type { FishType } from "../types/mechanics";

export type PendingFishBubble = {
  destination: "inventory" | "tank";
  type: FishType;
  quantity: number;
  consumesInventory?: boolean;
  ageSeconds?: number;
  exchangeTarget?: Fish;
  container: Phaser.GameObjects.Container;
  bubble: Phaser.GameObjects.Arc;
  fishImage: Phaser.GameObjects.Image;
  quantityText?: Phaser.GameObjects.Text;
  velocity: Phaser.Math.Vector2;
  bobOffset: number;
};

export type SpawnFishBubbleOptions = {
  destination: PendingFishBubble["destination"];
  fishType: FishType;
  quantity?: number;
  x?: number;
  y?: number;
  ageSeconds?: number;
  exchangeTarget?: Fish;
  consumesInventory?: boolean;
};

export class FishDeliveryBubbleManager {
  public readonly bubbles: PendingFishBubble[] = [];

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly tankLayer: Phaser.GameObjects.Container,
    private readonly ensureFishTexturesLoaded: (fishType: FishType, onLoad?: () => void) => boolean,
    private readonly onPop: (pending: PendingFishBubble) => boolean | void
  ) {}

  public spawnInventory(fishType: FishType, quantity = 1): void {
    this.spawn({ destination: "inventory", fishType, quantity });
  }

  public spawnTank(
    fishType: FishType,
    x: number,
    y: number,
    options: { ageSeconds?: number; exchangeTarget?: Fish; consumesInventory?: boolean } = {}
  ): void {
    this.spawn({
      destination: "tank",
      fishType,
      quantity: 1,
      x,
      y,
      ageSeconds: options.ageSeconds,
      exchangeTarget: options.exchangeTarget,
      consumesInventory: options.consumesInventory
    });
  }

  public spawn(options: SpawnFishBubbleOptions): void {
    const fishType = options.fishType;
    const quantity = Math.max(1, Math.floor(options.quantity ?? 1));
    const staticTextureKey = `fish-${fishType.id}`;
    const textureReady = this.scene.textures.exists(staticTextureKey);
    const textureKey = textureReady ? staticTextureKey : "fish-base";
    const radius = 34;
    const x = options.x ?? Phaser.Math.Between(Math.round(tankBounds.left + 62), Math.round(tankBounds.right - 62));
    const y = options.y ?? Phaser.Math.Between(Math.round(tankBounds.top + 82), Math.round(tankBounds.bottom - 116));
    const bubble = this.scene.add.circle(0, 0, radius, 0xbfeeff, 0.22)
      .setStrokeStyle(3, 0xf4feff, 0.74);
    const shine = this.scene.add.circle(-12, -13, 7, 0xffffff, 0.38);
    const fishImage = this.scene.add.image(0, 3, textureKey)
      .setDisplaySize(54, 34)
      .setAlpha(textureReady ? 0.94 : 0);
    const children: Phaser.GameObjects.GameObject[] = [bubble, shine, fishImage];
    const quantityText = quantity > 1
      ? this.scene.add.text(17, 18, `x${formatNumber(quantity)}`, {
          fontFamily: gameFontFamily,
          fontSize: "13px",
          color: "#ffffff",
          fontStyle: "900",
          stroke: "#063557",
          strokeThickness: 4
        }).setOrigin(0.5)
      : undefined;
    if (quantityText) {
      children.push(quantityText);
    }

    const hitRadius = radius * 1.85;
    const container = this.scene.add.container(x, y, children)
      .setDepth(30)
      .setSize(hitRadius * 2, hitRadius * 2)
      .setInteractive(new Phaser.Geom.Circle(0, 0, hitRadius), Phaser.Geom.Circle.Contains);
    container.on("pointerdown", (_pointer: Phaser.Input.Pointer, _localX: number, _localY: number, event: Phaser.Types.Input.EventData) => {
      event.stopPropagation();
      this.pop(pending);
    });
    this.tankLayer.add(container);

    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const speed = Phaser.Math.FloatBetween(10, 18);
    const pending: PendingFishBubble = {
      destination: options.destination,
      type: fishType,
      quantity,
      consumesInventory: options.consumesInventory,
      ageSeconds: options.ageSeconds,
      exchangeTarget: options.exchangeTarget,
      container,
      bubble,
      fishImage,
      quantityText,
      velocity: new Phaser.Math.Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed),
      bobOffset: Phaser.Math.FloatBetween(0, Math.PI * 2)
    };
    this.bubbles.push(pending);
    this.ensureFishTexturesLoaded(fishType, () => {
      if (!fishImage.active) {
        return;
      }
      fishImage.setTexture(staticTextureKey).setDisplaySize(54, 34).setAlpha(0.94);
    });

    this.scene.tweens.add({
      targets: container,
      scaleX: { from: 0.68, to: 1 },
      scaleY: { from: 0.68, to: 1 },
      alpha: { from: 0.1, to: 1 },
      duration: 280,
      ease: "Back.Out"
    });
  }

  public update(deltaSeconds: number, now: number): void {
    for (const pending of this.bubbles) {
      const container = pending.container;
      const bob = Math.sin(now * 0.0014 + pending.bobOffset) * 8;
      container.x += pending.velocity.x * deltaSeconds;
      container.y += pending.velocity.y * deltaSeconds;
      if (container.x < tankBounds.left + 44 || container.x > tankBounds.right - 44) {
        pending.velocity.x *= -1;
        container.x = Phaser.Math.Clamp(container.x, tankBounds.left + 44, tankBounds.right - 44);
      }
      if (container.y < tankBounds.top + 58 || container.y > tankBounds.bottom - 94) {
        pending.velocity.y *= -1;
        container.y = Phaser.Math.Clamp(container.y, tankBounds.top + 58, tankBounds.bottom - 94);
      }
      pending.fishImage.y = 3 + bob * 0.08;
      pending.bubble.setAlpha(Phaser.Math.Clamp(0.22 + Math.sin(now * 0.002 + pending.bobOffset) * 0.05, 0.16, 0.3));
    }
  }

  public atTankPoint(tankX: number, tankY: number, tankViewScale: number): PendingFishBubble | undefined {
    if (this.bubbles.length === 0) {
      return undefined;
    }

    const hitRadius = 64 / Math.max(0.01, tankViewScale);
    let nearestBubble: PendingFishBubble | undefined;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const pending of this.bubbles) {
      const distance = Phaser.Math.Distance.Between(tankX, tankY, pending.container.x, pending.container.y);
      if (distance <= hitRadius && distance < nearestDistance) {
        nearestBubble = pending;
        nearestDistance = distance;
      }
    }

    return nearestBubble;
  }

  public pop(pending: PendingFishBubble): void {
    pending.container.disableInteractive();
    const accepted = this.onPop(pending) !== false;
    if (!accepted) {
      pending.container.setInteractive(new Phaser.Geom.Circle(0, 0, pending.container.width * 0.5), Phaser.Geom.Circle.Contains);
      return;
    }

    const index = this.bubbles.indexOf(pending);
    if (index >= 0) {
      this.bubbles.splice(index, 1);
    }
    this.scene.tweens.add({
      targets: pending.container,
      scaleX: 1.38,
      scaleY: 1.38,
      alpha: 0,
      duration: 180,
      ease: "Quad.Out",
      onComplete: () => pending.container.destroy(true)
    });
  }

  public destroyAll(): void {
    for (const pending of this.bubbles) {
      pending.container.destroy(true);
    }
    this.bubbles.length = 0;
  }
}
