import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useActiveRuleset } from '@/lib/compass-api';
import { ComponentEditPanelContext } from '@/pages/ruleset/windows/component-edit-panel/component-edit-panel-context';
import { CustomPropertiesListModal } from '@/pages/ruleset/windows/component-edit-panel/custom-properties-list-modal';
import { colorWhite } from '@/palette';
import { Palette, SlidersHorizontal } from 'lucide-react';
import { useContext, useState } from 'react';
import type { RGBColor } from 'react-color';

/** Parse rgba(r,g,b,a) or #hex to #rrggbb for native color input. */
function colorToHex(color: string | undefined): string {
  if (!color || typeof color !== 'string') return '#000000';
  const s = color.trim();
  const hexMatch = s.match(/^#([0-9A-Fa-f]{6})$/);
  if (hexMatch) return hexMatch[0];
  const rgbaMatch = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbaMatch) {
    const r = Math.min(255, Math.max(0, parseInt(rgbaMatch[1], 10)));
    const g = Math.min(255, Math.max(0, parseInt(rgbaMatch[2], 10)));
    const b = Math.min(255, Math.max(0, parseInt(rgbaMatch[3], 10)));
    return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('');
  }
  return '#000000';
}

/** Parse alpha from rgba(r,g,b,a), else 1. */
function colorToAlpha(color: string | undefined): number {
  if (!color || typeof color !== 'string') return 1;
  const match = color.trim().match(/rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
  return match ? Math.min(1, Math.max(0, parseFloat(match[1]))) : 1;
}

function hexToRgb(hex: string, a = 1): RGBColor {
  const match = hex.replace(/^#/, '').match(/(.{2})(.{2})(.{2})/);
  if (!match) return { r: 0, g: 0, b: 0, a };
  return {
    r: parseInt(match[1], 16),
    g: parseInt(match[2], 16),
    b: parseInt(match[3], 16),
    a,
  };
}

interface RulesetColorPicker {
  color?: string;
  label?: string;
  asIcon?: boolean;
  disabled?: boolean;
  onUpdate: (color: RGBColor) => void;
  disableAlpha?: boolean;
}

export const RulesetColorPicker = ({
  color,
  label,
  asIcon,
  disabled,
  onUpdate,
}: RulesetColorPicker) => {
  const { activeRuleset } = useActiveRuleset();
  const palette = activeRuleset?.palette ?? [];
  const [customPropsModalOpen, setCustomPropsModalOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const panelContext = useContext(ComponentEditPanelContext);

  const openCustomPropertiesModal = () => {
    if (panelContext?.openCustomPropertiesModal) {
      panelContext.openCustomPropertiesModal();
    } else {
      setCustomPropsModalOpen(true);
    }
  };

  const currentHex = colorToHex(color);
  const opacity = colorToAlpha(color);

  const handleColorChange = (hex: string) => {
    onUpdate(hexToRgb(hex, opacity));
  };

  const handleOpacityChange = (a: number) => {
    onUpdate(hexToRgb(currentHex, a));
  };

  const pickerContent = (
    <div className='flex flex-col gap-4'>
      <DialogTitle className='text-base'>{label ?? 'Color'}</DialogTitle>
      <div className='flex flex-col gap-3'>
        <div className='flex items-center gap-2'>
          <input
            type='color'
            value={currentHex}
            onChange={(e) => handleColorChange(e.target.value)}
            className='h-10 flex-1 min-w-0 cursor-pointer rounded border border-border bg-transparent p-0'
            aria-label={label ?? 'Color'}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type='button'
                variant='outline'
                size='icon'
                className='size-10 rounded shrink-0'
                aria-label={label ?? 'Color'}
                onClick={openCustomPropertiesModal}>
                <SlidersHorizontal className='size-4' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{label ?? 'Color'}</TooltipContent>
          </Tooltip>
        </div>
        <div className='flex flex-col gap-2'>
          <Label className='text-xs'>Opacity</Label>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[Math.round(opacity * 100)]}
            onValueChange={(v) => handleOpacityChange((v[0] ?? 100) / 100)}
            aria-label='Opacity'
          />
        </div>
        {palette.length > 0 && (
          <div className='flex flex-wrap gap-1.5'>
            {palette.map((swatch, i) => {
              const hex = colorToHex(swatch);
              return (
                <button
                  key={`${hex}-${i}`}
                  type='button'
                  className='size-8 shrink-0 rounded border border-border shadow-sm transition-transform hover:scale-110'
                  style={{ backgroundColor: hex }}
                  aria-label={`Pick ${hex}`}
                  onClick={() => handleColorChange(hex)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  if (asIcon) {
    return (
      <>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <button
              type='button'
              title={label ?? 'Color'}
              disabled={disabled}
              className='rounded p-0.5 disabled:opacity-50'>
              <Palette
                className='text-xs h-[18px] w-[18px] cursor-pointer'
                color={colorWhite}
              />
            </button>
          </DialogTrigger>
          <DialogContent>{pickerContent}</DialogContent>
        </Dialog>
        {!panelContext && (
          <CustomPropertiesListModal
            open={customPropsModalOpen}
            onOpenChange={setCustomPropsModalOpen}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <button
            type='button'
            className='h-8 w-full rounded border border-border shadow-sm'
            style={{ backgroundColor: currentHex }}
            aria-label={label ?? 'Color'}
          />
        </DialogTrigger>
        <DialogContent>{pickerContent}</DialogContent>
      </Dialog>
      {!panelContext && (
        <CustomPropertiesListModal
          open={customPropsModalOpen}
          onOpenChange={setCustomPropsModalOpen}
        />
      )}
    </>
  );
};
