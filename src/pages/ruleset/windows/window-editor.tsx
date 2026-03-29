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
import { Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ComponentEditPanel } from './component-edit-panel';

const { log } = debugLog('pages', 'editor');

const WINDOW_EDITOR_GRID_STORAGE_KEY = 'qb.windowEditor.gridSize';
const WINDOW_EDITOR_GRID_MIN = 4;
const WINDOW_EDITOR_GRID_MAX = 200;

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

export const WindowEditor = () => {
  const { windowId } = useParams();
  const { open } = useSidebar();
  const {
    components,
    createComponent,
    updateComponents,
    updateComponent,
    deleteComponent,
    replaceComponents,
  } = useComponents(windowId);

  const { testCharacter } = useRulesets();

  const [viewMode, setViewMode] = useState<boolean>(false);
  const [editorGridSize, setEditorGridSize] = useState(readStoredWindowEditorGrid);
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

  const stackLeftPx = open ? 265 : 65;

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
      value={{ viewMode, components, getComponent, updateComponent, updateComponents }}>
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
              gridSize={editorGridSize}
            />
          )}
        </div>
        <div className='fixed bottom-4 z-[60] flex flex-col gap-2' style={{ left: stackLeftPx }}>
          {viewMode && testCharacter?.id ? (
            <GameLog
              characterId={testCharacter.id}
              docked
              className='text-white hover:bg-white/15 hover:text-white'
            />
          ) : null}
          {!viewMode && (
            <div className='flex flex-col gap-0.5'>
              <label
                htmlFor='window-editor-grid'
                className='text-[10px] font-medium uppercase tracking-wide text-white/70'>
                Grid
              </label>
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
            </div>
          )}
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
        <ComponentEditPanel viewMode={viewMode} />
      </div>
    </WindowEditorProvider>
  );
};
