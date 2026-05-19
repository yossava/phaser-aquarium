import { formatNumber } from "../game/economy";
import { htmlElement } from "./dom";
import type { PageButtonFactory } from "./PageOverlay";

export type SettingsPageState = {
  sound: boolean;
  music: boolean;
  musicVolume: number;
  reducedMotion: boolean;
  notifications: boolean;
};

export type DeveloperSettingsOptions = {
  unlocked: boolean;
  godModeEnabled: boolean;
  clockMultiplier: number;
  onUnlock: () => void;
  onToggleGodMode: () => void;
  onGrantWallet: () => void;
  onUnlockContent: () => void;
  onSetClockMultiplier: (multiplier: number) => void;
  onWrongPassword: () => void;
};

export type SettingsPageActions = {
  createButton: PageButtonFactory;
  toggleSetting: (key: keyof SettingsPageState) => void;
  setMusicVolume: (volume: number, commit: boolean) => void;
  showOfflineSummary: () => void;
  showResetConfirmation: () => void;
  developer: DeveloperSettingsOptions;
};

export function appendSettingsPageContent(content: HTMLElement, settings: SettingsPageState, actions: SettingsPageActions): void {
  content.classList.add("aq-page-content-scroll");
  const grid = htmlElement("div", "aq-page-card-grid");
  grid.append(
    createSettingsToggleCard("Sound", settings.sound, actions.createButton, () => actions.toggleSetting("sound")),
    createSettingsToggleCard("Motion", !settings.reducedMotion, actions.createButton, () => actions.toggleSetting("reducedMotion")),
    createSettingsToggleCard("Notify", settings.notifications, actions.createButton, () => actions.toggleSetting("notifications"))
  );
  grid.prepend(
    createSettingsMusicCard(
      settings,
      actions.createButton,
      actions.setMusicVolume,
      () => actions.toggleSetting("music")
    )
  );

  const actionRow = htmlElement("div", "aq-page-actions");
  actionRow.append(
    actions.createButton("Offline Summary", "aq-page-button aq-page-button-good", actions.showOfflineSummary),
    actions.createButton("Reset Save", "aq-page-button aq-page-button-danger", actions.showResetConfirmation)
  );
  content.append(
    grid,
    actionRow,
    createDeveloperSettingsCard(actions.developer, actions.createButton)
  );
}

export function createSettingsToggleCard(
  label: string,
  enabled: boolean,
  createButton: PageButtonFactory,
  onToggle: () => void
): HTMLElement {
  const card = htmlElement("article", "aq-page-card");
  card.append(
    htmlElement("h3", "aq-page-card-title", [label]),
    htmlElement("p", "aq-page-card-meta", [enabled ? "On" : "Off"]),
    createButton(enabled ? "Turn Off" : "Turn On", "aq-page-button", onToggle)
  );
  return card;
}

export function createSettingsMusicCard(
  settings: SettingsPageState,
  createButton: PageButtonFactory,
  setMusicVolume: (volume: number, commit: boolean) => void,
  toggleMusic: () => void
): HTMLElement {
  const card = htmlElement("article", "aq-page-card aq-settings-music-card");
  const volumeInput = document.createElement("input");
  volumeInput.className = "aq-settings-range";
  volumeInput.type = "range";
  volumeInput.min = "0";
  volumeInput.max = "100";
  volumeInput.step = "1";
  volumeInput.value = String(settings.musicVolume);
  volumeInput.addEventListener("input", () => setMusicVolume(Number(volumeInput.value), false));
  volumeInput.addEventListener("change", () => setMusicVolume(Number(volumeInput.value), true));
  card.append(
    htmlElement("h3", "aq-page-card-title", ["Music"]),
    htmlElement("p", "aq-page-card-meta", [`${settings.music ? "On" : "Off"} | Volume ${formatNumber(settings.musicVolume)}%`]),
    volumeInput,
    htmlElement("div", "aq-settings-volume-actions", [
      createButton("-", "aq-page-button aq-page-button-muted aq-settings-volume-button", () => setMusicVolume(settings.musicVolume - 5, true)),
      createButton(settings.music ? "Turn Off" : "Turn On", "aq-page-button aq-settings-volume-toggle", toggleMusic),
      createButton("+", "aq-page-button aq-page-button-muted aq-settings-volume-button", () => setMusicVolume(settings.musicVolume + 5, true))
    ])
  );
  return card;
}

export function createDeveloperSettingsCard(
  options: DeveloperSettingsOptions,
  createButton: PageButtonFactory
): HTMLElement {
  const card = htmlElement("article", "aq-page-card aq-dev-settings-card");
  card.append(
    htmlElement("h3", "aq-page-card-title", ["Developer"]),
    htmlElement("p", "aq-page-card-meta", [options.unlocked ? "Unlocked" : "Locked"])
  );

  if (!options.unlocked) {
    const row = htmlElement("div", "aq-dev-unlock-row");
    const input = document.createElement("input");
    input.type = "password";
    input.inputMode = "numeric";
    input.autocomplete = "off";
    input.placeholder = "Password";
    input.className = "aq-dev-password";
    const unlock = (): void => {
      if (input.value.trim() === "9000") {
        options.onUnlock();
        return;
      }
      input.value = "";
      options.onWrongPassword();
    };
    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        unlock();
      }
    });
    row.append(input, createButton("Unlock", "aq-page-button aq-page-button-muted", unlock));
    card.append(row);
    return card;
  }

  const clockInput = document.createElement("input");
  clockInput.className = "aq-settings-range";
  clockInput.type = "range";
  clockInput.min = "1";
  clockInput.max = "10";
  clockInput.step = "1";
  clockInput.value = String(Math.max(1, Math.min(10, Math.round(options.clockMultiplier))));
  clockInput.addEventListener("change", () => options.onSetClockMultiplier(Number(clockInput.value)));

  card.append(
    htmlElement("p", "aq-page-card-copy", ["Choose which developer tools are active. Unlocking this panel does not change coins, tanks, or shop rules."]),
    createButton(
      options.godModeEnabled ? "Disable Free Shop" : "Enable Free Shop",
      options.godModeEnabled ? "aq-page-button aq-page-button-danger" : "aq-page-button aq-page-button-good",
      options.onToggleGodMode
    ),
    createButton("Grant 10K Coins", "aq-page-button aq-page-button-muted", options.onGrantWallet),
    createButton("Unlock Tanks + Levels", "aq-page-button aq-page-button-muted", options.onUnlockContent),
    htmlElement("p", "aq-page-card-meta", [`Game Clock ${formatNumber(options.clockMultiplier)}x`]),
    clockInput
  );
  return card;
}
