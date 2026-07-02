// Versión sincronizada con index.html (era 'director-hub-v2.2.1' inconsistente con v1.0.0 del HTML)
const CACHE_NAME = 'pecvs-director-v2.24.5';
const ASSETS = ['./', './index.html', './manifest.json', './icon.svg'];

self.addEventListener('install', (event) => {
    self.skipWaiting();
    event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) return caches.delete(key);
                })
            );
        }).then(() => self.clients.claim())
    );
});

// NETWORK FIRST APPROACH - FORCES FRESH FETCH
self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    // Solo cacheamos requests http/https. Extensions (chrome-extension://,
    // moz-extension://) y otros schemes no soportados por Cache API.
    const url = event.request.url;
    if (!url.startsWith('http')) return;

    event.respondWith(
        fetch(event.request, { cache: 'no-store' }).then((response) => {
            // No cachear responses que no sean OK (evita ERR_BLOCKED_BY_CLIENT)
            // ni opaque responses sin status (cross-origin sin CORS).
            if (!response || !response.ok || response.type === 'opaqueredirect') {
                return response;
            }
            // Clone antes de devolver — fire-and-forget el cache para
            // que un error de cache nunca rompa la respuesta.
            const respClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, respClone).catch(() => {});
            }).catch(() => {});
            return response;
        }).catch(() => {
            return caches.match(event.request);
        })
    );
});
