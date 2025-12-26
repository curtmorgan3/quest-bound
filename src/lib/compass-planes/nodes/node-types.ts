import type { NodeTypes } from '@xyflow/react';
import { ShapeNode } from './shape-node';

export enum ComponentTypes {
  SHAPE = 'shape',
}

export const sheetNodeTypes: NodeTypes = {
  [ComponentTypes.SHAPE]: ShapeNode,
};

export type ComponentData = {
  conditionalRenderAttributeId?: string;
  conditionalRenderInverse?: boolean;
  actionId?: string;
  pageId?: string | null;
  announcementId?: string | null;
};

export type ShapeComponentData = ComponentData & {
  sides: number;
};

type SheetComponentType = {
  type: ComponentTypes;
  label: string;
  hideInPanel?: boolean;
  description?: string;
  defaultLayer: number;
  minHeight: number;
  maxHeight: number;
  minWidth: number;
  maxWidth: number;
  defaultWidth: number;
  defaultHeight: number;
  transparent: boolean;
  scalable: boolean;
  defaultRotation: number;
  dragHandle?: boolean;
  hasDoubleClickAction?: boolean;
};

export const baseComponentTypes: SheetComponentType[] = [
  {
    label: 'Shape',
    description:
      'A rectangle or regular polygon. Useful for creating backgrounds and visually distinct sections.',
    type: ComponentTypes.SHAPE,
    minWidth: 20,
    minHeight: 20,
    defaultWidth: 3 * 20,
    defaultHeight: 3 * 20,
    maxHeight: 100 * 20,
    maxWidth: 100 * 20,
    defaultRotation: 0,
    defaultLayer: 2,
    transparent: true,
    scalable: true,
  },
];

export const getComponentType = (type: ComponentTypes): SheetComponentType => {
  return baseComponentTypes.find((comp) => comp.type === type)!;
};

export type EditorMenuOption = {
  name: string;
  nodeType: ComponentTypes;
  description?: string;
};

export const contextOptions: EditorMenuOption[] = [
  {
    name: 'Shape',
    nodeType: ComponentTypes.SHAPE,
    description: getComponentType(ComponentTypes.SHAPE).description,
  },
];
