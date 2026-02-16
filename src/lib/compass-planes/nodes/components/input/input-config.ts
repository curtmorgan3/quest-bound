import { DEFAULT_GRID_SIZE } from '@/lib/compass-planes/editor-config';
import { colorWhite } from '@/palette';
import type { Component, ComponentStyle, InputComponentData } from '@/types';
import { ComponentTypes, type SheetComponentType } from '../../node-types';

export const inputConfig: SheetComponentType = {
  label: 'Input',
  description: 'A disabled input field for displaying form values.',
  type: ComponentTypes.INPUT,
  minWidth: DEFAULT_GRID_SIZE,
  minHeight: DEFAULT_GRID_SIZE,
  defaultWidth: 4 * DEFAULT_GRID_SIZE,
  defaultHeight: 1 * DEFAULT_GRID_SIZE,
  maxHeight: 100 * DEFAULT_GRID_SIZE,
  maxWidth: 100 * DEFAULT_GRID_SIZE,
  defaultRotation: 0,
  defaultLayer: 2,
  transparent: true,
  scalable: true,
};

const DEFAULT_INPUT_DATA: InputComponentData = {
  placeholder: 'Input',
};

const DEFAULT_INPUT_STYLES: ComponentStyle = {
  backgroundColor: 'transparent',
  opacity: 1,
  borderRadiusTopLeft: 0,
  borderRadiusTopRight: 0,
  borderRadiusBottomLeft: 0,
  borderRadiusBottomRight: 0,
  outlineWidth: 1,
  outlineColor: colorWhite,
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

export const DEFAULT_INPUT: Partial<Component> = {
  z: 2,
  height: DEFAULT_GRID_SIZE,
  width: DEFAULT_GRID_SIZE * 6,
  rotation: 0,
  data: JSON.stringify(DEFAULT_INPUT_DATA),
  style: JSON.stringify(DEFAULT_INPUT_STYLES),
};
