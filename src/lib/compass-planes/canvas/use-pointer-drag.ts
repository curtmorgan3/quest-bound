import type { ComponentUpdate } from '@/lib/compass-api';
import { useCallback, useRef } from 'react';

import { clientToCanvas, snapPointToGrid } from './client-to-canvas';

export type PointerDragFollower = { id: string; x: number; y: number };

/** Device pixels before we treat the gesture as a drag (not a click). Avoids capturing the pointer immediately, which would retarget click/dblclick away from inner targets (e.g. text nodes). */
const DRAG_THRESHOLD_PX = 5;

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
}: UsePointerDragOptions) {
  const optsRef = useRef({
    onCommit,
    onTransientPositions,
    onDragEnd,
    canDrag,
    skipCommitIfUnchanged,
    gridSize: gridSize ?? null,
    containerRef,
  });
  optsRef.current = {
    onCommit,
    onTransientPositions,
    onDragEnd,
    canDrag,
    skipCommitIfUnchanged,
    gridSize: gridSize ?? null,
    containerRef,
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
    (
      e: React.PointerEvent<Element>,
      params: { id: string; x: number; y: number; followers?: PointerDragFollower[] },
    ) => {
      const o = optsRef.current;
      if (e.button !== 0) return;
      if (!o.canDrag(params.id)) return;
      const container = o.containerRef.current;
      if (!container) return;

      // Do not preventDefault on pointerdown — allows click / dblclick on inner elements (e.g. text span).
      e.stopPropagation();

      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const local = clientToCanvas(e.clientX, e.clientY, container);
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

      const teardownWindow = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const ph = phaseRef.current;
        const oc = optsRef.current;
        if (!ph) return;

        if (!dragStarted) {
          const d = Math.hypot(ev.clientX - startClientX, ev.clientY - startClientY);
          if (d < DRAG_THRESHOLD_PX) return;
          dragStarted = true;
          try {
            (el as HTMLElement).setPointerCapture(pointerId);
          } catch {
            /* */
          }
        }

        if (dragStarted) {
          ev.preventDefault();
        }

        const c = oc.containerRef.current;
        if (!c) return;
        const cur = clientToCanvas(ev.clientX, ev.clientY, c);
        const rawDx = cur.x - ph.startLocalX;
        const rawDy = cur.y - ph.startLocalY;
        const positions = positionsForDelta(
          ph.leaderId,
          ph.originX,
          ph.originY,
          ph.followers,
          rawDx,
          rawDy,
          oc.gridSize,
        );
        lastPositionsRef.current = positions;
        pendingRef.current = positions;
        scheduleTransient();
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        teardownWindow();

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
          optsRef.current.onDragEnd?.({ didCommit });
        }
      };

      window.addEventListener('pointermove', onMove, { passive: false });
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [flushTransient, scheduleTransient],
  );

  return { beginMove };
}
