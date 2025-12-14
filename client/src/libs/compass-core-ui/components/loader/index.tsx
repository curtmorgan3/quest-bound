import MUILoader, { CircularProgressProps as MUILoaderProps } from '@mui/material/CircularProgress';

import type { JSX } from "react";

export type LoaderProps = MUILoaderProps;

export const Loader = ({ ...baseProps }: LoaderProps): JSX.Element => <MUILoader {...baseProps} />;
