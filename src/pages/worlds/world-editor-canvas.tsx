import type { Location } from '@/types';
import type { Node, NodeChange, NodeTypes } from '@xyflow/react';
import {
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Panel,
  ReactFlow,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LocationNode, type LocationNodeData } from './location-node';

const nodeTypes: NodeTypes = { location: LocationNode as NodeTypes['location'] };

function locationsToNodes(locations: Location[]): Node<LocationNodeData>[] {
  return locations.map((loc) => ({
    id: loc.id,
    type: 'location',
    position: { x: loc.nodeX, y: loc.nodeY },
    data: { label: loc.label, location: loc },
    style: { width: loc.nodeWidth, height: loc.nodeHeight },
  }));
}

/** Pan bounds in flow coordinates: [[minX, minY], [maxX, maxY]]. Omit or set to undefined for no limit. */
export type TranslateExtent = [[number, number], [number, number]];

interface WorldEditorCanvasProps {
  locations: Location[];
  onCreateLocation: (worldId: string, data: Partial<Location>) => Promise<string | void>;
  onUpdateLocation: (id: string, data: Partial<Location>) => Promise<void>;
  onDeleteLocation: (id: string) => Promise<void>;
  /** Optional pan bounds. Example: [[-2000, -2000], [2000, 2000]] limits pan to ±2000 on both axes. */
  translateExtent?: TranslateExtent;
}

function PaneContextMenu({
  paneMenu,
  onClose,
  onAddLocation,
}: {
  paneMenu: { x: number; y: number } | null;
  onClose: () => void;
  onAddLocation: (x: number, y: number) => void;
}) {
  const { screenToFlowPosition } = useReactFlow();
  if (!paneMenu) return null;
  const flowPos = screenToFlowPosition({ x: paneMenu.x, y: paneMenu.y });
  return (
    <>
      <div
        className='fixed inset-0 z-10'
        role='button'
        tabIndex={-1}
        onClick={onClose}
        onContextMenu={(e) => e.preventDefault()}
      />
      <div
        className='fixed z-20 rounded-md border bg-popover px-2 py-1 shadow-md'
        style={{ left: paneMenu.x, top: paneMenu.y }}>
        <button
          type='button'
          className='block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent'
          onClick={() => {
            onAddLocation(flowPos.x, flowPos.y);
            onClose();
          }}>
          Add location
        </button>
      </div>
    </>
  );
}

