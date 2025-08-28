// sw.js – minimale service worker, zonder no-op fetch
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
// Geen fetch-handler: netwerkverkeer verloopt normaal via de browser.
