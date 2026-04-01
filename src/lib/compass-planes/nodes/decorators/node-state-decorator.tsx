import type { Component, ComponentData } from '@/types';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { getComponentData } from '../../utils';
import {
  getEditorPreviewStateName,
  withMergedStateLayers,
  type MergeComponentStateLayersOptions,
} from '../../utils/component-states';
import type { ViewRenderContext } from '../view-render-context';

function mergeOptsForComponent(
  component: Component,
  viewCtx: ViewRenderContext | undefined,
  hovered: boolean,
): MergeComponentStateLayersOptions {
  if (viewCtx?.characterSheet) {
    return {
      activeCustomStateName: viewCtx.componentActiveStatesById?.[component.id],
      showHoverLayer: hovered,
      showDisabledLayer: true,
    };
  }
  return {
    editorPreviewState: getEditorPreviewStateName(component),
    showHoverLayer: hovered,
    showDisabledLayer: true,
  };
}

/**
 * Outermost sheet / window viewer decorator: merges `data` and `style` from the active layer —
 * character `componentActiveStatesById` when `viewCtx.characterSheet`, otherwise
 * `component.editorStateTarget` — then hover and disabled layers.
 */
export function NodeStateDecorator({
  component,
  viewCtx,
  children,
}: {
  component: Component;
  viewCtx?: ViewRenderContext;
  children: (displayComponent: Component, displayComponentData: ComponentData) => ReactNode;
}): ReactNode {
  const [hovered, setHovered] = useState(false);

  const layerOpts = useMemo(
    () => mergeOptsForComponent(component, viewCtx, hovered),
    [component, hovered, viewCtx],
  );

  const displayComponent = useMemo(
    () => withMergedStateLayers(component, layerOpts),
    [component, layerOpts],
  );

  const displayComponentData = useMemo(
    () => getComponentData(displayComponent),
    [displayComponent],
  );

  return (
    <div
      className='h-full w-full'
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onPointerCancel={() => setHovered(false)}>
      {children(displayComponent, displayComponentData)}
    </div>
  );
}
