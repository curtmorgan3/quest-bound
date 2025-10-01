import { EditorStyles } from '../styles';

let zoom = 1;
let isZooming = false;
let gridSize = EditorStyles.initialGridSize;
const MAX_ZOOM = 1.4;
const MIN_ZOOM = 0.7;

export function setZoom(newZoom: number) {
  zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, newZoom));
}

export function getZoom() {
  return parseFloat(zoom.toFixed(2));
}

export function isCurrentlyZooming() {
  return isZooming;
}

export function toggleZooming(isZoom: boolean) {
  isZooming = isZoom;
}

export function setGridSize(newGridSize: number) {
  gridSize = newGridSize * zoom;
}

export function getGridSize() {
  return gridSize;
}
