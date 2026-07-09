import { DEFAULT_DISTRACTION_FILTERS } from "../shared/defaults";
import type {
  AgeCategory,
  DistractionFilters,
  ExtensionSettings,
  LocalApprovedChannel
} from "../shared/types";

type MessageResponse<T> = {
  ok: boolean;
  error?: string;
} & T;

const filterLabels: Record<string, string> = {
  hideHomeFeed: "Hide Home Feed",
  redirectHomeToSubscriptions: "Redirect Home to Subscriptions",
  hideVideoSidebar: "Hide Video Sidebar",
  hideShorts: "Hide Shorts",
  hideComments: "Hide Comments",
  hideVideoInfo: "Hide Video Info",
  hideTopHeader: "Hide Top Header",
  hideLiveChat: "Hide Live Chat",
  hidePlaylists: "Hide Playlists",
  hideInappropriateSearchResults: "Hide Search Results (strict)",
  disableAutoplay: "Disable Autoplay",
  hideFundraisers: "Hide Fundraisers",
  hideEndScreenFeed: "Hide End Screen Feed",
  hideEndScreenCards: "Hide End Screen Cards",
  hideMixes: "Hide Mixes",
  hideMerch: "Hide Merch",
  hideTickets: "Hide Tickets",
  hideOffers: "Hide Offers",
  hideNotifications: "Hide Notifications",
  hideExploreTrending: "Hide Explore and Trending"
  // disableAnnotations: removed from UI — YouTube has deprecated annotations
};

let settings: ExtensionSettings;
let localChannels: Record<string, LocalApprovedChannel> = {};

const statusElement = document.querySelector<HTMLSpanElement>("#status");
const onboardingElement = document.querySelector<HTMLElement>("#onboarding");
const ageCategorySelect = document.querySelector<HTMLSelectElement>("#age-category");
const themeToggle = document.querySelector<HTMLInputElement>("#theme-toggle");
const distractionMaster = document.querySelector<HTMLInputElement>("#distraction-master");
const resetDistractionsButton = document.querySelector<HTMLButtonElement>("#reset-distractions");
const filterList = document.querySelector<HTMLElement>("#filter-list");
const channelForm = document.querySelector<HTMLFormElement>("#channel-form");
const channelInput = document.querySelector<HTMLInputElement>("#channel-input");
const reasonInput = document.querySelector<HTMLTextAreaElement>("#request-reason");
const localChannelList = document.querySelector<HTMLElement>("#local-channel-list");
const syncButton = document.querySelector<HTMLButtonElement>("#sync-button");
const syncCooldownElement = document.querySelector<HTMLSpanElement>("#sync-cooldown");

const MANUAL_SYNC_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6 hours
let cooldownTimer: number | undefined;

void initialize();

async function initialize(): Promise<void> {
  const [settingsResponse, channelsResponse] = await Promise.all([
    sendMessage<{ settings: ExtensionSettings }>({ type: "GET_SETTINGS" }),
    sendMessage<{ channels: Record<string, LocalApprovedChannel> }>({
      type: "GET_LOCAL_APPROVED_CHANNELS"
    })
  ]);
  settings = settingsResponse.settings;
  localChannels = channelsResponse.channels;
  render();
  bindEvents();
}

function render(): void {
  document.body.classList.toggle("dark", settings.theme === "dark");

  if (onboardingElement) {
    onboardingElement.hidden = settings.onboardingCompleted;
  }

  if (ageCategorySelect) {
    ageCategorySelect.value = settings.ageCategory;
  }

  if (themeToggle) {
    themeToggle.checked = settings.theme === "dark";
  }

  if (distractionMaster) {
    distractionMaster.checked = settings.distractionSettingsEnabled;
  }

  document
    .querySelectorAll<HTMLInputElement>("[data-setting]")
    .forEach(input => {
      const key = input.dataset.setting as keyof ExtensionSettings;
      input.checked = Boolean(settings[key]);
    });

  renderFilters();
  renderLocalChannels();
  renderStatus();
  updateSyncButtonState();
}

