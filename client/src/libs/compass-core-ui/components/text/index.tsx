import MUIText, { TypographyProps as MUITypographyProps } from '@mui/material/Typography';

import type { JSX } from "react";

export type TextProps = MUITypographyProps;

export const Text = ({ ...baseProps }: TextProps): JSX.Element => <MUIText {...baseProps} />;
