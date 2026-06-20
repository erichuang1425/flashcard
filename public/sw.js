const CACHE_VERSION = 'flashcard-offline-v1';
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/favicon.ico',
  '/icons/icon.svg',
  '/sat.csv',
  '/pte-academic-core.csv',
  '/pte-academic-advanced.csv',
  '/pte-describe-image.csv',
  '/pte-essay-connectors.csv',
  '/toefl-connectors.csv',
  '/toefl-listening-speaking.csv',
  '/toefl-reading-academic-core.csv',
  '/toefl-reading-word-families.csv',
  '/toefl-writing-academic-discussion.csv',
  '/toefl-writing-build-a-sentence.csv',
  '/toefl-writing-email.csv',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

const isSameOrigin = (request) => new URL(request.url).origin === self.location.origin;
const isStaticAsset = (request) => ['script', 'style', 'font', 'image'].includes(request.destination);

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !isSameOrigin(request)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put('/index.html', copy));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  if (isStaticAsset(request) || request.url.endsWith('.csv') || request.url.endsWith('.webmanifest')) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
            }
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
});
