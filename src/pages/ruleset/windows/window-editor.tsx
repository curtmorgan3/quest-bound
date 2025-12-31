import { useComponents, type ComponentUpdate } from '@/lib/compass-api';
import { SheetEditor } from '@/lib/compass-planes/sheet-editor';
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
  const { components, createComponent, updateComponents, deleteComponent } =
    useComponents(windowId);

  const [viewMode, setViewMode] = useState<boolean>(false);
  const getComponent = (id: string) => components.find((c) => c.id === id) ?? null;

  const onComponentsUpdated = (updates: Array<ComponentUpdate>) => {
    log('components updated: ', updates);
    updateComponents(updates);
  };

  const onComponentsCreated = (components: Array<Partial<Component>>) => {
    console.log(components);
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

  if (!windowId) return null;

  return (
    <WindowEditorProvider value={{ components, getComponent, viewMode }}>
      <div className='flex flex-col' style={{ overflow: 'hidden' }}>
        <SheetEditor
          components={components}
          onComponentsCreated={onComponentsCreated}
          onComponentsDeleted={onComponentsDeleted}
          onComponentsUpdated={onComponentsUpdated}
        />
      </div>
      <Eye
        className='clickable'
        onClick={() => setViewMode((prev) => !prev)}
        style={{
          position: 'absolute',
          left: 65,
          bottom: 30,
          color: viewMode ? colorPrimary : colorWhite,
        }}
      />
      <ComponentEditPanel />
    </WindowEditorProvider>
  );
};
