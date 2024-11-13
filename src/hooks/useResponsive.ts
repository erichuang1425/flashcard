import { useEffect, useState } from 'react';
import { isMobile } from '../utils/device-detection';

export const useResponsive = () => {
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    setIsMobileDevice(isMobile.any());
    setIsIOSDevice(isMobile.iOS());

    // Add iOS-specific body class
    if (isMobile.iOS()) {
      document.body.classList.add('ios-device');
    }

    // Add touch-specific CSS
    const touchStyle = document.createElement('style');
    touchStyle.innerHTML = `
      * { -webkit-tap-highlight-color: transparent; }
      input, select, textarea { font-size: 16px !important; }
      .ios-device .MuiBottomNavigation-root { padding-bottom: env(safe-area-inset-bottom); }
    `;
    document.head.appendChild(touchStyle);

    return () => {
      document.head.removeChild(touchStyle);
    };
  }, []);

  return { isMobileDevice, isIOSDevice };
};