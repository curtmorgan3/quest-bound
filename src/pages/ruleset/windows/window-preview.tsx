import { useComponents, useCharacterWindows } from '@/lib/compass-api';
import { setSheetPreviewRulesetWindowIdForScripts } from '@/lib/compass-logic/worker/current-sheet-preview-window-ref';
import { isComponentConditionallyVisible, type ViewRenderContext } from '@/lib/compass-planes/nodes';
import {
  buildEffectiveLayoutMap,
  componentByIdMap,
  worldTopLeftWithEffective,
} from '@/lib/compass-planes/sheet-editor/component-world-geometry';
import { isCanvasRootComponent } from '@/lib/compass-planes/sheet-editor/group-flex-utils';
import { ParentWindowFrameProvider } from '@/lib/compass-planes/sheet-viewer/parent-window-frame-context';
import { SheetComponentWithStates, sheetComponentLayoutData } from '@/lib/compass-planes/sheet-viewer/sheet-component-with-states';
import { SheetGroupPointerProvider } from '@/lib/compass-planes/sheet-viewer/sheet-group-pointer-context';
import { WindowRuntimeProvider } from '@/lib/compass-planes/sheet-viewer/window-runtime-context';
import { useComponentPositionMap } from '@/lib/compass-planes/utils';
import { parseComponentActiveStatesMap } from '@/lib/compass-planes/utils/component-states';
import { mergeCharacterWindowComponents } from '@/lib/compass-planes/utils/merge-character-window-components';
import { CharacterPlayProviders } from '@/pages/characters/character-play-providers';
import { CharacterContext } from '@/stores';
import type { CharacterWindow } from '@/types';
import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

const MIN_DISPLAY_SCALE = 0.25;

function clampDisplayScale(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.max(MIN_DISPLAY_SCALE, n);
}

function quantizeDisplayScaleToTwoDecimals(n: number): number {
  const s = clampDisplayScale(n);
  return clampDisplayScale(Math.round(s * 100) / 100);
}

function pickCharacterWindowInstance(
  characterWindows: CharacterWindow[],
  rulesetWindowId: string,
): CharacterWindow | null {
  const matchingRoots = characterWindows.filter((w) => w.windowId === rulesetWindowId);
  if (matchingRoots.length === 0) return null;
  if (matchingRoots.length === 1) return matchingRoots[0]!;
  const sorted = [...matchingRoots].sort((a, b) => {
    const t = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (t !== 0) return t;
    return a.id.localeCompare(b.id);
  });
  return sorted[0]!;
}

