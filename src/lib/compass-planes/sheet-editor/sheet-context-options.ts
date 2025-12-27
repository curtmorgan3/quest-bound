import { ComponentTypes, getComponentType, type EditorMenuOption } from '../nodes';

export const contextOptions: EditorMenuOption[] = [
  {
    name: getComponentType(ComponentTypes.SHAPE).label,
    nodeType: ComponentTypes.SHAPE,
    description: getComponentType(ComponentTypes.SHAPE).description,
  },
];
