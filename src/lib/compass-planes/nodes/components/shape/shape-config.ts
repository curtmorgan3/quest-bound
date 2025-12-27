import { ComponentTypes, type SheetComponentType } from '../../node-types';

export const shapeConfig: SheetComponentType = {
  label: 'Shape',
  description:
    'A rectangle or regular polygon. Useful for creating backgrounds and visually distinct sections.',
  type: ComponentTypes.SHAPE,
  minWidth: 20,
  minHeight: 20,
  defaultWidth: 3 * 20,
  defaultHeight: 3 * 20,
  maxHeight: 100 * 20,
  maxWidth: 100 * 20,
  defaultRotation: 0,
  defaultLayer: 2,
  transparent: true,
  scalable: true,
};
