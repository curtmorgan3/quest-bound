import { DEFAULT_GRID_SIZE } from '@/lib/compass-planes/editor-config';
import { colorWhite } from '@/palette';
import type { Component, ComponentStyle, ContentComponentData } from '@/types';
import { ComponentTypes, type SheetComponentType } from '../../node-types';

export const contentConfig: SheetComponentType = {
  label: 'Content',
  description: 'Text area that supports markdown',
  type: ComponentTypes.CONTENT,
  minWidth: DEFAULT_GRID_SIZE,
  minHeight: DEFAULT_GRID_SIZE,
  defaultWidth: 8 * DEFAULT_GRID_SIZE,
  defaultHeight: 8 * DEFAULT_GRID_SIZE,
  maxHeight: 100 * DEFAULT_GRID_SIZE,
  maxWidth: 100 * DEFAULT_GRID_SIZE,
  defaultRotation: 0,
  defaultLayer: 2,
  transparent: true,
  scalable: true,
  hasDoubleClickAction: true,
};

const DEFAULT_CONTENT_DATA: ContentComponentData = {
  value: 'Edit your content',
};

const DEFAULT_CONTENT_STYLES: ComponentStyle = {
  color: colorWhite,
  backgroundColor: 'transparent',
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
  fontFamily: 'Roboto Condensed',
  textDecoration: 'none',
  textAlign: 'start',
  verticalAlign: 'start',
};

export const DEFAULT_CONTENT: Partial<Component> = {
  z: 2,
  height: DEFAULT_GRID_SIZE,
  width: DEFAULT_GRID_SIZE * 6,
  rotation: 0,
  data: JSON.stringify(DEFAULT_CONTENT_DATA),
  style: JSON.stringify(DEFAULT_CONTENT_STYLES),
};
