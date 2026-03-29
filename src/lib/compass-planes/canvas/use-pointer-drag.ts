import type { ComponentUpdate } from '@/lib/compass-api';
import { useCallback, useRef } from 'react';

import { clientToCanvas, snapPointToGrid } from './client-to-canvas';

export type UsePointerDragOptions = {
  containerRef: React.RefObject<HTMLElement | null>;
  /** Omit or pass `null` / `0` to disable snapping. */
  gridSize?: number | null;
  /** Latest geometry commit (one update per gesture), mirroring `useHandleNodeChange` position commits. */
  onCommit: (update: ComponentUpdate) => void;
  /** Optional live preview during drag (rAF-throttled). */
  onTransientPosition?: (id: string, x: number, y: number) => void;
  /**
   * Called after pointer up/cancel. `didCommit` is true when `onCommit` ran this gesture.
   * Keep showing committed geometry until props catch up when `didCommit` is true.
   */
  onDragEnd?: (info: { didCommit: boolean }) => void;
  canDrag?: (id: string) => boolean;
  /** If true, skip `onCommit` when the snapped position equals the start position. */
  skipCommitIfUnchanged?: boolean;
};

type DragPhase = {
  id: string;
  originX: number;
  originY: number;
  startLocalX: number;
  startLocalY: number;
  pointerId: number;
};

/**
 * Pointer-driven move in canvas space. Applies optional grid snap and batches transient updates to rAF.
 * Commits a single `ComponentUpdate` on `pointerup` / `pointercancel`.
 */
export function usePointerDrag({
  containerRef,
  gridSize,
  onCommit,
  onTransientPosition,
  onDragEnd,
  canDrag = () => true,
  skipCommitIfUnchanged = true,
}: UsePointerDragOptions) {
  const optsRef = useRef({
    onCommit,
    onTransientPosition,
    onDragEnd,
    canDrag,
    skipCommitIfUnchanged,
    gridSize: gridSize ?? null,
    containerRef,
  });
  optsRef.current = {
    onCommit,
    onTransientPosition,
    onDragEnd,
    canDrag,
    skipCommitIfUnchanged,
    gridSize: gridSize ?? null,
    containerRef,
  };

  const phaseRef = useRef<DragPhase | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ id: string; x: number; y: number } | null>(null);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  const flushTransient = useCallback(() => {
    rafRef.current = null;
    const pending = pendingRef.current;
    const phase = phaseRef.current;
    if (!pending || !phase || pending.id !== phase.id) return;
    optsRef.current.onTransientPosition?.(pending.id, pending.x, pending.y);
  }, []);

  const scheduleTransient = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(flushTransient);
  }, [flushTransient]);

  const beginMove = useCallback(
    (e: React.PointerEvent<Element>, params: { id: string; x: number; y: number }) => {
      const o = optsRef.current;
      if (e.button !== 0) return;
      if (!o.canDrag(params.id)) return;
      const container = o.containerRef.current;
      if (!container) return;

      e.preventDefault();
      e.stopPropagation();

      const local = clientToCanvas(e.clientX, e.clientY, container);
      phaseRef.current = {
        id: params.id,
        originX: params.x,
        originY: params.y,
        startLocalX: local.x,
        startLocalY: local.y,
        pointerId: e.pointerId,
      };
      lastPosRef.current = { x: params.x, y: params.y };

      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);

      const onMove = (ev: PointerEvent) => {
        const ph = phaseRef.current;
        const oc = optsRef.current;
        if (!ph || ev.pointerId !== ph.pointerId) return;
        const c = oc.containerRef.current;
        if (!c) return;
        const cur = clientToCanvas(ev.clientX, ev.clientY, c);
        let nx = ph.originX + (cur.x - ph.startLocalX);
        let ny = ph.originY + (cur.y - ph.startLocalY);
        const gs = oc.gridSize;
        if (gs != null && gs > 0) {
          const s = snapPointToGrid(nx, ny, gs);
          nx = s.x;
          ny = s.y;
        }
        lastPosRef.current = { x: nx, y: ny };
        pendingRef.current = { id: ph.id, x: nx, y: ny };
        scheduleTransient();
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== e.pointerId) return;
        el.removeEventListener('pointermove', onMove);
        el.removeEventListener('pointerup', onUp);
        el.removeEventListener('pointercancel', onUp);

        if (rafRef.current != null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        flushTransient();
        pendingRef.current = null;

        const ph = phaseRef.current;
        phaseRef.current = null;

        let didCommit = false;
        try {
          if (ph && ph.pointerId === ev.pointerId) {
            try {
              el.releasePointerCapture(ev.pointerId);
            } catch {
              /* already released */
            }
          }

          const last = lastPosRef.current;
          lastPosRef.current = null;
          if (ph && ph.pointerId === ev.pointerId && last) {
            const skip =
              optsRef.current.skipCommitIfUnchanged &&
              last.x === params.x &&
              last.y === params.y;
            if (!skip) {
              optsRef.current.onCommit({ id: ph.id, x: last.x, y: last.y });
              didCommit = true;
            }
          }
        } finally {
          optsRef.current.onDragEnd?.({ didCommit });
        }
      };

      el.addEventListener('pointermove', onMove);
      el.addEventListener('pointerup', onUp);
      el.addEventListener('pointercancel', onUp);
    },
    [flushTransient, scheduleTransient],
  );

  return { beginMove };
}
