import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import { getTheme } from './theme';
import App from './App';
import { MobileProvider } from './context/MobileContext';
import { SettingsProvider, useSettings } from './context/SettingsContext';
import { PronunciationProvider } from './context/PronunciationContext';
import { LanguageProvider } from './i18n/LanguageContext';
import { OnboardingProvider } from './context/OnboardingContext';

const ThemedApp: React.FC = () => {
  const { theme } = useSettings();
  const muiTheme = React.useMemo(() => getTheme(theme), [theme]);
  return (
    <ThemeProvider theme={muiTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <LanguageProvider>
        <MobileProvider>
          <AuthProvider>
            <OnboardingProvider>
              <SettingsProvider>
                <PronunciationProvider>
                  <ThemedApp />
                </PronunciationProvider>
              </SettingsProvider>
            </OnboardingProvider>
          </AuthProvider>
        </MobileProvider>
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
);
