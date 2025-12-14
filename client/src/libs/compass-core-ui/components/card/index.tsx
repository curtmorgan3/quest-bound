import MUICard, { CardProps as MUICardProps } from '@mui/material/Card';
import MUICardActions, { CardActionsProps as MUICardActionsProps } from '@mui/material/CardActions';
import MUICardContent, { CardContentProps as MUICardContentProps } from '@mui/material/CardContent';
import MUICardMedia, { CardMediaProps as MUICardMediaProps } from '@mui/material/CardMedia';

import type { JSX } from "react";

export type CardProps = MUICardProps;
export type CardActionsProps = MUICardActionsProps;
export type CardContentProps = MUICardContentProps;
export type CardMediaProps = MUICardMediaProps;

export const Card = ({ ...baseProps }: CardProps): JSX.Element => <MUICard {...baseProps} />;
export const CardActions = ({ ...baseProps }: CardActionsProps): JSX.Element => (
  <MUICardActions {...baseProps} />
);
export const CardContent = ({ ...baseProps }: CardContentProps): JSX.Element => (
  <MUICardContent {...baseProps} />
);
export const CardMedia = ({ ...baseProps }: CardMediaProps): JSX.Element => (
  <MUICardMedia {...baseProps} />
);
