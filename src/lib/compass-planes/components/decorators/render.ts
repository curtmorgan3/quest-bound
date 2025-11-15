import type { Component } from '@/types';
import { OutlineFilter } from 'pixi-filters';
import type { Container as TContainer } from 'pixi.js';
import { Container } from 'pixi.js';
import { getComponentState, getZoom } from '../../cache';

/**
 * Renders component element.
 * Resizes based on zoom.
 */
export const drawRender = (parent: TContainer, component: Component) => {
  const renderContainer = new Container({
    label: `render-${component.id}`,
  });

  parent.addChild(renderContainer);

  let lastBorderWidth = component.borderWidth ?? 0;
  let lastBorderColor = component.borderColor ?? '#000000';
  let lastOpacity = component.opacity ?? 1;
  let outlineFilter: OutlineFilter | null = null;

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

    const currentBorderWidth = componentState.borderWidth ?? 0;
    const currentBorderColor = componentState.borderColor ?? '#000000';
    const currentOpacity = componentState.opacity ?? 1;

    // Check if border properties changed
    const borderChanged =
      currentBorderWidth !== lastBorderWidth ||
      currentBorderColor !== lastBorderColor ||
      currentOpacity !== lastOpacity ||
      !outlineFilter;

    if (borderChanged) {
      lastBorderWidth = currentBorderWidth;
      lastBorderColor = currentBorderColor;
      lastOpacity = currentOpacity;

      // Update or remove filter
      if (currentBorderWidth > 0) {
        if (!outlineFilter) {
          outlineFilter = new OutlineFilter({
            thickness: currentBorderWidth,
            alpha: currentOpacity,
            color: currentBorderColor,
          });
        } else {
          outlineFilter.thickness = currentBorderWidth;
          outlineFilter.alpha = currentOpacity;
          outlineFilter.color = currentBorderColor;
        }
        renderContainer.filters = [outlineFilter];
      } else {
        renderContainer.filters = null;
        outlineFilter = null;
      }
    }
  };

  return renderContainer;
};
