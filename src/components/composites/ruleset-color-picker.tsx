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
}

export const RulesetColorPicker = ({
  color,
  label,
  asIcon,
  disabled,
  onUpdate,
}: RulesetColorPicker) => {
  const { activeRuleset } = useActiveRuleset();
  console.log(activeRuleset);

  if (asIcon) {
    return (
      <Popover>
        <PopoverTrigger title={label ?? 'Color'} disabled={disabled}>
          <Palette className={`text-xs h-[18px] w-[18px] cursor-pointer`} color={colorWhite} />
        </PopoverTrigger>
        <PopoverContent>
          <SketchPicker
            className='sketch-picker'
            color={color}
            onChange={(color) => onUpdate(color.rgb)}
            presetColors={[]}
          />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <SketchPicker
      className='sketch-picker'
      color={color}
      onChange={(color) => onUpdate(color.rgb)}
      presetColors={[]}
    />
  );
};
