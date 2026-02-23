import type { CustomPropertyType } from '@/types';
import type { DB } from '@/stores/db/hooks/types';

function getTypeDefault(type: CustomPropertyType): string | number | boolean {
  switch (type) {
    case 'number':
      return 0;
    case 'boolean':
      return false;
    case 'color':
      return '';
    default:
      return '';
  }
}

/**
 * Build customProperties object for an item-based InventoryItem.
 * Fetches ItemCustomProperties for the item, resolves CustomProperty records,
 * and returns { [customPropertyId]: defaultValue }.
 */
export async function buildItemCustomProperties(
  db: DB,
  itemId: string,
): Promise<Record<string, string | number | boolean>> {
  const itemCustomProps = await db.itemCustomProperties
    .where('itemId')
    .equals(itemId)
    .toArray();
  const customProperties: Record<string, string | number | boolean> = {};
  for (const icp of itemCustomProps) {
    const cp = await db.customProperties.get(icp.customPropertyId);
    if (cp) {
      const defaultValue =
        icp.defaultValue !== undefined
          ? icp.defaultValue
          : cp.defaultValue !== undefined
            ? cp.defaultValue
            : getTypeDefault(cp.type);
      customProperties[cp.id] = defaultValue;
    }
  }
  return customProperties;
}
