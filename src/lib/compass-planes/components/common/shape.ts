import { Graphics, type Container } from 'pixi.js';
import { getComponentState, getZoom } from '../../cache';
import { EditorStyles } from '../../styles';
import type { EditorComponent } from '../../types';
import { drawBase } from '../decorators';

export function drawShape(parent: Container, component: EditorComponent) {
  const graphics = new Graphics({
    label: `shape-${component.id}`,
  });

  const initialZoom = getZoom();

  graphics.rect(0, 0, component.width * initialZoom, component.height * initialZoom);

  graphics.fill(component.style.backgroundColor ?? EditorStyles.componentBackgroundColor);

  graphics.onRender = () => {
    const componentState = getComponentState(component.id);
    if (!componentState) return;

    // graphics.width = componentState.width * getZoom();
    // graphics.height = componentState.height * getZoom();
  };

  drawBase(parent, component).addChild(graphics);
}
