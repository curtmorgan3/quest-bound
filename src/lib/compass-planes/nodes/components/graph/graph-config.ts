import { DEFAULT_GRID_SIZE } from '@/lib/compass-planes/editor-config';
import { colorPaper, colorWhite } from '@/palette';
import type { Component, ComponentStyle, GraphComponentData } from '@/types';
import { ComponentTypes, type SheetComponentType } from '../../node-types';

export const graphConfig: SheetComponentType = {
  label: 'Graph',
  description: 'A progress graph showing a ratio (numerator/denominator) from number attributes.',
  type: ComponentTypes.GRAPH,
  minWidth: DEFAULT_GRID_SIZE,
  minHeight: DEFAULT_GRID_SIZE,
  defaultWidth: 4 * DEFAULT_GRID_SIZE,
  defaultHeight: 2 * DEFAULT_GRID_SIZE,
  maxHeight: 100 * DEFAULT_GRID_SIZE,
  maxWidth: 100 * DEFAULT_GRID_SIZE,
  defaultRotation: 0,
  defaultLayer: 2,
  transparent: true,
  scalable: true,
};

const DEFAULT_GRAPH_DATA: GraphComponentData = {
  graphVariant: 'horizontal-linear',
  animationDebounceSeconds: 0.15,
};

const DEFAULT_GRAPH_STYLES: ComponentStyle = {
  backgroundColor: colorPaper,
  color: colorWhite,
  opacity: 1,
  borderRadiusTopLeft: 0,
  borderRadiusTopRight: 0,
  borderRadiusBottomLeft: 0,
  borderRadiusBottomRight: 0,
  outlineWidth: 0,
  outlineColor: '',
  outline: 'solid',
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  paddingRight: 0,
};

export const DEFAULT_GRAPH: Partial<Component> = {
  z: graphConfig.defaultLayer,
  height: graphConfig.defaultHeight,
  width: graphConfig.defaultWidth,
  rotation: graphConfig.defaultRotation,
  data: JSON.stringify(DEFAULT_GRAPH_DATA),
  style: JSON.stringify(DEFAULT_GRAPH_STYLES),
};
