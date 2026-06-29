import { evaluateYouTubeAccess } from "./access-control";
import { updateAdBlocking } from "./dnr";
import { submitChannelRequest } from "./api";
import { syncGlobalWhitelist } from "./whitelist-cache";
import { resolveChannelByHandle } from "./youtube-api";
import { STORAGE_KEYS, YOUTUBE_URL_MATCHES } from "../shared/constants";
import {
  ensureSettings,
  getLocalApprovedChannels,
  getSettings,
  patchSettings,
  removeLocalApprovedChannel,
  upsertLocalApprovedChannel
} from "../shared/storage";
import { normalizeChannelInput } from "../shared/youtube-url";
import type {
  ChannelRequestPayload,
  ExtensionSettings,
  LocalApprovedChannel,
  YouTubeMetadata
} from "../shared/types";

type RuntimeMessage =
  | { type: "GET_SETTINGS" }
  | { type: "SAVE_SETTINGS"; settings: Partial<ExtensionSettings> }
  | { type: "SYNC_WHITELIST" }
  | { type: "CHECK_YOUTUBE_ACCESS"; url: string; metadata?: Partial<YouTubeMetadata> }
  | { type: "GET_LOCAL_APPROVED_CHANNELS" }
  | { type: "DELETE_LOCAL_APPROVED_CHANNEL"; storageKey: string }
  | { type: "APPROVE_CHANNEL_LOCALLY"; payload: ChannelRequestPayload }
  | { type: "SUBMIT_CHANNEL_REQUEST"; payload: ChannelRequestPayload };

const WEEKLY_SYNC_PERIOD_MINUTES = 7 * 24 * 60; // once a week

chrome.runtime.onInstalled.addListener(async details => {
  const settings = await ensureSettings();
  await updateAdBlocking(settings.adBlockEnabled);
  await ensureWeeklySyncAlarm();

  if (details.reason === "install") {
    chrome.runtime.setUninstallURL("https://unbinge.watch/uninstall");
    await chrome.runtime.openOptionsPage();
  }

  void syncGlobalWhitelist();
});

chrome.runtime.onStartup.addListener(async () => {
  const settings = await ensureSettings();
  await updateAdBlocking(settings.adBlockEnabled);
  await ensureWeeklySyncAlarm();
});

chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === "syncGlobalWhitelist") {
    void syncGlobalWhitelist();
  }
});

async function ensureWeeklySyncAlarm(): Promise<void> {
  // Only (re)create the alarm if it doesn't already exist, so the weekly
  // countdown is not reset every time the browser starts.
  const existing = await chrome.alarms.get("syncGlobalWhitelist");

  if (!existing) {
    chrome.alarms.create("syncGlobalWhitelist", {
      periodInMinutes: WEEKLY_SYNC_PERIOD_MINUTES
    });
  }
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local" || !changes[STORAGE_KEYS.settings]) {
    return;
  }

  const nextSettings = changes[STORAGE_KEYS.settings].newValue as ExtensionSettings;
  void updateAdBlocking(nextSettings.adBlockEnabled);
  void broadcastSettings(nextSettings);
});

chrome.webNavigation.onCommitted.addListener(
  details => {
    if (details.frameId !== 0) {
      return;
    }

    void guardNavigation(details.tabId, details.url);
  },
  {
    url: [{ hostSuffix: "youtube.com" }]
  }
);

chrome.runtime.onMessage.addListener((message: RuntimeMessage, _sender, sendResponse) => {
  handleMessage(message)
    .then(response => sendResponse({ ok: true, ...response }))
    .catch(error => {
      const messageText = error instanceof Error ? error.message : "Unexpected extension error.";
      sendResponse({ ok: false, error: messageText });
    });

  return true;
});

