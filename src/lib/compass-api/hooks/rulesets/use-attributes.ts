import { db } from '@/stores';
import type { Attribute } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRulesets } from './use-rulesets';

export const useAttributes = () => {
  const { activeRuleset } = useRulesets();

  const attributes = useLiveQuery(
    () =>
      db.attributes
        .where('rulesetId')
        .equals(activeRuleset?.id ?? 0)
        .toArray(),
    [activeRuleset],
  );

  const createAttribute = async (data: Partial<Attribute>) => {
    if (!activeRuleset) return;
    const now = new Date().toISOString();
    await db.attributes.add({
      ...data,
      id: crypto.randomUUID(),
      rulesetId: activeRuleset.id,
      createdAt: now,
      updatedAt: now,
    } as Attribute);
  };

  return { attributes, createAttribute };
};
