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
};

export const ATTRIBUTE_COLUMNS: (keyof Attribute)[] = [
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
];

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
};

export const ITEM_COLUMNS: (keyof Item)[] = [
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

export const ACTION_FIELD_TYPES: Record<string, FieldType> = {
  id: 'string',
  title: 'string',
  description: 'string',
  category: 'string',
  inventoryHeight: 'number',
  inventoryWidth: 'number',
  image: 'string',
};

export const ACTION_COLUMNS: (keyof Action)[] = [
  'id',
  'title',
  'description',
  'category',
  'inventoryHeight',
  'inventoryWidth',
  'image',
];

// Extended types that include assetFilename for export
export type ItemWithAssetFilename = Item & { assetFilename?: string };
export type ActionWithAssetFilename = Action & { assetFilename?: string };
