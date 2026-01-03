import { useComponents, useWindows } from '@/lib/compass-api';
import { ViewShapeNode, ViewTextNode } from '@/lib/compass-planes/nodes/components';
import { ComponentTypes } from '@/lib/compass-planes/nodes/node-types';
import { colorPaper } from '@/palette';
import type { Component, Window } from '@/types';
import type { Node, NodeChange } from '@xyflow/react';
import { applyNodeChanges, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { OctagonX } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

interface SheetViewerProps {
  windowIds: string[];
}

interface WindowNodeData {
  window: Window;
  onClose: (id: string) => void;
}

const WindowNode = ({ data }: { data: WindowNodeData }) => {
  const { window, onClose } = data;
  const { components } = useComponents(window.id);

  const renderComponent = (component: Component) => {
    switch (component.type) {
      case ComponentTypes.TEXT:
        return <ViewTextNode key={component.id} component={component} />;
      case ComponentTypes.SHAPE:
        return <ViewShapeNode key={component.id} component={component} />;
      default:
        return null;
    }
  };

  // Calculate offsets based on leftmost and topmost components
  const minX = useMemo(() => {
    if (components.length === 0) return 0;
    return Math.min(...components.map((c) => c.x));
  }, [components]);

  const minY = useMemo(() => {
    if (components.length === 0) return 0;
    return Math.min(...components.map((c) => c.y));
  }, [components]);

  // Calculate window size based on components (adjusted for offsets)
  const windowWidth = useMemo(() => {
    if (components.length === 0) return 400;
    const maxX = Math.max(...components.map((c) => c.x + c.width));
    const adjustedMaxX = maxX - minX;
    return adjustedMaxX;
  }, [components, minX]);

  const windowHeight = useMemo(() => {
    if (components.length === 0) return 300;
    return Math.max(...components.map((c) => c.y - minY + c.height));
  }, [components, minY]);

  return (
    <div
      className='window-node'
      style={{
        width: windowWidth,
        height: windowHeight + 20,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}>
      <div
        style={{
          height: '20px',
          width: '100%',
          backgroundColor: colorPaper,
          borderRadius: '8px 8px 0 0',
          display: 'flex',
          justifyContent: 'flex-end',
          padding: '0 4px 0 4px',
        }}>
        <OctagonX
          style={{ width: '20px', height: '20px' }}
          className='clickable'
          onClick={() => onClose(window.id)}
        />
      </div>
      <div
        style={{
          position: 'relative',
          flex: 1,
          width: '100%',
          height: windowHeight,
        }}>
        {components.map((component) => (
          <div
            key={component.id}
            style={{
              position: 'absolute',
              left: component.x - minX,
              top: component.y - minY,
              width: component.width,
              height: component.height,
              zIndex: component.z,
              transform: `rotate(${component.rotation}deg)`,
            }}>
            {renderComponent(component)}
          </div>
        ))}
      </div>
    </div>
  );
};

const windowNodeTypes = {
  window: WindowNode,
};

export const SheetViewer = ({ windowIds }: SheetViewerProps) => {
  const { windows: allWindows } = useWindows();
  const windows = allWindows.filter((w) => windowIds.includes(w.id));

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
      const position = { x: index * 450, y: index * 50 };

      return {
        id: `window-${window.id}`,
        type: 'window',
        position,
        draggable: true,
        selectable: false,
        data: {
          window,
          onClose: (id: string) => {
            toggleWindow(id);
          },
        },
      };
    });
  }

  const [nodes, setNodes] = useState<Node[]>(convertWindowsToNode(windows));

  useEffect(() => {
    setNodes(convertWindowsToNode(windows.filter((w) => openWindows.has(w.id))));
  }, [openWindows]);

  const onNodesChange = (changes: NodeChange[]) => {
    setNodes((prev) => applyNodeChanges(changes, prev));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          onNodesChange={onNodesChange}
          nodeTypes={windowNodeTypes}
          minZoom={1}
          maxZoom={1}
          panOnDrag={false}
          nodesDraggable={true}
          nodesConnectable={false}
          selectNodesOnDrag={false}
          panOnScroll={false}
          zoomOnScroll={false}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}></ReactFlow>
      </div>
      <div
        className='window-tabs'
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          display: 'flex',
          gap: 8,
          padding: '8px',
          backgroundColor: '#2a2a2a',
          borderTop: '1px solid #333',
          overflowX: 'auto',
        }}>
        {windows.map((window) => (
          <button
            key={window.id}
            onClick={() => toggleWindow(window.id)}
            style={{
              height: '30px',
              minWidth: '60px',
              backgroundColor: openWindows.has(window.id) ? '#444' : '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: 4,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '0.7rem',
            }}>
            {window.title}
          </button>
        ))}
      </div>
    </div>
  );
};
