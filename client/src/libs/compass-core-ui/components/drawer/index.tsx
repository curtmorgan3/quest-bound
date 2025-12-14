import MUIDrawer, { DrawerProps as MUIDrawerProps } from '@mui/material/Drawer';

import type { JSX } from "react";

export type DrawerProps = MUIDrawerProps;

export const Drawer = ({ ...baseProps }: DrawerProps): JSX.Element => <MUIDrawer {...baseProps} />;
