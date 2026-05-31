import Phaser from "phaser";
import { basicFood } from "../../data/content";
import { formatNumber } from "../../game/economy";
import {
  rawTankDisplayLevelFromProduction
} from "../../game/level-progression";
import {
  capturedTankState,
  ensureTankState as ensureTankStateModel,
  tankNamesFromRecord as tankNamesFromRecordModel,
  tankNamesRecord as tankNamesRecordModel,
  tankStatesFromSave as tankStatesFromSaveModel,
  tankStatesRecord as tankStatesRecordModel,
  sortedTankLevels,
  tankStateSelection,
  type TankCosmeticCategory,
  type TankRuntimeState,
  type TankStateConfig
} from "../../game/tank-state";
import { tankAccentColor as tankAccentColorModel, tankSummary as tankSummaryModel } from "../../game/tank-inventory";
import { calculateTankNetWorth as calculateTankNetWorthModel } from "../../game/tank-wealth";
import {
  currentTankTheme as currentTankThemeModel,
  defaultTankCosmeticId as defaultTankCosmeticIdModel,
  tankCosmeticImageUrl as tankCatalogCosmeticImageUrl,
  tankCosmeticTint as tankCosmeticTintModel,
  tankCosmetics as tankCatalogCosmetics,
  tankThemeTint as tankThemeTintModel,
  type TankCosmetic
} from "../../game/tank-catalog";
import { tankUtilityInfo as tankUtilityInfoModel, type TankUtilityId } from "../../game/dispenser-system";
import { utilitySaleValue } from "../../game/store-transactions";
import { coinWealthValue } from "../../game/economy-values";
import { createEmptyWallet } from "../../game/save";
import { tankBounds, toastX, toastY } from "../../game/constants";
import {
  maxActiveFishPerTank,
  maxOwnedTanks,
  storeTankNames,
  storeTankStarterWallets,
  tankCosmeticBlueTintColor,
  tankUpgradePrices
} from "./aquarium-scene-config";
import {
  aquariumBackgroundAssetPath,
  aquariumBackgroundTextureKey,
  aquariumFloorTextureKey,
  type DecorationSize
} from "../../game/tank-catalog";
import type { CoinDrop } from "../../objects/CoinDrop";
import type { Fish } from "../../objects/Fish";
import type { FoodPellet } from "../../objects/FoodPellet";
import type { HelperCreature } from "../../objects/HelperCreature";
import type { DecorationType, FishType, FoodTypeId, Price, Wallet } from "../../types/mechanics";
import type { AppScreen, PendingHelperCreatureDrop, TankMenuTab } from "./aquarium-scene-config";
import type { SavedGame } from "../../game/save";
import type { MakeupDraft } from "../../game/makeup-mode";
import type { PlacedDecoration } from "../../game/tank-entities";

export type TankControllerHost = {
  scene: Phaser.Scene;
  wallet: Wallet;
  foodInventory: Map<FoodTypeId, number>;
  fishInventory: Map<string, number>;
  fishInventoryAges: Map<string, number[]>;
  decorationInventory: Map<string, number>;
  creatureInventory: Map<string, number>;
  getActiveScreen(): AppScreen;
  makeupDraft?: MakeupDraft;
  fish: Fish[];
  helperCreatures: HelperCreature[];
  placedDecorations: PlacedDecoration[];
  coinDrops: CoinDrop[];
  foods: FoodPellet[];
  pendingHelperCreatureDrops: PendingHelperCreatureDrop[];
  tankLayer: Phaser.GameObjects.Container;
  floatText(message: string, x: number, y: number, color: string): void;
  saveNow(): void;
  refreshUi(renderControls?: boolean): void;
  applyTankViewScale(): void;
  refreshFishTankVisibility(): void;
  refreshHelperTankVisibility(): void;
  refreshDecorationTankVisibility(): void;
  updateDirtyTankOverlay(): void;
  returnToTankScreen(): void;
  renderTabControls(): void;
  clearTankDrops(): void;
  hasFoodDispenser(): boolean;
  hasCoinMagnet(): boolean;
  hasAutoFoodBuyer(): boolean;
  hasTankLevel(level: number): boolean;
  fishInTank(level: number): Fish[];
  helpersInTank(level: number): HelperCreature[];
  decorationsInTank(level: number): PlacedDecoration[];
  activeFish(): Fish[];
  activeFishSellValue(fish: Fish): number;
  storedFishSellValue(fishType: FishType): number;
  priceWealth(price: Price): number;
  isCalorieTrackedFood(foodTypeId: FoodTypeId): boolean;
  sanitizeDecorationSize(size: string | undefined): DecorationSize;
  decorationVariantPrice(decorationType: DecorationType, size: DecorationSize): Price;
  defaultTankCosmeticId(level: number): string;
  validTankCosmeticId(category: TankCosmeticCategory, id: string | undefined, level: number): string;
  recordDailyQuestAction(action: string): void;
};

