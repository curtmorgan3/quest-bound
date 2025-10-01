import type { Container as TContainer } from 'pixi.js';
import { Container, Graphics } from 'pixi.js';
import type { EditorComponent } from '../..';
import { getComponentState, isSelected } from '../../cache';
import { drawResizeHandle } from './resize-handle';

/**
 * Container to hold resize handles on each corner of a component.
 * Only visible when the component is selected.
 */
export const drawResize = (parent: TContainer, component: EditorComponent): Container => {
  const resizeContainer = new Container({
    eventMode: 'static',
    label: `resize-${component.id}`,
  });

  function drawHandles(componentState: EditorComponent): Graphics[] {
    const handles = [];

    for (let i = 0; i < 4; i++) {
      const corner = ['top-left', 'top-right', 'bottom-left', 'bottom-right'][i] as
        | 'top-left'
        | 'top-right'
        | 'bottom-left'
        | 'bottom-right';
      handles.push(drawResizeHandle(componentState, corner));
    }

    return handles;
  }

  parent.addChild(resizeContainer);

  let handles: Graphics[] = [];

  const lastComponentSize = { width: component.width, height: component.height };

  resizeContainer.onRender = () => {
    const componentState = getComponentState(component.id);
    if (!componentState) return;

    if (!isSelected(component.id)) {
      for (const handle of handles) {
        resizeContainer.removeChild(handle);
        handle.destroy();
        handles = [];
      }
      return;
    }

    lastComponentSize.width = componentState.width;
    lastComponentSize.height = componentState.height;

    handles.forEach((h) => h.destroy());

    handles = drawHandles(componentState);
    for (const handle of handles) {
      resizeContainer.addChild(handle);
    }
  };

  return resizeContainer;
};
