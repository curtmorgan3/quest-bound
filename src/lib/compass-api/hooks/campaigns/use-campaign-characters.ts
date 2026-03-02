import { useErrorHandler } from '@/hooks';
import { db } from '@/stores';
import type { CampaignCharacter } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useCharacter } from '../characters/use-character';

export const useCampaignCharacters = (campaignId: string | undefined) => {
  const { handleError } = useErrorHandler();
  const { deleteCharacter } = useCharacter();

  const campaignCharacters = useLiveQuery(
    async (): Promise<CampaignCharacter[]> =>
      campaignId ? db.campaignCharacters.where('campaignId').equals(campaignId).toArray() : [],
    [campaignId],
  );

  const createCampaignCharacter = async (
    campaignId: string,
    characterId: string,
    data?: {
      campaignSceneId?: string;
      currentLocationId?: string;
      currentTileId?: string;
      active?: boolean;
    },
  ) => {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    try {
      const characterArchetypes = await db.characterArchetypes
        .where('characterId')
        .equals(characterId)
        .sortBy('loadOrder');
      const firstArchetypeId = characterArchetypes[0]?.archetypeId;
      const archetype = firstArchetypeId ? await db.archetypes.get(firstArchetypeId) : null;

      await db.campaignCharacters.add({
        id,
        campaignId,
        characterId,
        campaignSceneId: data?.campaignSceneId,
        currentLocationId: data?.currentLocationId ?? null,
        currentTileId: data?.currentTileId ?? null,
        mapWidth: archetype?.mapWidth,
        mapHeight: archetype?.mapHeight,
        active: data?.active,
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
    data: Partial<
      Pick<CampaignCharacter, 'active' | 'campaignSceneId' | 'currentLocationId' | 'currentTileId' | 'mapHeight' | 'mapWidth'>
    >,
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
      const campaignCharacter = await db.campaignCharacters.get(id);
      const characterId = campaignCharacter?.characterId;
      await db.campaignCharacters.delete(id);
      if (characterId) {
        const character = await db.characters.get(characterId);
        if (character?.isNpc) {
          await deleteCharacter(characterId);
        }
      }
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
