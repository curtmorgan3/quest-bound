import { useCharacterWindows, type CharacterWindowUpdate } from '@/lib/compass-api';
import type { CharacterWindow } from '@/types';
import type { Node, NodeChange, NodePositionChange } from '@xyflow/react';
import { applyNodeChanges } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useRef, useState } from 'react';
import { BaseEditor } from '../base-editor';
import { WindowNode } from './window-node';
import { WindowsTabs } from './windows-tabs';

const windowNodeTypes = {
  window: WindowNode,
};

interface SheetViewerProps {
  characterId?: string;
  windowIds?: string[];
  testMode?: boolean;
  onWindowUpdated?: (update: CharacterWindowUpdate) => void;
  onWindowDeleted?: (id: string) => void;
}

export const SheetViewer = ({
  characterId,
  onWindowUpdated,
  onWindowDeleted,
  testMode,
}: SheetViewerProps) => {
  const { windows: characterWindows } = useCharacterWindows(characterId);
  const openWindows = new Set(characterWindows.filter((cw) => !cw.isCollapsed).map((cw) => cw.id));
  const [locked, setLocked] = useState<boolean>(false);

  function convertWindowsToNode(windows: CharacterWindow[]): Node[] {
    return windows.map((window, index) => {
      const position = { x: window.x, y: window.y };

      return {
        id: `window-${window.id}`,
        type: 'window',
        position,
        draggable: !locked,
        selectable: false,
        zIndex: index, // Render the lastest one open on top
        data: {
          locked,
          characterWindow: window,
          onMinimize: (id: string) => {
            onWindowUpdated?.({ id, isCollapsed: true });
          },
          onClose: (id: string) => {
            onWindowDeleted?.(id);
          },
          renderCloseButton: !testMode,
        },
      };
    });
  }

  const [nodes, setNodes] = useState<Node[]>(convertWindowsToNode(characterWindows));
  const positionUpdateTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    setNodes(convertWindowsToNode(characterWindows.filter((w) => !w.isCollapsed)));
  }, [characterWindows, locked]);

  const onNodesChange = (changes: NodeChange[]) => {
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        const positionChange = change as NodePositionChange;
        const windowId = positionChange.id.replace('window-', '');
        const { x, y } = positionChange.position!;

        // Clear existing timeout for this window
        const existingTimeout = positionUpdateTimeouts.current.get(windowId);
        if (existingTimeout) {
          clearTimeout(existingTimeout);
        }

        // Debounce the update call
        const timeout = setTimeout(() => {
          onWindowUpdated?.({ id: windowId, x, y });
          positionUpdateTimeouts.current.delete(windowId);
        }, 150);

        positionUpdateTimeouts.current.set(windowId, timeout);
      }
    }

    setNodes((prev) => applyNodeChanges(changes, prev));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <BaseEditor
        nodes={nodes}
        onNodesChange={onNodesChange}
        nodeTypes={windowNodeTypes}
        useGrid={false}
        nodesConnectable={false}
        selectNodesOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={false}
        nodesDraggable={!locked}
      />
      {!testMode && (
        <WindowsTabs
          characterId={characterId}
          windows={characterWindows}
          openWindows={openWindows}
          toggleWindow={(id: string) => onWindowUpdated?.({ id, isCollapsed: openWindows.has(id) })}
          locked={locked}
          onToggleLock={() => setLocked((prev) => !prev)}
        />
      )}
    </div>
  );
};
