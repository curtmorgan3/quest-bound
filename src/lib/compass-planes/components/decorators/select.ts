import type { Container as TContainer } from 'pixi.js';
import { Container, Graphics, Point, Ticker } from 'pixi.js';
import { clearSelection, isSelected, otherComponentIsSelected, toggleSelection } from '../../cache';
import { EditorStyles } from '../../styles';
import type { EditorComponent } from '../../types';

const SELECTION_MOVE_THRESHOLD = 10;

function movedBeyondThreshold(start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.sqrt(dx * dx + dy * dy) > SELECTION_MOVE_THRESHOLD;
}

export const drawSelect = (parent: TContainer, component: EditorComponent): TContainer => {
  const ticker = new Ticker();
  const lastMousePos = new Point(component.position.x, component.position.y);

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
  border.rect(0, 0, component.size.width, component.size.height);
  border.stroke({
    width: EditorStyles.selectionBoxWidth,
    color: EditorStyles.selectionBoxColor,
  });

  ticker.add(() => {
    if (isSelected(component.id)) {
      selectBox.addChild(border);
    } else {
      selectBox.removeChild(border);
    }
  });

  ticker.start();

  parent.addChild(selectBox);
  return selectBox;
};
