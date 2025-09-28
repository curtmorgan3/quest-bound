import { initializeEditor, type EditorComponent } from '@/lib/compass-planes';
import { debugLog } from '@/utils';
import { useEffect } from 'react';

const { log } = debugLog('pages', 'editor');

const comp1: EditorComponent = {
  id: '1',
  type: 'shape',
  x: 100,
  y: 100,
  z: 1,
  rotation: 0,
  height: 80,
  width: 80,
  style: {},
};

const comp2: EditorComponent = {
  id: '2',
  type: 'shape',
  x: 200,
  y: 200,
  z: 1,
  rotation: 0,
  height: 80,
  width: 80,
  style: {},
};

export const Editor = () => {
  const editorState = new Map<string, EditorComponent>([
    ['1', comp1],
    ['2', comp2],
  ]);

  const onComponentsUpdated = (updates: Array<EditorComponent>) => {
    log('components updated: ', updates);
  };

  useEffect(() => {
    initializeEditor({ elementId: 'qb-editor', state: editorState, onComponentsUpdated });
  }, []);

  useEffect(() => {
    // return () => destroyEditor();
  }, []);

  return (
    <div className='flex flex-col'>
      <div id='qb-editor' className='flex-grow-1 ' />
    </div>
  );
};
