import type { Component, ComponentData } from '@/types';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useState } from 'react';
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
  pressed: boolean,
): MergeComponentStateLayersOptions {
  if (viewCtx?.characterSheet) {
    return {
      activeCustomStateName: viewCtx.componentActiveStatesById?.[component.id],
      showHoverLayer: hovered,
      showPressedLayer: pressed,
      showDisabledLayer: true,
    };
  }
  return {
    editorPreviewState: getEditorPreviewStateName(component),
    showHoverLayer: hovered,
    showPressedLayer: pressed,
    showDisabledLayer: true,
  };
}

/**
 * Outermost sheet / window viewer decorator: merges `data` and `style` from the active layer —
 * character `componentActiveStatesById` when `viewCtx.characterSheet`, otherwise
 * `component.editorStateTarget` — then hover, pressed, and disabled layers.
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
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    if (!pressed) return;
    const endPress = () => setPressed(false);
    window.addEventListener('pointerup', endPress);
    window.addEventListener('pointercancel', endPress);
    return () => {
      window.removeEventListener('pointerup', endPress);
      window.removeEventListener('pointercancel', endPress);
    };
  }, [pressed]);

  const layerOpts = useMemo(
    () => mergeOptsForComponent(component, viewCtx, hovered, pressed),
    [component, hovered, pressed, viewCtx],
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
      onPointerCancel={() => {
        setHovered(false);
        setPressed(false);
      }}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        setPressed(true);
      }}>
      {children(displayComponent, displayComponentData)}
    </div>
  );
}
