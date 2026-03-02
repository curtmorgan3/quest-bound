import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { CampaignScene } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export const useCampaignScenes = (campaignId: string | undefined) => {
  const { handleError } = useErrorHandler();

  const campaignScenes = useLiveQuery(
    async (): Promise<CampaignScene[]> =>
      campaignId ? db.campaignScenes.where('campaignId').equals(campaignId).toArray() : [],
    [campaignId],
  );

  const createCampaignScene = async (
    campaignId: string,
    data: { name: string; category?: string },
  ) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    try {
      await db.campaignScenes.add({
        id,
        campaignId,
        name: data.name,
        category: data.category?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      } as CampaignScene);
      return id;
    } catch (e) {
      handleError(e as Error, {
        component: 'useCampaignScenes/createCampaignScene',
        severity: 'medium',
      });
    }
  };

  const updateCampaignScene = async (
    id: string,
    data: Partial<Pick<CampaignScene, 'name' | 'category'>>,
  ) => {
    const now = new Date().toISOString();
    try {
      await db.campaignScenes.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useCampaignScenes/updateCampaignScene',
        severity: 'medium',
      });
    }
  };

  const deleteCampaignScene = async (id: string) => {
    try {
      await db.campaignScenes.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCampaignScenes/deleteCampaignScene',
        severity: 'medium',
      });
    }
  };

  return {
    campaignScenes: campaignScenes ?? [],
    createCampaignScene,
    updateCampaignScene,
    deleteCampaignScene,
  };
};
