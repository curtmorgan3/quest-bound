import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { ComponentUpdate } from '@/lib/compass-api';

import { usePointerDrag } from '../canvas';

const FALLBACK_WINDOW_DRAG_W = 320;
const FALLBACK_WINDOW_DRAG_H = 240;

/** Minimal shape for draggable windows on the native canvas (character or ruleset page). */
export type WindowCanvasItem = {
  id: string;
  x: number;
  y: number;
};

export type WindowCanvasHostProps<T extends WindowCanvasItem> = {
  windows: readonly T[];
  /** When true, pointer drags do not move windows. */
  locked: boolean;
  /** Fires once per completed drag with the window row id and new canvas position. */
  onWindowPositionUpdate?: (id: string, x: number, y: number) => void;
  backgroundColor?: string;
  backgroundImage?: string | null;
  /** Opacity for background layers (0–1). Defaults to 1 when not set. */
  backgroundOpacity?: number;
  /** Skip painting page background layers (character editor embedding). */
  transparentBackground?: boolean;
  /** Clicks on empty canvas (not on `.window-node`). */
  onBackdropClick?: (clientX: number, clientY: number) => void;
  className?: string;
  /** Section element receives `id` for tests and layout helpers. */
  sectionId?: string;
  renderWindow: (window: T, layout: { x: number; y: number }, zIndex: number) => ReactNode;
};

/**
 * Absolutely positioned windows with optional page background — replaces React Flow for sheet viewer / ruleset page editor.
 */
export function WindowCanvasHost<T extends WindowCanvasItem>({
  windows,
  locked,
  onWindowPositionUpdate,
  backgroundColor,
  backgroundImage,
  backgroundOpacity,
  transparentBackground = false,
  onBackdropClick,
  className = 'relative min-h-0 w-full flex-1 overflow-hidden',
  sectionId = 'base-editor',
  renderWindow,
}: WindowCanvasHostProps<T>) {
  const sectionRef = useRef<HTMLElement>(null);
  const windowWrapperElByIdRef = useRef(new Map<string, HTMLDivElement>());
  const [movePreviewById, setMovePreviewById] = useState<Record<string, { x: number; y: number }>>(
    {},
  );

  const getWindowDragDimensions = useCallback((id: string) => {
    const el = windowWrapperElByIdRef.current.get(id);
    const w = el?.offsetWidth ?? 0;
    const h = el?.offsetHeight ?? 0;
    return {
      width: w > 0 ? w : FALLBACK_WINDOW_DRAG_W,
      height: h > 0 ? h : FALLBACK_WINDOW_DRAG_H,
    };
  }, []);

  const onCommit = useCallback(
    (updates: ComponentUpdate[]) => {
      const next: Record<string, { x: number; y: number }> = {};
      for (const u of updates) {
        if (u.id != null && typeof u.x === 'number' && typeof u.y === 'number') {
          next[u.id] = { x: u.x, y: u.y };
          onWindowPositionUpdate?.(u.id, u.x, u.y);
        }
      }
      setMovePreviewById(next);
    },
    [onWindowPositionUpdate],
  );

  const { beginMove } = usePointerDrag({
    containerRef: sectionRef,
    gridSize: null,
    getItemDimensions: getWindowDragDimensions,
    onCommit,
    onTransientPositions: (items) => {
      setMovePreviewById(Object.fromEntries(items.map((i) => [i.id, { x: i.x, y: i.y }])));
    },
    onDragEnd: ({ didCommit }) => {
      if (!didCommit) setMovePreviewById({});
    },
    canDrag: () => !locked,
  });

  useLayoutEffect(() => {
    setMovePreviewById((prev) => {
      const ids = Object.keys(prev);
      if (ids.length === 0) return prev;
      let next = { ...prev };
      let changed = false;
      for (const id of ids) {
        const pos = prev[id];
        const w = windows.find((x) => x.id === id);
        if (!w || (w.x === pos.x && w.y === pos.y)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [windows]);

  const bgOpacity =
    backgroundOpacity !== undefined && backgroundOpacity !== null ? backgroundOpacity : 1;

  const showBg = !transparentBackground;

  return (
    <section
      ref={sectionRef}
      id={sectionId}
      className={className}
      onClick={(e) => {
        if ((e.target as Element).closest('.window-node')) return;
        onBackdropClick?.(e.clientX, e.clientY);
      }}>
      {showBg && backgroundColor != null && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            backgroundColor,
            opacity: bgOpacity,
            pointerEvents: 'none',
          }}
        />
      )}
      {showBg && backgroundImage != null && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: bgOpacity,
            pointerEvents: 'none',
          }}
        />
      )}

      {windows.map((w, index) => {
        const pv = movePreviewById[w.id];
        const layoutX = pv?.x ?? w.x;
        const layoutY = pv?.y ?? w.y;
        const z = index + 1;

        return (
          <div
            key={w.id}
            ref={(el) => {
              if (el) windowWrapperElByIdRef.current.set(w.id, el);
              else windowWrapperElByIdRef.current.delete(w.id);
            }}
            className='pointer-events-auto absolute'
            style={{ left: layoutX, top: layoutY, zIndex: z }}
            onPointerDown={(e) => {
              if (locked) return;
              const t = e.target as HTMLElement;
              // Exclude real controls; do not use a wrapper around the whole sheet (that blocked all drags).
              if (
                t.closest(
                  '.clickable, a, button, input, textarea, select, label, [contenteditable="true"], [role="button"], [role="menuitem"], [role="option"], [role="tab"]',
                )
              ) {
                return;
              }
              beginMove(e, { id: w.id, x: layoutX, y: layoutY });
            }}>
            {renderWindow(w, { x: layoutX, y: layoutY }, z)}
          </div>
        );
      })}
    </section>
  );
}
