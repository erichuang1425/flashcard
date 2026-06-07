import { Theme, alpha, ThemeOptions } from '@mui/material';

// Mobile-focused theme overrides. These are merged into the base theme in
// `getTheme` (src/theme.ts). Everything here is guarded by an
// `@media (max-width: 600px)` query (or targets touch ergonomics that are
// harmless on desktop), so the same overrides can be applied unconditionally.
export const getMobileThemeOverrides = (baseTheme: Theme): ThemeOptions => ({
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: '48px',
          minWidth: '48px',
          // Keep the label at >=16px so iOS doesn't zoom when a button-shaped
          // control receives focus, and to stay above the touch-target floor.
          '@media (max-width: 600px)': {
            fontSize: '16px',
          },
          '&:active': {
            transform: 'scale(0.98)',
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          // 16px inputs prevent iOS Safari from zooming the page on focus.
          '& input, & textarea': {
            fontSize: '16px',
            padding: '14px 12px',
          },
          '& .MuiInputLabel-root': {
            fontSize: '16px',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          '@media (max-width: 600px)': {
            borderRadius: '12px',
            margin: '4px 0',
            // Concrete value: a `(theme) => ...` callback is not valid as a
            // static style property and rendered as the function source before.
            boxShadow: `0 2px 8px ${alpha(baseTheme.palette.common.black, 0.1)}`,
          },
        },
      },
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            padding: '12px',
          },
        },
      },
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          height: '64px',
          paddingBottom: 'env(safe-area-inset-bottom)',
          '@supports not (padding: env(safe-area-inset-bottom))': {
            paddingBottom: '16px',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          '@media (max-width: 600px)': {
            margin: '16px',
            width: 'calc(100% - 32px)',
            maxHeight: 'calc(100% - 32px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            borderRadius: '12px',
          },
        },
      },
    },
  },
  typography: {
    h4: {
      '@media (max-width: 600px)': {
        fontSize: '1.5rem',
      },
    },
    h6: {
      '@media (max-width: 600px)': {
        fontSize: '1.1rem',
      },
    },
  },
});
