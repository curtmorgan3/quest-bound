import type { Application, Container as TContainer } from 'pixi.js';
import { Container } from 'pixi.js';
import { clearSelection } from '../cache';
import { drawGrid } from './grid';

/**
 * Adds grid and click event handlers
 */
export const drawBackground = (app: Application): TContainer => {
  const stageBackground = new Container({
    label: 'editor-background',
    hitArea: app.renderer.screen,
  });

  stageBackground.on('pointerup', () => {
    clearSelection();
  });

  drawGrid(stageBackground);

  return stageBackground;
};
