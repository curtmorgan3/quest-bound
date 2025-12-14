import MUIBackdrop, { BackdropProps as MUIBackdropProps } from '@mui/material/Backdrop';

import type { JSX } from "react";

export type BackdropProps = MUIBackdropProps;

export const Backdrop = ({ ...baseProps }: BackdropProps): JSX.Element => (
  <MUIBackdrop {...baseProps} />
);