export class AquariumTankController {
  public tankLevel = 1;
  public ownedTankLevels = new Set<number>([1]);
  public tankNames = new Map<number, string>([[1, "Home Reef"]]);
  public tankStates = new Map<number, TankRuntimeState>();
  public cleanliness = 100;
  public cleanedAt = Date.now();
  public cleaningTank = false;
  public tankMenuTab: TankMenuTab = "background";
  public tankMenuDrillOpen = false;
  public tankMenuPage = 1;
  public foodDispenserY = tankBounds.bottom - 74;
  public coinMagnetY = tankBounds.bottom - 160;
  public autoFoodBuyerY = tankBounds.bottom - 246;

  constructor(private readonly host: TankControllerHost) {}

  public tankLevelHueDegrees(displayLevel: number): number {
    return ((Math.max(1, Math.floor(displayLevel)) - 1) * 37) % 360;
  }

  public tankViewScaleForLevel(_level = this.tankLevel): number {
    return 1;
  }

  public maxFishCapacityForLevel(level = this.tankLevel): number {
    return maxActiveFishPerTank + this.fishCapacityUpgradeBonusForLevel(level);
  }

  public fishCapacityUpgradeBonusForLevel(_level = this.tankLevel): number {
    return 0;
  }

  public tankStateConfig(): TankStateConfig {
    return {
      maxOwnedTanks,
      basicFoodId: basicFood.id,
      basicFoodCalories: basicFood.calories,
      defaultCosmeticId: (level) => this.defaultTankCosmeticId(level),
      validCosmeticId: (category, id, level) => this.validTankCosmeticId(category, id, level)
    };
  }

  public ensureTankState(level = this.tankLevel): TankRuntimeState {
    return ensureTankStateModel(this.tankStates, level, this.tankStateConfig());
  }

  public captureActiveTankState(): void {
    const state = this.ensureTankState(this.tankLevel);
    this.tankStates.set(this.tankLevel, capturedTankState({
      previousState: state,
      wallet: this.host.wallet,
      foodInventory: this.host.foodInventory,
      fishInventory: this.host.fishInventory,
      fishInventoryAges: this.host.fishInventoryAges,
      decorationInventory: this.host.decorationInventory,
      creatureInventory: this.host.creatureInventory,
      cleanliness: this.cleanliness,
      cleanedAt: this.cleanedAt,
      maxDisplayLevel: rawTankDisplayLevelFromProduction(state.fishProductionTotal ?? 0)
    }));
  }

  public applyTankState(level = this.tankLevel): void {
    const state = tankStateSelection(this.ensureTankState(level));
    this.host.wallet = state.wallet;
    this.host.foodInventory = state.foodInventory;
    this.host.fishInventory = state.fishInventory;
    this.host.fishInventoryAges = state.fishInventoryAges;
    this.host.decorationInventory = state.decorationInventory;
    this.host.creatureInventory = state.creatureInventory;
    this.cleanliness = state.cleanliness;
    this.cleanedAt = state.cleanedAt;
  }

  public sortedOwnedTankLevels(): number[] {
    return sortedTankLevels(this.ownedTankLevels);
  }

  public currentTankTheme(level = this.tankLevel) {
    return currentTankThemeModel(level);
  }

  public themedTankTextureKeys(level = this.tankLevel): { backgroundKey: string; floorKey: string } {
    const background = this.tankCosmeticById("background", this.renderTankCosmeticId("background", level));
    const seabed = this.tankCosmeticById("seabed", this.renderTankCosmeticId("seabed", level));
    return {
      backgroundKey: background?.textureKey ?? aquariumBackgroundTextureKey,
      floorKey: seabed?.textureKey ?? aquariumFloorTextureKey
    };
  }

