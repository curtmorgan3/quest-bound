import { DEFAULT_GRID_SIZE } from '@/lib/compass-planes/editor-config';
import type { Component, ComponentStyle, ImageComponentData } from '@/types';
import { ComponentTypes, type SheetComponentType } from '../../node-types';

export const imageConfig: SheetComponentType = {
  label: 'Image',
  description: 'Display an image asset.',
  type: ComponentTypes.IMAGE,
  minWidth: DEFAULT_GRID_SIZE,
  minHeight: DEFAULT_GRID_SIZE,
  defaultWidth: 4 * DEFAULT_GRID_SIZE,
  defaultHeight: 4 * DEFAULT_GRID_SIZE,
  maxHeight: 100 * DEFAULT_GRID_SIZE,
  maxWidth: 100 * DEFAULT_GRID_SIZE,
  defaultRotation: 0,
  defaultLayer: 2,
  transparent: true,
  scalable: true,
};

const DEFAULT_IMAGE_DATA: ImageComponentData = {
  assetId: undefined,
  useCharacterImage: false,
};

const DEFAULT_IMAGE_STYLES: ComponentStyle = {
  backgroundColor: '#FFFFFF',
  opacity: 1,
  borderRadiusTopLeft: 0,
  borderRadiusTopRight: 0,
  borderRadiusBottomLeft: 0,
  borderRadiusBottomRight: 0,
  outlineWidth: 0,
  outlineColor: '',
  outline: 'solid',
};

export const DEFAULT_IMAGE: Partial<Component> = {
  z: 2,
  height: 80,
  width: 80,
  rotation: 0,
  data: JSON.stringify(DEFAULT_IMAGE_DATA),
  style: JSON.stringify(DEFAULT_IMAGE_STYLES),
};
