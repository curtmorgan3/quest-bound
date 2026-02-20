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
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LocationNode, type LocationNodeData } from './location-node';

const nodeTypes: NodeTypes = {
  location: LocationNode as NodeTypes['location'],
};

function locationsToNodes(locations: Location[]): Node<LocationNodeData>[] {
  return locations.map((loc) => ({
    id: loc.id,
    type: 'location',
    position: { x: loc.nodeX, y: loc.nodeY },
    data: { label: loc.label, location: loc },
    style: {
      width: loc.nodeWidth,
      height: loc.nodeHeight,
      zIndex: loc.nodeZIndex ?? 0,
    },
  }));
}

/** Pan bounds in flow coordinates: [[minX, minY], [maxX, maxY]]. Omit or set to undefined for no limit. */
export type TranslateExtent = [[number, number], [number, number]];

interface WorldEditorCanvasProps {
  locations: Location[];
  parentLocationId: string | null;
  onCreateLocation: (worldId: string, data: Partial<Location>) => Promise<string | void>;
  onUpdateLocation: (id: string, data: Partial<Location>) => Promise<void>;
  onDeleteLocation: (id: string) => Promise<void>;
  onEnterLocation: (location: Location) => void;
  selectedLocationIds: string[];
  onSelectLocations: (ids: string[]) => void;
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
  parentLocationId,
  onCreateLocation,
  onUpdateLocation,
  onDeleteLocation,
  onEnterLocation,
  selectedLocationIds,
  onSelectLocations,
  translateExtent,
}: WorldEditorCanvasProps) {
  const { worldId } = useParams<{ worldId: string }>();
  const [nodes, setNodes] = useState<Node<LocationNodeData>[]>(() => locationsToNodes(locations));
  const [paneMenu, setPaneMenu] = useState<{ x: number; y: number } | null>(null);
  const [nodeMenu, setNodeMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const lastLocationsSigRef = useRef<string>('');

  // Merge location data into nodes without overwriting position, so React Flow drag state is never clobbered
  useEffect(() => {
    const sig = JSON.stringify(
      locations.map((l) => ({
        id: l.id,
        label: l.label,
        nodeX: l.nodeX,
        nodeY: l.nodeY,
        nodeWidth: l.nodeWidth,
        nodeHeight: l.nodeHeight,
        nodeZIndex: l.nodeZIndex,
        hasMap: l.hasMap,
        labelVisible: l.labelVisible,
        backgroundColor: l.backgroundColor,
        opacity: l.opacity,
        sides: l.sides,
        backgroundAssetId: l.backgroundAssetId,
        backgroundSize: l.backgroundSize,
        backgroundPosition: l.backgroundPosition,
      })),
    );
    if (lastLocationsSigRef.current === sig) return;
    lastLocationsSigRef.current = sig;

    setNodes((prev) => {
      const prevById = new Map(prev.map((p) => [p.id, p]));
      const nodeData = (loc: Location) => ({
        label: loc.label,
        location: loc,
      });
      return locations.map((loc) => {
        const existing = prevById.get(loc.id);
        const style = {
          width: loc.nodeWidth,
          height: loc.nodeHeight,
          zIndex: loc.nodeZIndex ?? 0,
        };
        if (existing) {
          return {
            ...existing,
            data: nodeData(loc),
            style,
          };
        }
        return {
          id: loc.id,
          type: 'location' as const,
          position: { x: loc.nodeX, y: loc.nodeY },
          data: nodeData(loc),
          style,
        };
      });
    });
  }, [locations]);

  const onNodesChange = useCallback(
    (changes: NodeChange<Node<LocationNodeData>>[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));

      const toRemove = changes.filter((c) => c.type === 'remove');
      toRemove.forEach((c) => {
        if ('id' in c) onDeleteLocation(c.id);
      });

      const toUpdate = changes.filter(
        (c) => c.type === 'position' || c.type === 'dimensions',
      );
      toUpdate.forEach((c: NodeChange<Node<LocationNodeData>>) => {
        if (c.type === 'position' && 'position' in c && c.position) {
          onUpdateLocation(c.id, { nodeX: c.position.x, nodeY: c.position.y });
        }
        if (c.type === 'dimensions' && 'dimensions' in c && c.dimensions) {
          onUpdateLocation(c.id, {
            nodeWidth: c.dimensions.width,
            nodeHeight: c.dimensions.height,
          });
        }
      });
    },
    [onUpdateLocation, onDeleteLocation],
  );

  const handleAddLocationAt = useCallback(
    async (x: number, y: number) => {
      if (!worldId) return;
      const id = await onCreateLocation(worldId, {
        label: 'New Location',
        parentLocationId: parentLocationId ?? undefined,
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
    [worldId, parentLocationId, onCreateLocation],
  );

  const handleOpenLocation = useCallback(
    (locationId: string) => {
      setNodeMenu(null);
      const loc = locations.find((l) => l.id === locationId);
      if (loc) onEnterLocation(loc);
    },
    [locations, onEnterLocation],
  );

  const handleDeleteLocation = useCallback(
    async (locationId: string) => {
      await onDeleteLocation(locationId);
      setNodes((nds) => nds.filter((n) => n.id !== locationId));
      setNodeMenu(null);
      onSelectLocations(selectedLocationIds.filter((id) => id !== locationId));
    },
    [onDeleteLocation, selectedLocationIds, onSelectLocations],
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
      const loc = (node.data as LocationNodeData).location;
      if (loc) onEnterLocation(loc);
    },
    [onEnterLocation],
  );

  const handleNodeClick = useCallback(
    (e: React.MouseEvent, node: Node<LocationNodeData>) => {
      if (e.shiftKey) {
        const next = selectedLocationIds.includes(node.id)
          ? selectedLocationIds.filter((id) => id !== node.id)
          : [...selectedLocationIds, node.id];
        onSelectLocations(next);
      } else {
        onSelectLocations([node.id]);
      }
    },
    [selectedLocationIds, onSelectLocations],
  );

  const handlePaneClick = useCallback(() => {
    onSelectLocations([]);
  }, [onSelectLocations]);

  const selectedSet = new Set(selectedLocationIds);
  const flowNodes = nodes.map((n) => ({
    ...n,
    selected: selectedSet.has(n.id),
  }));

  return (
    <div className='relative h-full w-full'>
      <ReactFlow
        nodes={flowNodes}
        onNodesChange={onNodesChange}
        nodeTypes={nodeTypes}
        onPaneContextMenu={handlePaneContextMenu}
        onPaneClick={handlePaneClick}
        onNodeContextMenu={handleNodeContextMenu}
        onNodeClick={handleNodeClick}
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
