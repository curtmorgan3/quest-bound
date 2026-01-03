import { useWindows } from '@/lib/compass-api';
import type { Window } from '@/types';
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
  windowIds: string[];
  testMode?: boolean;
}

export const SheetViewer = ({ windowIds, testMode }: SheetViewerProps) => {
  const { windows: allWindows } = useWindows();
  const windows = allWindows.filter((w) => windowIds.includes(w.id));
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

  function convertWindowsToNode(windows: Window[]): Node[] {
    return windows.map((window, index) => {
      const position = { x: 250, y: 250 };

      return {
        id: `window-${window.id}`,
        type: 'window',
        position,
        draggable: true,
        selectable: false,
        zIndex: index, // Render the lastest one open on top
        data: {
          window,
          onClose: (id: string) => {
            toggleWindow(id);
          },
          renderCloseButton: !testMode,
        },
      };
    });
  }

  const [nodes, setNodes] = useState<Node[]>(convertWindowsToNode(windows));

  useEffect(() => {
    setNodes(convertWindowsToNode(windows.filter((w) => openWindows.has(w.id))));

    if (testMode && windows.length > 0 && !windowsOpenedByDefault.current) {
      // Open all windows by default by default
      setOpenWindows(new Set(windows.map((w) => w.id)));
      windowsOpenedByDefault.current = true;
    }
  }, [openWindows, testMode, windows.length]);

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
        <WindowsTabs windows={windows} toggleWindow={toggleWindow} openWindows={openWindows} />
      )}
    </div>
  );
};
