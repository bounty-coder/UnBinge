import type { AccessDecision, ExtensionSettings, ParsedYouTubeUrl, YouTubeMetadata } from "../shared/types";

type SettingsResponse = {
  ok: boolean;
  settings?: ExtensionSettings;
  error?: string;
};

type AccessResponse = {
  ok: boolean;
  decision?: AccessDecision;
  error?: string;
};

const root = document.documentElement;
let currentSettings: ExtensionSettings | null = null;
let lastCheckedUrl = "";
let routeObserver: MutationObserver | null = null;
let accessCheckTimer: number | undefined;

root.dataset.safeYtExtension = "true";
root.dataset.safeYtAccessPending = "true";

void initialize();

chrome.runtime.onMessage.addListener(message => {
  if (message?.type === "SETTINGS_UPDATED") {
    currentSettings = message.settings;
    applySettings(message.settings);
    void checkCurrentPageAccess();
  }
});

async function initialize(): Promise<void> {
  try {
    const response = (await chrome.runtime.sendMessage({ type: "GET_SETTINGS" })) as SettingsResponse;

    if (!response.ok || !response.settings) {
      throw new Error(response.error ?? "Unable to load Unbinge settings.");
    }

    currentSettings = response.settings;
    applySettings(response.settings);
    installRouteWatcher();
    void checkCurrentPageAccess();
  } catch (error) {
    redirectToBlockedPage(location.href, error instanceof Error ? error.message : "Unable to verify this page.");
  }
}

function applySettings(settings: ExtensionSettings): void {
  const filters = settings.distractionFilters;
  const enabled = settings.distractionSettingsEnabled;

  root.dataset.safeYtHideHomeFeed = String(enabled && filters.hideHomeFeed);
  root.dataset.safeYtHideVideoSidebar = String(enabled && filters.hideVideoSidebar);
  root.dataset.safeYtHideLiveChat = String(enabled && filters.hideLiveChat);
  root.dataset.safeYtHidePlaylists = String(enabled && filters.hidePlaylists);
  root.dataset.safeYtHideFundraisers = String(enabled && filters.hideFundraisers);
  root.dataset.safeYtHideEndScreenFeed = String(enabled && filters.hideEndScreenFeed);
  root.dataset.safeYtHideEndScreenCards = String(enabled && filters.hideEndScreenCards);
  root.dataset.safeYtHideShorts = String(enabled && filters.hideShorts);
  root.dataset.safeYtHideComments = String(enabled && filters.hideComments);
  root.dataset.safeYtHideMixes = String(enabled && filters.hideMixes);
  root.dataset.safeYtHideMerch = String(enabled && filters.hideMerch);
  root.dataset.safeYtHideTickets = String(enabled && filters.hideTickets);
  root.dataset.safeYtHideOffers = String(enabled && filters.hideOffers);
  root.dataset.safeYtHideVideoInfo = String(enabled && filters.hideVideoInfo);
  root.dataset.safeYtHideTopHeader = String(enabled && filters.hideTopHeader);
  root.dataset.safeYtHideNotifications = String(enabled && filters.hideNotifications);
  root.dataset.safeYtHideInappropriateSearchResults = String(enabled && filters.hideInappropriateSearchResults);
  root.dataset.safeYtHideExploreTrending = String(enabled && filters.hideExploreTrending);
  root.dataset.safeYtDisableAnnotations = String(enabled && filters.disableAnnotations);

  hideExploreAndTrendingLinks(enabled && filters.hideExploreTrending);
  hideStrictSearchResults(enabled && filters.hideInappropriateSearchResults);
  hideShortsElements(enabled && filters.hideShorts);

  if (enabled && filters.redirectHomeToSubscriptions && location.pathname === "/") {
    location.replace("https://www.youtube.com/feed/subscriptions");
  }

  if (enabled && filters.disableAutoplay) {
    scheduleAutoplayDisable();
  }
}

function installRouteWatcher(): void {
  if (routeObserver) {
    return;
  }

  routeObserver = new MutationObserver(() => {
    window.clearTimeout(accessCheckTimer);
    accessCheckTimer = window.setTimeout(() => {
      if (lastCheckedUrl !== location.href) {
        void checkCurrentPageAccess();
      }

      if (currentSettings?.distractionSettingsEnabled && currentSettings.distractionFilters.disableAutoplay) {
        scheduleAutoplayDisable();
      }

      if (currentSettings?.distractionSettingsEnabled) {
        hideExploreAndTrendingLinks(currentSettings.distractionFilters.hideExploreTrending);
        hideStrictSearchResults(currentSettings.distractionFilters.hideInappropriateSearchResults);
        hideShortsElements(currentSettings.distractionFilters.hideShorts);
      }
    }, 250);
  });

  routeObserver.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  window.addEventListener("yt-navigate-start", () => {
    // Immediately mark the page as pending (hides content via CSS) the moment
    // SPA navigation begins, so a non-whitelisted video never flashes before
    // the access decision returns.
    if (currentSettings?.educationModeEnabled) {
      root.dataset.safeYtAccessPending = "true";
      clearBadge();
    }
  });

  window.addEventListener("yt-navigate-finish", () => {
    void checkCurrentPageAccess();
  });
}

