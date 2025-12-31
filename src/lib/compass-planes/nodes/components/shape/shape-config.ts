import { DEFAULT_GRID_SIZE } from '@/lib/compass-planes/editor-config';
import type { Component, ComponentStyle, ShapeComponentData } from '@/types';
import { ComponentTypes, type SheetComponentType } from '../../node-types';

export const shapeConfig: SheetComponentType = {
  label: 'Shape',
  description:
    'A rectangle or regular polygon. Useful for creating backgrounds and visually distinct sections.',
  type: ComponentTypes.SHAPE,
  minWidth: DEFAULT_GRID_SIZE,
  minHeight: DEFAULT_GRID_SIZE,
  defaultWidth: 3 * DEFAULT_GRID_SIZE,
  defaultHeight: 3 * DEFAULT_GRID_SIZE,
  maxHeight: 100 * DEFAULT_GRID_SIZE,
  maxWidth: 100 * DEFAULT_GRID_SIZE,
  defaultRotation: 0,
  defaultLayer: 2,
  transparent: true,
  scalable: true,
};

const DEFAULT_SHAPE_DATA: ShapeComponentData = {
  sides: 4,
};

const DEFAULT_SHAPE_STYLES: ComponentStyle = {
  color: '#42403D',
  opacity: 1,
  borderRadiusTopLeft: 0,
  borderRadiusTopRight: 0,
  borderRadiusBottomLeft: 0,
  borderRadiusBottomRight: 0,
  outlineWidth: 0,
  outlineColor: '',
  outline: 'solid',
};

export const DEFAULT_SHAPE: Partial<Component> = {
  z: 1,
  height: 60,
  width: 60,
  rotation: 0,
  data: JSON.stringify(DEFAULT_SHAPE_DATA),
  style: JSON.stringify(DEFAULT_SHAPE_STYLES),
};
