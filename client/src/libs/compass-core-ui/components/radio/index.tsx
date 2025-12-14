import MUIRadio, { RadioProps as MUIRadioProps } from '@mui/material/Radio';

import type { JSX } from "react";

export type RadioProps = MUIRadioProps;

export const Radio = ({ ...baseProps }: RadioProps): JSX.Element => <MUIRadio {...baseProps} />;
