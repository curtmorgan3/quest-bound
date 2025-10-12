import { debugLog } from '@/utils';
import type { Application, Container as TContainer } from 'pixi.js';
import { Container } from 'pixi.js';
import { clearSelection, componentsAreResizing } from '../cache';
import { handleClickAndDragToSelect } from '../utils';
import { drawClickDragSelectBox } from './click-drag-select-box';
import { drawGrid } from './grid';

const { log } = debugLog('planes', 'editor-background');

/**
 * Adds grid and click event handlers
 */
export const drawBackground = async (app: Application): Promise<TContainer> => {
  const stageBackground = new Container({
    label: 'editor-background',
    hitArea: app.renderer.screen,
  });

  stageBackground.on('pointerup', () => {
    log('pointerup');
    if (!componentsAreResizing()) {
      clearSelection();
    }
  });

  await drawGrid(stageBackground);
  drawClickDragSelectBox(stageBackground);

  handleClickAndDragToSelect(stageBackground);

  return stageBackground;
};
