import { useComponents } from '@/lib/compass-api';
import { CharacterContext } from '@/stores';
import { ExternalLink, OctagonMinus, OctagonX, Scaling } from 'lucide-react';
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { DRAG_THRESHOLD_PX } from '../canvas';
import { renderViewComponent, type ViewRenderContext } from '../nodes';
import {
  buildEffectiveLayoutMap,
  componentByIdMap,
  worldTopLeftWithEffective,
} from '../sheet-editor/component-world-geometry';
import { isFlexHostedChild } from '../sheet-editor/group-flex-utils';
import { useComponentPositionMap } from '../utils';
import { useWindowCanvasSelection } from './window-canvas-selection-context';
import { ParentWindowFrameProvider } from './parent-window-frame-context';
import { WindowRuntimeProvider } from './window-runtime-context';

/** Minimal window shape shared by CharacterWindow and RulesetWindow. */
export interface WindowNodeWindow {
  id: string;
  windowId: string;
  title: string;
  x: number;
  y: number;
  isCollapsed: boolean;
  displayScale?: number;
}

export interface WindowNodeData {
  window: WindowNodeWindow;
  onClose?: (id: string) => void;
  onMinimize?: (id: string) => void;
  onChildWindowClick: (
    childWindowId: string,
    resolved?: { x: number; y: number; collapseIfOpen?: boolean },
  ) => void;
  locked: boolean;
  /** When set, a link to this path is shown when the window is selected (e.g. page-editor). */
  editWindowHref?: string;
  /** Unlocked sheet (character or page editor): drag the scale control to resize uniformly. */
  onDisplayScaleChange?: (id: string, scale: number) => void;
  /** Ruleset page template id — child-window open uses it for displayScale and layout lookups. */
  sheetTemplatePageId?: string | null;
}

const MIN_DISPLAY_SCALE = 0.25;
const MAX_DISPLAY_SCALE = 3;
const SCALE_PIVOT_MIN_DIST_PX = 24;

function clampDisplayScale(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_DISPLAY_SCALE, Math.max(MIN_DISPLAY_SCALE, n));
}

/** Uniform scale from snapped outer width so the window sits on the canvas grid (matches position snap). */
function snapDisplayScaleToLayoutGrid(
  scale: number,
  baseWidthPx: number,
  gridPx: number | null | undefined,
): number {
  const s = clampDisplayScale(scale);
  if (gridPx == null || gridPx <= 0 || baseWidthPx <= 0) return s;
  const g = gridPx;
  const w = baseWidthPx * s;
  const minW = baseWidthPx * MIN_DISPLAY_SCALE;
  const maxW = baseWidthPx * MAX_DISPLAY_SCALE;
  const snappedW = Math.round(w / g) * g;
  const clampedW = Math.max(minW, Math.min(maxW, snappedW));
  return clampDisplayScale(clampedW / baseWidthPx);
}

