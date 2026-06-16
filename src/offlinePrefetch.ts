const routePrefetchers = [
  () => import('./pages/Home'),
  () => import('./pages/Study'),
  () => import('./pages/Import'),
  () => import('./pages/Worksheets'),
  () => import('./pages/Library'),
  () => import('./pages/Login'),
  () => import('./pages/Register'),
  () => import('./pages/Settings'),
  () => import('./pages/StudyWorksheet'),
  () => import('./pages/Diary'),
  () => import('./pages/Profile'),
  () => import('./pages/Reading'),
];

const optionalFeaturePrefetchers = [
  () => import('./services/exportService'),
  () => import('./services/pdfService'),
];

const runWhenIdle = (task: () => void): void => {
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(task, { timeout: 5000 });
    return;
  }
  globalThis.setTimeout(task, 1500);
};

export const prefetchOfflineBundles = (): void => {
  if (!navigator.onLine) return;

  runWhenIdle(() => {
    for (const prefetch of [...routePrefetchers, ...optionalFeaturePrefetchers]) {
      void prefetch().catch(() => {
        // Best effort: the service worker and Firestore cache still cover
        // everything the user has already opened before going offline.
      });
    }
  });
};
