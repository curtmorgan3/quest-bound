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
  /** Initial current page (e.g. from localStorage). SheetViewer may still reset to first page if this id is invalid. */
  initialCurrentPageId?: string | null;
  /** Initial locked state (e.g. from localStorage). */
  initialLocked?: boolean;
  /** Called when the current page changes (e.g. to persist). */
  onCurrentPageChange?: (pageId: string | null) => void;
  /** Called when the locked state changes (e.g. to persist). */
  onLockedChange?: (locked: boolean) => void;
}

export const SheetViewer = ({
  characterId,
  onWindowUpdated,
  onWindowDeleted,
  lockByDefault,
  initialCurrentPageId,
  initialLocked,
  onCurrentPageChange,
  onLockedChange,
}: SheetViewerProps) => {
  const { characterPages } = useCharacterPages(characterId);
  const { windows: characterWindows } = useCharacterWindows(characterId);
  const [currentPageId, setCurrentPageIdState] = useState<string | null>(
    initialCurrentPageId ?? null,
  );
  const [locked, setLockedState] = useState<boolean>(initialLocked ?? lockByDefault ?? false);

  const currentPage = characterPages.find((p) => p.id === currentPageId);

  const setCurrentPageId = (next: string | null) => {
    setCurrentPageIdState(next);
    onCurrentPageChange?.(next);
  };
  const setLocked = (next: boolean | ((prev: boolean) => boolean)) => {
    setLockedState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      onLockedChange?.(value);
      return value;
    });
  };

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

    const storedIdValid =
      initialCurrentPageId != null && characterPages.some((p) => p.id === initialCurrentPageId);
    const fallbackPageId = storedIdValid ? initialCurrentPageId : (characterPages[0]?.id ?? null);

    const currentStillExists = characterPages.some((p) => p.id === currentPageId);
    if (!currentStillExists) {
      setCurrentPageId(fallbackPageId);
    } else if (currentPageId === null) {
      setCurrentPageId(fallbackPageId);
    }
  }, [characterPages, currentPageId, initialCurrentPageId]);

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
          {currentPage?.image && (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                backgroundImage: `url(${currentPage.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                opacity: currentPage.backgroundOpacity ?? 1,
                pointerEvents: 'none',
              }}
            />
          )}
          {openCharacterWindows.map((window, index) => (
            <div
              key={window.id}
              style={{
                position: 'absolute',
                left: window.x,
                top: window.y,
                zIndex: index + 1,
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
          backgroundImage={currentPage?.image}
          backgroundOpacity={currentPage?.backgroundOpacity}
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
