
import { useState, useCallback, RefObject } from 'react';

const useFullscreen = (elementRef: RefObject<HTMLElement>) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!elementRef.current) return;

    if (!document.fullscreenElement) {
      elementRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
      });
    }
  }, [elementRef]);

  return { isFullscreen, toggleFullscreen };
};

export default useFullscreen;