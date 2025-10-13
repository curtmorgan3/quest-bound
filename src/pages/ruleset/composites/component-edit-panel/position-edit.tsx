import { useComponents } from '@/lib/compass-api';
import type { Component } from '@/types';
import { RotateCw } from 'lucide-react';
import { EditPanelInput } from './component-edit-panel-input';
import { parseValue, valueIfAllAreEqual } from './utils';

interface Props {
  components: Array<Component>;
}

const MIXED_VALUE_LABEL = '-';

export const PositionEdit = ({ components }: Props) => {
  const { updateComponents } = useComponents();

  const x = valueIfAllAreEqual(components, 'x');
  const y = valueIfAllAreEqual(components, 'y');
  const width = valueIfAllAreEqual(components, 'width');
  const height = valueIfAllAreEqual(components, 'height');
  const rotation = valueIfAllAreEqual(components, 'rotation');
  const layer = valueIfAllAreEqual(components, 'z');

  const handleUpdate = (key: string, value: number | string) => {
    updateComponents(
      components.map((c) => ({
        id: c.id,
        [key]: value,
      })),
    );
  };

  return (
    <div className='flex-col w-full flex flex-col gap-3 pb-2 border-b-1'>
      <p className='text-sm'>Position</p>
      <div className='w-full flex flex-row gap-4'>
        <EditPanelInput
          number={x !== MIXED_VALUE_LABEL}
          disabled={x === MIXED_VALUE_LABEL}
          label='X'
          value={x}
          onChange={(val) => handleUpdate('x', parseValue(val))}
        />
        <EditPanelInput
          number={y !== MIXED_VALUE_LABEL}
          disabled={y === MIXED_VALUE_LABEL}
          label='Y'
          value={y}
          onChange={(val) => handleUpdate('y', parseValue(val))}
        />
      </div>
      <div className='w-full flex flex-row gap-4'>
        <EditPanelInput
          number={width !== MIXED_VALUE_LABEL}
          disabled={width === MIXED_VALUE_LABEL}
          label='Width'
          value={width}
          onChange={(val) => handleUpdate('width', parseValue(val))}
        />
        <EditPanelInput
          number={height !== MIXED_VALUE_LABEL}
          disabled={height === MIXED_VALUE_LABEL}
          label='Height'
          value={height}
          onChange={(val) => handleUpdate('height', parseValue(val))}
        />
      </div>
      <div className='w-full flex flex-row gap-4 items-end'>
        <EditPanelInput
          number={rotation !== MIXED_VALUE_LABEL}
          disabled={rotation === MIXED_VALUE_LABEL}
          label='Rotation'
          value={rotation}
          onChange={(val) => handleUpdate('rotation', parseValue(val))}
        />
        <RotateCw
          className={`text-xs h-[18px] w-[18px] cursor-${rotation !== MIXED_VALUE_LABEL ? 'pointer' : 'not-allowed'}`}
          onClick={() => {
            if (rotation === MIXED_VALUE_LABEL) return;
            handleUpdate('rotation', (rotation as number) + 45);
          }}
        />
      </div>
      <div className='w-full flex flex-row gap-4 items-end'>
        <EditPanelInput
          number={layer !== MIXED_VALUE_LABEL}
          disabled={layer === MIXED_VALUE_LABEL}
          label='Layer'
          value={layer}
          onChange={(val) => handleUpdate('z', Math.max(0, parseValue(val)))}
        />
      </div>
    </div>
  );
};
