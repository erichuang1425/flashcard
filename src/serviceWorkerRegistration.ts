const isLocalhost = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);

export const registerServiceWorker = (): void => {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    const swUrl = '/sw.js';

    navigator.serviceWorker
      .register(swUrl)
      .then((registration) => {
        // Keep long-flight installs fresh when the user opens the app online
        // before boarding, but never interrupt the currently loaded session.
        if (!isLocalhost) {
          void registration.update();
        }
      })
      .catch((error) => {
        console.warn('Offline app installation failed:', error);
      });
  });
};
