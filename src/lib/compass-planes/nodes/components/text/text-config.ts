import { DEFAULT_GRID_SIZE } from '@/lib/compass-planes/editor-config';
import { colorWhite } from '@/palette';
import type { Component, ComponentStyle, TextComponentData } from '@/types';
import { ComponentTypes, type SheetComponentType } from '../../node-types';

export const textConfig: SheetComponentType = {
  label: 'Text',
  description: 'Static text with adjustable styles.',
  type: ComponentTypes.TEXT,
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
  hasDoubleClickAction: true,
};

const DEFAULT_TEXT_DATA: TextComponentData = {
  value: 'Text',
};

const DEFAULT_TEXT_STYLES: ComponentStyle = {
  color: colorWhite,
  opacity: 1,
  borderRadiusTopLeft: 0,
  borderRadiusTopRight: 0,
  borderRadiusBottomLeft: 0,
  borderRadiusBottomRight: 0,
  outlineWidth: 0,
  outlineColor: '',
  outline: 'solid',
  fontSize: 16,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  textAlign: 'start',
  verticalAlign: 'start',
};

export const DEFAULT_TEXT: Partial<Component> = {
  z: 1,
  height: DEFAULT_GRID_SIZE,
  width: DEFAULT_GRID_SIZE * 6,
  rotation: 0,
  data: JSON.stringify(DEFAULT_TEXT_DATA),
  style: JSON.stringify(DEFAULT_TEXT_STYLES),
};
