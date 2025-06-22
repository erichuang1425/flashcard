import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress, useTheme, useMediaQuery } from '@mui/material';
import { auth } from '../services/firebase';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Check if we have a stored session first
  useEffect(() => {
    const lastAuthCheck = localStorage.getItem('lastAuthCheck');
    if (lastAuthCheck && auth.currentUser) {
      const lastCheck = new Date(lastAuthCheck);
      const now = new Date();
      if (now.getTime() - lastCheck.getTime() > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('lastAuthCheck');
      }
    }
  }, []);

  // Only show loading while explicitly loading
  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        minHeight: isMobile ? '-webkit-fill-available' : '100vh',
        width: '100%',
        position: isMobile ? 'fixed' : 'relative',
        top: 0,
        left: 0,
        background: theme => theme.palette.background.default,
        zIndex: 1000
      }}>
        <CircularProgress size={isMobile ? 40 : 48} />
      </Box>
    );
  }

  // Redirect only if there's definitely no user
  if (!user) {
    const isLoginPage = location.pathname === '/login';
    if (!isLoginPage) {
      const fullPath = `${location.pathname}${location.search}${location.hash}`;
      sessionStorage.setItem('redirectUrl', fullPath);
      return <Navigate to="/login" replace />;
    }
  }

  return <>{children}</>;
};