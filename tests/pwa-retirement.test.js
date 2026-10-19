import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { retireLegacyPwa } from "../src/services/retirePwa.js";

test("desativação remove somente worker e caches do WebKore, sem registrar outro", async () => {
  const baseUrl = "https://webkore.example/";
  const removed = [];
  const cachesDeleted = [];
  const registration = (url) => ({ active: { scriptURL: url }, unregister: async () => { removed.push(url); return true; } });
  const result = await retireLegacyPwa({ baseUrl,
    serviceWorker: { controller: { scriptURL: `${baseUrl}sw.js` }, getRegistrations: async () => [
      registration(`${baseUrl}sw.js`), registration(`${baseUrl}outra-aplicacao/sw.js`)
    ] },
    cacheStorage: { keys: async () => ["webkore-cache-v1", `workbox-precache-v2-${baseUrl}`,
      `workbox-precache-v2-${baseUrl}outra-aplicacao/`, "dados-legitimos"], delete: async (key) => cachesDeleted.push(key) }
  });
  assert.deepEqual(result, { controlled: true, removed: true });
  assert.deepEqual(removed, [`${baseUrl}sw.js`]);
  assert.deepEqual(cachesDeleted, ["webkore-cache-v1", `workbox-precache-v2-${baseUrl}`]);
  assert.deepEqual(await retireLegacyPwa({ baseUrl }), { controlled: false, removed: false });
});

test("worker de transição assume o controle, desregistra e nunca intercepta fetch", async () => {
  const listeners = new Map();
  const calls = [];
  const scope = "https://webkore.example/";
  vm.runInNewContext(await readFile(new URL("../public/sw.js", import.meta.url), "utf8"), {
    self: { addEventListener: (name, listener) => listeners.set(name, listener),
      skipWaiting: async () => calls.push("skipWaiting"),
      clients: { claim: async () => calls.push("claim"), matchAll: async () => [
        { url: scope, navigate: async () => calls.push("reload") },
        { url: `${scope}outra-aplicacao/`, navigate: async () => calls.push("unexpected") }
      ] },
      registration: { scope, unregister: async () => calls.push("unregister") } },
    caches: { keys: async () => [`workbox-precache-v2-${scope}`, "outra-base"], delete: async (key) => calls.push(key) }
  });
  for (const name of ["install", "activate"]) {
    let completion;
    listeners.get(name)({ waitUntil: (promise) => { completion = promise; } });
    await completion;
  }
  assert.equal(listeners.has("fetch"), false);
  assert.deepEqual(calls, ["skipWaiting", `workbox-precache-v2-${scope}`, "claim", "unregister", "reload"]);
});
