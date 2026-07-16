// ============================================================
//  api.ts  —  Unbinge PHP/MySQL backend client
//  Replaces firebase.ts. Same exported interface so callers
//  (whitelist-cache.ts, background.ts) need no changes.
// ============================================================
import {
  API_BASE_URL,
  EXT_API_KEY,
  getBackendConfigurationError
} from "../shared/constants";
import type {
  AgeCategory,
  ChannelRequestPayload,
  WhitelistChannel
} from "../shared/types";

// ── Types returned by the PHP API ───────────────────────────
interface ApiChannel {
  channel_id: string;
  handle:     string | null;
  name:       string;
  language:   string;
  category:   string | null;
  age_group:  string;
  badge:      "none" | "green" | "golden" | "blue";
}

interface WhitelistResponse {
  ok:       boolean;
  count:    number;
  channels: ApiChannel[];
}

// ── Helpers ──────────────────────────────────────────────────
function apiHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    "X-API-Key":    EXT_API_KEY
  };
}

function ensureConfigured(): void {
  const err = getBackendConfigurationError();
  if (err) throw new Error(err);
}

/** Map the PHP age_group field to our internal AgeCategory. */
function mapAgeGroup(ag: string): AgeCategory[] {
  if (ag === "all")   return ["kids", "teens", "adult"];
  if (ag === "kids")  return ["kids", "teens", "adult"];
  if (ag === "teens") return ["teens", "adult"];
  if (ag === "adult") return ["adult"];
  return ["kids", "teens", "adult"];
}

function mapBadge(_badge: string): WhitelistChannel["badge"] {
  return "global_verified";
}

// ── Public API ───────────────────────────────────────────────

/**
 * Fetch approved channels from unbinge.watch/api/whitelist.php.
 * Mirrors the firebase.ts fetchApprovedChannels() signature.
 */
export async function fetchApprovedChannels(
  ageCategory: AgeCategory,
  _languages: string[]    // kept for interface compat; PHP API handles filtering server-side
): Promise<WhitelistChannel[]> {
  ensureConfigured();

  const url = `${API_BASE_URL}/api/whitelist.php?age=${encodeURIComponent(ageCategory)}`;
  const response = await fetch(url, {
    method:  "GET",
    headers: apiHeaders()
  });

  if (!response.ok) {
    throw new Error(`Whitelist fetch failed: ${response.status}`);
  }

  const data = (await response.json()) as WhitelistResponse;

  if (!data.ok) {
    throw new Error("Whitelist API returned an error.");
  }

  return data.channels.map((ch): WhitelistChannel => ({
    channelId:     ch.channel_id,
    handle:        ch.handle ?? undefined,
    title:         ch.name,
    languages:     [ch.language],
    ageCategories: mapAgeGroup(ch.age_group),
    status:        "approved",
    badge:         mapBadge(ch.badge),
    updatedAt:     undefined
  }));
}

/**
 * Submit a channel request to unbinge.watch/api/request-channel.php.
 * Mirrors firebase.ts submitChannelRequest().
 */
export async function submitChannelRequest(payload: ChannelRequestPayload): Promise<void> {
  ensureConfigured();

  const body = {
    channel_url:    payload.normalizedUrl ?? payload.submittedInput,
    channel_id:     payload.channelId     ?? "",
    channel_handle: payload.handle        ?? "",
    channel_name:   payload.title         ?? ""
  };

  const response = await fetch(`${API_BASE_URL}/api/request-channel.php`, {
    method:  "POST",
    headers: apiHeaders(),
    body:    JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`Channel request failed: ${response.status}`);
  }
}

/**
 * Returns a human-readable error if EXT_API_KEY is not configured.
 * Mirrors firebase.ts getFirestoreConfigurationError().
 */
export function getFirestoreConfigurationError(): string | null {
  return getBackendConfigurationError();
}
