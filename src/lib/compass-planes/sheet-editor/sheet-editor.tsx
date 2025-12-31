import type { ComponentUpdate } from '@/lib/compass-api';
import { WindowEditorContext } from '@/stores';
import type { Component, Coordinates } from '@/types';
import { type Node } from '@xyflow/react';
import { useContext, useState } from 'react';
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

interface SheetEditorProps {
  components: Component[];
  onComponentsUpdated: (updates: Array<ComponentUpdate>) => void;
  onComponentsCreated: (updates: Array<Partial<Component>>) => void;
  onComponentsDeleted: (ids: Array<string>) => void;
}

export const SheetEditor = ({
  components,
  onComponentsCreated,
  onComponentsUpdated,
  onComponentsDeleted,
}: SheetEditorProps) => {
  const { getComponent } = useContext(WindowEditorContext);
  const [nodes, setNodes] = useState<Node[]>(convertComponentsToNodes(components));

  const { onComponentsChangedExternally } = useSyncNodes({
    components,
    nodes,
    setNodes,
  });

  useSubscribeExteriorComponentChanges(onComponentsChangedExternally);

  const onNodeChange = useHandleNodeChange({
    setNodes,
    getComponent,
    onDeleteNodes: onComponentsDeleted,
    onChange: onComponentsUpdated,
  });

  useKeyboardControls({
    components,
    onComponentsCreated,
    onComponentsDeleted,
    onComponentsUpdated,
  });

  const handleContextMenuSelection = (selection: EditorMenuOption, coordinates: Coordinates) => {
    onComponentsCreated([
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
