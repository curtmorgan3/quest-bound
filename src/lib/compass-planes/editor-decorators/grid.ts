import type { Container as TContainer, Graphics as TGraphics } from 'pixi.js';
import { Graphics, Ticker } from 'pixi.js';
import { getGridSize, isCurrentlyZooming } from '../cache';
import { EditorStyles } from '../styles';

/**
 * Draws grid based on editor styles.
 */
export const drawGrid = (parent: TContainer): TGraphics => {
  const ticker = new Ticker();

  function buildGrid(graphics: TGraphics) {
    const viewportWidth = window.innerWidth;
    const numLines = (viewportWidth + 400) / getGridSize();
    for (let i = 0; i <= numLines; i++) {
      graphics.moveTo(i * getGridSize(), 0).lineTo(i * getGridSize(), numLines * getGridSize());
    }

    for (let i = 0; i <= numLines; i++) {
      graphics.moveTo(0, i * getGridSize()).lineTo(numLines * getGridSize(), i * getGridSize());
    }

    return graphics;
  }

  let grid = buildGrid(new Graphics({ label: 'grid' })).stroke({
    color: EditorStyles.gridLineColor,
    pixelLine: true,
    alpha: 0.1,
    width: 1,
  });

  ticker.add(() => {
    if (!isCurrentlyZooming()) return;
    parent.removeChild(grid);
    grid = buildGrid(new Graphics({ label: 'grid' })).stroke({
      color: EditorStyles.gridLineColor,
      pixelLine: true,
      alpha: 0.1,
      width: 1,
    });
    parent.addChild(grid);
  });

  ticker.start();

  if (getGridSize() > 1) {
    parent.addChild(grid);
  }

  return grid;
};
