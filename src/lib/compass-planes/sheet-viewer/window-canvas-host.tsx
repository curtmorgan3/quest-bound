import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ComponentUpdate } from '@/lib/compass-api';
import { Magnet, ScanSearch, ZoomIn, ZoomOut } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { CanvasGridBackground, usePointerDrag } from '../canvas';
import { DEFAULT_GRID_SIZE } from '../editor-config';
import { WindowCanvasSelectionContext } from './window-canvas-selection-context';

const FALLBACK_WINDOW_DRAG_W = 320;
const FALLBACK_WINDOW_DRAG_H = 240;

/** Shared with `window-editor` so sheet and page canvas preferences stay aligned. */
const WINDOW_EDITOR_GRID_STORAGE_KEY = 'qb.windowEditor.gridSize';
const WINDOW_EDITOR_SNAP_STORAGE_KEY = 'qb.windowEditor.snapToGrid';
const WINDOW_EDITOR_GRID_MIN = 4;
const WINDOW_EDITOR_GRID_MAX = 200;
const CANVAS_VIEW_ZOOM_STEP = 1.12;

function canvasZoomModifierActive(e: KeyboardEvent): boolean {
  if (typeof navigator === 'undefined') return e.ctrlKey;
  const apple = /Mac|iPhone|iPod|iPad/i.test(navigator.userAgent);
  return apple ? e.metaKey : e.ctrlKey;
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target.closest('[contenteditable="true"]')) return true;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

function readStoredWindowEditorGrid(): number {
  try {
    const raw = localStorage.getItem(WINDOW_EDITOR_GRID_STORAGE_KEY);
    const n = parseInt(raw ?? '', 10);
    if (!Number.isFinite(n)) return DEFAULT_GRID_SIZE;
    return Math.min(WINDOW_EDITOR_GRID_MAX, Math.max(WINDOW_EDITOR_GRID_MIN, n));
  } catch {
    return DEFAULT_GRID_SIZE;
  }
}

