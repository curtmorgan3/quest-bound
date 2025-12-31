import type { NodeTypes } from '@xyflow/react';
import { shapeConfig, ShapeNode, textConfig, TextNode } from './components';
import { ComponentTypes, type SheetComponentType } from './node-types';

export const sheetNodeTypes: NodeTypes = {
  [ComponentTypes.SHAPE]: ShapeNode,
  [ComponentTypes.TEXT]: TextNode,
};

export const baseComponentTypes: SheetComponentType[] = [shapeConfig, textConfig];

export const componentTypes = [...baseComponentTypes];

export const getComponentType = (type: ComponentTypes): SheetComponentType => {
  return baseComponentTypes.find((comp) => comp.type === type)!;
};
