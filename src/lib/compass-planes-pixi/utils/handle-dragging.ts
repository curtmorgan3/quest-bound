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
  getGroupedComponents,
  setComponetState,
} from '../cache';
import { MIN_CAMERA_X, MIN_CAMERA_Y } from '../constants';
import { handleComponentCrud } from './handle-component-crud';
import { clampToGrid } from './helpers';

const { log } = debugLog('planes', 'drag-handlers');

export const addDragHandlers = (app: Application) => {
  const updates: Map<string, Partial<Component>> = new Map();

  app.stage.on('pointermove', (e) => {
    if (!componentsAreDragging()) return;
    // Don't drag component if resize handle is being dragged
    if (componentsAreResizing()) return;

    const deltaX = Math.floor(e.global.x - dragStartPosition.x);
    const deltaY = Math.floor(e.global.y - dragStartPosition.y);

    const draggedComponents = getDraggedComponents().map((id) => getComponentState(id));
    const draggedGroupIds = new Set(draggedComponents.map((c) => c?.groupId));

    const groupedDraggedComponents: Array<Component> = [];

    for (const groupId of [...draggedGroupIds]) {
      if (!groupId) continue;
      const groupedComponents = getGroupedComponents(groupId);
      groupedDraggedComponents.push(...groupedComponents);
    }

    // Place ungrouped components back in the drag array
    for (const draggedComp of draggedComponents) {
      if (draggedComp && !groupedDraggedComponents.find((c) => c.id === draggedComp.id)) {
        groupedDraggedComponents.push(draggedComp);
      }
    }

    for (const component of groupedDraggedComponents) {
      if (component) {
        log(`Dragging ${component.id}`);
        const newX = clampToGrid(component.x + deltaX);
        const newY = clampToGrid(component.y + deltaY);

        component.x = Math.max(MIN_CAMERA_X, newX);
        component.y = Math.max(MIN_CAMERA_Y, newY);

        const update = { x: component.x, y: component.y };
        setComponetState(component.id, update);
        updates.set(component.id, update);
      }
    }

    const dragStartPosX = clampToGrid(e.global.x);
    const dragStartPosY = clampToGrid(e.global.y);
    dragStartPosition.set(dragStartPosX, dragStartPosY);
  });

  app.stage.on('pointerup', () => {
    if (updates.size !== 0) {
      handleComponentCrud.onComponentsUpdated(
        Array.from(updates).map(([id, update]) => ({ id, ...update }) as Component),
      );
      updates.clear();
    }

    clearDragging();
  });
};
