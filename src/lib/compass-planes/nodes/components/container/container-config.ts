import type { Component } from '@/types';
import { DEFAULT_GROUP, groupConfig } from '../group/group-config';
import { ComponentTypes, type SheetComponentType } from '../../node-types';

export const containerConfig: SheetComponentType = {
  ...groupConfig,
  label: 'Container',
  description: 'Empty layout container for nesting components.',
  type: ComponentTypes.CONTAINER,
};

export const DEFAULT_CONTAINER: Partial<Component> = {
  ...DEFAULT_GROUP,
};
