import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { CampaignItem } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export const useCampaignItems = (campaignId: string | undefined) => {
  const { handleError } = useErrorHandler();

  const campaignItems = useLiveQuery(
    async (): Promise<CampaignItem[]> =>
      campaignId
        ? db.campaignItems.where('campaignId').equals(campaignId).toArray()
        : [],
    [campaignId],
  );

  const createCampaignItem = async (
    campaignId: string,
    data: {
      itemId: string;
      currentLocationId?: string;
      currentTileId?: string;
    },
  ) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    try {
      const item = await db.items.get(data.itemId);
      await db.campaignItems.add({
        id,
        campaignId,
        itemId: data.itemId,
        currentLocationId: data.currentLocationId ?? null,
        currentTileId: data.currentTileId ?? null,
        mapWidth: item?.mapWidth,
        mapHeight: item?.mapHeight,
        createdAt: now,
        updatedAt: now,
      } as CampaignItem);
      return id;
    } catch (e) {
      handleError(e as Error, {
        component: 'useCampaignItems/createCampaignItem',
        severity: 'medium',
      });
    }
  };

  const updateCampaignItem = async (
    id: string,
    data: Partial<Pick<CampaignItem, 'currentLocationId' | 'currentTileId'>>,
  ) => {
    const now = new Date().toISOString();
    try {
      await db.campaignItems.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useCampaignItems/updateCampaignItem',
        severity: 'medium',
      });
    }
  };

  const deleteCampaignItem = async (id: string) => {
    try {
      await db.campaignItems.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCampaignItems/deleteCampaignItem',
        severity: 'medium',
      });
    }
  };

  return {
    campaignItems: campaignItems ?? [],
    createCampaignItem,
    updateCampaignItem,
    deleteCampaignItem,
  };
};
