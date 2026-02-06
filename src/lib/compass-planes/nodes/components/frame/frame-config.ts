import { DEFAULT_GRID_SIZE } from '@/lib/compass-planes/editor-config';
import { colorPaper } from '@/palette';
import type { Component, ComponentStyle, FrameComponentData } from '@/types';
import { ComponentTypes, type SheetComponentType } from '../../node-types';

export const frameConfig: SheetComponentType = {
  label: 'Frame',
  description: 'Embed a URL in an iframe.',
  type: ComponentTypes.FRAME,
  minWidth: DEFAULT_GRID_SIZE,
  minHeight: DEFAULT_GRID_SIZE,
  defaultWidth: 6 * DEFAULT_GRID_SIZE,
  defaultHeight: 4 * DEFAULT_GRID_SIZE,
  maxHeight: 100 * DEFAULT_GRID_SIZE,
  maxWidth: 100 * DEFAULT_GRID_SIZE,
  defaultRotation: 0,
  defaultLayer: 2,
  transparent: true,
  scalable: true,
};

const DEFAULT_FRAME_DATA: FrameComponentData = {
  url: undefined,
};

const DEFAULT_FRAME_STYLES: ComponentStyle = {
  backgroundColor: colorPaper,
  opacity: 1,
  borderRadiusTopLeft: 0,
  borderRadiusTopRight: 0,
  borderRadiusBottomLeft: 0,
  borderRadiusBottomRight: 0,
  outlineWidth: 0,
  outlineColor: '',
  outline: 'solid',
};

export const DEFAULT_FRAME: Partial<Component> = {
  z: 2,
  height: 80,
  width: 120,
  rotation: 0,
  data: JSON.stringify(DEFAULT_FRAME_DATA),
  style: JSON.stringify(DEFAULT_FRAME_STYLES),
};
