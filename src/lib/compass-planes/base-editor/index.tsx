import type { Coordinates } from '@/types';
import type { Node, NodeChange, ReactFlowProps } from '@xyflow/react';
import { Background, BackgroundVariant, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useState } from 'react';
import type { EditorMenuOption } from '../nodes/node-types';
import { ContextMenu } from './context-menu';

interface BaseEditorProps extends ReactFlowProps {
  nodes: Node[];
  onNodesChange: (change: NodeChange<any>[]) => void;
  renderContextMenu?: boolean;
  menuOptions: EditorMenuOption[];
  onSelectFromMenu: (option: EditorMenuOption, coordinates: Coordinates) => void;
}

export function BaseEditor({
  nodes,
  onNodesChange,
  renderContextMenu = true,
  menuOptions,
  onSelectFromMenu,
}: BaseEditorProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  return (
    <section
      id='base-editor'
      className='flex-grow-1'
      onContextMenu={(e) => {
        if (!renderContextMenu) return;
        e.preventDefault();
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
        });
        return false;
      }}>
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        fitView
        minZoom={1}
        maxZoom={1}
        snapGrid={[20, 20]}
        snapToGrid
        multiSelectionKeyCode={'Shift'}
        panOnDrag={false}
        panOnScroll={false}
        selectNodesOnDrag={false}>
        <Background
          id='bg-grid'
          variant={BackgroundVariant.Lines}
          gap={20}
          size={1}
          style={{
            opacity: 0.1,
          }}
        />
        {renderContextMenu && (
          <ContextMenu
            isOpen={!!contextMenu}
            options={menuOptions}
            onSelect={onSelectFromMenu}
            onClose={() => {
              setContextMenu(null);
            }}
            x={contextMenu?.x ?? 0}
            y={contextMenu?.y ?? 0}
          />
        )}
      </ReactFlow>
    </section>
  );
}
