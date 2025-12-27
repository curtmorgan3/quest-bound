export enum ComponentTypes {
  SHAPE = 'shape',
}

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
