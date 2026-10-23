// Minimal service worker: makes the app installable. No offline caching yet.
// Push handling arrives in Phase 3.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
