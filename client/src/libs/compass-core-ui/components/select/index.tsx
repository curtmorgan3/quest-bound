import { FormControl, FormHelperText, InputLabel } from '@mui/material';
import MUISelect, { SelectProps as MUISelectProps } from '@mui/material/Select';

import type { JSX } from "react";

export interface SelectProps extends Omit<MUISelectProps, 'size'> {
  id: string;
  helperText?: string;
  ignoreHelperText?: boolean;
  fullWidth?: boolean;
}

export const Select = ({
  id,
  label,
  helperText,
  ignoreHelperText = false,
  fullWidth = false,
  ...baseProps
}: SelectProps): JSX.Element => {
  const textColor = baseProps.disabled
    ? 'text.disabled'
    : baseProps.error
      ? 'error.main'
      : 'inherit';

  return (
    <FormControl fullWidth={fullWidth} sx={{ height: ignoreHelperText ? '40px' : '80px' }}>
      <InputLabel id={`${id}-label`} sx={{ color: textColor }} shrink>
        {label}
      </InputLabel>
      <MUISelect
        id={id}
        labelId={`${id}-label`}
        size='small'
        sx={{ ...baseProps.sx }}
        {...baseProps}
      />
      {!ignoreHelperText && <FormHelperText sx={{ color: textColor }}>{helperText}</FormHelperText>}
    </FormControl>
  );
};
