import type { ComponentUpdate } from '@/lib/compass-api';
import type { Component, Coordinates } from '@/types';
import {
  applyNodeChanges,
  type Node,
  type NodeChange,
  type NodePositionChange,
} from '@xyflow/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BaseEditor } from '../base-editor';
import { contextOptions, sheetNodeTypes, type EditorMenuOption } from '../nodes/node-types';
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
  onComponentsUpdated,
  onComponentsDeleted,
}: SheetEditorProps) => {
  const componentLengthRef = useRef<number>(0);
  const [nodes, setNodes] = useState<Node[]>(convertComponentsToNodes(components));

  useEffect(() => {
    if (!nodes.length || components.length !== componentLengthRef.current) {
      setNodes(convertComponentsToNodes(components));
      componentLengthRef.current = components.length;
    }
  }, [components]);

  const onNodesChange = useCallback((changes: NodeChange<any>[]) => {
    setNodes((nodesSnapshot) => applyNodeChanges(changes, nodesSnapshot));
    if (!changes[0] || !(changes[0] as NodePositionChange).position) {
      console.log('Non position change: ', changes[0]);
      return;
    }

    onComponentsUpdated(
      changes.map((change) => ({
        id: (change as NodePositionChange).id ?? 'missing-id',
        x: (change as NodePositionChange).position?.x,
        y: (change as NodePositionChange).position?.y,
      })),
    );
  }, []);

  const handleContextMenuSelection = (selection: EditorMenuOption, coordinates: Coordinates) => {
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
      nodeTypes={sheetNodeTypes}
    />
  );
};
