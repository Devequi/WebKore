import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const output = new URL("../dist/", import.meta.url);
const entries = await readdir(output);
assert.ok(!entries.some((name) => /^(manifest\.|registerSW\.|workbox-|icon-(192|512)\.)/.test(name)), "O build não deve conter artefatos do PWA.");
const html = await readFile(new URL("index.html", output), "utf8");
assert.doesNotMatch(html, /rel=["']manifest|registerSW|pwa-register/i);
const assets = await readdir(new URL("assets/", output));
for (const name of assets.filter((name) => name.endsWith(".js"))) {
  const script = await readFile(new URL(`assets/${name}`, output), "utf8");
  assert.doesNotMatch(script, /serviceWorker\.register\s*\(|workbox-window|virtual:pwa-register/);
}
const tombstone = await readFile(new URL("sw.js", output), "utf8");
assert.doesNotMatch(tombstone, /addEventListener\(["']fetch["']/);
assert.match(tombstone, /registration\.unregister/);
const lock = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
assert.ok(!Object.keys(lock.packages).some((name) => /node_modules\/(vite-plugin-pwa|workbox-[^/]+)$/.test(name)));
console.log("Build validado: sem manifest, instalação, registro de worker, Workbox ou ícones PWA; apenas desativação na URL antiga.");
