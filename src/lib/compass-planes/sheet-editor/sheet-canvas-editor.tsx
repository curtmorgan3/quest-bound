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
import { Component as CompositeTemplateIcon } from 'lucide-react';
import {
  CanvasGridBackground,
  clampTopLeftInRect,
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
import { injectDefaultComponent } from '../utils/inject-defaults';
import { AddComponentPanel } from './add-component-panel';
import {
  buildEffectiveLayoutMap,
  componentByIdMap,
  expandDeleteIds,
  worldTopLeftWithEffective,
} from './component-world-geometry';
import { groupRootIfMember, isFlexHostedChild } from './group-flex-utils';
import {
  updatesForClickSelection,
  updatesForMarqueeSelection,
  updatesToClearSelection,
} from './selection-updates';
import { SheetCanvasLayoutContext } from './sheet-canvas-layout-context';

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  if (target.closest('[contenteditable="true"]')) return true;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return target.isContentEditable;
}

export interface SheetCanvasEditorProps {
  components: Component[];
  menuOptions?: EditorMenuOption[];
  onSelectFromMenu?: (option: EditorMenuOption, coordinates: Coordinates) => void;
  useGrid?: boolean;
  /** Snap and background grid spacing in pixels (when `useGrid` is true). Defaults to `DEFAULT_GRID_SIZE`. */
  gridSize?: number;
  /** View-only zoom; does not change stored component geometry. */
  viewScale?: number;
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
  gridSize: gridSizeProp = DEFAULT_GRID_SIZE,
  viewScale: viewScaleProp = 1,
  backgroundColor,
  backgroundOpacity,
  backgroundImage,
  renderContextMenu = true,
  onComponentsUpdated,
  onComponentsDeleted,
}: SheetCanvasEditorProps) {
  const { getComponent, groupSelectedComponents, canGroupSelected, compositeTemplateRootIds } =
    useContext(WindowEditorContext);
  const canvasRootRef = useRef<HTMLDivElement>(null);
  const componentsRef = useRef(components);
  componentsRef.current = components;
  const opacity = !backgroundColor && !backgroundImage ? 1 : (backgroundOpacity ?? 0.1);
  const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchPositionRef = useRef<{ x: number; y: number } | null>(null);

  const [addComponentPanel, setAddComponentPanel] = useState<{
    add: Coordinates;
  } | null>(null);

  const [movePreviewById, setMovePreviewById] = useState<Record<string, { x: number; y: number }>>(
    {},
  );
  const [resizePreview, setResizePreview] = useState<{
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const resolvedGridSize = useMemo(() => {
    const n = Math.round(Number(gridSizeProp));
    if (!Number.isFinite(n) || n < 1) return DEFAULT_GRID_SIZE;
    return Math.min(200, Math.max(1, n));
  }, [gridSizeProp]);

  const resolvedViewScale = useMemo(() => {
    const n = Number(viewScaleProp);
    if (!Number.isFinite(n) || n <= 0) return 1;
    return Math.min(3, Math.max(0.25, n));
  }, [viewScaleProp]);

  const sorted = useMemo(() => [...components].sort((a, b) => a.z - b.z), [components]);

  const byId = useMemo(() => componentByIdMap(components), [components]);

  const effectiveLayout = useMemo(
    () => buildEffectiveLayoutMap(components, movePreviewById, resizePreview),
    [components, movePreviewById, resizePreview],
  );

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
      containerRef: canvasRootRef,
      isSelected,
      onResizeCommit,
      useGrid,
      gridSize: resolvedGridSize,
      viewScale: resolvedViewScale,
      onResizeTransient,
      onResizeGestureEnd,
    }),
    [
      isSelected,
      onResizeCommit,
      onResizeGestureEnd,
      onResizeTransient,
      resolvedGridSize,
      resolvedViewScale,
      useGrid,
    ],
  );

  const getDragItemDimensions = useCallback(
    (id: string) => {
      const eff = effectiveLayout.get(id);
      if (eff) return { width: eff.width, height: eff.height };
      const c = components.find((x) => x.id === id);
      return { width: c?.width ?? 1, height: c?.height ?? 1 };
    },
    [components, effectiveLayout],
  );

  const { beginMove } = usePointerDrag({
    containerRef: canvasRootRef,
    gridSize: useGrid ? resolvedGridSize : null,
    getItemDimensions: getDragItemDimensions,
    shouldClampItem: (id) => !getComponent(id)?.parentComponentId,
    viewScale: resolvedViewScale,
    onCommit: (updates) => {
      const next: Record<string, { x: number; y: number }> = {};
      for (const u of updates) {
        if (u.id != null && typeof u.x === 'number' && typeof u.y === 'number') {
          next[u.id] = { x: u.x, y: u.y };
        }
      }
      setMovePreviewById(next);
      onComponentsUpdated(updates);
    },
    onTransientPositions: (items) => {
      setMovePreviewById(Object.fromEntries(items.map((i) => [i.id, { x: i.x, y: i.y }])));
    },
    onDragEnd: ({ didCommit }) => {
      if (!didCommit) setMovePreviewById({});
    },
    canDrag: (id) => !getComponent(id)?.locked,
  });

  useLayoutEffect(() => {
    setMovePreviewById((prev) => {
      const ids = Object.keys(prev);
      if (ids.length === 0) return prev;
      let next = { ...prev };
      let changed = false;
      for (const id of ids) {
        const pos = prev[id];
        const c = components.find((x) => x.id === id);
        if (!c || (c.x === pos.x && c.y === pos.y)) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [components]);

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
      components.map((c) => {
        const eff = effectiveLayout.get(c.id)!;
        const tl = worldTopLeftWithEffective(c, byId, effectiveLayout);
        return {
          id: c.id,
          x: tl.x,
          y: tl.y,
          width: eff.width,
          height: eff.height,
        };
      }),
    [byId, components, effectiveLayout],
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
    containerRef: canvasRootRef,
    viewScale: resolvedViewScale,
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

  const templateComponent = useMemo(() => components[0] ?? null, [components]);

  const openAddComponentPanelFromClient = useCallback(
    (clientX: number, clientY: number) => {
      const sidebarCollapsed = localStorage.getItem('qb.sidebarCollapsed') === 'true';
      const sidebarOffset = sidebarCollapsed ? 47 : 255;
      const adjX = clientX - sidebarOffset;
      const root = canvasRootRef.current;
      let add = root ? clientToCanvas(adjX, clientY, root, resolvedViewScale) : { x: 0, y: 0 };
      if (root) {
        add = clampTopLeftInRect(add.x, add.y, 1, 1, root.clientWidth, root.clientHeight);
      }
      const clearUpdates = updatesToClearSelection(components);
      if (clearUpdates.length) onComponentsUpdated(clearUpdates);
      setAddComponentPanel({ add });
    },
    [components, onComponentsUpdated, resolvedViewScale],
  );

  const onContextMenuSelect = useCallback(
    (option: EditorMenuOption, coordinates: Coordinates) => {
      if (!onSelectFromMenu) return;
      const root = canvasRootRef.current;
      const draft = injectDefaultComponent({
        type: option.nodeType,
        x: coordinates.x,
        y: coordinates.y,
      });
      if (!draft || !root) {
        onSelectFromMenu(option, coordinates);
        return;
      }
      const clamped = clampTopLeftInRect(
        coordinates.x,
        coordinates.y,
        draft.width ?? 0,
        draft.height ?? 0,
        root.clientWidth,
        root.clientHeight,
      );
      onSelectFromMenu(option, clamped);
    },
    [onSelectFromMenu],
  );

  const onItemPointerDown = useCallback(
    (e: React.PointerEvent, c: Component) => {
      if (e.button !== 0) return;
      const t = e.target as HTMLElement;
      if (t.closest('[data-native-resize-handle]')) return;

      const skipMoveStart = Boolean(t.closest('[data-no-canvas-drag], .nodrag'));
      // Rich inner controls: keep immediate selection so focus/clicks behave normally.
      if (skipMoveStart) {
        const updates = updatesForClickSelection(components, c.id, e);
        if (updates.length) onComponentsUpdated(updates);
        return;
      }

      const deferredSelectionOnTap = (ev: PointerEvent) => {
        const updates = updatesForClickSelection(componentsRef.current, c.id, ev);
        if (updates.length) onComponentsUpdated(updates);
      };

      if (c.locked) {
        beginMove(e, {
          id: c.id,
          x: movePreviewById[c.id]?.x ?? c.x,
          y: movePreviewById[c.id]?.y ?? c.y,
          deferredSelectionOnTap,
        });
        return;
      }

      const wasSelected = Boolean(c.selected);
      const hostGroupRoot = groupRootIfMember(c, byId);
      // Unselected child of a group: drag the whole group (move root only; children use parent-relative x/y).
      if (hostGroupRoot && !wasSelected && !hostGroupRoot.locked) {
        beginMove(e, {
          id: hostGroupRoot.id,
          x: movePreviewById[hostGroupRoot.id]?.x ?? hostGroupRoot.x,
          y: movePreviewById[hostGroupRoot.id]?.y ?? hostGroupRoot.y,
          deferredSelectionOnTap,
        });
      } else {
        const movableSelected = components.filter((x) => x.selected && !x.locked);
        const selectedIds = new Set(movableSelected.map((x) => x.id));
        const rootsOnly = movableSelected.filter(
          (x) => !x.parentComponentId || !selectedIds.has(x.parentComponentId),
        );
        const followers =
          c.selected && rootsOnly.length > 1
            ? rootsOnly
                .filter((x) => x.id !== c.id)
                .map((x) => ({
                  id: x.id,
                  x: movePreviewById[x.id]?.x ?? x.x,
                  y: movePreviewById[x.id]?.y ?? x.y,
                }))
            : undefined;
        beginMove(e, {
          id: c.id,
          x: movePreviewById[c.id]?.x ?? c.x,
          y: movePreviewById[c.id]?.y ?? c.y,
          followers,
          deferredSelectionOnTap,
        });
      }
    },
    [beginMove, byId, components, movePreviewById, onComponentsUpdated],
  );

  useKeyListeners({
    onKeyDown: (e) => {
      const ae = document.activeElement;

      if ((e.meta || e.control) && e.key.toLowerCase() === 'g' && !e.shift) {
        if (isEditableKeyboardTarget(ae)) return;
        if (!canGroupSelected) return;
        e.preventDefault?.();
        groupSelectedComponents();
        return;
      }

      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      if (isEditableKeyboardTarget(ae)) return;

      const ids = components.filter((c) => c.selected && !c.locked).map((c) => c.id);
      if (ids.length) {
        e.preventDefault?.();
        onComponentsDeleted(expandDeleteIds(components, ids));
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

  const canvasLayoutValue = useMemo(
    () => ({ byId, effectiveLayout, onItemPointerDown }),
    [byId, effectiveLayout, onItemPointerDown],
  );

  return (
    <EditorCanvasChromeProvider value={chromeValue}>
      <section
        id='base-editor'
        className='relative flex h-full min-h-0 w-full min-w-0 flex-1 overflow-auto'
        onContextMenu={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            return false;
          }
          if (!renderContextMenu) return;
          e.preventDefault();
          openAddComponentPanelFromClient(e.clientX, e.clientY);
          return false;
        }}
        onTouchStart={(e) => {
          if (!renderContextMenu || e.touches.length !== 1) return;
          const touch = e.touches[0];
          touchPositionRef.current = { x: touch.clientX, y: touch.clientY };
          longPressTimeoutRef.current = setTimeout(() => {
            const pos = touchPositionRef.current;
            if (pos) openAddComponentPanelFromClient(pos.x, pos.y);
            clearLongPress();
          }, LONG_PRESS_MS);
        }}
        onTouchEnd={clearLongPress}
        onTouchCancel={clearLongPress}>
        <div
          ref={canvasRootRef}
          className='relative min-h-full min-w-full'
          style={{
            transform: `scale(${resolvedViewScale})`,
            transformOrigin: '0 0',
            width: `${100 / resolvedViewScale}%`,
            height: `${100 / resolvedViewScale}%`,
          }}>
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
            {useGrid && <CanvasGridBackground gridSize={resolvedGridSize} style={{ opacity }} />}
          </div>

          <div
            role='presentation'
            className='absolute inset-0 z-[1] touch-none'
            style={{ touchAction: 'none' }}
            {...marqueeHandlers}
          />

          <SheetCanvasLayoutContext.Provider value={canvasLayoutValue}>
            <div
              className='pointer-events-none absolute inset-0 z-[2]'
              style={{ touchAction: 'manipulation' }}>
              {sorted.map((c) => {
                if (isFlexHostedChild(c, byId)) return null;
                const Edit = sheetNodeTypes[c.type as ComponentTypes] as ComponentType | undefined;
                if (!Edit) return null;
                const eff = effectiveLayout.get(c.id)!;
                const world = worldTopLeftWithEffective(c, byId, effectiveLayout);
                const layout = {
                  left: world.x,
                  top: world.y,
                  width: eff.width,
                  height: eff.height,
                };
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
                    {compositeTemplateRootIds.has(c.id) ? (
                      <span
                        role='img'
                        aria-label='Composite template root'
                        title='Composite or variant template'
                        className='pointer-events-none absolute top-[-25px] left-0 z-[50] flex h-6 w-6 -translate-x-1/4 -translate-y-1/4 items-center justify-center rounded-md border border-border bg-background/95 text-muted-foreground shadow-sm'>
                        <CompositeTemplateIcon className='size-3.5' strokeWidth={2} aria-hidden />
                      </span>
                    ) : null}
                    <EditorItemLayoutProvider
                      value={{ width: layout.width, height: layout.height }}>
                      <EditorItemIdProvider id={c.id}>
                        <Edit />
                      </EditorItemIdProvider>
                    </EditorItemLayoutProvider>
                  </div>
                );
              })}
            </div>
          </SheetCanvasLayoutContext.Provider>

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
        </div>
        {renderContextMenu && (
          <AddComponentPanel
            open={addComponentPanel != null}
            onOpenChange={(open) => {
              if (!open) setAddComponentPanel(null);
            }}
            options={menuOptions ?? []}
            placement={addComponentPanel?.add ?? { x: 0, y: 0 }}
            onPick={onContextMenuSelect}
            templateComponent={templateComponent}
          />
        )}
      </section>
    </EditorCanvasChromeProvider>
  );
}
