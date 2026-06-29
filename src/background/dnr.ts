import { DNR_RULESET_IDS } from "../shared/constants";

// Ad Blocker is disabled for v1. Regardless of the stored adBlockEnabled flag,
// we always keep every DNR ruleset turned OFF so no ad-blocking runs.
// To re-enable later, restore the original body (see commented code below).
export async function updateAdBlocking(_enabled: boolean): Promise<void> {
  await chrome.declarativeNetRequest.updateEnabledRulesets({
    enableRulesetIds: [],
    disableRulesetIds: [...DNR_RULESET_IDS]
  });
}

// Original implementation (kept for when the Ad Blocker ships):
// export async function updateAdBlocking(enabled: boolean): Promise<void> {
//   await chrome.declarativeNetRequest.updateEnabledRulesets({
//     enableRulesetIds: enabled ? [...DNR_RULESET_IDS] : [],
//     disableRulesetIds: enabled ? [] : [...DNR_RULESET_IDS]
//   });
// }

export async function getAdBlockingState(): Promise<boolean> {
  const enabledRulesets = await chrome.declarativeNetRequest.getEnabledRulesets();
  return DNR_RULESET_IDS.every(ruleSetId => enabledRulesets.includes(ruleSetId));
}
