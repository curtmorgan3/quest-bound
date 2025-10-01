import { Graphics } from 'pixi.js';
import { getZoom, resizeStartPosition, startResizing, stopResizing } from '../../cache';
import { EditorStyles } from '../../styles';
import type { EditorComponent } from '../../types';

export const drawResizeHandle = (
  component: EditorComponent,
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right',
): Graphics => {
  const graphics = new Graphics();

  const zoom = getZoom();
  const width = component.width * zoom;
  const height = component.height * zoom;

  const cornersMap: Map<string, Record<string, any>> = new Map([
    ['top-left', { x: 0, y: 0, cursor: 'nwse-resize' }],
    ['top-right', { x: width, y: 0, cursor: 'nesw-resize' }],
    ['bottom-left', { x: 0, y: height, cursor: 'nesw-resize' }],
    ['bottom-right', { x: width, y: height, cursor: 'nwse-resize' }],
  ]);

  const cornerPosition = cornersMap.get(corner);
  if (!cornerPosition) {
    throw new Error(`Invalid corner: ${corner}`);
  }

  graphics.circle(0, 0, 5);
  graphics.fill(EditorStyles.selectionBoxColor);
  graphics.x = cornerPosition.x;
  graphics.y = cornerPosition.y;
  graphics.cursor = cornerPosition.cursor;
  graphics.zIndex = 10;
  graphics.eventMode = 'static';

  graphics.on('pointerdown', (e) => {
    startResizing(component.id, corner);

    resizeStartPosition.copyFrom(e.global);
  });

  graphics.on('pointerup', () => {
    stopResizing();
  });

  return graphics;
};
