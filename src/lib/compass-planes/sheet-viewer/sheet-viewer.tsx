import { useComponents, useWindows } from '@/lib/compass-api';
import { ViewShapeNode, ViewTextNode } from '@/lib/compass-planes/nodes/components';
import { ComponentTypes } from '@/lib/compass-planes/nodes/node-types';
import type { Component, Window } from '@/types';
import type { Node, NodeChange } from '@xyflow/react';
import { applyNodeChanges, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useEffect, useMemo, useState } from 'react';

interface SheetViewerProps {
  windowIds: string[];
}

interface WindowNodeData {
  window: Window;
}

const WindowNode = ({ data }: { data: WindowNodeData }) => {
  const { window } = data;
  const { components } = useComponents(window.id);

  console.log(window, components);

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

  // Calculate window size based on components
  const windowWidth = useMemo(() => {
    if (components.length === 0) return 400;
    const maxX = Math.max(...components.map((c) => c.x + c.width));
    return Math.max(400, maxX + 40); // Add padding
  }, [components]);

  const windowHeight = useMemo(() => {
    if (components.length === 0) return 300;
    const maxY = Math.max(...components.map((c) => c.y + c.height));
    return Math.max(300, maxY + 60); // Add padding for header
  }, [components]);

  return (
    <div
      className='window-node'
      style={{
        width: windowWidth,
        height: windowHeight,
        padding: 20,
        border: '1px solid #000',
        borderRadius: 8,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
      }}>
      <div
        style={{
          position: 'relative',
          flex: 1,
          width: '100%',
          height: '100%',
          minHeight: windowHeight - 60,
        }}>
        {components.map((component) => (
          <div
            key={component.id}
            style={{
              position: 'absolute',
              left: component.x,
              top: component.y,
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
