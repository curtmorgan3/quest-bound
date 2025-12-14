import MUIBreadcrumbs, { BreadcrumbsProps as MUIBreadcrumbsProps } from '@mui/material/Breadcrumbs';

import type { JSX } from "react";

export type BreadcrumbsProps = MUIBreadcrumbsProps;

export const Breadcrumbs = ({ ...baseProps }: BreadcrumbsProps): JSX.Element => (
  <MUIBreadcrumbs {...baseProps} />
);
