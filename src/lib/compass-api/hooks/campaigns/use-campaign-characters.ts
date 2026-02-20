import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { CampaignCharacter } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

export const useCampaignCharacters = (campaignId: string | undefined) => {
  const { handleError } = useErrorHandler();

  const campaignCharacters = useLiveQuery(
    async (): Promise<CampaignCharacter[]> =>
      campaignId
        ? db.campaignCharacters.where('campaignId').equals(campaignId).toArray()
        : [],
    [campaignId],
  );

  const createCampaignCharacter = async (
    campaignId: string,
    characterId: string,
    data?: { currentLocationId?: string; currentTileId?: string },
  ) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    try {
      await db.campaignCharacters.add({
        id,
        campaignId,
        characterId,
        currentLocationId: data?.currentLocationId ?? null,
        currentTileId: data?.currentTileId ?? null,
        createdAt: now,
        updatedAt: now,
      } as CampaignCharacter);
      return id;
    } catch (e) {
      handleError(e as Error, {
        component: 'useCampaignCharacters/createCampaignCharacter',
        severity: 'medium',
      });
    }
  };

  const updateCampaignCharacter = async (
    id: string,
    data: Partial<Pick<CampaignCharacter, 'currentLocationId' | 'currentTileId'>>,
  ) => {
    const now = new Date().toISOString();
    try {
      await db.campaignCharacters.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useCampaignCharacters/updateCampaignCharacter',
        severity: 'medium',
      });
    }
  };

  const deleteCampaignCharacter = async (id: string) => {
    try {
      await db.campaignCharacters.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCampaignCharacters/deleteCampaignCharacter',
        severity: 'medium',
      });
    }
  };

  return {
    campaignCharacters: campaignCharacters ?? [],
    createCampaignCharacter,
    updateCampaignCharacter,
    deleteCampaignCharacter,
  };
};
