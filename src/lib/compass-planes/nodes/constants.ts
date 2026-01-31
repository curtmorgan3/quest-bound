import type { NodeTypes } from '@xyflow/react';
import {
  checkboxConfig,
  contentConfig,
  EditCheckboxNode,
  EditContentNode,
  EditImageNode,
  EditInputNode,
  EditInventoryNode,
  EditShapeNode,
  EditTextNode,
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
};

export const baseComponentTypes: SheetComponentType[] = [
  shapeConfig,
  textConfig,
  imageConfig,
  inputConfig,
  checkboxConfig,
  contentConfig,
  inventoryConfig,
];

export const componentTypes = [...baseComponentTypes];

export const getComponentType = (type: ComponentTypes): SheetComponentType => {
  return baseComponentTypes.find((comp) => comp.type === type)!;
};
