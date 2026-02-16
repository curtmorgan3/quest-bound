import { Popover } from '@/components/ui/popover';
import { useActiveRuleset } from '@/lib/compass-api';
import { colorWhite } from '@/palette';
import { PopoverContent, PopoverTrigger } from '@radix-ui/react-popover';
import { Palette } from 'lucide-react';
import { SketchPicker, type RGBColor } from 'react-color';

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
  disableAlpha,
}: RulesetColorPicker) => {
  const { activeRuleset } = useActiveRuleset();
  const palette = activeRuleset?.palette ?? [];

  if (asIcon) {
    return (
      <Popover>
        <PopoverTrigger title={label ?? 'Color'} disabled={disabled}>
          <Palette className={`text-xs h-[18px] w-[18px] cursor-pointer`} color={colorWhite} />
        </PopoverTrigger>
        <PopoverContent>
          <SketchPicker
            disableAlpha={disableAlpha}
            className='sketch-picker'
            color={color}
            onChange={(color) => onUpdate(color.rgb)}
            presetColors={palette}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <SketchPicker
      disableAlpha={disableAlpha}
      className='sketch-picker'
      color={color}
      onChange={(color) => onUpdate(color.rgb)}
      presetColors={palette}
    />
  );
};
