import type { Component } from '@/types';
import { debugLog } from '@/utils';
import type { Application, Container as TContainer } from 'pixi.js';
import { Container } from 'pixi.js';
import {
  clearSelection,
  componentsAreResizing,
  getCameraPosition,
  getPlacingType,
  getZoom,
  setPlacingType,
} from '../cache';
import { createComponent, handleClickAndDragToSelect } from '../utils';
import { drawClickDragSelectBox } from './click-drag-select-box';
import { drawGrid } from './grid';

const { log } = debugLog('planes', 'editor-background');

/**
 * Adds grid and click event handlers
 */
export const drawBackground = async (
  app: Application,
  onCreated: (comps: Array<Component>) => void,
): Promise<TContainer> => {
  const stageBackground = new Container({
    label: 'editor-background',
    hitArea: app.renderer.screen,
  });

  stageBackground.on('pointerup', (e) => {
    log('pointerup');
    const placingType = getPlacingType();

    if (placingType) {
      const cameraPos = getCameraPosition();
      const zoom = getZoom();
      const adjustedX = (e.globalX + cameraPos.x) * zoom;
      const adjustedY = (e.globalY + cameraPos.y) * zoom;

      const comp = createComponent(app.stage, placingType, adjustedX, adjustedY);
      if (!comp) return;
      onCreated([comp]);
      setPlacingType(null);
    }

    if (!componentsAreResizing()) {
      clearSelection();
    }
  });

  await drawGrid(stageBackground);
  drawClickDragSelectBox(stageBackground);

  handleClickAndDragToSelect(stageBackground);

  return stageBackground;
};
