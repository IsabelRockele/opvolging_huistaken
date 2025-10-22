// sw.js – minimale service worker, zonder no-op fetch
// update 2025-10-22  (versie 6)
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));
// Geen fetch-handler: netwerkverkeer verloopt normaal via de browser.
