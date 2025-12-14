import { useState, type JSX } from 'react';
import { Button, Input, Slider, Stack, Text } from '../components';

interface MinMaxSliderProps {
  label: string;
  name: string;
  onChange: (val: number[]) => void;
  value: number[];
  step?: number;
  min?: number;
  max?: number;
  minInput?: boolean;
  maxInput?: boolean;
}

export const MinMaxSlider = ({
  label,
  onChange,
  value,
  step = 1,
  name,
  min = 0,
  max = 500,
  minInput = false,
  maxInput = false,
}: MinMaxSliderProps): JSX.Element => {
  const [showInput, setShowInput] = useState<boolean>(false);

  return (
    <Stack>
      <Stack direction='row' alignItems='center' justifyContent='space-between'>
        <Text variant='subtitle2'>{label}</Text>

        {(minInput || maxInput) && (
          <Button onClick={() => setShowInput(!showInput)}>
            {showInput ? 'Hide' : 'Enter Manually'}
          </Button>
        )}
      </Stack>

      {showInput && (
        <Stack direction='row' justifyContent='space-between'>
          {minInput && (
            <Input
              value={value[0].toString()}
              onChange={(e) => onChange([Math.max(parseFloat(e.target.value), min), value[1]])}
              id='min-max-slider-min-input'
              type='number'
              label='Min'
              sx={{ maxWidth: '100px' }}
            />
          )}
          {maxInput && (
            <Input
              value={value[1].toString()}
              onChange={(e) => onChange([value[0], Math.min(parseFloat(e.target.value), max)])}
              id='min-max-slider-min-input'
              type='number'
              label='Max'
              sx={{ maxWidth: '100px' }}
            />
          )}
        </Stack>
      )}

      <Stack spacing={1}>
        <Slider
          min={min}
          max={max}
          name={name}
          step={step}
          disableSwap
          valueLabelDisplay='auto'
          color='secondary'
          value={value}
          onChange={(_, val) => onChange(val as number[])}
        />
      </Stack>
    </Stack>
  );
};
