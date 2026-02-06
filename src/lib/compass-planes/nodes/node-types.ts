export enum ComponentTypes {
  SHAPE = 'shape',
  TEXT = 'text',
  IMAGE = 'image',
  INPUT = 'comp-input', // This cannot be called 'input' because it clashes with react-node CSS
  CHECKBOX = 'checkbox',
  CONTENT = 'content',
  INVENTORY = 'inventory',
  GRAPH = 'graph',
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
