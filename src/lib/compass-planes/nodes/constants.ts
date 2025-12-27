import type { NodeTypes } from '@xyflow/react';
import { ShapeNode, shapeConfig } from './components';
import { ComponentTypes, type SheetComponentType } from './node-types';

export const sheetNodeTypes: NodeTypes = {
  [ComponentTypes.SHAPE]: ShapeNode,
};

export const baseComponentTypes: SheetComponentType[] = [shapeConfig];

export const componentTypes = [...baseComponentTypes];

export const getComponentType = (type: ComponentTypes): SheetComponentType => {
  return baseComponentTypes.find((comp) => comp.type === type)!;
};
