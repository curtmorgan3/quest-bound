import type { ComponentUpdate } from '@/lib/compass-api';
import type { Component, Coordinates } from '@/types';
import { useKeyListeners } from '@/utils';
import {
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from 'react';

import { WindowEditorContext } from '@/stores';
import { CanvasPointerSpike } from '../base-editor/canvas-pointer-spike';
import { ContextMenu } from '../base-editor/context-menu';
import {
  CanvasGridBackground,
  clientToCanvas,
  EditorCanvasChromeProvider,
  EditorItemIdProvider,
  EditorItemLayoutProvider,
  useMarqueeSelection,
  usePointerDrag,
} from '../canvas';
import { isAdditiveEditorSelection } from '../canvas/selection-modifiers';
import { DEFAULT_GRID_SIZE } from '../editor-config';
import { sheetNodeTypes, type EditorMenuOption } from '../nodes';
import { ComponentTypes } from '../nodes/node-types';
import {
  updatesForClickSelection,
  updatesForMarqueeSelection,
  updatesToClearSelection,
} from './selection-updates';

const SHOW_CANVAS_POINTER_SPIKE =
  import.meta.env.DEV && import.meta.env.VITE_CANVAS_POINTER_SPIKE === '1';

export interface SheetCanvasEditorProps {
  components: Component[];
  menuOptions?: EditorMenuOption[];
  onSelectFromMenu?: (option: EditorMenuOption, coordinates: Coordinates) => void;
  useGrid?: boolean;
  backgroundColor?: string;
  backgroundOpacity?: number;
  backgroundImage?: string | null;
  renderContextMenu?: boolean;
  onComponentsUpdated: (updates: ComponentUpdate[]) => void;
  onComponentsDeleted: (ids: string[]) => void;
}

export function SheetCanvasEditor({
  components,
  menuOptions,
  onSelectFromMenu,
  useGrid = true,
  backgroundColor,
  backgroundOpacity,
  backgroundImage,
  renderContextMenu = true,
  onComponentsUpdated,
  onComponentsDeleted,
}: SheetCanvasEditorProps) {
  const { getComponent } = useContext(WindowEditorContext);
  const sectionRef = useRef<HTMLElement>(null);
  const opacity = !backgroundColor && !backgroundImage ? 1 : (backgroundOpacity ?? 0.1);
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchPositionRef = useRef<{ x: number; y: number } | null>(null);

  const [contextMenu, setContextMenu] = useState<{
    clientX: number;
    clientY: number;
    add: Coordinates;
  } | null>(null);

  const [movePreview, setMovePreview] = useState<{ id: string; x: number; y: number } | null>(null);
  const [resizePreview, setResizePreview] = useState<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const sorted = useMemo(() => [...components].sort((a, b) => a.z - b.z), [components]);

  const selectedIdSet = useMemo(() => {
    const s = new Set<string>();
    for (const c of components) {
      if (c.selected) s.add(c.id);
    }
    return s;
  }, [components]);

  const isSelected = useCallback((id: string) => selectedIdSet.has(id), [selectedIdSet]);

  const onResizeCommit = useCallback(
    (id: string, width: number, height: number, x: number, y: number) => {
      setResizePreview({ id, x, y, width, height });
      onComponentsUpdated([{ id, width, height, x, y }]);
    },
    [onComponentsUpdated],
  );

  const onResizeTransient = useCallback(
    (id: string, width: number, height: number, x: number, y: number) => {
      setResizePreview({ id, x, y, width, height });
    },
    [],
  );

  const onResizeGestureEnd = useCallback(() => setResizePreview(null), []);

  const chromeValue = useMemo(
    () => ({
      containerRef: sectionRef,
      isSelected,
      onResizeCommit,
      useGrid,
      onResizeTransient,
      onResizeGestureEnd,
    }),
    [isSelected, onResizeCommit, onResizeGestureEnd, onResizeTransient, useGrid],
  );

  const { beginMove } = usePointerDrag({
    containerRef: sectionRef,
    gridSize: useGrid ? DEFAULT_GRID_SIZE : null,
    onCommit: (u) => {
      if (u.id != null && typeof u.x === 'number' && typeof u.y === 'number') {
        setMovePreview({ id: u.id, x: u.x, y: u.y });
      }
      onComponentsUpdated([u]);
    },
    onTransientPosition: (id, x, y) => setMovePreview({ id, x, y }),
    onDragEnd: ({ didCommit }) => {
      if (!didCommit) setMovePreview(null);
    },
    canDrag: (id) => !getComponent(id)?.locked,
  });

  useLayoutEffect(() => {
    if (!movePreview) return;
    const c = components.find((x) => x.id === movePreview.id);
    if (!c) {
      setMovePreview(null);
      return;
    }
    if (c.x === movePreview.x && c.y === movePreview.y) {
      setMovePreview(null);
    }
  }, [components, movePreview]);

  useLayoutEffect(() => {
    if (!resizePreview) return;
    const c = components.find((x) => x.id === resizePreview.id);
    if (!c) {
      setResizePreview(null);
      return;
    }
    if (
      c.x === resizePreview.x &&
      c.y === resizePreview.y &&
      c.width === resizePreview.width &&
      c.height === resizePreview.height
    ) {
      setResizePreview(null);
    }
  }, [components, resizePreview]);

  const getSelectableItems = useCallback(
    () =>
      components.map((c) => ({
        id: c.id,
        x: c.x,
        y: c.y,
        width: c.width,
        height: c.height,
      })),
    [components],
  );

  /** Marquee uses pointer capture; pointerup can fire with the cursor over the edit panel or a Radix portal. */
  const shouldSuppressMicroDragClear = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return false;
    return Boolean(
      el.closest('[data-component-edit-panel]') ||
      el.closest('[data-radix-popper-content-wrapper]') ||
      el.closest('[role="dialog"]'),
    );
  }, []);

  const { marqueeRect, marqueeHandlers } = useMarqueeSelection({
    containerRef: sectionRef,
    getItems: getSelectableItems,
    onComplete: (hitIds, modifiers) => {
      const updates = updatesForMarqueeSelection(components, hitIds, modifiers);
      if (updates.length) onComponentsUpdated(updates);
    },
    onMicroDrag: (modifiers) => {
      if (!isAdditiveEditorSelection(modifiers)) {
        const updates = updatesToClearSelection(components);
        if (updates.length) onComponentsUpdated(updates);
      }
    },
    shouldSuppressMicroDragClear,
  });

  const openContextMenuFromClient = useCallback((clientX: number, clientY: number) => {
    const sidebarCollapsed = localStorage.getItem('qb.sidebarCollapsed') === 'true';
    const sidebarOffset = sidebarCollapsed ? 47 : 255;
    const adjX = clientX - sidebarOffset;
    const root = sectionRef.current;
    const add = root ? clientToCanvas(adjX, clientY, root) : { x: 0, y: 0 };
    setContextMenu({ clientX, clientY, add });
  }, []);

  const onItemPointerDown = useCallback(
    (e: React.PointerEvent, c: Component) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement;
      if (t.closest('[data-no-canvas-drag], .nodrag, [data-native-resize-handle]')) return;

      const updates = updatesForClickSelection(components, c.id, e);
      if (updates.length) onComponentsUpdated(updates);

      if (!c.locked) {
        beginMove(e, { id: c.id, x: c.x, y: c.y });
      }
    },
    [beginMove, components, onComponentsUpdated],
  );

  useKeyListeners({
    onKeyDown: (e) => {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      const ae = document.activeElement as HTMLElement | null;
      if (
        ae &&
        (ae.tagName === 'INPUT' ||
          ae.tagName === 'TEXTAREA' ||
          ae.isContentEditable ||
          ae.closest('[contenteditable="true"]'))
      ) {
        return;
      }
      const ids = components.filter((c) => c.selected && !c.locked).map((c) => c.id);
      if (ids.length) {
        e.preventDefault?.();
        onComponentsDeleted(ids);
      }
    },
  });

  const clearLongPress = () => {
    if (longPressTimeoutRef.current != null) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
    touchPositionRef.current = null;
  };

  const LONG_PRESS_MS = 500;

  return (
    <EditorCanvasChromeProvider value={chromeValue}>
      <section
        ref={sectionRef}
        id='base-editor'
        className='relative flex h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden'
        onContextMenu={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            return false;
          }
          if (!renderContextMenu) return;
          e.preventDefault();
          openContextMenuFromClient(e.clientX, e.clientY);
          return false;
        }}
        onTouchStart={(e) => {
          if (!renderContextMenu || e.touches.length !== 1) return;
          const touch = e.touches[0];
          touchPositionRef.current = { x: touch.clientX, y: touch.clientY };
          longPressTimeoutRef.current = setTimeout(() => {
            const pos = touchPositionRef.current;
            if (pos) openContextMenuFromClient(pos.x, pos.y);
            clearLongPress();
          }, LONG_PRESS_MS);
        }}
        onTouchEnd={clearLongPress}
        onTouchCancel={clearLongPress}>
        {backgroundColor != null && (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              backgroundColor,
              opacity,
              pointerEvents: 'none',
            }}
          />
        )}
        {backgroundImage != null && (
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
              opacity,
              pointerEvents: 'none',
            }}
          />
        )}

        <div className='pointer-events-none absolute inset-0 z-[1]'>
          {useGrid && <CanvasGridBackground style={{ opacity }} />}
        </div>

        <div
          role='presentation'
          className='absolute inset-0 z-[1] touch-none'
          style={{ touchAction: 'none' }}
          {...marqueeHandlers}
        />

        <div
          className='pointer-events-none absolute inset-0 z-[2]'
          style={{ touchAction: 'manipulation' }}>
          {sorted.map((c) => {
            const Edit = sheetNodeTypes[c.type as ComponentTypes] as ComponentType | undefined;
            if (!Edit) return null;
            const layout =
              resizePreview?.id === c.id
                ? {
                    left: resizePreview.x,
                    top: resizePreview.y,
                    width: resizePreview.width,
                    height: resizePreview.height,
                  }
                : movePreview?.id === c.id
                  ? {
                      left: movePreview.x,
                      top: movePreview.y,
                      width: c.width,
                      height: c.height,
                    }
                  : { left: c.x, top: c.y, width: c.width, height: c.height };
            return (
              <div
                key={c.id}
                data-canvas-item={c.id}
                className='pointer-events-auto absolute'
                style={{
                  left: layout.left,
                  top: layout.top,
                  width: layout.width,
                  height: layout.height,
                  zIndex: c.z,
                }}
                onPointerDown={(e) => onItemPointerDown(e, c)}>
                <EditorItemLayoutProvider value={{ width: layout.width, height: layout.height }}>
                  <EditorItemIdProvider id={c.id}>
                    <Edit />
                  </EditorItemIdProvider>
                </EditorItemLayoutProvider>
              </div>
            );
          })}
        </div>

        {marqueeRect != null ? (
          <div
            aria-hidden
            className='border-primary/80 bg-primary/15 pointer-events-none absolute z-[10] border border-dashed'
            style={{
              left: marqueeRect.x,
              top: marqueeRect.y,
              width: marqueeRect.width,
              height: marqueeRect.height,
            }}
          />
        ) : null}

        {renderContextMenu && contextMenu != null && (
          <ContextMenu
            isOpen
            options={menuOptions ?? []}
            onSelect={(...args) => onSelectFromMenu?.(...args)}
            onClose={() => setContextMenu(null)}
            x={contextMenu.clientX}
            y={contextMenu.clientY}
            addComponentCoordinates={contextMenu.add}
          />
        )}

        {SHOW_CANVAS_POINTER_SPIKE && (
          <div aria-hidden className='pointer-events-none absolute inset-0 z-20 overflow-visible'>
            <CanvasPointerSpike containerRef={sectionRef} />
          </div>
        )}
      </section>
    </EditorCanvasChromeProvider>
  );
}
