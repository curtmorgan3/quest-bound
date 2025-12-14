import MUIStep, { StepProps as MUIStepProps } from '@mui/material/Step';
import MUIStepLabel, { StepLabelProps as MUIStepLabelProps } from '@mui/material/StepLabel';
import MUIStepper, { StepperProps as MUIStepperProps } from '@mui/material/Stepper';

import type { JSX } from "react";

export type StepperProps = MUIStepperProps;
export type StepProps = MUIStepProps;
export type StepLabelProps = MUIStepLabelProps;

export const Stepper = ({ ...baseProps }: StepperProps): JSX.Element => (
  <MUIStepper {...baseProps} />
);

export const Step = ({ ...baseProps }: StepProps): JSX.Element => <MUIStep {...baseProps} />;

export const StepLabel = ({ ...baseProps }: StepLabelProps): JSX.Element => (
  <MUIStepLabel {...baseProps} />
);