async function handleMessage(message: RuntimeMessage): Promise<Record<string, unknown>> {
  switch (message.type) {
    case "GET_SETTINGS": {
      const settings = await getSettings();
      await updateAdBlocking(settings.adBlockEnabled);
      return { settings };
    }

    case "SAVE_SETTINGS": {
      const settings = await patchSettings(message.settings);
      return { settings };
    }

    case "SYNC_WHITELIST": {
      const result = await syncGlobalWhitelist({ manual: true });
      return { result, settings: await getSettings() };
    }

    case "CHECK_YOUTUBE_ACCESS": {
      const settings = await getSettings();
      const decision = await evaluateYouTubeAccess(message.url, settings, message.metadata);

      return { decision };
    }

    case "GET_LOCAL_APPROVED_CHANNELS": {
      return { channels: await getLocalApprovedChannels() };
    }

    case "DELETE_LOCAL_APPROVED_CHANNEL": {
      await removeLocalApprovedChannel(message.storageKey);
      return { channels: await getLocalApprovedChannels() };
    }

    case "APPROVE_CHANNEL_LOCALLY": {
      const result = await approveChannelLocally(message.payload);
      return result;
    }

    case "SUBMIT_CHANNEL_REQUEST": {
      await submitChannelRequest(message.payload);
      return {};
    }

    default:
      throw new Error("Unsupported extension message.");
  }
}

async function guardNavigation(tabId: number, url: string): Promise<void> {
  const settings = await getSettings();
  const decision = await evaluateYouTubeAccess(url, settings);

  if (!decision.allowed && !decision.needsMetadata) {
    await redirectToBlockedPage(tabId, url, decision.reason, settings.ageCategory);
  }
}

async function approveChannelLocally(
  payload: ChannelRequestPayload
): Promise<{ reported: boolean; channel: LocalApprovedChannel; reportError?: string }> {
  const normalized = normalizeChannelInput(payload.submittedInput);
  const resolvedChannel =
    normalized.handle && !normalized.channelId
      ? await resolveChannelForLocalApproval(normalized.handle)
      : null;
  const channel: LocalApprovedChannel = {
    storageKey: normalized.storageKey,
    channelId: payload.channelId ?? normalized.channelId ?? resolvedChannel?.channelId,
    handle: payload.handle ?? normalized.handle ?? resolvedChannel?.channelHandle,
    title: payload.title ?? resolvedChannel?.channelTitle,
    originalInput: payload.submittedInput,
    approvedAt: Date.now(),
    source: "parent"
  };

  await upsertLocalApprovedChannel(channel);

  try {
    await submitChannelRequest({
      ...payload,
      normalizedUrl: normalized.normalizedUrl,
      channelId: channel.channelId,
      handle: channel.handle,
      title: channel.title,
      source: "local_parent_approval",
      localApproval: true
    });

    return { reported: true, channel };
  } catch (error) {
    const reportError = error instanceof Error ? error.message : "Failed to report channel.";
    return { reported: false, channel, reportError };
  }
}

async function resolveChannelForLocalApproval(handle: string): Promise<YouTubeMetadata | null> {
  try {
    return await resolveChannelByHandle(handle);
  } catch (error) {
    console.warn("Unbinge: unable to resolve locally approved handle.", error);
    return null;
  }
}

async function redirectToBlockedPage(
  tabId: number,
  originalUrl: string,
  reason: string,
  ageCategory: ExtensionSettings["ageCategory"]
): Promise<void> {
  const blockedUrl = chrome.runtime.getURL(
    `blocked.html?url=${encodeURIComponent(originalUrl)}&reason=${encodeURIComponent(reason)}&profile=${encodeURIComponent(ageCategory)}`
  );

  await chrome.tabs.update(tabId, { url: blockedUrl });
}

async function broadcastSettings(settings: ExtensionSettings): Promise<void> {
  const tabs = await chrome.tabs.query({
    url: [...YOUTUBE_URL_MATCHES]
  });

  await Promise.all(
    tabs.map(tab => {
      if (!tab.id) {
        return Promise.resolve();
      }

      return chrome.tabs
        .sendMessage(tab.id, { type: "SETTINGS_UPDATED", settings })
        .catch(() => undefined);
    })
  );
}
