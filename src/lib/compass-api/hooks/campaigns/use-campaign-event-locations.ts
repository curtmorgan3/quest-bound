import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { CampaignEventLocation } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export const useCampaignEventLocations = (campaignEventId: string | undefined) => {
  const { handleError } = useErrorHandler();

  const campaignEventLocations = useLiveQuery(
    async (): Promise<CampaignEventLocation[]> =>
      campaignEventId
        ? db.campaignEventLocations
            .where('campaignEventId')
            .equals(campaignEventId)
            .toArray()
        : [],
    [campaignEventId],
  );

  const createCampaignEventLocation = async (
    campaignEventId: string,
    locationId: string,
    tileId?: string | null,
  ) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    try {
      await db.campaignEventLocations.add({
        id,
        campaignEventId,
        locationId,
        tileId: tileId ?? null,
        createdAt: now,
        updatedAt: now,
      } as CampaignEventLocation);
      return id;
    } catch (e) {
      handleError(e as Error, {
        component: 'useCampaignEventLocations/createCampaignEventLocation',
        severity: 'medium',
      });
    }
  };

  const deleteCampaignEventLocation = async (id: string) => {
    try {
      await db.campaignEventLocations.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCampaignEventLocations/deleteCampaignEventLocation',
        severity: 'medium',
      });
    }
  };

  return {
    campaignEventLocations: campaignEventLocations ?? [],
    createCampaignEventLocation,
    deleteCampaignEventLocation,
  };
};
