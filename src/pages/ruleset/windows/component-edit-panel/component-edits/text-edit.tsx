import { Label } from '@/components';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Toggle } from '@/components/ui/toggle';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useFonts } from '@/lib/compass-api';
import type { Component } from '@/types';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Bold,
  Italic,
  Palette,
  Strikethrough,
} from 'lucide-react';
import { SketchPicker } from 'react-color';
import { EditPanelInput } from '../component-edit-panel-input';
import { parseValue, valueIfAllAreEqual } from '../utils';

const SYSTEM_FONTS = [
  'Arial',
  'Arial Black',
  'Book Antiqua',
  'Brush Script MT',
  'Comic Sans MS',
  'Courier',
  'Courier New',
  'Garamond',
  'Georgia',
  'Helvetica',
  'Impact',
  'Lucida Console',
  'Lucida Sans Unicode',
  'Palatino Linotype',
  'Roboto Condensed',
  'Tahoma',
  'Times New Roman',
  'Trebuchet MS',
  'Verdana',
  'cursive',
  'fantasy',
  'monospace',
  'sans-serif',
  'serif',
];

interface Props {
  components: Array<Component>;
  handleUpdate: (key: string, value: number | string | boolean | null) => void;
}

const MIXED_VALUE_LABEL = '-';

export const TextEdit = ({ components, handleUpdate }: Props) => {
  const { fonts: rulesetFonts } = useFonts();

  const fontFamily = valueIfAllAreEqual(components, 'fontFamily');
  const fontSize = valueIfAllAreEqual(components, 'fontSize');
  const fontWeight = valueIfAllAreEqual(components, 'fontWeight');
  const fontStyle = valueIfAllAreEqual(components, 'fontStyle');
  const textDecoration = valueIfAllAreEqual(components, 'textDecoration');
  const textAlign = valueIfAllAreEqual(components, 'textAlign');
  const verticalAlign = valueIfAllAreEqual(components, 'verticalAlign');
  const color = valueIfAllAreEqual(components, 'color') as string;

  const isBold = fontWeight === 'bold' || fontWeight === 700;
  const isItalic = fontStyle === 'italic';
  const isStrikethrough = textDecoration === 'line-through';

  return (
    <div className='flex-col w-full flex flex-col gap-3 pb-2 border-b-1'>
      <p className='text-sm'>Text</p>

      <div className='w-full flex flex-col gap-2'>
        <Label className='text-xs'>Font Family</Label>
        <Select
          value={fontFamily !== MIXED_VALUE_LABEL ? (fontFamily as string) : undefined}
          onValueChange={(value) => handleUpdate('fontFamily', value)}
          disabled={fontFamily === MIXED_VALUE_LABEL}>
          <SelectTrigger size='sm' className='w-full'>
            <SelectValue placeholder='Select font' />
          </SelectTrigger>
          <SelectContent>
            {rulesetFonts.length > 0 && (
              <>
                <div className='px-2 py-1.5 text-xs font-semibold text-muted-foreground'>
                  Custom Fonts
                </div>
                {rulesetFonts.map((font) => (
                  <SelectItem key={font.id} value={font.label} style={{ fontFamily: font.label }}>
                    {font.label}
                  </SelectItem>
                ))}
                <div className='px-2 py-1.5 text-xs font-semibold text-muted-foreground'>
                  System Fonts
                </div>
              </>
            )}
            {SYSTEM_FONTS.map((font) => (
              <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                {font}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className='w-full flex flex-row gap-4 items-end'>
        <EditPanelInput
          number={fontSize !== MIXED_VALUE_LABEL}
          disabled={fontSize === MIXED_VALUE_LABEL}
          label='Font Size'
          value={fontSize}
          step={1}
          onChange={(val) => handleUpdate('fontSize', Math.min(200, Math.max(1, parseValue(val))))}
        />
        <button onClick={() => handleUpdate('fontSize', 12)}>S</button>
        <button onClick={() => handleUpdate('fontSize', 18)}>M</button>
        <button onClick={() => handleUpdate('fontSize', 32)}>L</button>
        <button onClick={() => handleUpdate('fontSize', 64)}>XL</button>
      </div>

      <Popover>
        <PopoverTrigger title='Background Color'>
          <Palette
            className={`text-xs h-[18px] w-[18px] cursor-${color !== MIXED_VALUE_LABEL ? 'pointer' : 'not-allowed'}`}
            style={{ color: color }}
          />
        </PopoverTrigger>
        <PopoverContent>
          <SketchPicker
            className='sketch-picker'
            color={color}
            onChange={(color) => handleUpdate('color', color.hex)}
            presetColors={[]}
          />
        </PopoverContent>
      </Popover>

      <div className='w-full flex flex-col gap-2'>
        <Label className='text-xs'>Style</Label>
        <div className='w-full flex flex-row gap-2'>
          <Toggle
            size='sm'
            pressed={isBold}
            disabled={fontWeight === MIXED_VALUE_LABEL}
            onPressedChange={(pressed) => handleUpdate('fontWeight', pressed ? 'bold' : 'normal')}
            aria-label='Bold'>
            <Bold className='h-4 w-4' />
          </Toggle>
          <Toggle
            size='sm'
            pressed={isItalic}
            disabled={fontStyle === MIXED_VALUE_LABEL}
            onPressedChange={(pressed) => handleUpdate('fontStyle', pressed ? 'italic' : 'normal')}
            aria-label='Italic'>
            <Italic className='h-4 w-4' />
          </Toggle>
          <Toggle
            size='sm'
            pressed={isStrikethrough}
            disabled={textDecoration === MIXED_VALUE_LABEL}
            onPressedChange={(pressed) =>
              handleUpdate('textDecoration', pressed ? 'line-through' : 'none')
            }
            aria-label='Strikethrough'>
            <Strikethrough className='h-4 w-4' />
          </Toggle>
        </div>
      </div>

      <div className='w-full flex flex-col gap-2'>
        <Label className='text-xs'>Horizontal Align</Label>
        <ToggleGroup
          type='single'
          size='sm'
          value={textAlign !== MIXED_VALUE_LABEL ? (textAlign as string) : undefined}
          onValueChange={(value) => {
            if (value) handleUpdate('textAlign', value);
          }}
          disabled={textAlign === MIXED_VALUE_LABEL}>
          <ToggleGroupItem value='start' aria-label='Align left'>
            <AlignLeft className='h-4 w-4' />
          </ToggleGroupItem>
          <ToggleGroupItem value='center' aria-label='Align center'>
            <AlignCenter className='h-4 w-4' />
          </ToggleGroupItem>
          <ToggleGroupItem value='end' aria-label='Align right'>
            <AlignRight className='h-4 w-4' />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <div className='w-full flex flex-col gap-2'>
        <Label className='text-xs'>Vertical Align</Label>
        <ToggleGroup
          type='single'
          size='sm'
          value={verticalAlign !== MIXED_VALUE_LABEL ? (verticalAlign as string) : undefined}
          onValueChange={(value) => {
            if (value) handleUpdate('verticalAlign', value);
          }}
          disabled={verticalAlign === MIXED_VALUE_LABEL}>
          <ToggleGroupItem value='start' aria-label='Align top'>
            <AlignVerticalJustifyStart className='h-4 w-4' />
          </ToggleGroupItem>
          <ToggleGroupItem value='center' aria-label='Align middle'>
            <AlignVerticalJustifyCenter className='h-4 w-4' />
          </ToggleGroupItem>
          <ToggleGroupItem value='end' aria-label='Align bottom'>
            <AlignVerticalJustifyEnd className='h-4 w-4' />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
};
