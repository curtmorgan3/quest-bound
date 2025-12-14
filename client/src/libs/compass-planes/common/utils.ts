import {
  ComponentTypes,
  componentTypes,
  ContextualItem,
  defaultSheetEmptyValue,
  defaultSheetValueMap,
  editableValuesByType,
  SheetComponent,
  SheetComponentType,
  SheetComponentValue,
} from '@/libs/compass-api';
import { Coordinates } from '@/libs/compass-planes';
import { generateId } from '@/libs/compass-web-utils';
import { EventEmitter } from 'eventemitter3';
import { CSSProperties } from 'react';
import { Node } from 'reactflow';

export const editorEmitter = new EventEmitter();

export const bootstrapSheetComponentFromNode = ({
  node,
  sheetId,
  rulesetId,
  tabId,
  zoom,
}: {
  node: Node;
  sheetId: string;
  rulesetId: string;
  tabId: string;
  zoom: number;
}): SheetComponent => {
  const componentType = componentTypes.find((type) => type.type === node.type);

  const standardHeight = node.height ?? componentType?.defaultHeight ?? 0;
  const zoomedHeight = Math.floor(standardHeight / zoom);

  const standardWidth = node.width ?? componentType?.defaultWidth ?? 0;
  const zoomedWidth = Math.floor(standardWidth / zoom);

  return {
    __typename: 'SheetComponent',
    id: node.id,
    tabId,
    sheetId,
    rulesetId,
    locked: false,
    layer: 1,
    style: defaultSheetValueMap.get(node.type as ComponentTypes)?.style ?? '{}',
    data: defaultSheetValueMap.get(node.type as ComponentTypes)?.data ?? '{}',
    groupId: '',
    description: '',
    rotation: 0,
    type: node.type ?? '',
    label: node.type ?? '',
    x: node.position.x,
    y: node.position.y,
    height: Math.max(zoomedHeight, standardHeight),
    width: Math.max(zoomedWidth, standardWidth),
    images: [],
  };
};

export const bootstrapSheetComponentFromNodeType = ({
  type,
  sheetId,
  rulesetId,
  tabId,
  coordinates,
  zoom,
  id,
}: {
  type: ComponentTypes;
  sheetId: string;
  rulesetId: string;
  tabId: string;
  coordinates: Coordinates;
  zoom: number;
  id?: string;
}): SheetComponent => {
  const node = {
    id: id ?? generateId(),
    type,
    position: coordinates,
    data: {},
  };
  return bootstrapSheetComponentFromNode({ node, sheetId, rulesetId, tabId, zoom });
};

export const parseComponentStyles = (component: SheetComponent) => {
  return {
    ...JSON.parse(component.style),
    transform: `rotate(${component?.rotation ?? 0}deg)`,
  };
};

export const convertSheetComponentToNode = (
  component: SheetComponent & { selected?: boolean },
  viewMode = false,
): Node => {
  return {
    id: component.id,
    type: component.type,
    position: { x: component.x, y: component.y },
    height: component.height,
    width: component.width,
    data: component,
    selected: component.selected,
    style: {
      zIndex: component.layer,
      pointerEvents: viewMode ? 'all' : undefined,
    },
  };
};

export const convertItemToNode = (item: ContextualItem, items: SheetComponent[]): Node | null => {
  const inventory = items.find((i) => i.id === item.data.parentId);
  if (!inventory) return null;
  const absoluteX = (item.data.x ?? 0) + (inventory?.x ?? 0);
  const absoluteY = (item.data.y ?? 0) + (inventory?.y ?? 0);
  return {
    id: item.instanceId,
    type: ComponentTypes.ITEM,
    position: { x: absoluteX, y: absoluteY },
    height: item.data.height * 20,
    width: item.data.width * 20,
    data: item,
    style: {
      zIndex: 100,
      pointerEvents: 'all',
    },
  };
};

export const getBorderStyles = (css: CSSProperties): CSSProperties => ({
  borderRadius: css.borderRadius || '0%',
  ...(css.borderRadius === '0%' && {
    borderTopLeftRadius: `${css.borderTopLeftRadius}px`,
    borderTopRightRadius: `${css.borderTopRightRadius}px`,
    borderBottomLeftRadius: `${css.borderBottomLeftRadius}px`,
    borderBottomRightRadius: `${css.borderBottomRightRadius}px`,
  }),
  ...(css.borderRadius !== '0%' && {
    borderTopLeftRadius: css.borderRadius,
    borderTopRightRadius: css.borderRadius,
    borderBottomLeftRadius: css.borderRadius,
    borderBottomRightRadius: css.borderRadius,
  }),
  outlineColor: css.outlineColor || '',
  outlineOffset: `${css.outlineOffset || 0}px`,
  outlineWidth: `${css.outlineWidth || 0}px`,
  outlineStyle: 'solid',
});

