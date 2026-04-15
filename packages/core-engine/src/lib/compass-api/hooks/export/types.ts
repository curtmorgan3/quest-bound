import type { Action, Attribute, Item } from '@/types';

// Field type definitions for parsing TSV values
export type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'attributeType';

export const ATTRIBUTE_FIELD_TYPES: Record<string, FieldType> = {
  id: 'string',
  title: 'string',
  description: 'string',
  category: 'string',
  type: 'attributeType',
  options: 'array',
  defaultValue: 'string', // Will be converted based on attribute type
  optionsChartRef: 'number',
  optionsChartColumnHeader: 'string',
  min: 'number',
  max: 'number',
  inventoryHeight: 'number',
  inventoryWidth: 'number',
  image: 'string',
  customProperties: 'string',
  assetFilename: 'string',
};

export type AttributeWithAssetFilename = Attribute & { assetFilename?: string };

export const ATTRIBUTE_COLUMNS: (keyof AttributeWithAssetFilename)[] = [
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
  'inventoryWidth',
  'inventoryHeight',
  'image',
  'customProperties',
  'assetFilename',
];

/** TSV export/import: links rows to `application data/assets.json` + `assets/` paths. */
export type ItemWithAssetFilename = Item & { assetFilename?: string };
export type ActionWithAssetFilename = Action & { assetFilename?: string };

export const ITEM_FIELD_TYPES: Record<string, FieldType> = {
  id: 'string',
  title: 'string',
  description: 'string',
  category: 'string',
  weight: 'number',
  defaultQuantity: 'number',
  stackSize: 'number',
  isContainer: 'boolean',
  isStorable: 'boolean',
  isEquippable: 'boolean',
  isConsumable: 'boolean',
  inventoryWidth: 'number',
  inventoryHeight: 'number',
  image: 'string',
  actionIds: 'array',
  assetFilename: 'string',
};

export const ITEM_COLUMNS: (keyof ItemWithAssetFilename)[] = [
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
  'actionIds',
  'assetFilename',
];

export const ACTION_FIELD_TYPES: Record<string, FieldType> = {
  id: 'string',
  title: 'string',
  description: 'string',
  category: 'string',
  inventoryHeight: 'number',
  inventoryWidth: 'number',
  image: 'string',
  customProperties: 'string',
  assetFilename: 'string',
};

export const ACTION_COLUMNS: (keyof ActionWithAssetFilename)[] = [
  'id',
  'title',
  'description',
  'category',
  'inventoryHeight',
  'inventoryWidth',
  'image',
  'customProperties',
  'assetFilename',
];
