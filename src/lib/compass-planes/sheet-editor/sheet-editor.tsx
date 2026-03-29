import type { ComponentUpdate } from '@/lib/compass-api';
import type { Component, Coordinates } from '@/types';
import { useCallback } from 'react';
import type { EditorMenuOption } from '../nodes';
import { injectDefaultComponent } from '../utils/inject-defaults';
import { contextOptions } from './sheet-context-options';
import { SheetCanvasEditor } from './sheet-canvas-editor';
import { useKeyboardControls } from './use-keyboard-controls';
import { useUndoRedo } from './use-undo-redo';

interface SheetEditorProps {
  components: Component[];
  onComponentsUpdated: (updates: Array<ComponentUpdate>) => void;
  onComponentsCreated: (updates: Array<Partial<Component>>) => void;
  onComponentsDeleted: (ids: Array<string>) => void;
  onComponentsRestored?: (components: Component[]) => void;
}

export const SheetEditor = ({
  components,
  onComponentsCreated,
  onComponentsUpdated,
  onComponentsDeleted,
  onComponentsRestored,
}: SheetEditorProps) => {
  const { pushUndoSnapshot, undo, redo } = useUndoRedo({
    components,
    onComponentsRestored: (snapshot: Component[]) => {
      onComponentsRestored?.(snapshot);
    },
  });

  const wrappedOnComponentsUpdated = useCallback(
    (updates: Array<ComponentUpdate>) => {
      pushUndoSnapshot();
      onComponentsUpdated(updates);
    },
    [pushUndoSnapshot, onComponentsUpdated],
  );

  const wrappedOnComponentsCreated = useCallback(
    (updates: Array<Partial<Component>>) => {
      pushUndoSnapshot();
      onComponentsCreated(updates);
    },
    [pushUndoSnapshot, onComponentsCreated],
  );

  const wrappedOnComponentsDeleted = useCallback(
    (ids: Array<string>) => {
      pushUndoSnapshot();
      onComponentsDeleted(ids);
    },
    [pushUndoSnapshot, onComponentsDeleted],
  );

  useKeyboardControls({
    components,
    onComponentsCreated: wrappedOnComponentsCreated,
    onComponentsDeleted: wrappedOnComponentsDeleted,
    onComponentsUpdated: wrappedOnComponentsUpdated,
    undo,
    redo,
  });

  const handleContextMenuSelection = (selection: EditorMenuOption, coordinates: Coordinates) => {
    wrappedOnComponentsCreated([
      {
        ...injectDefaultComponent({
          type: selection.nodeType,
          x: coordinates.x,
          y: coordinates.y,
        }),
      },
    ]);
  };

  return (
    <div className='flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden'>
      <SheetCanvasEditor
        components={components}
        menuOptions={contextOptions}
        onSelectFromMenu={handleContextMenuSelection}
        onComponentsDeleted={wrappedOnComponentsDeleted}
        onComponentsUpdated={wrappedOnComponentsUpdated}
      />
    </div>
  );
};
