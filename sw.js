// ─── Nombre del caché ───────────────────────────────────────────────────────
const CACHE_NAME = 'gasto-tracker-v2';

// ─── Archivos del App Shell a cachear ──────────────────────────────────────
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './pages/offline.html',
  './js/app.js',
  './img/favicon.ico',
  './img/icons/icon-192x192.png',
  './img/icons/icon-512x512.png',
];

// ─── Evento INSTALL: cachear App Shell ─────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cacheando App Shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] App Shell cacheado correctamente');
        return self.skipWaiting();
      })
      .catch(err => console.error('[SW] Error al cachear App Shell:', err))
  );
});

// ─── Evento ACTIVATE: limpiar cachés antiguos ───────────────────────────────
self.addEventListener('activate', event => {
  console.log('[SW] Activando Service Worker...');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Eliminando caché antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service Worker activo y en control');
        return self.clients.claim();
      })
  );
});

// ─── Evento FETCH: interceptar peticiones ──────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Si el recurso está en caché, lo retorna directamente
        if (cachedResponse) {
          console.log('[SW] Recurso servido desde caché:', event.request.url);
          return cachedResponse;
        }

        // Si no está en caché, lo busca en la red
        return fetch(event.request)
          .then(networkResponse => {
            // Verifica que la respuesta sea válida
            // Nota: para recursos cross-origin el status puede ser 0 (opaque).
            if (!networkResponse || (networkResponse.status !== 200 && networkResponse.status !== 0)) {
              return networkResponse;
            }
            // Guarda una copia en caché para futuras visitas
            return caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
              });
          })
          .catch(() => {
            // Sin conexión: muestra la página offline
            console.log('[SW] Sin conexión, mostrando página offline');
            return caches.match('pages/offline.html');
          });
      })
  );
});
