import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { Study } from './pages/Study';
import { Import } from './pages/Import';
import { Worksheets } from './pages/Worksheets';
import { Layout } from './components/Layout';
import { useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Settings } from './pages/Settings';
import { StudyWorksheet } from './pages/StudyWorksheet';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import '@fontsource/source-serif-pro';
import '@fontsource/noto-serif';
import '@fontsource/crimson-pro';
import { GamificationProvider } from './context/GamificationContext';
import { FocusModeProvider } from './context/FocusModeContext';
import { Profile } from './pages/Profile';
import { SettingsProvider } from './context/SettingsContext';
import { ThemeProvider } from './context/ThemeContext';
import { ThemeModeProvider } from './context/ThemeModeContext';
import { UserPreferencesProvider } from './context/UserPreferencesContext';
import { I18nProvider } from './i18n/I18nContext';
import { ReadingModeProvider } from './context/ReadingModeContext';
import { Reading } from './pages/Reading';

const App: React.FC = () => {
  const { user } = useAuth();

  return (
    <ThemeModeProvider>
      <ThemeProvider>
        <UserPreferencesProvider>
          <I18nProvider>
            <SettingsProvider>
              <GamificationProvider>
                <ReadingModeProvider>
                  <FocusModeProvider>
                    <Layout>
                      <Routes>
                        <Route path="/login" element={
                          !user ? <Login /> : <Navigate to="/" replace />
                        } />
                        <Route path="/register" element={
                          !user ? <Register /> : <Navigate to="/" replace />
                        } />
                        {/* All other routes require authentication */}
                        <Route path="/*" element={
                          !user ? <Navigate to="/login" replace /> :
                          <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/study" element={<Study />} />
                            <Route path="/import" element={<Import />} />
                            <Route path="/worksheets" element={<Worksheets />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="/profile" element={<Profile />} />
                            <Route path="/study/worksheet/:worksheetId" element={<StudyWorksheet />} />
                            <Route path="/reading" element={<Reading />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                          </Routes>
                        } />
                      </Routes>
                    </Layout>
                  </FocusModeProvider>
                </ReadingModeProvider>
              </GamificationProvider>
            </SettingsProvider>
          </I18nProvider>
        </UserPreferencesProvider>
      </ThemeProvider>
    </ThemeModeProvider>
  );
};

export default App;