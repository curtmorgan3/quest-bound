import MUIIconButton, { IconButtonProps as MUIIconButtonProps } from '@mui/material/IconButton';

import type { JSX } from "react";

export type IconButtonProps = MUIIconButtonProps;

export const IconButton = ({ ...baseProps }: IconButtonProps): JSX.Element => (
  <MUIIconButton {...baseProps} />
);
