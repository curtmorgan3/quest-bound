import MUIInputAdornment, {
  InputAdornmentProps as MUIInputAdornmentProps,
} from '@mui/material/InputAdornment';
import MUITextField, { TextFieldProps } from '@mui/material/TextField';
import { forwardRef, type JSX } from 'react';

export type InputAdornmentProps = MUIInputAdornmentProps;

export const InputAdornment = ({ ...baseProps }: InputAdornmentProps): JSX.Element => (
  <MUIInputAdornment {...baseProps} />
);

export interface InputProps extends Omit<TextFieldProps, 'size' | 'autoComplete' | 'ref'> {
  id: string;

  // ref?: React.Ref<HTMLInputElement>;

  width?: string | number;

  /**
   * Removes space for helper text. Don't use if multiple Inputs are in line, as their
   * heights will be different.
   */
  ignoreHelperText?: boolean;

  /**
   * Allows the browser to fill in the input
   * @default false
   */
  autoComplete?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      id,
      label,
      helperText = ' ',
      width,
      ignoreHelperText = false,
      autoComplete = false,
      fullWidth = false,
      ...baseProps
    },
    ref,
  ): JSX.Element => {
    const textColor = baseProps.disabled
      ? 'text.disabled'
      : baseProps.error
        ? 'error.main'
        : 'inherit';

    return (
      <MUITextField
        ref={ref}
        id={id}
        fullWidth={fullWidth}
        size='small'
        autoComplete={autoComplete ? 'on' : 'off'}
        label={label}
        InputLabelProps={{
          className: baseProps.error ? 'error' : '',
          shrink: true,
          sx: { color: textColor },
        }}
        helperText={ignoreHelperText ? null : helperText}
        {...baseProps}
      />
    );
  },
);
