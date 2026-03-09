import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useActiveRuleset, useCustomProperties } from '@/lib/compass-api';
import { ComponentEditPanelContext } from '@/pages/ruleset/windows/component-edit-panel/component-edit-panel-context';
import { CustomPropertiesListModal } from '@/pages/ruleset/windows/component-edit-panel/custom-properties-list-modal';
import { SlidersHorizontal, X } from 'lucide-react';
import { useContext, useEffect, useState } from 'react';
import type { RGBColor } from 'react-color';

const CUSTOM_PROP_PREFIX = 'custom-prop-';

function isCustomPropValue(value: string | undefined): value is string {
  return typeof value === 'string' && value.startsWith(CUSTOM_PROP_PREFIX);
}

function isLinearGradient(value: string | undefined): value is string {
  return typeof value === 'string' && value.trim().startsWith('linear-gradient(');
}

/** Parse linear-gradient(angle deg, color1, color2). Returns null if not a valid gradient. */
function parseLinearGradient(
  value: string,
): { angle: number; color1: string; color2: string } | null {
  const s = value.trim();
  if (!s.startsWith('linear-gradient(')) return null;
  const inner = s.slice('linear-gradient('.length, -1).trim();
  const color2Match = inner.match(/,\s*([^,)]+)\s*$/);
  if (!color2Match) return null;
  const color2 = color2Match[1].trim();
  const rest = inner.slice(0, color2Match.index).trim();
  const angleMatch = rest.match(/^(\d+)\s*deg\s*,\s*(.+)$/);
  if (!angleMatch) return null;
  return {
    angle: Math.min(360, Math.max(0, parseInt(angleMatch[1], 10))),
    color1: angleMatch[2].trim(),
    color2,
  };
}

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

export type RulesetColorPickerValue = RGBColor | string;

interface RulesetColorPicker {
  color?: string;
  /** When style is bound to a custom property (color is 'custom-prop-<id>'), use this for the displayed swatch and picker. */
  resolvedColor?: string;
  label?: string;
  disabled?: boolean;
  /** Called with RGBColor for solid colors, or gradient string (e.g. "linear-gradient(90deg, red, blue)") for gradients. */
  onUpdate: (value: RulesetColorPickerValue) => void;
  disableAlpha?: boolean;
  propertyKey?: string;
  showLabel?: boolean;
  /** When true, shows a solid/gradient toggle and gradient controls (angle + two colors). Only for backgroundColor and color. */
  allowGradient?: boolean;
}

