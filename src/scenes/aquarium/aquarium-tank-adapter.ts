import type Phaser from "phaser";
import type { TankControllerHost } from "./aquarium-tank-controller";
import type { AquariumSceneCore } from "./AquariumSceneCore";
import type { Wallet, FishType, FoodTypeId, Price, DecorationType } from "../../types/mechanics";
import type { DecorationSize } from "../../game/tank-catalog";
import type { AppScreen, PendingHelperCreatureDrop, TankMenuTab } from "./aquarium-scene-config";
import type { Fish } from "../../objects/Fish";
import type { FoodPellet } from "../../objects/FoodPellet";
import type { HelperCreature } from "../../objects/HelperCreature";
import type { CoinDrop } from "../../objects/CoinDrop";
import type { SavedGame } from "../../game/save";
import type { MakeupDraft } from "../../game/makeup-mode";
import type { PlacedDecoration } from "../../game/tank-entities";
import type { TankCosmeticCategory, TankRuntimeState } from "../../game/tank-state";
import type { TankUtilityId } from "../../game/dispenser-system";

type TankAdapterScene = Phaser.Scene & {
  wallet: Wallet;
  foodInventory: Map<FoodTypeId, number>;
  fishInventory: Map<string, number>;
  fishInventoryAges: Map<string, number[]>;
  decorationInventory: Map<string, number>;
  creatureInventory: Map<string, number>;
  activeScreen: AppScreen;
  makeupDraft?: MakeupDraft;
  fish: Fish[];
  helperCreatures: HelperCreature[];
  placedDecorations: PlacedDecoration[];
  coinDrops: CoinDrop[];
  foods: FoodPellet[];
  pendingHelperCreatureDrops: PendingHelperCreatureDrop[];
  tankLayer: Phaser.GameObjects.Container;
  floatText: (message: string, x: number, y: number, color: string) => void;
  saveNow: () => void;
  refreshUi: (renderControls?: boolean) => void;
  applyTankViewScale: () => void;
  refreshFishTankVisibility: () => void;
  refreshHelperTankVisibility: () => void;
  refreshDecorationTankVisibility: () => void;
  updateDirtyTankOverlay: () => void;
  returnToTankScreen: () => void;
  renderTabControls: () => void;
  clearTankDrops: () => void;
  hasFoodDispenser: () => boolean;
  hasCoinMagnet: () => boolean;
  hasAutoFoodBuyer: () => boolean;
  hasTankLevel: (level: number) => boolean;
  fishInTank: (level: number) => Fish[];
  helpersInTank: (level: number) => HelperCreature[];
  decorationsInTank: (level: number) => PlacedDecoration[];
  activeFish: () => Fish[];
  activeFishSellValue: (fish: Fish) => number;
  storedFishSellValue: (fishType: FishType) => number;
  priceWealth: (price: Price) => number;
  isCalorieTrackedFood: (foodTypeId: FoodTypeId) => boolean;
  sanitizeDecorationSize: (size: string | undefined) => DecorationSize;
  decorationVariantPrice: (decorationType: DecorationType, size: DecorationSize) => Price;
  defaultTankCosmeticId: (level: number) => string;
  validTankCosmeticId: (category: TankCosmeticCategory, id: string | undefined, level: number) => string;
  recordDailyQuestAction: (action: string) => void;
};

export function createAquariumTankControllerHost(scene: AquariumSceneCore): TankControllerHost {
  const s = scene as unknown as TankAdapterScene;
  return {
    scene: s,
    wallet: s.wallet,
    foodInventory: s.foodInventory,
    fishInventory: s.fishInventory,
    fishInventoryAges: s.fishInventoryAges,
    decorationInventory: s.decorationInventory,
    creatureInventory: s.creatureInventory,
    activeScreen: s.activeScreen,
    makeupDraft: s.makeupDraft,
    fish: s.fish,
    helperCreatures: s.helperCreatures,
    placedDecorations: s.placedDecorations,
    coinDrops: s.coinDrops,
    foods: s.foods,
    pendingHelperCreatureDrops: s.pendingHelperCreatureDrops,
    tankLayer: s.tankLayer,
    floatText: (message, x, y, color) => s.floatText(message, x, y, color),
    saveNow: () => s.saveNow(),
    refreshUi: (renderControls) => s.refreshUi(renderControls),
    applyTankViewScale: () => s.applyTankViewScale(),
    refreshFishTankVisibility: () => s.refreshFishTankVisibility(),
    refreshHelperTankVisibility: () => s.refreshHelperTankVisibility(),
    refreshDecorationTankVisibility: () => s.refreshDecorationTankVisibility(),
    updateDirtyTankOverlay: () => s.updateDirtyTankOverlay(),
    returnToTankScreen: () => s.returnToTankScreen(),
    renderTabControls: () => s.renderTabControls(),
    clearTankDrops: () => s.clearTankDrops(),
    hasFoodDispenser: () => s.hasFoodDispenser(),
    hasCoinMagnet: () => s.hasCoinMagnet(),
    hasAutoFoodBuyer: () => s.hasAutoFoodBuyer(),
    hasTankLevel: (level) => s.hasTankLevel(level),
    fishInTank: (level) => s.fishInTank(level),
    helpersInTank: (level) => s.helpersInTank(level),
    decorationsInTank: (level) => s.decorationsInTank(level),
    activeFish: () => s.activeFish(),
    activeFishSellValue: (fish) => s.activeFishSellValue(fish),
    storedFishSellValue: (fishType) => s.storedFishSellValue(fishType),
    priceWealth: (price) => s.priceWealth(price),
    isCalorieTrackedFood: (foodTypeId) => s.isCalorieTrackedFood(foodTypeId),
    sanitizeDecorationSize: (size) => s.sanitizeDecorationSize(size),
    decorationVariantPrice: (decorationType, size) => s.decorationVariantPrice(decorationType, size),
    defaultTankCosmeticId: (level) => s.defaultTankCosmeticId(level),
    validTankCosmeticId: (category, id, level) => s.validTankCosmeticId(category, id, level),
    recordDailyQuestAction: (action) => s.recordDailyQuestAction(action)
  };
}
