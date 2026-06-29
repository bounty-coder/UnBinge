import type { DistractionFilters, ExtensionSettings } from "./types";
import { SAFE_DEFAULT_LANGUAGE } from "./constants";

export const DEFAULT_DISTRACTION_FILTERS: DistractionFilters = {
  hideHomeFeed: true,
  redirectHomeToSubscriptions: false,
  hideVideoSidebar: true,
  hideLiveChat: true,
  hidePlaylists: true,
  hideFundraisers: true,
  hideEndScreenFeed: true,
  hideEndScreenCards: true,
  hideShorts: true,
  hideComments: true,
  hideMixes: true,
  hideMerch: true,
  hideTickets: true,
  hideOffers: true,
  hideVideoInfo: false,
  hideTopHeader: false,
  hideNotifications: true,
  hideInappropriateSearchResults: false,
  hideExploreTrending: true,
  disableAutoplay: true,
  disableAnnotations: true // kept in data model but hidden from UI
};

export const DEFAULT_SETTINGS: ExtensionSettings = {
  onboardingCompleted: false,
  ageCategory: "kids",
  allowedLanguages: [SAFE_DEFAULT_LANGUAGE],
  educationModeEnabled: true,
  adBlockEnabled: false,
  distractionSettingsEnabled: true,
  theme: "light",
  lastWhitelistSyncAt: null,
  lastManualSyncAt: null,
  lastWhitelistSyncError: null,
  distractionFilters: DEFAULT_DISTRACTION_FILTERS
};
