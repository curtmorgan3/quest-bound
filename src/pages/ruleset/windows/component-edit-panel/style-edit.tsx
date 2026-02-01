import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover } from '@/components/ui/popover';
import { colorWhite } from '@/palette';
import type { Component } from '@/types';
import { PopoverContent, PopoverTrigger } from '@radix-ui/react-popover';
import { Palette, SquareRoundCorner } from 'lucide-react';
import { useState } from 'react';
import { SketchPicker, type RGBColor } from 'react-color';
import { EditPanelInput } from './component-edit-panel-input';
import { parseValue, valueIfAllAreEqual } from './utils';

interface Props {
  components: Array<Component>;
  handleUpdate: (
    key: string | string[],
    value: number | string | boolean | null | RGBColor,
  ) => void;
}

const MIXED_VALUE_LABEL = '-';

export const StyleEdit = ({ components, handleUpdate }: Props) => {
  const opacity = valueIfAllAreEqual(components, 'opacity');
  const backgroundColor = valueIfAllAreEqual(components, 'backgroundColor') as string;
  const color = valueIfAllAreEqual(components, 'color') as string;
  const borderRadiusTopLeft = valueIfAllAreEqual(components, 'borderRadiusTopLeft');
  const borderRadiusTopRight = valueIfAllAreEqual(components, 'borderRadiusTopRight');
  const borderRadiusBottomLeft = valueIfAllAreEqual(components, 'borderRadiusBottomLeft');
  const borderRadiusBottomRight = valueIfAllAreEqual(components, 'borderRadiusBottomRight');
  const outlineWidth = valueIfAllAreEqual(components, 'outlineWidth');
  const outlineColor = valueIfAllAreEqual(components, 'outlineColor') as string;

  // Check if all corners have the same value
  const allCornersEqual =
    borderRadiusTopLeft !== MIXED_VALUE_LABEL &&
    borderRadiusTopRight !== MIXED_VALUE_LABEL &&
    borderRadiusBottomLeft !== MIXED_VALUE_LABEL &&
    borderRadiusBottomRight !== MIXED_VALUE_LABEL &&
    borderRadiusTopLeft === borderRadiusTopRight &&
    borderRadiusTopRight === borderRadiusBottomLeft &&
    borderRadiusBottomLeft === borderRadiusBottomRight;

  const borderRadiusAll = allCornersEqual ? borderRadiusTopLeft : MIXED_VALUE_LABEL;

  const [isCornersOpen, setIsCornersOpen] = useState(false);

  const handleAllCornersChange = (val: string | number) => {
    const parsedVal = Math.min(200, Math.max(0, parseValue(val)));
    handleUpdate(
      [
        'borderRadiusTopLeft',
        'borderRadiusTopRight',
        'borderRadiusBottomLeft',
        'borderRadiusBottomRight',
      ],
      parsedVal,
    );
  };

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
          <PopoverTrigger title='Background Color'>
            <Palette
              className={`text-xs h-[18px] w-[18px] cursor-${backgroundColor !== MIXED_VALUE_LABEL ? 'pointer' : 'not-allowed'}`}
              color={colorWhite}
            />
          </PopoverTrigger>
          <PopoverContent>
            <SketchPicker
              className='sketch-picker'
              color={backgroundColor}
              onChange={(color) => handleUpdate('backgroundColor', color.rgb)}
              presetColors={[]}
            />
          </PopoverContent>
        </Popover>
        <Popover>
          <PopoverTrigger title='Color'>
            <Palette
              className={`text-xs h-[18px] w-[18px] cursor-${color !== MIXED_VALUE_LABEL ? 'pointer' : 'not-allowed'}`}
              color={colorWhite}
            />
          </PopoverTrigger>
          <PopoverContent>
            <SketchPicker
              className='sketch-picker'
              color={color}
              onChange={(color) => handleUpdate('color', color.rgb)}
              presetColors={[]}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className='w-full flex flex-col gap-2'>
        <p className='text-xs text-muted-foreground'>Border</p>
        <div className='w-full flex flex-row gap-2 items-end'>
          <EditPanelInput
            number={outlineWidth !== MIXED_VALUE_LABEL}
            disabled={outlineWidth === MIXED_VALUE_LABEL}
            label='Width'
            value={outlineWidth}
            width='80px'
            step={1}
            onChange={(val) =>
              handleUpdate('outlineWidth', Math.min(50, Math.max(0, parseValue(val))))
            }
          />
          <EditPanelInput
            number={borderRadiusAll !== MIXED_VALUE_LABEL}
            disabled={borderRadiusAll === MIXED_VALUE_LABEL}
            label='Radius'
            width='80px'
            value={borderRadiusAll}
            step={1}
            onChange={handleAllCornersChange}
          />
          <Popover>
            <PopoverTrigger title='Border Color'>
              <Palette
                className={`text-xs h-[18px] w-[18px] cursor-${outlineColor !== MIXED_VALUE_LABEL ? 'pointer' : 'not-allowed'}`}
                color={colorWhite}
              />
            </PopoverTrigger>
            <PopoverContent>
              <SketchPicker
                color={outlineColor !== MIXED_VALUE_LABEL ? outlineColor : '#000000'}
                onChange={(color) => handleUpdate('outlineColor', color.rgb)}
                presetColors={[]}
              />
            </PopoverContent>
          </Popover>
        </div>
        <Collapsible open={isCornersOpen} onOpenChange={setIsCornersOpen}>
          <div className='w-full flex flex-row gap-2 items-end'>
            <div className='flex-1'></div>
            <CollapsibleTrigger
              title='Corner Border Radius'
              className='flex items-center justify-center h-[18px] w-[18px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer'>
              <SquareRoundCorner
                className={`h-[18px] w-[18px] transition-transform ${isCornersOpen ? 'rotate-180' : ''}`}
              />
            </CollapsibleTrigger>
          </div>
          <CollapsibleContent className='pt-2'>
            <div className='w-full grid grid-cols-2 gap-2'>
              <EditPanelInput
                number={borderRadiusTopLeft !== MIXED_VALUE_LABEL}
                disabled={borderRadiusTopLeft === MIXED_VALUE_LABEL}
                label='Top Left'
                value={borderRadiusTopLeft}
                step={1}
                onChange={(val) =>
                  handleUpdate('borderRadiusTopLeft', Math.min(200, Math.max(0, parseValue(val))))
                }
              />
              <EditPanelInput
                number={borderRadiusTopRight !== MIXED_VALUE_LABEL}
                disabled={borderRadiusTopRight === MIXED_VALUE_LABEL}
                label='Top Right'
                value={borderRadiusTopRight}
                step={1}
                onChange={(val) =>
                  handleUpdate('borderRadiusTopRight', Math.min(200, Math.max(0, parseValue(val))))
                }
              />
              <EditPanelInput
                number={borderRadiusBottomLeft !== MIXED_VALUE_LABEL}
                disabled={borderRadiusBottomLeft === MIXED_VALUE_LABEL}
                label='Bottom Left'
                value={borderRadiusBottomLeft}
                step={1}
                onChange={(val) =>
                  handleUpdate(
                    'borderRadiusBottomLeft',
                    Math.min(200, Math.max(0, parseValue(val))),
                  )
                }
              />
              <EditPanelInput
                number={borderRadiusBottomRight !== MIXED_VALUE_LABEL}
                disabled={borderRadiusBottomRight === MIXED_VALUE_LABEL}
                label='Bottom Right'
                value={borderRadiusBottomRight}
                step={1}
                onChange={(val) =>
                  handleUpdate(
                    'borderRadiusBottomRight',
                    Math.min(200, Math.max(0, parseValue(val))),
                  )
                }
              />
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
};
