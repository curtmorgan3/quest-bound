import type { Container as TContainer, Graphics as TGraphics } from 'pixi.js';
import { Graphics } from 'pixi.js';
import { EditorStyles } from '../styles';

/**
 * Draws grid based on editor styles.
 */
export const drawGrid = (parent: TContainer): TGraphics => {
  const viewportWidth = window.innerWidth;
  const gridSize = EditorStyles.gridSize;
  const numLines = (viewportWidth + 400) / gridSize;

  function buildGrid(graphics: TGraphics) {
    for (let i = 0; i <= numLines; i++) {
      graphics.moveTo(i * gridSize, 0).lineTo(i * gridSize, numLines * gridSize);
    }

    for (let i = 0; i <= numLines; i++) {
      graphics.moveTo(0, i * gridSize).lineTo(numLines * gridSize, i * gridSize);
    }

    return graphics;
  }

  const grid = buildGrid(new Graphics()).stroke({
    color: EditorStyles.gridLineColor,
    pixelLine: true,
    alpha: 0.1,
    width: 1,
  });

  if (gridSize > 1) {
    parent.addChild(grid);
  }

  return grid;
};
