import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { clientsClaim, skipWaiting } from 'workbox-core';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare let self: ServiceWorkerGlobalScope;

// Activar inmediatamente sin esperar que cierren pestañas
skipWaiting();
clientsClaim();

// Limpiar cachés viejas de Workbox (precache entries obsoletas)
cleanupOutdatedCaches();

// Precachear todos los assets generados por Vite
precacheAndRoute(self.__WB_MANIFEST);

// HTML offline fallback — no depende de assets externos
const OFFLINE_HTML = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Sin conexión — BullWeb</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;
       background:#fff;font-family:system-ui,-apple-system,sans-serif;text-align:center;padding:24px}
  svg{width:80px;height:80px;color:#d1d5db;margin-bottom:24px}
  h1{font-size:24px;font-weight:700;color:#111827;margin-bottom:8px}
  p{font-size:16px;color:#6b7280;margin-bottom:32px}
  button{padding:12px 32px;background:#f97316;color:#fff;font-size:16px;font-weight:700;
         border:none;border-radius:12px;cursor:pointer;box-shadow:0 4px 14px rgba(249,115,22,.3)}
  button:hover{background:#ea580c}
</style></head><body>
<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
  <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15a9 9 0 0 1 15.67-6.69M2.25 9a9 9 0 0 1 15.67-2.69M3.75 3.75l16.5 16.5M7.5 17.25a9 9 0 0 1-2.49-4.5M12 12.75a9 9 0 0 1-1.88-2.25"/>
</svg>
<h1>Sin conexión a internet</h1>
<p>Verifica tu conexión e intenta de nuevo</p>
<button onclick="location.reload()">Reintentar</button>
</body></html>`;

// Rutas de navegación SPA con offline fallback
registerRoute(
  new NavigationRoute(
    async ({ event }) => {
      try {
        const handler = createHandlerBoundToURL('index.html');
        return await handler({ event } as any);
      } catch {
        return new Response(OFFLINE_HTML, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
          status: 503,
        });
      }
    }
  )
);

// API: Notificaciones — StaleWhileRevalidate (polling frecuente)
registerRoute(
  /^https:\/\/app\.bullwebchile\.com\/api\/notifications\/recent/i,
  new StaleWhileRevalidate({
    cacheName: 'notifications-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 5 })],
  }),
  'GET'
);

// API: QR orders count — StaleWhileRevalidate (polling frecuente)
registerRoute(
  /^https:\/\/app\.bullwebchile\.com\/api\/qr-orders\/online\/count/i,
  new StaleWhileRevalidate({
    cacheName: 'qr-count-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 5, maxAgeSeconds: 60 * 2 })],
  }),
  'GET'
);

// API: NetworkFirst con TTL corto (regla general — va DESPUÉS de las específicas)
registerRoute(
  /^https:\/\/app\.bullwebchile\.com\/api\/.*/i,
  new NetworkFirst({
    cacheName: 'api-cache-v2',
    networkTimeoutSeconds: 10,
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 300 })],
  }),
  'GET'
);

// Al activar: borrar cachés viejas. skipWaiting + clientsClaim ya garantizan
// que el nuevo SW toma control inmediatamente sin necesidad de forzar reload.
self.addEventListener('activate', (event: ExtendableEvent) => {
  const KEEP_CACHES = ['api-cache-v2', 'notifications-cache', 'qr-count-cache'];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => !KEEP_CACHES.includes(name) && !name.startsWith('workbox-precache-v2'))
          .map((name) => caches.delete(name))
      )
    )
  );
});
