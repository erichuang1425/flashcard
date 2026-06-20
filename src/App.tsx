import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { Layout } from './components/Layout';
import { useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import { GamificationProvider } from './context/GamificationContext';
import { FocusModeProvider } from './context/FocusModeContext';
import { PomodoroProvider } from './context/PomodoroContext';
import { useOnboarding } from './context/OnboardingContext';
import { Onboarding } from './components/onboarding/Onboarding';
import { dvhMinHeight } from './utils/viewport';
import { ReadingModeProvider } from './context/ReadingModeContext';

// Route-level code-splitting: each page loads as a separate chunk on demand,
// keeping the initial bundle small.
const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const Study = lazy(() => import('./pages/Study').then((m) => ({ default: m.Study })));
const Import = lazy(() => import('./pages/Import').then((m) => ({ default: m.Import })));
const Worksheets = lazy(() => import('./pages/Worksheets').then((m) => ({ default: m.Worksheets })));
const Library = lazy(() => import('./pages/Library').then((m) => ({ default: m.Library })));
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const StudyWorksheet = lazy(() =>
  import('./pages/StudyWorksheet').then((m) => ({ default: m.StudyWorksheet }))
);
const Diary = lazy(() => import('./pages/Diary').then((m) => ({ default: m.Diary })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));
const Reading = lazy(() => import('./pages/Reading').then((m) => ({ default: m.Reading })));

const RouteFallback: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      ...dvhMinHeight('60dvh'),
    }}
  >
    <CircularProgress />
  </Box>
);

const App: React.FC = () => {
  const { user, loading } = useAuth();
  const { ready, showOnboarding } = useOnboarding();

  // Wait for Firebase to restore any existing session before routing. While it
  // does, `user` is still null, so rendering routes here would bounce a
  // signed-in reload through /login (and flash the chrome-less guest layout).
  if (loading) {
    return <RouteFallback />;
  }

  // Hold rendering until we know whether a signed-in account still needs the
  // first-run guide, so the app doesn't flash behind it on a slow read.
  if (user && !ready) {
    return <RouteFallback />;
  }

  // A new account (Google or email) picks a language and walks the guide before
  // entering the app; the choice then drives the whole UI's language.
  if (showOnboarding) {
    return <Onboarding />;
  }

  return (
    // SettingsProvider is mounted once in main.tsx (wrapping ThemedApp) so the
    // rendered MUI theme and the in-app theme toggle share a single source of
    // truth. Mounting it again here previously split that state, leaving the
    // dark-mode toggle a no-op and duplicating the Pomodoro timer + preference
    // subscription.
    <GamificationProvider>
      <FocusModeProvider>
        {/* PomodoroProvider wraps the authenticated shell because the Pomodoro
            timer is rendered from Layout (and Profile); it reads its durations
            from SettingsContext, mounted once in main.tsx above this tree. */}
        <PomodoroProvider>
        <Layout>
            <Suspense fallback={<RouteFallback />}>
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
                <Route path="/library" element={
                  <ProtectedRoute>
                    <Library />
                  </ProtectedRoute>
                } />
                <Route path="/reading" element={
                  <ProtectedRoute>
                    <ReadingModeProvider>
                      <Reading />
                    </ReadingModeProvider>
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
                <Route path="/diary" element={
                  <ProtectedRoute>
                    <Diary />
                  </ProtectedRoute>
                } />
                <Route path="/study/worksheet/:worksheetId" element={
                  <ProtectedRoute>
                    <StudyWorksheet />
                  </ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
        </Layout>
        </PomodoroProvider>
      </FocusModeProvider>
    </GamificationProvider>
  );
};

export default App;
