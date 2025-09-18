import { useError } from '@/hooks';
import { db, useCurrentUser } from '@/stores';
import type { Ruleset } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { useParams } from 'react-router-dom';

export const useRulesets = () => {
  const { currentUser } = useCurrentUser();
  const [loading, setLoading] = useState(false);
  const [error] = useState<Error | undefined>();
  const rulesets = useLiveQuery(() => db.rulesets.toArray(), []);

  const { rulesetId } = useParams();

  const activeRuleset = rulesetId ? rulesets?.find((r) => r.id === parseInt(rulesetId)) : null;

  useError({
    error,
    message: error?.message || 'Error in useUsers',
    location: 'useUsers',
    context: { error },
  });

  const createRuleset = async (data: Partial<Ruleset>) => {
    setLoading(true);

    const id = await db.rulesets.add({
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

  const deleteRuleset = async (id: number) => {
    setLoading(true);
    await db.rulesets.delete(id);
    setLoading(false);
  };

  return {
    rulesets,
    activeRuleset,
    loading,
    error,
    createRuleset,
    deleteRuleset,
  };
};
