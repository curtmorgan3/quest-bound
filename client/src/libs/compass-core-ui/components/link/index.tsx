import MUILink, { LinkProps as MUILinkProps } from '@mui/material/Link';

import type { JSX } from "react";

export type LinkProps = MUILinkProps;

export const Link = ({ ...baseProps }: LinkProps): JSX.Element => <MUILink {...baseProps} />;