export const WindowNode = ({ data }: { data: WindowNodeData }) => {
  const characterContext = useContext(CharacterContext);
  const canvasSelection = useWindowCanvasSelection();
  const {
    window: windowData,
    onClose,
    onMinimize,
    onChildWindowClick,
    locked,
    editWindowHref,
    onDisplayScaleChange,
    sheetTemplatePageId,
  } = data;
  const { components } = useComponents(windowData.windowId);
  const positionMap = useComponentPositionMap(components);

  const byId = useMemo(() => componentByIdMap(components), [components]);
  const effectiveLayout = useMemo(
    () => buildEffectiveLayoutMap(components, {}, null),
    [components],
  );

  const handleChildWindowClick = useCallback(
    (childWindowId: string, resolved?: { x: number; y: number; collapseIfOpen?: boolean }) => {
      onChildWindowClick(childWindowId, resolved);
    },
    [onChildWindowClick],
  );

  const rootComponents = useMemo(
    () => components.filter((c) => !isFlexHostedChild(c, byId)).sort((a, b) => a.z - b.z),
    [byId, components],
  );

  const { minX, minY, windowWidth, windowHeight } = useMemo(() => {
    if (components.length === 0) {
      return { minX: 0, minY: 0, windowWidth: 400, windowHeight: 300 };
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxR = -Infinity;
    let maxB = -Infinity;
    for (const c of components) {
      const eff = effectiveLayout.get(c.id);
      if (!eff) continue;
      const tl = worldTopLeftWithEffective(c, byId, effectiveLayout);
      minX = Math.min(minX, tl.x);
      minY = Math.min(minY, tl.y);
      maxR = Math.max(maxR, tl.x + eff.width);
      maxB = Math.max(maxB, tl.y + eff.height);
    }
    if (!Number.isFinite(minX)) {
      return { minX: 0, minY: 0, windowWidth: 400, windowHeight: 300 };
    }
    return {
      minX,
      minY,
      windowWidth: Math.max(0, maxR - minX),
      windowHeight: Math.max(0, maxB - minY),
    };
  }, [byId, components, effectiveLayout]);

  const [scalePreview, setScalePreview] = useState<number | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const scaleDragRef = useRef<{
    startScale: number;
    d0: number;
    px: number;
    py: number;
  } | null>(null);
  /** Set on scale pointerdown; scaling applies only after move ≥ threshold (avoids chrome-under-cursor after select). */
  const scalePendingRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startScale: number;
    d0: number;
    px: number;
    py: number;
  } | null>(null);
  const lastScaleDuringDragRef = useRef(1);

  const displayScale = clampDisplayScale(
    scalePreview ?? (windowData.displayScale != null ? windowData.displayScale : 1),
  );
  const scaledW = windowWidth * displayScale;
  const scaledH = windowHeight * displayScale;

  const viewRenderContext = useMemo<ViewRenderContext>(
    () => ({
      allComponents: components,
      byId,
      effectiveLayout,
      positionMap,
      sheetTemplatePageId: sheetTemplatePageId ?? null,
      getComponentCanvasRect: (componentId: string) => {
        const c = components.find((x) => x.id === componentId);
        if (!c) return null;
        const eff = effectiveLayout.get(c.id);
        if (!eff) return null;
        const tl = worldTopLeftWithEffective(c, byId, effectiveLayout);
        const ds = displayScale;
        return {
          x: windowData.x + (tl.x - minX) * ds,
          y: windowData.y + (tl.y - minY) * ds,
          width: eff.width * ds,
          height: eff.height * ds,
        };
      },
    }),
    [
      byId,
      components,
      displayScale,
      effectiveLayout,
      minX,
      minY,
      positionMap,
      sheetTemplatePageId,
      windowData.x,
      windowData.y,
    ],
  );

  const endScaleGesture = useCallback(() => {
    scaleDragRef.current = null;
    scalePendingRef.current = null;
    setScalePreview(null);
  }, []);

  const onScalePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!onDisplayScaleChange || locked || e.button !== 0) return;
      canvasSelection?.selectWindow(windowData.id);
      e.stopPropagation();
      e.preventDefault();
      const hostEl = hostRef.current;
      const targetEl = e.currentTarget as HTMLElement;
      if (!hostEl) return;
      const rect = hostEl.getBoundingClientRect();
      const px = rect.left;
      const py = rect.top;
      const startScale = clampDisplayScale(windowData.displayScale ?? 1);
      const d0 = Math.max(SCALE_PIVOT_MIN_DIST_PX, Math.hypot(e.clientX - px, e.clientY - py));
      scaleDragRef.current = null;
      scalePendingRef.current = {
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startScale,
        d0,
        px,
        py,
      };
      targetEl.setPointerCapture(e.pointerId);
    },
    [canvasSelection, locked, onDisplayScaleChange, windowData.displayScale, windowData.id],
  );

  const onScalePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const targetEl = e.currentTarget as HTMLElement;
      if (!targetEl.hasPointerCapture(e.pointerId)) return;

      const pending = scalePendingRef.current;
      if (pending && pending.pointerId === e.pointerId && !scaleDragRef.current) {
        const dist = Math.hypot(e.clientX - pending.startClientX, e.clientY - pending.startClientY);
        if (dist >= DRAG_THRESHOLD_PX) {
          const gridPx = canvasSelection?.layoutGridSnapPx ?? null;
          const preview0 = snapDisplayScaleToLayoutGrid(pending.startScale, windowWidth, gridPx);
          scaleDragRef.current = {
            startScale: pending.startScale,
            d0: pending.d0,
            px: pending.px,
            py: pending.py,
          };
          lastScaleDuringDragRef.current = preview0;
          setScalePreview(preview0);
          scalePendingRef.current = null;
        }
      }

      const drag = scaleDragRef.current;
      if (!drag) return;
      const gridPx = canvasSelection?.layoutGridSnapPx ?? null;
      const d1 = Math.hypot(e.clientX - drag.px, e.clientY - drag.py);
      const ratio = d1 / drag.d0;
      const nextRaw = clampDisplayScale(drag.startScale * ratio);
      const next = snapDisplayScaleToLayoutGrid(nextRaw, windowWidth, gridPx);
      lastScaleDuringDragRef.current = next;
      setScalePreview(next);
    },
    [canvasSelection?.layoutGridSnapPx, windowWidth],
  );

  const onScalePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const targetEl = e.currentTarget as HTMLElement;
      try {
        targetEl.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }

      const pendingOnly = scalePendingRef.current && !scaleDragRef.current;
      if (pendingOnly) {
        scalePendingRef.current = null;
        return;
      }

      if (scaleDragRef.current && onDisplayScaleChange) {
        const raw = lastScaleDuringDragRef.current;
        const snapped = snapDisplayScaleToLayoutGrid(
          raw,
          windowWidth,
          canvasSelection?.layoutGridSnapPx ?? null,
        );
        const committed = Math.round(snapped * 1000) / 1000;
        onDisplayScaleChange(windowData.id, committed);
      }
      endScaleGesture();
    },
    [
      canvasSelection?.layoutGridSnapPx,
      endScaleGesture,
      onDisplayScaleChange,
      windowData.id,
      windowWidth,
    ],
  );

  const onScalePointerCancel = useCallback(
    (e: React.PointerEvent) => {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      endScaleGesture();
    },
    [endScaleGesture],
  );

  const onScaleLostPointerCapture = useCallback(() => {
    endScaleGesture();
  }, [endScaleGesture]);

  const showScaleHandle = Boolean(onDisplayScaleChange && !locked);
  const isSelected = canvasSelection?.selectedWindowId === windowData.id;
  const showChrome = Boolean(!locked && isSelected);

  useEffect(() => {
    if (!showChrome) {
      endScaleGesture();
    }
  }, [showChrome, endScaleGesture]);

  return (
    <div
      ref={hostRef}
      className='window-node'
      style={{
        width: scaledW,
        height: scaledH,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
      {showChrome ? (
        <div
          data-window-chrome-control
          style={{
            height: '22px',
            position: 'absolute',
            right: 0,
            top: 0,
            zIndex: 1000,
            width: 'max-content',
            marginLeft: 'auto',
            backgroundColor: 'transparent',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            padding: '0 4px 0 4px',
            gap: '8px',
          }}>
          {!!onMinimize && (
            <OctagonMinus
              style={{ width: '14px', height: '14px' }}
              className='clickable'
              onClick={() => onMinimize(windowData.id)}
            />
          )}
          {editWindowHref && (
            <Link
              to={editWindowHref}
              className='clickable flex items-center justify-center text-inherit hover:opacity-80'
              style={{ width: '20px', height: '20px' }}
              title='Edit window'
              onClick={(e) => e.stopPropagation()}>
              <ExternalLink style={{ width: '14px', height: '14px' }} />
            </Link>
          )}
          {showScaleHandle ? (
            <button
              type='button'
              title='Drag to scale window'
              aria-label='Drag to scale window'
              className='flex cursor-ne-resize items-center justify-center border-0 bg-transparent p-0 text-inherit shadow-none outline-none focus-visible:ring-2 focus-visible:ring-ring'
              style={{ width: '20px', height: '20px', touchAction: 'none' }}
              onPointerDown={onScalePointerDown}
              onPointerMove={onScalePointerMove}
              onPointerUp={onScalePointerUp}
              onPointerCancel={onScalePointerCancel}
              onLostPointerCapture={onScaleLostPointerCapture}>
              <Scaling style={{ width: '14px', height: '14px' }} aria-hidden />
            </button>
          ) : null}
          {!!onClose && (
            <OctagonX
              style={{ width: '14px', height: '14px' }}
              className='clickable'
              onClick={() => onClose(windowData.id)}
            />
          )}
        </div>
      ) : null}
      <div
        style={{
          width: windowWidth,
          height: windowHeight,
          transform: `scale(${displayScale})`,
          transformOrigin: '0 0',
          position: 'relative',
          flexShrink: 0,
          overflow: 'hidden',
        }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: windowHeight,
          }}>
          <ParentWindowFrameProvider
            value={{
              x: windowData.x,
              y: windowData.y,
              width: scaledW,
              height: scaledH,
            }}>
            <WindowRuntimeProvider
              value={
                'characterId' in windowData
                  ? {}
                  : {
                      openRulesetChildWindow: (childWindowId, resolved) =>
                        handleChildWindowClick(childWindowId, resolved),
                    }
              }>
            {rootComponents.map((component) => {
              const pos = positionMap.get(component.id);
              const eff = effectiveLayout.get(component.id)!;
              const tl = worldTopLeftWithEffective(component, byId, effectiveLayout);
              return (
                <div
                  key={component.id}
                  style={{
                    position: 'absolute',
                    left: tl.x - minX,
                    top: tl.y - minY,
                    width: eff.width,
                    height: eff.height,
                    zIndex: pos?.z ?? component.z,
                  }}>
                  {renderViewComponent(
                    component,
                    characterContext?.characterAttributes,
                    pos,
                    viewRenderContext,
                  )}
                </div>
              );
            })}
            </WindowRuntimeProvider>
          </ParentWindowFrameProvider>
        </div>
      </div>
    </div>
  );
};
