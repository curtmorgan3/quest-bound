import { Graphics, type Container } from 'pixi.js';
import { defaultComponentStyles } from '../../defaults';
import type { EditorComponent } from '../../types';
import { drawBase } from './base';

export function drawShape(parent: Container, component: EditorComponent) {
  const graphics = new Graphics({
    label: `shape-${component.id}`,
  });

  graphics.rect(0, 0, component.size.width, component.size.height);

  graphics.fill(component.style.backgroundColor ?? defaultComponentStyles.backgroundColor);

  drawBase(parent, component).addChild(graphics);
}
