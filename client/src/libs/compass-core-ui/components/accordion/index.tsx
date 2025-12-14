import MuiAccordion, { AccordionProps as MUIAccordionProps } from '@mui/material/Accordion';
import MuiAccordionDetails, {
  AccordionDetailsProps as MUIAccordionDetailsProps,
} from '@mui/material/AccordionDetails';
import MuiAccordionSummary, {
  AccordionSummaryProps as MUIAccordionSummaryProps,
} from '@mui/material/AccordionSummary';

import type { JSX } from "react";

export type AccordionProps = MUIAccordionProps;

export const Accordion = ({ ...baseProps }: AccordionProps): JSX.Element => (
  <MuiAccordion {...baseProps} />
);

export type AccordionSummaryProps = MUIAccordionSummaryProps;

export const AccordionSummary = ({ ...baseProps }: AccordionSummaryProps): JSX.Element => (
  <MuiAccordionSummary {...baseProps} />
);

export type AccordionDetailsProps = MUIAccordionDetailsProps;

export const AccordionDetails = ({ ...baseProps }: AccordionDetailsProps): JSX.Element => (
  <MuiAccordionDetails {...baseProps} />
);
