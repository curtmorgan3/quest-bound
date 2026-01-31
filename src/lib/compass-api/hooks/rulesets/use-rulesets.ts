import { useErrorHandler } from '@/hooks/use-error-handler';
import { db, useCurrentUser } from '@/stores';
import type { Ruleset } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAssets } from '../assets';
import { useCharacter } from '../characters';

export const useRulesets = () => {
  const { currentUser } = useCurrentUser();
  const { deleteAsset } = useAssets();

  const [loading, setLoading] = useState(false);
  const _rulesets = useLiveQuery(() => db.rulesets.toArray(), []);
  const rulesets = _rulesets?.filter((r) => currentUser?.rulesets?.includes(r.id)) || [];

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
        updates.image = null;
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
    createRuleset,
    deleteRuleset,
    updateRuleset,
  };
};
