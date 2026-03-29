import type { Component } from '@/types';
import { useCallback, useRef } from 'react';

import { clampRectInContainer } from '../../canvas/canvas-bounds';
import { clientToCanvas, snapScalarToGrid } from '../../canvas/client-to-canvas';
import { useEditorCanvasChrome } from '../../canvas/editor-canvas-chrome-context';
import { DEFAULT_GRID_SIZE } from '../../editor-config';
import { useComponentPosition } from '../../utils';
import { componentTypes } from '../constants';

type OverrideProps = {
  height?: number;
  width?: number;
  rotation?: number;
  locked?: boolean;
  streamMode?: boolean;
};

type HandleId = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se';

const HANDLE_PX = 8;

function clampDim(v: number, min: number, max: number): number {
  const cap = max > 0 ? max : Number.POSITIVE_INFINITY;
  return Math.min(cap, Math.max(min, v));
}

function snapRect(
  x: number,
  y: number,
  w: number,
  h: number,
  grid: number,
): { x: number; y: number; w: number; h: number } {
  return {
    x: snapScalarToGrid(x, grid),
    y: snapScalarToGrid(y, grid),
    w: Math.max(grid, snapScalarToGrid(w, grid)),
    h: Math.max(grid, snapScalarToGrid(h, grid)),
  };
}

function rectAfterResize(
  handle: HandleId,
  startRect: { x: number; y: number; w: number; h: number },
  clientX: number,
  clientY: number,
  shiftKey: boolean,
  useGrid: boolean,
  gridSizePx: number,
  minW: number,
  maxW: number,
  minH: number,
  maxH: number,
  container: HTMLElement,
  viewScale: number,
): { x: number; y: number; w: number; h: number } {
  const cur = clientToCanvas(clientX, clientY, container, viewScale);
  let { x, y, w, h } = boundsForHandle(handle, startRect, cur, shiftKey);
  w = clampDim(w, minW, maxW);
  h = clampDim(h, minH, maxH);
  if (useGrid) {
    const g = Math.max(1, gridSizePx);
    ({ x, y, w, h } = snapRect(x, y, w, h, g));
    w = clampDim(w, minW, maxW);
    h = clampDim(h, minH, maxH);
  }
  const cw = container.clientWidth;
  const ch = container.clientHeight;
  return clampRectInContainer(x, y, w, h, cw, ch, minW, minH);
}

/**
 * Pointer `cur` is canvas-local. Each handle keeps the opposite corner/edge fixed
 * (same behavior family as React Flow `NodeResizer`).
 */
function boundsForHandle(
  handle: HandleId,
  start: { x: number; y: number; w: number; h: number },
  cur: { x: number; y: number },
  keepAspect: boolean,
): { x: number; y: number; w: number; h: number } {
  const { x: cx, y: cy, w: cw, h: ch } = start;
  const right = cx + cw;
  const bottom = cy + ch;
  let x = cx;
  let y = cy;
  let w = cw;
  let h = ch;

  switch (handle) {
    case 'se':
      x = cx;
      y = cy;
      w = cur.x - cx;
      h = cur.y - cy;
      break;
    case 'e':
      x = cx;
      y = cy;
      w = cur.x - cx;
      h = ch;
      break;
    case 's':
      x = cx;
      y = cy;
      w = cw;
      h = cur.y - cy;
      break;
    case 'nw':
      w = right - cur.x;
      h = bottom - cur.y;
      x = cur.x;
      y = cur.y;
      break;
    case 'w':
      w = right - cur.x;
      h = ch;
      x = cur.x;
      y = cy;
      break;
    case 'n':
      w = cw;
      h = bottom - cur.y;
      x = cx;
      y = cur.y;
      break;
    case 'ne':
      w = cur.x - cx;
      h = bottom - cur.y;
      x = cx;
      y = cur.y;
      break;
    case 'sw':
      w = right - cur.x;
      h = cur.y - cy;
      x = cur.x;
      y = cy;
      break;
    default:
      break;
  }

  if (keepAspect && cw > 0 && ch > 0) {
    const r = cw / ch;
    const cornerHandles: HandleId[] = ['nw', 'ne', 'sw', 'se'];
    if (cornerHandles.includes(handle)) {
      const scale = Math.max(w / cw, h / ch);
      w = cw * scale;
      h = ch * scale;
      if (handle === 'nw') {
        x = right - w;
        y = bottom - h;
      } else if (handle === 'ne') {
        x = cx;
        y = bottom - h;
      } else if (handle === 'sw') {
        x = right - w;
        y = cy;
      } else {
        x = cx;
        y = cy;
      }
    } else if (handle === 'e' || handle === 'w') {
      h = w / r;
      if (handle === 'w') {
        x = right - w;
        y = cy + (ch - h) / 2;
      } else {
        y = cy + (ch - h) / 2;
      }
    } else if (handle === 'n' || handle === 's') {
      w = h * r;
      if (handle === 'n') {
        x = cx + (cw - w) / 2;
        y = bottom - h;
      } else {
        x = cx + (cw - w) / 2;
        y = cy;
      }
    }
  }

  return { x, y, w, h };
}

interface ResizableNodeSelectedProps {
  children: React.ReactNode;
  component?: Component;
  disabled?: boolean;
  props?: OverrideProps;
  className?: string;
}

