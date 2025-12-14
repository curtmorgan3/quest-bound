import { FormControlLabel } from '@mui/material';
import MUICheckbox, { CheckboxProps as MUICheckboxProps } from '@mui/material/Checkbox';

import type { JSX } from "react";

export type CheckboxProps = MUICheckboxProps & {
  label?: string;
  labelPlacement?: 'bottom' | 'end' | 'start' | 'top';
};

export const Checkbox = ({ label, labelPlacement, ...baseProps }: CheckboxProps): JSX.Element => (
  <FormControlLabel
    label={label}
    labelPlacement={labelPlacement}
    control={<MUICheckbox {...baseProps} />}
  />
);
