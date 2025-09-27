import { initializeEditor, type EditorComponent, type EditorState } from '@/lib/compass-planes';
import { useEffect, useState } from 'react';

const comp: EditorComponent = {
  id: '1',
  type: 'shape',
  position: { x: 100, y: 100, z: 1, rotation: 0 },
  size: { height: 50, width: 50 },
  style: {},
};

export const Editor = () => {
  const [editorState, setEditorState] = useState<EditorState>({
    '1': comp,
  });

  useEffect(() => {
    initializeEditor({ elementId: 'qb-editor', state: editorState });
  }, [JSON.stringify(editorState)]);

  useEffect(() => {
    // return () => destroyEditor();
  }, []);

  const handleMove = () => {
    const newState = { ...editorState };
    newState['1'] = {
      ...newState['1'],
      position: {
        ...newState['1'].position,
        x: newState['1'].position.x + 10,
        y: newState['1'].position.y + 10,
      },
    };
    setEditorState(newState);
  };

  return (
    <div className='flex flex-col'>
      <div className='h-[10vh] w-[100%]'>
        <button onClick={handleMove}>{`->`}</button>
      </div>
      <div id='qb-editor' className='w-[100%] h-[90vh]'></div>
    </div>
  );
};
