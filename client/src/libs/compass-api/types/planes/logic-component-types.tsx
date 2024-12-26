import { ComponentTypes, SheetComponentType } from './base-component-types';
import { DEFAULT_GRID_SIZE } from './defaults';

export const logicComponentTypes: SheetComponentType[] = [
  {
    label: 'Default Value',
    hideInPanel: true,
    description: "This attribute's default value.",
    type: ComponentTypes.DEFAULT_VALUE,
    minWidth: 7 * DEFAULT_GRID_SIZE,
    defaultWidth: 7 * DEFAULT_GRID_SIZE,
    maxWidth: 7 * DEFAULT_GRID_SIZE,
    minHeight: 2 * DEFAULT_GRID_SIZE,
    defaultHeight: 2 * DEFAULT_GRID_SIZE,
    maxHeight: 2 * DEFAULT_GRID_SIZE,
    defaultRotation: 0,
    defaultLayer: 2,
    transparent: true,
    scalable: false,
    dragHandle: true,
  },
  {
    label: 'If',
    description:
      'Evalulates a condition to be true or false, moving logic down one of two branches.',
    type: ComponentTypes.IF,
    minWidth: 5 * DEFAULT_GRID_SIZE,
    defaultWidth: 5 * DEFAULT_GRID_SIZE,
    maxWidth: 5 * DEFAULT_GRID_SIZE,
    minHeight: 3 * DEFAULT_GRID_SIZE,
    defaultHeight: 3 * DEFAULT_GRID_SIZE,
    maxHeight: 3 * DEFAULT_GRID_SIZE,
    defaultRotation: 0,
    defaultLayer: 2,
    transparent: true,
    scalable: false,
    dragHandle: true,
  },
  {
    label: 'And',
    description: 'Evalulates one or many conditions to true if every connected condition is true.',
    type: ComponentTypes.AND,
    minWidth: 4 * DEFAULT_GRID_SIZE,
    defaultWidth: 4 * DEFAULT_GRID_SIZE,
    maxWidth: 4 * DEFAULT_GRID_SIZE,
    minHeight: 2 * DEFAULT_GRID_SIZE,
    defaultHeight: 2 * DEFAULT_GRID_SIZE,
    maxHeight: 2 * DEFAULT_GRID_SIZE,
    defaultRotation: 0,
    defaultLayer: 2,
    transparent: true,
    scalable: false,
    dragHandle: true,
  },
  {
    label: 'Or',
    description:
      'Evalulates one or many conditions to true if any single connected condition is true.',
    type: ComponentTypes.OR,
    minWidth: 4 * DEFAULT_GRID_SIZE,
    defaultWidth: 4 * DEFAULT_GRID_SIZE,
    maxWidth: 4 * DEFAULT_GRID_SIZE,
    minHeight: 2 * DEFAULT_GRID_SIZE,
    defaultHeight: 2 * DEFAULT_GRID_SIZE,
    maxHeight: 2 * DEFAULT_GRID_SIZE,
    defaultRotation: 0,
    defaultLayer: 2,
    transparent: true,
    scalable: false,
    dragHandle: true,
  },
  {
    label: 'Operation',
    description:
      'Applies a mathematical operation to its input and output, passing the result through the connected output.',
    type: ComponentTypes.OPERATION,
    minWidth: 8 * DEFAULT_GRID_SIZE,
    defaultWidth: 8 * DEFAULT_GRID_SIZE,
    maxWidth: 8 * DEFAULT_GRID_SIZE,
    minHeight: 2 * DEFAULT_GRID_SIZE,
    defaultHeight: 2 * DEFAULT_GRID_SIZE,
    maxHeight: 2 * DEFAULT_GRID_SIZE,
    defaultRotation: 0,
    defaultLayer: 2,
    transparent: true,
    scalable: false,
    dragHandle: true,
  },
  {
    label: 'Comparison',
    description: 'Provides a method of comparing two components, evaluating to true or false.',
    type: ComponentTypes.COMPARISON,
    minWidth: 6 * DEFAULT_GRID_SIZE,
    defaultWidth: 6 * DEFAULT_GRID_SIZE,
    maxWidth: 6 * DEFAULT_GRID_SIZE,
    minHeight: 2 * DEFAULT_GRID_SIZE,
    defaultHeight: 2 * DEFAULT_GRID_SIZE,
    maxHeight: 2 * DEFAULT_GRID_SIZE,
    defaultRotation: 0,
    defaultLayer: 2,
    transparent: true,
    scalable: false,
    dragHandle: true,
  },
  {
    label: 'Attribute',
    description:
      'Supplies the value of another attribute. Adds a field for this attribute to the test panel.',
    type: ComponentTypes.ATTRIBUTE,
    minWidth: 10 * DEFAULT_GRID_SIZE,
    defaultWidth: 10 * DEFAULT_GRID_SIZE,
    maxWidth: 10 * DEFAULT_GRID_SIZE,
    minHeight: 2 * DEFAULT_GRID_SIZE,
    defaultHeight: 2 * DEFAULT_GRID_SIZE,
    maxHeight: 2 * DEFAULT_GRID_SIZE,
    defaultRotation: 0,
    defaultLayer: 2,
    transparent: true,
    scalable: false,
    dragHandle: true,
  },
  {
    label: 'Chart',
    description:
      "Supplies the value of a cell within a chart. Connect a comparison to filter the chart's rows",
    type: ComponentTypes.CHART_REF,
    minWidth: 11 * DEFAULT_GRID_SIZE,
    defaultWidth: 11 * DEFAULT_GRID_SIZE,
    maxWidth: 11 * DEFAULT_GRID_SIZE,
    minHeight: 8 * DEFAULT_GRID_SIZE,
    defaultHeight: 8 * DEFAULT_GRID_SIZE,
    maxHeight: 8 * DEFAULT_GRID_SIZE,
    defaultRotation: 0,
    defaultLayer: 2,
    transparent: true,
    scalable: false,
    dragHandle: true,
  },
  {
    label: 'Side Effect',
    description: 'Provides a method to alter another attribute when this attribute changes.',
    type: ComponentTypes.SIDE_EFFECT,
    minWidth: 10 * DEFAULT_GRID_SIZE,
    defaultWidth: 10 * DEFAULT_GRID_SIZE,
    maxWidth: 10 * DEFAULT_GRID_SIZE,
    minHeight: 2 * DEFAULT_GRID_SIZE,
    defaultHeight: 2 * DEFAULT_GRID_SIZE,
    maxHeight: 2 * DEFAULT_GRID_SIZE,
    defaultRotation: 0,
    defaultLayer: 2,
    transparent: true,
    scalable: false,
    dragHandle: true,
  },
  {
    label: 'Variable',
    description:
      'Provides a parameter for an action or a local variable for all other attribute types.',
    type: ComponentTypes.VARIABLE,
    minWidth: 14 * DEFAULT_GRID_SIZE,
    defaultWidth: 14 * DEFAULT_GRID_SIZE,
    maxWidth: 14 * DEFAULT_GRID_SIZE,
    minHeight: 2 * DEFAULT_GRID_SIZE,
    defaultHeight: 2 * DEFAULT_GRID_SIZE,
    maxHeight: 2 * DEFAULT_GRID_SIZE,
    defaultRotation: 0,
    defaultLayer: 2,
    transparent: true,
    scalable: false,
    dragHandle: true,
  },
  {
    label: 'Dice',
    description:
      'Provides the value of a dice roll. Attach a text node with the format "XdY" to roll X dice with Y sides, e.g. "3d6"',
    type: ComponentTypes.DICE,
    minWidth: 5 * DEFAULT_GRID_SIZE,
    defaultWidth: 5 * DEFAULT_GRID_SIZE,
    maxWidth: 5 * DEFAULT_GRID_SIZE,
    minHeight: 3 * DEFAULT_GRID_SIZE,
    defaultHeight: 3 * DEFAULT_GRID_SIZE,
    maxHeight: 3 * DEFAULT_GRID_SIZE,
    defaultRotation: 0,
    defaultLayer: 2,
    transparent: true,
    scalable: false,
    dragHandle: true,
  },
  {
    label: 'Number',
    description: 'An input for a static number.',
    type: ComponentTypes.NUMBER_PRIMITIVE,
    minWidth: 7 * DEFAULT_GRID_SIZE,
    defaultWidth: 7 * DEFAULT_GRID_SIZE,
    maxWidth: 7 * DEFAULT_GRID_SIZE,
    minHeight: 2 * DEFAULT_GRID_SIZE,
    defaultHeight: 2 * DEFAULT_GRID_SIZE,
    maxHeight: 2 * DEFAULT_GRID_SIZE,
    defaultRotation: 0,
    defaultLayer: 2,
    transparent: true,
    scalable: false,
    dragHandle: true,
  },
  {
    label: 'Text',
    description: 'An input for text.',
    type: ComponentTypes.TEXT_PRIMITIVE,
    minWidth: 7 * DEFAULT_GRID_SIZE,
    defaultWidth: 7 * DEFAULT_GRID_SIZE,
    maxWidth: 7 * DEFAULT_GRID_SIZE,
    minHeight: 2 * DEFAULT_GRID_SIZE,
    defaultHeight: 2 * DEFAULT_GRID_SIZE,
    maxHeight: 2 * DEFAULT_GRID_SIZE,
    defaultRotation: 0,
    defaultLayer: 2,
    transparent: true,
    scalable: false,
    dragHandle: true,
  },
  {
    label: 'Boolean',
    description: 'An input for a true or false value.',
    type: ComponentTypes.BOOLEAN,
    minWidth: 5 * DEFAULT_GRID_SIZE,
    defaultWidth: 5 * DEFAULT_GRID_SIZE,
    maxWidth: 5 * DEFAULT_GRID_SIZE,
    minHeight: 3 * DEFAULT_GRID_SIZE,
    defaultHeight: 3 * DEFAULT_GRID_SIZE,
    maxHeight: 3 * DEFAULT_GRID_SIZE,
    defaultRotation: 0,
    defaultLayer: 2,
    transparent: true,
    scalable: false,
    dragHandle: true,
  },
];

/**
 * Useful for bootstrapping new logic operations when components are dragged out
 */
export const componentTypeToOperationType = new Map<ComponentTypes, any>([]);

export const operationTypeToComponentType = new Map<any, ComponentTypes>([]);

export const getDefaultDimensionsByOperationType = (type: any) => {
  const componentType = logicComponentTypes.find(
    (componentType) => operationTypeToComponentType.get(type)! === componentType.type,
  );

  return {
    height: componentType?.defaultHeight ?? 0,
    width: componentType?.defaultWidth ?? 0,
  };
};