async function checkCurrentPageAccess(): Promise<void> {
  const settings = currentSettings;

  if (!settings) {
    return;
  }

  lastCheckedUrl = location.href;

  if (!settings.educationModeEnabled) {
    root.dataset.safeYtAccessPending = "false";
    clearBadge();
    return;
  }

  root.dataset.safeYtAccessPending = "true";

  // Resolve the channel authoritatively from the videoId (always correct from
  // the URL, even mid-SPA-transition) rather than trusting stale DOM metadata.
  // The background resolves the channel via the YouTube API (cached) and checks
  // the whitelist. We only wait briefly for the live-DOM channel handle as a
  // fast-path; we never trust the ytInitialPlayerResponse inline script,
  // which is NOT re-injected on SPA navigation and returns the previous
  // video's channelId.
  const metadata = await waitForFreshMetadata();
  const response = (await chrome.runtime.sendMessage({
    type: "CHECK_YOUTUBE_ACCESS",
    url: location.href,
    metadata
  })) as AccessResponse;

  if (!response.ok || !response.decision) {
    redirectToBlockedPage(location.href, response.error ?? "Unable to verify this YouTube page.");
    return;
  }

  if (!response.decision.allowed) {
    redirectToBlockedPage(location.href, response.decision.reason);
    return;
  }

  root.dataset.safeYtAccessPending = "false";
  renderBadge(response.decision);
}

async function waitForFreshMetadata(): Promise<YouTubeMetadata> {
  const parsed = parseYouTubeUrl(location.href);

  // For non-watch pages, the URL itself carries the channel key (e.g. /@handle
  // or /channel/UC...), so we can decide immediately without waiting on the DOM.
  if (parsed.pageType !== "watch" && parsed.pageType !== "shorts") {
    return {
      url: location.href,
      videoId: parsed.videoId,
      channelId: parsed.channelKey?.startsWith("UC") ? parsed.channelKey : undefined,
      channelHandle: parsed.channelKey?.startsWith("@") ? parsed.channelKey : undefined
    };
  }

  // For watch/shorts pages, the videoId from the URL is the only reliable
  // signal during SPA navigation. The background resolves the channel
  // AUTHORITATIVELY from the videoId via the YouTube API (cached) and checks
  // the whitelist — we do NOT send DOM channel keys, because the inline
  // ytInitialPlayerResponse script is stale (not re-injected) and the live
  // owner-renderer anchor lags behind the URL change. Sending just the
  // videoId makes the block instant and reliable.
  return {
    url: location.href,
    videoId: parsed.videoId
  };
}

function extractMetadata(): YouTubeMetadata {
  const parsed = parseYouTubeUrl(location.href);
  const channelId = queryMeta("channelId") ?? queryPlayerResponse("channelId");
  const channelHandle = extractChannelHandle();
  const channelTitle =
    document.querySelector<HTMLAnchorElement>("ytd-video-owner-renderer ytd-channel-name a")?.textContent?.trim() ??
    document.querySelector<HTMLElement>("ytd-channel-name #text")?.textContent?.trim() ??
    undefined;

  return {
    url: location.href,
    videoId: parsed.videoId,
    channelId,
    channelHandle,
    channelTitle
  };
}

function queryMeta(itemprop: string): string | undefined {
  return document
    .querySelector<HTMLMetaElement>(`meta[itemprop="${itemprop}"]`)
    ?.content
    ?.trim();
}

