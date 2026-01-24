import type { NodeTypes } from '@xyflow/react';
import {
  checkboxConfig,
  EditCheckboxNode,
  EditImageNode,
  EditInputNode,
  EditShapeNode,
  EditTextNode,
  imageConfig,
  inputConfig,
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
};

export const baseComponentTypes: SheetComponentType[] = [
  shapeConfig,
  textConfig,
  imageConfig,
  inputConfig,
  checkboxConfig,
];

export const componentTypes = [...baseComponentTypes];

export const getComponentType = (type: ComponentTypes): SheetComponentType => {
  return baseComponentTypes.find((comp) => comp.type === type)!;
};
