import type { ComponentUpdate } from '@/lib/compass-api';
import type { Component } from '@/types';
import type { Node } from '@xyflow/react';
import { applyNodeChanges } from '@xyflow/react';

interface UseMoveNodesProps {
  getComponent: (id: string) => Component | null;
  onDeleteNodes: (ids: string[]) => void;
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  onChange: (changes: Array<{ id: string & Partial<Component> }>) => void;
}

/**
 * Hooks into ReactFlow node change events and fires callbacks with a memoized map of changes.
 */
export const useHandleNodeChange = ({
  onChange,
  setNodes,
  onDeleteNodes,
  getComponent,
}: UseMoveNodesProps) => {
  const onNodesChange = (_changes: Array<any>) => {
    // Filter out locked components
    const changes = _changes.filter((change: any) => {
      const component = getComponent(change.id);

      if (component?.locked && change.type !== 'select') return false;
      return !!component;
    });

    // Delete removed nodes
    const toRemove = changes.filter((change: any) => change.type === 'remove');
    if (toRemove.length > 0) {
      onDeleteNodes(toRemove.map((change: any) => change.id));
    }

    // Update resized, selected or repositioned nodes
    const toUpdate = changes.filter(
      (change: any) =>
        change.type == 'position' || change.type === 'dimensions' || change.type === 'select',
    );

    if (changes.length > 0) {
      onChange(convertNodeChangesToComponentUpdates(toUpdate));
    }

    setNodes((nodes) => {
      return applyNodeChanges(changes, nodes);
    });
  };

  return onNodesChange;
};

function convertNodeChangesToComponentUpdates(changes: any[]): ComponentUpdate[] {
  return changes.map((change: any) => {
    const update: ComponentUpdate = { id: change.id };

    switch (change.type) {
      case 'position':
        update.y = change.position.y;
        update.x = change.position.x;
        break;
      case 'dimensions':
        update.height = change.dimensions.height;
        update.width = change.dimensions.width;
        break;
      case 'select':
        update.selected = change.selected;
        break;
      default:
        return update;
    }

    return update;
  });
}
