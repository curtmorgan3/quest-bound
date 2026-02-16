import { DEFAULT_GRID_SIZE } from '@/lib/compass-planes/editor-config';
import type { CheckboxComponentData, Component, ComponentStyle } from '@/types';
import { ComponentTypes, type SheetComponentType } from '../../node-types';

export const checkboxConfig: SheetComponentType = {
  label: 'Checkbox',
  description: 'A checkbox for toggling boolean values.',
  type: ComponentTypes.CHECKBOX,
  minWidth: DEFAULT_GRID_SIZE,
  minHeight: DEFAULT_GRID_SIZE,
  defaultWidth: 1 * DEFAULT_GRID_SIZE,
  defaultHeight: 1 * DEFAULT_GRID_SIZE,
  maxHeight: 10 * DEFAULT_GRID_SIZE,
  maxWidth: 10 * DEFAULT_GRID_SIZE,
  defaultRotation: 0,
  defaultLayer: 2,
  transparent: true,
  scalable: true,
};

const DEFAULT_CHECKBOX_DATA: CheckboxComponentData = {
  label: '',
};

const DEFAULT_CHECKBOX_STYLES: ComponentStyle = {
  backgroundColor: 'transparent',
  opacity: 1,
  borderRadiusTopLeft: 0,
  borderRadiusTopRight: 0,
  borderRadiusBottomLeft: 0,
  borderRadiusBottomRight: 0,
  outlineWidth: 1,
  outlineColor: 'transparent',
  outline: 'solid',
  fontSize: 16,
  fontWeight: 'normal',
  fontStyle: 'normal',
  fontFamily: 'Roboto Condensed',
  textDecoration: 'none',
  textAlign: 'start',
  verticalAlign: 'center',
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

export const DEFAULT_CHECKBOX: Partial<Component> = {
  z: 2,
  height: DEFAULT_GRID_SIZE,
  width: DEFAULT_GRID_SIZE,
  rotation: 0,
  data: JSON.stringify(DEFAULT_CHECKBOX_DATA),
  style: JSON.stringify(DEFAULT_CHECKBOX_STYLES),
};
