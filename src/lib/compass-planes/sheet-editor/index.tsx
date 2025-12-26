import type { ComponentUpdate } from '@/lib/compass-api';
import type { Component, Coordinates } from '@/types';
import { applyNodeChanges, type Node } from '@xyflow/react';
import { useCallback, useState } from 'react';
import { BaseEditor } from '../base-editor';
import { contextOptions, type EditorMenuOption } from '../nodes/node-types';
import { convertComponentsToNodes } from '../utils';

interface SheetEditorProps {
  components: Component[];
  onComponentsUpdated: (updates: Array<ComponentUpdate>) => void;
  onComponentsCreated: (updates: Array<Partial<Component>>) => void;
  onComponentsDeleted: (ids: Array<string>) => void;
}

export const SheetEditor = ({
  components,
  onComponentsCreated,
  onComponentsDeleted,
  onComponentsUpdated,
}: SheetEditorProps) => {
  const [nodes, setNodes] = useState<Node[]>(convertComponentsToNodes(components));

  console.log(nodes);

  const onNodesChange = useCallback(
    (changes: any) => {
      setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot));
      console.log(changes);
    },
    [setNodes],
  );

  const handleContextMenuSelection = (selection: EditorMenuOption, coordinates: Coordinates) => {
    console.log(selection, coordinates);
    onComponentsCreated([
      {
        type: selection.nodeType,
        x: coordinates.x,
        y: coordinates.y,
      },
    ]);
  };

  return (
    <BaseEditor
      nodes={nodes}
      onNodesChange={onNodesChange}
      menuOptions={contextOptions}
      onSelectFromMenu={handleContextMenuSelection}
    />
  );
};
