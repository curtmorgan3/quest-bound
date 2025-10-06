import type { Component } from '@/types';
import { debugLog } from '@/utils';
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

const { log } = debugLog('planes', 'component-select');

const SELECTION_MOVE_THRESHOLD = 10;

function movedBeyondThreshold(start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  return Math.sqrt(dx * dx + dy * dy) > SELECTION_MOVE_THRESHOLD;
}

/**
 * Adds a border to selected component.
 * Toggles selected state on component click.
 */
export const drawSelect = (parent: TContainer, component: Component): TContainer => {
  const lastMousePos = new Point(component.x, component.y);

  const selectBox = new Container({
    label: 'selection-box',
    eventMode: 'static',
  });

  selectBox.on('pointerdown', (e) => {
    log('pointerdown');
    lastMousePos.copyFrom(e.global);
  });

  selectBox.on('pointerup', (e) => {
    log('pointerup');
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
      const zoom = getZoom();
      const componentState = getComponentState(component.id);
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
