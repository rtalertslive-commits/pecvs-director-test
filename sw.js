// Versión sincronizada con index.html (era 'director-hub-v2.2.1' inconsistente con v1.0.0 del HTML)
const CACHE_NAME = 'pecvs-director-v2.41.0';
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
// Timeout de red. Sin esto, un fetch colgado (señal mala, torre saturada,
// captive portal) deja al SW sin responder — y el splash nativo del PWA se
// queda en pantalla hasta que el browser aborta solo (30-120s).
// Con 4s servimos cache y la app abre al instante; la próxima carga trae fresh.
const NAV_TIMEOUT_MS = 4000;
const LAST_RESORT_MS = 15000;

self.addEventListener('fetch', (event) => {
    if (event.request.method !== 'GET') return;

    // Solo cacheamos requests http/https. Extensions (chrome-extension://,
    // moz-extension://) y otros schemes no soportados por Cache API.
    const url = event.request.url;
    if (!url.startsWith('http')) return;

    event.respondWith((async () => {
        // Preparamos el fallback ANTES de la carrera.
        const cached = (await caches.match(event.request))
            || (event.request.mode === 'navigate'
                ? (await caches.match('./index.html')) || (await caches.match('./'))
                : null);

        try {
            const response = await Promise.race([
                fetch(event.request, { cache: 'no-store' }),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('sw-timeout')), NAV_TIMEOUT_MS))
            ]);
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
        } catch (err) {
            // Timeout o fallo de red → cache si lo tenemos.
            if (cached) return cached;
            // Sin cache: reintento sin timeout para que el browser muestre
            // su error de red real en vez de colgarse indefinidamente.
            return await Promise.race([
                fetch(event.request),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('sw-last-resort-timeout')), LAST_RESORT_MS))
            ]);
        }
    })());
});