export const RulesetColorPicker = ({
  color,
  resolvedColor,
  label,
  disabled,
  onUpdate,
  propertyKey,
  showLabel,
  disableAlpha,
  allowGradient = false,
}: RulesetColorPicker) => {
  const { activeRuleset } = useActiveRuleset();
  const { customProperties } = useCustomProperties(activeRuleset?.id);
  const palette = activeRuleset?.palette ?? [];
  const [customPropsModalOpen, setCustomPropsModalOpen] = useState(false);
  const [gradientCustomPropSlot, setGradientCustomPropSlot] = useState<1 | 2 | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const panelContext = useContext(ComponentEditPanelContext);

  const displayColor = resolvedColor ?? color;
  const isGradient = allowGradient && isLinearGradient(displayColor);
  const parsedGradient = isGradient ? parseLinearGradient(displayColor) : null;
  const parsedGradientRaw = isGradient && color ? parseLinearGradient(color) : null;
  const gradientColor1IsCustomProp = !!parsedGradientRaw && isCustomPropValue(parsedGradientRaw.color1);
  const gradientColor2IsCustomProp = !!parsedGradientRaw && isCustomPropValue(parsedGradientRaw.color2);
  const gradientColor1CustomPropId = gradientColor1IsCustomProp
    ? parsedGradientRaw!.color1.slice(CUSTOM_PROP_PREFIX.length)
    : '';
  const gradientColor2CustomPropId = gradientColor2IsCustomProp
    ? parsedGradientRaw!.color2.slice(CUSTOM_PROP_PREFIX.length)
    : '';
  const gradientColor1CustomProp = customProperties.find((p) => p.id === gradientColor1CustomPropId);
  const gradientColor2CustomProp = customProperties.find((p) => p.id === gradientColor2CustomPropId);

  const [mode, setMode] = useState<'solid' | 'gradient'>(() => (isGradient ? 'gradient' : 'solid'));
  const [gradientAngle, setGradientAngle] = useState(() => {
    const p = color ? parseLinearGradient(color) : parsedGradient;
    return p?.angle ?? 90;
  });
  const [gradientColor1, setGradientColor1] = useState(() => {
    const p = color ? parseLinearGradient(color) : parsedGradient;
    if (!p) return '#ff0000';
    return isCustomPropValue(p.color1) ? p.color1 : colorToHex(p.color1);
  });
  const [gradientColor2, setGradientColor2] = useState(() => {
    const p = color ? parseLinearGradient(color) : parsedGradient;
    if (!p) return '#0000ff';
    return isCustomPropValue(p.color2) ? p.color2 : colorToHex(p.color2);
  });

  useEffect(() => {
    if (dialogOpen && isGradient && mode === 'gradient') {
      const p = parseLinearGradient(color ?? displayColor);
      if (p) {
        setGradientAngle(p.angle);
        setGradientColor1(isCustomPropValue(p.color1) ? p.color1 : colorToHex(p.color1));
        setGradientColor2(isCustomPropValue(p.color2) ? p.color2 : colorToHex(p.color2));
      }
    }
  }, [dialogOpen, isGradient, mode, color, displayColor]);

  const showCustomPropPill = isCustomPropValue(color);
  const customPropId = showCustomPropPill ? color.slice(CUSTOM_PROP_PREFIX.length) : '';

  const customProp = customProperties.find((p) => p.id === customPropId);

  const customPropLabel = showCustomPropPill ? customProp?.label : '';

  // If we have a custom prop ID but the prop was deleted/missing, reset to black.
  // Only clear when we know the list has loaded (non-empty) and the prop is missing;
  // otherwise we might clear during initial load when customProperties is still [].
  useEffect(() => {
    if (showCustomPropPill && customPropId && customProperties.length > 0 && !customProp) {
      onUpdate({ r: 0, g: 0, b: 0, a: 1 });
    }
  }, [showCustomPropPill, customPropId, customProperties.length, customProp, onUpdate]);

  const openCustomPropertiesModal = () => {
    if (panelContext?.openCustomPropertiesModal) {
      panelContext.openCustomPropertiesModal(propertyKey);
    } else {
      setCustomPropsModalOpen(true);
    }
  };

  const currentHex = colorToHex(displayColor);
  const opacity = colorToAlpha(displayColor);

  const handleColorChange = (hex: string) => {
    onUpdate(hexToRgb(hex, opacity));
  };

  const handleOpacityChange = (a: number) => {
    onUpdate(hexToRgb(currentHex, a));
  };

  const handleGradientUpdate = () => {
    const gradientStr = `linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${gradientColor2})`;
    onUpdate(gradientStr);
  };

  const handleGradientAngleChange = (angle: number) => {
    setGradientAngle(angle);
    onUpdate(`linear-gradient(${angle}deg, ${gradientColor1}, ${gradientColor2})`);
  };

  const handleGradientColor1Change = (hex: string) => {
    setGradientColor1(hex);
    onUpdate(`linear-gradient(${gradientAngle}deg, ${hex}, ${gradientColor2})`);
  };

  const handleGradientColor2Change = (hex: string) => {
    setGradientColor2(hex);
    onUpdate(`linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${hex})`);
  };

  const openGradientColorCustomPropModal = (slot: 1 | 2) => {
    if (panelContext?.openCustomPropertiesModal && propertyKey) {
      panelContext.openCustomPropertiesModal(propertyKey, (customPropertyId) => {
        const customPropValue = `${CUSTOM_PROP_PREFIX}${customPropertyId}`;
        if (slot === 1) {
          setGradientColor1(customPropValue);
          onUpdate(`linear-gradient(${gradientAngle}deg, ${customPropValue}, ${gradientColor2})`);
        } else {
          setGradientColor2(customPropValue);
          onUpdate(`linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${customPropValue})`);
        }
      });
    } else if (propertyKey) {
      setGradientCustomPropSlot(slot);
      setCustomPropsModalOpen(true);
    }
  };

  const clearGradientColorCustomProp = (slot: 1 | 2) => {
    const fallbackHex = slot === 1 ? '#ff0000' : '#0000ff';
    if (slot === 1) {
      setGradientColor1(fallbackHex);
      onUpdate(`linear-gradient(${gradientAngle}deg, ${fallbackHex}, ${gradientColor2})`);
    } else {
      setGradientColor2(fallbackHex);
      onUpdate(`linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${fallbackHex})`);
    }
  };

  const swatchGradientColors =
    mode === 'gradient'
      ? [
          gradientColor1IsCustomProp ? colorToHex(parsedGradient?.color1) : gradientColor1,
          gradientColor2IsCustomProp ? colorToHex(parsedGradient?.color2) : gradientColor2,
        ]
      : null;
  const swatchStyle =
    mode === 'gradient' && swatchGradientColors
      ? {
          background: `linear-gradient(${gradientAngle}deg, ${swatchGradientColors[0]}, ${swatchGradientColors[1]})`,
        }
      : { backgroundColor: currentHex };

  const pickerContent = (
    <div className='flex flex-col gap-4'>
      <DialogTitle className='text-base'>{label ?? 'Color'}</DialogTitle>
      <DialogDescription>{label ?? 'Color'}</DialogDescription>
      <div className='flex flex-col gap-3'>
        {allowGradient && (
          <div className='flex gap-2'>
            <Button
              type='button'
              variant={mode === 'solid' ? 'outline' : 'ghost'}
              size='sm'
              className='flex-1'
              onClick={() => {
                setMode('solid');
                const hex = isGradient ? gradientColor1 : colorToHex(displayColor);
                onUpdate(hexToRgb(hex, opacity));
              }}>
              Solid
            </Button>
            <Button
              type='button'
              variant={mode === 'gradient' ? 'outline' : 'ghost'}
              size='sm'
              className='flex-1'
              onClick={() => {
                setMode('gradient');
                handleGradientUpdate();
              }}>
              Gradient
            </Button>
          </div>
        )}
        {mode === 'solid' ? (
          <>
            <div className='flex items-center gap-2'>
              <input
                type='color'
                value={currentHex}
                onChange={(e) => handleColorChange(e.target.value)}
                className='h-10 flex-1 min-w-0 cursor-pointer rounded border border-border bg-transparent p-0'
                aria-label={label ?? 'Color'}
              />
              {!!propertyKey && (
                <Button
                  type='button'
                  variant='outline'
                  size='icon'
                  className='size-10 rounded shrink-0'
                  aria-label={label ?? 'Color'}
                  onClick={openCustomPropertiesModal}>
                  <SlidersHorizontal className='size-4' />
                </Button>
              )}
            </div>
            {!disableAlpha && (
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
            )}
          </>
        ) : (
          <div className='flex flex-col gap-3'>
            <div className='flex flex-col gap-2'>
              <Label className='text-xs'>Angle</Label>
              <input
                type='number'
                min={0}
                max={360}
                value={gradientAngle}
                onChange={(e) =>
                  handleGradientAngleChange(
                    Math.min(360, Math.max(0, parseInt(e.target.value, 10) || 0)),
                  )
                }
                className='h-10 w-full rounded border border-border bg-transparent px-3 py-2 text-sm'
                aria-label='Gradient angle'
              />
            </div>
            <div className='flex flex-col gap-2'>
              <Label className='text-xs'>Color 1</Label>
              {gradientColor1IsCustomProp ? (
                <div className='flex h-[40px] items-center gap-1 rounded-[4px] border border-border bg-muted/50 px-1.5'>
                  <span
                    className='min-w-0 flex-1 truncate text-xs'
                    title={gradientColor1CustomProp?.label ?? 'unknown'}>
                    {gradientColor1CustomProp?.label ?? 'unknown'}
                  </span>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='size-4 shrink-0 rounded'
                    aria-label='Remove custom property'
                    disabled={disabled}
                    onClick={() => clearGradientColorCustomProp(1)}>
                    <X className='size-3' />
                  </Button>
                </div>
              ) : (
                <div className='flex items-center gap-2'>
                  <input
                    type='color'
                    value={colorToHex(gradientColor1)}
                    onChange={(e) => handleGradientColor1Change(e.target.value)}
                    className='h-10 flex-1 min-w-0 cursor-pointer rounded border border-border bg-transparent p-0'
                    aria-label='Gradient color 1'
                  />
                  {!!propertyKey && (
                    <Button
                      type='button'
                      variant='outline'
                      size='icon'
                      className='size-10 rounded shrink-0'
                      aria-label='Assign custom property to gradient color 1'
                      onClick={() => openGradientColorCustomPropModal(1)}>
                      <SlidersHorizontal className='size-4' />
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className='flex flex-col gap-2'>
              <Label className='text-xs'>Color 2</Label>
              {gradientColor2IsCustomProp ? (
                <div className='flex h-[40px] items-center gap-1 rounded-[4px] border border-border bg-muted/50 px-1.5'>
                  <span
                    className='min-w-0 flex-1 truncate text-xs'
                    title={gradientColor2CustomProp?.label ?? 'unknown'}>
                    {gradientColor2CustomProp?.label ?? 'unknown'}
                  </span>
                  <Button
                    type='button'
                    variant='ghost'
                    size='icon'
                    className='size-4 shrink-0 rounded'
                    aria-label='Remove custom property'
                    disabled={disabled}
                    onClick={() => clearGradientColorCustomProp(2)}>
                    <X className='size-3' />
                  </Button>
                </div>
              ) : (
                <div className='flex items-center gap-2'>
                  <input
                    type='color'
                    value={colorToHex(gradientColor2)}
                    onChange={(e) => handleGradientColor2Change(e.target.value)}
                    className='h-10 flex-1 min-w-0 cursor-pointer rounded border border-border bg-transparent p-0'
                    aria-label='Gradient color 2'
                  />
                  {!!propertyKey && (
                    <Button
                      type='button'
                      variant='outline'
                      size='icon'
                      className='size-10 rounded shrink-0'
                      aria-label='Assign custom property to gradient color 2'
                      onClick={() => openGradientColorCustomPropModal(2)}>
                      <SlidersHorizontal className='size-4' />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
        {mode === 'solid' && palette.length > 0 && (
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

  const smallLabel = (
    <span
      className='text-[10px] w-[50px] leading-none text-muted-foreground'
      style={{ textAlign: 'center' }}>
      {label ?? 'Color'}
    </span>
  );

  return (
    <>
      {showCustomPropPill ? (
        <div className='flex flex-col gap-0.5 items-center'>
          {showLabel && smallLabel}
          <div className='flex h-[20px] items-center gap-1 rounded-[4px] border border-border bg-muted/50 px-1.5'>
            <span className='min-w-0 flex-1 truncate text-xs' title={customPropLabel ?? 'unknown'}>
              {customPropLabel ?? 'unknown'}
            </span>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              className='size-4 shrink-0 rounded'
              aria-label='Remove custom property'
              disabled={disabled}
              onClick={() => onUpdate({ r: 0, g: 0, b: 0, a: 1 })}>
              <X className='size-3' />
            </Button>
          </div>
        </div>
      ) : (
        <div className='flex flex-col gap-0.5 items-center'>
          {showLabel && smallLabel}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <button
                type='button'
                disabled={disabled}
                className='h-8 w-full clickable rounded border border-border shadow-sm disabled:opacity-50'
                style={{ ...swatchStyle, height: 30, width: 30 }}
                aria-label={label ?? 'Color'}
              />
            </DialogTrigger>
            <DialogContent>{pickerContent}</DialogContent>
          </Dialog>
        </div>
      )}
      {!panelContext && (
        <CustomPropertiesListModal
          open={customPropsModalOpen}
          onOpenChange={(open) => {
            setCustomPropsModalOpen(open);
            if (!open) setGradientCustomPropSlot(null);
          }}
          onSelect={(customPropertyId) => {
            if (gradientCustomPropSlot && propertyKey) {
              const customPropValue = `${CUSTOM_PROP_PREFIX}${customPropertyId}`;
              if (gradientCustomPropSlot === 1) {
                setGradientColor1(customPropValue);
                onUpdate(
                  `linear-gradient(${gradientAngle}deg, ${customPropValue}, ${gradientColor2})`,
                );
              } else {
                setGradientColor2(customPropValue);
                onUpdate(
                  `linear-gradient(${gradientAngle}deg, ${gradientColor1}, ${customPropValue})`,
                );
              }
            }
            setCustomPropsModalOpen(false);
            setGradientCustomPropSlot(null);
          }}
        />
      )}
    </>
  );
};
