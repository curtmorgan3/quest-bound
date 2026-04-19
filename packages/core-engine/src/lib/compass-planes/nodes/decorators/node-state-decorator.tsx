import { useSheetGroupPointer } from '@/pages/characters/sheet-viewer/sheet-group-pointer-context';
import { getGroupPointerAffinityIds } from '@/lib/compass-planes/sheet-editor/component-world-geometry';
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
  const sheetGroupPtr = useSheetGroupPointer();
  const [localHovered, setLocalHovered] = useState(false);
  const [localPressed, setLocalPressed] = useState(false);

  const affinity = useMemo(() => {
    if (viewCtx?.allComponents?.length && viewCtx.byId) {
      return getGroupPointerAffinityIds(component, viewCtx.allComponents, viewCtx.byId);
    }
    return new Set<string>([component.id]);
  }, [component, viewCtx]);

  const useSharedGroupPointer = Boolean(sheetGroupPtr && viewCtx?.allComponents?.length);

  const hovered = useSharedGroupPointer
    ? Boolean(sheetGroupPtr!.hoverAffinity?.has(component.id))
    : localHovered;
  const pressed = useSharedGroupPointer
    ? Boolean(sheetGroupPtr!.pressAffinity?.has(component.id))
    : localPressed;

  useEffect(() => {
    if (useSharedGroupPointer || !localPressed) return;
    const endPress = () => setLocalPressed(false);
    window.addEventListener('pointerup', endPress);
    window.addEventListener('pointercancel', endPress);
    return () => {
      window.removeEventListener('pointerup', endPress);
      window.removeEventListener('pointercancel', endPress);
    };
  }, [localPressed, useSharedGroupPointer]);

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
      data-node-state-id={component.id}
      onPointerEnter={() => {
        if (useSharedGroupPointer) {
          sheetGroupPtr!.onDecoratedPointerEnter(affinity);
        } else {
          setLocalHovered(true);
        }
      }}
      onPointerLeave={(e) => {
        if (useSharedGroupPointer) {
          sheetGroupPtr!.onDecoratedPointerLeave(affinity, e.relatedTarget);
        } else {
          setLocalHovered(false);
        }
      }}
      onPointerCancel={() => {
        if (useSharedGroupPointer) {
          sheetGroupPtr!.onDecoratedPointerLeave(affinity, null);
        } else {
          setLocalHovered(false);
          setLocalPressed(false);
        }
      }}
      onPointerDown={(e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (useSharedGroupPointer) {
          sheetGroupPtr!.onDecoratedPointerDown(affinity);
        } else {
          setLocalPressed(true);
        }
      }}>
      {children(displayComponent, displayComponentData)}
    </div>
  );
}
