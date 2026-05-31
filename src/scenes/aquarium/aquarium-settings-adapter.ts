import type Phaser from "phaser";
import type { SettingsState, SettingsControllerHost } from "./aquarium-settings-controller";
import type { AquariumSceneCore } from "./AquariumSceneCore";
import type { Wallet, Price } from "../../types/mechanics";
import type { TankRuntimeState } from "../../game/tank-state";
import type { CoinType } from "../../types/mechanics";
import type { PageButtonFactory } from "../../ui/PageOverlay";
import type { ModalAction } from "../../ui/modal";
import type { ModalContent } from "../../ui/SellConfirmationModals";

type SettingsAdapterScene = Phaser.Scene & {
  settings: SettingsState;
  backgroundMusic?: Phaser.Sound.BaseSound;
  developerMenuUnlocked: boolean;
  developerGodMode: boolean;
  developerClockMultiplier: number;
  developerClockOffsetMs: number;
  wallet: Wallet;
  tankLevel: number;
  ownedTankLevels: Set<number>;
  tankNames: Map<number, string>;
  tankStates: Map<number, TankRuntimeState>;
  cleanliness: number;
  offlineProgress: { elapsedSeconds: number; earned: Wallet };
  storeOverlay?: { refresh: () => void };
  coinAssetPathByType: Record<CoinType, string>;
  captureActiveTankState: () => void;
  ensureTankState: (level: number) => TankRuntimeState;
  sortedOwnedTankLevels: () => number[];
  refreshUi: (renderControls?: boolean) => void;
  syncHtmlPageOverlay: () => void;
  saveNow: () => void;
  floatText: (message: string, x: number, y: number, color: string) => void;
  showModal: (title: string, lines: string[], actions: ModalAction[], bodyElements?: HTMLElement[]) => void;
  showModalContent: (content: ModalContent) => void;
  closeModal: () => void;
  pageButtonFactory: () => PageButtonFactory;
  priceIconRow: (price: Price, label: string) => HTMLElement;
  walletIconRow: (label: string, wallet: Wallet) => HTMLElement;
};

export function createAquariumSettingsControllerHost(scene: AquariumSceneCore): SettingsControllerHost {
  const s = scene as unknown as SettingsAdapterScene;
  return {
    scene: s,
    getSettings: () => s.settings,
    setSettings: (settings) => {
      s.settings = settings;
    },
    getBackgroundMusic: () => s.backgroundMusic,
    setBackgroundMusic: (music) => {
      s.backgroundMusic = music;
    },
    hasAudio: (key) => s.cache.audio.exists(key),
    createBackgroundMusic: (key, config) => s.sound.add(key, config),
    getDeveloperMenuUnlocked: () => s.developerMenuUnlocked,
    setDeveloperMenuUnlocked: (value) => {
      s.developerMenuUnlocked = value;
    },
    getDeveloperGodMode: () => s.developerGodMode,
    setDeveloperGodMode: (value) => {
      s.developerGodMode = value;
    },
    getDeveloperClockMultiplier: () => s.developerClockMultiplier,
    setDeveloperClockMultiplier: (value) => {
      s.developerClockMultiplier = value;
    },
    getDeveloperClockOffsetMs: () => s.developerClockOffsetMs,
    setDeveloperClockOffsetMs: (value) => {
      s.developerClockOffsetMs = value;
    },
    getTimeNow: () => s.time.now,
    floatText: (message, x, y, color) => s.floatText(message, x, y, color),
    refreshUi: (renderControls) => s.refreshUi(renderControls),
    syncHtmlPageOverlay: () => s.syncHtmlPageOverlay(),
    saveNow: () => s.saveNow(),
    refreshStoreOverlay: () => s.storeOverlay?.refresh(),
    // wallet grant
    getWallet: () => s.wallet,
    captureActiveTankState: () => s.captureActiveTankState(),
    ensureTankState: (level) => s.ensureTankState(level),
    sortedOwnedTankLevels: () => s.sortedOwnedTankLevels(),
    getTankLevel: () => s.tankLevel,
    setWallet: (wallet) => {
      s.wallet = wallet;
    },
    setTankStateWallet: (level, wallet) => {
      const state = s.tankStates.get(level);
      if (state) {
        state.wallet = wallet;
      }
    },
    // content unlock
    getOwnedTankLevels: () => s.ownedTankLevels,
    setTankName: (level, name) => {
      s.tankNames.set(level, name);
    },
    getMaxDisplayLevel: (tankLevel) => {
      const state = s.tankStates.get(tankLevel);
      return state?.maxDisplayLevel;
    },
    setMaxDisplayLevel: (tankLevel, displayLevel) => {
      const state = s.tankStates.get(tankLevel);
      if (state) {
        state.maxDisplayLevel = displayLevel;
      }
    },
    // modal
    showModal: (title, lines, actions, bodyElements) => s.showModal(title, lines, actions, bodyElements),
    showModalContent: (content) => s.showModalContent(content),
    closeModal: () => s.closeModal(),
    // offline summary
    getOfflineProgress: () => s.offlineProgress,
    getCleanliness: () => s.cleanliness,
    getCoinAssetPathByType: () => s.coinAssetPathByType,
    priceIconRow: (price, label) => s.priceIconRow(price, label),
    walletIconRow: (label, wallet) => s.walletIconRow(label, wallet),
    pageButtonFactory: () => s.pageButtonFactory(),
    // clock / music
    adjustBackgroundMusicVolume: (volume) => {
      if (s.backgroundMusic) {
        (s.backgroundMusic as Phaser.Sound.BaseSound & { setVolume: (v: number) => void }).setVolume(volume);
      }
    },
    playBackgroundMusic: () => {
      if (s.backgroundMusic && !s.backgroundMusic.isPlaying) {
        s.backgroundMusic.play();
      }
    },
    stopBackgroundMusic: () => {
      if (s.backgroundMusic?.isPlaying) {
        s.backgroundMusic.stop();
      }
    }
  };
}
