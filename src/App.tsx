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
import { GamificationProvider } from './context/GamificationContext';
import { FocusModeProvider } from './context/FocusModeContext';
import { Profile } from './pages/Profile';
import { SettingsProvider } from './context/SettingsContext';
import { ThemeProvider } from './context/ThemeContext';
import { ThemeModeProvider } from './context/ThemeModeContext';
import { UserPreferencesProvider } from './context/UserPreferencesContext';
import { I18nProvider } from './i18n/I18nContext';

const App: React.FC = () => {
  const { user } = useAuth();

  return (
    <UserPreferencesProvider>
      <I18nProvider>
        <ThemeModeProvider>
          <ThemeProvider>
            <SettingsProvider>
              <GamificationProvider>
                <FocusModeProvider>
                  <Layout>
                    <Routes>
                      <Route path="/" element={
                        user ? <Home /> : <Navigate to="/login" replace />
                      } />
                      <Route path="/login" element={
                        !user ? <Login /> : <Navigate to="/" replace />
                      } />
                      <Route path="/register" element={
                        !user ? <Register /> : <Navigate to="/" replace />
                      } />
                      <Route path="/study" element={
                        <ProtectedRoute>
                          <Study />
                        </ProtectedRoute>
                      } />
                      <Route path="/import" element={
                        <ProtectedRoute>
                          <Import />
                        </ProtectedRoute>
                      } />
                      <Route path="/worksheets" element={
                        <ProtectedRoute>
                          <Worksheets />
                        </ProtectedRoute>
                      } />
                      <Route path="/settings" element={
                        <ProtectedRoute>
                          <Settings />
                        </ProtectedRoute>
                      } />
                      <Route path="/profile" element={
                        <ProtectedRoute>
                          <Profile />
                        </ProtectedRoute>
                      } />
                      <Route path="/study/worksheet/:worksheetId" element={<StudyWorksheet />} />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Layout>
                </FocusModeProvider>
              </GamificationProvider>
            </SettingsProvider>
          </ThemeProvider>
        </ThemeModeProvider>
      </I18nProvider>
    </UserPreferencesProvider>
  );
};

export default App;