function queryPlayerResponse(key: "channelId"): string | undefined {
  for (const script of document.scripts) {
    const text = script.textContent;

    if (!text || !text.includes("ytInitialPlayerResponse")) {
      continue;
    }

    const match = text.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`));

    if (match?.[1]) {
      return match[1];
    }
  }

  return undefined;
}

function extractChannelHandle(): string | undefined {
  const selectors = [
    "ytd-video-owner-renderer a[href^='/@']",
    "ytd-watch-metadata ytd-channel-name a[href^='/@']",
    "ytd-c4-tabbed-header-renderer a[href^='/@']",
    "a.yt-simple-endpoint[href^='/@']"
  ];

  for (const selector of selectors) {
    const href = document.querySelector<HTMLAnchorElement>(selector)?.getAttribute("href");

    if (href) {
      return href.split("/").find(part => part.startsWith("@"));
    }
  }

  const parsed = parseYouTubeUrl(location.href);
  return parsed.channelKey?.startsWith("@") ? parsed.channelKey : undefined;
}

function renderBadge(decision: AccessDecision): void {
  clearBadge();

  if (!decision.allowed || !decision.badge) {
    return;
  }

  const container = findBadgeContainer();

  if (!container) {
    return;
  }

  const badge = document.createElement("span");
  badge.className =
    decision.badge === "global_verified"
      ? "safe-yt-badge safe-yt-badge--global"
      : "safe-yt-badge safe-yt-badge--local";
  badge.textContent = decision.badge === "global_verified" ? "Verified" : "Parent approved";
  badge.dataset.safeYtBadge = "true";
  container.append(badge);
}

function clearBadge(): void {
  document.querySelectorAll("[data-safe-yt-badge='true']").forEach(element => element.remove());
}

function findBadgeContainer(): HTMLElement | null {
  return (
    document.querySelector<HTMLElement>("ytd-watch-metadata ytd-channel-name #container") ??
    document.querySelector<HTMLElement>("ytd-video-owner-renderer ytd-channel-name") ??
    document.querySelector<HTMLElement>("ytd-c4-tabbed-header-renderer #channel-name") ??
    document.querySelector<HTMLElement>("ytd-channel-name #container")
  );
}

function scheduleAutoplayDisable(): void {
  window.setTimeout(disableAutoplay, 500);
  window.setTimeout(disableAutoplay, 1500);
  window.setTimeout(disableAutoplay, 3000);
}

function disableAutoplay(): void {
  const selectors = [
    ".ytp-autonav-toggle-button[aria-checked='true']",
    "button[aria-label*='Autoplay is on']",
    "button[title*='Autoplay is on']"
  ];

  for (const selector of selectors) {
    const button = document.querySelector<HTMLElement>(selector);

    if (button) {
      button.click();
      return;
    }
  }
}

function redirectToBlockedPage(url: string, reason: string): void {
  const profile = currentSettings?.ageCategory ?? "kids";
  const blockedUrl = chrome.runtime.getURL(
    `blocked.html?url=${encodeURIComponent(url)}&reason=${encodeURIComponent(reason)}&profile=${encodeURIComponent(profile)}`
  );
  location.replace(blockedUrl);
}

function hideExploreAndTrendingLinks(enabled: boolean): void {
  const blockedHrefs = new Set(["/feed/explore", "/feed/trending"]);

  document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach(anchor => {
    const href = anchor.getAttribute("href") ?? "";
    const shouldHide =
      blockedHrefs.has(href) ||
      href.includes("/feed/explore") ||
      href.includes("/feed/trending");

    if (!shouldHide) {
      return;
    }

    const container =
      anchor.closest<HTMLElement>("ytd-guide-entry-renderer") ??
      anchor.closest<HTMLElement>("ytd-mini-guide-entry-renderer") ??
      anchor.closest<HTMLElement>("tp-yt-paper-item") ??
      anchor.closest<HTMLElement>("ytd-rich-section-renderer") ??
      anchor;

    container.style.display = enabled ? "none" : "";
  });
}

function hideStrictSearchResults(enabled: boolean): void {
  if (parseYouTubeUrl(location.href).pageType !== "search") {
    return;
  }

  document
    .querySelectorAll<HTMLElement>(
      "ytd-video-renderer, ytd-channel-renderer, ytd-playlist-renderer, ytd-reel-shelf-renderer"
    )
    .forEach(result => {
      result.style.display = enabled ? "none" : "";
    });
}

function hideShortsElements(enabled: boolean): void {
  const shelfSelectors = [
    "ytd-reel-shelf-renderer",
    "ytd-rich-shelf-renderer[is-shorts]",
    "ytd-reel-item-renderer",
    "ytm-shorts-lockup-view-model",
    "ytm-shorts-lockup-view-model-v2",
    "ytd-shorts-lockup-view-model",
    "ytd-shorts-lockup-view-model-v2",
    "grid-shorts"
  ];

  document.querySelectorAll<HTMLElement>(shelfSelectors.join(",")).forEach(element => {
    element.style.display = enabled ? "none" : "";
  });

  document.querySelectorAll<HTMLAnchorElement>('a[href*="/shorts/"]').forEach(anchor => {
    const container =
      anchor.closest<HTMLElement>("ytd-video-renderer") ??
      anchor.closest<HTMLElement>("ytd-rich-item-renderer") ??
      anchor.closest<HTMLElement>("ytd-grid-video-renderer") ??
      anchor.closest<HTMLElement>("ytd-compact-video-renderer") ??
      anchor.closest<HTMLElement>("ytd-reel-item-renderer") ??
      anchor;

    container.style.display = enabled ? "none" : "";
  });

  document.querySelectorAll<HTMLElement>("yt-chip-cloud-chip-renderer").forEach(chip => {
    if (chip.textContent?.trim().toLowerCase() === "shorts") {
      chip.style.display = enabled ? "none" : "";
    }
  });
}

function delay(milliseconds: number): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, milliseconds));
}

function parseYouTubeUrl(rawUrl: string): ParsedYouTubeUrl {
  let url: URL;

  try {
    url = new URL(rawUrl);
  } catch {
    return { isYouTube: false, pageType: "other" };
  }

  const hostname = url.hostname.replace(/^www\./, "");

  if (hostname !== "youtube.com" && hostname !== "m.youtube.com") {
    return { isYouTube: false, pageType: "other", url };
  }

  const pathname = url.pathname.length > 1 && url.pathname.endsWith("/")
    ? url.pathname.slice(0, -1)
    : url.pathname;

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

  if (pathname === "/") {
    return { isYouTube: true, pageType: "home", url };
  }

  if (pathname === "/results") {
    return { isYouTube: true, pageType: "search", url };
  }

  return { isYouTube: true, pageType: "other", url };
}
