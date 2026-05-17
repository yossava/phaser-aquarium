import Phaser from "phaser";
import { gameHeight, gameWidth, tankBounds } from "../../game/constants";
import { createWallet } from "../../game/economy";
import type { Fish } from "../../objects/Fish";
import type { CoinType, FishType, FoodTypeId, HelperCreatureType, Price, Wallet } from "../../types/mechanics";
import type { DecorationSize } from "../../game/tank-catalog";
import type { PrizeMachineBetAmount } from "../../game/prize-machine";

export type AppScreen = "tank" | "menu" | "games" | "store" | "album" | "goals" | "prize" | "makeup" | "settings";

export const fixedPrizeBetAmounts: readonly PrizeMachineBetAmount[] = [
  1,
  5,
  10,
  25,
  50,
  100,
  250,
  500,
  1000,
  2500,
  5000,
  10000,
  25000,
  50000,
  100000
];

export type PlacementMode =
  | { kind: "none" }
  | { kind: "fish"; fishTypeId: string }
  | { kind: "food"; foodTypeId: FoodTypeId }
  | { kind: "decoration"; decorationTypeId: string; size: DecorationSize };

export type TankMenuTab = "background" | "seabed" | "decor" | "utility";
export type InventoryTab = "fish" | "fusion" | "food" | "decor" | "coins" | "tank";
export type FishFusionPageResult = {
  label: string;
  fishTypeId: string;
  ageSeconds: number;
};

export type PendingHelperCreatureDrop = {
  type: HelperCreatureType;
  sprite: Phaser.GameObjects.Image;
  tankLevel: number;
  targetX: number;
};

export type CompatibilitySummary = {
  score: number;
  level: "good";
  warnings: string[];
  incompatibleNames: string[];
};

export type AdjustableSound = Phaser.Sound.BaseSound & {
  setVolume: (value: number) => unknown;
};

