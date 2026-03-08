import type { DB } from './types';

export function registerCampaignDbHooks(db: DB) {
  // Delete all associated entities when a campaign is deleted (scenes, campaignCharacters, campaignEvents, sceneTurnCallbacks)
  db.campaigns.hook('deleting', (primKey) => {
    setTimeout(async () => {
      try {
        const campaignId = primKey as string;
        const scenes = await db.campaignScenes.where('campaignId').equals(campaignId).toArray();
        const sceneIds = scenes.map((s) => s.id);
        if (sceneIds.length > 0) {
          await db.sceneTurnCallbacks.where('campaignSceneId').anyOf(sceneIds).delete();
        }
        await db.campaignEvents.where('campaignId').equals(campaignId).delete();
        await db.campaignCharacters.where('campaignId').equals(campaignId).delete();
        await db.campaignScenes.where('campaignId').equals(campaignId).delete();
      } catch (error) {
        console.error('Failed to delete associated entities for campaign:', error);
      }
    }, 0);
  });
}
