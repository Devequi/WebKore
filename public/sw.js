// Worker de desativação para instalações anteriores. Sem fetch, cache ou offline.
// Deve continuar publicado na URL antiga até os clientes antigos migrarem.
self.addEventListener("install", (event) => event.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (event) => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith("webkore-cache") ||
    key === `workbox-precache-v2-${self.registration.scope}`).map((key) => caches.delete(key)));
  await self.clients.claim();
  await self.registration.unregister();
  const windows = await self.clients.matchAll({ type: "window" });
  await Promise.all(windows.filter((client) => client.url.split(/[?#]/)[0] === self.registration.scope)
    .map((client) => client.navigate(client.url).catch(() => undefined)));
})()));
