import type { Container as TContainer } from 'pixi.js';
import { Container, Graphics } from 'pixi.js';
import { dragClickStartPosition } from '../cache';
import { EditorStyles } from '../styles';

export const drawClickDragSelectBox = (parent: TContainer): TContainer => {
  const dragSelectBox = new Container({ label: 'click-drag-select' });

  const graphics = new Graphics();

  dragSelectBox.addChild(graphics);

  graphics.onRender = (renderer) => {
    graphics.clear();
    if (dragClickStartPosition.x === -1) {
      return;
    }

    const mousePos = renderer.events.pointer.global;

    // Calculate bounds to support dragging from all directions
    const minX = Math.min(dragClickStartPosition.x, mousePos.x);
    const maxX = Math.max(dragClickStartPosition.x, mousePos.x);
    const minY = Math.min(dragClickStartPosition.y, mousePos.y);
    const maxY = Math.max(dragClickStartPosition.y, mousePos.y);

    const width = maxX - minX;
    const height = maxY - minY;

    graphics
      .rect(minX, minY, width, height)
      .fill({ color: EditorStyles.selectionBoxColor, alpha: 0.2 });
  };

  parent.addChild(dragSelectBox);

  return dragSelectBox;
};
