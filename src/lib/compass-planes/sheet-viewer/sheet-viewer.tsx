import { useCharacterWindows, type CharacterWindowUpdate } from '@/lib/compass-api';
import type { CharacterWindow } from '@/types';
import type { Node, NodeChange } from '@xyflow/react';
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

  const windowsOpenedByDefault = useRef<boolean>(false);

  // State for which windows are open (not minimized)
  const [openWindows, setOpenWindows] = useState<Set<string>>(new Set());

  const toggleWindow = (windowId: string) => {
    setOpenWindows((prev) => {
      const next = new Set(prev);
      if (next.has(windowId)) {
        next.delete(windowId);
      } else {
        next.add(windowId);
      }
      return next;
    });
  };

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
            onWindowUpdated?.({ id, isCollapsed: !openWindows.has(id) });
            toggleWindow(id);
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
    setNodes(convertWindowsToNode(characterWindows.filter((w) => openWindows.has(w.id))));

    if (testMode && characterWindows.length > 0 && !windowsOpenedByDefault.current) {
      // Open all windows by default by default
      setOpenWindows(new Set(characterWindows.map((w) => w.id)));
      windowsOpenedByDefault.current = true;
    }
  }, [openWindows, testMode, characterWindows.length]);

  const onNodesChange = (changes: NodeChange[]) => {
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
          toggleWindow={toggleWindow}
          openWindows={openWindows}
        />
      )}
    </div>
  );
};
