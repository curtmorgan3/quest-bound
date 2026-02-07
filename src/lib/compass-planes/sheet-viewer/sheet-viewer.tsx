import {
  useCharacterPages,
  useCharacterWindows,
  type CharacterWindowUpdate,
} from '@/lib/compass-api';
import type { CharacterWindow } from '@/types';
import type { Node, NodeChange, NodePositionChange } from '@xyflow/react';
import { applyNodeChanges } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BaseEditor } from '../base-editor';
import { WindowNode } from './window-node';
import { WindowsTabs } from './windows-tabs';

const windowNodeTypes = {
  window: WindowNode,
};

interface SheetViewerProps {
  characterId?: string;
  onWindowUpdated?: (update: CharacterWindowUpdate) => void;
  onWindowDeleted?: (id: string) => void;
  lockByDefault?: boolean;
}

export const SheetViewer = ({
  characterId,
  onWindowUpdated,
  onWindowDeleted,
  lockByDefault,
}: SheetViewerProps) => {
  const { characterPages } = useCharacterPages(characterId);
  const { windows: characterWindows } = useCharacterWindows(characterId);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [locked, setLocked] = useState<boolean>(lockByDefault ?? false);

  const windowsForCurrentPage = useMemo(() => {
    if (currentPageId === null) {
      return characterWindows.filter((w) => !w.characterPageId);
    }
    return characterWindows.filter((w) => w.characterPageId === currentPageId);
  }, [characterWindows, currentPageId]);

  useEffect(() => {
    if (characterPages.length === 0) {
      setCurrentPageId(null);
      return;
    }
    const currentStillExists = characterPages.some((p) => p.id === currentPageId);
    if (!currentStillExists) {
      setCurrentPageId(characterPages[0]?.id ?? null);
    } else if (currentPageId === null) {
      setCurrentPageId(characterPages[0]?.id ?? null);
    }
  }, [characterPages, currentPageId]);

  const openWindows = new Set(
    windowsForCurrentPage.filter((cw) => !cw.isCollapsed).map((cw) => cw.id),
  );
  const openCharacterWindows = windowsForCurrentPage.filter((w) => !w.isCollapsed);

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
        },
      };
    });
  }

  const [nodes, setNodes] = useState<Node[]>(convertWindowsToNode(windowsForCurrentPage));
  const positionUpdateTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    setNodes(convertWindowsToNode(openCharacterWindows));
  }, [windowsForCurrentPage, locked]);

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
      {locked ? (
        <div style={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
          {openCharacterWindows.map((window, index) => (
            <div
              key={window.id}
              style={{
                position: 'absolute',
                left: window.x,
                top: window.y,
                zIndex: index,
              }}>
              <WindowNode
                data={{
                  locked,
                  characterWindow: window,
                  onMinimize: (id: string) => onWindowUpdated?.({ id, isCollapsed: true }),
                  onClose: (id: string) => onWindowDeleted?.(id),
                }}
              />
            </div>
          ))}
        </div>
      ) : (
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
          renderContextMenu={false}
        />
      )}
      <WindowsTabs
        characterId={characterId}
        currentPageId={currentPageId}
        onCurrentPageChange={setCurrentPageId}
        characterPages={characterPages}
        windows={windowsForCurrentPage}
        openWindows={openWindows}
        toggleWindow={(id: string) => onWindowUpdated?.({ id, isCollapsed: openWindows.has(id) })}
        locked={locked}
        onToggleLock={() => setLocked((prev) => !prev)}
      />
    </div>
  );
};
