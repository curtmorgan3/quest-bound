import type { CustomPropertyType } from '@/types';
import type { DB } from '@/stores/db/hooks/types';

function getTypeDefault(type: CustomPropertyType): string | number | boolean {
  switch (type) {
    case 'number':
      return 0;
    case 'boolean':
      return false;
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
  const customProps = await Promise.all(
    itemCustomProps.map((icp) => db.customProperties.get(icp.customPropertyId)),
  );
  const customProperties: Record<string, string | number | boolean> = {};
  for (const cp of customProps) {
    if (cp) {
      const defaultValue =
        cp.defaultValue !== undefined
          ? cp.defaultValue
          : getTypeDefault(cp.type);
      customProperties[cp.id] = defaultValue;
    }
  }
  return customProperties;
}
