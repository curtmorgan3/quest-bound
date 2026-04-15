import type { InventoryItem } from './data-model-types';

/** Inventory row enriched with resolved entity metadata (UI / drag contexts). */
export type InventoryItemWithData = InventoryItem & {
  image?: string | null;
  title: string;
  description?: string;
  /** Category inherited from the referenced item/action/attribute, when present. */
  category?: string;
  inventoryWidth: number;
  inventoryHeight: number;
  stackSize: number;
  isEquippable: boolean;
  isConsumable: boolean;
  weight: number;
  customProperties: Record<string, unknown>;
  /** Present when type is 'attribute': the character's current value for this attribute. */
  value?: string | number | boolean;
};

export type InventoryListRow = {
  type: 'entry';
  entry: InventoryItemWithData;
  estimatedSize: number;
};
