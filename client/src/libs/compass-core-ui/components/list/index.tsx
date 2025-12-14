import MUIList, { ListProps as MUIListProps } from '@mui/material/List';
import MUIListItem, { ListItemProps as MUIListItemProps } from '@mui/material/ListItem';
import MUIListItemButton, {
  ListItemButtonProps as MUIListItemButtonProps,
} from '@mui/material/ListItemButton';
import MUIListItemIcon, {
  ListItemIconProps as MUIListItemIconProps,
} from '@mui/material/ListItemIcon';
import MUIListItemText, {
  ListItemTextProps as MUIListItemTextProps,
} from '@mui/material/ListItemText';

import type { JSX } from "react";

export type ListProps = MUIListProps;
export type ListItemProps = MUIListItemProps;
export type ListItemButtonProps = MUIListItemButtonProps;
export type ListItemIconProps = MUIListItemIconProps;
export type ListItemTextProps = MUIListItemTextProps;

export const List = ({ ...baseProps }: ListProps): JSX.Element => <MUIList {...baseProps} />;
export const ListItem = ({ ...baseProps }: ListItemProps): JSX.Element => (
  <MUIListItem {...baseProps} />
);
export const ListItemButton = ({ ...baseProps }: ListItemButtonProps): JSX.Element => (
  <MUIListItemButton {...baseProps} />
);
export const ListItemIcon = ({ ...baseProps }: ListItemIconProps): JSX.Element => (
  <MUIListItemIcon {...baseProps} />
);
export const ListItemText = ({ ...baseProps }: ListItemTextProps): JSX.Element => (
  <MUIListItemText {...baseProps} />
);
