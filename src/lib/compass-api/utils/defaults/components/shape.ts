import type { Component, ComponentStyle, ShapeComponentData } from '@/types';

export const REQUIRED_COMPONENT_FIELDS: Array<keyof Component> = ['type', 'x', 'y'];

const DEFAULT_SHAPE_DATA: ShapeComponentData = {
  sides: 4,
};

const DEFAULT_SHAPE_STYLES: ComponentStyle = {
  color: '#42403D',
  backgroundColor: '#42403D',
  opacity: 1,
  borderRadiusTopLeft: 0,
  borderRadiusTopRight: 0,
  borderRadiusBottomLeft: 0,
  borderRadiusBottomRight: 0,
  outlineWidth: 0,
  outlineColor: '',
};

export const DEFAULT_SHAPE: Partial<Component> = {
  z: 1,
  height: 60,
  width: 60,
  rotation: 0,
  data: JSON.stringify(DEFAULT_SHAPE_DATA),
  style: JSON.stringify(DEFAULT_SHAPE_STYLES),
};
