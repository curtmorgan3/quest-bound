import type { Container as TContainer } from 'pixi.js';
import { Container } from 'pixi.js';
import { getComponentState, getZoom } from '../../cache';
import type { EditorComponent } from '../../types';

export const drawRender = (parent: TContainer, component: EditorComponent) => {
  const renderContainer = new Container({ label: `render-${component.id}` });

  parent.addChild(renderContainer);

  renderContainer.onRender = () => {
    const componentState = getComponentState(component.id);
    if (!componentState) return;

    const zoom = getZoom();

    renderContainer.height = componentState.height * zoom;
    renderContainer.width = componentState.width * zoom;

    const renderBody = renderContainer.getChildByLabel(component.id);
    if (renderBody) {
      renderBody.scale.set(zoom, zoom);
    }
  };

  return renderContainer;
};
