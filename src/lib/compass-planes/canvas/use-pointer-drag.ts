import type { ComponentUpdate } from '@/lib/compass-api';
import { useCallback, useRef } from 'react';

import { clampCanvasPositions } from './canvas-bounds';
import { clientToCanvas, clientToCanvasSheetFit, snapPointToGrid } from './client-to-canvas';

export type PointerDragFollower = { id: string; x: number; y: number };

export type BeginMoveParams = {
  id: string;
  x: number;
  y: number;
  followers?: PointerDragFollower[];
  /**
   * When set, invoked on `pointerup` only if the pointer never moved past the drag threshold
   * (so the gesture was a tap, not a drag). Not called on `pointercancel`.
   */
  deferredSelectionOnTap?: (ev: PointerEvent) => void;
};

/** Device pixels before we treat the gesture as a drag (not a click). Avoids capturing the pointer immediately, which would retarget click/dblclick away from inner targets (e.g. text nodes). */
export const DRAG_THRESHOLD_PX = 5;

/** While dragging windows/components over rich content, the browser may select text or drag images; suppress during the move and restore after. */
function beginDocumentDragChromeSuppress(): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }
  const body = document.body;
  const prevUserSelect = body.style.userSelect;
  const prevWebkit = body.style.getPropertyValue('-webkit-user-select');
  const prevMoz = body.style.getPropertyValue('-moz-user-select');
  body.style.userSelect = 'none';
  body.style.setProperty('-webkit-user-select', 'none');
  body.style.setProperty('-moz-user-select', 'none');
  window.getSelection()?.removeAllRanges();
  return () => {
    body.style.userSelect = prevUserSelect;
    if (prevWebkit) body.style.setProperty('-webkit-user-select', prevWebkit);
    else body.style.removeProperty('-webkit-user-select');
    if (prevMoz) body.style.setProperty('-moz-user-select', prevMoz);
    else body.style.removeProperty('-moz-user-select');
  };
}

export type UsePointerDragOptions = {
  containerRef: React.RefObject<HTMLElement | null>;
  /** Omit or pass `null` / `0` to disable snapping. */
  gridSize?: number | null;
  /** One update per moved item (leader + followers) on pointerup. */
  onCommit: (updates: ComponentUpdate[]) => void;
  /** Live preview during drag (rAF-throttled), all items that moved this frame. */
  onTransientPositions?: (positions: { id: string; x: number; y: number }[]) => void;
  /**
   * Called after pointer up/cancel. `didCommit` is true when `onCommit` ran this gesture.
   * Keep showing committed geometry until props catch up when `didCommit` is true.
   */
  onDragEnd?: (info: { didCommit: boolean }) => void;
  canDrag?: (id: string) => boolean;
  /** If true, skip `onCommit` when the leader's snapped position equals its start. */
  skipCommitIfUnchanged?: boolean;
  /** When set with a resolved container, dragged positions are clamped so each item stays inside the container. */
  getItemDimensions?: (id: string) => { width: number; height: number };
  /** If false for an id, that item is not clamped to the container (e.g. group children use parent-relative coords). */
  shouldClampItem?: (id: string) => boolean;
  /** Matches CSS `transform: scale()` on the canvas coordinate root (default 1). */
  viewScale?: number;
  /** Untransformed viewport clip (character sheet fit mode). */
  sheetViewportRef?: React.RefObject<HTMLElement | null>;
  /** Live `translate(tx,ty) scale(scale)` on the canvas root for fit-to-viewport. */
  sheetFitTransformRef?: React.MutableRefObject<{
    tx: number;
    ty: number;
    scale: number;
  } | null>;
};

type DragPhase = {
  leaderId: string;
  originX: number;
  originY: number;
  startLocalX: number;
  startLocalY: number;
  pointerId: number;
  followers: { id: string; originX: number; originY: number }[];
};

