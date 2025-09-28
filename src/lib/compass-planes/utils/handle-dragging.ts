import type { Application } from 'pixi.js';
import {
  clearDragging,
  componentsAreDragging,
  dragStartPosition,
  getDraggedComponents,
} from '../cache';
import { EditorStyles } from '../styles';
import type { EditorComponent } from '../types';

function clampToGrid(value: number) {
  return Math.floor(value / EditorStyles.gridSize) * EditorStyles.gridSize;
}

export const addDragHandlers = (
  app: Application,
  onUpdate: (updates: Array<EditorComponent>) => void,
) => {
  const updates: Map<string, Partial<EditorComponent>> = new Map();

  app.stage.on('pointermove', (e) => {
    if (!componentsAreDragging()) return;

    const deltaX = e.global.x - dragStartPosition.x;
    const deltaY = e.global.y - dragStartPosition.y;

    for (const componentId of getDraggedComponents()) {
      const component = app?.stage.getChildByLabel(`component-${componentId}`);
      if (component) {
        const newX = component.x + deltaX;
        const newY = component.y + deltaY;
        component.x = clampToGrid(newX);
        component.y = clampToGrid(newY);
        updates.set(componentId, {
          position: {
            x: component.x,
            y: component.y,
            rotation: component.rotation,
            z: component.zIndex,
          },
        });
      }
    }

    const dragStartPosX = clampToGrid(e.global.x);
    const dragStartPosY = clampToGrid(e.global.y);
    dragStartPosition.set(dragStartPosX, dragStartPosY);
  });

  app.stage.on('pointerup', () => {
    if (updates.size !== 0) {
      onUpdate(Array.from(updates).map(([id, update]) => ({ id, ...update }) as EditorComponent));
      updates.clear();
    }

    clearDragging();
  });
};
