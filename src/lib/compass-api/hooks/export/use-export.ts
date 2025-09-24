import { useRulesets } from '@/lib/compass-api';
import { db } from '@/stores';
import { useLiveQuery } from 'dexie-react-hooks';

export const useExport = (type: 'attributes' | 'items' | 'actions') => {
  const { activeRuleset } = useRulesets();

  const data = useLiveQuery(() => {
    if (!activeRuleset) return [];

    switch (type) {
      case 'attributes':
        return db.attributes.where('rulesetId').equals(activeRuleset.id).toArray();
      case 'items':
        return db.items.where('rulesetId').equals(activeRuleset.id).toArray();
      case 'actions':
        return db.actions.where('rulesetId').equals(activeRuleset.id).toArray();
      default:
        return [];
    }
  }, [activeRuleset, type]);

  const exportData = () => {
    if (!data || data.length === 0) {
      return null;
    }

    const exportPayload = {
      type,
      rulesetId: activeRuleset?.id,
      rulesetTitle: activeRuleset?.title,
      exportedAt: new Date().toISOString(),
      count: data.length,
      data,
    };

    return exportPayload;
  };

  return {
    data: data ?? [],
    exportData,
    isLoading: data === undefined,
  };
};