function updateSyncButtonState(): void {
  if (!syncButton) {
    return;
  }

  const remaining = getManualCooldownRemaining();

  if (remaining > 0) {
    syncButton.disabled = true;
    syncButton.classList.add("is-cooldown");
    syncButton.textContent = "Sync locked";

    if (syncCooldownElement) {
      syncCooldownElement.hidden = false;
      syncCooldownElement.textContent = `Unlocks in ${formatCooldown(remaining)}`;
    }

    scheduleCooldownTick();
  } else {
    syncButton.disabled = false;
    syncButton.classList.remove("is-cooldown");
    syncButton.textContent = "Sync whitelist";

    if (syncCooldownElement) {
      syncCooldownElement.hidden = true;
      syncCooldownElement.textContent = "";
    }

    if (cooldownTimer !== undefined) {
      window.clearTimeout(cooldownTimer);
      cooldownTimer = undefined;
    }
  }
}

function getManualCooldownRemaining(): number {
  if (!settings.lastManualSyncAt) {
    return 0;
  }

  return Math.max(0, MANUAL_SYNC_COOLDOWN_MS - (Date.now() - settings.lastManualSyncAt));
}

function scheduleCooldownTick(): void {
  if (cooldownTimer !== undefined) {
    return;
  }

  cooldownTimer = window.setTimeout(() => {
    cooldownTimer = undefined;
    updateSyncButtonState();
  }, 60 * 1000);
}

