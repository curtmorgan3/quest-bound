import MUIStack, { StackProps as MUIStackProps } from '@mui/material/Stack';
import { forwardRef } from 'react';

export type StackProps = MUIStackProps;

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  ({ ...baseProps }, ref): JSX.Element => <MUIStack ref={ref} {...baseProps} />,
);
