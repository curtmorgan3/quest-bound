import type { ComponentUpdate } from '@/lib/compass-api';
import { WindowEditorContext } from '@/stores';
import type { Component, Coordinates } from '@/types';
import { type Node } from '@xyflow/react';
import { useContext, useEffect, useRef, useState } from 'react';
import { BaseEditor } from '../base-editor';
import { sheetNodeTypes, type EditorMenuOption } from '../nodes';
import { convertComponentsToNodes, useHandleNodeChange } from '../utils';
import { contextOptions } from './sheet-context-options';

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
  const { getComponent } = useContext(WindowEditorContext);
  const [nodes, setNodes] = useState<Node[]>(convertComponentsToNodes(components));

  useEffect(() => {
    if (!nodes.length || components.length !== componentLengthRef.current) {
      setNodes(convertComponentsToNodes(components));
      componentLengthRef.current = components.length;
    }
  }, [components]);

  const onNodeChange = useHandleNodeChange({
    setNodes,
    getComponent,
    onDeleteNodes: onComponentsDeleted,
    onChange: onComponentsUpdated,
  });

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
      onNodesChange={onNodeChange}
      menuOptions={contextOptions}
      onSelectFromMenu={handleContextMenuSelection}
      nodeTypes={sheetNodeTypes}
    />
  );
};
