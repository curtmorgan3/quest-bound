import { type Container as TContainer } from 'pixi.js';
import { dragClickStartPosition, getAllComponents } from '../cache';
import { clearSelection, selectComponent } from '../cache/interactive-state';

export const handleClickAndDragToSelect = (parent: TContainer) => {
  parent.on('pointerdown', (e) => {
    dragClickStartPosition.copyFrom(e.global);
  });

  parent.on('pointerup', (e) => {
    const dragEndPosition = e.global;
    const components = getAllComponents();

    // Calculate the selection rectangle bounds
    const minX = Math.min(dragClickStartPosition.x, dragEndPosition.x);
    const maxX = Math.max(dragClickStartPosition.x, dragEndPosition.x);
    const minY = Math.min(dragClickStartPosition.y, dragEndPosition.y);
    const maxY = Math.max(dragClickStartPosition.y, dragEndPosition.y);

    // Clear existing selection
    clearSelection();

    // Find components that are fully enveloped within the selection rectangle
    const selectedComponents = components.filter((component) => {
      const componentLeft = component.x;
      const componentRight = component.x + component.width;
      const componentTop = component.y;
      const componentBottom = component.y + component.height;

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
      selectComponent(component.id);
    });
  });
};
