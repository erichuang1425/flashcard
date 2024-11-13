export const isMobile = {
    any: (): boolean => {
      if (typeof window === 'undefined') return false;
      return (
        isMobile.Android() || 
        isMobile.BlackBerry() || 
        isMobile.iOS() || 
        isMobile.Opera() || 
        isMobile.Windows()
      );
    },
    Android: (): boolean => {
      if (typeof navigator === 'undefined') return false;
      return /Android/i.test(navigator.userAgent);
    },
    BlackBerry: (): boolean => {
      if (typeof navigator === 'undefined') return false;
      return /BlackBerry/i.test(navigator.userAgent);
    },
    iOS: (): boolean => {
      if (typeof navigator === 'undefined') return false;
      return /iPhone|iPad|iPod/i.test(navigator.userAgent);
    },
    Opera: (): boolean => {
      if (typeof navigator === 'undefined') return false;
      return /Opera Mini/i.test(navigator.userAgent);
    },
    Windows: (): boolean => {
      if (typeof navigator === 'undefined') return false;
      return /IEMobile/i.test(navigator.userAgent);
    }
  };