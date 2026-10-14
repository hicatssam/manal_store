const CACHE_NAME = 'manal-store-shell-v14';
const APP_FILES = [
  './',
  './index.html',
  './refined.css?v=14',
  './components.css?v=14',
  './ui.js?v=14',
  './data.js?v=14',
  './app.js?v=14',
  './pwa.js',
  './manifest.webmanifest',
  './assets/fonts/Cairo-400.woff',
  './assets/fonts/Cairo-500.woff',
  './assets/fonts/Cairo-600.woff',
  './assets/fonts/Cairo-700.woff',
  './assets/manalstorelogo.png',
  './assets/payment-cash.svg',
  './assets/payment-transfer.svg',
  './assets/app-icon-192.png',
  './assets/app-icon-512.png',
  './assets/dress-black.webp',
  './assets/dress-ivory.webp',
  './assets/dress-pistachio.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key.startsWith('manal-store-shell-') && key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  // Authentication and administration should never be served from a public offline cache.
  if (/\\/api\\//.test(new URL(request.url).pathname) || /\\/admin(?:-login)?\\.html$|\\/admin(?:-auth)?\\.js$/.test(new URL(request.url).pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => await caches.match(request) || await caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});
