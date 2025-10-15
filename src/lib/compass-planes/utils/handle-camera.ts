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
import {
  MAX_CAMERA_X,
  MAX_CAMERA_Y,
  MAX_ZOOM,
  MIN_CAMERA_X,
  MIN_CAMERA_Y,
  MIN_ZOOM,
  PAN_ENABLED,
  PAN_SENSITIVITY,
  ZOOM_ENABLED,
} from '../constants';

export const addCameraHandlers = (app: Application) => {
  // Handle Zoom
  app.stage.on('wheel', (e) => {
    if (componentsAreDragging() || !ZOOM_ENABLED) return;
    if (!e.metaKey) return;
    toggleZooming(true);
    e.stopPropagation();
    e.preventDefault();

    let newZoom = getZoom();

    // Zooming out
    if (e.deltaY > 0) {
      newZoom *= 0.99;
      // Zooming in
    } else {
      newZoom *= 1.01;
    }

    setZoom(Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom)));

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

    setCameraPosition({
      x: Math.max(MIN_CAMERA_X, Math.min(MAX_CAMERA_X, pos.x)),
      y: Math.max(MIN_CAMERA_Y, Math.min(MAX_CAMERA_Y, pos.y)),
    });

    setTimeout(() => {
      togglePanning(false);
    }, 200);
  });
};
