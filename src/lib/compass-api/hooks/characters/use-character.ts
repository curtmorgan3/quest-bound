import { useErrorHandler } from '@/hooks';
import { db, useCurrentUser } from '@/stores';
import type {
  Character,
  CharacterAttribute,
  CharacterPage,
  CharacterWindow,
  Inventory,
} from '@/types';
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

  const bootstrapCharacterAttributes = async (characterId: string, rulesetId: string) => {
    const rulesetAttributes = await db.attributes.where({ rulesetId }).toArray();
    const characterAttributes: CharacterAttribute[] = [];
    for (const attribute of rulesetAttributes) {
      characterAttributes.push({
        ...attribute,
        characterId,
        attributeId: attribute.id,
        value: attribute.defaultValue,
      });
    }

    const now = new Date().toISOString();

    await db.characterAttributes.bulkAdd(
      characterAttributes.map((ca) => ({
        ...ca,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      })),
    );
  };

  /**
   * For each ruleset page, create a character page (copy page from ruleset, add character-page join).
   * For each ruleset window, create a character window (using ruleset window layout).
   */
  const bootstrapCharacterPagesAndWindows = async (newCharacterId: string, rulesetId: string) => {
    const rulesetPageJoins = await db.rulesetPages
      .where('rulesetId')
      .equals(rulesetId)
      .sortBy('createdAt');

    const rulesetPageIdToCharacterPageId = new Map<string, string>();
    const now = new Date().toISOString();

    for (const rp of rulesetPageJoins) {
      const sourcePage = await db.pages.get(rp.pageId);
      if (!sourcePage) continue;
      const newPageId = crypto.randomUUID();
      const newCharacterPageId = crypto.randomUUID();
      rulesetPageIdToCharacterPageId.set(rp.id, newCharacterPageId);
      const { id: _id, createdAt: _c, updatedAt: _u, ...pageRest } = sourcePage;
      await db.pages.add({
        ...pageRest,
        id: newPageId,
        createdAt: now,
        updatedAt: now,
      });
      await db.characterPages.add({
        id: newCharacterPageId,
        characterId: newCharacterId,
        pageId: newPageId,
        createdAt: now,
        updatedAt: now,
      } as CharacterPage);
    }

    const rulesetWindows = await db.rulesetWindows
      .where('rulesetId')
      .equals(rulesetId)
      .toArray();

    for (const rw of rulesetWindows) {
      const characterPageId = rw.rulesetPageId
        ? rulesetPageIdToCharacterPageId.get(rw.rulesetPageId) ?? null
        : null;
      await db.characterWindows.add({
        id: crypto.randomUUID(),
        characterId: newCharacterId,
        characterPageId,
        windowId: rw.windowId,
        title: rw.title,
        x: rw.x,
        y: rw.y,
        isCollapsed: rw.isCollapsed,
        createdAt: now,
        updatedAt: now,
      } as CharacterWindow);
    }
  };

  const createCharacter = async (data: Partial<Character>) => {
    if (!data.rulesetId || !currentUser) return;
    const now = new Date().toISOString();
    try {
      const id = await db.characters.add({
        ...data,
        id: crypto.randomUUID(),
        userId: currentUser.id,
        createdAt: now,
        updatedAt: now,
        isTestCharacter: data.isTestCharacter ?? false,
        componentData: new Map(),
        pinnedSidebarDocuments: data.pinnedSidebarDocuments ?? [],
        pinnedSidebarCharts: data.pinnedSidebarCharts ?? [],
        lastViewedPageId: data.lastViewedPageId ?? null,
        sheetLocked: data.sheetLocked ?? false,
      } as Character);

      await bootstrapCharacterAttributes(id, data.rulesetId);
      await bootstrapCharacterPagesAndWindows(id, data.rulesetId);
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
