import type { Application } from 'pixi.js';
import {
  clearResizing,
  getComponentResizeCorner,
  getComponentState,
  getResizeComponentId,
  resizeStartPosition,
  setComponetState,
} from '../cache';
import type { EditorComponent } from '../types';
import { clampToGrid } from './helpers';

export const addResizeHandlers = (
  app: Application,
  onUpdate: (updates: Array<EditorComponent>) => void,
) => {
  const updates: Map<string, Partial<EditorComponent>> = new Map();

  app.stage.on('pointermove', (e) => {
    const resizedComponentId = getResizeComponentId();
    if (!resizedComponentId) return;

    const deltaX = e.global.x - resizeStartPosition.x;
    const deltaY = e.global.y - resizeStartPosition.y;

    const component = getComponentState(resizedComponentId);
    if (!component) return;
    const corner = getComponentResizeCorner();
    if (!corner) return;

    let newWidth: number;
    let newHeight: number;
    let widthDelta: number;
    let heightDelta: number;

    switch (corner) {
      case 'bottom-right':
        component.width = clampToGrid(component.width + deltaX);
        component.height = clampToGrid(component.height + deltaY);
        break;
      case 'bottom-left':
        // Resize from bottom-left: adjust width and height, move x position
        newWidth = clampToGrid(component.width - deltaX);
        newHeight = clampToGrid(component.height + deltaY);
        widthDelta = newWidth - component.width;
        component.x = clampToGrid(component.x - widthDelta);
        component.width = newWidth;
        component.height = newHeight;
        break;
      case 'top-right':
        // Resize from top-right: adjust width and height, move y position
        newWidth = clampToGrid(component.width + deltaX);
        newHeight = clampToGrid(component.height - deltaY);
        heightDelta = newHeight - component.height;
        component.y = clampToGrid(component.y - heightDelta);
        component.width = newWidth;
        component.height = newHeight;
        break;
      case 'top-left':
        // Resize from top-left: adjust width and height, move both x and y positions
        newWidth = clampToGrid(component.width - deltaX);
        newHeight = clampToGrid(component.height - deltaY);
        widthDelta = newWidth - component.width;
        heightDelta = newHeight - component.height;
        component.x = clampToGrid(component.x - widthDelta);
        component.y = clampToGrid(component.y - heightDelta);
        component.width = newWidth;
        component.height = newHeight;
        break;
    }

    const update = {
      x: component.x,
      y: component.y,
      width: component.width,
      height: component.height,
    };
    setComponetState(resizedComponentId, update);
    updates.set(resizedComponentId, update);

    const dragStartPosX = clampToGrid(e.global.x);
    const dragStartPosY = clampToGrid(e.global.y);
    resizeStartPosition.set(dragStartPosX, dragStartPosY);
  });

  app.stage.on('pointerup', () => {
    if (updates.size !== 0) {
      onUpdate(Array.from(updates).map(([id, update]) => ({ id, ...update }) as EditorComponent));
      updates.clear();
    }

    clearResizing();
  });
};
