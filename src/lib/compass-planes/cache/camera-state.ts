import { EditorStyles } from '../constants';

let zoom = 1;
let isZooming = false;
let gridSize = EditorStyles.initialGridSize;
let isPanning = false;

let x = 0;
let y = 0;

export function setZoom(newZoom: number) {
  zoom = newZoom;
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

export function isCurrentlyPanning() {
  return isPanning;
}

export function togglePanning(panning: boolean) {
  isPanning = panning;
}

export function setCameraPosition(position: { x: number; y: number }) {
  x = position.x;
  y = position.y;
}

export function panCameraRight(value: number) {
  x += value;
}

export function panCameraDown(value: number) {
  y += value;
}

export function getCameraPosition() {
  return {
    x,
    y,
  };
}
