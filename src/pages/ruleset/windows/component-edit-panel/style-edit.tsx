import { Popover } from '@/components/ui/popover';
import type { Component } from '@/types';
import { PopoverContent, PopoverTrigger } from '@radix-ui/react-popover';
import { Palette } from 'lucide-react';
import { SketchPicker } from 'react-color';
import { EditPanelInput } from './component-edit-panel-input';
import { parseValue, valueIfAllAreEqual } from './utils';

interface Props {
  components: Array<Component>;
  handleUpdate: (key: string, value: number | string | boolean | null) => void;
}

const MIXED_VALUE_LABEL = '-';

export const StyleEdit = ({ components, handleUpdate }: Props) => {
  const opacity = valueIfAllAreEqual(components, 'opacity');
  const color = valueIfAllAreEqual(components, 'color') as string;
  const borderRadius = valueIfAllAreEqual(components, 'borderRadius');

  return (
    <div className='flex-col w-full flex flex-col gap-3 pb-2 border-b-1'>
      <p className='text-sm'>Style</p>

      <div className='w-full flex flex-row gap-4 items-end'>
        <EditPanelInput
          number={opacity !== MIXED_VALUE_LABEL}
          disabled={opacity === MIXED_VALUE_LABEL}
          label='Opacity'
          value={opacity}
          step={0.1}
          onChange={(val) => handleUpdate('opacity', Math.min(1, Math.max(0.1, parseValue(val))))}
        />
        <Popover>
          <PopoverTrigger>
            <Palette
              className={`text-xs h-[18px] w-[18px] cursor-${color !== MIXED_VALUE_LABEL ? 'pointer' : 'not-allowed'}`}
              style={{ color }}
            />
          </PopoverTrigger>
          <PopoverContent>
            <SketchPicker
              color={color}
              onChange={(color) => handleUpdate('color', color.hex)}
              presetColors={[]}
            />
          </PopoverContent>
        </Popover>
      </div>
      <div className='w-full flex flex-row gap-4 items-end'>
        <EditPanelInput
          number={borderRadius !== MIXED_VALUE_LABEL}
          disabled={borderRadius === MIXED_VALUE_LABEL}
          label='Border Radius'
          value={borderRadius}
          step={1}
          onChange={(val) => handleUpdate('borderRadius', Math.min(200, Math.max(0, parseValue(val))))}
        />
      </div>
    </div>
  );
};
