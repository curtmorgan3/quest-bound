import { useErrorHandler, useNotifications } from '@/hooks';
import { getQBScriptClient } from '@/lib/compass-logic/worker';
import { db, useCurrentUser } from '@/stores';
import type { Character, Inventory } from '@/types';
import { duplicateCharacterFromTemplate } from '@/utils/duplicate-character-from-template';
import { useLiveQuery } from 'dexie-react-hooks';
import { useParams } from 'react-router-dom';
import { useAssets } from '../assets';

export type CharacterWithInventories = Character & {
  inventory: Inventory;
};

export const useCharacter = (_id?: string) => {
  const { characterId } = useParams();
  const { currentUser } = useCurrentUser();
  const { handleError } = useErrorHandler();
  const { deleteAsset } = useAssets();

  const { addNotification } = useNotifications();

  const characters =
    useLiveQuery(
      () =>
        db.characters
          .where('userId')
          .equals(currentUser?.id ?? 0)
          .toArray(),
      [currentUser],
    ) ?? [];

  const id = _id ?? characterId;

  const character = useLiveQuery(() => db.characters.get(id ?? ''), [id]);

  const runInitialAttributeSyncSafe = async (characterId: string, rulesetId: string) => {
    try {
      const client = getQBScriptClient();
      await client.runInitialAttributeSync(characterId, rulesetId);
    } catch (error) {
      const err = error as Error & { scriptName?: string };
      const scriptInfo = err.scriptName ? ` [script: ${err.scriptName}.qbs]` : '';
      console.warn('Initial reactive script execution failed' + scriptInfo + ':', error);
      addNotification(`Failure in script ${err.scriptName}.qbs | ${error}`, {
        type: 'error',
      });
    }
  };

  const createCharacter = async (data: Partial<Character> & { archetypeId?: string }) => {
    if (!data.rulesetId || !currentUser) return;
    const now = new Date().toISOString();
    const rulesetId = data.rulesetId;

    try {
      // Resolve archetype (default if archetypeId omitted)
      let archetype = data.archetypeId
        ? await db.archetypes.get(data.archetypeId)
        : await db.archetypes
            .where('rulesetId')
            .equals(rulesetId)
            .filter((a) => a.isDefault)
            .first();

      if (!archetype) {
        archetype = await db.archetypes.where('rulesetId').equals(rulesetId).first();
      }
      if (!archetype) {
        throw new Error('No archetype found for ruleset');
      }

      const testCharacter = await db.characters.get(archetype.testCharacterId);
      if (!testCharacter?.inventoryId) {
        throw new Error('Archetype test character has no inventory');
      }

      // Create inventory first so character-hooks skips creation
      const characterId = crypto.randomUUID();
      const inventoryId = crypto.randomUUID();
      await db.inventories.add({
        id: inventoryId,
        characterId,
        rulesetId,
        title: `${data.name ?? 'Character'}'s Inventory`,
        category: null,
        type: null,
        entities: [],
        items: [],
        createdAt: now,
        updatedAt: now,
      } as unknown as Inventory);

      await db.characters.add({
        ...data,
        id: characterId,
        rulesetId,
        userId: currentUser.id,
        inventoryId,
        createdAt: now,
        updatedAt: now,
        isTestCharacter: data.isTestCharacter ?? false,
        componentData: data.componentData ?? {},
        pinnedSidebarDocuments: data.pinnedSidebarDocuments ?? [],
        pinnedSidebarCharts: data.pinnedSidebarCharts ?? [],
        lastViewedPageId: data.lastViewedPageId ?? null,
        sheetLocked: data.sheetLocked ?? false,
      } as Character);

      await duplicateCharacterFromTemplate(testCharacter.id, characterId, inventoryId);

      await db.characterArchetypes.add({
        id: crypto.randomUUID(),
        characterId,
        archetypeId: archetype.id,
        loadOrder: 0,
        createdAt: now,
        updatedAt: now,
      });

      await runInitialAttributeSyncSafe(characterId, rulesetId);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacter/createCharacter',
        severity: 'medium',
      });
    }
  };

  const updateCharacter = async (id: string, data: Partial<Character>) => {
    const now = new Date().toISOString();
    try {
      if (data.assetId === null) {
        const original = await db.characters.get(id);
        if (original?.assetId) {
          await deleteAsset(original.assetId);
        }

        if (!data.image) {
          data.image = null;
        }
      }

      await db.characters.update(id, {
        ...data,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacter/updateCharacter',
        severity: 'medium',
      });
    }
  };

  const deleteCharacter = async (id: string) => {
    try {
      const character = await db.characters.get(id);
      if (!character) return;

      if (character.assetId) {
        await deleteAsset(character.assetId);
      }

      const characterAttributes = await db.characterAttributes
        .where({ characterId: character.id })
        .toArray();
      await db.characterAttributes.bulkDelete(characterAttributes.map((ca) => ca.id));

      await db.characters.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacter/deleteCharacter',
        severity: 'medium',
      });
    }
  };

  const getCharacter = async (id: string): Promise<CharacterWithInventories | null> => {
    try {
      const character = await db.characters.get(id);
      if (!character) return null;

      const inventory = await db.inventories.where('characterId').equals(id).toArray();

      return {
        ...character,
        inventory: inventory[0],
      };
    } catch (e) {
      handleError(e as Error, {
        component: 'useCharacter/getCharacter',
        severity: 'medium',
      });
      return null;
    }
  };

  return {
    characters: characters ?? [],
    character,
    createCharacter,
    updateCharacter,
    deleteCharacter,
    getCharacter,
  };
};
