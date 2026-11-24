import { randomUUID, randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readFile, rm } from 'node:fs/promises';
import { createServer as createSocketServer } from 'node:net';
import { resolve, sep } from 'node:path';
import { PrismaClient } from '@prisma/client';
import '../../server/src/config/environment.js';
import { writeReport, jsonFile } from './report.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const security = process.argv.includes('--security');
const visual = process.argv.includes('--visual');
const built = process.argv.includes('--built');
const dbName = `webkore_ct20_${randomUUID().replaceAll('-', '')}`;
const cacheRoot = resolve(root, 'node_modules', '.vite-ct20');
const cacheDir = resolve(cacheRoot, dbName);
let admin, created = false, apiServer, apiPrisma, vite, child;
let exitCode = 1, errorMessage, cleanup = 'Nenhum banco temporário criado.', interrupted = false;
const interruption = () => { interrupted = true; child?.kill('SIGTERM'); };
process.once('SIGINT', interruption);
process.once('SIGTERM', interruption);

function command(relativePath, args) {
  return new Promise((resolve, reject) => {
    if (interrupted) { reject(new Error('Execução interrompida; iniciando limpeza.')); return; }
    child = spawn(process.execPath, [fileURLToPath(new URL(relativePath, import.meta.url)), ...args], {
      cwd: root, env: { ...process.env }, stdio: 'inherit', windowsHide: true
    });
    child.once('error', reject);
    child.once('exit', code => { child = null; code === 0 ? resolve() : reject(new Error(`Comando ${relativePath.split('/').at(-1)} encerrou com código ${code}.`)); });
  });
}

async function dropTemporaryDatabase() {
  // The exact name is generated above; an existing database is never reused.
  if (!/^webkore_ct20_[a-f0-9]{32}$/.test(dbName)) throw new Error('Nome temporário inválido; remoção recusada.');
  await admin.$executeRawUnsafe(`DROP DATABASE \`${dbName}\``);
  const remaining = await admin.$queryRawUnsafe('SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?', dbName);
  if (remaining.length) throw new Error('O banco temporário ainda existe.');
}

