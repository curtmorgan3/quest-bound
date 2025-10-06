import { debugLog } from '@/utils';
import { type Container as TContainer } from 'pixi.js';
import { dragClickStartPosition, getAllComponents, getCameraPosition, getZoom } from '../cache';
import { clearSelection, componentsAreDragging, selectComponent } from '../cache/interactive-state';

const { log } = debugLog('planes', 'handle-click-drag');

export const handleClickAndDragToSelect = (parent: TContainer) => {
  parent.on('pointerdown', (e) => {
    dragClickStartPosition.copyFrom(e.global);
  });

  parent.on('pointerup', (e) => {
    const dragEndPosition = e.global;
    if (componentsAreDragging()) return;
    const components = getAllComponents();

    const zoom = getZoom();
    const cameraPos = getCameraPosition();

    // Calculate the selection rectangle bounds
    const minX = Math.min(dragClickStartPosition.x, dragEndPosition.x);
    const maxX = Math.max(dragClickStartPosition.x, dragEndPosition.x);
    const minY = Math.min(dragClickStartPosition.y, dragEndPosition.y);
    const maxY = Math.max(dragClickStartPosition.y, dragEndPosition.y);

    // Clear existing selection
    clearSelection();

    // Find components that are fully enveloped within the selection rectangle
    const selectedComponents = components.filter((component) => {
      const adjustedX = (component.x - cameraPos.x) * zoom;
      const adjustedY = (component.y - cameraPos.y) * zoom;
      const adjustedWidth = component.width * zoom;
      const adjustedHeight = component.height * zoom;

      const componentLeft = adjustedX;
      const componentRight = adjustedX + adjustedWidth;
      const componentTop = adjustedY;
      const componentBottom = adjustedY + adjustedHeight;

      // Check if component is fully within the selection rectangle
      return (
        componentLeft >= minX &&
        componentRight <= maxX &&
        componentTop >= minY &&
        componentBottom <= maxY
      );
    });

    // Select all components that are fully enveloped
    selectedComponents.forEach((component) => {
      log('selecting: ', component.id);
      selectComponent(component.id);
    });
  });
};
