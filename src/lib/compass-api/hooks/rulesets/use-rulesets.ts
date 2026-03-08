import { useErrorHandler } from '@/hooks/use-error-handler';
import {
  db,
  deleteAssetIfUnreferenced,
  useApiLoadingStore,
  useArchetypeStore,
  useCurrentUser,
} from '@/stores';
import type { Archetype, Character, Inventory, Ruleset } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useCharacter } from '../characters';

export const useRulesets = () => {
  const { currentUser } = useCurrentUser();

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

  const archetypes: Archetype[] =
    useLiveQuery(
      () =>
        activeRuleset?.id
          ? db.archetypes.where('rulesetId').equals(activeRuleset.id).sortBy('loadOrder')
          : Promise.resolve([] as Archetype[]),
      [activeRuleset?.id],
    ) ?? [];

  const { getSelectedArchetype, setSelectedArchetype } = useArchetypeStore();
  const selectedArchetypeId = activeRuleset?.id ? getSelectedArchetype(activeRuleset.id) : null;

  const effectiveArchetype = useMemo(() => {
    if (!archetypes.length) return null;
    const selected = selectedArchetypeId
      ? archetypes.find((a) => a.id === selectedArchetypeId)
      : null;
    return selected ?? archetypes.find((a) => a.isDefault) ?? archetypes[0];
  }, [archetypes, selectedArchetypeId]);

  const testCharacter = useLiveQuery(
    () =>
      effectiveArchetype?.testCharacterId
        ? db.characters.get(effectiveArchetype.testCharacterId)
        : Promise.resolve(null),
    [effectiveArchetype?.testCharacterId],
  ) as Character | null | undefined;

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
          const existingArchetype = await db.characterArchetypes.where({
            characterId: testChar.id,
          });
          if (!existingArchetype) {
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
        characterCtaTitle: 'Characters',
        characterCtaDescription: 'Create and Manage Characters for this Ruleset',
        campaignsCtaTitle: 'Campaigns',
        campaignCtaDescription: 'Create and Launch a Campaign for this Ruleset',
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
      const original = await db.rulesets.get(id);
      if (updates.assetId === null && original?.assetId) {
        await deleteAssetIfUnreferenced(db, original.assetId);
        if (!updates.image) {
          updates.image = null;
        }
      }
      if (updates.charactersCtaAssetId === null && original?.charactersCtaAssetId) {
        await deleteAssetIfUnreferenced(db, original.charactersCtaAssetId);
      }
      if (updates.campaignsCtaAssetId === null && original?.campaignsCtaAssetId) {
        await deleteAssetIfUnreferenced(db, original.campaignsCtaAssetId);
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

  const resetTestCharacter = async (targetRulesetId?: string) => {
    const id = targetRulesetId ?? activeRuleset?.id;
    if (!id) return;

    try {
      const defaultArchetype = await db.archetypes
        .where('rulesetId')
        .equals(id)
        .filter((a) => a.isDefault)
        .first();

      if (!defaultArchetype?.testCharacterId) return;

      const testChar = await db.characters.get(defaultArchetype.testCharacterId);
      if (!testChar?.isTestCharacter) return;

      const rulesetAttributes = await db.attributes.where('rulesetId').equals(id).toArray();
      const characterAttributes = await db.characterAttributes
        .where('characterId')
        .equals(testChar.id)
        .toArray();

      const byAttributeId = new Map(characterAttributes.map((ca) => [ca.attributeId, ca]));
      const now = new Date().toISOString();

      for (const attr of rulesetAttributes) {
        const charAttr = byAttributeId.get(attr.id);
        if (charAttr) {
          await db.characterAttributes.update(charAttr.id, {
            value: attr.defaultValue,
            updatedAt: now,
          });
        }
      }
    } catch (e) {
      handleError(e as Error, {
        component: 'useRulesets/resetTestCharacter',
        severity: 'medium',
      });
    }
  };

  return {
    rulesets,
    activeRuleset,
    testCharacter,
    archetypes,
    effectiveArchetype,
    selectedArchetypeId,
    setSelectedArchetype: (id: string | null) =>
      activeRuleset?.id && setSelectedArchetype(activeRuleset.id, id),
    loading,
    isLoading,
    createRuleset,
    deleteRuleset,
    updateRuleset,
    resetTestCharacter,
  };
};
