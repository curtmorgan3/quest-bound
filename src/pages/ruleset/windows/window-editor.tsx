import { useSidebar } from '@/components/ui/sidebar';
import { useComponents, useRulesets, type ComponentUpdate } from '@/lib/compass-api';
import { SheetEditor } from '@/lib/compass-planes';
import { CharacterPage } from '@/pages/characters';
import { colorPrimary, colorWhite } from '@/palette';
import { WindowEditorProvider } from '@/stores';
import type { Component } from '@/types';
import { debugLog } from '@/utils';
import { Eye } from 'lucide-react';
import { useState } from 'react';
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

  if (!windowId) return null;

  return (
    <WindowEditorProvider
      value={{ viewMode, components, getComponent, updateComponent, updateComponents }}>
      <div className='flex flex-col' style={{ overflow: 'hidden' }}>
        {viewMode ? (
          <CharacterPage id={testCharacter?.id} windowEditorMode />
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
    </WindowEditorProvider>
  );
};
