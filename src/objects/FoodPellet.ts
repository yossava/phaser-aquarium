import Phaser from "phaser";
import { tankBounds } from "../game/constants";
import { foodTintFor } from "../game/visuals";
import type { FoodType } from "../types/mechanics";

export class FoodPellet {
  public sprite: Phaser.GameObjects.Image;
  public readonly sinkSpeed = 18;

  public constructor(scene: Phaser.Scene, x: number, y: number, public readonly foodType: FoodType) {
    this.sprite = scene.add.image(x, y, this.textureKey());
    if (foodType.id !== "medicine") {
      this.sprite.setTint(this.tintForFood());
    }
    this.sprite.setDepth(7);
  }

  public get nutrition(): number {
    return this.foodType.nutrition;
  }

  public get visualTint(): number {
    return foodTintFor(this.foodType.id);
  }

  public update(deltaSeconds: number): void {
    this.sprite.y = Math.min(tankBounds.bottom - 16, this.sprite.y + this.sinkSpeed * deltaSeconds);
  }

  public destroy(): void {
    this.sprite.destroy();
  }

  private textureKey(): string {
    return this.foodType.id === "medicine" ? "medicine-pill" : "food";
  }

  private tintForFood(): number {
    return foodTintFor(this.foodType.id);
  }
}
