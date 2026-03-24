import { db } from '@/stores';
import type { Campaign, CampaignScene } from '@/types';

/**
 * Ensures the joiner has a minimal local `Campaign` (and optional `CampaignScene`) so dashboard routes work
 * before Phase 1 sync hydrates full campaign data (Phase 2.6).
 */
export async function ensureLocalCampaignJoinStub(options: {
  campaignId: string;
  rulesetId: string;
  label: string | null;
  defaultCampaignSceneId: string | null;
}): Promise<void> {
  const now = new Date().toISOString();
  const existing = await db.campaigns.get(options.campaignId);
  if (!existing) {
    await db.campaigns.add({
      id: options.campaignId,
      rulesetId: options.rulesetId,
      label: options.label ?? undefined,
      createdAt: now,
      updatedAt: now,
    } as Campaign);
  } else if (existing.rulesetId !== options.rulesetId) {
    await db.campaigns.update(options.campaignId, {
      rulesetId: options.rulesetId,
      label: options.label ?? existing.label,
      updatedAt: now,
    });
  }

  if (options.defaultCampaignSceneId) {
    const sid = options.defaultCampaignSceneId;
    const sceneExisting = await db.campaignScenes.get(sid);
    if (!sceneExisting) {
      await db.campaignScenes.add({
        id: sid,
        campaignId: options.campaignId,
        name: 'Scene',
        createdAt: now,
        updatedAt: now,
      } as CampaignScene);
    }
  }
}
