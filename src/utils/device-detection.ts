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
      // iPadOS 13+ reports a desktop "Macintosh" user agent, so a touch-capable
      // Mac is really an iPad. Without this, iPads take the unreliable popup
      // sign-in path instead of the redirect flow.
      const iPadOS =
        /Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
      return /iPhone|iPad|iPod/i.test(navigator.userAgent) || iPadOS;
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