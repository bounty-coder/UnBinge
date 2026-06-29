import { getYouTubeDataApiKey, STORAGE_KEYS } from "../shared/constants";
import type { YouTubeMetadata } from "../shared/types";
import { parseYouTubeUrl } from "../shared/youtube-url";

type ResolvedVideoCache = Record<
  string,
  YouTubeMetadata & {
    resolvedAt: number;
  }
>;

type YouTubeVideoListResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      channelId?: string;
      channelTitle?: string;
      title?: string;
    };
  }>;
};

type YouTubeChannelListResponse = {
  items?: Array<{
    id?: string;
    snippet?: {
      customUrl?: string;
      title?: string;
    };
  }>;
};

type YouTubeOembedResponse = {
  author_name?: string;
  author_url?: string;
};

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function resolveVideoChannel(videoId: string): Promise<YouTubeMetadata | null> {
  const cached = await getCachedVideo(videoId);

  if (cached) {
    return cached;
  }

  const [dataApiResult, oembedResult, htmlResult] = await Promise.allSettled([
    resolveViaYouTubeDataApi(videoId),
    resolveViaOembed(videoId),
    resolveViaWatchPage(videoId)
  ]);

  if (dataApiResult.status === "rejected") {
    console.warn("Unbinge: YouTube Data API video resolution failed.", dataApiResult.reason);
  }

  if (oembedResult.status === "rejected") {
    console.warn("Unbinge: YouTube oEmbed video resolution failed.", oembedResult.reason);
  }

  const dataMetadata = dataApiResult.status === "fulfilled" ? dataApiResult.value : null;
  const oembedMetadata = oembedResult.status === "fulfilled" ? oembedResult.value : null;
  const htmlMetadata = htmlResult.status === "fulfilled" ? htmlResult.value : null;
  const resolved = mergeMetadata(videoId, dataMetadata, oembedMetadata, htmlMetadata);

  if (!resolved.channelId && !resolved.channelHandle) {
    return null;
  }

  await cacheVideo(videoId, resolved);
  return resolved;
}

export async function resolveChannelByHandle(handle: string): Promise<YouTubeMetadata | null> {
  const normalizedHandle = handle.startsWith("@") ? handle : `@${handle}`;
  const apiKey = getYouTubeDataApiKey();

  if (apiKey) {
    try {
      const apiResult = await resolveChannelByHandleApi(normalizedHandle, apiKey);

      if (apiResult) {
        return apiResult;
      }
    } catch (error) {
      console.warn("Unbinge: YouTube Data API handle lookup failed; trying page metadata.", error);
    }
  }

  return resolveChannelByHandlePage(normalizedHandle);
}

async function resolveChannelByHandleApi(
  normalizedHandle: string,
  apiKey: string
): Promise<YouTubeMetadata | null> {
  const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
  channelUrl.searchParams.set("part", "snippet");
  channelUrl.searchParams.set("forHandle", normalizedHandle);
  channelUrl.searchParams.set("key", apiKey);

  const response = await fetchWithTimeout(channelUrl);

  if (!response.ok) {
    throw new Error(`YouTube Data API handle lookup failed: ${response.status}`);
  }

  const data = (await response.json()) as YouTubeChannelListResponse;
  const channel = data.items?.[0];

  if (!channel?.id) {
    return null;
  }

  return {
    url: `https://www.youtube.com/${normalizedHandle}`,
    channelId: channel.id,
    channelHandle: normalizeApiHandle(channel.snippet?.customUrl) ?? normalizedHandle,
    channelTitle: channel.snippet?.title
  };
}

async function resolveViaYouTubeDataApi(videoId: string): Promise<YouTubeMetadata | null> {
  const apiKey = getYouTubeDataApiKey();

  if (!apiKey) {
    return null;
  }

  const videoUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  videoUrl.searchParams.set("part", "snippet");
  videoUrl.searchParams.set("id", videoId);
  videoUrl.searchParams.set("key", apiKey);

  const videoResponse = await fetchWithTimeout(videoUrl);

  if (!videoResponse.ok) {
    throw new Error(`YouTube Data API videos lookup failed: ${videoResponse.status}`);
  }

  const videoData = (await videoResponse.json()) as YouTubeVideoListResponse;
  const snippet = videoData.items?.[0]?.snippet;

  if (!snippet?.channelId) {
    return null;
  }

  let channelHandle: string | undefined;

  try {
    channelHandle = await resolveChannelHandle(snippet.channelId, apiKey);
  } catch (error) {
    console.warn("Unbinge: unable to resolve channel handle from channel ID.", error);
  }

  return {
    url: `https://www.youtube.com/watch?v=${videoId}`,
    videoId,
    channelId: snippet.channelId,
    channelHandle,
    channelTitle: snippet.channelTitle
  };
}

async function resolveViaWatchPage(videoId: string): Promise<YouTubeMetadata | null> {
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const html = await fetchText(watchUrl);

  if (!html) {
    return null;
  }

  return {
    url: watchUrl,
    videoId,
    channelId: extractChannelId(html),
    channelHandle: extractChannelHandle(html),
    channelTitle: extractTitle(html)
  };
}

