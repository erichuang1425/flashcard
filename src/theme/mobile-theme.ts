import { Theme, alpha } from '@mui/material';
import { Spacing } from '@mui/system';

export const getMobileThemeOverrides = (baseTheme: Theme): Partial<Theme> => ({
  components: {
    ...baseTheme.components,
    MuiButton: {
      styleOverrides: {
        root: {
          minHeight: '48px',
          minWidth: '48px',
          padding: '12px 20px',
          fontSize: '16px',
          borderRadius: '12px',
          textTransform: 'none',
          '&.MuiButton-containedPrimary, &.MuiButton-containedSecondary': {
            boxShadow: 'none',
            '&:active': {
              transform: 'scale(0.98)',
            },
          },
          '&.MuiButton-outlined': {
            borderWidth: 2,
            '&:active': {
              backgroundColor: 'rgba(0,0,0,0.05)',
            },
          },
          '@media (max-width: 600px)': {
            width: '100%',
            marginBottom: '8px',
            fontSize: '16px',
            padding: '12px 20px',
            borderRadius: '12px',
            minHeight: '48px',
            '&:active': {
              transform: 'scale(0.98)',
            },
          },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& input, & textarea': {
            fontSize: '16px',
            padding: '14px',
            '-webkit-appearance': 'none',
            borderRadius: '8px',
          },
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            backgroundColor: 'rgba(0,0,0,0.02)',
            '& input': {
              fontSize: '16px',
              padding: '16px 14px',
              '-webkit-box-shadow': '0 0 0 1000px transparent inset',
              transition: 'background-color 5000s ease-in-out 0s',
            },
          },
          '& .MuiInputLabel-root': {
            fontSize: '14px',
          },
          '@media (max-width: 600px)': {
            width: '100%',
            marginBottom: '16px',
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
            },
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
            borderRadius: '0',
            margin: '0',
            boxShadow: 'none',
            background: 'transparent',
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
          backgroundImage: 'none',
        },
      },
    },
  },
  typography: {
    ...baseTheme.typography,
    h4: {
      ...baseTheme.typography.h4,
      '@media (max-width: 600px)': {
        fontSize: '1.5rem',
      },
    },
    h6: {
      ...baseTheme.typography.h6,
      '@media (max-width: 600px)': {
        fontSize: '1.1rem',
      },
    },
  },
  spacing: ((factor: number | string) => {
    if (typeof factor === 'string') return factor;
    return `${8 * factor}px`;
  }) as Spacing,
});