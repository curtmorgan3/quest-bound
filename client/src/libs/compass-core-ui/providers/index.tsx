import { ChakraProvider, extendTheme } from '@chakra-ui/react';
import { Theme, THEME_ID } from '@mui/material/styles';
import { ReactNode, type JSX } from 'react';
import { compassDarkTheme } from '../theme';
import { injectTheme } from './theme-injections';

export type CompassTheme = Theme;

export interface CompassThemeProviderProps {
  children: ReactNode;
  customTheme?: Theme;
  defaultThemeType?: 'LIGHT' | 'DARK';
}

export const CompassThemeProvider = ({ children }: CompassThemeProviderProps): JSX.Element => {
  const theme = extendTheme({
    initialColorMode: 'dark',
    useSystemColorMode: false,
    colors: {
      info: '#417090',
      secondary: '#E66A3C',
    },
    fonts: {
      body: 'Roboto Condensed',
      heading: 'Roboto Condensed',
    },
    styles: {
      global: {
        body: {
          bg: '#2A2A2A',
          color: '#FAF7F2',
        },
        ol: {
          padding: 'unset',
          paddingLeft: '40px',
        },
        ul: {
          padding: 'unset',
          paddingLeft: '40px',
        },
        h1: {
          fontSize: '32px',
          fontWeight: 'normal',
        },
        h2: {
          fontSize: '24px',
          fontWeight: 'normal',
        },
        h3: {
          fontSize: '18px',
          fontWeight: 'normal',
        },
        h4: {
          fontSize: '16px',
          fontWeight: 'normal',
        },
        h5: {
          fontSize: '14px',
          fontWeight: 'normal',
        },
        h6: {
          fontSize: '12px',
          fontWeight: 'normal',
        },
      },
    },
  });

  injectTheme();

  return (
    <ChakraProvider theme={{ ...theme, [THEME_ID]: compassDarkTheme }}>{children}</ChakraProvider>
  );
};
