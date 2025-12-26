import { useComponents, type ComponentUpdate } from '@/lib/compass-api';
import { SheetEditor } from '@/lib/compass-planes/sheet-editor';
import type { Component } from '@/types';
import { debugLog } from '@/utils';
import { useParams } from 'react-router-dom';
import { ComponentEditPanel } from './component-edit-panel';

const { log } = debugLog('pages', 'editor');

export const WindowEditor = () => {
  const { windowId } = useParams();
  const { components, createComponent, updateComponents, deleteComponent } =
    useComponents(windowId);

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

  if (!windowId) return null;

  return (
    <>
      <div className='flex flex-col' style={{ overflow: 'hidden' }}>
        <SheetEditor
          components={components}
          onComponentsCreated={onComponentsCreated}
          onComponentsDeleted={onComponentsDeleted}
          onComponentsUpdated={onComponentsUpdated}
        />
      </div>
      <ComponentEditPanel />
    </>
  );
};
