import MUITooltip, { TooltipProps as MUITooltipProps } from '@mui/material/Tooltip';
import { forwardRef, type JSX } from 'react';

// export { Tooltip };

export type TooltipProps = MUITooltipProps;

export const Tooltip = forwardRef(
  ({ ...baseProps }: TooltipProps, ref): JSX.Element => (
    <MUITooltip {...baseProps} ref={ref}>
      <div>{baseProps.children}</div>
    </MUITooltip>
  ),
);

Tooltip.displayName = 'Tooltip';