export const ResizableNode = ({
  children,
  component,
  disabled = false,
  props,
  className,
}: ResizableNodeSelectedProps) => {
  const {
    containerRef,
    isSelected,
    onResizeCommit,
    onResizeTransient,
    onResizeGestureEnd,
    useGrid,
    gridSize: gridSizePx,
    viewScale: viewScaleCanvas,
  } = useEditorCanvasChrome();
  const pos = useComponentPosition(component);
  const locked = component?.locked ?? props?.locked;
  const selected = component ? isSelected(component.id) : false;

  const componentType = componentTypes.find((ct) => ct.type === component?.type);
  const minW = componentType?.minWidth ?? props?.width ?? DEFAULT_GRID_SIZE;
  const minH = componentType?.minHeight ?? props?.height ?? DEFAULT_GRID_SIZE;
  const maxW = componentType?.maxWidth ?? 0;
  const maxH = componentType?.maxHeight ?? 0;

  const dragRef = useRef<{
    handle: HandleId;
    pointerId: number;
    startRect: { x: number; y: number; w: number; h: number };
  } | null>(null);

  const startResize = useCallback(
    (e: React.PointerEvent, handle: HandleId) => {
      if (!component || locked || pos.rotation !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const compId = component.id;
      const startRect = {
        x: component.x,
        y: component.y,
        w: component.width,
        h: component.height,
      };
      dragRef.current = {
        handle,
        pointerId: e.pointerId,
        startRect,
      };
      const el = e.target as HTMLElement;
      el.setPointerCapture(e.pointerId);

      let rafId: number | null = null;
      let pending: { x: number; y: number; w: number; h: number } | null = null;

      const flushTransient = () => {
        rafId = null;
        const p = pending;
        if (p) {
          onResizeTransient?.(compId, p.w, p.h, p.x, p.y);
        }
      };

      const scheduleTransient = () => {
        if (rafId != null) return;
        rafId = requestAnimationFrame(flushTransient);
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        const d = dragRef.current;
        const root = containerRef.current;
        if (!d || !root) return;
        pending = rectAfterResize(
          d.handle,
          d.startRect,
          ev.clientX,
          ev.clientY,
          ev.shiftKey,
          useGrid,
          gridSizePx,
          minW,
          maxW,
          minH,
          maxH,
          root,
          viewScaleCanvas,
        );
        scheduleTransient();
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);
        if (rafId != null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        flushTransient();
        pending = null;

        const d = dragRef.current;
        dragRef.current = null;
        try {
          el.releasePointerCapture(ev.pointerId);
        } catch {
          /* */
        }

        let didCommit = false;
        try {
          const root = containerRef.current;
          if (d && root) {
            const { x, y, w, h } = rectAfterResize(
              d.handle,
              d.startRect,
              ev.clientX,
              ev.clientY,
              ev.shiftKey,
              useGrid,
              gridSizePx,
              minW,
              maxW,
              minH,
              maxH,
              root,
              viewScaleCanvas,
            );
            const { x: sx, y: sy, w: sw, h: sh } = d.startRect;
            if (x !== sx || y !== sy || w !== sw || h !== sh) {
              onResizeCommit(compId, w, h, x, y);
              didCommit = true;
            }
          }
        } finally {
          if (!didCommit) onResizeGestureEnd?.();
        }
      };

      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    },
    [
      component,
      locked,
      pos.rotation,
      containerRef,
      maxH,
      maxW,
      minH,
      minW,
      onResizeCommit,
      onResizeGestureEnd,
      onResizeTransient,
      useGrid,
      gridSizePx,
    ],
  );

  const showHandles = selected && !disabled && !locked && pos.rotation === 0;
  const showSelectionOutline = selected && !disabled;

  const cursorFor: Record<HandleId, string> = {
    nw: 'nwse-resize',
    n: 'ns-resize',
    ne: 'nesw-resize',
    w: 'ew-resize',
    e: 'ew-resize',
    sw: 'nesw-resize',
    s: 'ns-resize',
    se: 'nwse-resize',
  };

  const handleBase = (hid: HandleId): React.CSSProperties => ({
    position: 'absolute',
    width: HANDLE_PX,
    height: HANDLE_PX,
    zIndex: 5,
    cursor: cursorFor[hid],
    touchAction: 'none',
    backgroundColor: locked ? '#E66A3C' : '#417090',
    border: '1px solid var(--background, #fff)',
    boxSizing: 'border-box',
  });

  return (
    <div
      className={`${locked ? 'nodrag' : (className ?? '')}`}
      style={{
        transform: `rotate(${pos.rotation}deg)`,
        zIndex: pos.z,
        position: 'relative',
        width: '100%',
        height: '100%',
        ...(showSelectionOutline
          ? {
              outline: '1px solid #7dd3fc',
              outlineOffset: '-1px',
            }
          : {}),
      }}>
      {showHandles && (
        <>
          {(
            [
              ['nw', { left: -HANDLE_PX / 2, top: -HANDLE_PX / 2 }],
              ['n', { left: '50%', top: -HANDLE_PX / 2, transform: 'translateX(-50%)' }],
              ['ne', { right: -HANDLE_PX / 2, top: -HANDLE_PX / 2 }],
              ['w', { left: -HANDLE_PX / 2, top: '50%', transform: 'translateY(-50%)' }],
              ['e', { right: -HANDLE_PX / 2, top: '50%', transform: 'translateY(-50%)' }],
              ['sw', { left: -HANDLE_PX / 2, bottom: -HANDLE_PX / 2 }],
              ['s', { left: '50%', bottom: -HANDLE_PX / 2, transform: 'translateX(-50%)' }],
              ['se', { right: -HANDLE_PX / 2, bottom: -HANDLE_PX / 2 }],
            ] as const
          ).map(([hid, posStyle]) => (
            <div
              key={hid}
              data-native-resize-handle
              style={{ ...handleBase(hid), ...posStyle }}
              onPointerDown={(e) => startResize(e, hid)}
            />
          ))}
        </>
      )}
      {children}
    </div>
  );
};