/**
 * For each value in data and style, returns the value if it's equal among all selections, or returns the default.
 */
export const getInitialValues = (selections: SheetComponent[]): SheetComponentValue => {
  if (selections.length === 0) return defaultSheetEmptyValue;

  const values = {
    data: {},
    style: {},
  };

  if (selections.length === 1) {
    return {
      data: selections[0].data,
      style: selections[0].style,
    };
  }

  for (const selection of selections) {
    const { data, style } = selection;

    if (data) {
      const parsedData = JSON.parse(data);

      const defaultData = JSON.parse(
        defaultSheetValueMap.get(selection.type as ComponentTypes)?.data || '{}',
      );

      for (const key in parsedData) {
        const valueKey = key as keyof typeof values.data;

        if (!values.data[valueKey]) {
          // First time finding this property
          values.data[valueKey] = parsedData[valueKey] as never;
        } else if (values.data[valueKey] !== parsedData[valueKey]) {
          // This selection's value is different, set value to default
          values.data[valueKey] = defaultData[valueKey] as never;
          break;
        }
      }
    }

    if (style) {
      const parsedStyle = JSON.parse(style);
      const defaultStyle = JSON.parse(defaultSheetEmptyValue.style);
      for (const key in parsedStyle) {
        const valueKey = key as keyof typeof values.style;

        if (!values.style[valueKey]) {
          // First time finding this property
          values.style[valueKey] = parsedStyle[valueKey] as never;
        } else if (values.style[valueKey] !== parsedStyle[valueKey]) {
          // This selection's value is different, set value to default
          values.style[valueKey] = defaultStyle[valueKey] as never;
          break;
        }
      }
    }
  }

  return {
    data: JSON.stringify(values.data),
    style: JSON.stringify(values.style),
  };
};

/**
 * Returns all editable fields for a set of types
 */
export const allEditableValues = (selectedTypes: ComponentTypes[]): string[] => {
  let editableValues = new Set<string>();

  selectedTypes.forEach((type) => {
    editableValuesByType.get(type)?.forEach((value) => {
      editableValues.add(value);
    });
  });

  return [...editableValues];
};

export const parseStoredComponentDataValue = (value: string): any => {
  return JSON.parse(value);
};

export const transformComponentDataValueToStore = (data: any): string => {
  return JSON.stringify(data);
};

export const storedValueDataIsEqualToSheetValueData = (
  storedValue: string,
  sheetValue: any,
): boolean => {
  return storedValue === transformComponentDataValueToStore(sheetValue);
};

interface CreateSheetComponentFromType {
  componentType: SheetComponentType;
  x: number;
  y: number;
  activeTab: string;
  id?: string;
  containerId?: string;
  sheetId: string;
  rulesetId: string;
  overrideHeight?: number;
  overrideWidth?: number;
  overrideData?: string;
}

export const createSheetComponentFromType = ({
  componentType,
  x,
  y,
  activeTab,
  id = '',
  sheetId,
  rulesetId,
  overrideHeight,
  overrideWidth,
  overrideData,
}: CreateSheetComponentFromType): SheetComponent => {
  const defaultValues =
    defaultSheetValueMap.get(componentType.type as ComponentTypes) || defaultSheetEmptyValue;

  if (componentType.type === ComponentTypes.LINE) {
    defaultValues.data = JSON.stringify({
      ...JSON.parse(defaultValues.data),
      pointId: generateId(),
    });
  }

  const defaultCoordinates = {
    x,
    y,
    height: overrideHeight ?? componentType.defaultHeight,
    width: overrideWidth ?? componentType.defaultWidth,
    rotation: componentType.defaultRotation,
  };

  return {
    __typename: 'SheetComponent',
    id,
    sheetId,
    rulesetId,
    layer: componentType.defaultLayer,
    label: componentType.label,
    description: '',
    images: [],
    groupId: null,
    locked: false,
    tabId: activeTab,
    data: overrideData ?? defaultValues.data,
    style: defaultValues.style,
    type: componentType.type,
    ...defaultCoordinates,
  };
};
