import MUIAppBar, { AppBarProps as MUIAppBarProps } from '@mui/material/AppBar';

import type { JSX } from "react";

export type AppBarProps = MUIAppBarProps;

export const AppBar = ({ ...baseProps }: AppBarProps): JSX.Element => <MUIAppBar {...baseProps} />;
