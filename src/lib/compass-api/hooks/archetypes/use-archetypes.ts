import { useErrorHandler } from '@/hooks/use-error-handler';
import { db, useCurrentUser } from '@/stores';
import type { Archetype, Character, Inventory } from '@/types';
import { duplicateCharacterFromTemplate } from '@/utils/duplicate-character-from-template';
import { useLiveQuery } from 'dexie-react-hooks';

export const useArchetypes = (rulesetId: string | undefined) => {
  const { handleError } = useErrorHandler();
  const { currentUser } = useCurrentUser();

  const archetypes: Archetype[] =
    useLiveQuery(
      () =>
        rulesetId
          ? db.archetypes.where('rulesetId').equals(rulesetId).sortBy('loadOrder')
          : Promise.resolve([] as Archetype[]),
      [rulesetId],
    ) ?? [];

  const createArchetype = async (data: {
    name: string;
    description?: string;
    assetId?: string | null;
    image?: string | null;
  }) => {
    if (!rulesetId || !currentUser) return;
    const now = new Date().toISOString();

    try {
      const defaultArchetype = await db.archetypes
        .where('rulesetId')
        .equals(rulesetId)
        .filter((a) => a.isDefault)
        .first();
      if (!defaultArchetype) throw new Error('No default archetype found');
      const sourceCharacter = await db.characters.get(defaultArchetype.testCharacterId);
      if (!sourceCharacter?.inventoryId) throw new Error('Default archetype has no test character');

      const characterId = crypto.randomUUID();
      const inventoryId = crypto.randomUUID();
      await db.inventories.add({
        id: inventoryId,
        characterId,
        rulesetId,
        title: `Test Character (${data.name})`,
        category: null,
        type: null,
        entities: [],
        items: [],
        createdAt: now,
        updatedAt: now,
      } as unknown as Inventory);

      await db.characters.add({
        id: characterId,
        rulesetId,
        userId: currentUser.username,
        inventoryId,
        name: `Test Character (${data.name})`,
        assetId: null,
        image: null,
        isTestCharacter: true,
        componentData: {},
        pinnedSidebarDocuments: [],
        pinnedSidebarCharts: [],
        lastViewedPageId: null,
        sheetLocked: false,
        createdAt: now,
        updatedAt: now,
      } as Character);

      await duplicateCharacterFromTemplate(
        sourceCharacter.id,
        characterId,
        inventoryId,
      );

      const allArchetypes = await db.archetypes.where('rulesetId').equals(rulesetId).toArray();
      const maxLoadOrder = allArchetypes.length > 0
        ? Math.max(...allArchetypes.map((a) => a.loadOrder), -1)
        : -1;

      await db.archetypes.add({
        id: crypto.randomUUID(),
        rulesetId,
        name: data.name,
        description: data.description ?? '',
        assetId: data.assetId ?? null,
        image: data.image ?? null,
        testCharacterId: characterId,
        isDefault: false,
        loadOrder: maxLoadOrder + 1,
        createdAt: now,
        updatedAt: now,
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useArchetypes/createArchetype',
        severity: 'medium',
      });
    }
  };

  const updateArchetype = async (id: string, updates: Partial<Pick<Archetype, 'name' | 'description' | 'assetId' | 'image' | 'scriptId'>>) => {
    try {
      await db.archetypes.update(id, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useArchetypes/updateArchetype',
        severity: 'medium',
      });
    }
  };

  const deleteArchetype = async (id: string) => {
    try {
      await db.archetypes.delete(id);
    } catch (e) {
      handleError(e as Error, {
        component: 'useArchetypes/deleteArchetype',
        severity: 'medium',
      });
    }
  };

  const reorderArchetypes = async (orderedIds: string[]) => {
    try {
      for (let i = 0; i < orderedIds.length; i++) {
        await db.archetypes.update(orderedIds[i], { loadOrder: i, updatedAt: new Date().toISOString() });
      }
    } catch (e) {
      handleError(e as Error, {
        component: 'useArchetypes/reorderArchetypes',
        severity: 'medium',
      });
    }
  };

  return {
    archetypes,
    createArchetype,
    updateArchetype,
    deleteArchetype,
    reorderArchetypes,
  };
};
