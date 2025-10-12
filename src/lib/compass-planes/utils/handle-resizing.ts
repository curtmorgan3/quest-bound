import type { Component } from '@/types';
import type { Application } from 'pixi.js';
import {
  clearResizing,
  getComponentResizeCorner,
  getComponentState,
  getResizeComponentId,
  resizeStartPosition,
  setComponetState,
} from '../cache';
import { handleComponentCrud } from './handle-component-crud';
import { clampToGrid } from './helpers';

export const addResizeHandlers = (app: Application) => {
  const updates: Map<string, Partial<Component>> = new Map();

  app.stage.on('pointermove', (e) => {
    const resizedComponentId = getResizeComponentId();
    if (!resizedComponentId) return;

    const deltaX = clampToGrid(e.global.x - resizeStartPosition.x);
    const deltaY = clampToGrid(e.global.y - resizeStartPosition.y);

    const component = getComponentState(resizedComponentId);
    if (!component) return;
    const corner = getComponentResizeCorner();
    if (!corner) return;

    // TODO: Pull these from a map based on component type
    const minWidth = 20;
    const minHeight = 20;

    let newWidth: number = 0;
    let newHeight: number = 0;
    let widthDelta: number = 0;
    let heightDelta: number = 0;

    switch (corner) {
      case 'bottom-right':
        newWidth = clampToGrid(component.width + deltaX);
        newHeight = clampToGrid(component.height + deltaY);
        break;
      case 'bottom-left':
        // Resize from bottom-left: adjust width and height, move x position
        newWidth = clampToGrid(component.width - deltaX);
        newHeight = clampToGrid(component.height + deltaY);
        widthDelta = newWidth - component.width;
        break;
      case 'top-right':
        // Resize from top-right: adjust width and height, move y position
        newWidth = clampToGrid(component.width + deltaX);
        newHeight = clampToGrid(component.height - deltaY);
        heightDelta = newHeight - component.height;
        break;
      case 'top-left':
        // Resize from top-left: adjust width and height, move both x and y positions
        newWidth = clampToGrid(component.width - deltaX);
        newHeight = clampToGrid(component.height - deltaY);
        widthDelta = newWidth - component.width;
        heightDelta = newHeight - component.height;
        break;
    }

    if (newWidth >= minWidth) {
      component.x = clampToGrid(component.x - widthDelta);
    }

    if (newHeight >= minHeight) {
      component.y = clampToGrid(component.y - heightDelta);
    }

    component.width = Math.max(minWidth, newWidth);
    component.height = Math.max(minHeight, newHeight);

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
      handleComponentCrud.onComponentsUpdated(
        Array.from(updates).map(([id, update]) => ({ id, ...update }) as Component),
      );
      updates.clear();
    }

    clearResizing();
  });
};
