import { useActiveRuleset } from '@/lib/compass-api';
import { db } from '@/stores';
import { type Action, type Attribute, type Item } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  ACTION_COLUMNS,
  ATTRIBUTE_COLUMNS,
  ITEM_COLUMNS,
  type ActionWithAssetFilename,
  type AttributeWithAssetFilename,
  type ItemWithAssetFilename,
} from './types';
import { convertToTsv } from './utils';

export const useExport = (type: 'attributes' | 'items' | 'actions') => {
  const { activeRuleset } = useActiveRuleset();

  const data = useLiveQuery<Attribute[] | Item[] | Action[] | undefined>(
    () => {
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
    },
    [activeRuleset, type],
  );

  const exportData = (): string | null => {
    if (!data) {
      return null;
    }

    switch (type) {
      case 'attributes':
        return convertToTsv(data as AttributeWithAssetFilename[], ATTRIBUTE_COLUMNS);
      case 'items':
        return convertToTsv(data as ItemWithAssetFilename[], ITEM_COLUMNS);
      case 'actions':
        return convertToTsv(data as ActionWithAssetFilename[], ACTION_COLUMNS);
      default:
        return null;
    }
  };

  return {
    data: data ?? [],
    exportData,
    isLoading: data === undefined,
  };
};
