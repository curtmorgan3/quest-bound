import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getComponentData } from '@/lib/compass-planes/utils';
import type { Component, ComponentStyle, GroupLayoutMode } from '@/types';
import { EditPanelInput } from './component-edit-panel-input';
import { parseValue } from './utils';

interface Props {
  component: Component;
  handleStyleUpdate: (key: string | string[], value: number | string | boolean | null) => void;
  handleDataUpdate: (key: string, value: string | boolean) => void;
}

function parseStyle(component: Component): ComponentStyle {
  try {
    return JSON.parse(component.style) as ComponentStyle;
  } catch {
    return {} as ComponentStyle;
  }
}

const DEFAULT_FLEX: Pick<
  ComponentStyle,
  'flexDirection' | 'flexWrap' | 'gap' | 'alignItems' | 'justifyContent'
> = {
  flexDirection: 'row',
  flexWrap: 'nowrap',
  gap: 8,
  alignItems: 'stretch',
  justifyContent: 'flex-start',
};

const DIRECTION_OPTIONS: { value: string; label: string }[] = [
  { value: 'row', label: 'Row' },
  { value: 'column', label: 'Column' },
  { value: 'row-reverse', label: 'Row reverse' },
  { value: 'column-reverse', label: 'Column reverse' },
];

const ALIGN_OPTIONS: Array<{
  value: NonNullable<ComponentStyle['alignItems']>;
  label: string;
}> = [
  { value: 'flex-start', label: 'Start' },
  { value: 'flex-end', label: 'End' },
  { value: 'center', label: 'Center' },
  { value: 'stretch', label: 'Stretch' },
  { value: 'baseline', label: 'Baseline' },
];

const JUSTIFY_OPTIONS: Array<{
  value: NonNullable<ComponentStyle['justifyContent']>;
  label: string;
}> = [
  { value: 'flex-start', label: 'Start' },
  { value: 'flex-end', label: 'End' },
  { value: 'center', label: 'Center' },
  { value: 'space-between', label: 'Space between' },
  { value: 'space-around', label: 'Space around' },
  { value: 'space-evenly', label: 'Space evenly' },
];

export function GroupStyleEdit({ component, handleStyleUpdate, handleDataUpdate }: Props) {
  const data = getComponentData(component);
  const layoutMode = (data.layoutMode ?? 'absolute') as GroupLayoutMode;
  const isFlex = layoutMode === 'flex';
  const shareHoverPressed = data.shareHoverPressedWithGroup !== false;

  const s = parseStyle(component);
  const flexDirection = s.flexDirection ?? DEFAULT_FLEX.flexDirection!;
  const flexWrap = s.flexWrap ?? DEFAULT_FLEX.flexWrap!;
  const gap = s.gap ?? DEFAULT_FLEX.gap!;
  const alignItems = s.alignItems ?? DEFAULT_FLEX.alignItems!;
  const justifyContent = s.justifyContent ?? DEFAULT_FLEX.justifyContent!;

  const wrapChecked = flexWrap !== 'nowrap';

  return (
    <div className='flex w-full flex-col gap-3'>
      <div className='flex flex-col gap-1.5'>
        <Label className='text-xs text-muted-foreground'>Group Layout</Label>
        <Select value={layoutMode} onValueChange={(v) => handleDataUpdate('layoutMode', v)}>
          <SelectTrigger className='h-[26px] w-full max-w-[220px]'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='absolute'>Absolute</SelectItem>
            <SelectItem value='flex'>Flex</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className='flex flex-col gap-1.5'>
        <Label className='text-xs text-muted-foreground'>Overflow</Label>
        <Select
          value={s.overflow ?? 'visible'}
          onValueChange={(v) => handleStyleUpdate('overflow', v)}>
          <SelectTrigger className='h-[26px] w-full max-w-[220px]'>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='visible'>Visible</SelectItem>
            <SelectItem value='hidden'>Hidden</SelectItem>
            <SelectItem value='scroll'>Scroll</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isFlex ? (
        <div className='flex flex-col gap-3'>
          <div className='flex flex-col gap-1.5'>
            <Label className='text-xs text-muted-foreground'>Direction</Label>
            <Select
              value={flexDirection}
              onValueChange={(v) => handleStyleUpdate('flexDirection', v)}>
              <SelectTrigger className='h-[26px] w-full max-w-[220px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DIRECTION_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='flex flex-row items-center gap-2'>
            <Checkbox
              id='group-flex-wrap'
              checked={wrapChecked}
              onCheckedChange={(checked) => {
                if (checked === 'indeterminate') return;
                handleStyleUpdate('flexWrap', checked ? 'wrap' : 'nowrap');
              }}
            />
            <Label htmlFor='group-flex-wrap' className='text-sm font-normal cursor-pointer'>
              Wrap
            </Label>
          </div>

          <EditPanelInput
            number
            label='Gap'
            width='80px'
            value={gap}
            step={1}
            onChange={(val) =>
              handleStyleUpdate('gap', Math.min(200, Math.max(0, parseValue(val))))
            }
          />

          <div className='flex flex-col gap-1.5'>
            <Label className='text-xs text-muted-foreground'>Align items</Label>
            <Select value={alignItems} onValueChange={(v) => handleStyleUpdate('alignItems', v)}>
              <SelectTrigger className='h-[26px] w-full max-w-[220px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALIGN_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className='flex flex-col gap-1.5'>
            <Label className='text-xs text-muted-foreground'>Justify content</Label>
            <Select
              value={justifyContent}
              onValueChange={(v) => handleStyleUpdate('justifyContent', v)}>
              <SelectTrigger className='h-[26px] w-full max-w-[220px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JUSTIFY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : null}

      <div className='flex flex-row items-center gap-2 pt-0.5'>
        <Checkbox
          id='group-share-hover-pressed'
          checked={shareHoverPressed}
          onCheckedChange={(checked) => {
            if (checked === 'indeterminate') return;
            handleDataUpdate('shareHoverPressedWithGroup', checked === true);
          }}
        />
        <Label htmlFor='group-share-hover-pressed' className='text-xs font-normal cursor-pointer'>
          Share hover and pressed state events
        </Label>
      </div>
    </div>
  );
}
