import React, { createContext, useContext } from 'react';
import { User } from 'firebase/auth';
import { useAuthState } from '../hooks/useAuthState';
import { authService } from '../services/authService';
import { useMediaQuery, useTheme, CircularProgress, Box } from '@mui/material';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: Error | null;
  authInitialized: boolean;  // renamed from initialized
  userPreferences: any | null;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const authState = useAuthState();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const contextValue: AuthContextType = {
    ...authState,
    authInitialized: authState.initialized,  // map initialized to authInitialized
    signOut: () => authService.signOut(),
    signInWithGoogle: () => authService.signInWithGoogle(),
    signIn: (email: string, password: string) => authService.signInWithEmail(email, password),
    signUp: (email: string, password: string) => authService.signUpWithEmail(email, password)
  };

  const LoadingComponent = () => (
    <Box sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      minHeight: isMobile ? '-webkit-fill-available' : '100vh',
      width: '100%'
    }}>
      <CircularProgress size={isMobile ? 40 : 48} />
    </Box>
  );

  if (!authState.initialized) {
    return <LoadingComponent />;
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {authState.loading ? (
        <LoadingComponent />
      ) : authState.error ? (
        <Box sx={{ 
          p: 2, 
          textAlign: 'center',
          color: 'error.main',
          position: isMobile ? 'fixed' : 'static',
          top: '50%',
          left: '50%',
          transform: isMobile ? 'translate(-50%, -50%)' : 'none'
        }}>
          {authState.error.message}
        </Box>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
