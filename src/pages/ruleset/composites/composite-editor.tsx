import { useComponents } from '@/lib/compass-api';
import { destroyEditor, initializeEditor } from '@/lib/compass-planes';
import type { Component } from '@/types';
import { debugLog } from '@/utils';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

const { log } = debugLog('pages', 'editor');

export const CompositeEditor = () => {
  const { compositeId } = useParams();
  const { components, createComponent, updateComponents, deleteComponent } =
    useComponents(compositeId);

  const selectedComponents = components.filter((c) => c.selected);
  console.log(selectedComponents);

  const editorState = new Map<string, Component>();
  for (const comp of components) {
    editorState.set(comp.id, comp);
  }

  const onComponentsUpdated = (updates: Array<Component>) => {
    log('components updated: ', updates);
    updateComponents(updates);
  };

  const onComponentsCreated = (components: Array<Component>) => {
    log('components created', components);
    for (const comp of components) {
      createComponent({
        ...comp,
        compositeId,
      });
    }
  };

  const onComponentsDeleted = (ids: Array<string>) => {
    log('components deleted', ids);
    for (const id of ids) {
      deleteComponent(id);
    }
  };

  // Wait for initialization of editorState to complete
  if (document.getElementById('qb-editor') && editorState.size === components.length) {
    initializeEditor({
      elementId: 'qb-editor',
      state: editorState,
      onComponentsUpdated,
      onComponentsCreated,
      onComponentsDeleted,
    });
  }

  useEffect(() => {
    return () => destroyEditor();
  }, []);

  if (!compositeId) return null;

  return (
    <div className='flex flex-col' style={{ overflow: 'hidden' }}>
      <div id='qb-editor' className='flex-grow-1 ' />
    </div>
  );
};
