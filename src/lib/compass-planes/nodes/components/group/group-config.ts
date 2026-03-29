import { DEFAULT_GRID_SIZE } from '@/lib/compass-planes/editor-config';
import type { Component, ComponentStyle, GroupComponentData } from '@/types';
import { ComponentTypes, type SheetComponentType } from '../../node-types';

export const groupConfig: SheetComponentType = {
  label: 'Group',
  description: 'Container for grouped components (created via Group action, not the add menu).',
  type: ComponentTypes.GROUP,
  minWidth: 2 * DEFAULT_GRID_SIZE,
  minHeight: 2 * DEFAULT_GRID_SIZE,
  defaultWidth: 8 * DEFAULT_GRID_SIZE,
  defaultHeight: 6 * DEFAULT_GRID_SIZE,
  maxHeight: 200 * DEFAULT_GRID_SIZE,
  maxWidth: 200 * DEFAULT_GRID_SIZE,
  defaultRotation: 0,
  defaultLayer: 1,
  transparent: true,
  scalable: true,
};

const DEFAULT_GROUP_DATA: GroupComponentData = {
  layoutMode: 'absolute',
};

const DEFAULT_GROUP_STYLES: ComponentStyle = {
  backgroundColor: 'transparent',
  opacity: 1,
  borderRadiusTopLeft: 4,
  borderRadiusTopRight: 4,
  borderRadiusBottomLeft: 4,
  borderRadiusBottomRight: 4,
  outlineWidth: 1,
  outlineColor: 'rgba(148, 163, 184, 0.5)',
  outline: 'dashed',
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

export const DEFAULT_GROUP: Partial<Component> = {
  z: 1,
  height: 6 * DEFAULT_GRID_SIZE,
  width: 8 * DEFAULT_GRID_SIZE,
  rotation: 0,
  data: JSON.stringify(DEFAULT_GROUP_DATA),
  style: JSON.stringify(DEFAULT_GROUP_STYLES),
};
