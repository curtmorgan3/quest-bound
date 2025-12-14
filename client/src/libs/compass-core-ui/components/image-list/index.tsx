import MUIImageList, { ImageListProps as MUIImageListProps } from '@mui/material/ImageList';
import MUIImageListItem, {
  ImageListItemProps as MUIImageListItemProps,
} from '@mui/material/ImageListItem';

import type { JSX } from "react";

export type ImageListProps = MUIImageListProps;
export type ImageListItemProps = MUIImageListItemProps;

export const ImageList = ({ ...baseProps }: ImageListProps): JSX.Element => (
  <MUIImageList {...baseProps} />
);
export const ImageListItem = ({ ...baseProps }: ImageListItemProps): JSX.Element => (
  <MUIImageListItem {...baseProps} />
);
