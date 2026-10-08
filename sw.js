/* Service Worker - PWA Bella Casa Construtora */
const CACHE_NAME = 'bella-casa-construtora-v5';
const ASSETS = [
  '/',
  '/index.html',
  '/admin.html',
  '/css/styles.css?v=5',
  '/css/admin.css',
  '/js/app.js',
  '/js/admin.js',
  '/manifest.json',
  '/assets/logo.png',
  '/assets/servicos/construcao.jpg',
  '/assets/servicos/pintura.jpg',
  '/assets/servicos/eletrica.jpg',
  '/assets/servicos/encanamento.jpg',
  '/assets/servicos/telhado.jpg',
  '/assets/servicos/jardinagem.jpg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/favicon.png',
  '/icons/apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('supabase.co')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).then((response) => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});
