import type { NodeTypes } from '@xyflow/react';
import {
  EditImageNode,
  EditShapeNode,
  EditTextNode,
  imageConfig,
  shapeConfig,
  textConfig,
} from './components';
import { ComponentTypes, type SheetComponentType } from './node-types';

export const sheetNodeTypes: NodeTypes = {
  [ComponentTypes.SHAPE]: EditShapeNode,
  [ComponentTypes.TEXT]: EditTextNode,
  [ComponentTypes.IMAGE]: EditImageNode,
};

export const baseComponentTypes: SheetComponentType[] = [shapeConfig, textConfig, imageConfig];

export const componentTypes = [...baseComponentTypes];

export const getComponentType = (type: ComponentTypes): SheetComponentType => {
  return baseComponentTypes.find((comp) => comp.type === type)!;
};
