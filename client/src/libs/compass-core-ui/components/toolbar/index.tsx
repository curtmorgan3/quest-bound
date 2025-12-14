import MUIToolbar, { ToolbarProps as MUIToolbarProps } from '@mui/material/Toolbar';

import type { JSX } from "react";

export type ToolbarProps = MUIToolbarProps;

export const Toolbar = ({ ...baseProps }: MUIToolbarProps): JSX.Element => (
  <MUIToolbar {...baseProps} />
);
