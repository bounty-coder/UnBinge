// import { fetchApprovedChannels, getFirestoreConfigurationError } from "./firebase";
import { fetchApprovedChannels, getFirestoreConfigurationError } from "./api";
import {
  getGlobalWhitelistChannels,
  getGlobalWhitelistVideos,
  getSettings,
  patchSettings,
  setGlobalWhitelistChannels,
  setGlobalWhitelistVideos
} from "../shared/storage";
import type { FirestoreSyncResult } from "../shared/types";

const MANUAL_SYNC_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours

export async function syncGlobalWhitelist(
  options: { manual?: boolean } = {}
): Promise<FirestoreSyncResult> {
  const settings = await getSettings();

  if (options.manual && settings.lastManualSyncAt) {
    const elapsed = Date.now() - settings.lastManualSyncAt;
    const remaining = MANUAL_SYNC_COOLDOWN_MS - elapsed;

    if (remaining > 0) {
      return {
        synced: false,
        channelCount: (await getGlobalWhitelistChannels()).length,
        videoCount: (await getGlobalWhitelistVideos()).length,
        error: `Manual sync is on cooldown. Try again in ${formatRemaining(remaining)}.`
      };
    }
  }

  const configurationError = getFirestoreConfigurationError();

  if (configurationError) {
    await patchSettings({ lastWhitelistSyncError: configurationError });

    return {
      synced: false,
      channelCount: 0,
      videoCount: 0,
      error: configurationError
    };
  }

  try {
    // v1: only channels are fetched from Firestore. whitelist_videos is disabled.
    const channels = await fetchApprovedChannels(settings.ageCategory, settings.allowedLanguages);
    const videos: never[] = [];
    // const [channels, videos] = await Promise.all([
    //   fetchApprovedChannels(settings.ageCategory, settings.allowedLanguages),
    //   fetchApprovedVideos(settings.ageCategory, settings.allowedLanguages)
    // ]);

    const now = Date.now();
    await Promise.all([
      setGlobalWhitelistChannels(channels),
      setGlobalWhitelistVideos(videos),
      patchSettings({
        lastWhitelistSyncAt: now,
        lastWhitelistSyncError: null,
        ...(options.manual ? { lastManualSyncAt: now } : {})
      })
    ]);

    return {
      synced: true,
      channelCount: channels.length,
      videoCount: videos.length
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Whitelist sync failed.";
    await patchSettings({ lastWhitelistSyncError: message });

    return {
      synced: false,
      channelCount: (await getGlobalWhitelistChannels()).length,
      videoCount: (await getGlobalWhitelistVideos()).length,
      error: message
    };
  }
}

function formatRemaining(ms: number): string {
  const totalMinutes = Math.ceil(ms / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${minutes}m`;
}
