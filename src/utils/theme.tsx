import React from 'react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { createTheme, ThemeProvider, ThemeOptions } from '@mui/material';

declare module '@mui/material' {
  // interface Theme {
  //   status: {
  //     danger: React.CSSProperties['color']
  //   }
  // }
  // interface ThemeOptions {
  //   status: {
  //     danger: React.CSSProperties['color']
  //   }
  // }
  // interface PaletteColor {
  //   darker?: string
  // }
  // interface SimplePaletteColorOptions {
  //   darker?: string
  // }
  interface Palette {
    rum: Palette['primary']
    light: Palette['primary']
    link: Palette['primary']
    'dark-blue': Palette['primary']
  }
  interface PaletteOptions {
    rum: PaletteOptions['primary']
    light: PaletteOptions['primary']
    link: PaletteOptions['primary']
    'dark-blue': PaletteOptions['primary']
  }
  interface ButtonPropsColorOverrides {
    rum: true
    light: true
    link: true
    'dark-blue': true
  }
  interface InputBasePropsColorOverrides {
    rum: true
    light: true
    link: true
    'dark-blue': true
  }
}

const themeOption: ThemeOptions = {
  palette: {
    secondary: { main: '#1880b8' },
    rum: { main: '#ff931e' },
    link: { main: '#0080ff' },
    'dark-blue': { main: '#576d91' },
    light: { main: '#fff' },
  },
  components: {
    MuiButton: {
      defaultProps: {
        variant: 'contained',
        disableElevation: true,
        color: 'primary',
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '8px 12px',
          fontSize: '14px',
        },
      },
    },
  },
};

export const themeDarkOption = createTheme({
  ...themeOption,
  palette: {
    ...themeOption.palette as any,
    mode: 'dark',
    primary: {
      main: '#fff',
      contrastText: '#333',
    },
    action: {
      disabled: 'rgba(255, 255, 255, 0.6)',
      disabledBackground: 'rgba(255, 255, 255, 0.24)',
    },
  },
});

export const themeLightOption = createTheme({
  ...themeOption,
  palette: {
    ...themeOption.palette as any,
    mode: 'light',
    primary: {
      main: '#000',
    },
    action: {
      disabled: 'rgba(0, 0, 0, 0.44)',
      disabledBackground: 'rgba(0, 0, 0, 0.2)',
    },
  },
});


const cache = createCache({
  key: 'mui-css',
  insertionPoint: typeof document !== 'undefined'
    ? Array.from(document.head.childNodes)
      .filter((v) => v.nodeType === 8)
      .find((v) => v.textContent?.includes('mui-insertion-point')) as any
    : null,
});

export const ThemeRoot = (props: { children: React.ReactNode }) => (
  // replacement for StyledEngineProvider
  <CacheProvider value={cache}>
    <ThemeProvider theme={themeDarkOption}>
      {props.children}
    </ThemeProvider>
  </CacheProvider>
);

export const ThemeDark = (props: { children: React.ReactNode }) => (
  // replacement for StyledEngineProvider
  <ThemeProvider theme={themeDarkOption}>
    {props.children}
  </ThemeProvider>
);

export const ThemeLight = (props: { children: React.ReactNode }) => (
  // replacement for StyledEngineProvider
  <ThemeProvider theme={themeLightOption}>
    {props.children}
  </ThemeProvider>
);
