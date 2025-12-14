import MUISlider, { SliderProps as MUISliderProps } from '@mui/material/Slider';

import type { JSX } from "react";

export type SliderProps = MUISliderProps;

export const Slider = ({ ...baseProps }: SliderProps): JSX.Element => <MUISlider {...baseProps} />;
