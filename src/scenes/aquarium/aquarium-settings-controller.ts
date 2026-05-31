import Phaser from "phaser";
import { createWallet } from "../../game/economy";
import { formatNumber } from "../../game/economy";
import { fishTypes } from "../../data/content";
import type { CoinType, FishType, Price, Wallet } from "../../types/mechanics";
import type { TankRuntimeState } from "../../game/tank-state";
import type { PageButtonFactory } from "../../ui/PageOverlay";
import type { ModalAction } from "../../ui/modal";
import type { ModalContent } from "../../ui/SellConfirmationModals";
import { appendSettingsPageContent } from "../../ui/SettingsPage";
import {
  createOfflineSummaryContent,
  createResetConfirmationModalContent
} from "../../ui/SellConfirmationModals";
import { toastX, toastY } from "../../game/constants";
import { clearSave } from "../../game/save";
import {
  backgroundMusicKey,
  storeTankNames,
  maxOwnedTanks
} from "./aquarium-scene-config";

export type SettingsState = {
  sound: boolean;
  music: boolean;
  musicVolume: number;
  reducedMotion: boolean;
  notifications: boolean;
};

export type SettingsControllerHost = {
  scene: Phaser.Scene;
  getSettings: () => SettingsState;
  setSettings: (settings: SettingsState) => void;
  getBackgroundMusic: () => Phaser.Sound.BaseSound | undefined;
  setBackgroundMusic: (music: Phaser.Sound.BaseSound | undefined) => void;
  hasAudio: (key: string) => boolean;
  createBackgroundMusic: (key: string, config: Phaser.Types.Sound.SoundConfig) => Phaser.Sound.BaseSound;
  getDeveloperMenuUnlocked: () => boolean;
  setDeveloperMenuUnlocked: (value: boolean) => void;
  getDeveloperGodMode: () => boolean;
  setDeveloperGodMode: (value: boolean) => void;
  getDeveloperClockMultiplier: () => number;
  setDeveloperClockMultiplier: (value: number) => void;
  getDeveloperClockOffsetMs: () => number;
  setDeveloperClockOffsetMs: (value: number) => void;
  getTimeNow: () => number;
  floatText: (message: string, x: number, y: number, color: string) => void;
  refreshUi: (renderControls?: boolean) => void;
  syncHtmlPageOverlay: () => void;
  saveNow: () => void;
  // Store overlay
  refreshStoreOverlay: () => void;
  // wallet grant (cross-domain)
  getWallet: () => Wallet;
  captureActiveTankState: () => void;
  ensureTankState: (level: number) => TankRuntimeState;
  sortedOwnedTankLevels: () => number[];
  getTankLevel: () => number;
  setWallet: (wallet: Wallet) => void;
  setTankStateWallet: (level: number, wallet: Wallet) => void;
  // content unlock (cross-domain)
  getOwnedTankLevels: () => Set<number>;
  setTankName: (level: number, name: string) => void;
  getMaxDisplayLevel: (tankLevel: number) => number | undefined;
  setMaxDisplayLevel: (tankLevel: number, displayLevel: number) => void;
  // Modal
  showModal: (title: string, lines: string[], actions: ModalAction[], bodyElements?: HTMLElement[]) => void;
  showModalContent: (content: ModalContent) => void;
  closeModal: () => void;
  // Offline summary
  getOfflineProgress: () => { elapsedSeconds: number; earned: Wallet };
  getCleanliness: () => number;
  getCoinAssetPathByType: () => Record<CoinType, string>;
  priceIconRow: (price: Price, label: string) => HTMLElement;
  walletIconRow: (label: string, wallet: Wallet) => HTMLElement;
  pageButtonFactory: () => PageButtonFactory;
  // Clock
  adjustBackgroundMusicVolume: (volume: number) => void;
  playBackgroundMusic: () => void;
  stopBackgroundMusic: () => void;
};

export class AquariumSettingsController {
  constructor(private readonly host: SettingsControllerHost) {}

  public getSettings(): SettingsState {
    return this.host.getSettings();
  }

