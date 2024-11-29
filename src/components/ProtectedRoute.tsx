import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress, useTheme, useMediaQuery } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, authInitialized } = useAuth();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  // Only show loading while authentication is being initialized
  if (!authInitialized) {
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

  // Only redirect if auth is fully initialized and we're sure there's no user
  if (!user && !loading && authInitialized) {
    // Store current location only when explicitly redirecting to login
    const fullPath = `${location.pathname}${location.search}${location.hash}`;
    sessionStorage.setItem('redirectUrl', fullPath);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Show children while loading or if user exists
  return <>{children}</>;
};