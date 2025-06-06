/* eslint-disable @typescript-eslint/no-empty-interface */
import { compassLightTheme } from '../../theme';

declare module '@mui/material/Backdrop' {}

const injectTheme = (): void => {
  compassLightTheme.components.MuiBackdrop = {
    variants: [],
    styleOverrides: {
      root: {},
    },
  };
};

export default injectTheme;
