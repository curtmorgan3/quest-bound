import { db, useCurrentUser } from '@/stores';
import type { Ruleset } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

export const useRulesets = () => {
  const { currentUser } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const rulesets = useLiveQuery(() => db.rulesets.toArray(), []);

  const { rulesetId } = useParams();
  const lastEditedRulesetId = localStorage.getItem('qb.lastEditedRulesetId');
  const rulesetIdToUse = rulesetId && rulesetId !== 'undefined' ? rulesetId : lastEditedRulesetId;

  const activeRuleset = rulesetId ? rulesets?.find((r) => r.id === rulesetIdToUse) : null;

  const createRuleset = async (data: Partial<Ruleset>) => {
    setLoading(true);

    const id = await db.rulesets.add({
      id: crypto.randomUUID(),
      title: 'New Ruleset',
      description: '',
      details: {},
      image: null,
      version: '0.1.0',
      createdBy: currentUser?.username || 'unknown',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...data,
    });

    localStorage.setItem('qb.lastEditedRulesetId', id.toString());
    setLoading(false);
  };

  const updateRuleset = async (id: string, updates: Partial<Ruleset>) => {
    setLoading(true);
    await db.rulesets.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    setLoading(false);
  };

  const deleteRuleset = async (id: string) => {
    setLoading(true);
    await db.rulesets.delete(id);
    await db.attributes.where('rulesetId').equals(id).delete();
    localStorage.removeItem('qb.lastEditedRulesetId');
    setLoading(false);
  };

  return {
    rulesets,
    activeRuleset,
    loading,
    createRuleset,
    deleteRuleset,
    updateRuleset,
  };
};
