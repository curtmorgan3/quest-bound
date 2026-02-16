import { DEFAULT_GRID_SIZE } from '@/lib/compass-planes/editor-config';
import { colorWhite } from '@/palette';
import type { Component, ComponentStyle, InventoryComponentData } from '@/types';
import { ComponentTypes, type SheetComponentType } from '../../node-types';

export const inventoryConfig: SheetComponentType = {
  label: 'Inventory',
  description: 'A space for storing items, attributes and actions',
  type: ComponentTypes.INVENTORY,
  minWidth: DEFAULT_GRID_SIZE,
  minHeight: DEFAULT_GRID_SIZE,
  defaultWidth: 6 * DEFAULT_GRID_SIZE + 1,
  defaultHeight: 4 * DEFAULT_GRID_SIZE + 1,
  maxHeight: 100 * DEFAULT_GRID_SIZE,
  maxWidth: 100 * DEFAULT_GRID_SIZE,
  defaultRotation: 0,
  defaultLayer: 2,
  transparent: true,
  scalable: true,
};

const DEFAULT_DATA: InventoryComponentData = {
  cellHeight: 2,
  cellWidth: 2,
};

const DEFAULT_STYLES: ComponentStyle = {
  backgroundColor: 'rgba(0,0,0,0)',
  color: colorWhite,
  opacity: 1,
  borderRadiusTopLeft: 0,
  borderRadiusTopRight: 0,
  borderRadiusBottomLeft: 0,
  borderRadiusBottomRight: 0,
  outlineWidth: 1,
  outlineColor: colorWhite,
  outline: 'solid',
  fontSize: 16,
  fontWeight: 'normal',
  fontStyle: 'normal',
  fontFamily: 'Roboto Condensed',
  textDecoration: 'none',
  textAlign: 'start',
  verticalAlign: 'center',
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

export const DEFAULT_INVENTORY: Partial<Component> = {
  z: inventoryConfig.defaultLayer,
  height: inventoryConfig.defaultHeight,
  width: inventoryConfig.defaultWidth,
  rotation: inventoryConfig.defaultRotation,
  data: JSON.stringify(DEFAULT_DATA),
  style: JSON.stringify(DEFAULT_STYLES),
};
