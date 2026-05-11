import Phaser from "phaser";
import type { DecorationType, HelperCreatureType } from "../types/mechanics";

export function createFallbackTextures(
  scene: Phaser.Scene,
  decorationTypes: DecorationType[],
  helperCreatureTypes: HelperCreatureType[]
): void {
  createFishTexture(scene);
  createFishAssetTextures(scene);
  createFoodTexture(scene);
  createMedicineTexture(scene);
  createCoinTexture(scene);
  createDecorationTextures(scene, decorationTypes);
  createHelperCreatureTextures(scene, helperCreatureTypes);
}

function createFishTexture(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();
  graphics.fillStyle(0xffffff, 1);
  graphics.fillTriangle(12, 24, 0, 10, 0, 38);
  graphics.fillEllipse(34, 24, 52, 30);
  graphics.fillStyle(0xfff1a8, 1);
  graphics.fillEllipse(43, 18, 12, 8);
  graphics.fillStyle(0x082033, 1);
  graphics.fillCircle(48, 17, 3);
  graphics.lineStyle(2, 0x082033, 0.24);
  graphics.beginPath();
  graphics.arc(26, 27, 10, 0.1, 1.3);
  graphics.strokePath();
  graphics.generateTexture("fish-base", 64, 48);
  graphics.destroy();
}

function createFishAssetTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists("fish-goldfish")) {
    createGoldfishTexture(scene);
  }
  if (!scene.textures.exists("fish-angelfish")) {
    createAngelfishTexture(scene);
  }
  if (!scene.textures.exists("fish-celestial-koi")) {
    createCelestialKoiTexture(scene);
  }
}

function createGoldfishTexture(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();
  graphics.fillStyle(0xffb13b, 0.9);
  graphics.fillTriangle(12, 24, 1, 10, 1, 38);
  graphics.fillTriangle(16, 24, 5, 15, 5, 33);
  graphics.lineStyle(1, 0xffe0a0, 0.52);
  graphics.strokeTriangle(12, 24, 1, 10, 1, 38);
  graphics.fillStyle(0xffb23c, 1);
  graphics.fillEllipse(35, 24, 44, 27);
  graphics.fillStyle(0xffd06a, 1);
  graphics.fillEllipse(39, 19, 28, 13);
  graphics.fillStyle(0xfff0b8, 0.8);
  graphics.fillEllipse(43, 29, 20, 8);
  graphics.fillStyle(0xff8e2e, 0.72);
  graphics.fillEllipse(31, 12, 15, 8);
  graphics.fillEllipse(31, 36, 16, 8);
  graphics.lineStyle(2, 0xd86a20, 0.38);
  graphics.beginPath();
  graphics.arc(27, 27, 8, 0.15, 1.25);
  graphics.strokePath();
  graphics.fillStyle(0xffffff, 1);
  graphics.fillCircle(49, 18, 4);
  graphics.fillStyle(0x082033, 1);
  graphics.fillCircle(50, 18, 2);
  graphics.fillStyle(0xffffff, 0.95);
  graphics.fillCircle(51, 17, 1);
  graphics.generateTexture("fish-goldfish", 64, 48);
  graphics.destroy();
}

function createAngelfishTexture(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();
  graphics.fillStyle(0x56a8ff, 0.82);
  graphics.fillTriangle(14, 24, 1, 9, 3, 39);
  graphics.fillStyle(0xffb13b, 0.8);
  graphics.fillTriangle(8, 24, 1, 18, 1, 30);
  graphics.fillStyle(0xfff1c5, 0.42);
  graphics.fillTriangle(28, 24, 21, 1, 40, 19);
  graphics.fillTriangle(28, 24, 20, 47, 41, 30);
  graphics.fillStyle(0xdd9f68, 1);
  graphics.fillTriangle(18, 24, 40, 5, 52, 24);
  graphics.fillTriangle(18, 24, 40, 43, 52, 24);
  graphics.fillStyle(0xf7d7a2, 0.88);
  graphics.fillEllipse(40, 24, 29, 30);
  graphics.lineStyle(3, 0x754b31, 0.42);
  graphics.lineBetween(33, 10, 30, 38);
  graphics.lineBetween(43, 9, 39, 39);
  graphics.lineStyle(2, 0xfff3c4, 0.8);
  graphics.strokeTriangle(18, 24, 40, 5, 52, 24);
  graphics.strokeTriangle(18, 24, 40, 43, 52, 24);
  graphics.fillStyle(0xffffff, 1);
  graphics.fillCircle(50, 20, 4);
  graphics.fillStyle(0x082033, 1);
  graphics.fillCircle(51, 20, 2);
  graphics.fillStyle(0xffffff, 0.95);
  graphics.fillCircle(52, 19, 1);
  graphics.generateTexture("fish-angelfish", 64, 48);
  graphics.destroy();
}

