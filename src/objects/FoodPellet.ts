import Phaser from "phaser";
import { tankBounds } from "../game/constants";

export class FoodPellet {
  public sprite: Phaser.GameObjects.Image;
  public nutrition = 46;
  private sinkSpeed = 18;

  public constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.image(x, y, "food");
    this.sprite.setDepth(7);
  }

  public update(deltaSeconds: number): void {
    this.sprite.y = Math.min(tankBounds.bottom - 16, this.sprite.y + this.sinkSpeed * deltaSeconds);
  }

  public destroy(): void {
    this.sprite.destroy();
  }
}

