import type { Component } from '@/types';
import { debugLog } from '@/utils';
import type { Container as TContainer } from 'pixi.js';
import { Container, DEG_TO_RAD } from 'pixi.js';
import {
  clearDragging,
  getCameraPosition,
  getComponentState,
  getSelectedComponents,
  getZoom,
  isSelected,
  startDragging,
} from '../../cache';
import { drawRender } from './render';
import { drawResize } from './resize';
import { drawSelect } from './select';

const { log } = debugLog('planes', 'component-base');

/**
 * Draws base container and adds decorators.
 * Updates cache to track dragging.
 * Repositions based on zoom.
 */
export function drawBase(parent: TContainer, component: Component): TContainer {
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
    if (!componentState) {
      // Elements are removed in editorState, but this render might occur first.
      parent.removeChild(base);
      base.destroy();
      return;
    }

    const zoom = getZoom();
    const pos = getCameraPosition();

    const cullingBuffer = 200;

    const leftLimit = pos.x - cullingBuffer;
    const rightLimit = (window.visualViewport?.width ?? 0) / zoom + pos.x + cullingBuffer;

    if (componentState.x < leftLimit || componentState.x > rightLimit) {
      base.visible = false;
    } else {
      base.visible = true;
    }

    base.x = (componentState.x - pos.x) * zoom;
    base.y = (componentState.y - pos.y) * zoom;
    base.zIndex = componentState.z;
    base.rotation = componentState.rotation * DEG_TO_RAD;
    base.alpha = componentState.opacity;
  };

  base.on('pointerdown', (e) => {
    log('pointerdown');
    const componentState = getComponentState(component.id);
    if (componentState?.locked) return;

    startDragging(component.id, e.global);

    // Drag all selected components together
    if (isSelected(component.id)) {
      for (const component of getSelectedComponents().filter((c) => !c.locked)) {
        startDragging(component.id, e.global);
      }
    }
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
