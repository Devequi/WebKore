import assert from "node:assert/strict";
import test from "node:test";
import bcrypt from "bcryptjs";
import { loadState, loadStateForStartup } from "../src/services/storage.js";
import { authenticate, clearSession, rememberSession, restoreSession } from "../src/services/session.js";
import { getAuthToken, setAuthToken } from "../src/services/api.js";

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key), values };
}

test("dados antigos preservados e senha convertida; erros HTTP não permitem fallback local", async () => {
  const storage = memoryStorage();
  globalThis.localStorage = storage;
  const originalFetch = globalThis.fetch;
  const password = crypto.randomUUID();
  const legacy = { users: [{ id: "legacy", name: "Conta local", email: "local@example.invalid", role: "coach", password }],
    teams: [{ id: "legacy-team", coachId: "legacy" }], memberships: [], trainings: [] };
  storage.setItem("webkore-state-v2", JSON.stringify(legacy));
  try {
    const migrated = loadState();
    assert.equal(migrated.users[0].password, undefined);
    assert.equal(await bcrypt.compare(password, migrated.users[0].passwordHash), true);
    assert.deepEqual(migrated.teams, legacy.teams);
    assert.ok(!storage.getItem("webkore-state-v2").includes(password));
    globalThis.fetch = async () => { throw new TypeError("offline"); };
    const local = await authenticate({ email: "local@example.invalid", password, role: "coach" });
    assert.equal(local.session.source, "local");
    assert.equal((await restoreSession()).user.id, "legacy");
    globalThis.fetch = async () => new Response(JSON.stringify({ message: "Credenciais inválidas." }), { status: 401 });
    await assert.rejects(() => authenticate({ email: "local@example.invalid", password, role: "coach" }), /Credenciais inválidas/);
    clearSession();
    assert.equal(getAuthToken(), null);
    assert.ok(storage.getItem("webkore-state-v2"));
    const broken = "{dados-corrompidos";
    storage.setItem("webkore-state-v2", broken);
    assert.throws(loadState);
    assert.ok(loadStateForStartup().notice.includes("preservados"));
    assert.ok(Array.isArray(loadStateForStartup().state.trainings));
    await assert.rejects(() => authenticate({ email: "local@example.invalid", password, role: "coach" }), /Credenciais inválidas/);
    globalThis.fetch = async () => { throw new TypeError("offline"); };
    await assert.rejects(() => authenticate({ email: "local@example.invalid", password, role: "coach" }));
    assert.equal(storage.getItem("webkore-state-v2"), broken);
  } finally { globalThis.fetch = originalFetch; delete globalThis.localStorage; }
});

test("cache offline pertence à sessão anterior, não restaura JWT expirado e logout preserva histórico", async () => {
  globalThis.localStorage = memoryStorage();
  const originalFetch = globalThis.fetch;
  try {
    const token = (id, exp) => `header.${btoa(JSON.stringify({ id, exp }))}.signature`;
    const payload = { user: { id: "cached-user", role: "athlete" }, state: {
      users: [{ id: "cached-user", password: "não deve aparecer", passwordHash: "nem hash" }],
      teams: [], memberships: [], trainings: [{ id: "preserved-training" }] } };
    rememberSession(payload);
    globalThis.fetch = async () => { throw new TypeError("offline"); };
    setAuthToken(token("cached-user", Math.floor(Date.now() / 1000) + 60));
    const cache = await restoreSession();
    assert.equal(cache.offline, true);
    assert.equal(cache.state.users[0].password, undefined);
    assert.equal(cache.state.users[0].passwordHash, undefined);
    assert.equal(cache.state.trainings[0].id, "preserved-training");
    for (const [id, exp] of [["another-user", Math.floor(Date.now() / 1000) + 60], ["cached-user", 1]]) {
      setAuthToken(token(id, exp));
      await assert.rejects(restoreSession);
    }
    clearSession();
    assert.equal(await restoreSession(), null);
    assert.ok(localStorage.getItem("webkore-api-state-v1:cached-user").includes("preserved-training"));
  } finally { globalThis.fetch = originalFetch; delete globalThis.localStorage; }
});

test("cadastro local exige nascimento válido e preserva data sem manter idade fixa", async () => {
  globalThis.localStorage = memoryStorage();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new TypeError("offline"); };
  const credentials = { name: "Atleta local", email: "birth@example.invalid", password: crypto.randomUUID(), role: "athlete" };
  try {
    for (const birthDate of [undefined, "", "2026-02-30", "9999-12-31"]) {
      await assert.rejects(() => authenticate({ ...credentials, birthDate }, true), /nascimento/);
    }
    const payload = await authenticate({ ...credentials, birthDate: "2004-02-29" }, true);
    assert.equal(payload.user.birthDate, "2004-02-29");
    assert.equal((await restoreSession()).user.birthDate, "2004-02-29");
    const stored = loadState();
    stored.users.find((user) => user.id === payload.user.id).age = 12;
    localStorage.setItem("webkore-state-v2", JSON.stringify(stored));
    const reloaded = loadState();
    assert.equal(reloaded.users.find((user) => user.id === payload.user.id).birthDate, "2004-02-29");
    assert.equal(reloaded.users.find((user) => user.id === payload.user.id).age, undefined);
  } finally { clearSession(); globalThis.fetch = originalFetch; delete globalThis.localStorage; }
});
