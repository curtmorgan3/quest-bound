import type { Component } from '@/types';
import { debugLog } from '@/utils';
import type { Application } from 'pixi.js';
import {
  clearDragging,
  componentsAreDragging,
  componentsAreResizing,
  dragStartPosition,
  getComponentState,
  getDraggedComponents,
  setComponetState,
} from '../cache';
import { clampToGrid } from './helpers';

const { log } = debugLog('planes', 'drag-handlers');

export const addDragHandlers = (
  app: Application,
  onUpdate: (updates: Array<Component>) => void,
) => {
  const updates: Map<string, Partial<Component>> = new Map();

  app.stage.on('pointermove', (e) => {
    if (!componentsAreDragging()) return;
    // Don't drag component if resize handle is being dragged
    if (componentsAreResizing()) return;

    const deltaX = Math.floor(e.global.x - dragStartPosition.x);
    const deltaY = Math.floor(e.global.y - dragStartPosition.y);

    for (const componentId of getDraggedComponents()) {
      const component = getComponentState(componentId);

      if (component) {
        log(`Dragging ${component.id}`);
        const newX = component.x + deltaX;
        const newY = component.y + deltaY;
        component.x = clampToGrid(newX);
        component.y = clampToGrid(newY);

        const update = { x: component.x, y: component.y };
        setComponetState(componentId, update);
        updates.set(componentId, update);
      }
    }

    const dragStartPosX = clampToGrid(e.global.x);
    const dragStartPosY = clampToGrid(e.global.y);
    dragStartPosition.set(dragStartPosX, dragStartPosY);
  });

  app.stage.on('pointerup', () => {
    if (updates.size !== 0) {
      onUpdate(Array.from(updates).map(([id, update]) => ({ id, ...update }) as Component));
      updates.clear();
    }

    clearDragging();
  });
};
