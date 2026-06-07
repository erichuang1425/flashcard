import { createTheme } from '@mui/material/styles';
import { getMobileThemeOverrides } from './theme/mobile-theme';

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

  const base = createTheme({
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

  // Layer the mobile ergonomics (16px inputs to stop iOS zoom, 48px tap
  // targets, safe-area-aware surfaces) on top of the base theme. The overrides
  // are media-query guarded, so desktop rendering is unaffected.
  return createTheme(base, getMobileThemeOverrides(base));
};
