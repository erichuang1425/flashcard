import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material';
import { theme as baseTheme } from '../theme';
import { useTheme as useMuiTheme } from '@mui/material/styles';



export const useTheme = useMuiTheme;

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const useThemeMode = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useThemeMode must be used within ThemeProvider');
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('themeMode') as ThemeMode;
    return saved || 'system';
  });

  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>(
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const actualMode = mode === 'system' ? systemTheme : mode;

  const theme = React.useMemo(() => 
    createTheme({
      ...baseTheme,
      palette: {
        ...baseTheme.palette,
        mode: actualMode,
      },
    }), 
    [actualMode]
  );

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};