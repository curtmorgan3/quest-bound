import type { Location } from '@/types';
import type { Node, NodeProps, NodeTypes } from '@xyflow/react';
import { Background, BackgroundVariant, ReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { MapPinned } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

export type LocationNodeData = {
  label: string;
  location: Location;
};

function LocationPolygon({
  width,
  height,
  sides,
  fill,
  opacity,
}: {
  width: number;
  height: number;
  sides: number;
  fill: string;
  opacity: number;
}) {
  const angle = (2 * Math.PI) / sides;
  const diameter = Math.min(width, height);
  const radius = diameter / 2;
  const cx = width / 2;
  const cy = height / 2;
  const points = Array.from({ length: sides }, (_, i) => {
    const currAngle = i * angle - Math.PI / 2;
    return [cx + radius * Math.cos(currAngle), cy + radius * Math.sin(currAngle)].join(',');
  }).join(' ');

  return (
    <svg
      width={width}
      height={height}
      className='absolute inset-0 overflow-visible'
      style={{ pointerEvents: 'none' }}>
      <polygon points={points} fill={fill} opacity={opacity} />
    </svg>
  );
}

function LocationNodeView(props: NodeProps<Node<LocationNodeData>>) {
  const data = (props.data ?? {}) as LocationNodeData;
  const location = data?.location;
  const width = location?.nodeWidth ?? 160;
  const height = location?.nodeHeight ?? 100;
  const sides = location?.sides ?? 4;
  const isPolygon = sides !== 4;
  const bg = location?.backgroundColor ?? 'hsl(var(--muted))';
  const opacity = location?.opacity ?? 1;
  const showLabel = location?.labelVisible !== false;
  const backgroundImageUrl = location?.backgroundImage ?? null;
  const bgOpacity = location?.opacity ?? 1;
  const bgSize = location?.backgroundSize ?? 'cover';
  const bgPosition = location?.backgroundPosition ?? 'center';

  return (
    <div
      className='relative flex items-start justify-start rounded border-2 border-muted-foreground/30 px-2 py-1 text-sm font-medium'
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: isPolygon ? 'transparent' : bg,
        opacity: isPolygon ? undefined : opacity,
        contain: 'layout paint',
      }}>
      {backgroundImageUrl && (
        <div
          className='absolute inset-0 rounded-[calc(0.25rem-2px)] bg-cover bg-center bg-no-repeat'
          style={{
            backgroundImage: `url(${backgroundImageUrl})`,
            backgroundSize: bgSize,
            backgroundPosition: bgPosition,
            opacity: bgOpacity,
            transform: 'translateZ(0)',
          }}
        />
      )}
      {isPolygon && (
        <LocationPolygon width={width} height={height} sides={sides} fill={bg} opacity={opacity} />
      )}
      {location?.hasMap && <MapPinned className='h-4 w-4 mr-2' />}
      {showLabel && <span className='relative z-10'>{data?.label || 'Location'}</span>}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  location: LocationNodeView,
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

export interface WorldViewerProps {
  locations: Location[];
  /** Called when user chooses "Advance to location" from the double-click menu (or when double-clicking a location without a map). */
  onAdvanceToLocation?: (locationId: string) => void;
  /** Called when user chooses "Open map" from the double-click menu. */
  onOpenMap?: (locationId: string) => void;
  translateExtent?: [[number, number], [number, number]];
}

export function WorldViewer({
  locations,
  onAdvanceToLocation,
  onOpenMap,
  translateExtent,
}: WorldViewerProps) {
  const [doubleClickMenu, setDoubleClickMenu] = useState<{
    locationId: string;
    x: number;
    y: number;
    hasMap: boolean;
  } | null>(null);

  const flowNodes = useMemo(() => locationsToNodes(locations), [locations]);

  const handleNodeDoubleClick = useCallback(
    (e: React.MouseEvent, node: Node<LocationNodeData>) => {
      console.log('click');
      const loc = (node.data as LocationNodeData).location;
      if (!loc) return;
      if (loc.hasMap && (onAdvanceToLocation || onOpenMap)) {
        setDoubleClickMenu({
          locationId: loc.id,
          x: 'clientX' in e ? e.clientX : 0,
          y: 'clientY' in e ? e.clientY : 0,
          hasMap: true,
        });
      } else {
        onAdvanceToLocation?.(loc.id);
      }
    },
    [onAdvanceToLocation, onOpenMap],
  );

  const handleAdvance = useCallback(() => {
    if (doubleClickMenu) {
      onAdvanceToLocation?.(doubleClickMenu.locationId);
      setDoubleClickMenu(null);
    }
  }, [doubleClickMenu, onAdvanceToLocation]);

  const handleOpenMap = useCallback(() => {
    if (doubleClickMenu) {
      onOpenMap?.(doubleClickMenu.locationId);
      setDoubleClickMenu(null);
    }
  }, [doubleClickMenu, onOpenMap]);

  return (
    <div className='relative h-full w-full'>
      <ReactFlow
        nodes={flowNodes}
        nodeTypes={nodeTypes}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodeClick={(e) => e.preventDefault()}
        zoomOnDoubleClick={false}
        minZoom={0.8}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        fitView
        panOnDrag
        panOnScroll
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        style={{ background: 'var(--muted)' }}
        translateExtent={translateExtent}>
        <Background variant={BackgroundVariant.Lines} gap={20} size={1} style={{ opacity: 0.1 }} />
      </ReactFlow>

      {doubleClickMenu && (
        <>
          <div
            className='fixed inset-0 z-10'
            role='button'
            tabIndex={-1}
            onClick={() => setDoubleClickMenu(null)}
            onContextMenu={(e) => e.preventDefault()}
          />
          <div
            className='fixed z-20 rounded-md border bg-popover px-2 py-1 shadow-md'
            style={{ left: doubleClickMenu.x, top: doubleClickMenu.y }}>
            {onAdvanceToLocation && (
              <button
                type='button'
                className='block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent'
                onClick={handleAdvance}>
                Advance to location
              </button>
            )}
            {onOpenMap && (
              <button
                type='button'
                className='block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-accent'
                onClick={handleOpenMap}>
                Open map
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
