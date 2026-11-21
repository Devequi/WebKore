// Transição: nunca registra um worker e não toca nos dados do localStorage.
export async function retireLegacyPwa({ serviceWorker, cacheStorage, baseUrl }) {
  const expectedScript = new URL("sw.js", baseUrl).href;
  const registrations = serviceWorker ? await serviceWorker.getRegistrations() : [];
  const ownRegistrations = registrations.filter((registration) =>
    [registration.active, registration.waiting, registration.installing].some((worker) => worker?.scriptURL === expectedScript));
  const controlled = serviceWorker?.controller?.scriptURL === expectedScript;
  const removed = await Promise.all(ownRegistrations.map((registration) => registration.unregister()));
  if (cacheStorage) {
    const keys = await cacheStorage.keys();
    await Promise.all(keys.filter((key) => key.startsWith("webkore-cache") ||
      key === `workbox-precache-v2-${baseUrl}`).map((key) => cacheStorage.delete(key)));
  }
  return { controlled, removed: removed.some(Boolean) };
}
