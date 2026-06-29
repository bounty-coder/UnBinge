export type AgeCategory = "kids" | "teens" | "adult";

export type ThemeMode = "light" | "dark";

export type ApprovalSource = "global" | "local" | "video" | "education_off";

export type AccessDecision =
  | {
      allowed: true;
      source: ApprovalSource;
      badge?: "global_verified" | "local_parent";
      reason?: string;
    }
  | {
      allowed: false;
      source?: never;
      badge?: never;
      reason: string;
      needsMetadata?: boolean;
    };

export type YouTubePageType =
  | "home"
  | "watch"
  | "channel"
  | "shorts"
  | "subscriptions"
  | "search"
  | "embed"
  | "other";

export type ParsedYouTubeUrl = {
  isYouTube: boolean;
  pageType: YouTubePageType;
  url?: URL;
  videoId?: string;
  channelKey?: string;
};

export type DistractionFilters = {
  hideHomeFeed: boolean;
  redirectHomeToSubscriptions: boolean;
  hideVideoSidebar: boolean;
  hideLiveChat: boolean;
  hidePlaylists: boolean;
  hideFundraisers: boolean;
  hideEndScreenFeed: boolean;
  hideEndScreenCards: boolean;
  hideShorts: boolean;
  hideComments: boolean;
  hideMixes: boolean;
  hideMerch: boolean;
  hideTickets: boolean;
  hideOffers: boolean;
  hideVideoInfo: boolean;
  hideTopHeader: boolean;
  hideNotifications: boolean;
  hideInappropriateSearchResults: boolean;
  hideExploreTrending: boolean;
  disableAutoplay: boolean;
  disableAnnotations: boolean;
};

export type ExtensionSettings = {
  onboardingCompleted: boolean;
  ageCategory: AgeCategory;
  allowedLanguages: string[];
  educationModeEnabled: boolean;
  adBlockEnabled: boolean;
  distractionSettingsEnabled: boolean;
  theme: ThemeMode;
  lastWhitelistSyncAt: number | null;
  lastManualSyncAt: number | null;
  lastWhitelistSyncError: string | null;
  distractionFilters: DistractionFilters;
};

export type WhitelistChannel = {
  channelId: string;
  handle?: string;
  title: string;
  languages: string[];
  ageCategories: AgeCategory[];
  status: "approved";
  badge: "global_verified";
  updatedAt?: number;
};

export type LocalApprovedChannel = {
  storageKey: string;
  channelId?: string;
  handle?: string;
  title?: string;
  originalInput: string;
  approvedAt: number;
  source: "parent";
};

export type WhitelistVideo = {
  videoId: string;
  channelId?: string;
  title?: string;
  languages: string[];
  ageCategories: AgeCategory[];
  status: "approved";
};

export type YouTubeMetadata = {
  url: string;
  videoId?: string;
  channelId?: string;
  channelHandle?: string;
  channelTitle?: string;
};

export type ChannelRequestPayload = {
  submittedInput: string;
  normalizedUrl?: string;
  channelId?: string;
  handle?: string;
  title?: string;
  requestedAgeCategory: AgeCategory;
  requestedLanguages: string[];
  requestReason?: string;
  source: "popup_request" | "local_parent_approval";
  localApproval: boolean;
};

export type FirestoreSyncResult = {
  synced: boolean;
  channelCount: number;
  videoCount: number;
  error?: string;
};
