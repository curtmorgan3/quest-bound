import type { ComponentUpdate } from '@/lib/compass-api';
import { WindowEditorContext } from '@/stores';
import type { Component, Coordinates } from '@/types';
import { type Node } from '@xyflow/react';
import { useCallback, useContext, useRef, useState } from 'react';
import { BaseEditor } from '../base-editor';
import { sheetNodeTypes, type EditorMenuOption } from '../nodes';
import {
  convertComponentsToNodes,
  useHandleNodeChange,
  useSubscribeExteriorComponentChanges,
} from '../utils';
import { injectDefaultComponent } from '../utils/inject-defaults';
import { contextOptions } from './sheet-context-options';
import { useKeyboardControls } from './use-keyboard-controls';
import { useSyncNodes } from './use-sync-nodes';
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
  const { getComponent } = useContext(WindowEditorContext);
  const [nodes, setNodes] = useState<Node[]>(convertComponentsToNodes(components));

  const shouldRestoreFromSnapshot = useRef<boolean>(false);

  const { pushUndoSnapshot, undo, redo } = useUndoRedo({
    components,
    onComponentsRestored: (snapshot: Component[]) => {
      shouldRestoreFromSnapshot.current = true;
      onComponentsRestored?.(snapshot);
    },
  });

  const wrappedOnComponentsUpdated = useCallback(
    (updates: Array<ComponentUpdate>) => {
      shouldRestoreFromSnapshot.current = false;
      pushUndoSnapshot();
      onComponentsUpdated(updates);
    },
    [pushUndoSnapshot, onComponentsUpdated],
  );

  const wrappedOnComponentsCreated = useCallback(
    (updates: Array<Partial<Component>>) => {
      shouldRestoreFromSnapshot.current = false;
      pushUndoSnapshot();
      onComponentsCreated(updates);
    },
    [pushUndoSnapshot, onComponentsCreated],
  );

  const wrappedOnComponentsDeleted = useCallback(
    (ids: Array<string>) => {
      shouldRestoreFromSnapshot.current = false;
      pushUndoSnapshot();
      onComponentsDeleted(ids);
    },
    [pushUndoSnapshot, onComponentsDeleted],
  );

  const { onComponentsChangedExternally } = useSyncNodes({
    components,
    nodes,
    setNodes,
    shouldRecreateNodes: shouldRestoreFromSnapshot.current,
  });

  useSubscribeExteriorComponentChanges(onComponentsChangedExternally);

  const onNodeChange = useHandleNodeChange({
    setNodes,
    getComponent,
    onDeleteNodes: wrappedOnComponentsDeleted,
    onChange: wrappedOnComponentsUpdated,
  });

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
    <BaseEditor
      nodes={nodes}
      onNodesChange={onNodeChange}
      menuOptions={contextOptions}
      onSelectFromMenu={handleContextMenuSelection}
      nodeTypes={sheetNodeTypes}
    />
  );
};