  public renderTankCosmeticId(category: TankCosmeticCategory, level = this.tankLevel): string {
    if (this.host.getActiveScreen() === "makeup" && level === this.tankLevel && this.host.makeupDraft) {
      const cosmetics = this.tankCosmetics(category);
      const index = category === "background" ? this.host.makeupDraft.backgroundIndex : this.host.makeupDraft.seabedIndex;
      return cosmetics[index]?.id ?? this.selectedTankCosmeticId(category, level);
    }

    return this.selectedTankCosmeticId(category, level);
  }

  public tankThemeTint(level: number): number {
    return tankThemeTintModel(level);
  }

  public tankCosmeticBlueTintInventory(category: TankCosmeticCategory, level = this.tankLevel): Map<string, number> {
    const state = this.ensureTankState(level);
    return category === "background" ? state.backgroundBlueTints : state.seabedBlueTints;
  }

  public tankCosmeticBlueTintIntensity(category: TankCosmeticCategory, id: string, level = this.tankLevel): number {
    return Phaser.Math.Clamp(this.tankCosmeticBlueTintInventory(category, level).get(id) ?? 0, 0, 100);
  }

  public renderTankCosmeticBlueTintIntensity(category: TankCosmeticCategory, id: string, level = this.tankLevel): number {
    if (this.host.getActiveScreen() === "makeup" && level === this.tankLevel && this.host.makeupDraft) {
      const tintMap = category === "background" ? this.host.makeupDraft.backgroundTintById : this.host.makeupDraft.seabedTintById;
      return Phaser.Math.Clamp(tintMap.get(id) ?? 0, 0, 100);
    }

    return this.tankCosmeticBlueTintIntensity(category, id, level);
  }

  public tankCosmeticTint(category: TankCosmeticCategory, id: string, level = this.tankLevel): number {
    return tankCosmeticTintModel({
      category,
      level,
      blueTintColor: tankCosmeticBlueTintColor,
      blueTintIntensity: this.renderTankCosmeticBlueTintIntensity(category, id, level)
    });
  }

  public tankToScreenPoint(x: number, y: number): { x: number; y: number } {
    const scale = this.tankViewScaleForLevel();
    return {
      x: this.host.tankLayer.x + x * scale,
      y: this.host.tankLayer.y + y * scale
    };
  }

  public tankCosmeticImageUrl(asset: TankCosmetic): string | undefined {
    return tankCatalogCosmeticImageUrl(asset);
  }

  public tankCardBackgroundUrl(level: number): string | undefined {
    const asset = this.tankCosmeticById("background", this.selectedTankCosmeticId("background", level));
    return asset ? this.tankCosmeticImageUrl(asset) : aquariumBackgroundAssetPath;
  }

  public tankNamesFromRecord(source: Record<string, string> | undefined): Map<number, string> {
    return tankNamesFromRecordModel(source);
  }

  public tankNamesRecord(): Record<string, string> {
    return tankNamesRecordModel(this.tankNames);
  }

  public tankCosmetics(category: TankCosmeticCategory): TankCosmetic[] {
    return tankCatalogCosmetics(category);
  }

  public tankCosmeticById(category: TankCosmeticCategory, id: string | undefined): TankCosmetic | undefined {
    return this.tankCosmetics(category).find((asset) => asset.id === id);
  }

  public validTankCosmeticId(category: TankCosmeticCategory, id: string | undefined, level = this.tankLevel): string {
    const fallback = this.defaultTankCosmeticId(level);
    return this.tankCosmeticById(category, id) ? id as string : fallback;
  }

  public selectedTankCosmeticId(category: TankCosmeticCategory, level = this.tankLevel): string {
    const state = this.ensureTankState(level);
    return category === "background" ? state.selectedBackgroundId : state.selectedSeabedId;
  }

  public tankStatesFromSave(saved: SavedGame): Map<number, TankRuntimeState> {
    return tankStatesFromSaveModel(saved, this.tankStateConfig());
  }

  public tankStatesRecord(): SavedGame["tank"]["states"] {
    return tankStatesRecordModel(
      this.sortedOwnedTankLevels(),
      (level) => this.ensureTankState(level),
      (_level, state) => rawTankDisplayLevelFromProduction(state.fishProductionTotal ?? 0)
    );
  }

