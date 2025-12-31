import type { NodeTypes } from '@xyflow/react';
import { EditShapeNode, EditTextNode, shapeConfig, textConfig } from './components';
import { ComponentTypes, type SheetComponentType } from './node-types';

export const sheetNodeTypes: NodeTypes = {
  [ComponentTypes.SHAPE]: EditShapeNode,
  [ComponentTypes.TEXT]: EditTextNode,
};

export const baseComponentTypes: SheetComponentType[] = [shapeConfig, textConfig];

export const componentTypes = [...baseComponentTypes];

export const getComponentType = (type: ComponentTypes): SheetComponentType => {
  return baseComponentTypes.find((comp) => comp.type === type)!;
};
