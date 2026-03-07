/**
 * Ref for the current campaign id when the user is in campaign play.
 * Used so script execution (e.g. onAttributeChange from Dexie hooks) can pass
 * campaignId and associate script execution with the active campaign.
 */
let currentCampaignId: string | undefined;

export function getCurrentCampaignIdForScripts(): string | undefined {
  return currentCampaignId;
}

export function setCurrentCampaignIdForScripts(campaignId: string | undefined): void {
  currentCampaignId = campaignId;
}

/**
 * Ref for the current campaign scene id when the user is viewing a character in a scene.
 * Used so script execution (e.g. onAttributeChange, executeScript) gets the Scene accessor.
 */
let currentCampaignSceneId: string | undefined;

export function getCurrentCampaignSceneIdForScripts(): string | undefined {
  return currentCampaignSceneId;
}

export function setCurrentCampaignSceneIdForScripts(campaignSceneId: string | undefined): void {
  currentCampaignSceneId = campaignSceneId;
}
