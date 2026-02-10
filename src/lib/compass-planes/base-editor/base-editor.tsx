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
  menuOptions?: EditorMenuOption[];
  onSelectFromMenu?: (option: EditorMenuOption, coordinates: Coordinates) => void;
  useGrid?: boolean;
  backgroundOpacity?: number;
  backgroundImage?: string | null;
}

export function BaseEditor({
  nodes,
  onNodesChange,
  renderContextMenu = true,
  menuOptions,
  onSelectFromMenu,
  useGrid = true,
  backgroundOpacity = 0.1,
  backgroundImage,
  ...props
}: BaseEditorProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const imageOpacity = backgroundImage != null ? (backgroundOpacity ?? 1) : undefined;

  return (
    <section
      id='base-editor'
      className='flex-grow-1'
      style={{ position: 'relative' }}
      onContextMenu={(e) => {
        if (!renderContextMenu) return;
        e.preventDefault();
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
        });
        return false;
      }}>
      {backgroundImage && (
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            opacity: imageOpacity ?? 1,
            pointerEvents: 'none',
          }}
        />
      )}
      <ReactFlow
        style={{ position: 'relative', zIndex: 1 }}
        nodes={nodes}
        onNodesChange={onNodesChange}
        minZoom={1}
        maxZoom={1}
        snapGrid={[20, 20]}
        snapToGrid={useGrid}
        multiSelectionKeyCode={'Shift'}
        selectionKeyCode={'Meta'}
        fitView={false}
        panOnDrag={false}
        panOnScroll={false}
        autoPanOnNodeDrag={false}
        zIndexMode='manual'
        nodeExtent={[
          [0, 0],
          [Infinity, Infinity],
        ]}
        translateExtent={[
          [0, 0],
          [Infinity, Infinity],
        ]}
        selectNodesOnDrag={false}
        {...props}>
        {useGrid && (
          <Background
            id='bg-grid'
            variant={BackgroundVariant.Lines}
            gap={20}
            size={1}
            style={{
              opacity: backgroundOpacity,
            }}
          />
        )}
        {renderContextMenu && (
          <ContextMenu
            isOpen={!!contextMenu}
            options={menuOptions ?? []}
            onSelect={(...args) => onSelectFromMenu?.(...args)}
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
