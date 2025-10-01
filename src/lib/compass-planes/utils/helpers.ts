import { getGridSize } from '../cache';

export function clampToGrid(value: number) {
  const gridSize = getGridSize();
  // Snap to grid by rounding to the nearest grid multiple
  const snappedValue = Math.floor(value / gridSize) * gridSize;
  // Ensure minimum size (at least one grid unit)
  return Math.max(gridSize, snappedValue);
}
