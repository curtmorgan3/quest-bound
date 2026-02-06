import type { NodeTypes } from '@xyflow/react';
import {
  checkboxConfig,
  contentConfig,
  EditCheckboxNode,
  EditContentNode,
  EditGraphNode,
  EditImageNode,
  EditInputNode,
  EditInventoryNode,
  EditShapeNode,
  EditTextNode,
  graphConfig,
  imageConfig,
  inputConfig,
  inventoryConfig,
  shapeConfig,
  textConfig,
} from './components';
import { ComponentTypes, type SheetComponentType } from './node-types';

export const sheetNodeTypes: NodeTypes = {
  [ComponentTypes.SHAPE]: EditShapeNode,
  [ComponentTypes.TEXT]: EditTextNode,
  [ComponentTypes.IMAGE]: EditImageNode,
  [ComponentTypes.INPUT]: EditInputNode,
  [ComponentTypes.CHECKBOX]: EditCheckboxNode,
  [ComponentTypes.CONTENT]: EditContentNode,
  [ComponentTypes.INVENTORY]: EditInventoryNode,
  [ComponentTypes.GRAPH]: EditGraphNode,
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
];

export const componentTypes = [...baseComponentTypes];

export const getComponentType = (type: ComponentTypes): SheetComponentType => {
  return baseComponentTypes.find((comp) => comp.type === type)!;
};
