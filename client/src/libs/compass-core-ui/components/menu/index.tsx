import MUIMenu, { MenuProps as MUIMenuProps } from '@mui/material/Menu';
import MUIMenuItem, { MenuItemProps as MUIMenuItemProps } from '@mui/material/MenuItem';

import type { JSX } from "react";

export type MenuProps = MUIMenuProps;

export const Menu = ({ ...baseProps }: MUIMenuProps): JSX.Element => <MUIMenu {...baseProps} />;

export type MenuItemProps = MUIMenuItemProps;

export const MenuItem = ({ ...baseProps }: MenuItemProps): JSX.Element => (
  <MUIMenuItem {...baseProps} />
);
