import { getGridSize } from '../cache';

export function clampToGrid(value: number) {
  const gridSize = getGridSize();
  return Math.floor(value / gridSize) * gridSize;
}
