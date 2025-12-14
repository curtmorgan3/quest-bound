import MUIChip, { ChipProps as MUIChipProps } from '@mui/material/Chip';

import type { JSX } from "react";

export type ChipProps = MUIChipProps;

export const Chip = ({ ...baseProps }: ChipProps): JSX.Element => <MUIChip {...baseProps} />;