  public toggleSetting(key: keyof SettingsState): void {
    if (key === "musicVolume") {
      return;
    }
    const settings = { ...this.host.getSettings() };
    (settings[key] as boolean) = !(settings[key] as boolean);
    this.host.setSettings(settings);
    if (key === "music") {
      this.syncBackgroundMusic();
    }
    this.host.refreshUi();
    this.host.saveNow();
  }

  public setMusicVolume(value: number, persist: boolean): void {
    const settings = { ...this.host.getSettings() };
    settings.musicVolume = Phaser.Math.Clamp(Math.round(value), 0, 100);
    this.host.setSettings(settings);
    this.syncBackgroundMusic();
    if (persist) {
      this.host.refreshUi();
      this.host.saveNow();
    }
  }

  public playSfx(key: string, config: Phaser.Types.Sound.SoundConfig = {}): void {
    const settings = this.host.getSettings();
    if (!settings.sound || !this.host.hasAudio(key)) {
      return;
    }
    this.host.scene.sound.play(key, config);
  }

  public syncBackgroundMusic(): void {
    const settings = this.host.getSettings();
    if (!this.host.hasAudio(backgroundMusicKey)) {
      return;
    }
    const musicVolume = Phaser.Math.Clamp(settings.musicVolume, 0, 100) / 100;
    let music = this.host.getBackgroundMusic();
    if (!music) {
      music = this.host.createBackgroundMusic(backgroundMusicKey, {
        loop: true,
        volume: musicVolume
      });
      this.host.setBackgroundMusic(music);
    }
    this.host.adjustBackgroundMusicVolume(musicVolume);

    if (settings.music) {
      if (!music.isPlaying) {
        this.host.playBackgroundMusic();
      }
      return;
    }
    if (music.isPlaying) {
      this.host.stopBackgroundMusic();
    }
  }

  // Clock
  public gameClockSpeedMultiplier(): number {
    return Phaser.Math.Clamp(Math.round(this.host.getDeveloperClockMultiplier()), 1, 10);
  }

  public advanceGameClock(realDeltaSeconds: number): void {
    this.host.setDeveloperClockOffsetMs(
      this.host.getDeveloperClockOffsetMs() + Math.max(0, realDeltaSeconds) * (this.gameClockSpeedMultiplier() - 1) * 1000
    );
  }

  public gameClockNow(): number {
    return this.host.getTimeNow() + this.host.getDeveloperClockOffsetMs();
  }

  // Settings page
  public appendSettingsPage(content: HTMLElement): void {
    const settings = this.host.getSettings();
    appendSettingsPageContent(content, settings, {
      createButton: this.host.pageButtonFactory(),
      toggleSetting: (key: keyof SettingsState) => this.toggleSetting(key),
      setMusicVolume: (volume: number, commit: boolean) => this.setMusicVolume(volume, commit),
      showOfflineSummary: () => this.showOfflineSummary(),
      showResetConfirmation: () => this.showResetConfirmation(),
      developer: {
        unlocked: this.host.getDeveloperMenuUnlocked(),
        godModeEnabled: this.host.getDeveloperGodMode(),
        clockMultiplier: this.host.getDeveloperClockMultiplier(),
        onUnlock: () => this.unlockDeveloperGodMode(),
        onToggleGodMode: () => this.toggleDeveloperGodMode(),
        onGrantWallet: () => this.grantDeveloperWallet(),
        onUnlockContent: () => this.unlockDeveloperContent(),
        onSetClockMultiplier: (multiplier: number) => this.setDeveloperClockMultiplier(multiplier),
        onWrongPassword: () => this.host.floatText("Wrong password", toastX, toastY, "#ffb0a8")
      }
    });
  }

  public unlockDeveloperGodMode(): void {
    this.host.setDeveloperMenuUnlocked(true);
    this.host.floatText("Developer menu unlocked", toastX, toastY, "#a8ffb0");
    this.host.refreshUi(false);
    this.host.syncHtmlPageOverlay();
  }

