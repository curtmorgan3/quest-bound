import MuiBox, { BoxProps as MuiBoxProps } from '@mui/material/Box';
import { forwardRef } from 'react';

export type BoxProps = MuiBoxProps;

export const Box = forwardRef(
  ({ ...baseProps }: BoxProps, ref): JSX.Element => <MuiBox ref={ref} {...baseProps} />,
);
