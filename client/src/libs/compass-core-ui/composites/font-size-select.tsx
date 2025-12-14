import {
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
} from '@chakra-ui/react';
import { useState, type JSX } from 'react';

export const DEFAULT_FONT_FAMILY = 'Roboto Condensed';

export const FontSizes = [
  '10px',
  '12px',
  '14px',
  '16px',
  '20px',
  '24px',
  '28px',
  '32px',
  '40px',
  '48px',
  '64px',
  '96px',
];

export function FontSizeSelect({
  onChange,
  value,
  disabled = false,
  onFocus,
  onBlur,
}: {
  onChange: (value: number) => void;
  value: number;
  disabled?: boolean;
  onFocus?: () => void;
  onBlur?: () => void;
}): JSX.Element {
  const ariaLabel = 'Formatting options for font size';
  const [overrideValue, setOverrideValue] = useState<boolean>(false);

  const handleChange = (value: string) => {
    const size = parseInt(value);
    if (isNaN(size)) {
      setOverrideValue(true);
    } else {
      setOverrideValue(false);
      onChange?.(size);
    }
  };

  return (
    <NumberInput
      value={overrideValue ? undefined : value}
      onChange={(value) => handleChange(value)}>
      <NumberInputField
        onFocus={onFocus}
        onBlur={onBlur}
        disabled={disabled}
        aria-label={ariaLabel}
        sx={{ width: '80px', backgroundColor: '#42403D' }}
      />
      <NumberInputStepper>
        <NumberIncrementStepper />
        <NumberDecrementStepper />
      </NumberInputStepper>
    </NumberInput>
  );
}
