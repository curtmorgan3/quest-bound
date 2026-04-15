import { RotateCcw, RotateCw } from 'lucide-react';
import {
  fireExternalComponentChangeEvent,
  getComponentData,
} from '@/lib/compass-planes/utils';
import { cn } from '@/lib/utils';
import type { Component } from '@/types';
import { EditPanelInput } from './component-edit-panel-input';
import { parseValue, valueIfAllAreEqual } from './utils';

interface Props {
  components: Array<Component>;
  handleUpdate: (key: string, value: number | string | boolean | null) => void;
  handleDataFlagUpdate: (key: 'takeFullWidth' | 'takeFullHeight', value: boolean) => void;
}

const MIXED_VALUE_LABEL = '-';

function dataBooleanIfAllEqual(
  components: Component[],
  key: 'takeFullWidth' | 'takeFullHeight',
): boolean | typeof MIXED_VALUE_LABEL {
  if (!components.length) return MIXED_VALUE_LABEL;
  const first = !!getComponentData(components[0])[key];
  for (let i = 1; i < components.length; i++) {
    if (!!getComponentData(components[i])[key] !== first) return MIXED_VALUE_LABEL;
  }
  return first;
}

export const PositionEdit = ({ components, handleUpdate, handleDataFlagUpdate }: Props) => {
  const x = valueIfAllAreEqual(components, 'x');
  const y = valueIfAllAreEqual(components, 'y');
  const width = valueIfAllAreEqual(components, 'width');
  const height = valueIfAllAreEqual(components, 'height');
  const takeFullWidth = dataBooleanIfAllEqual(components, 'takeFullWidth');
  const takeFullHeight = dataBooleanIfAllEqual(components, 'takeFullHeight');
  const rotation = valueIfAllAreEqual(components, 'rotation');
  const layer = valueIfAllAreEqual(components, 'z');

  // Fire when position changes from the panel (not from an in-progress canvas drag),
  // so it's here instead of hooked into the API update hook.
  const handlePositionChange = (key: string, value: number) => {
    fireExternalComponentChangeEvent({
      updates: components.map((component) => ({
        id: component.id,
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
        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <EditPanelInput
            number={width !== MIXED_VALUE_LABEL}
            disabled={
              width === MIXED_VALUE_LABEL ||
              takeFullWidth === MIXED_VALUE_LABEL ||
              takeFullWidth === true
            }
            label='Width'
            value={width}
            clearValue={0}
            onChange={(val) => handleUpdate('width', parseValue(val))}
          />
          <button
            type='button'
            className={cn(
              'w-fit text-left text-xs text-muted-foreground underline-offset-2 hover:underline disabled:pointer-events-none disabled:opacity-50',
              takeFullWidth === true && 'font-medium text-foreground',
            )}
            disabled={width === MIXED_VALUE_LABEL}
            onClick={() => {
              if (width === MIXED_VALUE_LABEL) return;
              if (takeFullWidth === MIXED_VALUE_LABEL) {
                handleDataFlagUpdate('takeFullWidth', true);
                return;
              }
              handleDataFlagUpdate('takeFullWidth', !takeFullWidth);
            }}>
            Full Width
          </button>
        </div>
        <div className='flex min-w-0 flex-1 flex-col gap-1'>
          <EditPanelInput
            number={height !== MIXED_VALUE_LABEL}
            disabled={
              height === MIXED_VALUE_LABEL ||
              takeFullHeight === MIXED_VALUE_LABEL ||
              takeFullHeight === true
            }
            label='Height'
            value={height}
            clearValue={0}
            onChange={(val) => handleUpdate('height', parseValue(val))}
          />
          <button
            type='button'
            className={cn(
              'w-fit text-left text-xs text-muted-foreground underline-offset-2 hover:underline disabled:pointer-events-none disabled:opacity-50',
              takeFullHeight === true && 'font-medium text-foreground',
            )}
            disabled={height === MIXED_VALUE_LABEL}
            onClick={() => {
              if (height === MIXED_VALUE_LABEL) return;
              if (takeFullHeight === MIXED_VALUE_LABEL) {
                handleDataFlagUpdate('takeFullHeight', true);
                return;
              }
              handleDataFlagUpdate('takeFullHeight', !takeFullHeight);
            }}>
            Full Height
          </button>
        </div>
      </div>
      <div className='w-full flex flex-row gap-4 items-end'>
        <EditPanelInput
          number={rotation !== MIXED_VALUE_LABEL}
          disabled={rotation === MIXED_VALUE_LABEL}
          label='Rotation'
          value={rotation}
          styleKeyForCustomProperty='rotation'
          clearValue={0}
          onChange={(val) => handleUpdate('rotation', parseValue(val))}
        />
        {!`${rotation}`.includes('custom-prop') && (
          <div className='flex gap-2'>
            <RotateCcw
              role='button'
              aria-label='Rotate'
              className={`text-xs h-[18px] w-[18px] cursor-${rotation !== MIXED_VALUE_LABEL ? 'pointer' : 'not-allowed'}`}
              onClick={() => {
                if (rotation === MIXED_VALUE_LABEL) return;
                handleUpdate('rotation', (rotation as number) - 45);
              }}
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
        )}
      </div>
      <div className='w-full flex flex-row gap-4 items-end'>
        <EditPanelInput
          number={layer !== MIXED_VALUE_LABEL}
          disabled={layer === MIXED_VALUE_LABEL}
          label='Layer'
          value={layer}
          styleKeyForCustomProperty='z'
          clearValue={0}
          onChange={(val) => handlePositionChange('z', Math.max(0, parseValue(val)))}
        />
      </div>
    </div>
  );
};
