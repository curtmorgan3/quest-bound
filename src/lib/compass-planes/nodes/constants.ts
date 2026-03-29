import type { ComponentType } from 'react';
import {
  checkboxConfig,
  contentConfig,
  EditCheckboxNode,
  EditContentNode,
  EditFrameNode,
  EditGraphNode,
  EditImageNode,
  EditInputNode,
  EditInventoryNode,
  EditShapeNode,
  EditTextNode,
  frameConfig,
  graphConfig,
  imageConfig,
  inputConfig,
  inventoryConfig,
  shapeConfig,
  textConfig,
} from './components';
import { ComponentTypes, type SheetComponentType } from './node-types';

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
};

export const baseComponentTypes: SheetComponentType[] = [
  shapeConfig,
  textConfig,
  imageConfig,
  inputConfig,
  checkboxConfig,
  contentConfig,
  inventoryConfig,
  graphConfig,
  frameConfig,
];

export const componentTypes = [...baseComponentTypes];

export const getComponentType = (type: ComponentTypes): SheetComponentType => {
  return baseComponentTypes.find((comp) => comp.type === type)!;
};
