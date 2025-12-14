import MUIToggleButton, {
  ToggleButtonProps as MUIToggleButtonProps,
} from '@mui/material/ToggleButton';
import MUIToggleButtonGroup, {
  ToggleButtonGroupProps as MUIGroupProps,
} from '@mui/material/ToggleButtonGroup';

import type { JSX } from "react";

export type ToggleButtonProps = MUIToggleButtonProps;
export type ToggleButtonGroupProps = MUIGroupProps;

export const ToggleButton = ({ ...baseProps }: ToggleButtonProps): JSX.Element => (
  <MUIToggleButton {...baseProps} />
);

export const ToggleButtonGroup = ({ ...baseProps }: ToggleButtonGroupProps): JSX.Element => (
  <MUIToggleButtonGroup {...baseProps} />
);
