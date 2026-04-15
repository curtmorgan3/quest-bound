export enum ComponentTypes {
  SHAPE = 'shape',
  TEXT = 'text',
  IMAGE = 'image',
  INPUT = 'comp-input', // This cannot be called 'input' because it clashes with react-node CSS
  CHECKBOX = 'checkbox',
  CONTENT = 'content',
  INVENTORY = 'inventory',
  GRAPH = 'graph',
  FRAME = 'frame',
  GROUP = 'group',
  /** Layout shell like a group; addable from the editor panel (not created only via Group action). */
  CONTAINER = 'container',
}

/** Types that host nested children via `parentComponentId` (group layout, flex, `SheetComponentAccessor.add`). */
export function isGroupLikeComponentType(type: string): boolean {
  return type === ComponentTypes.GROUP || type === ComponentTypes.CONTAINER;
}

export type SheetComponentType = {
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

export type EditorMenuOption = {
  name: string;
  nodeType: ComponentTypes;
  description?: string;
};