try {
  if (process.env.NODE_ENV === 'production') throw new Error('Execução recusada em produção.');
  const source = process.env.WEBKORE_TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!source) throw new Error('Configure WEBKORE_TEST_DATABASE_URL ou DATABASE_URL para um servidor MySQL local/de testes.');
  const url = new URL(source);
  if (url.protocol !== 'mysql:') throw new Error('A suíte exige MySQL.');
  // Never push, seed, truncate or query the original database's tables.
  admin = new PrismaClient({ datasources: { db: { url: source } } });
  await admin.$executeRawUnsafe(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  created = true;
  url.pathname = `/${dbName}`;
  process.env.DATABASE_URL = url.toString();
  process.env.JWT_SECRET = randomBytes(48).toString('hex');
  process.env.NODE_ENV = 'test';
  process.env.WEBKORE_CT20_DB_NAME = dbName;
  process.env.WEBKORE_CT20_ISOLATED = '1';
  // Limites altos são explícitos e exclusivos das fixtures; testes dedicados
  // abaixo exercitam limites baixos reais em outra instância da aplicação.
  process.env.AUTH_LOGIN_LIMIT = '500';
  process.env.AUTH_REGISTER_LIMIT = '500';
  process.env.API_RATE_LIMIT = '10000';
  console.log(`CT20: schema e dados exclusivamente no banco temporário ${dbName}.`);
  await command('../../node_modules/prisma/build/index.js', ['migrate', 'deploy']);
  await command('../../prisma/publish-legal.js', []);
  const socket = createSocketServer();
  await new Promise((resolve, reject) => { socket.once('error', reject); socket.listen(0, '127.0.0.1', resolve); });
  const frontendPort = socket.address().port;
  await new Promise(resolve => socket.close(resolve));
  process.env.APP_ORIGINS = `http://127.0.0.1:${frontendPort}`;
  const { createApp } = await import('../../server/src/app.js');
  ({ prisma: apiPrisma } = await import('../../server/src/db/prisma.js'));
  apiServer = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { apiServer.once('listening', resolve); apiServer.once('error', reject); });
  process.env.WEBKORE_CT20_API = `http://127.0.0.1:${apiServer.address().port}/api`;
  process.env.VITE_API_URL = process.env.WEBKORE_CT20_API;
  const { createServer, preview } = await import('vite');
  const frontend = { host: '127.0.0.1', port: frontendPort, strictPort: true, open: false };
  if (built) {
    vite = await preview({ preview: { ...frontend, headers: { 'Content-Security-Policy': "connect-src 'self'" },
      proxy: { '/api': new URL(process.env.WEBKORE_CT20_API).origin } } });
  } else {
    vite = await createServer({ cacheDir,
      optimizeDeps: { entries: ['index.html'], include: ['react', 'react-dom/client', 'lucide-react', 'recharts'] },
      server: frontend });
    await vite.listen();
  }
  process.env.WEBKORE_CT20_ORIGIN = `http://127.0.0.1:${vite.httpServer.address().port}`;
  if (security) {
    await command('./security-check.mjs', []);
    await command('../../tests/integracao/api.check.js', ['7']);
    await command('../../tests/integracao/positions.check.js', []);
  }
  await command('../../node_modules/@playwright/test/cli.js', ['test', '--config', visual ? 'qa/ct20/visual.config.mjs' : 'qa/ct20/playwright.config.mjs', ...process.argv.slice(2).filter(arg => !['--security', '--visual', '--built'].includes(arg))]);
  if (security) await command('../../node_modules/@playwright/test/cli.js', ['test', '--config', 'qa/ct20/security-ui.config.mjs']);
  exitCode = 0;
} catch (error) {
  errorMessage = error.message;
  // Do not print server credentials or the JWT secret in preflight failures.
  for (const value of [process.env.WEBKORE_TEST_DATABASE_URL, process.env.DATABASE_URL, process.env.JWT_SECRET]) {
    if (value) errorMessage = errorMessage.replaceAll(value, '[redigido]');
  }
  console.error(`CT20: ${errorMessage}`);
} finally {
  const resourceErrors = [];
  // A cache/server failure must never skip the attempt to drop our database.
  for (const [name, close] of [
    ['frontend', async () => {
      if (built && vite) await new Promise(resolve => vite.httpServer.close(resolve));
      else await vite?.close();
    }],
    ['API', async () => { if (apiServer) { apiServer.closeAllConnections(); await new Promise(resolve => apiServer.close(resolve)); } }],
    ['conexão da API', async () => apiPrisma?.$disconnect()],
    ['cache', async () => {
      if (!cacheDir.startsWith(cacheRoot + sep)) throw new Error('Cache fora da pasta temporária.');
      await rm(cacheDir, { recursive: true, force: true });
    }]
  ]) {
    try { await close(); } catch { resourceErrors.push(name); }
  }
  try {
    if (created) {
      await dropTemporaryDatabase();
      cleanup = 'Banco temporário removido e ausência confirmada no MySQL. Banco original não consultado nem alterado.';
      console.log('CT20: banco temporário removido; banco original preservado.');
    }
  } catch {
    cleanup = `Falha de limpeza: remova exclusivamente ${dbName} no servidor de testes após verificar os processos. O banco original não foi alvo de remoção.`;
    exitCode = 1;
  } finally { await admin?.$disconnect(); }
  if (resourceErrors.length) { cleanup += ` Falha ao encerrar: ${resourceErrors.join(', ')}.`; exitCode = 1; }
  let data;
  try {
    data = JSON.parse(await readFile(jsonFile, 'utf8'));
    if (!data.isolation?.includes(dbName)) data = undefined;
  } catch {}
  if (!visual) await writeReport({ ...data, date: new Date().toISOString(), error: errorMessage, browser: process.env.WEBKORE_TEST_BROWSER_CHANNEL || 'chromium',
    isolation: created ? `Banco exclusivo ${dbName}; API, JWT e portas independentes.` : 'Preflight interrompido antes de criar um banco de testes.', cleanup });
  process.exitCode = exitCode;
}
