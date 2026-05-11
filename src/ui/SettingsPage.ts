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
  developerGodMode: boolean;
  onUnlock: () => void;
  onGrant: () => void;
  onWrongPassword: () => void;
};

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
    htmlElement("p", "aq-page-card-meta", [options.developerGodMode ? "God mode unlocked" : "Locked"])
  );

  if (!options.developerGodMode) {
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

  card.append(
    htmlElement("p", "aq-page-card-copy", ["10K of each coin, max tank level, no shop price, level, or hourly purchase gates."]),
    createButton("Grant God Mode", "aq-page-button aq-page-button-good", options.onGrant)
  );
  return card;
}
