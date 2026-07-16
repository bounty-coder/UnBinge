import { DEFAULT_DISTRACTION_FILTERS, DEFAULT_SETTINGS } from "./defaults";
import { STORAGE_KEYS } from "./constants";
import type {
  ExtensionSettings,
  LocalApprovedChannel,
  WhitelistChannel,
  WhitelistVideo
} from "./types";

export async function getSettings(): Promise<ExtensionSettings> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.settings);
  return mergeSettings(data[STORAGE_KEYS.settings]);
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.settings]: mergeSettings(settings)
  });
}

export async function patchSettings(
  patch: Partial<ExtensionSettings>
): Promise<ExtensionSettings> {
  const current = await getSettings();
  const next = mergeSettings({
    ...current,
    ...patch,
    distractionFilters: {
      ...current.distractionFilters,
      ...patch.distractionFilters
    }
  });

  await saveSettings(next);
  return next;
}

export async function ensureSettings(): Promise<ExtensionSettings> {
  const settings = await getSettings();
  await saveSettings(settings);
  return settings;
}

export function mergeSettings(value: Partial<ExtensionSettings> | undefined): ExtensionSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...(value ?? {}),
    allowedLanguages:
      Array.isArray(value?.allowedLanguages) && value.allowedLanguages.length > 0
        ? value.allowedLanguages
        : DEFAULT_SETTINGS.allowedLanguages,
    distractionFilters: {
      ...DEFAULT_DISTRACTION_FILTERS,
      ...(value?.distractionFilters ?? {})
    }
  };
}

export async function getGlobalWhitelistChannels(): Promise<WhitelistChannel[]> {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.globalWhitelistChannels,
    STORAGE_KEYS.legacyGlobalWhitelistChannels
  ]);
  const channels = Array.isArray(data[STORAGE_KEYS.globalWhitelistChannels])
    ? data[STORAGE_KEYS.globalWhitelistChannels]
    : data[STORAGE_KEYS.legacyGlobalWhitelistChannels];

  if (!Array.isArray(channels)) {
    return [];
  }

  if (!Array.isArray(data[STORAGE_KEYS.globalWhitelistChannels])) {
    await setGlobalWhitelistChannels(channels);
  }

  return channels;
}

export async function setGlobalWhitelistChannels(
  channels: WhitelistChannel[]
): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.globalWhitelistChannels]: channels
  });
  await chrome.storage.local.remove(STORAGE_KEYS.legacyGlobalWhitelistChannels);
}

export async function getGlobalWhitelistVideos(): Promise<WhitelistVideo[]> {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.globalWhitelistVideos,
    STORAGE_KEYS.legacyGlobalWhitelistVideos
  ]);
  const videos = Array.isArray(data[STORAGE_KEYS.globalWhitelistVideos])
    ? data[STORAGE_KEYS.globalWhitelistVideos]
    : data[STORAGE_KEYS.legacyGlobalWhitelistVideos];

  if (!Array.isArray(videos)) {
    return [];
  }

  if (!Array.isArray(data[STORAGE_KEYS.globalWhitelistVideos])) {
    await setGlobalWhitelistVideos(videos);
  }

  return videos;
}

export async function setGlobalWhitelistVideos(videos: WhitelistVideo[]): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEYS.globalWhitelistVideos]: videos
  });
  await chrome.storage.local.remove(STORAGE_KEYS.legacyGlobalWhitelistVideos);
}

export async function getLocalApprovedChannels(): Promise<Record<string, LocalApprovedChannel>> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.localApprovedChannels);
  return data[STORAGE_KEYS.localApprovedChannels] ?? {};
}

export async function upsertLocalApprovedChannel(
  channel: LocalApprovedChannel
): Promise<void> {
  const existing = await getLocalApprovedChannels();
  await chrome.storage.local.set({
    [STORAGE_KEYS.localApprovedChannels]: {
      ...existing,
      [channel.storageKey]: channel
    }
  });
}

export async function removeLocalApprovedChannel(storageKey: string): Promise<void> {
  const existing = await getLocalApprovedChannels();
  const next = { ...existing };
  delete next[storageKey];

  await chrome.storage.local.set({
    [STORAGE_KEYS.localApprovedChannels]: next
  });
}
