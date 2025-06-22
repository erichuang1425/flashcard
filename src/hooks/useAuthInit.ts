import { useState, useEffect } from 'react';
import { auth } from '../services/firebase';

export const useAuthInit = () => {
  const [authLoaded, setAuthLoaded] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(() => {
      setAuthLoaded(true);
    });

    return unsubscribe;
  }, []);

  return authLoaded;
};