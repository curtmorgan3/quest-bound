import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSidebar } from '@/components/ui/sidebar';
import { useComponents, useRulesets, type ComponentUpdate } from '@/lib/compass-api';
import { repairOrphanCharacterWindowsForRulesetWindows } from '@/lib/compass-api/utils/default-archetype-test-character';
import { SheetEditor } from '@/lib/compass-planes';
import { DEFAULT_GRID_SIZE } from '@/lib/compass-planes/editor-config';
import { CharacterPage, GameLog } from '@/pages/characters';
import { colorPrimary, colorWhite } from '@/palette';
import { db, WindowEditorProvider } from '@/stores';
import type { Component } from '@/types';
import { debugLog } from '@/utils';
import { Eye, Magnet, ScanSearch, ZoomIn, ZoomOut } from 'lucide-react';
import {
  canGroupSelection,
  canUngroupSelection,
  planGroupSelection,
  planUngroupSelection,
} from '@/lib/compass-planes/sheet-editor/group-operations';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ComponentEditPanel } from './component-edit-panel';

const { log } = debugLog('pages', 'editor');

const WINDOW_EDITOR_GRID_STORAGE_KEY = 'qb.windowEditor.gridSize';
const WINDOW_EDITOR_SNAP_STORAGE_KEY = 'qb.windowEditor.snapToGrid';
const WINDOW_EDITOR_GRID_MIN = 4;
const WINDOW_EDITOR_GRID_MAX = 200;
const CANVAS_VIEW_ZOOM_STEP = 1.12;

/** Cmd on Apple platforms, Ctrl elsewhere (Windows / Linux). */
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

