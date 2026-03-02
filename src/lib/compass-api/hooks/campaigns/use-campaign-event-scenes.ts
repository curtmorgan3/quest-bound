import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { CampaignEventScene } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export const useCampaignEventScenes = (campaignEventId: string | undefined) => {
  const { handleError } = useErrorHandler();

  const campaignEventScenes = useLiveQuery(
    async (): Promise<CampaignEventScene[]> =>
      campaignEventId
        ? db.campaignEventScenes
            .where('campaignEventId')
            .equals(campaignEventId)
            .toArray()
        : [],
    [campaignEventId],
  );

  const createCampaignEventScene = async (
    campaignEventId: string,
    campaignSceneId: string,
  ) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    try {
      await db.campaignEventScenes.add({
        id,
        campaignEventId,
        campaignSceneId,
        createdAt: now,
        updatedAt: now,
      } as CampaignEventScene);
      return id;
    } catch (e) {
      handleError(e as Error, {
        component: 'useCampaignEventScenes/createCampaignEventScene',
        severity: 'medium',
      });
    }
  };

  const deleteCampaignEventScene = async (id: string) => {
    try {
      await db.campaignEventScenes.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCampaignEventScenes/deleteCampaignEventScene',
        severity: 'medium',
      });
    }
  };

  return {
    campaignEventScenes: campaignEventScenes ?? [],
    createCampaignEventScene,
    deleteCampaignEventScene,
  };
};
