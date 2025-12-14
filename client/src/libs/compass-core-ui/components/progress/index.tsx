import MUIProgress, { LinearProgressProps } from '@mui/material/LinearProgress';

import type { JSX } from "react";

export type ProgressProps = LinearProgressProps;

export const Progress = ({ ...baseProps }: ProgressProps): JSX.Element => (
  <MUIProgress {...baseProps} />
);