export function WorldEditorCanvas({
  locations,
  onCreateLocation,
  onUpdateLocation,
  onDeleteLocation,
  translateExtent,
}: WorldEditorCanvasProps) {
  const { worldId } = useParams<{ worldId: string }>();
  const navigate = useNavigate();
  const [nodes, setNodes] = useState<Node<LocationNodeData>[]>(() => locationsToNodes(locations));
  const [paneMenu, setPaneMenu] = useState<{ x: number; y: number } | null>(null);
  const [nodeMenu, setNodeMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  // Sync nodes when locations count or ids change (add/delete from DB)
  useEffect(() => {
    const next = locationsToNodes(locations);
    setNodes((prev) =>
      prev.length !== next.length || next.some((n) => !prev.find((p) => p.id === n.id))
        ? next
        : prev,
    );
  }, [locations]);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<LocationNodeData>>[]) => {
      const toRemove = changes.filter((c) => c.type === 'remove');
      toRemove.forEach((c) => {
        if ('id' in c) onDeleteLocation(c.id);
      });

      const toUpdate = changes.filter((c) => c.type === 'position' || c.type === 'dimensions');
      toUpdate.forEach((c: any) => {
        if (c.type === 'position' && c.position) {
          onUpdateLocation(c.id, { nodeX: c.position.x, nodeY: c.position.y });
        }
        if (c.type === 'dimensions' && c.dimensions) {
          onUpdateLocation(c.id, {
            nodeWidth: c.dimensions.width,
            nodeHeight: c.dimensions.height,
          });
        }
      });

      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [onUpdateLocation, onDeleteLocation],
  );

  const handleAddLocationAt = useCallback(
    async (x: number, y: number) => {
      if (!worldId) return;
      const id = await onCreateLocation(worldId, {
        label: 'New Location',
        nodeX: x,
        nodeY: y,
        nodeWidth: 160,
        nodeHeight: 100,
        gridWidth: 1,
        gridHeight: 1,
        tiles: [],
      });
      if (id) {
        setNodes((nds) => [
          ...nds,
          {
            id,
            type: 'location',
            position: { x, y },
            data: { label: 'New Location', location: {} as Location },
            style: { width: 160, height: 100 },
          } as Node<LocationNodeData>,
        ]);
      }
      setPaneMenu(null);
    },
    [worldId, onCreateLocation],
  );

  const handleOpenLocation = useCallback(
    (locationId: string) => {
      if (worldId) navigate(`/worlds/${worldId}/locations/${locationId}`);
      setNodeMenu(null);
    },
    [worldId, navigate],
  );

  const handleDeleteLocation = useCallback(
    async (locationId: string) => {
      await onDeleteLocation(locationId);
      setNodes((nds) => nds.filter((n) => n.id !== locationId));
      setNodeMenu(null);
    },
    [onDeleteLocation],
  );

  const handlePaneContextMenu = useCallback(
    (e: MouseEvent | React.MouseEvent<Element, MouseEvent>) => {
      e.preventDefault();
      const x = 'clientX' in e ? e.clientX : 0;
      const y = 'clientY' in e ? e.clientY : 0;
      setPaneMenu({ x, y });
      setNodeMenu(null);
    },
    [],
  );

  const handleNodeContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent<Element, MouseEvent>, node: Node) => {
      event.preventDefault();
      if ('stopPropagation' in event) event.stopPropagation();
      const clientX = 'clientX' in event ? event.clientX : 0;
      const clientY = 'clientY' in event ? event.clientY : 0;
      setNodeMenu({ id: node.id, x: clientX, y: clientY });
      setPaneMenu(null);
    },
    [],
  );

  const handleDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node<LocationNodeData>) => {
      if (worldId) navigate(`/worlds/${worldId}/locations/${node.id}`);
    },
    [worldId, navigate],
  );

  return (
    <div className='relative h-full w-full'>
      <ReactFlow
        nodes={nodes}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeContextMenu={handleNodeContextMenu}
        onNodeDoubleClick={handleDoubleClick}
        minZoom={0.8}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        snapGrid={[20, 20]}
        snapToGrid
        fitView
        panOnDrag
        panOnScroll
        selectionOnDrag={false}
        multiSelectionKeyCode='Shift'
        nodesDraggable
        nodesConnectable={false}
        elementsSelectable
        style={{ background: 'var(--muted)' }}
        translateExtent={translateExtent}>
        <Background variant={BackgroundVariant.Lines} gap={20} size={1} style={{ opacity: 0.1 }} />
        <Panel position='top-left'>
          <PaneContextMenu
            paneMenu={paneMenu}
            onClose={() => setPaneMenu(null)}
            onAddLocation={handleAddLocationAt}
          />
        </Panel>
      </ReactFlow>

      {/* Node context menu: Open / Delete */}
      {nodeMenu && (
        <>
          <div
            className='fixed inset-0 z-10'
            role='button'
            tabIndex={-1}
            onClick={() => setNodeMenu(null)}
            onContextMenu={(e) => e.preventDefault()}
          />
          <div
            className='fixed z-20 rounded-md border bg-popover px-2 py-1 shadow-md'
            style={{ left: nodeMenu.x, top: nodeMenu.y }}>
            <button
              type='button'
              className='block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent'
              onClick={() => handleOpenLocation(nodeMenu.id)}>
              Open
            </button>
            <button
              type='button'
              className='block w-full rounded px-2 py-1.5 text-left text-sm text-destructive hover:bg-accent'
              onClick={() => handleDeleteLocation(nodeMenu.id)}>
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
