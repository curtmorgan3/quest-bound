import type { InventoryItemWithData } from '@/stores';

export type BaseDetails = {
  id: string;
  createdAt: string;
  updatedAt: string;
};

export type Coordinates = {
  x: number;
  y: number;
};

export type Dimensions = {
  height: number;
  width: number;
};

export type InventoryItemType = 'item' | 'action' | 'attribute';

export type InventoryListRow = {
  type: 'entry';
  entry: InventoryItemWithData;
  estimatedSize: number;
};
