import {
  useCharacterPages,
  useCharacterWindows,
  useWindows,
  type CharacterWindowUpdate,
} from '@/lib/compass-api';
import type { CharacterWindow } from '@/types';
import type { Node, NodeChange, NodePositionChange } from '@xyflow/react';
import { applyNodeChanges } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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
  /** Called when the locked state changes (e.g. to persist). */
  onLockedChange?: (locked: boolean) => void;
  editorWindowId?: string;
  /** When true, no background color/image is shown; only the React Flow nodes are visible. */
  transparentBackground?: boolean;
}

export const SheetViewer = ({
  characterId,
  onWindowUpdated,
  onWindowDeleted,
  lockByDefault,
  initialCurrentPageId,
  initialLocked,
  onLockedChange,
  editorWindowId,
  transparentBackground = false,
}: SheetViewerProps) => {
  const { characterPages } = useCharacterPages(characterId);
  const sortedCharacterPages = [...characterPages.sort((a, b) => a.label.localeCompare(b.label))];
  const {
    windows: characterWindows,
    createCharacterWindow,
    deleteCharacterWindow,
  } = useCharacterWindows(characterId);
  const { windows: rulesetWindowDefs } = useWindows();
  const [searchParams] = useSearchParams();

  const currentPageId =
    searchParams.get('pageId') ?? initialCurrentPageId ?? sortedCharacterPages[0]?.id;

  const [locked, setLockedState] = useState<boolean>(initialLocked ?? lockByDefault ?? false);

  const currentPage = characterPages.find((p) => p.id === currentPageId);

  const setLocked = (next: boolean | ((prev: boolean) => boolean)) => {
    setLockedState((prev) => {
      const value = typeof next === 'function' ? next(prev) : next;
      onLockedChange?.(value);
      return value;
    });
  };

  // Windows on the current page
  const windowsForCurrentPage = useMemo(() => {
    if (currentPageId === null) {
      return characterWindows.filter((w) => !w.characterPageId);
    }
    return characterWindows.filter((w) => w.characterPageId === currentPageId);
  }, [characterWindows, currentPageId]);

  // If editorWindowId is provided, only render that
  const windowsToRenderAsNodes = useMemo(() => {
    if (editorWindowId) {
      return windowsForCurrentPage.filter((w) => w.windowId === editorWindowId);
    }
    return windowsForCurrentPage;
  }, [windowsForCurrentPage, editorWindowId]);

  // Windows that are open
  const openWindows = new Set(
    windowsForCurrentPage.filter((cw) => !cw.isCollapsed).map((cw) => cw.id),
  );

  // Sorting by createdAt ensures child windows appear at a higher z-index
  const openCharacterWindows = useMemo(
    () =>
      [
        ...windowsToRenderAsNodes.filter((w) => {
          if (editorWindowId) return true;
          return !w.isCollapsed;
        }),
      ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [windowsToRenderAsNodes],
  );

  const handleChildWindowClick = useCallback(
    (
      childWindowId: string,
      parentWindow: { x: number; y: number },
      characterWindow: CharacterWindow,
    ) => {
      const existing = windowsForCurrentPage.find((cw) => cw.windowId === childWindowId);
      if (existing) {
        deleteCharacterWindow(existing.id);
        return;
      }
      const w = rulesetWindowDefs.find((r) => r.id === childWindowId);
      if (!w || !characterId) return;
      createCharacterWindow({
        windowId: w.id,
        characterId,
        characterPageId: characterWindow.characterPageId ?? undefined,
        title: w.title,
        x: parentWindow.x + 200,
        y: parentWindow.y + 150,
        isCollapsed: false,
      });
    },
    [
      windowsForCurrentPage,
      rulesetWindowDefs,
      createCharacterWindow,
      deleteCharacterWindow,
      characterId,
    ],
  );

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
          window,
          onMinimize: !editorWindowId
            ? (id: string) => {
                onWindowUpdated?.({ id, isCollapsed: true });
              }
            : undefined,
          onClose: !editorWindowId
            ? (id: string) => {
                onWindowDeleted?.(id);
              }
            : undefined,
          onChildWindowClick: (childWindowId: string, parentWindow: { x: number; y: number }) =>
            handleChildWindowClick(childWindowId, parentWindow, window),
        },
      };
    });
  }

  const [nodes, setNodes] = useState<Node[]>(() => convertWindowsToNode(openCharacterWindows));
  const positionUpdateTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    setNodes(convertWindowsToNode(openCharacterWindows));
  }, [openCharacterWindows, locked]);

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
          {!transparentBackground && currentPage?.backgroundColor != null && (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 0,
                backgroundColor: currentPage.backgroundColor,
                opacity: currentPage.backgroundOpacity ?? 1,
                pointerEvents: 'none',
              }}
            />
          )}
          {!transparentBackground && currentPage?.image != null && (
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
                  window,
                  onMinimize: !editorWindowId
                    ? (id: string) => onWindowUpdated?.({ id, isCollapsed: true })
                    : undefined,
                  onClose: !editorWindowId ? (id: string) => onWindowDeleted?.(id) : undefined,
                  onChildWindowClick: (childWindowId, parentWindow) =>
                    handleChildWindowClick(childWindowId, parentWindow, window),
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
          backgroundColor={transparentBackground ? undefined : currentPage?.backgroundColor}
          backgroundImage={transparentBackground ? undefined : currentPage?.image}
          backgroundOpacity={currentPage?.backgroundOpacity}
        />
      )}
      {!editorWindowId && (
        <WindowsTabs
          characterId={characterId}
          characterPages={characterPages}
          windows={windowsForCurrentPage}
          openWindows={openWindows}
          toggleWindow={(id: string) => onWindowUpdated?.({ id, isCollapsed: openWindows.has(id) })}
          locked={locked}
          onToggleLock={() => setLocked((prev) => !prev)}
        />
      )}
    </div>
  );
};
