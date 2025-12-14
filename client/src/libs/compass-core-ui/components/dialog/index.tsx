import MUIDialog, { DialogProps as MUIDialogProps } from '@mui/material/Dialog';
import MUIDialogActions, {
  DialogActionsProps as MUIDialogActionsProps,
} from '@mui/material/DialogActions';
import MUIDialogContent, {
  DialogContentProps as MUIDialogContentProps,
} from '@mui/material/DialogContent';
import MUIDialogContentText, {
  DialogContentTextProps as MUIDialogContentTextProps,
} from '@mui/material/DialogContentText';
import MUIDialogTitle, { DialogTitleProps as MUIDialogTitleProps } from '@mui/material/DialogTitle';

import type { JSX } from "react";

export type DialogProps = MUIDialogProps;
export const Dialog = ({ ...baseProps }: DialogProps): JSX.Element => <MUIDialog {...baseProps} />;

export type DialogTitleProps = MUIDialogTitleProps;
export const DialogTitle = ({ ...baseProps }: DialogTitleProps): JSX.Element => (
  <MUIDialogTitle {...baseProps} />
);

export type DialogActionsProps = MUIDialogActionsProps;
export const DialogActions = ({ ...baseProps }: DialogActionsProps): JSX.Element => (
  <MUIDialogActions {...baseProps} />
);

export type DialogTextProps = MUIDialogContentTextProps;
export const DialogText = ({ ...baseProps }: DialogTextProps): JSX.Element => (
  <MUIDialogContentText {...baseProps} />
);

export type DialogContentProps = MUIDialogContentProps;
export const DialogContent = ({ ...baseProps }: DialogContentProps): JSX.Element => (
  <MUIDialogContent {...baseProps} />
);
