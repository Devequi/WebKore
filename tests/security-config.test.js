import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createApp } from '../server/src/aplicativo.js';
import { allowedOrigins } from '../server/src/lib/security.js';
import { getJwtSecret } from '../server/src/lib/environment.js';
import { getSessionSeconds } from '../server/src/lib/sessions.js';

test('produção recusa segredo fraco, CORS ausente ou inseguro e proxy irrestrito', () => {
  const original = { ...process.env };
  try {
    process.env.NODE_ENV = 'production';
    process.env.JWT_SECRET = 'weak';
    assert.throws(getJwtSecret, /mínimo 32 bytes/);
    process.env.JWT_SECRET = randomBytes(48).toString('hex');
    delete process.env.APP_ORIGINS;
    assert.throws(allowedOrigins, /Configure APP_ORIGINS/);
    for (const origin of ['*', 'http://webkore.example', 'https://webkore.example/path', 'https://webkore.example/']) {
      process.env.APP_ORIGINS = origin;
      assert.throws(allowedOrigins);
    }
    process.env.APP_ORIGINS = 'https://webkore.example';
    assert.deepEqual(allowedOrigins(), ['https://webkore.example']);
    process.env.TRUST_PROXY = 'true';
    assert.throws(createApp, /TRUST_PROXY/);
    for (const seconds of ['0', '-1', '999999999', 'invalid']) {
      process.env.AUTH_SESSION_SECONDS = seconds;
      assert.throws(getSessionSeconds);
    }
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
    Object.assign(process.env, original);
  }
});

test('API aplica limites, CORS, headers e erros JSON controlados sem acessar banco', async () => {
  const original = { ...process.env };
  let server;
  try {
    process.env.NODE_ENV = 'test';
    process.env.APP_ORIGINS = 'https://webkore.example';
    process.env.AUTH_REGISTER_LIMIT = '2';
    delete process.env.TRUST_PROXY;
    server = createApp().listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const health = await fetch(base + '/health');
    assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(health.headers.get('cache-control'), 'no-store');
    assert.ok(health.headers.get('x-request-id'));
    const cors = await fetch(base + '/auth/me', { method: 'OPTIONS', headers: { Origin: 'https://webkore.example', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'Authorization' } });
    assert.equal(cors.status, 204);
    assert.equal(cors.headers.get('access-control-allow-origin'), 'https://webkore.example');
    assert.equal((await fetch(base + '/health', { headers: { Origin: 'https://intruso.example' } })).status, 403);
    for (const [body, status] of [['{', 400], ['[]', 400], ['{}', 429]]) {
      const response = await fetch(base + '/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      assert.equal(response.status, status);
      assert.deepEqual(Object.keys(await response.json()), ['message']);
      if (status === 429) assert.ok(Number(response.headers.get('retry-after')) > 0);
    }
    const compressed = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Encoding': 'gzip' }, body: 'compressed' });
    assert.equal(compressed.status, 415);
  } finally {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    for (const key of Object.keys(process.env)) if (!(key in original)) delete process.env[key];
    Object.assign(process.env, original);
  }
});
