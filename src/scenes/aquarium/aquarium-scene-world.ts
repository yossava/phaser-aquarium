import Phaser from "phaser";
import { gameHeight, gameWidth, shouldUseLowPowerMode, tankBounds, tankViewportBounds } from "../../game/constants";
import { tankCosmeticBlueTintColor, cleanBubbleTintColor } from "./aquarium-scene-config";

export type AquariumWorldObjects = {
  tankLayer: Phaser.GameObjects.Container;
  tankBackground: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  tankBackgroundBlueTintOverlay: Phaser.GameObjects.Rectangle;
  tankSand: Phaser.GameObjects.Image;
  dirtyTankOverlay: Phaser.GameObjects.Rectangle;
  coinMagnetRay: Phaser.GameObjects.Graphics;
  ambientWaterParticles: Phaser.GameObjects.Arc[];
};

export type AquariumWorldFactory = {
  createTankBackground: () => Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
  createTankFloor: () => Phaser.GameObjects.Image;
  createDirtyTankOverlay: () => Phaser.GameObjects.Rectangle;
  styleAmbientWaterParticle: (particle: Phaser.GameObjects.Arc, randomizeSize?: boolean) => void;
};

export function createAquariumWorld(scene: Phaser.Scene, factory: AquariumWorldFactory): AquariumWorldObjects {
  scene.cameras.main.setBackgroundColor("#071b2a");

  scene.add.rectangle(gameWidth / 2, gameHeight / 2, gameWidth, gameHeight, 0x071b2a);
  scene.add
    .rectangle(
      tankViewportBounds.centerX,
      tankViewportBounds.centerY,
      tankViewportBounds.width,
      tankViewportBounds.height,
      0xd7f4ff,
      0.18
    )
    .setStrokeStyle(0, 0xffffff, 0);

  const tankLayer = scene.add.container(0, 0).setDepth(2);
  const tankBackground = factory.createTankBackground();
  tankLayer.add(tankBackground);

  const tankBackgroundBlueTintOverlay = scene.add
    .rectangle(tankBounds.centerX, tankBounds.centerY, tankBounds.width, tankBounds.height, tankCosmeticBlueTintColor, 1)
    .setDepth(1);
  tankLayer.add(tankBackgroundBlueTintOverlay);

  const tankSand = factory.createTankFloor();
  tankLayer.add(tankSand);

  const dirtyTankOverlay = factory.createDirtyTankOverlay();
  const coinMagnetRay = scene.add.graphics().setDepth(11).setVisible(false);
  tankLayer.add(coinMagnetRay);

  const ambientWaterParticles = createAmbientWaterParticles(scene, tankLayer, factory.styleAmbientWaterParticle);

  return {
    tankLayer,
    tankBackground,
    tankBackgroundBlueTintOverlay,
    tankSand,
    dirtyTankOverlay,
    coinMagnetRay,
    ambientWaterParticles
  };
}

function createAmbientWaterParticles(
  scene: Phaser.Scene,
  tankLayer: Phaser.GameObjects.Container,
  styleAmbientWaterParticle: (particle: Phaser.GameObjects.Arc, randomizeSize?: boolean) => void
): Phaser.GameObjects.Arc[] {
  const particles: Phaser.GameObjects.Arc[] = [];
  const ambientBubbleCount = shouldUseLowPowerMode() ? 8 : 18;

  for (let i = 0; i < ambientBubbleCount; i += 1) {
    const particle = scene.add.circle(
      Phaser.Math.Between(tankBounds.left + 20, tankBounds.right - 20),
      Phaser.Math.Between(tankBounds.top + 20, tankBounds.bottom - 40),
      Phaser.Math.Between(2, 6),
      cleanBubbleTintColor,
      0.28
    );
    styleAmbientWaterParticle(particle);
    particles.push(particle);
    tankLayer.add(particle);
    scene.tweens.add({
      targets: particle,
      y: tankBounds.top + Phaser.Math.Between(8, 60),
      alpha: 0,
      duration: Phaser.Math.Between(3500, 7600),
      repeat: -1,
      delay: Phaser.Math.Between(0, 3500),
      onRepeat: () => {
        particle.x = Phaser.Math.Between(tankBounds.left + 20, tankBounds.right - 20);
        particle.y = tankBounds.bottom - Phaser.Math.Between(30, 90);
        styleAmbientWaterParticle(particle, true);
      }
    });
  }

  return particles;
}
