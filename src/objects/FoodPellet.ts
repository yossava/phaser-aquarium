import Phaser from "phaser";
import { tankBounds } from "../game/constants";
import { foodTintFor } from "../game/visuals";
import type { FoodType } from "../types/mechanics";

const defaultPelletDisplaySize = 18;
const pillPelletDisplaySize = 22;

export class FoodPellet {
  public sprite: Phaser.GameObjects.Image;
  public readonly sinkSpeed = 18;
  private readonly baseDisplaySize: number;
  private velocityX: number;

  public constructor(scene: Phaser.Scene, x: number, y: number, public readonly foodType: FoodType, options: { velocityX?: number } = {}) {
    const textureKey = this.textureKey(scene);
    this.sprite = scene.add.image(x, y, textureKey);
    this.velocityX = options.velocityX ?? 0;
    if (textureKey === "food") {
      this.sprite.setTint(this.tintForFood());
    }
    this.baseDisplaySize = foodType.id === "medicine" || foodType.id === "evolve" ? pillPelletDisplaySize : defaultPelletDisplaySize;
    this.setWorldScaleCompensation(1);
    this.sprite.setDepth(7);
  }

  public get nutrition(): number {
    return this.foodType.calories;
  }

  public get visualTint(): number {
    return foodTintFor(this.foodType.id);
  }

  public addToContainer(container: Phaser.GameObjects.Container): void {
    container.add(this.sprite);
  }

  public setWorldScaleCompensation(tankViewScale: number): void {
    const displaySize = this.baseDisplaySize / Math.max(0.01, tankViewScale);
    this.sprite.setDisplaySize(displaySize, displaySize);
  }

  public update(deltaSeconds: number): void {
    if (Math.abs(this.velocityX) > 0.1) {
      this.sprite.x = Phaser.Math.Clamp(this.sprite.x + this.velocityX * deltaSeconds, tankBounds.left + 12, tankBounds.right - 12);
      this.velocityX = Phaser.Math.Linear(this.velocityX, 0, Math.min(1, deltaSeconds * 1.8));
    }
    this.sprite.y = Math.min(tankBounds.bottom - 16, this.sprite.y + this.sinkSpeed * deltaSeconds);
  }

  public destroy(): void {
    this.sprite.destroy();
  }

  private textureKey(scene: Phaser.Scene): string {
    const customTextureKey = `food-${this.foodType.id}`;
    if (scene.textures.exists(customTextureKey)) {
      return customTextureKey;
    }

    return this.foodType.id === "medicine" ? "medicine-pill" : this.foodType.id === "evolve" ? "evolve-pill" : "food";
  }

  private tintForFood(): number {
    return foodTintFor(this.foodType.id);
  }
}