async function resolveChannelByHandlePage(handle: string): Promise<YouTubeMetadata | null> {
  const channelUrl = `https://www.youtube.com/${handle}`;
  const html = await fetchText(channelUrl);

  if (!html) {
    return null;
  }

  const channelId = extractChannelId(html);

  if (!channelId) {
    return null;
  }

  return {
    url: channelUrl,
    channelId,
    channelHandle: handle,
    channelTitle: extractTitle(html)
  };
}

async function resolveChannelHandle(
  channelId: string,
  apiKey: string
): Promise<string | undefined> {
  const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
  channelUrl.searchParams.set("part", "snippet");
  channelUrl.searchParams.set("id", channelId);
  channelUrl.searchParams.set("key", apiKey);

  const channelResponse = await fetchWithTimeout(channelUrl);

  if (!channelResponse.ok) {
    throw new Error(`YouTube Data API channels lookup failed: ${channelResponse.status}`);
  }

  const channelData = (await channelResponse.json()) as YouTubeChannelListResponse;
  return normalizeApiHandle(channelData.items?.[0]?.snippet?.customUrl);
}

async function resolveViaOembed(videoId: string): Promise<YouTubeMetadata | null> {
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const oembedUrl = new URL("https://www.youtube.com/oembed");
  oembedUrl.searchParams.set("format", "json");
  oembedUrl.searchParams.set("url", watchUrl);

  const response = await fetchWithTimeout(oembedUrl);

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as YouTubeOembedResponse;
  const parsedAuthorUrl = data.author_url ? parseYouTubeUrl(data.author_url) : null;
  const channelKey = parsedAuthorUrl?.pageType === "channel" ? parsedAuthorUrl.channelKey : undefined;

  return {
    url: watchUrl,
    videoId,
    channelId: channelKey?.startsWith("UC") ? channelKey : undefined,
    channelHandle: channelKey?.startsWith("@") ? channelKey : undefined,
    channelTitle: data.author_name
  };
}

function mergeMetadata(
  videoId: string,
  dataMetadata: YouTubeMetadata | null,
  oembedMetadata: YouTubeMetadata | null,
  htmlMetadata: YouTubeMetadata | null
): YouTubeMetadata {
  return {
    url: `https://www.youtube.com/watch?v=${videoId}`,
    videoId,
    channelId: dataMetadata?.channelId ?? oembedMetadata?.channelId ?? htmlMetadata?.channelId,
    channelHandle:
      dataMetadata?.channelHandle ?? oembedMetadata?.channelHandle ?? htmlMetadata?.channelHandle,
    channelTitle:
      dataMetadata?.channelTitle ?? oembedMetadata?.channelTitle ?? htmlMetadata?.channelTitle
  };
}

async function fetchText(url: string): Promise<string | null> {
  const response = await fetchWithTimeout(url, {
    credentials: "omit"
  });

  if (!response.ok) {
    return null;
  }

  return response.text();
}

async function fetchWithTimeout(
  input: string | URL,
  init: RequestInit = {},
  timeoutMs = 4500
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

function extractChannelId(html: string): string | undefined {
  return (
    html.match(/<meta[^>]+itemprop=["']channelId["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/"channelId"\s*:\s*"([^"]+)"/)?.[1] ??
    html.match(/\/channel\/(UC[a-zA-Z0-9_-]+)/)?.[1]
  );
}

function extractChannelHandle(html: string): string | undefined {
  const normalizedHtml = html.replace(/\\\//g, "/");
  const match =
    normalizedHtml.match(/youtube\.com\/(@[a-zA-Z0-9._-]+)/)?.[1] ??
    normalizedHtml.match(/"canonicalBaseUrl"\s*:\s*"\/(@[^"]+)"/)?.[1];

  return match ? normalizeApiHandle(match) : undefined;
}

function extractTitle(html: string): string | undefined {
  const match =
    html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ??
    html.match(/<title>([^<]+)<\/title>/i)?.[1];

  return match?.replace(/\s+-\s+YouTube$/i, "").trim();
}

async function getCachedVideo(videoId: string): Promise<YouTubeMetadata | null> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.resolvedVideoChannels);
  const cache = (data[STORAGE_KEYS.resolvedVideoChannels] ?? {}) as ResolvedVideoCache;
  const cached = cache[videoId];

  if (!cached || Date.now() - cached.resolvedAt > CACHE_TTL_MS) {
    return null;
  }

  return cached;
}

async function cacheVideo(videoId: string, metadata: YouTubeMetadata): Promise<void> {
  const data = await chrome.storage.local.get(STORAGE_KEYS.resolvedVideoChannels);
  const cache = (data[STORAGE_KEYS.resolvedVideoChannels] ?? {}) as ResolvedVideoCache;

  await chrome.storage.local.set({
    [STORAGE_KEYS.resolvedVideoChannels]: {
      ...cache,
      [videoId]: {
        ...metadata,
        resolvedAt: Date.now()
      }
    }
  });
}

function normalizeApiHandle(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();

  if (!normalized) {
    return undefined;
  }

  return normalized.startsWith("@") ? normalized : `@${normalized}`;
}
