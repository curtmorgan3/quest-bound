import type { Location } from '@/types';
import { NodeResizer, type Node, type NodeProps } from '@xyflow/react';
import { MapPinned } from 'lucide-react';

export type LocationNodeData = {
  label: string;
  location: Location;
};

const MIN_WIDTH = 20;
const MIN_HEIGHT = 20;

type Props = NodeProps<Node<{ data: LocationNodeData }>>;

export function LocationNode(props: Props) {
  const { data, selected } = props;
  const nodeData = data as unknown as LocationNodeData;
  const location = nodeData?.location;
  const width = location?.nodeWidth ?? 160;
  const height = location?.nodeHeight ?? 100;
  const bg = location?.backgroundColor ?? 'hsl(var(--muted))';
  const opacity = location?.opacity ?? 1;
  const showLabel = location?.labelVisible !== false;
  const backgroundImageUrl = location?.backgroundImage ?? null;
  const bgOpacity = location?.opacity ?? 1;
  const bgSize = location?.backgroundSize ?? 'cover';
  const bgPosition = location?.backgroundPosition ?? 'center';

  return (
    <>
      <NodeResizer
        color='#417090'
        isVisible={selected ?? false}
        minWidth={MIN_WIDTH}
        minHeight={MIN_HEIGHT}
      />
      <div
        className='relative flex items-start justify-start rounded border-2 border-muted-foreground/30 px-2 py-1 text-sm font-medium'
        style={{
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: bg,
          opacity,
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
        {nodeData?.location.hasMap && <MapPinned className='h-4 w-4 mr-2' />}
        {showLabel && <span className='relative z-10'>{nodeData?.label || 'Location'}</span>}
      </div>
    </>
  );
}