function WindowPreviewCanvas({ rulesetWindowId }: { rulesetWindowId: string }) {
  const characterContext = useContext(CharacterContext);
  const character = characterContext?.character ?? null;
  const { windows: characterWindows, deleteCharacterWindow } = useCharacterWindows(character?.id);
  const { components: templateComponents } = useComponents(rulesetWindowId);

  const characterWindowInstance = useMemo(
    () =>
      character?.id
        ? pickCharacterWindowInstance(characterWindows, rulesetWindowId)
        : null,
    [character?.id, characterWindows, rulesetWindowId],
  );

  const components = useMemo(
    () =>
      mergeCharacterWindowComponents(
        templateComponents ?? [],
        { scriptOverlayComponents: characterWindowInstance?.scriptOverlayComponents },
        character,
      ),
    [templateComponents, characterWindowInstance?.scriptOverlayComponents, character],
  );

  const useCharacterWindowStates = characterWindowInstance != null;
  const activeStatesMap = useMemo(
    () =>
      useCharacterWindowStates
        ? parseComponentActiveStatesMap(characterWindowInstance.componentActiveStates)
        : {},
    [characterWindowInstance, useCharacterWindowStates],
  );

  const positionMap = useComponentPositionMap(components);
  const byId = useMemo(() => componentByIdMap(components), [components]);
  const effectiveLayout = useMemo(
    () => buildEffectiveLayoutMap(components, {}, null),
    [components],
  );

  const rootComponents = useMemo(
    () => components.filter((c) => isCanvasRootComponent(c)).sort((a, b) => a.z - b.z),
    [components],
  );

  const { minX, minY, windowWidth, windowHeight } = useMemo(() => {
    if (components.length === 0) {
      return { minX: 0, minY: 0, windowWidth: 400, windowHeight: 300 };
    }
    let minX0 = Infinity;
    let minY0 = Infinity;
    let maxR = -Infinity;
    let maxB = -Infinity;
    for (const c of components) {
      const eff = effectiveLayout.get(c.id);
      if (!eff) continue;
      const tl = worldTopLeftWithEffective(c, byId, effectiveLayout);
      minX0 = Math.min(minX0, tl.x);
      minY0 = Math.min(minY0, tl.y);
      maxR = Math.max(maxR, tl.x + eff.width);
      maxB = Math.max(maxB, tl.y + eff.height);
    }
    if (!Number.isFinite(minX0)) {
      return { minX: 0, minY: 0, windowWidth: 400, windowHeight: 300 };
    }
    return {
      minX: minX0,
      minY: minY0,
      windowWidth: Math.max(0, maxR - minX0),
      windowHeight: Math.max(0, maxB - minY0),
    };
  }, [byId, components, effectiveLayout]);

  const displayScale = quantizeDisplayScaleToTwoDecimals(
    characterWindowInstance?.displayScale != null ? characterWindowInstance.displayScale : 1,
  );
  const scaledW = windowWidth * displayScale;
  const scaledH = windowHeight * displayScale;

  const frameX = characterWindowInstance?.x ?? 0;
  const frameY = characterWindowInstance?.y ?? 0;

  const scaledSheetRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [viewportEdgeInSheetPx, setViewportEdgeInSheetPx] = useState({ left: 0, top: 0 });

  const needsViewportEdgeAlign = useMemo(
    () =>
      rootComponents.some((c) => {
        if (!isComponentConditionallyVisible(c, characterContext?.characterAttributes)) {
          return false;
        }
        const d = sheetComponentLayoutData(
          c,
          useCharacterWindowStates ? activeStatesMap[c.id] : undefined,
          useCharacterWindowStates,
        );
        return Boolean(d.takeFullWidth || d.takeFullHeight);
      }),
    [
      activeStatesMap,
      characterContext?.characterAttributes,
      rootComponents,
      useCharacterWindowStates,
    ],
  );

  useLayoutEffect(() => {
    if (!needsViewportEdgeAlign) {
      setViewportEdgeInSheetPx({ left: 0, top: 0 });
      return;
    }

    const update = () => {
      const sheetEl = scaledSheetRef.current;
      const viewportEl = viewportRef.current;
      if (!sheetEl || !viewportEl) return;
      const sheetRect = sheetEl.getBoundingClientRect();
      const vpRect = viewportEl.getBoundingClientRect();
      const ds = displayScale;
      if (!Number.isFinite(ds) || ds === 0) return;
      setViewportEdgeInSheetPx({
        left: (vpRect.left - sheetRect.left) / ds,
        top: (vpRect.top - sheetRect.top) / ds,
      });
    };

    update();
    const ro = new ResizeObserver(update);
    const sheetEl = scaledSheetRef.current;
    const viewportEl = viewportRef.current;
    if (sheetEl) ro.observe(sheetEl);
    if (viewportEl) ro.observe(viewportEl);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [needsViewportEdgeAlign, displayScale]);

  const viewRenderContext = useMemo<ViewRenderContext>(
    () => ({
      allComponents: components,
      byId,
      effectiveLayout,
      positionMap,
      characterSheet: useCharacterWindowStates,
      componentActiveStatesById: useCharacterWindowStates ? activeStatesMap : undefined,
      sheetTemplatePageId: null,
      closeThisCharacterWindow:
        characterWindowInstance != null
          ? () => {
              void deleteCharacterWindow(characterWindowInstance.id);
            }
          : undefined,
      getComponentCanvasRect: (componentId: string) => {
        const c = components.find((x) => x.id === componentId);
        if (!c) return null;
        if (!isComponentConditionallyVisible(c, characterContext?.characterAttributes)) {
          return null;
        }
        const eff = effectiveLayout.get(c.id);
        if (!eff) return null;
        const tl = worldTopLeftWithEffective(c, byId, effectiveLayout);
        const ds = displayScale;
        const isRoot = isCanvasRootComponent(c);
        const rectData = sheetComponentLayoutData(
          c,
          useCharacterWindowStates ? activeStatesMap[c.id] : undefined,
          useCharacterWindowStates,
        );
        const left = isRoot && rectData.takeFullWidth ? viewportEdgeInSheetPx.left : tl.x - minX;
        const top = isRoot && rectData.takeFullHeight ? viewportEdgeInSheetPx.top : tl.y - minY;
        return {
          x: frameX + left * ds,
          y: frameY + top * ds,
          width: eff.width * ds,
          height: eff.height * ds,
        };
      },
    }),
    [
      activeStatesMap,
      byId,
      characterContext?.characterAttributes,
      characterWindowInstance,
      components,
      deleteCharacterWindow,
      displayScale,
      effectiveLayout,
      frameX,
      frameY,
      minX,
      minY,
      positionMap,
      useCharacterWindowStates,
      viewportEdgeInSheetPx.left,
      viewportEdgeInSheetPx.top,
    ],
  );

  useEffect(() => {
    setSheetPreviewRulesetWindowIdForScripts(rulesetWindowId);
    return () => setSheetPreviewRulesetWindowIdForScripts(undefined);
  }, [rulesetWindowId]);

  return (
    <div
      ref={viewportRef}
      className='bg-background flex h-full min-h-0 w-full items-center justify-center overflow-auto'>
      <div
        style={{
          width: scaledW,
          height: scaledH,
          position: 'relative',
          flexShrink: 0,
        }}>
        <div
          ref={scaledSheetRef}
          style={{
            width: windowWidth,
            height: windowHeight,
            transform: `scale(${displayScale})`,
            transformOrigin: '0 0',
            position: 'relative',
            overflow: 'visible',
          }}>
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: windowHeight,
            }}>
            <ParentWindowFrameProvider
              value={{
                x: frameX,
                y: frameY,
                width: scaledW,
                height: scaledH,
              }}>
              <WindowRuntimeProvider value={{}}>
                <SheetGroupPointerProvider>
                  {rootComponents.map((component) => {
                    if (
                      !isComponentConditionallyVisible(
                        component,
                        characterContext?.characterAttributes,
                      )
                    ) {
                      return null;
                    }
                    const pos = positionMap.get(component.id);
                    const eff = effectiveLayout.get(component.id)!;
                    const tl = worldTopLeftWithEffective(component, byId, effectiveLayout);
                    const compData = sheetComponentLayoutData(
                      component,
                      useCharacterWindowStates ? activeStatesMap[component.id] : undefined,
                      useCharacterWindowStates,
                    );
                    return (
                      <div
                        key={component.id}
                        style={{
                          position: 'absolute',
                          left: compData.takeFullWidth
                            ? viewportEdgeInSheetPx.left
                            : tl.x - minX,
                          top: compData.takeFullHeight ? viewportEdgeInSheetPx.top : tl.y - minY,
                          width: eff.width,
                          height: eff.height,
                          zIndex: pos?.z ?? component.z,
                        }}>
                        <SheetComponentWithStates
                          component={component}
                          characterAttributes={characterContext?.characterAttributes}
                          position={pos}
                          viewRenderContext={viewRenderContext}
                        />
                      </div>
                    );
                  })}
                </SheetGroupPointerProvider>
              </WindowRuntimeProvider>
            </ParentWindowFrameProvider>
          </div>
        </div>
      </div>
    </div>
  );
}

export interface WindowPreviewProps {
  characterId: string;
  rulesetWindowId: string;
}

/**
 * Centered sheet preview for the ruleset window editor: template + character overlays, using
 * {@link CharacterProvider} (via {@link CharacterPlayProviders}) so viewer nodes match the live sheet.
 */
export function WindowPreview({ characterId, rulesetWindowId }: WindowPreviewProps) {
  return (
    <CharacterPlayProviders characterId={characterId}>
      <WindowPreviewCanvas rulesetWindowId={rulesetWindowId} />
    </CharacterPlayProviders>
  );
}
