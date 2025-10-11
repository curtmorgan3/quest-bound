import { useComponents } from '@/lib/compass-api';
import { destroyEditor, initializeEditor } from '@/lib/compass-planes';
import type { Component } from '@/types';
import { debugLog } from '@/utils';
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

const { log } = debugLog('pages', 'editor');

export const CompositeEditor = () => {
  const { compositeId } = useParams();
  const { components, createComponent, updateComponents } = useComponents(compositeId);

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

  useEffect(() => {
    if (editorState.size !== components.length) return;
    initializeEditor({
      elementId: 'qb-editor',
      state: editorState,
      onComponentsUpdated,
      onComponentsCreated,
    });
  }, [editorState.size, components.length]);

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
