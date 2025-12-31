import { DEFAULT_GRID_SIZE } from '@/lib/compass-planes/editor-config';
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
