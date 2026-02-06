import { ComponentTypes, getComponentType, type EditorMenuOption } from '../nodes';

const includedComponents = [
  ComponentTypes.SHAPE,
  ComponentTypes.IMAGE,
  ComponentTypes.TEXT,
  ComponentTypes.INPUT,
  ComponentTypes.CHECKBOX,
  ComponentTypes.CONTENT,
  ComponentTypes.INVENTORY,
  ComponentTypes.GRAPH,
];

export const contextOptions: EditorMenuOption[] = includedComponents.map((component) => ({
  nodeType: component,
  name: getComponentType(component).label,
  description: getComponentType(component).description,
}));
