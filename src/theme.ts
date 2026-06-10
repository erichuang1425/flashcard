import { alpha, createTheme } from '@mui/material/styles';
import { getMobileThemeOverrides } from './theme/mobile-theme';

export type ThemeMode = 'light' | 'dark' | 'system';

// Design tokens: a single source of truth for the app's visual identity.
// Changing values here restyles every MUI surface without touching pages.
const brand = {
  primary: '#4f46e5', // indigo
  primaryDark: '#818cf8', // lifted for contrast on dark surfaces
  secondary: '#0ea5e9', // sky
  secondaryDark: '#38bdf8',
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
};

const radius = 12;

/**
 * Create a Material UI theme based on the provided mode.
 * When `system` is supplied the users OS preference is used.
 */
export const getTheme = (mode: ThemeMode) => {
  const paletteMode =
    mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : mode;
  const dark = paletteMode === 'dark';

  const base = createTheme({
    palette: {
      mode: paletteMode,
      primary: { main: dark ? brand.primaryDark : brand.primary },
      secondary: { main: dark ? brand.secondaryDark : brand.secondary },
      success: { main: brand.success },
      warning: { main: brand.warning },
      error: { main: brand.error },
      background: dark
        ? { default: '#0f1117', paper: '#171a23' }
        : { default: '#f6f7fb', paper: '#ffffff' },
      text: dark
        ? { primary: '#e7e9f0', secondary: '#9aa0b4' }
        : { primary: '#1a1d29', secondary: '#5a6072' },
      divider: dark ? 'rgba(148, 163, 184, 0.16)' : 'rgba(26, 29, 41, 0.1)',
    },
    shape: { borderRadius: radius },
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 700, letterSpacing: '-0.02em' },
      h2: { fontWeight: 700, letterSpacing: '-0.02em' },
      h3: { fontWeight: 700, letterSpacing: '-0.01em' },
      h4: { fontWeight: 700, letterSpacing: '-0.01em' },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      subtitle1: { fontWeight: 500 },
      button: { fontWeight: 600, textTransform: 'none' },
    },
  });

  const softShadow = dark
    ? '0 1px 2px rgba(0, 0, 0, 0.5), 0 4px 16px rgba(0, 0, 0, 0.35)'
    : '0 1px 2px rgba(26, 29, 41, 0.05), 0 4px 16px rgba(26, 29, 41, 0.07)';
  const hoverShadow = dark
    ? '0 2px 4px rgba(0, 0, 0, 0.5), 0 10px 28px rgba(0, 0, 0, 0.45)'
    : '0 2px 4px rgba(26, 29, 41, 0.06), 0 10px 28px rgba(26, 29, 41, 0.12)';

  const themed = createTheme(base, {
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: base.palette.background.default },
        },
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: radius - 2, paddingInline: 18 },
          containedPrimary: {
            '&:hover': { boxShadow: `0 6px 16px ${alpha(base.palette.primary.main, 0.35)}` },
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${base.palette.divider}`,
            boxShadow: softShadow,
            transition: base.transitions.create(['box-shadow', 'transform'], {
              duration: base.transitions.duration.short,
            }),
            '&:hover': { boxShadow: hoverShadow },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          elevation1: { boxShadow: softShadow },
          elevation2: { boxShadow: softShadow },
          elevation3: { boxShadow: hoverShadow },
        },
      },
      MuiAppBar: {
        defaultProps: { elevation: 0, color: 'inherit' },
        styleOverrides: {
          root: {
            backgroundColor: alpha(base.palette.background.paper, 0.85),
            backdropFilter: 'blur(12px)',
            borderBottom: `1px solid ${base.palette.divider}`,
            color: base.palette.text.primary,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { backgroundImage: 'none', borderRight: `1px solid ${base.palette.divider}` },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 500, borderRadius: 8 } },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: radius - 2,
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: base.palette.primary.main,
            },
          },
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: {
            borderRadius: radius - 4,
            '&.Mui-selected': {
              backgroundColor: alpha(base.palette.primary.main, dark ? 0.18 : 0.1),
              '&:hover': {
                backgroundColor: alpha(base.palette.primary.main, dark ? 0.24 : 0.16),
              },
            },
          },
        },
      },
      MuiTab: {
        styleOverrides: { root: { textTransform: 'none', fontWeight: 600 } },
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: {
            borderRadius: 99,
            backgroundColor: alpha(base.palette.primary.main, dark ? 0.2 : 0.12),
          },
          bar: { borderRadius: 99 },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: dark ? '#2a2f3d' : '#1a1d29',
            borderRadius: 8,
            fontSize: '0.75rem',
            padding: '6px 10px',
          },
        },
      },
      MuiDialog: {
        styleOverrides: { paper: { backgroundImage: 'none', boxShadow: hoverShadow } },
      },
      MuiAvatar: {
        styleOverrides: {
          root: {
            backgroundColor: alpha(base.palette.primary.main, dark ? 0.3 : 0.15),
            color: base.palette.primary.main,
            fontWeight: 600,
          },
        },
      },
    },
  });

  // Layer the mobile ergonomics (16px inputs to stop iOS zoom, 48px tap
  // targets, safe-area-aware surfaces) on top of the base theme. The overrides
  // are media-query guarded, so desktop rendering is unaffected.
  return createTheme(themed, getMobileThemeOverrides(themed));
};
