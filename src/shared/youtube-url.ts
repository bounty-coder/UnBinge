import type { ParsedYouTubeUrl } from "./types";

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

export function parseYouTubeUrl(rawUrl: string): ParsedYouTubeUrl {  //parsing fuction for youtube url
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return { isYouTube: false, pageType: "other" };
  }

  if (!YOUTUBE_HOSTS.has(url.hostname)) {
    return { isYouTube: false, pageType: "other", url };
  }

  const pathname = normalizePathname(url.pathname);

  if (pathname === "/") {
    return { isYouTube: true, pageType: "home", url };
  }

  if (pathname === "/watch") {
    return {
      isYouTube: true,
      pageType: "watch",
      url,
      videoId: url.searchParams.get("v") ?? undefined
    };
  }

  if (pathname.startsWith("/shorts/")) {
    return {
      isYouTube: true,
      pageType: "shorts",
      url,
      videoId: pathname.split("/")[2]
    };
  }

  if (pathname.startsWith("/embed/")) {
    return {
      isYouTube: true,
      pageType: "embed",
      url,
      videoId: pathname.split("/")[2]
    };
  }

  if (pathname === "/feed/subscriptions") {
    return { isYouTube: true, pageType: "subscriptions", url };
  }

  if (pathname === "/results") {
    return { isYouTube: true, pageType: "search", url };
  }

  if (pathname.startsWith("/channel/")) {
    return {
      isYouTube: true,
      pageType: "channel",
      url,
      channelKey: pathname.split("/")[2]
    };
  }

  if (pathname.startsWith("/@")) {
    return {
      isYouTube: true,
      pageType: "channel",
      url,
      channelKey: pathname.split("/")[1]
    };
  }

  if (pathname.startsWith("/c/") || pathname.startsWith("/user/")) {
    return {
      isYouTube: true,
      pageType: "channel",
      url,
      channelKey: pathname.split("/")[2]
    };
  }

  return { isYouTube: true, pageType: "other", url };
}

export function normalizeChannelInput(input: string): {
  storageKey: string;
  normalizedUrl: string;
  channelId?: string;
  handle?: string;
} {
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Enter a YouTube channel link or handle.");
  }

  const withProtocol = trimmed.startsWith("http")
    ? trimmed
    : trimmed.startsWith("@")
      ? `https://www.youtube.com/${trimmed}`
      : `https://www.youtube.com/${trimmed.replace(/^\/+/, "")}`;

  const parsed = parseYouTubeUrl(withProtocol);

  if (!parsed.isYouTube || parsed.pageType !== "channel" || !parsed.channelKey) {
    throw new Error("Enter a valid YouTube channel URL, handle, /channel/ ID, /c/ URL, or /user/ URL.");
  }

  const normalizedKey = normalizeChannelKey(parsed.channelKey);

  return {
    storageKey: normalizedKey,
    normalizedUrl: `https://www.youtube.com/${parsed.channelKey}`,
    channelId: parsed.channelKey.startsWith("UC") ? parsed.channelKey : undefined,
    handle: parsed.channelKey.startsWith("@") ? normalizeHandle(parsed.channelKey) : undefined
  };
}

export function normalizeChannelKey(value: string | undefined): string {
  if (!value) {
    return "";
  }

  const raw = value.trim();

  if (!raw) {
    return "";
  }

  if (raw.startsWith("UC")) {
    return raw;
  }

  return raw
    .replace(/^https:\/\/(www\.|m\.)?youtube\.com\//i, "")
    .replace(/^\/+/, "")
    .replace(/^@?/, "@")
    .toLowerCase();
}

export function normalizeHandle(value: string | undefined): string | undefined {
  const normalized = normalizeChannelKey(value);
  return normalized.startsWith("@") ? normalized : undefined;
}

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }

  return pathname;
}
