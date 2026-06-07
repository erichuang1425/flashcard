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

// Route-level code-splitting: each page loads as a separate chunk on demand,
// keeping the initial bundle small.
const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const Study = lazy(() => import('./pages/Study').then((m) => ({ default: m.Study })));
const Import = lazy(() => import('./pages/Import').then((m) => ({ default: m.Import })));
const Worksheets = lazy(() => import('./pages/Worksheets').then((m) => ({ default: m.Worksheets })));
const Login = lazy(() => import('./pages/Login').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then((m) => ({ default: m.Register })));
const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));
const StudyWorksheet = lazy(() =>
  import('./pages/StudyWorksheet').then((m) => ({ default: m.StudyWorksheet }))
);
const Diary = lazy(() => import('./pages/Diary').then((m) => ({ default: m.Diary })));
const Profile = lazy(() => import('./pages/Profile').then((m) => ({ default: m.Profile })));

const RouteFallback: React.FC = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '60vh',
    }}
  >
    <CircularProgress />
  </Box>
);

const App: React.FC = () => {
  const { user } = useAuth();

  return (
    // SettingsProvider is mounted once in main.tsx (wrapping ThemedApp) so the
    // rendered MUI theme and the in-app theme toggle share a single source of
    // truth. Mounting it again here previously split that state, leaving the
    // dark-mode toggle a no-op and duplicating the Pomodoro timer + preference
    // subscription.
    <GamificationProvider>
      <FocusModeProvider>
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
      </FocusModeProvider>
    </GamificationProvider>
  );
};

export default App;
