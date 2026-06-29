import type { AgeCategory, ExtensionSettings } from "../shared/types";

type MessageResponse<T> = {
  ok: boolean;
  error?: string;
} & T;

const statusElement = document.querySelector("#status");

document.querySelectorAll<HTMLButtonElement>("[data-age]").forEach(button => {
  button.addEventListener("click", () => {
    void saveAgeCategory(button.dataset.age as AgeCategory);
  });
});

async function saveAgeCategory(ageCategory: AgeCategory): Promise<void> {
  const response = await sendMessage<{ settings: ExtensionSettings }>({
    type: "SAVE_SETTINGS",
    settings: {
      onboardingCompleted: true,
      ageCategory
    }
  });

  setStatus(`Setup complete. Active profile: ${formatAgeCategory(response.settings.ageCategory)}.`);
  window.setTimeout(() => {
    window.location.href = "https://www.youtube.com";
  }, 700);
}

function formatAgeCategory(ageCategory: AgeCategory): string {
  switch (ageCategory) {
    case "kids":
      return "Kids ≤8";
    case "teens":
      return "Teens 9-14";
    case "adult":
      return "Adult/Parent";
  }
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
