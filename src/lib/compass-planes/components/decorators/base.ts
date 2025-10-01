import { debugLog } from '@/utils';
import type { Container as TContainer } from 'pixi.js';
import { Container, Point } from 'pixi.js';
import {
  clearDragging,
  dragStartPosition,
  getComponentState,
  getSelectedComponents,
  getZoom,
  isSelected,
  startDragging,
} from '../../cache';
import type { EditorComponent } from '../../types';
import { drawRender } from './render';
import { drawResize } from './resize';
import { drawSelect } from './select';

const { log } = debugLog('planes', 'component-base');

/**
 * Draws base container and adds decorators.
 * Updates cache to track dragging.
 * Repositions based on zoom.
 */
export function drawBase(parent: TContainer, component: EditorComponent): TContainer {
  const lastMousePos = new Point();

  const initialZoom = getZoom();

  const base = new Container({
    eventMode: 'static',
    label: `component-${component.id}`,
    rotation: component.rotation,
    height: 0,
    width: 0,
    x: component.x * initialZoom,
    y: component.y * initialZoom,
  });

  base.onRender = () => {
    const componentState = getComponentState(component.id);
    if (!componentState) return;

    const zoom = getZoom();
    base.x = componentState.x * zoom;
    base.y = componentState.y * zoom;
  };

  base.on('pointerdown', (e) => {
    log('pointerdown');
    lastMousePos.copyFrom(e.global);
    startDragging(component.id);

    // Drag all selected components together
    if (isSelected(component.id)) {
      for (const componentId of getSelectedComponents()) {
        startDragging(componentId);
      }
    }
    dragStartPosition.copyFrom(e.global);
  });

  base.on('pointerup', () => {
    log('pointerup');
    clearDragging();
  });

  parent.addChild(base);

  const resize = drawResize(base, component);
  const selectBox = drawSelect(resize, component);
  const renderBox = drawRender(selectBox, component);

  return renderBox;
}