  public toggleDeveloperGodMode(): void {
    const next = !this.host.getDeveloperGodMode();
    this.host.setDeveloperGodMode(next);
    this.host.floatText(next ? "Free shop enabled" : "Free shop disabled", toastX, toastY, next ? "#a8ffb0" : "#ffdd8a");
    this.host.refreshStoreOverlay();
    this.host.refreshUi(false);
    this.host.syncHtmlPageOverlay();
  }

  public grantDeveloperWallet(): void {
    const grantWallet = (wallet: Wallet): Wallet => createWallet(
      Math.max(wallet.common, 10_000),
      Math.max(wallet.rare, 10_000),
      Math.max(wallet.superRare, 10_000)
    );

    this.host.captureActiveTankState();
    const levels = this.host.sortedOwnedTankLevels();
    for (const level of levels) {
      const state = this.host.ensureTankState(level);
      state.wallet = grantWallet(state.wallet);
      this.host.setTankStateWallet(level, state.wallet);
    }
    const activeState = this.host.ensureTankState(this.host.getTankLevel());
    const newWallet = grantWallet(activeState.wallet);
    this.host.setWallet(newWallet);
    this.host.setTankStateWallet(this.host.getTankLevel(), newWallet);
    this.host.floatText("10K coins granted", toastX, toastY, "#a8ffb0");
    this.host.refreshStoreOverlay();
    this.host.refreshUi();
    this.host.syncHtmlPageOverlay();
    this.host.saveNow();
  }

  public unlockDeveloperContent(): void {
    const maxContentTankLevel = Math.max(1, ...fishTypes.map((fishType: FishType) => fishType.tankLevel));
    this.host.captureActiveTankState();
    for (let level = 1; level <= maxOwnedTanks; level += 1) {
      this.host.getOwnedTankLevels().add(level);
      this.host.setTankName(level, storeTankNames[level] ?? `Tank ${level}`);
      const state = this.host.ensureTankState(level);
      const currentMax = this.host.getMaxDisplayLevel(level) ?? 1;
      state.maxDisplayLevel = Math.max(currentMax, maxContentTankLevel);
      this.host.setMaxDisplayLevel(level, state.maxDisplayLevel);
    }
    const activeState = this.host.ensureTankState(this.host.getTankLevel());
    const currentActiveMax = this.host.getMaxDisplayLevel(this.host.getTankLevel()) ?? 1;
    activeState.maxDisplayLevel = Math.max(currentActiveMax, maxContentTankLevel);
    this.host.setMaxDisplayLevel(this.host.getTankLevel(), activeState.maxDisplayLevel);
    this.host.floatText("Tanks and levels unlocked", toastX, toastY, "#a8ffb0");
    this.host.refreshStoreOverlay();
    this.host.refreshUi();
    this.host.syncHtmlPageOverlay();
    this.host.saveNow();
  }

  public setDeveloperClockMultiplier(multiplier: number): void {
    this.host.setDeveloperClockMultiplier(Phaser.Math.Clamp(Math.round(multiplier), 1, 10));
    this.host.refreshUi(false);
    this.host.syncHtmlPageOverlay();
  }

  public showOfflineSummary(): void {
    const offlineProgress = this.host.getOfflineProgress();
    const minutesAway = Math.floor(offlineProgress.elapsedSeconds / 60);
    this.host.showModal(
      "Offline Summary",
      [],
      [{ label: "Continue", fill: 0x356a35, action: () => this.host.closeModal() }],
      createOfflineSummaryContent({
        minutesAway,
        earned: offlineProgress.earned,
        cleanliness: this.host.getCleanliness(),
        coinAssetPathByType: this.host.getCoinAssetPathByType(),
        createWalletRow: (label: string, wallet: Wallet) => this.host.walletIconRow(label, wallet)
      })
    );
  }

  public showResetConfirmation(): void {
    this.host.showModalContent(createResetConfirmationModalContent({
      onReset: () => {
        clearSave();
        window.location.reload();
      },
      onCancel: () => this.host.closeModal()
    }));
  }
}
