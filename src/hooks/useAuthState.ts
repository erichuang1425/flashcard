import { useState, useEffect } from 'react';
import { authService, AuthState } from '../services/authService';

export const useAuthState = () => {
  const [authState, setAuthState] = useState<AuthState>(authService.getCurrentState());

  useEffect(() => {
    return authService.subscribe(setAuthState);
  }, []);

  return authState;
};