function positionsForDelta(
  leaderId: string,
  leaderOriginX: number,
  leaderOriginY: number,
  followers: DragPhase['followers'],
  rawDx: number,
  rawDy: number,
  gridSize: number | null,
): { id: string; x: number; y: number }[] {
  let nx = leaderOriginX + rawDx;
  let ny = leaderOriginY + rawDy;
  const gs = gridSize;
  if (gs != null && gs > 0) {
    const s = snapPointToGrid(nx, ny, gs);
    nx = s.x;
    ny = s.y;
  }
  const out: { id: string; x: number; y: number }[] = [{ id: leaderId, x: nx, y: ny }];
  for (const f of followers) {
    let fx = f.originX + rawDx;
    let fy = f.originY + rawDy;
    if (gs != null && gs > 0) {
      const s = snapPointToGrid(fx, fy, gs);
      fx = s.x;
      fy = s.y;
    }
    out.push({ id: f.id, x: fx, y: fy });
  }
  return out;
}

/**
 * Pointer-driven move in canvas space. Optional followers move by the same pointer delta (each snapped to grid).
 * Commits `ComponentUpdate[]` on pointerup / pointercancel.
 */
export function usePointerDrag({
  containerRef,
  gridSize,
  onCommit,
  onTransientPositions,
  onDragEnd,
  canDrag = () => true,
  skipCommitIfUnchanged = true,
  getItemDimensions,
  shouldClampItem,
  viewScale = 1,
  sheetViewportRef,
  sheetFitTransformRef,
}: UsePointerDragOptions) {
  const optsRef = useRef({
    onCommit,
    onTransientPositions,
    onDragEnd,
    canDrag,
    skipCommitIfUnchanged,
    gridSize: gridSize ?? null,
    containerRef,
    getItemDimensions,
    shouldClampItem,
    viewScale,
    sheetViewportRef,
    sheetFitTransformRef,
  });
  optsRef.current = {
    onCommit,
    onTransientPositions,
    onDragEnd,
    canDrag,
    skipCommitIfUnchanged,
    gridSize: gridSize ?? null,
    containerRef,
    getItemDimensions,
    shouldClampItem,
    viewScale,
    sheetViewportRef,
    sheetFitTransformRef,
  };

  const phaseRef = useRef<DragPhase | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ id: string; x: number; y: number }[] | null>(null);
  const lastPositionsRef = useRef<{ id: string; x: number; y: number }[] | null>(null);

  const flushTransient = useCallback(() => {
    rafRef.current = null;
    const pending = pendingRef.current;
    const phase = phaseRef.current;
    if (!pending || !phase) return;
    optsRef.current.onTransientPositions?.(pending);
  }, []);

  const scheduleTransient = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(flushTransient);
  }, [flushTransient]);

  const beginMove = useCallback(
    (e: React.PointerEvent<Element>, params: BeginMoveParams) => {
      const o = optsRef.current;
      if (e.button !== 0) return;
      const draggable = o.canDrag(params.id);
      if (!draggable && !params.deferredSelectionOnTap) return;
      const container = o.containerRef.current;
      if (!container) return;

      // Do not preventDefault on pointerdown — allows click / dblclick on inner elements (e.g. text span).
      e.stopPropagation();

      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const tFit = o.sheetFitTransformRef?.current;
      const vp = o.sheetViewportRef?.current;
      const local =
        tFit && vp && tFit.scale > 0
          ? clientToCanvasSheetFit(
              e.clientX,
              e.clientY,
              vp.getBoundingClientRect(),
              tFit.tx,
              tFit.ty,
              tFit.scale,
            )
          : clientToCanvas(e.clientX, e.clientY, container, o.viewScale);
      const followers = (params.followers ?? []).map((f) => ({
        id: f.id,
        originX: f.x,
        originY: f.y,
      }));
      const pointerId = e.pointerId;
      phaseRef.current = {
        leaderId: params.id,
        originX: params.x,
        originY: params.y,
        startLocalX: local.x,
        startLocalY: local.y,
        pointerId,
        followers,
      };
      lastPositionsRef.current = [
        { id: params.id, x: params.x, y: params.y },
        ...followers.map((f) => ({ id: f.id, x: f.originX, y: f.originY })),
      ];

      const el = e.currentTarget;
      let dragStarted = false;
      let exceededThreshold = false;
      let releaseDocumentDragChrome: (() => void) | null = null;

      const doc = typeof document !== 'undefined' ? document : null;
      const captureOpts = { capture: true } as const;
      const moveOpts = { passive: false, capture: true } as const;

      const teardownDocument = () => {
        if (!doc) return;
        doc.removeEventListener('pointermove', onMove, moveOpts);
        doc.removeEventListener('pointerup', onUp, captureOpts);
        doc.removeEventListener('pointercancel', onUp, captureOpts);
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const ph = phaseRef.current;
        const oc = optsRef.current;
        if (!ph) return;

        if (!exceededThreshold) {
          const d = Math.hypot(ev.clientX - startClientX, ev.clientY - startClientY);
          if (d < DRAG_THRESHOLD_PX) return;
          exceededThreshold = true;
          if (!oc.canDrag(ph.leaderId)) {
            return;
          }
          dragStarted = true;
          releaseDocumentDragChrome = beginDocumentDragChromeSuppress();
          try {
            (el as HTMLElement).setPointerCapture(pointerId);
          } catch {
            /* */
          }
        }

        if (!dragStarted) {
          return;
        }

        ev.preventDefault();

        const c = oc.containerRef.current;
        if (!c) return;
        const tF = oc.sheetFitTransformRef?.current;
        const vpr = oc.sheetViewportRef?.current;
        const cur =
          tF && vpr && tF.scale > 0
            ? clientToCanvasSheetFit(
                ev.clientX,
                ev.clientY,
                vpr.getBoundingClientRect(),
                tF.tx,
                tF.ty,
                tF.scale,
              )
            : clientToCanvas(ev.clientX, ev.clientY, c, oc.viewScale);
        const rawDx = cur.x - ph.startLocalX;
        const rawDy = cur.y - ph.startLocalY;
        let positions = positionsForDelta(
          ph.leaderId,
          ph.originX,
          ph.originY,
          ph.followers,
          rawDx,
          rawDy,
          oc.gridSize,
        );
        const dim = oc.getItemDimensions;
        const clampItem = oc.shouldClampItem ?? (() => true);
        if (dim && c) {
          positions = positions.map((p) => {
            if (!clampItem(p.id)) return p;
            return clampCanvasPositions([p], c, dim)[0];
          });
        }
        lastPositionsRef.current = positions;
        pendingRef.current = positions;
        scheduleTransient();
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        teardownDocument();

        if (rafRef.current != null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        if (dragStarted) {
          flushTransient();
        }
        pendingRef.current = null;

        const ph = phaseRef.current;
        phaseRef.current = null;

        let didCommit = false;
        try {
          if (dragStarted && ph) {
            try {
              (el as HTMLElement).releasePointerCapture(pointerId);
            } catch {
              /* */
            }
          }

          const last = lastPositionsRef.current;
          lastPositionsRef.current = null;
          if (dragStarted && ph && ev.pointerId === ph.pointerId && last?.length) {
            const leaderPos = last.find((p) => p.id === ph.leaderId);
            const skip =
              optsRef.current.skipCommitIfUnchanged &&
              leaderPos != null &&
              leaderPos.x === params.x &&
              leaderPos.y === params.y;
            if (!skip) {
              const updates: ComponentUpdate[] = last.map((p) => ({ id: p.id, x: p.x, y: p.y }));
              optsRef.current.onCommit(updates);
              didCommit = true;
            }
          }
        } finally {
          if (!exceededThreshold && ev.type === 'pointerup') {
            params.deferredSelectionOnTap?.(ev);
          }
          releaseDocumentDragChrome?.();
          releaseDocumentDragChrome = null;
          optsRef.current.onDragEnd?.({ didCommit });
        }
      };

      if (doc) {
        doc.addEventListener('pointermove', onMove, moveOpts);
        doc.addEventListener('pointerup', onUp, captureOpts);
        doc.addEventListener('pointercancel', onUp, captureOpts);
      }
    },
    [flushTransient, scheduleTransient],
  );

  return { beginMove };
}
