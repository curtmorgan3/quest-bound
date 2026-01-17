import { useCharacterWindows, type CharacterWindowUpdate } from '@/lib/compass-api';
import type { CharacterWindow } from '@/types';
import type { Node, NodeChange } from '@xyflow/react';
import { applyNodeChanges } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useState } from 'react';
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

  function convertWindowsToNode(windows: CharacterWindow[]): Node[] {
    return windows.map((window, index) => {
      const position = { x: window.x, y: window.y };

      return {
        id: `window-${window.id}`,
        type: 'window',
        position,
        draggable: true,
        selectable: false,
        zIndex: index, // Render the lastest one open on top
        data: {
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

  useEffect(() => {
    setNodes(convertWindowsToNode(characterWindows.filter((w) => !w.isCollapsed)));
  }, [characterWindows]);

  const onNodesChange = (changes: NodeChange[]) => {
    console.log(changes);
    // for each change, if change.type === 'position', debounce a call to onWindowUpdate with x and y props
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
      />
      {!testMode && (
        <WindowsTabs
          characterId={characterId}
          windows={characterWindows}
          openWindows={openWindows}
          toggleWindow={(id: string) => onWindowUpdated?.({ id, isCollapsed: openWindows.has(id) })}
        />
      )}
    </div>
  );
};