function readStoredSnapToGrid(): boolean {
  try {
    const raw = localStorage.getItem(WINDOW_EDITOR_SNAP_STORAGE_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

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
  /**
   * When true, shows bottom-left grid size, snap, and zoom controls and applies the same canvas
   * scaling / snapping pattern as `SheetCanvasEditor` (ruleset page editor).
   */
  showGridToolbar?: boolean;
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
  showGridToolbar = false,
}: WindowCanvasHostProps<T>) {
  const canvasRootRef = useRef<HTMLDivElement>(null);
  const windowWrapperElByIdRef = useRef(new Map<string, HTMLDivElement>());
  const [movePreviewById, setMovePreviewById] = useState<Record<string, { x: number; y: number }>>(
    {},
  );

  const [editorGridSize, setEditorGridSize] = useState(readStoredWindowEditorGrid);
  const [snapToGrid, setSnapToGrid] = useState(readStoredSnapToGrid);
  const [canvasViewScale, setCanvasViewScale] = useState(1);

  const resolvedGridSize = useMemo(() => {
    const n = Math.round(Number(editorGridSize));
    if (!Number.isFinite(n) || n < 1) return DEFAULT_GRID_SIZE;
    return Math.min(WINDOW_EDITOR_GRID_MAX, Math.max(WINDOW_EDITOR_GRID_MIN, n));
  }, [editorGridSize]);

  const resolvedViewScale = useMemo(() => {
    if (!showGridToolbar) return 1;
    const n = Number(canvasViewScale);
    if (!Number.isFinite(n) || n <= 0) return 1;
    return Math.min(3, Math.max(0.25, n));
  }, [canvasViewScale, showGridToolbar]);

  const persistEditorGridSize = useCallback((n: number) => {
    const clamped = Math.min(
      WINDOW_EDITOR_GRID_MAX,
      Math.max(WINDOW_EDITOR_GRID_MIN, Math.round(n)),
    );
    setEditorGridSize(clamped);
    try {
      localStorage.setItem(WINDOW_EDITOR_GRID_STORAGE_KEY, String(clamped));
    } catch {
      /* ignore */
    }
  }, []);

  const persistSnapToGrid = useCallback((next: boolean) => {
    setSnapToGrid(next);
    try {
      localStorage.setItem(WINDOW_EDITOR_SNAP_STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
  }, []);

  const zoomCanvasIn = useCallback(() => {
    setCanvasViewScale((s) => Math.min(3, Math.round(s * CANVAS_VIEW_ZOOM_STEP * 1000) / 1000));
  }, []);

  const zoomCanvasOut = useCallback(() => {
    setCanvasViewScale((s) =>
      Math.max(0.25, Math.round((s / CANVAS_VIEW_ZOOM_STEP) * 1000) / 1000),
    );
  }, []);

  useEffect(() => {
    if (!showGridToolbar) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!canvasZoomModifierActive(e)) return;
      if (isEditableKeyboardTarget(e.target)) return;

      const zoomIn = e.key === '+' || e.key === '=' || e.code === 'Equal' || e.code === 'NumpadAdd';
      const zoomOut = e.key === '-' || e.code === 'Minus' || e.code === 'NumpadSubtract';

      if (zoomIn) {
        e.preventDefault();
        zoomCanvasIn();
      } else if (zoomOut) {
        e.preventDefault();
        zoomCanvasOut();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showGridToolbar, zoomCanvasIn, zoomCanvasOut]);

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
    containerRef: canvasRootRef,
    gridSize: showGridToolbar && snapToGrid ? resolvedGridSize : null,
    getItemDimensions: getWindowDragDimensions,
    viewScale: resolvedViewScale,
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

  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);

  const selectWindow = useCallback((id: string | null) => {
    setSelectedWindowId(id);
  }, []);

  const selectionContextValue = useMemo(
    () => ({ selectedWindowId, selectWindow }),
    [selectedWindowId, selectWindow],
  );

  useEffect(() => {
    if (locked) setSelectedWindowId(null);
  }, [locked]);

  useLayoutEffect(() => {
    if (selectedWindowId == null) return;
    if (!windows.some((w) => w.id === selectedWindowId)) {
      setSelectedWindowId(null);
    }
  }, [windows, selectedWindowId]);

  const canvasScaleStyle = showGridToolbar
    ? {
        transform: `scale(${resolvedViewScale})`,
        transformOrigin: '0 0' as const,
        width: `${100 / resolvedViewScale}%`,
        height: `${100 / resolvedViewScale}%`,
      }
    : undefined;

  return (
    <WindowCanvasSelectionContext.Provider value={selectionContextValue}>
    <section
      id={sectionId}
      className={className}
      onClick={(e) => {
        const t = e.target as Element;
        if (t.closest('.window-node')) return;
        if (t.closest('[data-window-canvas-chrome]')) return;
        setSelectedWindowId(null);
        onBackdropClick?.(e.clientX, e.clientY);
      }}>
      {showGridToolbar ? (
        <div
          data-window-canvas-chrome
          className='pointer-events-none absolute bottom-14 left-2 z-[60]'>
          <div className='pointer-events-auto flex flex-row flex-wrap items-center gap-2 p-1.5'>
            <Input
              type='number'
              min={WINDOW_EDITOR_GRID_MIN}
              max={WINDOW_EDITOR_GRID_MAX}
              step={1}
              value={resolvedGridSize}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!Number.isFinite(n)) return;
                persistEditorGridSize(n);
              }}
              className='h-8 w-12 border-white/25 bg-black/50 px-1 text-center text-xs text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
              aria-label='Canvas grid size in pixels'
            />
            <Button
              type='button'
              variant='ghost'
              size='icon'
              aria-pressed={snapToGrid}
              aria-label={snapToGrid ? 'Turn snap to grid off' : 'Turn snap to grid on'}
              className='size-8 shrink-0 text-white hover:bg-white/15 hover:text-white'
              style={{ opacity: snapToGrid ? 1 : 0.45 }}
              onClick={() => persistSnapToGrid(!snapToGrid)}>
              <Magnet className='size-4' strokeWidth={2} aria-hidden />
            </Button>
            <div className='flex flex-row items-center gap-0.5'>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                aria-label='Zoom canvas in'
                className='size-8 shrink-0 text-white hover:bg-white/15 hover:text-white'
                onClick={zoomCanvasIn}>
                <ZoomIn className='size-4' strokeWidth={2} aria-hidden />
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                aria-label='Zoom canvas out'
                className='size-8 shrink-0 text-white hover:bg-white/15 hover:text-white'
                onClick={zoomCanvasOut}>
                <ZoomOut className='size-4' strokeWidth={2} aria-hidden />
              </Button>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                aria-label='Reset canvas zoom to 100%'
                className='size-8 shrink-0 text-white hover:bg-white/15 hover:text-white'
                onClick={() => setCanvasViewScale(1)}>
                <ScanSearch className='size-4' strokeWidth={2} aria-hidden />
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div ref={canvasRootRef} className='relative min-h-full min-w-full' style={canvasScaleStyle}>
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

        {showGridToolbar && snapToGrid ? (
          <div className='pointer-events-none absolute inset-0 z-[1]'>
            <CanvasGridBackground gridSize={resolvedGridSize} style={{ opacity: bgOpacity }} />
          </div>
        ) : null}

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
              style={{ left: layoutX, top: layoutY, zIndex: z + 1 }}
              onPointerDown={(e) => {
                if (!locked) {
                  setSelectedWindowId(w.id);
                }
                if (locked) return;
                const t = e.target as HTMLElement;
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
      </div>
    </section>
    </WindowCanvasSelectionContext.Provider>
  );
}