export const WindowEditor = () => {
  const { windowId } = useParams();
  const { open } = useSidebar();
  const {
    components,
    createComponent,
    createComponents,
    updateComponents,
    updateComponent,
    deleteComponent,
    replaceComponents,
  } = useComponents(windowId);

  const { testCharacter, activeRuleset } = useRulesets();

  const [viewMode, setViewMode] = useState<boolean>(false);
  const [editorGridSize, setEditorGridSize] = useState(readStoredWindowEditorGrid);
  const [snapToGrid, setSnapToGrid] = useState(readStoredSnapToGrid);
  const [canvasViewScale, setCanvasViewScale] = useState(1);
  const getComponent = (id: string) => components.find((c) => c.id === id) ?? null;

  const persistEditorGridSize = (n: number) => {
    const clamped = Math.min(
      WINDOW_EDITOR_GRID_MAX,
      Math.max(WINDOW_EDITOR_GRID_MIN, Math.round(n)),
    );
    setEditorGridSize(clamped);
    try {
      localStorage.setItem(WINDOW_EDITOR_GRID_STORAGE_KEY, String(clamped));
    } catch {
      /* ignore quota / private mode */
    }
  };

  const persistSnapToGrid = (next: boolean) => {
    setSnapToGrid(next);
    try {
      localStorage.setItem(WINDOW_EDITOR_SNAP_STORAGE_KEY, String(next));
    } catch {
      /* ignore quota / private mode */
    }
  };

  const onComponentsUpdated = (updates: Array<ComponentUpdate>) => {
    log('components updated: ', updates);
    updateComponents(updates);
  };

  const onComponentsCreated = (components: Array<Partial<Component>>) => {
    log('components created', components);
    for (const comp of components) {
      createComponent({
        ...comp,
        windowId,
      });
    }
  };

  const onComponentsDeleted = (ids: Array<string>) => {
    log('components deleted', ids);
    for (const id of ids) {
      deleteComponent(id);
    }
  };

  const onComponentsRestored = (restored: Component[]) => {
    log('components restored (undo/redo)', restored.length);
    replaceComponents(restored);
  };

  const canGroupSelected = useMemo(() => canGroupSelection(components), [components]);
  const canUngroupSelected = useMemo(() => canUngroupSelection(components), [components]);

  const groupSelectedComponents = useCallback(() => {
    if (!windowId || !activeRuleset?.id) return;
    const plan = planGroupSelection(components, activeRuleset.id, windowId);
    if (!plan) return;
    void (async () => {
      await createComponents(plan.toCreate);
      await updateComponents(plan.toUpdate);
      for (const id of plan.toDelete) {
        await deleteComponent(id);
      }
    })();
  }, [activeRuleset?.id, components, createComponents, deleteComponent, updateComponents, windowId]);

  const ungroupSelectedComponents = useCallback(() => {
    const plan = planUngroupSelection(components);
    if (!plan) return;
    void (async () => {
      await updateComponents(plan.toUpdate);
      for (const id of plan.toDelete) {
        await deleteComponent(id);
      }
    })();
  }, [components, deleteComponent, updateComponents]);

  const stackLeftPx = open ? 265 : 65;

  const zoomCanvasIn = useCallback(() => {
    setCanvasViewScale((s) => Math.min(3, Math.round(s * CANVAS_VIEW_ZOOM_STEP * 1000) / 1000));
  }, []);

  const zoomCanvasOut = useCallback(() => {
    setCanvasViewScale((s) =>
      Math.max(0.25, Math.round((s / CANVAS_VIEW_ZOOM_STEP) * 1000) / 1000),
    );
  }, []);

  useEffect(() => {
    if (!windowId || viewMode) return;

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
  }, [windowId, viewMode, zoomCanvasIn, zoomCanvasOut]);

  useEffect(() => {
    if (!windowId) return;
    let cancelled = false;
    void (async () => {
      const rulesetWindow = await db.windows.get(windowId);
      if (!rulesetWindow || cancelled) return;
      await repairOrphanCharacterWindowsForRulesetWindows(rulesetWindow.rulesetId, [windowId]);
    })();
    return () => {
      cancelled = true;
    };
  }, [windowId]);

  if (!windowId) return null;

  return (
    <WindowEditorProvider
      value={{
        viewMode,
        components,
        getComponent,
        updateComponent,
        updateComponents,
        groupSelectedComponents,
        ungroupSelectedComponents,
        canGroupSelected,
        canUngroupSelected,
      }}>
      <div className='relative flex h-full min-h-0 w-full flex-col overflow-hidden'>
        <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
          {viewMode ? (
            <CharacterPage id={testCharacter?.id} editorWindowId={windowId} hideGameLog />
          ) : (
            <SheetEditor
              components={components}
              onComponentsCreated={onComponentsCreated}
              onComponentsDeleted={onComponentsDeleted}
              onComponentsRestored={onComponentsRestored}
              onComponentsUpdated={onComponentsUpdated}
              useGrid={snapToGrid}
              gridSize={editorGridSize}
              viewScale={canvasViewScale}
            />
          )}
        </div>
        <div
          className='fixed bottom-4 z-[60] flex flex-row flex-wrap items-end gap-2'
          style={{ left: stackLeftPx }}>
          {viewMode && testCharacter?.id ? (
            <GameLog
              characterId={testCharacter.id}
              docked
              className='text-white hover:bg-white/15 hover:text-white'
            />
          ) : null}
          {!viewMode ? (
            <div className='flex flex-row flex-wrap items-center gap-2'>
              <Input
                id='window-editor-grid'
                type='number'
                min={WINDOW_EDITOR_GRID_MIN}
                max={WINDOW_EDITOR_GRID_MAX}
                step={1}
                value={editorGridSize}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!Number.isFinite(n)) return;
                  persistEditorGridSize(n);
                }}
                className='h-8 w-12 border-white/25 bg-black/50 px-1 text-center text-xs text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
                aria-label='Editor grid size in pixels'
              />
              <Button
                type='button'
                variant='ghost'
                size='icon'
                aria-pressed={snapToGrid}
                aria-label={
                  snapToGrid ? 'Turn snap to grid off' : 'Turn snap to grid on'
                }
                className='size-8 shrink-0 text-white hover:bg-white/15 hover:text-white'
                style={{
                  opacity: snapToGrid ? 1 : 0.45,
                }}
                onClick={() => persistSnapToGrid(!snapToGrid)}>
                <Magnet className='size-4' strokeWidth={2} aria-hidden />
              </Button>
              <div className='flex flex-row items-center gap-0.5'>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  aria-label='Zoom editor canvas in'
                  className='size-8 shrink-0 text-white hover:bg-white/15 hover:text-white'
                  onClick={zoomCanvasIn}>
                  <ZoomIn className='size-4' strokeWidth={2} aria-hidden />
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  aria-label='Zoom editor canvas out'
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
                <Button
                  type='button'
                  variant='ghost'
                  size='icon'
                  aria-pressed={viewMode}
                  aria-label={viewMode ? 'Return to window editor' : 'Preview with test character'}
                  className='size-10 shrink-0 shadow-none hover:bg-white/15'
                  style={{
                    color: viewMode ? colorPrimary : colorWhite,
                  }}
                  onClick={() => setViewMode((prev) => !prev)}>
                  <Eye className='size-4' strokeWidth={2} aria-hidden />
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type='button'
              variant='ghost'
              size='icon'
              aria-pressed={viewMode}
              aria-label={viewMode ? 'Return to window editor' : 'Preview with test character'}
              className='size-10 shrink-0 shadow-none hover:bg-white/15'
              style={{
                color: viewMode ? colorPrimary : colorWhite,
              }}
              onClick={() => setViewMode((prev) => !prev)}>
              <Eye className='size-4' strokeWidth={2} aria-hidden />
            </Button>
          )}
        </div>
        <ComponentEditPanel viewMode={viewMode} />
      </div>
    </WindowEditorProvider>
  );
};
