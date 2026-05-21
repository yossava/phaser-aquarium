import Phaser from "phaser";
import { decorationTypes, foodAssetPath, foodTypes, helperCreatureTypes } from "../../data/content";
import {
  aquariumBackgroundAssetPath,
  aquariumBackgroundTextureKey,
  aquariumFloorAssetPath,
  aquariumFloorTextureKey,
  tankThumbnailBaseAssetPath,
  tankThumbnailBaseTextureKey
} from "../../game/tank-catalog";
import { coinTextureKeyByType } from "../../objects/CoinDrop";
import { questPresentAssetPath, questPresentTextureKey } from "../../objects/QuestPresentDrop";
import type { CoinType, FoodTypeId } from "../../types/mechanics";
import { prizeWheelIconAssetPaths, prizeWheelIconTextureKeys } from "../../game/prize-machine-wheel";
import {
  backgroundMusicKey,
  backgroundMusicPath,
  coinAssetPathByType,
  coinCollectSoundKey,
  coinCollectSoundPath,
  coinGlowAssetPath,
  coinGlowTextureKey,
  fishEatSoundKey,
  fishEatSoundPath,
  fishHungrySoundKey,
  fishHungrySoundPath,
  hudIconAssetPathByKey,
  hudTopAssetPathByKey,
  menuIconAssetPathByKey,
  prizeHighlightSoundKey,
  prizeHighlightSoundPath,
  prizeRewardSoundKey,
  prizeRewardSoundPath
} from "./aquarium-scene-config";

type ImageAsset = {
  textureKey: string;
  assetPath: string;
};

type AudioAsset = {
  audioKey: string;
  assetPath: string;
};

const aquariumAudioAssets: readonly AudioAsset[] = [
  { audioKey: coinCollectSoundKey, assetPath: coinCollectSoundPath },
  { audioKey: fishEatSoundKey, assetPath: fishEatSoundPath },
  { audioKey: fishHungrySoundKey, assetPath: fishHungrySoundPath },
  { audioKey: prizeHighlightSoundKey, assetPath: prizeHighlightSoundPath },
  { audioKey: prizeRewardSoundKey, assetPath: prizeRewardSoundPath },
  { audioKey: backgroundMusicKey, assetPath: backgroundMusicPath }
];

const tankImageAssets: readonly ImageAsset[] = [
  { textureKey: aquariumFloorTextureKey, assetPath: aquariumFloorAssetPath },
  { textureKey: aquariumBackgroundTextureKey, assetPath: aquariumBackgroundAssetPath },
  { textureKey: tankThumbnailBaseTextureKey, assetPath: tankThumbnailBaseAssetPath },
  { textureKey: coinGlowTextureKey, assetPath: coinGlowAssetPath }
];

const imageAssetsFromRecord = (assetPathByKey: Record<string, string>): ImageAsset[] =>
  Object.entries(assetPathByKey).map(([textureKey, assetPath]) => ({ textureKey, assetPath }));

function aquariumStaticImageAssets(foodTextureKey: (foodTypeId: FoodTypeId) => string): ImageAsset[] {
  return [
    ...foodTypes.map((foodType) => ({
      textureKey: foodTextureKey(foodType.id),
      assetPath: foodAssetPath(foodType.id)
    })),
    ...decorationTypes.map((decorationType) => ({
      textureKey: decorationType.texture,
      assetPath: `/assets/decorations/${decorationType.id}.png`
    })),
    ...helperCreatureTypes.map((creatureType) => ({
      textureKey: creatureType.texture,
      assetPath: `/assets/helpers/${creatureType.id}.png`
    })),
    ...(Object.keys(coinAssetPathByType) as CoinType[]).map((coinType) => ({
      textureKey: coinTextureKeyByType[coinType],
      assetPath: coinAssetPathByType[coinType]
    })),
    { textureKey: questPresentTextureKey, assetPath: questPresentAssetPath },
    ...imageAssetsFromRecord(menuIconAssetPathByKey),
    ...imageAssetsFromRecord(hudIconAssetPathByKey),
    ...tankImageAssets,
    ...imageAssetsFromRecord(hudTopAssetPathByKey),
    ...Object.entries(prizeWheelIconTextureKeys).map(([iconName, textureKey]) => ({
      textureKey,
      assetPath: prizeWheelIconAssetPaths[iconName as keyof typeof prizeWheelIconAssetPaths]
    }))
  ];
}

export function preloadAquariumSceneAssets(scene: Phaser.Scene, foodTextureKey: (foodTypeId: FoodTypeId) => string): void {
  aquariumStaticImageAssets(foodTextureKey).forEach(({ textureKey, assetPath }) => {
    scene.load.image(textureKey, assetPath);
  });
  aquariumAudioAssets.forEach(({ audioKey, assetPath }) => {
    scene.load.audio(audioKey, assetPath);
  });
}
