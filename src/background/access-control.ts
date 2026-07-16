import { resolveChannelByHandle, resolveVideoChannel } from "./youtube-api";
import {
  getGlobalWhitelistChannels,
  // getGlobalWhitelistVideos, // v1: whitelist_videos disabled
  getLocalApprovedChannels,
  upsertLocalApprovedChannel
} from "../shared/storage";
import { normalizeChannelKey, parseYouTubeUrl } from "../shared/youtube-url";
import type {
  AccessDecision,
  ExtensionSettings,
  LocalApprovedChannel,
  WhitelistChannel,
  // WhitelistVideo, // v1: whitelist_videos disabled
  YouTubeMetadata
} from "../shared/types";

export async function evaluateYouTubeAccess(
  rawUrl: string,
  settings: ExtensionSettings,
  metadata?: Partial<YouTubeMetadata>
): Promise<AccessDecision> {
  const parsed = parseYouTubeUrl(rawUrl);

  if (!parsed.isYouTube) {
    return { allowed: true, source: "education_off" };
  }

  if (!settings.educationModeEnabled) {
    return { allowed: true, source: "education_off" };
  }

  if (parsed.pageType === "subscriptions" || parsed.pageType === "embed") {
    return { allowed: true, source: "education_off" };
  }

  if (parsed.pageType === "home" || parsed.pageType === "search" || parsed.pageType === "other") {
    return { allowed: true, source: "education_off" };
  }

  if (parsed.pageType === "shorts") {
    return {
      allowed: false,
      reason: "Shorts are disabled in Education Mode."
    };
  }

  // v1: whitelist_videos disabled — only channel-level approval is checked.
  const [globalChannels, localChannels] = await Promise.all([
    getGlobalWhitelistChannels(),
    getLocalApprovedChannels()
  ]);

  const videoId = metadata?.videoId ?? parsed.videoId;

  // const globalVideos = await getGlobalWhitelistVideos();
  // if (videoId && isVideoAllowed(videoId, globalVideos)) {
  //   return { allowed: true, source: "video", badge: "global_verified" };
  // }

  const channelKeys = [
    metadata?.channelId,
    metadata?.channelHandle,
    parsed.channelKey
  ].filter((value): value is string => Boolean(value));

  const localMatch = findLocalChannel(channelKeys, localChannels);

  if (localMatch) {
    return { allowed: true, source: "local", badge: "local_parent" };
  }

  const knownChannelId = channelKeys.find(key => key.startsWith("UC"));
  const resolvedLocalApproval = knownChannelId
    ? await findLocalChannelByResolvingHandles(knownChannelId, localChannels)
    : undefined;

  if (resolvedLocalApproval) {
    return { allowed: true, source: "local", badge: "local_parent" };
  }

  const globalMatch = findGlobalChannel(channelKeys, globalChannels, settings);

  if (globalMatch) {
    return { allowed: true, source: "global", badge: "global_verified" };
  }

  if (videoId) {
    const resolvedMetadata = await resolveVideoChannel(videoId);

    if (resolvedMetadata) {
      const resolvedChannelKeys = [
        resolvedMetadata.channelId,
        resolvedMetadata.channelHandle
      ].filter((value): value is string => Boolean(value));

      const resolvedLocalMatch = findLocalChannel(resolvedChannelKeys, localChannels);

      if (resolvedLocalMatch) {
        return { allowed: true, source: "local", badge: "local_parent" };
      }

      const resolvedLocalApprovalFromHandle = resolvedMetadata.channelId
        ? await findLocalChannelByResolvingHandles(resolvedMetadata.channelId, localChannels)
        : undefined;

      if (resolvedLocalApprovalFromHandle) {
        return { allowed: true, source: "local", badge: "local_parent" };
      }

      const resolvedGlobalMatch = findGlobalChannel(resolvedChannelKeys, globalChannels, settings);

      if (resolvedGlobalMatch) {
        return { allowed: true, source: "global", badge: "global_verified" };
      }
    }
  }

  if (parsed.pageType === "watch" && channelKeys.length === 0) {
    return {
      allowed: false,
      needsMetadata: true,
      reason: "Checking whether this video belongs to an approved educational channel."
    };
  }

  return {
    allowed: false,
    reason: "This YouTube page is not on the approved education whitelist."
  };
}

async function findLocalChannelByResolvingHandles(
  channelId: string,
  channels: Record<string, LocalApprovedChannel>
): Promise<LocalApprovedChannel | undefined> {
  for (const channel of Object.values(channels)) {
    if (!channel.handle || channel.channelId) {
      continue;
    }

    try {
      const resolved = await resolveChannelByHandle(channel.handle);

      if (!resolved?.channelId) {
        continue;
      }

      const updatedChannel: LocalApprovedChannel = {
        ...channel,
        channelId: resolved.channelId,
        handle: resolved.channelHandle ?? channel.handle,
        title: channel.title ?? resolved.channelTitle
      };

      await upsertLocalApprovedChannel(updatedChannel);

      if (resolved.channelId === channelId) {
        return updatedChannel;
      }
    } catch (error) {
      console.warn("Unbinge: unable to resolve local approved channel handle.", error);
    }
  }

  return undefined;
}

function findGlobalChannel(
  channelKeys: string[],
  channels: WhitelistChannel[],
  settings: ExtensionSettings
): WhitelistChannel | undefined {
  const normalizedKeys = new Set(channelKeys.map(normalizeChannelKey).filter(Boolean));

  return channels.find(channel => {
    const candidateKeys = [
      channel.channelId,
      channel.handle
    ].map(normalizeChannelKey).filter(Boolean);

    const hasKeyMatch = candidateKeys.some(key => normalizedKeys.has(key));

    if (hasKeyMatch) {
      const statusMatch = channel.status === "approved";
      const ageMatch = channel.ageCategories.includes(settings.ageCategory);

      if (!statusMatch || !ageMatch) {
        console.warn("Unbinge: Channel matched by key, but failed criteria.", {
          channel,
          settingsAge: settings.ageCategory,
          statusMatch,
          ageMatch
        });
      }
    }

    return (
      channel.status === "approved" &&
      channel.ageCategories.includes(settings.ageCategory) &&
      hasKeyMatch
    );
  });
}

function findLocalChannel(
  channelKeys: string[],
  channels: Record<string, LocalApprovedChannel>
): LocalApprovedChannel | undefined {
  const normalizedKeys = channelKeys.map(normalizeChannelKey);
  const entries = Object.values(channels);

  return entries.find(channel => {
    const candidateKeys = [
      channel.storageKey,
      channel.channelId,
      channel.handle
    ].map(normalizeChannelKey);

    return candidateKeys.some(key => normalizedKeys.includes(key));
  });
}

// v1: whitelist_videos disabled — re-enable with the access-control video lookup.
// function isVideoAllowed(videoId: string, videos: WhitelistVideo[]): boolean {
//   return videos.some(video => video.status === "approved" && video.videoId === videoId);
// }

function matchesLanguage(channelLanguages: string[], allowedLanguages: string[]): boolean {
  if (allowedLanguages.length === 0 || channelLanguages.length === 0) {
    return true;
  }

  const allowed = allowedLanguages.map(l => l.toLowerCase().trim());
  return channelLanguages.some(lang => {
    if (!lang) return true;
    const l = lang.toLowerCase().trim();
    // Allow matches like "english" for "en" and vice versa
    return allowed.some(a => l.startsWith(a) || a.startsWith(l));
  });
}


