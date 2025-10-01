import type { Container as TContainer } from 'pixi.js';
import { Container, Graphics, Point } from 'pixi.js';
import {
  clearSelection,
  getComponentState,
  getZoom,
  isSelected,
  otherComponentIsSelected,
  toggleSelection,
} from '../../cache';
import { EditorStyles } from '../../styles';
import type { EditorComponent } from '../../types';

const SELECTION_MOVE_THRESHOLD = 10;

function movedBeyondThreshold(start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.sqrt(dx * dx + dy * dy) > SELECTION_MOVE_THRESHOLD;
}

export const drawSelect = (parent: TContainer, component: EditorComponent): TContainer => {
  const lastMousePos = new Point(component.x, component.y);

  const selectBox = new Container({
    label: 'selection-box',
    eventMode: 'static',
  });

  selectBox.on('pointerdown', (e) => {
    lastMousePos.copyFrom(e.global);
  });

  selectBox.on('pointerup', (e) => {
    if (movedBeyondThreshold(lastMousePos, e.global)) {
      return;
    }

    if (otherComponentIsSelected(component.id) && !e.shiftKey) {
      clearSelection();
    }
    toggleSelection(component.id);
  });

  const border = new Graphics({
    label: 'selection-border',
  });

  selectBox.addChild(border);

  selectBox.onRender = () => {
    border.clear();

    if (isSelected(component.id)) {
      const componentState = getComponentState(component.id);
      const zoom = getZoom();
      if (!componentState) return;

      border.rect(0, 0, componentState.width * zoom, componentState.height * zoom);

      border.stroke({
        width: EditorStyles.selectionBoxWidth,
        color: EditorStyles.selectionBoxColor,
      });
    }
  };

  parent.addChild(selectBox);
  return selectBox;
};
