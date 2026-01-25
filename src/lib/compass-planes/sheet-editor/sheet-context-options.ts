import { ComponentTypes, getComponentType, type EditorMenuOption } from '../nodes';

const includedComponents = [
  ComponentTypes.SHAPE,
  ComponentTypes.TEXT,
  ComponentTypes.IMAGE,
  ComponentTypes.INPUT,
  ComponentTypes.CHECKBOX,
  ComponentTypes.CONTENT,
];

export const contextOptions: EditorMenuOption[] = includedComponents.map((component) => ({
  nodeType: component,
  name: getComponentType(component).label,
  description: getComponentType(component).description,
}));
