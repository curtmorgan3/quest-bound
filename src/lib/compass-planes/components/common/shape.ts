import type { Component } from '@/types';
import { Graphics, type Container } from 'pixi.js';
import { getZoom } from '../../cache';
import { EditorStyles } from '../../styles';
import { drawBase } from '../decorators';

export function drawShape(parent: Container, component: Component) {
  const graphics = new Graphics({
    label: component.id,
  });

  const initialZoom = getZoom();

  graphics.rect(0, 0, component.width * initialZoom, component.height * initialZoom);

  graphics.fill(component.style.backgroundColor ?? EditorStyles.componentBackgroundColor);

  drawBase(parent, component).addChild(graphics);
}
