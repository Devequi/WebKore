import assert from 'node:assert/strict';
import { fork, spawnSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import { PrismaClient } from '@prisma/client';
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import '../../server/src/config/environment.js';

// The API runs in its own process so sampler and browser driver allocations stay out of its heap.
if (process.argv.includes('--api-worker')) {
  const { createApp } = await import('../../server/src/app.js');
  const { prisma } = await import('../../server/src/db/prisma.js');
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  process.send(server.address().port);
  process.on('message', () => {
    global.gc();
    const { heapUsed, rss } = process.memoryUsage();
    process.send({ heapUsed, rss });
  });
  process.on('disconnect', () => server.close(() => prisma.$disconnect()));
} else {
  await audit();
}

async function audit() {
  const source = new URL(process.env.WEBKORE_TEST_DATABASE_URL || process.env.DATABASE_URL);
  assert.ok(source.protocol === 'mysql:' && ['localhost', '127.0.0.1'].includes(source.hostname) && process.env.NODE_ENV !== 'production');
  const admin = new PrismaClient({ datasourceUrl: source.href });
  const prefix = 'webkore_audit_' + randomBytes(12).toString('hex');
  const created = [];
  let api, browser, web;
  const target = new URL(source);
  target.pathname = '/' + prefix;
  const env = { ...process.env, NODE_ENV: 'test', DATABASE_URL: target.href, JWT_SECRET: randomBytes(48).toString('hex') };
  const restore = prefix + '_restore';
  const mysqlBin = process.env.MYSQL_BIN_DIR || (process.platform === 'win32' ? join(process.env.ProgramFiles, 'MySQL', 'MySQL Server 8.0', 'bin') : '');
  function sql(command, args, input) {
    const file = join(mysqlBin, command + (process.platform === 'win32' ? '.exe' : ''));
    const result = spawnSync(file, ['--no-defaults', '--default-character-set=utf8mb4', '--protocol=TCP', '--host', source.hostname, '--port', source.port || '3306',
      '--user', decodeURIComponent(source.username), ...args], { input, env: { ...env, MYSQL_PWD: decodeURIComponent(source.password) } });
    assert.equal(result.status, 0, command + ' falhou: ' + (result.error?.code || result.stderr?.toString() || ''));
    return result.stdout;
  }
  try {
    for (const name of [prefix, restore]) {
      await admin.$executeRawUnsafe('CREATE DATABASE ' + name + ' CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
      created.push(name);
    }
    for (const args of [['node_modules/prisma/build/index.js', 'migrate', 'deploy'], ['prisma/publish-legal.js']]) {
      assert.equal(spawnSync(process.execPath, args, { env, stdio: 'inherit' }).status, 0);
    }
    assert.ok(existsSync('dist/index.html'), 'Execute o build antes do ensaio.');
    // Reserve the frontend origin before starting the API so its allowlist is exact.
    const socket = createServer().listen(0, '127.0.0.1');
    await once(socket, 'listening');
    const port = socket.address().port;
    await new Promise(resolve => socket.close(resolve));
    const origin = 'http://127.0.0.1:' + port;
    env.APP_ORIGINS = origin;
    api = fork(new URL(import.meta.url), ['--api-worker'], { env, execArgv: ['--expose-gc'] });
    const backend = 'http://127.0.0.1:' + (await once(api, 'message'))[0];
    web = await preview({ preview: { host: '127.0.0.1', port, strictPort: true, open: false,
      headers: { 'Content-Security-Policy': "connect-src 'self'" }, proxy: { '/api': backend } } });
    async function request(path, body, token) {
      const response = await fetch(backend + '/api' + path, { method: body ? 'POST' : 'GET',
        headers: { ...(body && { 'Content-Type': 'application/json', Connection: 'close' }), ...(token && { Authorization: 'Bearer ' + token }) },
        body: body && JSON.stringify(body) });
      assert.ok(response.ok, path + ' HTTP ' + response.status);
      return response.json();
    }
    const { documents } = await request('/legal/documents');
    const account = await request('/auth/register', { name: 'QA local', email: prefix + '@example.invalid', role: 'coach',
      password: randomBytes(24).toString('hex'), legal: { termsId: documents.find(d => d.type === 'TERMS').id,
        privacyId: documents.find(d => d.type === 'PRIVACY').id, acceptTerms: true, acknowledgePrivacy: true } });
    const team = await request('/teams', { name: 'Equipe de auditoria', modality: 'Futsal' }, account.token);
    const dumpArgs = ['--single-transaction', '--skip-comments', '--skip-dump-date', '--order-by-primary', '--hex-blob', '--no-tablespaces', '--set-gtid-purged=OFF'];
    const backup = sql('mysqldump', [...dumpArgs, prefix]);
    sql('mysql', ['--binary-mode', restore], backup);
    const dataHash = name => createHash('sha256').update(sql('mysqldump', [...dumpArgs, '--no-create-info', name])).digest('hex');
    assert.equal(dataHash(restore), dataHash(prefix), 'Os dados de todas as tabelas devem coincidir.');
    const metadata = [
      'SELECT TABLE_NAME, ENGINE, TABLE_COLLATION FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME',
      'SELECT TABLE_NAME, COLUMN_NAME, ORDINAL_POSITION, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, EXTRA, COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME, ORDINAL_POSITION',
      'SELECT TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME, NON_UNIQUE, INDEX_TYPE, SUB_PART FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX',
      'SELECT TABLE_NAME, CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME, CONSTRAINT_NAME, ORDINAL_POSITION',
      'SELECT TABLE_NAME, CONSTRAINT_NAME, UPDATE_RULE, DELETE_RULE FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() ORDER BY TABLE_NAME, CONSTRAINT_NAME'
    ].join(';');
    const schema = name => sql('mysql', ['--batch', '--skip-column-names', name, '--execute', metadata]);
    assert.deepEqual(schema(restore), schema(prefix), 'Estrutura relacional restaurada divergente.');
    console.log('Backup restaurado:', backup.length, 'bytes. Dados, colunas, índices e FKs conferidos.');
    async function readSession() {
      const payload = await request('/auth/me', undefined, account.token);
      assert.equal(payload.user.id, account.user.id);
      assert.ok(payload.state.teams.some(t => t.id === team.id));
    }
    let transportErrors = 0;
    for (const concurrency of [1, 4, 8]) {
      const timings = [];
      const errors = [];
      const begin = performance.now();
      await Promise.all(Array.from({ length: concurrency }, async () => {
        for (let i = 0; i < 80 / concurrency; i++) {
          const start = performance.now();
          try {
            await readSession();
            timings.push(performance.now() - start);
          } catch (error) {
            if (!error.cause?.code) throw error;
            errors.push(error.cause.code);
          }
        }
      }));
      timings.sort((a, b) => a - b);
      transportErrors += errors.length;
      const percentile = p => Math.round(timings[Math.ceil(timings.length * p) - 1]);
      console.log('Carga', JSON.stringify({ concurrency, ok: timings.length, errors, p50ms: percentile(.5), p95ms: percentile(.95), rps: +(timings.length * 1000 / (performance.now() - begin)).toFixed(1) }));
    }
    browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' && { channel: 'msedge' }) });
    const page = await browser.newPage();
    await page.addInitScript(token => localStorage.setItem('webkore-auth-token-v1', token), account.token);
    await page.goto(origin);
    const cdp = await page.context().newCDPSession(page);
    const begin = performance.now();
    for (let minute = 0; minute <= 10; minute++) {
      await delay(Math.max(0, begin + minute * 60000 - performance.now()));
      // Hash navigation keeps the document and authenticated session alive.
      for (const [route, selector] of [['/perfil', '.profile-page'], ['/coach/teams', '.lobby-page']]) {
        await page.evaluate(path => { location.hash = path; }, route);
        await page.locator(selector).first().waitFor();
        await readSession();
      }
      const reply = once(api, 'message');
      api.send('sample');
      const [memory] = await reply;
      // Allow React's passive cleanup and the browser's rendering tasks to finish.
      await delay(500);
      await cdp.send('HeapProfiler.collectGarbage');
      await cdp.send('HeapProfiler.collectGarbage');
      const heap = await cdp.send('Runtime.getHeapUsage');
      const dom = await cdp.send('Memory.getDOMCounters');
      console.log('Amostra', JSON.stringify({ minute, apiHeapMiB: +(memory.heapUsed / 1048576).toFixed(2), apiRssMiB: +(memory.rss / 1048576).toFixed(2),
        browserHeapMiB: +(heap.usedSize / 1048576).toFixed(2), ...dom }));
    }
    assert.equal(transportErrors, 0, 'Requisições de carga com erro de transporte.');
  } finally {
    try {
      await browser?.close();
      if (web) await new Promise(resolve => web.httpServer.close(resolve));
      if (api?.connected) { const closed = once(api, 'exit'); api.disconnect(); await closed; }
    } finally {
      try { for (const name of created.reverse()) await admin.$executeRawUnsafe('DROP DATABASE ' + name); }
      finally { await admin.$disconnect(); }
    }
  }
}
