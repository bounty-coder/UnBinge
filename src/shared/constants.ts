export const STORAGE_KEYS = {
  settings: "settings",
  globalWhitelistChannels: "whitelist_channels",
  globalWhitelistVideos: "whitelist_videos",
  legacyGlobalWhitelistChannels: "globalWhitelistChannels",
  legacyGlobalWhitelistVideos: "globalWhitelistVideos",
  localApprovedChannels: "localApprovedChannels",
  resolvedVideoChannels: "resolvedVideoChannels"
} as const;

export const DNR_RULESET_IDS = ["youtube_ads", "privacy_trackers", "site_blocklist"] as const;

// ── PHP / MySQL backend (unbinge.watch) ─────────────────────
// API_BASE_URL: the root of your Hostinger site (no trailing slash)
export const API_BASE_URL = "https://unbinge.watch";

// EXT_API_KEY: must match API_KEY in website/api/includes/config.php
// Generate a random 64-char string and paste the same value in both places.
export const EXT_API_KEY = "d038e80a-3963-4f3c-b27d-fbb8f11340df";

// YouTube Data API key (still used for channel handle resolution)
export const YOUTUBE_DATA_API_KEY = "AIzaSyBHAWc3HBdFN2msS4cc0bBF3TqVF_Ebl_U";

// ── Firebase (disabled — uncomment ALL lines in this block to switch back)
// To revert: uncomment below, rename firebase.ts.bak → firebase.ts,
// then swap imports in whitelist-cache.ts and background.ts back to ./firebase
//
// export const FIREBASE_PROJECT_ID  = "safefirebase1";
// export const FIREBASE_WEB_API_KEY = "AIzaSyBAUT3Hh-VXn3lE8pqKBcWrSUYtCXpXG-g";
// export const FIREBASE_DATABASE_ID = "default";
// export const FIRESTORE_COLLECTIONS = {
//   whitelistChannels: "whitelist_channels",
//   // whitelistVideos: "whitelist_videos", // v1: disabled
//   requestedChannels: "requested_channels",
// } as const;

export const YOUTUBE_URL_MATCHES = [
  "https://www.youtube.com/*",
  "https://m.youtube.com/*"
] as const;

export const SAFE_DEFAULT_LANGUAGE = "en";

const PLACEHOLDER_API_KEY = "YOUR_API_KEY";
const PLACEHOLDER_YOUTUBE_DATA_API_KEY = "YOUR_YOUTUBE_DATA_API_KEY";

// Firebase placeholder constants (kept for easy rollback — not active):
// const PLACEHOLDER_FIREBASE_PROJECT_ID = "YOUR_FIREBASE_PROJECT_ID";
// const PLACEHOLDER_FIREBASE_WEB_API_KEY = "YOUR_FIREBASE_WEB_API_KEY";

function isConfiguredValue(value: string, placeholder: string): boolean {
  return Boolean(value) && value !== placeholder && !value.startsWith("YOUR_") && !value.startsWith("REPLACE_");
}

export function isBackendConfigured(): boolean {
  return isConfiguredValue(EXT_API_KEY, PLACEHOLDER_API_KEY);
}

export function getBackendConfigurationError(): string | null {
  return isBackendConfigured()
    ? null
    : "Set EXT_API_KEY in src/shared/constants.ts (must match API_KEY in website/api/includes/config.php).";
}

// Firebase config check (kept for rollback — uncomment when reverting to Firebase):
// export function isFirestoreConfigured(): boolean {
//   return (
//     isConfiguredValue(FIREBASE_PROJECT_ID, PLACEHOLDER_FIREBASE_PROJECT_ID) &&
//     isConfiguredValue(FIREBASE_WEB_API_KEY, PLACEHOLDER_FIREBASE_WEB_API_KEY)
//   );
// }

export function getYouTubeDataApiKey(): string | null {
  if (isConfiguredValue(YOUTUBE_DATA_API_KEY, PLACEHOLDER_YOUTUBE_DATA_API_KEY)) {
    return YOUTUBE_DATA_API_KEY;
  }
  // Firebase v1 fallback (restore when reverting to Firebase backend):
  // if (isConfiguredValue(FIREBASE_WEB_API_KEY, PLACEHOLDER_FIREBASE_WEB_API_KEY)) {
  //   return FIREBASE_WEB_API_KEY;
  // }
  return null;
}


