import MUIButton, { ButtonProps as MUIButtonProps } from '@mui/material/Button';
import { Loader } from '../loader';

import type { JSX } from "react";

export interface ButtonProps extends MUIButtonProps {
  loading?: boolean;
  target?: string;
}

export const Button = ({ loading, ...baseProps }: ButtonProps): JSX.Element => (
  <MUIButton {...baseProps} disabled={baseProps.disabled || loading}>
    {loading ? (
      <Loader
        color={baseProps.color}
        sx={{ height: '30px !important', width: '30px !important' }}
      />
    ) : (
      baseProps.children
    )}
  </MUIButton>
);
