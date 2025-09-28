import { EditorStyles } from '../styles';

let zoom = 1;
let isZooming = false;
let gridSize = EditorStyles.initialGridSize;

export function setZoom(newZoom: number) {
  zoom = newZoom;
}

export function getZoom() {
  return zoom;
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
  return gridSize * zoom;
}
