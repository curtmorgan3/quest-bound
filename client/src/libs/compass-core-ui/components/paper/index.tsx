import MUIPaper, { PaperProps as MUIPaperProps } from '@mui/material/Paper';

import type { JSX } from "react";

export type PaperProps = MUIPaperProps;

export const Paper = ({ ...baseProps }: PaperProps): JSX.Element => <MUIPaper {...baseProps} />;
