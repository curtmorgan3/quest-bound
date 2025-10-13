import type { Component } from '@/types';
import { Graphics, type Container } from 'pixi.js';
import { getComponentState, getZoom } from '../../cache';
import { drawBase } from '../decorators';

export function drawShape(parent: Container, component: Component) {
  const graphics = new Graphics({
    label: component.id,
  });

  const initialZoom = getZoom();

  graphics.rect(0, 0, component.width * initialZoom, component.height * initialZoom);
  graphics.fill('#FFF');
  graphics.tint = component.color;

  graphics.onRender = () => {
    const componentState = getComponentState(component.id);
    if (componentState?.color && componentState.color !== component.color) {
      graphics.tint = componentState.color;
    }
  };

  drawBase(parent, component).addChild(graphics);
}
