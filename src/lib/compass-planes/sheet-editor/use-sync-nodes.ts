import type { Component } from '@/types';
import type { Node } from '@xyflow/react';
import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import { convertComponentsToNodes, type ExternalComponentChangeCallback } from '../utils';

interface UseSyncNodes {
  nodes: Node[];
  setNodes: Dispatch<SetStateAction<Node[]>>;
  components: Component[];
  shouldRecreateNodes: boolean;
}

/**
 * Update Node state when components are created or when initial component array is hydrated.
 */
export const useSyncNodes = ({
  nodes,
  setNodes,
  components,
  shouldRecreateNodes,
}: UseSyncNodes) => {
  const componentLengthRef = useRef<number>(components.length);

  useEffect(() => {
    if (!nodes.length || shouldRecreateNodes) {
      setNodes(convertComponentsToNodes(components));
      componentLengthRef.current = components.length;
      return;
    }

    if (components.length !== componentLengthRef.current) {
      const existingNodeIds = new Set(nodes.map((node) => node.id));
      const newComponents = components.filter((component) => !existingNodeIds.has(component.id));

      if (newComponents.length > 0) {
        setNodes((prev) => [...prev, ...convertComponentsToNodes(newComponents)]);
      }

      componentLengthRef.current = components.length;
    }
  }, [components, nodes.length, shouldRecreateNodes, setNodes]);

  const onComponentsChangedExternally = (updateMap: ExternalComponentChangeCallback) => {
    setNodes((prev) =>
      prev.map((node) => {
        if (updateMap.has(node.id)) {
          const update = updateMap.get(node.id);
          if (!update) return node;

          const updatedNode: Node = {
            ...node,
            id: update.id,
            selected: update.selected ?? node.selected,
            zIndex: update.z ?? node.zIndex,
            position: {
              x: update.x ?? node.position.x,
              y: update.y ?? node.position.y,
            },
          };

          return {
            ...node,
            ...updatedNode,
          };
        }
        return node;
      }),
    );
  };

  return { onComponentsChangedExternally };
};
