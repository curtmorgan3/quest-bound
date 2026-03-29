import { useCallback, useRef, useState } from 'react';

import { clientToCanvas } from './client-to-canvas';
import {
  idsIntersectingMarquee,
  normalizeMarqueeRect,
  type CanvasAxisRect,
  type SelectableCanvasItem,
} from './marquee-hit-test';
import type { EditorSelectionPointerModifiers } from './selection-modifiers';

export type UseMarqueeSelectionOptions = {
  containerRef: React.RefObject<HTMLElement | null>;
  getItems: () => SelectableCanvasItem[];
  onComplete: (hitIds: string[], modifiers: EditorSelectionPointerModifiers) => void;
  /** Ignore tiny box drags (accidental clicks on the marquee layer). */
  minDragPx?: number;
  enabled?: boolean;
};

type ActiveMarquee = {
  pointerId: number;
  startX: number;
  startY: number;
  modifiers: EditorSelectionPointerModifiers;
};

/**
 * Pointer rectangle selection on a layer that sits **below** interactive canvas items.
 * On `pointerup`, calls `onComplete` with ids whose bounds intersect the marquee (AABB).
 */
export function useMarqueeSelection({
  containerRef,
  getItems,
  onComplete,
  minDragPx = 4,
  enabled = true,
}: UseMarqueeSelectionOptions) {
  const [marqueeRect, setMarqueeRect] = useState<CanvasAxisRect | null>(null);

  const optsRef = useRef({
    getItems,
    onComplete,
    minDragPx,
    enabled,
    containerRef,
  });
  optsRef.current = { getItems, onComplete, minDragPx, enabled, containerRef };

  const activeRef = useRef<ActiveMarquee | null>(null);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const o = optsRef.current;
    if (!o.enabled || e.button !== 0) return;
    const container = o.containerRef.current;
    if (!container) return;

    e.preventDefault();
    const { x, y } = clientToCanvas(e.clientX, e.clientY, container);
    activeRef.current = {
      pointerId: e.pointerId,
      startX: x,
      startY: y,
      modifiers: { shiftKey: e.shiftKey, metaKey: e.metaKey, ctrlKey: e.ctrlKey },
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setMarqueeRect(normalizeMarqueeRect(x, y, x, y));
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const a = activeRef.current;
    if (!a || e.pointerId !== a.pointerId) return;
    const container = optsRef.current.containerRef.current;
    if (!container) return;
    const { x, y } = clientToCanvas(e.clientX, e.clientY, container);
    setMarqueeRect(normalizeMarqueeRect(a.startX, a.startY, x, y));
  }, []);

  const finish = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const a = activeRef.current;
    if (!a || e.pointerId !== a.pointerId) return;
    const container = optsRef.current.containerRef.current;
    activeRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* */
    }

    setMarqueeRect(null);

    if (!container) return;

    const { x, y } = clientToCanvas(e.clientX, e.clientY, container);
    const rect = normalizeMarqueeRect(a.startX, a.startY, x, y);
    const minPx = optsRef.current.minDragPx;
    if (rect.width < minPx && rect.height < minPx) return;

    const hits = idsIntersectingMarquee(optsRef.current.getItems(), rect);
    optsRef.current.onComplete(hits, a.modifiers);
  }, []);

  const onPointerUp = finish;
  const onPointerCancel = finish;

  return {
    marqueeRect,
    marqueeHandlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
    },
  };
}
