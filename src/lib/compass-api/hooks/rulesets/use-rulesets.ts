import { useErrorHandler } from '@/hooks/use-error-handler';
import { db, useApiLoadingStore, useCurrentUser } from '@/stores';
import type { Inventory, Ruleset } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAssets } from '../assets';
import { useCharacter } from '../characters';

export const useRulesets = () => {
  const { currentUser } = useCurrentUser();
  const { deleteAsset } = useAssets();

  const [loading, setLoading] = useState(false);
  const _rulesets = useLiveQuery(() => db.rulesets.toArray(), []);
  const rulesets = _rulesets?.filter((r) => currentUser?.rulesets?.includes(r.id)) || [];

  const isLoading = _rulesets === undefined;
  useEffect(() => {
    useApiLoadingStore.getState().setLoading('rulesets', isLoading);
  }, [isLoading]);

  const { handleError } = useErrorHandler();

  const { rulesetId, characterId } = useParams();
  const { character } = useCharacter(characterId);

  const lastEditedRulesetId = localStorage.getItem('qb.lastEditedRulesetId');

  const rulesetIdToUse =
    rulesetId && rulesetId !== 'undefined'
      ? rulesetId
      : character
        ? character.rulesetId
        : lastEditedRulesetId;

  const activeRuleset = rulesetIdToUse ? rulesets?.find((r) => r.id === rulesetIdToUse) : null;

  const testCharacters =
    useLiveQuery(
      () =>
        db.characters
          .where('rulesetId')
          .equals(activeRuleset?.id ?? 0)
          .and((char) => char.isTestCharacter)
          .toArray(),
      [activeRuleset],
    ) ?? [];

  // There should only be one test character
  const testCharacter = testCharacters[0];

  // Migrate legacy rulesets: ensure exactly one default archetype when ruleset is activated
  useEffect(() => {
    const rulesetId = activeRuleset?.id;
    if (!rulesetId) return;

    const migrateDefaultArchetype = async () => {
      try {
        const count = await db.archetypes.where('rulesetId').equals(rulesetId).count();
        if (count > 0) return;

        let testChar = await db.characters
          .where('rulesetId')
          .equals(rulesetId)
          .filter((c) => c.isTestCharacter)
          .first();

        if (!testChar && currentUser) {
          const now = new Date().toISOString();
          const characterId = crypto.randomUUID();
          const ruleset = await db.rulesets.get(rulesetId);
          const inventoryId = crypto.randomUUID();
          await db.inventories.add({
            id: inventoryId,
            characterId,
            rulesetId,
            title: "Test Character's Inventory",
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
            userId: ruleset?.createdBy ?? currentUser.username,
            inventoryId,
            name: 'Test Character',
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
          });
          testChar = await db.characters.get(characterId);
        }

        if (testChar) {
          const now = new Date().toISOString();
          await db.archetypes.add({
            id: crypto.randomUUID(),
            rulesetId,
            name: 'Default',
            description: '',
            testCharacterId: testChar.id,
            isDefault: true,
            loadOrder: 0,
            createdAt: now,
            updatedAt: now,
          });
        }
      } catch (err) {
        console.warn('Default archetype migration failed:', err);
      }
    };

    migrateDefaultArchetype();
  }, [activeRuleset?.id, currentUser?.username]);

  const createRuleset = async (data: Partial<Ruleset>) => {
    setLoading(true);

    try {
      const id = await db.rulesets.add({
        id: crypto.randomUUID(),
        title: 'New Ruleset',
        description: '',
        details: {},
        image: null,
        assetId: null,
        version: '0.1.0',
        palette: [],
        createdBy: currentUser?.username || 'unknown',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...data,
      });
      localStorage.setItem('qb.lastEditedRulesetId', id.toString());
      if (currentUser) {
        const updatedRulesetIds = Array.from(new Set([...(currentUser.rulesets || []), id]));
        await db.users.update(currentUser.id, { rulesets: updatedRulesetIds });
      }
      // Note: test character is created automatically via db hook

      return id;
    } catch (e) {
      handleError(e as Error, {
        component: 'useRulesets/createRuleset',
        severity: 'medium',
      });
    } finally {
      setLoading(false);
    }
    return '';
  };

  const updateRuleset = async (id: string, updates: Partial<Ruleset>) => {
    setLoading(true);
    try {
      if (updates.assetId === null) {
        const original = await db.rulesets.get(id);
        if (original?.assetId) {
          await deleteAsset(original.assetId);
        }

        if (!updates.image) {
          updates.image = null;
        }
      }

      await db.rulesets.update(id, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      handleError(e as Error, {
        component: 'useRulesets/updateRuleset',
        severity: 'medium',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteRuleset = async (id: string) => {
    setLoading(true);
    try {
      await db.rulesets.delete(id);
      // Note: associated entities and test character are deleted automatically via db hook

      if (activeRuleset?.id === id) {
        localStorage.removeItem('qb.lastEditedRulesetId');
      }
    } catch (e) {
      handleError(e as Error, {
        component: 'useRulesets/deleteRuleset',
        severity: 'medium',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    rulesets,
    activeRuleset,
    testCharacter,
    loading,
    isLoading,
    createRuleset,
    deleteRuleset,
    updateRuleset,
  };
};
