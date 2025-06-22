import { useEffect, useState } from 'react';
import { useMediaQuery, useTheme } from '@mui/material';

export const useResponsive = () => {
  const theme = useTheme();
  const isMobileDevice = useMediaQuery(theme.breakpoints.down('sm'));
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    const checkIOSDevice = () => {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      setIsIOSDevice(isIOS);
    };

    checkIOSDevice();
  }, []);

  return {
    isMobileDevice,
    isIOSDevice
  };
};