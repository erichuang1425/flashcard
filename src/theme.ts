import { createTheme } from '@mui/material/styles';

export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * Create a Material UI theme based on the provided mode.
 * When `system` is supplied the users OS preference is used.
 */
export const getTheme = (mode: ThemeMode) => {
  const paletteMode =
    mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;

  return createTheme({
    palette: {
      mode: paletteMode,
      primary: {
        main: '#2196f3',
      },
      secondary: {
        main: '#f50057',
      },
    },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h4: {
        fontWeight: 500,
      },
      h6: {
        fontWeight: 500,
      },
    },
  });
};
