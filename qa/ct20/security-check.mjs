import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFile, mkdir } from 'node:fs/promises';
import jwt from 'jsonwebtoken';
import { createApp } from '../../server/src/aplicativo.js';
import { prisma } from '../../server/src/lib/prisma.js';
import { getJwtSecret } from '../../server/src/lib/environment.js';
import { issueSession, tokenOptions } from '../../server/src/lib/sessions.js';

const db = new URL(process.env.DATABASE_URL).pathname.slice(1);
if (process.env.WEBKORE_CT20_ISOLATED !== '1' || !/^webkore_ct20_[a-f0-9]{32}$/.test(db) || db !== process.env.WEBKORE_CT20_DB_NAME) throw new Error('Banco isolado obrigatório.');
const results = [], users = [];
const server = createApp().listen(0, '127.0.0.1');
await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
const base = `http://127.0.0.1:${server.address().port}/api`;
async function req(path, method = 'GET', body, account, status = 200, headers = {}, endpoint = base) {
  const response = await fetch(endpoint + path, { method, headers: { 'Content-Type': 'application/json', ...(account ? { Authorization: `Bearer ${account.token}` } : {}), ...headers }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const payload = response.status === 204 ? null : await response.json();
  assert.equal(response.status, status, `${method} ${path}: ${payload?.message || 'status'}`);
  return { payload, response };
}
async function register(role = 'coach') {
  const credentials = { name: 'Segurança fictícia', email: `${randomUUID()}@example.invalid`, password: randomUUID(), role, ...(role === 'athlete' ? { birthDate: '2000-01-01' } : {}) };
  const { payload } = await req('/auth/register', 'POST', credentials, null, 201);
  users.push(payload.user.id);
  return { ...payload, credentials };
}
async function check(name, operation) {
  try { await operation(); results.push({ name, status: 'passed' }); console.log(`SEC OK: ${name}`); }
  catch (error) { results.push({ name, status: 'failed', error: error.message }); throw error; }
}
try {
  const coach = await register(), other = await register(), athlete = await register('athlete');
  await check('Cadastro autentica e mantém sessão válida sem vazar hash', async () => {
    assert.equal((await req('/auth/me', 'GET', undefined, coach)).payload.user.id, coach.user.id);
    assert.equal(coach.user.passwordHash, undefined);
    const claims = jwt.verify(coach.token, getJwtSecret(), tokenOptions);
    assert.equal(claims.exp - claims.iat, 86400);
    assert.equal((await prisma.authSession.findUnique({ where: { id: claims.jti } })).userId, coach.user.id);
  });
  await check('Endpoints protegidos rejeitam ausência de autenticação', async () => {
    for (const path of ['/auth/me', '/teams', '/trainings/team/unknown']) await req(path, 'GET', undefined, null, 401);
  });
  await check('Assinatura adulterada, expiração, algoritmo, issuer, audience e claims inválidos são rejeitados', async () => {
    const original = jwt.decode(coach.token), { iat, exp, ...claims } = original;
    const sign = (payload, options = {}) => jwt.sign(payload, getJwtSecret(), { expiresIn: '1h', ...options });
    for (const token of [
      coach.token.slice(0, -8) + 'AAAAAAAA', sign(claims, { expiresIn: -1 }), sign(claims, { algorithm: 'HS384' }),
      sign({ ...claims, iss: 'other' }), sign({ ...claims, aud: 'other' }), sign({ ...claims, id: other.user.id }),
      sign({ ...claims, role: 'ADMIN' }), sign({ ...claims, ver: 8 }), sign({ ...claims, jti: randomUUID() }),
      jwt.sign(claims, getJwtSecret())
    ]) await req('/auth/me', 'GET', undefined, { token }, 401);
  });
  await check('Logout revoga cópia do JWT, persiste em outra instância e preserva outra sessão', async () => {
    const second = (await req('/auth/login', 'POST', coach.credentials)).payload;
    await req('/auth/logout', 'POST', {}, coach, 204);
    await req('/auth/me', 'GET', undefined, coach, 401);
    assert.equal(await prisma.authSession.findUnique({ where: { id: jwt.decode(coach.token).jti } }), null);
    await req('/auth/me', 'GET', undefined, coach, 401, {}, process.env.WEBKORE_CT20_API);
    await req('/auth/me', 'GET', undefined, second);
    coach.token = second.token;
  });
  await check('Troca de senha invalida todas as sessões e tokens emitidos com versão anterior', async () => {
    const second = (await req('/auth/login', 'POST', coach.credentials)).payload;
    const oldUser = await prisma.user.findUnique({ where: { id: coach.user.id } });
    const password = randomUUID();
    await req('/auth/me', 'PATCH', { password }, coach, 403);
    await req('/auth/me', 'PATCH', { email: 'intrusao@example.invalid', currentPassword: 'incorreta' }, coach, 403);
    const result = await req('/auth/me', 'PATCH', { password, currentPassword: coach.credentials.password }, coach);
    assert.equal(result.payload.reauthenticate, true);
    await req('/auth/me', 'GET', undefined, coach, 401);
    await req('/auth/me', 'GET', undefined, second, 401);
    assert.equal(await prisma.authSession.count({ where: { userId: coach.user.id } }), 0);
    const delayedToken = await issueSession(oldUser);
    await req('/auth/me', 'GET', undefined, { token: delayedToken }, 401);
    await req('/auth/login', 'POST', coach.credentials, null, 401);
    coach.credentials.password = password;
    coach.token = (await req('/auth/login', 'POST', coach.credentials)).payload.token;
    await req('/auth/me', 'GET', undefined, coach);
  });
  const team = (await req('/teams', 'POST', { name: 'Equipe segura', modality: 'Futsal' }, coach, 201)).payload;
  await check('Outro treinador e atleta não podem editar ou excluir equipe alheia', async () => {
    for (const [method, body] of [['PATCH', { name: 'Intrusão', coachId: other.user.id }], ['DELETE', undefined]]) {
      await req(`/teams/${team.id}`, method, body, other, 404);
      await req(`/teams/${team.id}`, method, body, athlete, 403);
    }
  });
  await req('/teams/join', 'POST', { code: team.code }, athlete, 201);
  await check('Vínculo pendente não concede leitura de treinos nem funções administrativas', async () => {
    await req(`/trainings/team/${team.id}`, 'GET', undefined, athlete, 404);
    await req('/trainings', 'POST', { teamId: team.id, date: '2026-11-18', type: 'Misto', records: [] }, athlete, 403);
    assert.equal((await req('/auth/me', 'GET', undefined, athlete)).payload.state.trainings.length, 0);
  });
  await check('Campos privilegiados e identidade de terceiros não são alteráveis', async () => {
    for (const patch of [{ id: other.user.id }, { role: 'COACH' }, { userId: other.user.id }, { passwordHash: 'intrusão' }]) await req('/auth/me', 'PATCH', patch, athlete, 403);
    const original = await prisma.user.findUnique({ where: { id: other.user.id } });
    await req('/auth/me', 'PATCH', { name: 'Nome próprio', authVersion: 999, sessions: { deleteMany: {} } }, athlete);
    assert.deepEqual(await prisma.user.findUnique({ where: { id: other.user.id } }), original);
    assert.equal((await prisma.user.findUnique({ where: { id: athlete.user.id } })).authVersion, 0);
  });
  await check('Objetos malformados, identificadores e presença inválida retornam erro controlado', async () => {
    await req('/auth/me', 'PATCH', [], athlete, 400);
    await req('/auth/me', 'PATCH', { email: { contains: '@' } }, athlete, 400);
    await req('/teams?code%5Bcontains%5D=x', 'GET', undefined, coach, 400);
    await req('/trainings/team/%27OR%201=1', 'GET', undefined, coach, 400);
    await req('/trainings', 'POST', { teamId: team.id, date: '2026-11-18', type: 'Misto', records: [{ athleteId: athlete.user.id, present: 'true' }] }, coach, 400);
    const bad = await fetch(base + '/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(bad.status, 400); assert.deepEqual(Object.keys(await bad.json()), ['message']);
  });
  await check('CORS bloqueia origem externa e aceita somente origem configurada; headers e limite de corpo ativos', async () => {
    await req('/health', 'GET', undefined, null, 403, { Origin: 'https://intruso.example' });
    const origin = process.env.APP_ORIGINS;
    const { response } = await req('/health', 'GET', undefined, null, 200, { Origin: origin });
    assert.equal(response.headers.get('access-control-allow-origin'), origin);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(response.headers.get('x-frame-options'), 'SAMEORIGIN');
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.has('x-powered-by'), false);
    await req('/auth/login', 'POST', { name: 'x'.repeat(103000) }, null, 413);
  });
  await check('Rate limit real responde 429 com Retry-After', async () => {
    const previous = process.env.AUTH_LOGIN_LIMIT; process.env.AUTH_LOGIN_LIMIT = '2';
    const limited = createApp().listen(0, '127.0.0.1');
    process.env.AUTH_LOGIN_LIMIT = previous;
    try {
      await new Promise(resolve => limited.once('listening', resolve));
      const endpoint = `http://127.0.0.1:${limited.address().port}/api`;
      for (let index = 0; index < 3; index++) {
        const { response } = await req('/auth/login', 'POST', { email: 'missing@example.invalid', password: 'incorreta' }, null, index < 2 ? 401 : 429, {}, endpoint);
        if (index === 2) assert.ok(Number(response.headers.get('retry-after')) > 0);
      }
    } finally { limited.closeAllConnections(); await new Promise(resolve => limited.close(resolve)); }
  });
  await check('Exclusão da conta remove sessões e invalida cópias do JWT', async () => {
    await req('/auth/me', 'DELETE', undefined, coach, 204);
    assert.equal(await prisma.authSession.count({ where: { userId: coach.user.id } }), 0);
    await req('/auth/me', 'GET', undefined, coach, 401);
  });
} finally {
  await prisma.team.deleteMany({ where: { coachId: { in: users } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
  server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
  await prisma.$disconnect();
  await mkdir('test-results/security', { recursive: true });
  await writeFile('test-results/security/results.json', JSON.stringify({ date: new Date().toISOString(), results }, null, 2));
}
