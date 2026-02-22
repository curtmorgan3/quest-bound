import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { Campaign } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export const useCampaigns = (filters?: { rulesetId?: string; worldId?: string }) => {
  const { handleError } = useErrorHandler();

  const campaigns = useLiveQuery(
    async () => {
      let collection = db.campaigns.toCollection();
      if (filters?.rulesetId) {
        const arr = await db.campaigns.where('rulesetId').equals(filters.rulesetId).toArray();
        return filters.worldId ? arr.filter((c) => c.worldId === filters.worldId) : arr;
      }
      if (filters?.worldId) {
        return db.campaigns.where('worldId').equals(filters.worldId).toArray();
      }
      return collection.toArray();
    },
    [filters?.rulesetId, filters?.worldId],
  );

  const createCampaign = async (data: { rulesetId: string; worldId: string; label?: string }) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    try {
      await db.campaigns.add({
        id,
        rulesetId: data.rulesetId,
        worldId: data.worldId,
        label: data.label ?? undefined,
        createdAt: now,
        updatedAt: now,
      } as Campaign);
      return id;
    } catch (e) {
      handleError(e as Error, {
        component: 'useCampaigns/createCampaign',
        severity: 'medium',
      });
    }
  };

  const updateCampaign = async (id: string, data: Partial<Campaign>) => {
    const now = new Date().toISOString();
    try {
      await db.campaigns.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useCampaigns/updateCampaign',
        severity: 'medium',
      });
    }
  };

  const deleteCampaign = async (id: string) => {
    try {
      await db.campaignCharacters.where('campaignId').equals(id).delete();
      await db.campaignItems.where('campaignId').equals(id).delete();
      const events = await db.campaignEvents.where('campaignId').equals(id).toArray();
      for (const e of events) {
        await db.campaignEventLocations.where('campaignEventId').equals(e.id).delete();
      }
      await db.campaignEvents.where('campaignId').equals(id).delete();
      await db.campaigns.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCampaigns/deleteCampaign',
        severity: 'medium',
      });
    }
  };

  return {
    campaigns: campaigns ?? [],
    createCampaign,
    updateCampaign,
    deleteCampaign,
  };
};
