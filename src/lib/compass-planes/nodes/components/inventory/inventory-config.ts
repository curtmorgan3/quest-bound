import { DEFAULT_GRID_SIZE } from '@/lib/compass-planes/editor-config';
import type { Component, ComponentStyle, InventoryComponentData } from '@/types';
import { ComponentTypes, type SheetComponentType } from '../../node-types';

export const inventoryConfig: SheetComponentType = {
  label: 'Inventory',
  description: 'A space for storing items and actions',
  type: ComponentTypes.INVENTORY,
  minWidth: DEFAULT_GRID_SIZE,
  minHeight: DEFAULT_GRID_SIZE,
  defaultWidth: 5 * DEFAULT_GRID_SIZE,
  defaultHeight: 5 * DEFAULT_GRID_SIZE,
  maxHeight: 100 * DEFAULT_GRID_SIZE,
  maxWidth: 100 * DEFAULT_GRID_SIZE,
  defaultRotation: 0,
  defaultLayer: 2,
  transparent: true,
  scalable: true,
};

const DEFAULT_DATA: InventoryComponentData = {
  cellHeight: 1,
  cellWidth: 1,
};

const DEFAULT_STYLES: ComponentStyle = {
  backgroundColor: 'transparent',
  opacity: 1,
  borderRadiusTopLeft: 0,
  borderRadiusTopRight: 0,
  borderRadiusBottomLeft: 0,
  borderRadiusBottomRight: 0,
  outlineWidth: 1,
  outlineColor: 'transparent',
  outline: 'solid',
  fontSize: 16,
  fontWeight: 'normal',
  fontStyle: 'normal',
  fontFamily: 'Roboto Condensed',
  textDecoration: 'none',
  textAlign: 'start',
  verticalAlign: 'center',
};

export const DEFAULT_INVENTORY: Partial<Component> = {
  z: inventoryConfig.defaultLayer,
  height: inventoryConfig.defaultHeight,
  width: inventoryConfig.defaultWidth,
  rotation: inventoryConfig.defaultRotation,
  data: JSON.stringify(DEFAULT_DATA),
  style: JSON.stringify(DEFAULT_STYLES),
};
