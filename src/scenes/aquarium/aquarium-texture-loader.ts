import Phaser from "phaser";
import type { FishType } from "../../types/mechanics";

type FishAnimationCreator = (fishType: FishType) => void;

export class AquariumTextureLoader {
  private pendingTextureLoads = new Set<string>();
  private pendingFishTextureLoads = new Set<string>();
  private fishTextureLoadCallbacks = new Map<string, Set<() => void>>();

  public constructor(
    private readonly scene: Phaser.Scene,
    private readonly createFishAnimation: FishAnimationCreator
  ) {}

  public ensureTextureLoaded(textureKey: string, assetPath: string | undefined, onLoad: () => void): boolean {
    if (this.scene.textures.exists(textureKey)) {
      return true;
    }

    if (!assetPath || this.pendingTextureLoads.has(textureKey)) {
      return false;
    }

    this.pendingTextureLoads.add(textureKey);
    const completeEvent = `filecomplete-image-${textureKey}`;
    const cleanupListeners = () => {
      this.scene.load.off(completeEvent, finish);
      this.scene.load.off(Phaser.Loader.Events.COMPLETE, finish);
      this.scene.load.off(Phaser.Loader.Events.FILE_LOAD_ERROR, fail);
    };
    const finish = () => {
      if (!this.pendingTextureLoads.has(textureKey)) {
        return;
      }
      cleanupListeners();
      this.pendingTextureLoads.delete(textureKey);
      if (this.scene.textures.exists(textureKey)) {
        onLoad();
      }
    };
    const fail = () => {
      cleanupListeners();
      this.pendingTextureLoads.delete(textureKey);
    };
    this.scene.load.once(completeEvent, finish);
    this.scene.load.once(Phaser.Loader.Events.COMPLETE, finish);
    this.scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, fail);
    this.scene.load.image(textureKey, assetPath);

    this.startLoaderIfIdle();

    return false;
  }

  public ensureFishTexturesLoaded(fishType: FishType, onLoad?: () => void): boolean {
    const staticKey = `fish-${fishType.id}`;
    const swimKey = `fish-${fishType.id}-swim`;
    const texturesReady = this.scene.textures.exists(staticKey) && this.scene.textures.exists(swimKey);
    if (texturesReady) {
      this.createFishAnimation(fishType);
      onLoad?.();
      return true;
    }

    if (onLoad) {
      const callbacks = this.fishTextureLoadCallbacks.get(fishType.id) ?? new Set<() => void>();
      callbacks.add(onLoad);
      this.fishTextureLoadCallbacks.set(fishType.id, callbacks);
    }

    if (this.pendingFishTextureLoads.has(fishType.id)) {
      return false;
    }

    this.pendingFishTextureLoads.add(fishType.id);
    if (!this.scene.textures.exists(staticKey)) {
      this.scene.load.image(staticKey, `/assets/fish/${fishType.id}.png`);
    }
    if (!this.scene.textures.exists(swimKey)) {
      this.scene.load.spritesheet(swimKey, `/assets/fish/${fishType.id}-swim.webp`, {
        frameWidth: 256,
        frameHeight: 160
      });
    }

    this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
      this.pendingFishTextureLoads.delete(fishType.id);
      this.createFishAnimation(fishType);
      const callbacks = this.fishTextureLoadCallbacks.get(fishType.id);
      this.fishTextureLoadCallbacks.delete(fishType.id);
      callbacks?.forEach((callback) => callback());
    });

    this.startLoaderIfIdle();

    return false;
  }

  private startLoaderIfIdle(): void {
    const loader = this.scene.load as unknown as { isLoading?: () => boolean };
    if (!loader.isLoading?.()) {
      this.scene.load.start();
    }
  }
}
