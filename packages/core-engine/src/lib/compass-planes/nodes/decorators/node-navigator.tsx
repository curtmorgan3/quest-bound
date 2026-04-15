import { useScripts } from '@/lib/compass-api/hooks/scripts/use-scripts';
import {
  navigateCharacterToTemplatePage,
  openCharacterSheetWindow,
} from '@/utils/navigate-character-sheet';
import { useParentWindowFrame } from '@/lib/compass-planes/sheet-viewer/parent-window-frame-context';
import { useSheetCanvasBounds } from '@/lib/compass-planes/sheet-viewer/sheet-canvas-bounds-context';
import { useWindowRuntime } from '@/lib/compass-planes/sheet-viewer/window-runtime-context';
import { resolveChildWindowCanvasPosition } from '@/lib/compass-planes/utils/resolve-child-window-canvas-position';
import { CharacterContext } from '@/stores';
import type { ChildWindowAnchor, Component, ComponentData } from '@/types';
import { useCallback, useContext, useMemo, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChildWindowCanvasContentSize } from '@/lib/compass-planes/utils/window-open-bounds';
import type { ViewRenderContext } from '@/lib/compass-planes/nodes/render-node';
import {
  getComponentData,
  resolveEffectiveChildWindowId,
  resolveEffectiveScriptId,
} from '../../utils';

interface NodeNavigatorProps {
  children: ReactNode;
  component: Component;
  componentData?: ComponentData;
  viewCtx?: ViewRenderContext;
}

/**
 * When the component has no click script, navigates on click using data in this order:
 * `closeCharacterWindowOnClick` (character sheet only), then `pageId`, then `childWindowId`,
 * then `href` (opens in a new tab).
 */
export const NodeNavigator = ({ children, component, componentData, viewCtx }: NodeNavigatorProps) => {
  const data = componentData ?? getComponentData(component);
  const navigate = useNavigate();
  const { scripts } = useScripts();
  const characterContext = useContext(CharacterContext);
  const { openRulesetChildWindow } = useWindowRuntime();
  const parentFrame = useParentWindowFrame();
  const canvasBounds = useSheetCanvasBounds();
  const characterId = characterContext?.character?.id;

  const pageTemplateId = data.pageId;
  const childWindowId = resolveEffectiveChildWindowId(component, data);
  const href = data.href;

  const effectiveScriptId = resolveEffectiveScriptId(component, data);
  const hasVisibleClickScript = useMemo(() => {
    if (!effectiveScriptId) return false;
    const s = scripts.find((x) => x.id === effectiveScriptId);
    return Boolean(s && !s.hidden);
  }, [effectiveScriptId, scripts]);

  const handleProgrammaticNav = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (data.closeCharacterWindowOnClick) {
        viewCtx?.closeThisCharacterWindow?.();
        return;
      }
      if (pageTemplateId) {
        if (characterId) {
          const characterPageId = await navigateCharacterToTemplatePage(
            characterId,
            pageTemplateId,
          );
          if (characterPageId) {
            navigate(`/characters/${characterId}?pageId=${characterPageId}`);
          }
        }
        return;
      }
      if (childWindowId) {
        const placementMode = data.childWindowPlacementMode ?? 'fixed';
        const anchor: ChildWindowAnchor = data.childWindowAnchor ?? 'positioned';
        const parentRect = parentFrame ?? { x: 0, y: 0, width: 400, height: 300 };
        const canvasRect =
          canvasBounds != null && canvasBounds.width > 0 && canvasBounds.height > 0
            ? { x: 0, y: 0, width: canvasBounds.width, height: canvasBounds.height }
            : null;

        let childWidth: number | undefined;
        let childHeight: number | undefined;
        if (anchor !== 'positioned') {
          const sz = await getChildWindowCanvasContentSize(
            childWindowId,
            viewCtx?.sheetTemplatePageId,
          );
          childWidth = sz.width;
          childHeight = sz.height;
        }

        const relativeComponentRect =
          placementMode === 'relative' && viewCtx?.getComponentCanvasRect
            ? viewCtx.getComponentCanvasRect(component.id)
            : null;

        const { x: resX, y: resY } = resolveChildWindowCanvasPosition({
          mode: placementMode,
          anchor,
          explicitX: data.childWindowX ?? 0,
          explicitY: data.childWindowY ?? 0,
          parentRect,
          canvasRect,
          childWidth,
          childHeight,
          relativeComponentRect,
        });
        const openOpts = {
          x: resX,
          y: resY,
          collapseIfOpen: data.childWindowCollapse ?? false,
        };
        if (openRulesetChildWindow) {
          openRulesetChildWindow(childWindowId, openOpts);
          return;
        }
        if (characterId) {
          await openCharacterSheetWindow(characterId, childWindowId, {
            ...openOpts,
            preferComponentPosition: true,
          });
        }
      }
    },
    [
      data.closeCharacterWindowOnClick,
      pageTemplateId,
      childWindowId,
      characterId,
      component.id,
      navigate,
      openRulesetChildWindow,
      data.childWindowX,
      data.childWindowY,
      data.childWindowCollapse,
      data.childWindowPlacementMode,
      data.childWindowAnchor,
      parentFrame,
      canvasBounds,
      viewCtx?.closeThisCharacterWindow,
      viewCtx?.getComponentCanvasRect,
      viewCtx?.sheetTemplatePageId,
    ],
  );

  if (hasVisibleClickScript) {
    return <>{children}</>;
  }

  if (data.disabled) {
    return <>{children}</>;
  }

  if (pageTemplateId || childWindowId || data.closeCharacterWindowOnClick) {
    return (
      <div
        role='button'
        className='clickable'
        style={{ display: 'block', width: '100%', height: '100%' }}
        onClick={handleProgrammaticNav}>
        {children}
      </div>
    );
  }

  if (href) {
    return (
      <a
        target='_blank'
        rel='noopener noreferrer'
        href={href}
        className='block h-full w-full'
        onClick={(e) => e.stopPropagation()}>
        {children}
      </a>
    );
  }

  return <>{children}</>;
};
