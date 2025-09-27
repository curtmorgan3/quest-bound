import type { Container as TContainer } from 'pixi.js';
import { Container, Ticker } from 'pixi.js';
import { editorState } from '../editor';
import type { EditorComponent } from '../types';

/**
 * Draws base container, adds decorators and leaf component based on type.
 * Adds events for drag and drop, resize, rotate, etc.
 * Adds listener for component update
 */
export function drawBase(parent: TContainer, component: EditorComponent): TContainer {
  console.log('base: ', editorState);

  const ticker = new Ticker();

  const base = new Container({
    label: 'base-component',
    x: component.position.x,
    y: component.position.y,
    rotation: component.position.rotation,
    height: component.size.height,
    width: component.size.width,
  });

  ticker.add(() => {
    const updatedComponent = editorState[component.id];
    if (!updatedComponent) return;

    if (base.x !== updatedComponent.position.x) base.x = updatedComponent.position.x;
    if (base.y !== updatedComponent.position.y) base.y = updatedComponent.position.y;
    if (base.rotation !== updatedComponent.position.rotation)
      base.rotation = updatedComponent.position.rotation;
    if (base.height !== updatedComponent.size.height) base.height = updatedComponent.size.height;
    if (base.width !== updatedComponent.size.width) base.width = updatedComponent.size.width;
  });

  ticker.start();

  parent.addChild(base);
  return base;
}
