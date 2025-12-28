import { COMPONENTS_POSITION_CHANGE_EVENT, editorEmitter } from '@/lib/compass-planes/utils';
import type { Component } from '@/types';
import { RotateCw } from 'lucide-react';
import { EditPanelInput } from './component-edit-panel-input';
import { parseValue, valueIfAllAreEqual } from './utils';

interface Props {
  components: Array<Component>;
  handleUpdate: (key: string, value: number | string | boolean | null) => void;
}

const MIXED_VALUE_LABEL = '-';

export const PositionEdit = ({ components, handleUpdate }: Props) => {
  const x = valueIfAllAreEqual(components, 'x');
  const y = valueIfAllAreEqual(components, 'y');
  const width = valueIfAllAreEqual(components, 'width');
  const height = valueIfAllAreEqual(components, 'height');
  const rotation = valueIfAllAreEqual(components, 'rotation');
  const layer = valueIfAllAreEqual(components, 'z');

  // We only want to fire this when the position is changed from outside react-flow context,
  // so it's here instead of hooked into the API update hook.
  const handlePositionChange = (key: string, value: number) => {
    editorEmitter.emit(COMPONENTS_POSITION_CHANGE_EVENT, {
      components: components.map((component) => ({
        ...component,
        [key]: value,
      })),
    });
    handleUpdate(key, value);
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
          onChange={(val) => handlePositionChange('x', parseValue(val))}
        />
        <EditPanelInput
          number={y !== MIXED_VALUE_LABEL}
          disabled={y === MIXED_VALUE_LABEL}
          label='Y'
          value={y}
          onChange={(val) => handlePositionChange('y', parseValue(val))}
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
          role='button'
          aria-label='Rotate'
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
          onChange={(val) => handlePositionChange('z', Math.max(0, parseValue(val)))}
        />
      </div>
    </div>
  );
};
