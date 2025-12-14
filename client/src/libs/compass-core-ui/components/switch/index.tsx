import { FormControl, FormControlLabel } from '@mui/material';
import MUISwitch, { SwitchProps as MUISwitchProps } from '@mui/material/Switch';

import type { JSX } from "react";

export type SwitchProps = MUISwitchProps & {
  label?: string;
  labelPlacement?: 'top' | 'bottom' | 'start' | 'end';
  fullWidth?: boolean;
};

export const Switch = ({
  label,
  labelPlacement,
  fullWidth = false,
  ...baseProps
}: SwitchProps): JSX.Element => (
  <FormControl fullWidth={fullWidth}>
    <FormControlLabel
      label={label}
      labelPlacement={labelPlacement}
      value={baseProps.value}
      control={<MUISwitch {...baseProps} />}
    />
  </FormControl>
);
