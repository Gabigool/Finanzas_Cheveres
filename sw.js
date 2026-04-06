// ─── Nombre del caché ───────────────────────────────────────────────────────
const CACHE_NAME = 'gasto-tracker-v1';

// ─── Archivos del App Shell a cachear ──────────────────────────────────────
const ASSETS_TO_CACHE = [
  'index.html',
  'css/style.css',
  'pages/offline.html',
  'js/app.js',
  'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/d3@7',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',

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
      .then(() => console.log('[SW] App Shell cacheado correctamente'))
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
            if (!networkResponse || networkResponse.status !== 200) {
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