function createCelestialKoiTexture(scene: Phaser.Scene): void {
  const graphics = scene.add.graphics();
  graphics.fillStyle(0x78d957, 0.86);
  graphics.fillTriangle(12, 24, 1, 7, 2, 41);
  graphics.fillStyle(0x35d6d0, 0.72);
  graphics.fillTriangle(8, 24, 1, 15, 1, 33);
  graphics.fillStyle(0xaee81f, 0.22);
  graphics.fillEllipse(34, 24, 60, 36);
  graphics.fillStyle(0xaae81f, 1);
  graphics.fillEllipse(34, 24, 48, 23);
  graphics.fillStyle(0xf6ffd5, 0.9);
  graphics.fillEllipse(43, 28, 25, 8);
  graphics.fillStyle(0x8dd9aa, 0.92);
  graphics.fillEllipse(26, 18, 12, 6);
  graphics.fillEllipse(36, 21, 10, 5);
  graphics.fillStyle(0xd7fcff, 0.6);
  graphics.fillEllipse(31, 11, 18, 7);
  graphics.fillEllipse(31, 37, 18, 7);
  graphics.lineStyle(1, 0xf7ffb3, 0.9);
  graphics.lineBetween(21, 22, 48, 17);
  graphics.lineBetween(22, 27, 47, 31);
  graphics.fillStyle(0xffffff, 0.95);
  graphics.fillCircle(25, 19, 1.4);
  graphics.fillCircle(33, 16, 1.2);
  graphics.fillCircle(43, 21, 1.2);
  graphics.fillStyle(0xffffff, 1);
  graphics.fillCircle(51, 19, 4);
  graphics.fillStyle(0x082033, 1);
  graphics.fillCircle(52, 19, 2);
  graphics.fillStyle(0xffffff, 0.95);
  graphics.fillCircle(53, 18, 1);
  graphics.generateTexture("fish-celestial-koi", 64, 48);
  graphics.destroy();
}

function createFoodTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists("food")) {
    return;
  }
  const graphics = scene.add.graphics();
  graphics.fillStyle(0xffd15c, 1);
  graphics.fillCircle(8, 8, 7);
  graphics.fillStyle(0xfff0a0, 1);
  graphics.fillCircle(6, 6, 2);
  graphics.generateTexture("food", 16, 16);
  graphics.destroy();
}

function createMedicineTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists("medicine-pill")) {
    return;
  }
  const graphics = scene.add.graphics();
  graphics.fillStyle(0x43d66f, 1);
  graphics.fillRoundedRect(1, 3, 22, 12, 6);
  graphics.lineStyle(2, 0xd8ffe4, 0.9);
  graphics.strokeRoundedRect(1, 3, 22, 12, 6);
  graphics.lineStyle(2, 0x1c8f48, 0.75);
  graphics.lineBetween(12, 4, 12, 14);
  graphics.fillStyle(0xcaffd7, 0.9);
  graphics.fillCircle(7, 7, 2);
  graphics.generateTexture("medicine-pill", 24, 18);
  graphics.destroy();
}

function createCoinTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists("coin")) {
    return;
  }
  const graphics = scene.add.graphics();
  graphics.fillStyle(0xffffff, 1);
  graphics.fillCircle(14, 14, 13);
  graphics.lineStyle(3, 0xfff2a8, 1);
  graphics.strokeCircle(14, 14, 9);
  graphics.lineStyle(2, 0x9d6a00, 0.75);
  graphics.strokeCircle(14, 14, 13);
  graphics.generateTexture("coin", 28, 28);
  graphics.destroy();
}

function createDecorationTextures(scene: Phaser.Scene, decorationTypes: DecorationType[]): void {
  if (decorationTypes.every((decorationType) => scene.textures.exists(decorationType.texture))) {
    return;
  }

  if (!scene.textures.exists("decor-plant")) {
    const plant = scene.add.graphics();
    plant.fillStyle(0x216b3a, 1);
    plant.fillRect(27, 46, 10, 26);
    plant.fillStyle(0x3bb35f, 1);
    plant.fillEllipse(22, 44, 16, 42);
    plant.fillEllipse(40, 40, 16, 46);
    plant.fillEllipse(31, 28, 18, 50);
    plant.fillStyle(0x784d28, 1);
    plant.fillRect(18, 68, 28, 8);
    plant.generateTexture("decor-plant", 64, 80);
    plant.destroy();
  }

  if (!scene.textures.exists("decor-rock")) {
    const rock = scene.add.graphics();
    rock.fillStyle(0x69747c, 1);
    rock.fillEllipse(34, 42, 58, 36);
    rock.fillStyle(0x87929a, 1);
    rock.fillEllipse(23, 34, 22, 18);
    rock.fillEllipse(44, 33, 26, 22);
    rock.generateTexture("decor-rock", 72, 64);
    rock.destroy();
  }

  if (!scene.textures.exists("decor-castle")) {
    const castle = scene.add.graphics();
    castle.fillStyle(0x9a8eca, 1);
    castle.fillRect(18, 28, 54, 48);
    castle.fillRect(10, 18, 18, 58);
    castle.fillRect(62, 18, 18, 58);
    castle.fillStyle(0x5d5387, 1);
    castle.fillTriangle(10, 18, 19, 4, 28, 18);
    castle.fillTriangle(62, 18, 71, 4, 80, 18);
    castle.fillStyle(0x342d52, 1);
    castle.fillRoundedRect(38, 48, 14, 28, 7);
    castle.fillRect(29, 36, 9, 10);
    castle.fillRect(54, 36, 9, 10);
    castle.generateTexture("decor-castle", 92, 86);
    castle.destroy();
  }

  if (!scene.textures.exists("decor-crystal")) {
    const crystal = scene.add.graphics();
    crystal.fillStyle(0x9ff8ff, 0.95);
    crystal.fillTriangle(46, 6, 18, 72, 74, 72);
    crystal.fillStyle(0xe0fbff, 0.9);
    crystal.fillTriangle(46, 6, 38, 72, 58, 72);
    crystal.fillStyle(0xb48cff, 0.95);
    crystal.fillTriangle(22, 28, 4, 78, 42, 78);
    crystal.fillStyle(0xff9bed, 0.9);
    crystal.fillTriangle(70, 28, 50, 78, 88, 78);
    crystal.lineStyle(2, 0xffffff, 0.7);
    crystal.lineBetween(46, 6, 46, 72);
    crystal.lineBetween(22, 28, 28, 78);
    crystal.lineBetween(70, 28, 64, 78);
    crystal.generateTexture("decor-crystal", 92, 86);
    crystal.destroy();
  }
}

