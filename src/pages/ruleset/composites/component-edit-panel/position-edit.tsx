import { useComponents } from '@/lib/compass-api';
import type { Component } from '@/types';
import { RotateCw } from 'lucide-react';
import { EditPanelInput } from './component-edit-panel-input';

interface Props {
  components: Array<Component>;
}

export const PositionEdit = ({ components }: Props) => {
  const { updateComponents } = useComponents();
  const singleSelected = components.length === 1 ? components[0] : null;

  const x = singleSelected?.x ?? '-';
  const y = singleSelected?.y ?? '-';
  const width = singleSelected?.width ?? '-';
  const height = singleSelected?.height ?? '-';
  const rotation = singleSelected?.rotation ?? '-';

  const handleUpdate = (key: string, value: number | string) => {
    updateComponents(
      components.map((c) => ({
        id: c.id,
        [key]: value,
      })),
    );
  };

  const parseValue = (val: string | number) => {
    let parsedVal = parseInt(val.toString());
    if (isNaN(parsedVal)) {
      parsedVal = 0;
    }
    return parsedVal;
  };

  return (
    <div className='flex-col w-full flex flex-col gap-3 pb-2 border-b-1'>
      <p className='text-sm'>Position</p>
      <div className='w-full flex flex-row gap-4'>
        <EditPanelInput
          number={!!singleSelected}
          disabled={!singleSelected}
          label='X'
          value={x}
          onChange={(val) => handleUpdate('x', parseValue(val))}
        />
        <EditPanelInput
          number={!!singleSelected}
          disabled={!singleSelected}
          label='Y'
          value={y}
          onChange={(val) => handleUpdate('y', parseValue(val))}
        />
      </div>
      <div className='w-full flex flex-row gap-4'>
        <EditPanelInput
          number={!!singleSelected}
          disabled={!singleSelected}
          label='Width'
          value={width}
          onChange={(val) => handleUpdate('width', parseValue(val))}
        />
        <EditPanelInput
          number={!!singleSelected}
          disabled={!singleSelected}
          label='Height'
          value={height}
          onChange={(val) => handleUpdate('height', parseValue(val))}
        />
      </div>
      <div className='w-full flex flex-row gap-4 items-end'>
        <EditPanelInput
          number={!!singleSelected}
          disabled={!singleSelected}
          label='Rotation'
          value={rotation}
          onChange={(val) => handleUpdate('rotation', parseValue(val))}
        />
        <RotateCw
          className={`text-xs h-[18px] w-[18px] cursor-${singleSelected ? 'pointer' : 'not-allowed'}`}
          onClick={() => {
            if (rotation === '-') return;
            handleUpdate('rotation', rotation + 45);
          }}
        />
      </div>
    </div>
  );
};
