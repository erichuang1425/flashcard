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
          padding: '12px 16px',
          fontSize: '16px',
          '&:active': {
            transform: 'scale(0.98)', 
          },
          '@media (max-width: 600px)': {
            width: '100%',
            marginBottom: '8px',
          }
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& input, & textarea': {
            fontSize: '16px',
            padding: '14px 12px',
          },
          '& .MuiInputLabel-root': {
            fontSize: '16px',
          },
          '@media (max-width: 600px)': {
            width: '100%'
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          '@media (max-width: 600px)': {
            borderRadius: '12px',
            margin: '4px 0',
            boxShadow: (theme: Theme) => `0 2px 8px ${alpha(theme.palette.common.black, 0.1)}`
          }
        }
      }
    },
    MuiContainer: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            padding: '12px',
          }
        }
      }
    },
    MuiBottomNavigation: {
      styleOverrides: {
        root: {
          height: '64px',
          paddingBottom: 'env(safe-area-inset-bottom)',
          '@supports not (padding: env(safe-area-inset-bottom))': {
            paddingBottom: '16px',
          }
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          '@media (max-width: 600px)': {
            margin: '16px',
            width: 'calc(100% - 32px)',
            maxHeight: 'calc(100% - 32px)',
          }
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          '@media (max-width: 600px)': {
            borderRadius: '12px'
          }
        }
      }
    }
  },
  typography: {
    ...baseTheme.typography,
    h4: {
      ...baseTheme.typography.h4,
      '@media (max-width: 600px)': {
        fontSize: '1.5rem',
      }
    },
    h6: {
      ...baseTheme.typography.h6,
      '@media (max-width: 600px)': {
        fontSize: '1.1rem',
      }
    }
  },
  spacing: ((factor: number | string) => {
    if (typeof factor === 'string') return factor;
    return `${8 * factor}px`;
  }) as Spacing,
});