import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { CampaignEvent } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export const useCampaignEvents = (campaignId: string | undefined) => {
  const { handleError } = useErrorHandler();

  const campaignEvents = useLiveQuery(
    async (): Promise<CampaignEvent[]> =>
      campaignId
        ? db.campaignEvents.where('campaignId').equals(campaignId).toArray()
        : [],
    [campaignId],
  );

  const createCampaignEvent = async (
    campaignId: string,
    data: { label: string; scriptId?: string | null },
  ) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    try {
      await db.campaignEvents.add({
        id,
        campaignId,
        label: data.label,
        scriptId: data.scriptId ?? null,
        createdAt: now,
        updatedAt: now,
      } as CampaignEvent);
      return id;
    } catch (e) {
      handleError(e as Error, {
        component: 'useCampaignEvents/createCampaignEvent',
        severity: 'medium',
      });
    }
  };

  const updateCampaignEvent = async (
    id: string,
    data: Partial<Pick<CampaignEvent, 'label' | 'scriptId'>>,
  ) => {
    const now = new Date().toISOString();
    try {
      await db.campaignEvents.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useCampaignEvents/updateCampaignEvent',
        severity: 'medium',
      });
    }
  };

  const deleteCampaignEvent = async (id: string) => {
    try {
      await db.campaignEventLocations.where('campaignEventId').equals(id).delete();
      await db.campaignEvents.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCampaignEvents/deleteCampaignEvent',
        severity: 'medium',
      });
    }
  };

  return {
    campaignEvents: campaignEvents ?? [],
    createCampaignEvent,
    updateCampaignEvent,
    deleteCampaignEvent,
  };
};