export const maxCoinDrops = 5;
export const maxFoodDrops = 5;
export const coinCollectSoundKey = "sfx-coin-collect";
export const coinCollectSoundPath = "/assets/audio/sfx/coin-pick.ogg";
export const fishEatSoundKey = "sfx-fish-eat";
export const fishEatSoundPath = "/assets/audio/sfx/fish-eat.ogg";
export const fishHungrySoundKey = "sfx-fish-hungry";
export const fishHungrySoundPath = "/assets/audio/sfx/fish-hungry.ogg";
export const prizeHighlightSoundKey = "sfx-prize-highlight";
export const prizeHighlightSoundPath = "/assets/audio/sfx/prize-highlight.ogg";
export const prizeRewardSoundKey = "sfx-prize-reward";
export const prizeRewardSoundPath = "/assets/audio/sfx/prize-reward.ogg";
export const backgroundMusicKey = "music-underwater-ambient";
export const backgroundMusicPath = "/assets/audio/bgm/underwater.mp3";
export const maxActiveFishPerTank = 4;
export const maxDecorations = 8;
export const maxHelperCreatures = 5;
export const maxFishCatalogLevel = 5;
export const maxOwnedTanks = 1;
export const decorationTrashZone = new Phaser.Geom.Rectangle(gameWidth / 2 - 48, gameHeight - 88, 96, 60);
export const maxFoodBuyQuantity = 99_999;
export const maxFishBuyQuantity = 99;
export const inventoryDockPageSize = 8;
export const tankMenuButtonY = 214;
export const foodDockTopBelowMenu = tankMenuButtonY - 36;
export const overfullHungerFloor = -10000;
export const automatedCoinCollectFeeRate = 0;
export const coinComboMaxCount = 50;
export const coinComboRewardPercentPerCount = 1;
export const coinComboMaxProductionMultiplier = 1 + (coinComboMaxCount * coinComboRewardPercentPerCount) / 100;
export const coinComboIdleTimeoutMs = 10_000;
export const coinComboRewardTextDurationMs = 3000;
export const hudStatusSyncIntervalSeconds = 0.25;
export const timeCurrentDurationSeconds = 10 * 60;
export const timeCurrentSpeedMultiplier = 2;
export const helperCreatureDropSpeed = 142;
export const helperCreatureSeabedY = tankBounds.bottom - 36;
export const tankCosmeticBlueTintColor = 0x0b4f8f;
export const helperCreatureDropDisplayWidths: Record<string, number> = {
  "helper-shrimp": 60,
  "helper-shell": 52,
  "helper-crab": 54,
  "helper-feeder-snail": 62,
  "helper-auto-cleaner": 56
};
export const storeTankNames: Record<number, string> = {
  1: "Normal Tank",
  2: "Fish Bowl",
  3: "Normal Tank",
  4: "Fish Bowl",
  5: "Royal Tank"
};
export const storeTankStarterWallets: Record<number, Wallet> = {
  1: createWallet(120, 0, 0),
  2: createWallet(180, 0, 0),
  3: createWallet(320, 16, 0),
  4: createWallet(520, 30, 6),
  5: createWallet(680, 14, 2)
};
export const tankUpgradePrices: Record<number, FishType["price"]> = {
  2: { coinType: "common", amount: 1200 },
  3: { coinType: "common", amount: 5200 },
  4: { coinType: "common", amount: 22000, rareAmount: 4 },
  5: { coinType: "common", amount: 140000, superRareAmount: 2 }
};
export const tankFallbackBaseColor = 0x0b7097;
export const coinMagnetDurationMs = 30 * 60 * 1000;
export const autoFoodBuyerDurationMs = 30 * 60 * 1000;
export const productionBoostDurationMs = 30 * 1000;
export const autoFoodBuyerPurchaseCooldownMs = 3500;
export const autoFoodBuyerPurchaseQuantity = 10;
export const coinMagnetAttractDurationMs = 260;
export const coinMagnetAttractScale = 0.44;
export const coinMagnetRayYOffset = -30;
export const coinAssetPathByType: Record<CoinType, string> = {
  common: "/assets/ui/icon-common-coin.png",
  rare: "/assets/ui/icon-rare-coin.png",
  superRare: "/assets/ui/icon-super-rare-coin.png"
};
export const fishMenuIconAssetPath = "/assets/ui/menu/menu_tank_hub_icon.png";
export const menuIconAssetPathByKey: Record<string, string> = {
  "ui-menu": "/assets/ui/menu/menu_inventory_book.png",
  "ui-shop": "/assets/ui/shop.png",
  "ui-game": "/assets/ui/menu/menu_game_shell.png",
  "ui-book": "/assets/ui/menu/menu_inventory_book.png",
  "ui-tanks": "/assets/ui/menu/menu_tanks_aquarium.png",
  "ui-goals": "/assets/ui/menu/menu_quest_trophy.png",
  "ui-settings": "/assets/ui/menu/menu_settings_gear.png"
};
export const hudIconAssetPathByKey: Record<string, string> = {
  "ui-icon-common-coin": "/assets/ui/icon-common-coin.png",
  "ui-icon-rare-coin": "/assets/ui/icon-rare-coin.png",
  "ui-icon-super-rare-coin": "/assets/ui/icon-super-rare-coin.png",
  "ui-icon-total-wealth": "/assets/ui/icon-total-wealth.png",
  "ui-icon-food-status": "/assets/ui/icon-food-status.png",
  "ui-icon-clean-status": "/assets/ui/icon-clean-status.png",
  "ui-icon-happy-status": "/assets/ui/icon-happy-status.png",
  "ui-icon-time-status": "/assets/ui/icon-time-status.png"
};
export const coinGlowTextureKey = "coin-glow";
export const coinGlowAssetPath = "/assets/ui/coin-glow.png";
export const hudTopAssetPathByKey: Record<string, string> = {
  "ui-hud-level-medallion": "/assets/ui/hud-level-medallion.png",
  "ui-hud-main-long-frame": "/assets/ui/hud-main-long-frame.png"
};
export const dirtyTankOverlayThreshold = 72;
export const algaeParticleThreshold = 50;
export const dirtyTankOverlayMaxAlpha = 0.38;
export const dirtyTankTintColor = 0x4f8f44;
export const cleanBubbleTintColor = 0xd7f4ff;
export const algaeParticleTintColor = 0x174f22;
export const tankMenuVersion = "single-menu-v3";

export type TankCatalogFilters = {
  activeTab: string;
  storeCoinFilter: CoinType;
  matchesStoreCoinFilter: (price: Price, rarity?: Fish["type"]["rarity"]) => boolean;
};
