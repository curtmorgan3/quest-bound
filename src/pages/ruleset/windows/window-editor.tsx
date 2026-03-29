import { useSidebar } from '@/components/ui/sidebar';
import { useComponents, useRulesets, type ComponentUpdate } from '@/lib/compass-api';
import { repairOrphanCharacterWindowsForRulesetWindows } from '@/lib/compass-api/utils/default-archetype-test-character';
import { SheetEditor } from '@/lib/compass-planes';
import { CharacterPage } from '@/pages/characters';
import { colorPrimary, colorWhite } from '@/palette';
import { db, WindowEditorProvider } from '@/stores';
import type { Component } from '@/types';
import { debugLog } from '@/utils';
import { Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ComponentEditPanel } from './component-edit-panel';

const { log } = debugLog('pages', 'editor');

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
  const getComponent = (id: string) => components.find((c) => c.id === id) ?? null;

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

  const eyeLeft = open ? 265 : 65;

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
            <CharacterPage id={testCharacter?.id} editorWindowId={windowId} />
          ) : (
            <SheetEditor
              components={components}
              onComponentsCreated={onComponentsCreated}
              onComponentsDeleted={onComponentsDeleted}
              onComponentsRestored={onComponentsRestored}
              onComponentsUpdated={onComponentsUpdated}
            />
          )}
        </div>
        <Eye
          className='clickable'
          onClick={() => setViewMode((prev) => !prev)}
          style={{
            position: 'absolute',
            left: eyeLeft,
            bottom: 55,
            color: viewMode ? colorPrimary : colorWhite,
          }}
        />
        <ComponentEditPanel viewMode={viewMode} />
      </div>
    </WindowEditorProvider>
  );
};
