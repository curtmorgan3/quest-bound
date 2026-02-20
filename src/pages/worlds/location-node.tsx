import type { Location } from '@/types';
import { NodeResizer, type Node, type NodeProps } from '@xyflow/react';

export type LocationNodeData = {
  label: string;
  location: Location;
};

const MIN_WIDTH = 80;
const MIN_HEIGHT = 60;

type Props = NodeProps<Node<{ data: LocationNodeData }>>;

export function LocationNode(props: Props) {
  const { data, selected } = props;
  const nodeData = data as unknown as LocationNodeData;
  const location = nodeData?.location;
  const width = location?.nodeWidth ?? 160;
  const height = location?.nodeHeight ?? 100;

  return (
    <>
      <NodeResizer
        color='#417090'
        isVisible={selected ?? false}
        minWidth={MIN_WIDTH}
        minHeight={MIN_HEIGHT}
      />
      <div
        className='flex items-center justify-center rounded border-2 border-muted-foreground/30 bg-muted/50 px-2 py-1 text-sm font-medium'
        style={{
          width: `${width}px`,
          height: `${height}px`,
        }}>
        {nodeData?.label || 'Location'}
      </div>
    </>
  );
}
