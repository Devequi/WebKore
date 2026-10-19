import assert from "node:assert/strict";
import test from "node:test";
import { removeLegacyApiCache } from "../src/services/storage.js";
import { authenticate, clearSession, rememberSession, restoreSession } from "../src/services/session.js";
import { ApiError, api, getAuthToken, NetworkError, setAuthToken } from "../src/services/api.js";

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key), key: (index) => [...values.keys()][index] ?? null,
    get length() { return values.size; }, values };
}
const payload = () => ({ token: "test-token", user: { id: "a", role: "athlete", birthDate: "2004-02-29" },
  state: { users: [{ id: "a", role: "athlete", birthDate: "2004-02-29" }], teams: [], memberships: [], trainings: [] } });
const credentials = { name: "Atleta", email: "athlete@example.invalid", password: "Teste123!", role: "athlete", birthDate: "2004-02-29" };

async function withStorage(run) {
  globalThis.localStorage = memoryStorage();
  const originalFetch = globalThis.fetch;
  try { await run(); } finally { globalThis.fetch = originalFetch; delete globalThis.localStorage; }
}

test("falha de rede não autentica, não cadastra conta local e não restaura cache", () => withStorage(async () => {
  const legacy = '{"users":[{"id":"legacy"}]}';
  localStorage.setItem("webkore-state-v2", legacy);
  localStorage.setItem("webkore-api-state-v1:a", JSON.stringify(payload()));
  setAuthToken("test-token");
  globalThis.fetch = async () => { throw new TypeError("sem conexão"); };
  for (const register of [true, false]) await assert.rejects(() => authenticate(credentials, register), NetworkError);
  await assert.rejects(restoreSession, NetworkError);
  assert.equal(getAuthToken(), "test-token");
  assert.equal(localStorage.getItem("webkore-state-v2"), legacy);
  assert.equal([...localStorage.values.keys()].filter((key) => key.includes("state")).length, 2);
}));

test("sessão exige API, preserva nascimento, persiste apenas token e trata erros HTTP", () => withStorage(async () => {
  globalThis.fetch = async () => Response.json(payload());
  const result = await authenticate(credentials, true);
  assert.equal(result.user.birthDate, "2004-02-29");
  assert.equal(getAuthToken(), "test-token");
  assert.deepEqual([...localStorage.values.keys()], ["webkore-auth-token-v1"]);
  assert.equal((await restoreSession()).session.userId, "a");
  for (const status of [400, 403, 500]) {
    globalThis.fetch = async () => Response.json({ message: "Erro controlado." }, { status });
    await assert.rejects(restoreSession, (error) => error.status === status);
    assert.equal(getAuthToken(), "test-token");
  }
  globalThis.fetch = async () => Response.json({ message: "Sessão inválida." }, { status: 401 });
  await assert.rejects(restoreSession, (error) => error.status === 401);
  assert.equal(getAuthToken(), null);
  assert.equal(await restoreSession(), null);
}));

test("resposta antiga com 401 não apaga o token de outra sessão", () => withStorage(async () => {
  setAuthToken("old-token");
  let resolve;
  globalThis.fetch = () => new Promise((done) => { resolve = done; });
  const pending = restoreSession();
  setAuthToken("new-token");
  resolve(Response.json({ message: "Expirou" }, { status: 401 }));
  await assert.rejects(pending, (error) => error.status === 401);
  assert.equal(getAuthToken(), "new-token");
}));

test("sessão incompleta ou cadastro sem nascimento não persistem autenticação", () => withStorage(async () => {
  for (const value of [null, {}, { user: payload().user }, { ...payload(), state: { users: [] } }]) {
    assert.throws(() => rememberSession(value), (error) => error.status === 502);
  }
  globalThis.fetch = async () => Response.json({ ...payload(), state: null });
  await assert.rejects(() => authenticate(credentials), (error) => error.status === 502);
  assert.equal(getAuthToken(), null);
  for (const birthDate of [undefined, null, "2026-02-30", "9999-12-31"]) {
    await assert.rejects(() => authenticate({ ...credentials, birthDate }, true), /nascimento/);
  }
}));

test("cliente rejeita JSON inválido, respeita cancelamento e não usa cache HTTP", () => withStorage(async () => {
  globalThis.fetch = async (_url, options) => {
    assert.equal(options.cache, "no-store");
    return new Response("<html>Proxy indisponível</html>");
  };
  await assert.rejects(() => api.me(), (error) => error instanceof ApiError && error.status === 502);
  const controller = new AbortController();
  globalThis.fetch = async () => { throw new DOMException("Cancelado", "AbortError"); };
  controller.abort();
  await assert.rejects(() => api.me({ signal: controller.signal }), (error) => error.name === "AbortError");
}));

test("transição limpa somente cache da API, preservando token, preferências, base e fila legadas", () => withStorage(async () => {
  const preserved = ["webkore-state-v2", "webkore-offline-queue-v1", "webkore-auth-token-v1", "preferencia"];
  for (const key of [...preserved, "webkore-api-state-v1:a", "webkore-api-state-v1:b", "webkore-session-v1"]) localStorage.setItem(key, key);
  removeLegacyApiCache();
  assert.deepEqual([...localStorage.values.keys()], preserved);
  clearSession();
  assert.equal(localStorage.getItem("webkore-state-v2"), "webkore-state-v2");
}));
