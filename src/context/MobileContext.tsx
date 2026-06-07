
import React, { createContext, useContext, useEffect, useState } from 'react';
import { isMobile } from '../utils/device-detection';

interface MobileContextType {
  isMobileDevice: boolean;
  isIOSDevice: boolean;
  isLandscape: boolean;
}

const MobileContext = createContext<MobileContextType>({
  isMobileDevice: false,
  isIOSDevice: false,
  isLandscape: false,
});

export const MobileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState({
    isMobileDevice: isMobile.any(),
    isIOSDevice: isMobile.iOS(),
    isLandscape: window.innerWidth > window.innerHeight
  });

  useEffect(() => {
    // Coalesce the rapid resize/orientation bursts (e.g. the mobile address bar
    // showing/hiding) into one state update per animation frame.
    let frame = 0;
    const handleResize = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setState(prev => ({
          ...prev,
          isLandscape: window.innerWidth > window.innerHeight
        }));
      });
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return (
    <MobileContext.Provider value={state}>
      {children}
    </MobileContext.Provider>
  );
};

export const useMobile = () => useContext(MobileContext);