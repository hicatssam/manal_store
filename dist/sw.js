const CACHE_NAME = 'manal-store-shell-v13';
const APP_FILES = [
  './',
  './index.html',
  './admin.html',
  './admin-login.html',
  './admin-auth.js?v=13',
  './refined.css?v=13',
  './components.css?v=13',
  './ui.js?v=13',
  './data.js?v=13',
  './app.js?v=13',
  './admin.js?v=13',
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
