import { checkboxConfig } from './components/checkbox/checkbox-config';
import { contentConfig } from './components/content/content-config';
import { frameConfig } from './components/frame/frame-config';
import { graphConfig } from './components/graph/graph-config';
import { imageConfig } from './components/image/image-config';
import { inputConfig } from './components/input/input-config';
import { inventoryConfig } from './components/inventory/inventory-config';
import { shapeConfig } from './components/shape/shape-config';
import { textConfig } from './components/text/text-config';
import { ComponentTypes, type EditorMenuOption, type SheetComponentType } from './node-types';

export const baseComponentTypes: SheetComponentType[] = [
  shapeConfig,
  textConfig,
  imageConfig,
  inputConfig,
  checkboxConfig,
  contentConfig,
  inventoryConfig,
  graphConfig,
  frameConfig,
];

export const getComponentType = (type: ComponentTypes): SheetComponentType => {
  return baseComponentTypes.find((comp) => comp.type === type)!;
};

const includedEditorComponentTypes: ComponentTypes[] = [
  ComponentTypes.SHAPE,
  ComponentTypes.IMAGE,
  ComponentTypes.TEXT,
  ComponentTypes.INPUT,
  ComponentTypes.CHECKBOX,
  ComponentTypes.CONTENT,
  ComponentTypes.INVENTORY,
  ComponentTypes.GRAPH,
  ComponentTypes.FRAME,
];

/** Sheet / window add-component UI and base flow context menu (when `menuOptions` is omitted). */
export const editorContextMenuOptions: EditorMenuOption[] = includedEditorComponentTypes.map(
  (component) => ({
    nodeType: component,
    name: getComponentType(component).label,
    description: getComponentType(component).description,
  }),
);
