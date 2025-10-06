import { type Application } from 'pixi.js';
import {
  componentsAreDragging,
  componentsAreResizing,
  getCameraPosition,
  getZoom,
  setCameraPosition,
  setZoom,
  togglePanning,
  toggleZooming,
} from '../cache';

const ZOOM_ENABLED = true;
const PAN_ENABLED = true;
const PAN_SENSITIVITY = 5;

export const addCameraHandlers = (app: Application) => {
  // Handle Zoom
  app.stage.on('wheel', (e) => {
    if (componentsAreDragging() || !ZOOM_ENABLED) return;
    if (!e.metaKey) return;
    toggleZooming(true);
    e.stopPropagation();
    e.preventDefault();

    // Zooming out
    if (e.deltaY > 0) {
      setZoom(getZoom() * 0.99);
      // Zooming in
    } else {
      setZoom(getZoom() * 1.01);
    }

    setTimeout(() => {
      toggleZooming(false);
    }, 200);
  });

  // Handle Pan
  app.stage.on('wheel', (e) => {
    if (componentsAreResizing() || !PAN_ENABLED) return;
    if (e.metaKey) return;
    togglePanning(true);
    e.stopPropagation();
    e.preventDefault();

    const pos = getCameraPosition();

    if (e.deltaX >= 1) {
      pos.x = pos.x + PAN_SENSITIVITY;
    } else if (e.deltaX <= -1) {
      pos.x = pos.x - PAN_SENSITIVITY;
    }

    if (e.deltaY >= 1) {
      pos.y = pos.y + PAN_SENSITIVITY;
    } else if (e.deltaY <= -1) {
      pos.y = pos.y - PAN_SENSITIVITY;
    }

    setCameraPosition(pos);

    setTimeout(() => {
      togglePanning(false);
    }, 200);
  });
};