function createHelperCreatureTextures(scene: Phaser.Scene, helperCreatureTypes: HelperCreatureType[]): void {
  if (helperCreatureTypes.every((creatureType) => scene.textures.exists(creatureType.texture))) {
    return;
  }

  if (!scene.textures.exists("helper-shrimp")) {
    const shrimp = scene.add.graphics();
    shrimp.fillStyle(0xff8f73, 1);
    shrimp.fillEllipse(24, 18, 34, 18);
    shrimp.fillTriangle(8, 18, 0, 10, 0, 26);
    shrimp.lineStyle(2, 0xffd0c4, 0.9);
    shrimp.lineBetween(30, 16, 44, 8);
    shrimp.lineBetween(30, 20, 44, 28);
    shrimp.lineStyle(2, 0x6b2735, 0.55);
    shrimp.lineBetween(12, 28, 12, 36);
    shrimp.lineBetween(24, 28, 24, 36);
    shrimp.generateTexture("helper-shrimp", 48, 40);
    shrimp.destroy();
  }

  if (!scene.textures.exists("helper-shell")) {
    const shell = scene.add.graphics();
    shell.fillStyle(0xc7d3d9, 1);
    shell.fillEllipse(26, 22, 42, 26);
    shell.fillStyle(0x8fa0a8, 1);
    shell.fillEllipse(17, 18, 14, 10);
    shell.lineStyle(2, 0x5b6b73, 0.65);
    shell.lineBetween(26, 9, 26, 34);
    shell.lineBetween(15, 14, 36, 30);
    shell.lineBetween(36, 14, 15, 30);
    shell.fillStyle(0x31444d, 1);
    shell.fillCircle(40, 18, 2);
    shell.generateTexture("helper-shell", 52, 42);
    shell.destroy();
  }

  if (!scene.textures.exists("helper-crab")) {
    const crab = scene.add.graphics();
    crab.fillStyle(0xe2574c, 1);
    crab.fillEllipse(26, 22, 34, 24);
    crab.fillCircle(10, 14, 7);
    crab.fillCircle(42, 14, 7);
    crab.lineStyle(3, 0xffa08f, 0.9);
    crab.lineBetween(10, 31, 2, 38);
    crab.lineBetween(20, 34, 14, 42);
    crab.lineBetween(32, 34, 38, 42);
    crab.lineBetween(42, 31, 50, 38);
    crab.fillStyle(0x1d1f2a, 1);
    crab.fillCircle(21, 16, 2);
    crab.fillCircle(31, 16, 2);
    crab.generateTexture("helper-crab", 54, 46);
    crab.destroy();
  }

  if (!scene.textures.exists("helper-feeder-snail")) {
    const feederSnail = scene.add.graphics();
    feederSnail.fillStyle(0x6fd39b, 1);
    feederSnail.fillEllipse(27, 24, 38, 24);
    feederSnail.fillStyle(0xf2c46d, 1);
    feederSnail.fillCircle(21, 20, 12);
    feederSnail.lineStyle(3, 0x9c6a2e, 0.65);
    feederSnail.beginPath();
    feederSnail.arc(21, 20, 8, 0.2, 5.7);
    feederSnail.strokePath();
    feederSnail.fillStyle(0xb6f7cf, 1);
    feederSnail.fillEllipse(42, 21, 18, 14);
    feederSnail.lineStyle(2, 0xd8ffe7, 0.9);
    feederSnail.lineBetween(45, 14, 51, 5);
    feederSnail.lineBetween(48, 15, 56, 8);
    feederSnail.fillStyle(0x1d1f2a, 1);
    feederSnail.fillCircle(52, 5, 2);
    feederSnail.fillCircle(57, 8, 2);
    feederSnail.fillStyle(0xffd15c, 1);
    feederSnail.fillCircle(40, 34, 4);
    feederSnail.generateTexture("helper-feeder-snail", 62, 46);
    feederSnail.destroy();
  }
}
