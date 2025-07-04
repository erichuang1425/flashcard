import React, { useState, useEffect } from 'react';
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
import { Profile } from './pages/Profile';
import { SettingsProvider } from './context/SettingsContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ThemeModeProvider } from './context/ThemeModeContext';
import { UserPreferencesProvider } from './context/UserPreferencesContext';
import { I18nProvider } from './i18n/I18nContext';
import { ReadingModeProvider } from './context/ReadingModeContext';
import { Reading } from './pages/Reading';
import { Diary } from './pages/Diary';
import { DiaryCreate } from './pages/DiaryCreate';
import { DiaryEntryPage } from './pages/DiaryEntryPage';
import { getDoc, doc, setDoc, collection } from '@firebase/firestore';
import { db } from './services/firebase';
import { FlashcardLibrary } from './pages/FlashcardLibrary';
import { SnackbarProvider } from 'notistack';
import { ConfirmProvider } from './context/ConfirmContext';
import { MainDrawer } from './components/navigation/MainDrawer';
import { Box, useMediaQuery, CircularProgress } from '@mui/material';
import { logger } from './services/logging';
import { checkAndRunMigrations, migrateQueuePerformanceTracking } from './utils/migrations';
import { useAuthInit } from './hooks/useAuthInit';
import { UIStateProvider } from './context/UIStateContext';

const App: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const authLoaded = useAuthInit();

  if (!authLoaded) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ThemeModeProvider>
      <ThemeProvider>
        <UIStateProvider>
          <SnackbarProvider maxSnack={3}>
            <ConfirmProvider>
              <UserPreferencesProvider>
                <I18nProvider>
                  <SettingsProvider>
                    <GamificationProvider>
                      <ReadingModeProvider>
                        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
                          {!isMobile && (
                            <MainDrawer 
                              open={drawerOpen} 
                              onClose={() => setDrawerOpen(false)} 
                            />
                          )}
                          <Box sx={{ 
                            flexGrow: 1,
                            pb: 0 
                          }}>
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
                                    <Route path="/flashcards" element={<FlashcardLibrary />} />
                                    <Route path="/import" element={<Import />} />
                                    <Route path="/worksheets" element={<Worksheets />} />
                                    <Route path="/settings" element={<Settings />} />
                                    <Route path="/profile" element={<Profile />} />
                                    <Route path="/study/worksheet/:worksheetId" element={<StudyWorksheet />} />
                                    <Route path="/reading" element={<Reading />} />
                                    <Route path="/diary" element={<Diary />} />
                                    <Route path="/diary/new" element={<DiaryCreate />} />
                                    <Route path="/diary/:entryId" element={<DiaryEntryPage />} />
                                    <Route path="*" element={<Navigate to="/" replace />} />
                                  </Routes>
                                } />
                              </Routes>
                            </Layout>
                          </Box>
                        </Box>
                      </ReadingModeProvider>
                    </GamificationProvider>
                  </SettingsProvider>
                </I18nProvider>
              </UserPreferencesProvider>
            </ConfirmProvider>
          </SnackbarProvider>
        </UIStateProvider>
      </ThemeProvider>
    </ThemeModeProvider>
  );
};

export default App;