import { colorWhite } from '@/palette';
import type { Component } from '@/types';
import type { ComponentType } from '../../types';

const baseDefaults = {
  // These are overridden by the createComponent function
  id: '',
  compositeId: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ////////////
  x: 0,
  y: 0,
  rotation: 0,
  z: 1,
  opacity: 1,
};

export const defaultShape: Component = {
  ...baseDefaults,
  type: 'shape',
  width: 80,
  height: 80,
  color: colorWhite,
};

export const defaultComponentMap = new Map<ComponentType, Component>([['shape', defaultShape]]);
