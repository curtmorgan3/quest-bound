import type { Component } from '@/types';

export const REQUIRED_COMPONENT_FIELDS: Array<keyof Component> = ['type', 'x', 'y'];
export const DEFAULT_SHAPE: Partial<Component> = {
  z: 1,
  height: 60,
  width: 60,
  rotation: 0,
  color: '#42403D',
  opacity: 1,
  borderRadiusTopLeft: 0,
  borderRadiusTopRight: 0,
  borderRadiusBottomLeft: 0,
  borderRadiusBottomRight: 0,
  borderWidth: 0,
  borderColor: '',
};