  public tankSummary(level: number): string {
    return tankSummaryModel({
      fish: this.host.fishInTank(level),
      helperCount: this.host.helpersInTank(level).length
    });
  }

  public tankAccentColor(level: number): number {
    return tankAccentColorModel(level);
  }

  public switchTank(level: number): void {
    if (!this.host.hasTankLevel(level)) {
      this.host.floatText(`Buy Tank ${formatNumber(level)} first`, toastX, toastY, "#ffb0a8");
      return;
    }

    this.captureActiveTankState();
    this.cleaningTank = false;
    this.tankLevel = Math.max(1, Math.floor(level));
    this.applyTankState(this.tankLevel);
    this.host.clearTankDrops();
    this.host.applyTankViewScale();
    this.host.refreshFishTankVisibility();
    this.host.refreshHelperTankVisibility();
    this.host.refreshDecorationTankVisibility();
    this.host.updateDirtyTankOverlay();
    if (this.host.getActiveScreen() !== "tank") {
      this.host.returnToTankScreen();
    } else {
      this.host.renderTabControls();
    }
    this.host.refreshUi(false);
    this.host.saveNow();
  }

  public tankDisplayLevel(level = this.tankLevel): number {
    const state = this.ensureTankState(level);
    const currentLevel = rawTankDisplayLevelFromProduction(state.fishProductionTotal ?? 0);
    state.maxDisplayLevel = Math.max(1, currentLevel);
    return state.maxDisplayLevel;
  }

  public tankPriceForLevel(targetLevel: number): FishType["price"] {
    if (targetLevel <= 1) {
      return { coinType: "common", amount: 0 };
    }

    const sanitizedTargetLevel = Math.max(2, Math.floor(targetLevel));
    const configuredPrice = tankUpgradePrices[sanitizedTargetLevel];
    if (configuredPrice) {
      return configuredPrice;
    }

    return {
      coinType: "common",
      amount: Math.ceil(350 * Math.pow(2.35, sanitizedTargetLevel - 2))
    };
  }

  public tankUtilitySellValue(price: Price): number {
    return utilitySaleValue(price);
  }

  public tankUtilityInfo(utilityId: TankUtilityId): { name: string; price: Price; inventoryKey: string; owned: () => boolean } | undefined {
    const utility = tankUtilityInfoModel(utilityId);
    if (!utility) {
      return undefined;
    }

    return {
      name: utility.name,
      price: utility.price,
      inventoryKey: utility.inventoryKey,
      owned: () => utility.id === "food-dispenser"
        ? this.host.hasFoodDispenser()
        : utility.id === "coin-magnet"
          ? this.host.hasCoinMagnet()
          : this.host.hasAutoFoodBuyer()
    };
  }

  public tankUtilityIconPath(utilityId: TankUtilityId): string {
    return tankUtilityInfoModel(utilityId)?.icon ?? "";
  }

  public calculateTankNetWorth(level = this.tankLevel): number {
    const state = level === this.tankLevel ? undefined : this.ensureTankState(level);
    return calculateTankNetWorthModel({
      level,
      activeTankLevel: this.tankLevel,
      wallet: this.host.wallet,
      foodInventory: this.host.foodInventory,
      fishInventory: this.host.fishInventory,
      decorationInventory: this.host.decorationInventory,
      creatureInventory: this.host.creatureInventory,
      state,
      ensureTankState: (tankLevel) => this.ensureTankState(tankLevel),
      fishInTank: this.host.fishInTank(level),
      helpersInTank: this.host.helpersInTank(level),
      decorationsInTank: this.host.decorationsInTank(level),
      coinDrops: this.host.coinDrops,
      coinWealthValue,
      activeFishSellValue: (fish) => this.host.activeFishSellValue(fish),
      storedFishSellValue: (fishType) => this.host.storedFishSellValue(fishType),
      priceWealth: (price) => this.host.priceWealth(price),
      isCalorieTrackedFood: (foodTypeId) => this.host.isCalorieTrackedFood(foodTypeId),
      sanitizeDecorationSize: (size) => this.host.sanitizeDecorationSize(size),
      decorationVariantPrice: (decorationType, size) => this.host.decorationVariantPrice(decorationType, size),
      tankCosmeticById: (category, id) => this.tankCosmeticById(category, id)
    });
  }

  public defaultTankCosmeticId(level: number): string {
    return defaultTankCosmeticIdModel(level);
  }
}

