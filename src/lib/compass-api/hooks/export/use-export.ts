import { useActiveRuleset } from '@/lib/compass-api';
import { db } from '@/stores';
import { type Action, type Attribute, type Item } from '@/types';
import { useLiveQuery } from 'dexie-react-hooks';

function isImageUrl(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  return value.startsWith('http://') || value.startsWith('https://');
}

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
  'image',
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
  'image',
];

const ACTION_COLUMNS: (keyof Action)[] = ['id', 'title', 'description', 'category', 'image'];

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
 * Converts an array of objects to TSV format.
 * For the 'image' column, only includes the value when it is a URL (http/https).
 */
function convertToTsv<T extends Record<string, unknown>>(
  data: T[],
  columns: (keyof T)[],
  imageColumn: keyof T = 'image',
): string {
  // Create header row
  const header = columns.join('\t');

  // Create data rows; for image column, only include value when it's a URL
  const rows = data.map((item) =>
    columns
      .map((col) => {
        const value = item[col];
        if (col === imageColumn && columns.includes(imageColumn)) {
          return isImageUrl(value as string) ? escapeTsvValue(value) : '';
        }
        return escapeTsvValue(value);
      })
      .join('\t'),
  );

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
