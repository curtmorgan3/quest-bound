import type { ComponentType } from 'react';
import {
  EditCheckboxNode,
  EditContentNode,
  EditFrameNode,
  EditGraphNode,
  EditGroupNode,
  EditImageNode,
  EditInputNode,
  EditInventoryNode,
  EditShapeNode,
  EditTextNode,
} from './components';
import { baseComponentTypes, getComponentType } from './sheet-component-metadata';
import { ComponentTypes } from './node-types';

export { baseComponentTypes, getComponentType };

export const sheetNodeTypes: Record<ComponentTypes, ComponentType> = {
  [ComponentTypes.SHAPE]: EditShapeNode,
  [ComponentTypes.TEXT]: EditTextNode,
  [ComponentTypes.IMAGE]: EditImageNode,
  [ComponentTypes.INPUT]: EditInputNode,
  [ComponentTypes.CHECKBOX]: EditCheckboxNode,
  [ComponentTypes.CONTENT]: EditContentNode,
  [ComponentTypes.INVENTORY]: EditInventoryNode,
  [ComponentTypes.GRAPH]: EditGraphNode,
  [ComponentTypes.FRAME]: EditFrameNode,
  [ComponentTypes.GROUP]: EditGroupNode,
};

export const componentTypes = [...baseComponentTypes];
