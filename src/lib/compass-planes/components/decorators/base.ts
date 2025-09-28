import type { Container as TContainer } from 'pixi.js';
import { Container, Point } from 'pixi.js';
import {
  clearDragging,
  dragStartPosition,
  getSelectedComponents,
  isSelected,
  startDragging,
} from '../../cache';
import type { EditorComponent } from '../../types';
import { drawSelect } from './select';

/**
 * Draws base container and adds decorators.
 * Updates cache to track dragging.
 * Adds listeners for component update.
 */
export function drawBase(parent: TContainer, component: EditorComponent): TContainer {
  const lastMousePos = new Point();

  const base = new Container({
    eventMode: 'static',
    label: `component-${component.id}`,
    x: component.position.x,
    y: component.position.y,
    rotation: component.position.rotation,
    height: component.size.height,
    width: component.size.width,
  });

  base.on('pointerdown', (e) => {
    lastMousePos.copyFrom(e.global);
    startDragging(component.id);

    // Drag all selected components together
    if (isSelected(component.id)) {
      for (const componentId of getSelectedComponents()) {
        startDragging(componentId);
      }
    }
    dragStartPosition.copyFrom(e.global);
  });

  base.on('pointerup', () => {
    clearDragging();
  });

  parent.addChild(base);

  return drawSelect(base, component);
}
