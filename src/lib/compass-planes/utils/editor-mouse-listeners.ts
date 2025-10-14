import { getCameraPosition } from '../cache';

let x = 0;
let y = 0;

export function getAbsoluteMousePosition() {
  return {
    x,
    y,
  };
}

export function getRelativeMousePosition() {
  const cameraPos = getCameraPosition();
  return {
    x: x + cameraPos.x,
    y: y + cameraPos.y,
  };
}

const listeners: Array<(e: PointerEvent) => void> = [];

export function clearEditorMouseListeners() {
  for (const listener of listeners) {
    window.removeEventListener('pointermove', listener);
  }
}

export function addEditorMouseListeners() {
  const listener = (e: PointerEvent) => {
    x = e.x - 47; // sidebar width
    y = e.y;
  };

  window.addEventListener('pointermove', listener);
  listeners.push(listener);
}
