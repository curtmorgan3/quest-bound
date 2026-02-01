import { useActiveRuleset } from '@/lib/compass-api';
import { db } from '@/stores';
import { type Action, type Attribute, type Item } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

// Define the columns to export for each type
const ATTRIBUTE_COLUMNS: (keyof Attribute)[] = [
  'id',
  'title',
  'description',
  'category',
  'type',
  'options',
  'defaultValue',
  'optionsChartRef',
  'optionsChartColumnHeader',
  'min',
  'max',
];

const ITEM_COLUMNS: (keyof Item)[] = [
  'id',
  'title',
  'description',
  'category',
  'weight',
  'defaultQuantity',
  'stackSize',
  'isContainer',
  'isStorable',
  'isEquippable',
  'isConsumable',
  'inventoryWidth',
  'inventoryHeight',
];

const ACTION_COLUMNS: (keyof Action)[] = ['id', 'title', 'description', 'category'];

/**
 * Escapes a value for TSV format.
 * - Converts arrays to pipe-separated strings
 * - Converts booleans to "true"/"false"
 * - Escapes tabs and newlines
 * - Handles undefined/null as empty string
 */
function escapeTsvValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map((v) => String(v)).join('|');
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  const str = String(value);
  // Replace tabs and newlines to preserve TSV structure
  return str.replace(/\t/g, '    ').replace(/\n/g, '\\n').replace(/\r/g, '');
}

/**
 * Converts an array of objects to TSV format
 */
function convertToTsv<T extends Record<string, unknown>>(data: T[], columns: (keyof T)[]): string {
  // Create header row
  const header = columns.join('\t');

  // Create data rows
  const rows = data.map((item) => columns.map((col) => escapeTsvValue(item[col])).join('\t'));

  return [header, ...rows].join('\n');
}

export const useExport = (type: 'attributes' | 'items' | 'actions') => {
  const { activeRuleset } = useActiveRuleset();

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

  const exportData = (): string | null => {
    if (!data || data.length === 0) {
      return null;
    }

    switch (type) {
      case 'attributes':
        return convertToTsv(data as Attribute[], ATTRIBUTE_COLUMNS);
      case 'items':
        return convertToTsv(data as Item[], ITEM_COLUMNS);
      case 'actions':
        return convertToTsv(data as Action[], ACTION_COLUMNS);
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
