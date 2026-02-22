/**
 * Ref for the current campaign id when the user is in campaign play.
 * Used so script execution (e.g. onAttributeChange from Dexie hooks) can pass
 * campaignId and enable Owner.location and other campaign context.
 */
let currentCampaignId: string | undefined;

export function getCurrentCampaignIdForScripts(): string | undefined {
  return currentCampaignId;
}

export function setCurrentCampaignIdForScripts(campaignId: string | undefined): void {
  currentCampaignId = campaignId;
}
