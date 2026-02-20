import { useErrorHandler, useNotifications } from '@/hooks';
import { executeArchetypeEvent } from '@/lib/compass-logic/reactive/event-handler-executor';
import { getQBScriptClient } from '@/lib/compass-logic/worker';
import { db, useCurrentUser } from '@/stores';
import type { Archetype, Character, Inventory } from '@/types';
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

  const createCharacter = async (data: Partial<Character> & { archetypeIds?: string[] }) => {
    if (!data.rulesetId || !currentUser) return;
    const now = new Date().toISOString();
    const rulesetId = data.rulesetId;

    try {
      // Resolve archetype IDs: use provided list or fall back to default
      let archetypeIds: string[] = data.archetypeIds ?? [];

      // Use default if none are provided
      if (!archetypeIds.length) {
        const defaultArchetype = await db.archetypes
          .where('rulesetId')
          .equals(rulesetId)
          .filter((a) => a.isDefault)
          .first();

        if (defaultArchetype) {
          archetypeIds = [
            defaultArchetype.id,
            ...archetypeIds.filter((id) => id !== defaultArchetype.id),
          ];
        }
      }

      if (archetypeIds.length === 0) {
        throw new Error('No archetype found for ruleset');
      }

      // Sort by Archetype loadOrder (default is always first at position 0)
      const archetypeRecords = (
        await Promise.all(archetypeIds.map((id) => db.archetypes.get(id)))
      ).filter((a): a is Archetype => a != null);
      archetypeIds = archetypeRecords
        .sort((a, b) => {
          if (a.isDefault) return -1;
          if (b.isDefault) return 1;
          return a.loadOrder - b.loadOrder;
        })
        .map((a) => a.id);

      // Use first archetype for character duplication (template/inventory copy)
      const firstArchetype = await db.archetypes.get(archetypeIds[0]);
      if (!firstArchetype) {
        throw new Error('First archetype not found');
      }
      const testCharacter = await db.characters.get(firstArchetype.testCharacterId);
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

      // Add CharacterArchetype rows in sorted order
      for (let i = 0; i < archetypeIds.length; i++) {
        await db.characterArchetypes.add({
          id: crypto.randomUUID(),
          characterId,
          archetypeId: archetypeIds[i],
          loadOrder: i,
          createdAt: now,
          updatedAt: now,
        });
      }

      await runInitialAttributeSyncSafe(characterId, rulesetId);

      // Run archetype on_add scripts in sorted order
      for (const archetypeId of archetypeIds) {
        const archetype = await db.archetypes.get(archetypeId);
        if (archetype?.scriptId) {
          const archetypeResult = await executeArchetypeEvent(
            db,
            archetype.id,
            characterId,
            'on_add',
          );
          if (archetypeResult.error) {
            console.warn('Archetype on_add script failed:', archetypeResult.error);
          }
        }
      }
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
