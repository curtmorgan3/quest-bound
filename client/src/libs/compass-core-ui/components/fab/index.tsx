import MUIFab, { FabProps as MUIFabProps } from '@mui/material/Fab';

import type { JSX } from "react";

export type FabProps = MUIFabProps;

export const Fab = ({ ...baseProps }: FabProps): JSX.Element => <MUIFab {...baseProps} />;
