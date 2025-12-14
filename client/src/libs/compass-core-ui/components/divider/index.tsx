import MUIDivider, { DividerProps as MUIDividerProps } from '@mui/material/Divider';

import type { JSX } from "react";

export type DividerProps = MUIDividerProps;

export const Divider = ({ ...baseProps }: DividerProps): JSX.Element => (
  <MUIDivider {...baseProps} />
);
