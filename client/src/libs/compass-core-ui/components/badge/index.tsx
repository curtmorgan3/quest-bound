import MUIBadge, { BadgeProps as MUIBadgeProps } from '@mui/material/Badge';

import type { JSX } from "react";

export type BadgeProps = MUIBadgeProps;

export const Badge = ({ ...baseProps }: BadgeProps): JSX.Element => <MUIBadge {...baseProps} />;