function formatCooldown(ms: number): string {
  const totalMinutes = Math.ceil(ms / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${minutes}m`;
}

function renderFilters(): void {
  if (!filterList) {
    return;
  }

  filterList.setAttribute("aria-disabled", String(!settings.distractionSettingsEnabled));
  filterList.replaceChildren(
    ...Object.entries(filterLabels).map(([key, label]) => {
      const wrapper = document.createElement("label");
      wrapper.className = "setting";

      const text = document.createElement("span");
      const strong = document.createElement("strong");
      strong.textContent = label;
      text.append(strong);

      const input = document.createElement("input");
      input.type = "checkbox";
      input.disabled = !settings.distractionSettingsEnabled;
      input.checked = settings.distractionFilters[key as keyof DistractionFilters];
      input.addEventListener("change", () => {
        void updateSettings({
          distractionFilters: {
            ...settings.distractionFilters,
            [key]: input.checked
          }
        });
      });

      wrapper.append(text, input);
      return wrapper;
    })
  );
}

function renderLocalChannels(): void {
  if (!localChannelList) {
    return;
  }

  const channels = Object.values(localChannels).sort((a, b) => b.approvedAt - a.approvedAt);

  if (channels.length === 0) {
    localChannelList.textContent = "No local channels approved yet.";
    return;
  }

  localChannelList.replaceChildren(
    ...channels.map(channel => {
      const item = document.createElement("div");
      item.className = "channel-item";

      const info = document.createElement("span");
      const title = document.createElement("strong");
      title.textContent = channel.title || channel.handle || channel.channelId || channel.originalInput;

      const detail = document.createElement("small");
      detail.textContent = channel.handle || channel.channelId || channel.originalInput;

      const removeButton = document.createElement("button");
      removeButton.className = "danger";
      removeButton.type = "button";
      removeButton.textContent = "Delete";
      removeButton.addEventListener("click", () => {
        void deleteLocalChannel(channel.storageKey);
      });

      info.append(title, detail);
      item.append(info, removeButton);
      return item;
    })
  );
}

function bindEvents(): void {
  document.querySelectorAll<HTMLButtonElement>("[data-age]").forEach(button => {
    button.addEventListener("click", () => {
      void updateSettings({
        onboardingCompleted: true,
        ageCategory: button.dataset.age as AgeCategory
      });
    });
  });

  document.querySelectorAll<HTMLInputElement>("[data-setting]").forEach(input => {
    input.addEventListener("change", () => {
      const key = input.dataset.setting as keyof ExtensionSettings;
      void updateSettings({ [key]: input.checked } as Partial<ExtensionSettings>);
    });
  });

  ageCategorySelect?.addEventListener("change", () => {
    void updateSettings({
      onboardingCompleted: true,
      ageCategory: ageCategorySelect.value as AgeCategory
    });
  });

  themeToggle?.addEventListener("change", () => {
    void updateSettings({
      theme: themeToggle.checked ? "dark" : "light"
    });
  });

  distractionMaster?.addEventListener("change", () => {
    void updateSettings({
      distractionSettingsEnabled: distractionMaster.checked
    });
  });

  resetDistractionsButton?.addEventListener("click", () => {
    void updateSettings({
      distractionSettingsEnabled: true,
      distractionFilters: DEFAULT_DISTRACTION_FILTERS
    });
  });

  channelForm?.addEventListener("submit", event => {
    event.preventDefault();
    void approveChannelLocally();
  });

  syncButton?.addEventListener("click", () => {
    if (syncButton.disabled || getManualCooldownRemaining() > 0) {
      return;
    }

    void syncWhitelist();
  });
}

async function updateSettings(patch: Partial<ExtensionSettings>): Promise<void> {
  const response = await sendMessage<{ settings: ExtensionSettings }>({
    type: "SAVE_SETTINGS",
    settings: patch
  });
  settings = response.settings;
  render();
}

async function approveChannelLocally(): Promise<void> {
  const submittedInput = channelInput?.value.trim() ?? "";

  if (!submittedInput) {
    setStatus("Enter a channel link first.");
    return;
  }

  const response = await sendMessage<{
    reported: boolean;
    reportError?: string;
    channel: LocalApprovedChannel;
  }>({
    type: "APPROVE_CHANNEL_LOCALLY",
    payload: {
      submittedInput,
      requestReason: reasonInput?.value.trim() ?? "",
      requestedAgeCategory: settings.ageCategory,
      requestedLanguages: settings.allowedLanguages,
      source: "local_parent_approval",
      localApproval: true
    }
  });

  channelForm?.reset();
  localChannels = {
    ...localChannels,
    [response.channel.storageKey]: response.channel
  };
  renderLocalChannels();

  setStatus(
    response.reported
      ? "Channel approved locally and submitted for review."
      : `Channel approved locally. Review report pending: ${response.reportError}`
  );
}

async function deleteLocalChannel(storageKey: string): Promise<void> {
  const response = await sendMessage<{ channels: Record<string, LocalApprovedChannel> }>({
    type: "DELETE_LOCAL_APPROVED_CHANNEL",
    storageKey
  });

  localChannels = response.channels;
  renderLocalChannels();
  setStatus("Local channel approval deleted.");
}

async function syncWhitelist(): Promise<void> {
  if (syncButton) {
    syncButton.disabled = true;
    syncButton.textContent = "Syncing…";
  }

  const response = await sendMessage<{
    result: { synced: boolean; channelCount: number; videoCount: number; error?: string };
    settings: ExtensionSettings;
  }>({ type: "SYNC_WHITELIST" });

  settings = response.settings;
  setStatus(
    response.result.synced
      ? `Synced ${response.result.channelCount} channels.`
      : `Sync skipped: ${response.result.error}`
  );
  render();
}

function renderStatus(): void {
  if (!settings.lastWhitelistSyncAt) {
    setStatus(settings.lastWhitelistSyncError ?? "Whitelist has not synced yet.");
    return;
  }

  setStatus(`Last synced ${new Date(settings.lastWhitelistSyncAt).toLocaleString()}.`);
}

function setStatus(message: string): void {
  if (statusElement) {
    statusElement.textContent = message;
  }
}

async function sendMessage<T>(message: unknown): Promise<MessageResponse<T>> {
  const response = (await chrome.runtime.sendMessage(message)) as MessageResponse<T>;

  if (!response?.ok) {
    throw new Error(response?.error ?? "Extension request failed.");
  }

  return response;
}
