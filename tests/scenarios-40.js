// Executar explicitamente: node tests/scenarios-40.js
// HTTP/API e funções reais; fixtures exclusivas e verificação de preservação do banco.
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { createApp } from '../server/src/aplicativo.js';
import { prisma } from '../server/src/lib/prisma.js';
import { athletePerformance, evolutionPlot, filterEvolution } from '../src/utils/athletePerformance.js';
import { teamPerformance } from '../src/utils/teamPerformance.js';
import { getAthleteTrainings, getTeamTrainings } from '../src/utils/selectors.js';
import { defaultQualitativeCriteria as criteria } from '../shared/criteria.js';

const databaseHost = new URL(process.env.DATABASE_URL).hostname;
if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '[::1]'].includes(databaseHost)) {
  throw new Error('QA40 exige banco local de desenvolvimento/teste; execução em produção ou banco remoto recusada.');
}
const run = randomUUID();
const users = [], teams = [], results = [];
const models = ['user', 'team', 'membership', 'training', 'trainingRecord', 'evaluation', 'sportMetric'];
async function snapshot() {
  return Promise.all(models.map(async model => ({ model, digest: createHash('sha256').update(JSON.stringify(
    await prisma[model].findMany({ orderBy: { id: 'asc' } })
  )).digest('hex') })));
}
const original = await snapshot();
const server = createApp().listen(0, '127.0.0.1');
await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
const base = `http://127.0.0.1:${server.address().port}/api`;
async function request(path, method = 'GET', body, token, expected = 200) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const data = response.status === 204 ? null : await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}
async function register(role, suffix) {
  const data = await request('/auth/register', 'POST', { name: `QA ${suffix}`, email: `qa40-${run}-${suffix}@example.invalid`,
    password: randomUUID(), role, ...(role === 'athlete' ? { birthDate: '2000-01-01' } : {}) }, undefined, 201);
  users.push(data.user.id);
  return { id: data.user.id, token: data.token };
}
let coach, a, b;
async function team(suffix, members = [a], owner = coach) {
  const data = await request('/teams', 'POST', { name: `QA40 ${suffix} ${run}`, modality: 'Futsal' }, owner.token, 201);
  teams.push(data.id);
  for (const member of members) {
    await request('/teams/join', 'POST', { code: data.code }, member.token, 201);
    await request(`/teams/${data.id}/requests/${member.id}`, 'PATCH', { status: 'approved' }, owner.token);
  }
  return data;
}
const ratings = n => Object.fromEntries(criteria.map(c => [c, n]));
const record = (member, n) => ({ athleteId: member.id, ratings: ratings(n), present: true });
const create = (t, date = '2026-10-01', n = 5, records = [record(a, n)]) => request('/trainings', 'POST', {
  teamId: t.id, date, type: 'Misto', records
}, coach.token, 201);
const state = async (user = coach) => (await request('/auth/me', 'GET', undefined, user.token)).state;
const list = t => request(`/trainings/team/${t.id}`, 'GET', undefined, coach.token);
const patch = (tr, values, member = a) => request(`/trainings/${tr.id}/athletes/${member.id}`, 'PATCH', values, coach.token);
const remove = tr => request(`/trainings/${tr.id}`, 'DELETE', undefined, coach.token, 204);
const leave = (t, member = a) => request(`/teams/${t.id}/athletes/${member.id}`, 'DELETE', undefined, coach.token, 204);
const individual = ts => athletePerformance(ts, a.id);
async function check(id, title, fn) {
  const start = performance.now();
  try {
    const value = await fn();
    results.push({ id, title, status: value?.status || 'APROVADO', evidence: value?.evidence || value, durationMs: Math.round(performance.now() - start) });
  } catch (error) {
    results.push({ id, title, status: 'REPROVADO', evidence: error.message, durationMs: Math.round(performance.now() - start) });
  }
  console.log(JSON.stringify(results.at(-1)));
}
let preserved = false;
try {
  coach = await register('coach', 'coach'); a = await register('athlete', 'a'); b = await register('athlete', 'b');
  await check(1, 'Atleta sem treino', async () => {
    const t = await team('01'); const p = individual(getAthleteTrainings(await state(), t.id, a.id));
    assert.equal(p.observations.length, 0); assert.equal(p.averageScore, null); return '0 observações; média null.';
  });
  await check(2, 'Primeiro treino', async () => {
    const t = await team('02'); await create(t, undefined, 8); const p = individual(await list(t));
    assert.equal(p.observations.length, 1); assert.equal(p.averageScore, 8); assert.equal(p.hasComparableEvaluations, false);
    return 'Um ponto de nota 8; nenhuma tendência calculada (dados do gráfico).';
  });
  await check(3, 'Média de dois atletas', async () => {
    const t = await team('03', [a, b]); await create(t, undefined, undefined, [record(a, 2), record(b, 8)]);
    const p = teamPerformance(await list(t), t.id); assert.equal(p.averageScore, 5);
    assert.ok(Object.values(p.observations[0].ratings).every(n => n === 5)); return 'Notas 2 e 8: média geral e por critério = 5.';
  });
  await check(4, 'Remover atleta sem treino', async () => {
    const t = await team('04', [a, b]); await create(t, undefined, 7); const before = teamPerformance(await list(t), t.id);
    await leave(t, b); assert.deepEqual(teamPerformance(await list(t), t.id), before); return 'Histórico e médias idênticos após remover B sem registros.';
  });
  await check(5, 'Remover atleta com vários treinos', async () => {
    const t = await team('05'); for (const day of ['01', '02', '03']) await create(t, `2026-10-${day}`, 8);
    await leave(t); const p = teamPerformance(await list(t), t.id); assert.equal(p.evaluationCount, 3); assert.equal(p.averageScore, 8);
    assert.equal((await state(a)).trainings.filter(tr => tr.teamId === t.id).length, 0);
    return 'Treinador preserva 3 avaliações e média 8; atleta removido perde acesso à equipe.';
  });
  await check(6, 'Remover único atleta', async () => {
    const t = await team('06'); await create(t, undefined, 7); await leave(t); const p = teamPerformance(await list(t), t.id);
    assert.equal(p.evaluationCount, 1); assert.equal(p.averageScore, 7);
    const empty = await team('06-vazio'); await leave(empty); assert.equal(teamPerformance(await list(empty), empty.id).averageScore, null);
    return 'Com histórico: média 7 preservada. Sem histórico: média null e 0 pontos.';
  });
  await check(7, 'Remover atleta de maior nota', async () => {
    const t = await team('07', [a, b]); await create(t, undefined, undefined, [record(a, 2), record(b, 10)]); await leave(t, b);
    assert.equal(teamPerformance(await list(t), t.id).averageScore, 6); return 'Média permanece 6: regra atual inclui histórico de ex-integrantes, não apenas ativos.';
  });
  await check(8, 'Transferência por saída e entrada', async () => {
    const old = await team('08-origem'); await create(old, undefined, 9); const next = await team('08-destino', []);
    await leave(old); await request('/teams/join', 'POST', { code: next.code }, a.token, 201);
    await request(`/teams/${next.id}/requests/${a.id}`, 'PATCH', { status: 'approved' }, coach.token);
    await create(next, undefined, 3); assert.equal(teamPerformance(await list(old), old.id).averageScore, 9);
    assert.equal(teamPerformance(await list(next), next.id).averageScore, 3);
    const s = await state(a); assert.equal(getAthleteTrainings(s, old.id, a.id).length, 0); assert.equal(getAthleteTrainings(s, next.id, a.id).length, 1);
    return 'Saída + solicitação + aprovação: histórico 9 na origem, 3 no destino, sem cópia. Não existe transferência atômica.';
  });
  await check(9, 'Editar nota 5 para 9', async () => {
    const t = await team('09'); const tr = await create(t); await patch(tr, { ratings: ratings(9) });
    assert.equal(individual(await list(t)).averageScore, 9); return 'Média mudou de 5 para 9 após GET persistido.';
  });
  await check(10, 'Editar 8 para 8', async () => {
    const t = await team('10'); const tr = await create(t, undefined, 8); const before = await list(t);
    await patch(tr, { ratings: ratings(8) }); assert.deepEqual(await list(t), before);
    assert.equal(await prisma.trainingRecord.count({ where: { trainingId: tr.id } }), 1); return 'Resposta idêntica, um registro e uma avaliação; nenhuma duplicação.';
  });
  await check(11, 'Editar data de treino', async () => {
    const t = await team('11'); const tr = await create(t);
    const response = await fetch(`${base}/trainings/${tr.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${coach.token}` }, body: JSON.stringify({ date: '2025-01-01' }) });
    assert.equal(response.status, 200, `Edição de data indisponível: PATCH /trainings/:id retornou ${response.status}; não existe rota nem formulário para editar data.`);
  });
  for (const [id, title, index] of [[12, 'Excluir treino intermediário', 1], [13, 'Excluir treino recente', 2]]) await check(id, title, async () => {
    const t = await team(String(id)); const ts = [];
    for (let i = 0; i < 3; i++) ts.push(await create(t, `2026-10-0${i + 1}`, [2, 5, 9][i]));
    await remove(ts[index]); const p = individual(await list(t)); assert.equal(p.observations.length, 2);
    assert.ok(!p.observations.some(x => x.trainingId === ts[index].id));
    assert.equal(p.observations.at(-1).date, index === 2 ? '2026-10-02' : '2026-10-03');
    assert.equal(await prisma.evaluation.count({ where: { record: { trainingId: ts[index].id } } }), 0);
    return `2 pontos restantes; último válido ${p.observations.at(-1).date}; avaliação excluída em cascata.`;
  });
  await check(14, 'Excluir todos os treinos', async () => {
    const t = await team('14'); const tr = await create(t); await remove(tr); const p = individual(await list(t));
    assert.equal(p.averageScore, null); assert.equal(p.observations.length, 0); return '0 pontos e média null após exclusão.';
  });
  await check(15, 'Editar várias vezes', async () => {
    const t = await team('15'); const tr = await create(t); for (const n of [6, 2, 9]) await patch(tr, { ratings: ratings(n) });
    const p = individual(await list(t)); assert.equal(p.averageScore, 9); assert.equal(p.evaluationCount, 1); return '5 → 6 → 2 → 9: uma avaliação final de nota 9.';
  });
  await check(16, 'Alterar nome do atleta', async () => {
    const t = await team('16'); const tr = await create(t, undefined, 8);
    const data = await request('/auth/me', 'PATCH', { name: 'QA Nome alterado' }, a.token);
    assert.equal(data.user.id, a.id); assert.equal(data.user.name, 'QA Nome alterado');
    assert.equal((await list(t))[0].athletes[a.id].id, tr.athletes[a.id].id); return 'Nome atualizado; IDs do atleta e do registro mantidos.';
  });
  await check(17, 'Alterar informações pessoais', async () => {
    const t = await team('17'); await create(t, undefined, 8); const before = await list(t);
    await request('/auth/me', 'PATCH', { birthDate: '2001-02-03', photo: 'QA', email: `qa40-${run}-updated@example.invalid` }, a.token);
    await request(`/teams/${t.id}/athletes/${a.id}`, 'PATCH', { position: 'Ala', number: 7 }, coach.token);
    assert.deepEqual(await list(t), before); return 'Nascimento, e-mail, foto, posição e número alterados; treinos idênticos.';
  });
  await check(18, 'Treino com três critérios', async () => {
    let t = await team('18'); t = await request(`/teams/${t.id}`, 'PATCH', { qualitativeCriteria: ['A', 'B', 'C'] }, coach.token);
    await create(t, undefined, undefined, [{ athleteId: a.id, ratings: { A: 3, B: 6, C: 9 } }]);
    assert.equal(individual(await list(t)).averageScore, 6); return '(3 + 6 + 9) / 3 = 6.';
  });
  await check(19, 'Adicionar quarto critério depois dos treinos', async () => {
    let t = await team('19'); t = await request(`/teams/${t.id}`, 'PATCH', { qualitativeCriteria: ['A', 'B', 'C'] }, coach.token);
    for (const day of ['01', '02']) await create(t, `2026-10-${day}`, undefined, [{ athleteId: a.id, ratings: { A: 3, B: 6, C: 9 } }]);
    await request(`/teams/${t.id}`, 'PATCH', { qualitativeCriteria: ['A', 'B', 'C', 'D'] }, coach.token);
    const ts = await list(t); assert.ok(ts.every(tr => !Object.hasOwn(tr.athletes[a.id].ratings, 'D')),
      `Critério D recebeu nota histórica fictícia: ${JSON.stringify(ts.map(tr => tr.athletes[a.id].ratings))}. Média antiga 6 passa para 5,75.`);
  });
  await check(20, 'Excluir critério utilizado', async () => {
    const t = await team('20'); await create(t); const before = await list(t);
    await request(`/teams/${t.id}`, 'PATCH', { qualitativeCriteria: criteria.slice(0, 3) }, coach.token, 409);
    assert.deepEqual(await list(t), before); return 'HTTP 409: exclusão bloqueada pela política; histórico integralmente preservado.';
  });
  await check(21, 'Renomear critério', async () => {
    const t = await team('21'); await create(t, undefined, 8);
    await request(`/teams/${t.id}`, 'PATCH', { qualitativeCriteria: ['Habilidade', ...criteria.slice(1)] }, coach.token);
    const p = individual(await list(t)); assert.ok(!p.criteria.includes('Técnica')); assert.equal(p.criteria.filter(c => c === 'Habilidade').length, 1);
    assert.equal(p.observations[0].ratings.Habilidade, 8); assert.equal(p.averageScore, 8); return 'Técnica → Habilidade: uma série de nota 8, média e avaliação preservadas.';
  });
  await check(22, 'Editar um único critério', async () => {
    const t = await team('22'); const tr = await create(t, undefined, 4); await patch(tr, { ratings: { Técnica: 8 } });
    const p = individual(await list(t)); assert.equal(p.averageScore, 5);
    assert.deepEqual(Object.values(p.observations[0].ratings), [8, 4, 4, 4]); return '(8 + 4 + 4 + 4) / 4 = 5; outras notas mantidas.';
  });
  await check(23, 'Critério sem nota', async () => {
    const t = await team('23'); await create(t, undefined, undefined, [{ athleteId: a.id, ratings: { Técnica: 8 } }]);
    const p = individual(await list(t)); assert.equal(p.averageScore, 8,
      `Nota omitida é aceita, mas recebe 5: ${JSON.stringify(p.observations[0].ratings)}; média ${p.averageScore} em vez de 8.`);
  });
  await check(24, 'Nota fora da escala', async () => {
    const t = await team('24'); const tr = await create(t, undefined, 8);
    for (const value of [-1, 11, 2.5, null, '8']) {
      await request(`/trainings/${tr.id}/athletes/${a.id}`, 'PATCH', { ratings: { Técnica: value } }, coach.token, 400);
      await request('/trainings', 'POST', { teamId: t.id, date: '2026-10-01', type: 'Misto', records: [{ athleteId: a.id, ratings: { Técnica: value } }] }, coach.token, 400);
    }
    for (const value of [0, 10]) await patch(tr, { ratings: { Técnica: value } });
    assert.equal((await list(t)).length, 1); return 'Criação e edição rejeitam -1, 11, 2,5, null e string; 0 e 10 aceitos; sem treinos extras.';
  });
  await check(25, 'Alterar vários critérios', async () => {
    const t = await team('25'); const tr = await create(t); await patch(tr, { ratings: { Técnica: 10, 'Condicionamento físico': 2, Participação: 8 } });
    assert.equal(individual(await list(t)).averageScore, 6.25); return '(10 + 2 + 8 + 5) / 4 = 6,25 após edição parcial múltipla.';
  });
  await check(26, 'Dois treinos no mesmo dia', async () => {
    const t = await team('26'); await create(t, undefined, 2); await create(t, undefined, 8); const p = individual(await list(t));
    assert.equal(p.observations.length, 2); assert.equal(new Set(p.observations.map(x => x.trainingId)).size, 2);
    assert.equal(p.hasComparableEvaluations, false); return '2 pontos com IDs distintos, mesma data; não gera tendência entre datas iguais.';
  });
  await check(27, 'Inserir treino anterior', async () => {
    const t = await team('27'); await create(t, '2026-10-20'); await create(t, '2025-01-01'); await create(t, '2026-05-02');
    assert.deepEqual(individual(await list(t)).observations.map(x => x.date), ['2025-01-01', '2026-05-02', '2026-10-20']); return 'Ordenação cronológica independente da ordem de cadastro.';
  });
  await check(28, 'Meses e anos diferentes', async () => {
    const t = await team('28'); const dates = ['2024-02-29', '2024-12-31', '2025-01-01', '2026-10-20'];
    for (const date of dates) await create(t, date);
    assert.deepEqual(individual(await list(t)).observations.map(x => x.date), dates); return '29/02/2024, virada do ano e 20/10/2026 preservados no MySQL/JSON; tabela possui ano. Eixo usa apenas dia/mês (ressalva).';
  });
  for (const [id, title, sequence] of [[29, 'Notas iguais', [7, 7, 7]], [30, 'Crescimento', [2, 5, 9]], [31, 'Oscilação', [9, 3, 8]]]) await check(id, title, async () => {
    const t = await team(String(id)); for (const [i, n] of sequence.entries()) await create(t, `2026-10-0${i + 1}`, n);
    const p = individual(await list(t)); const plot = evolutionPlot(p.observations, p.criteria);
    assert.deepEqual(plot.data.map(x => x.score0), sequence); assert.equal(p.summaries[0].change, sequence[2] - sequence[0]);
    return `Série linear real = ${sequence.join(' → ')}; variação ${p.summaries[0].change}. Validação numérica, sem inspeção de pixels.`;
  });
  await check(32, 'Apenas um treino', async () => {
    const t = await team('32'); await create(t, undefined, 0); const p = individual(await list(t));
    assert.equal(evolutionPlot(p.observations, p.criteria).data.length, 1); assert.equal(p.hasComparableEvaluations, false);
    return 'Um ponto de nota zero, sem tendência; componente existente testado por renderização estática.';
  });
  await check(33, 'Cem treinos', async () => {
    const t = await team('33'); const start = performance.now();
    for (let i = 0; i < 100; i++) await create(t, new Date(Date.UTC(2026, 0, i + 1)).toISOString().slice(0, 10), i % 11);
    const ts = await list(t); const calc = performance.now(); const p = individual(ts); const plot = evolutionPlot(p.observations, p.criteria);
    assert.equal(plot.data.length, 100);
    return { status: 'PARCIAL', evidence: `100 treinos HTTP/MySQL sem perda; cálculo + transformação ${Math.round((performance.now() - calc) * 100) / 100} ms; criação/leitura/cálculo total ${Math.round(performance.now() - start)} ms. Legibilidade e responsividade em navegador não aferidas.` };
  });
  await check(34, 'Filtro sem resultados', async () => {
    const t = await team('34'); await create(t, '2024-01-01'); const p = individual(await list(t));
    assert.equal(filterEvolution(p.observations, '30', '2026-10-20').length, 0); return 'Últimos 30 dias retorna []; componente contém mensagem específica para período sem treinos (inspeção de código).';
  });
  await check(35, 'Treinador altera e atleta consulta novamente', async () => {
    const t = await team('35'); const tr = await create(t); await patch(tr, { ratings: ratings(9) });
    assert.equal(individual(getAthleteTrainings(await state(a), t.id, a.id)).averageScore, 9); return 'Nova consulta autenticada do atleta lê média 9 persistida pelo treinador.';
  });
  await check(36, 'Mesmo treino nas duas contas', async () => {
    const t = await team('36', [a, b]); const tr = await create(t, undefined, undefined, [record(a, 3), record(b, 9)]);
    const coachData = (await list(t)).find(x => x.id === tr.id); const athleteData = (await state(a)).trainings.find(x => x.id === tr.id);
    assert.deepEqual(athleteData.athletes[a.id], coachData.athletes[a.id]); assert.deepEqual(Object.keys(athleteData.athletes), [a.id]);
    return 'Registro de A idêntico nas duas contas; nota de B não exposta para A.';
  });
  await check(37, 'Novo treino com atleta conectado', async () => {
    const t = await team('37'); assert.equal(getAthleteTrainings(await state(a), t.id, a.id).length, 0); await create(t, undefined, 8);
    assert.equal(getAthleteTrainings(await state(a), t.id, a.id).length, 1);
    return { status: 'PARCIAL', evidence: 'Atleta já autenticado recebe o novo treino na consulta seguinte. Hook atualiza ao focar a janela e ao recarregar; não há polling/WebSocket. Evento de foco e duas janelas reais não exercitados.' };
  });
  await check(38, 'Persistência depois de editar', async () => {
    const t = await team('38'); const tr = await create(t); await patch(tr, { ratings: ratings(9) });
    const evaluation = await prisma.evaluation.findUnique({ where: { recordId: tr.athletes[a.id].id } });
    assert.equal(evaluation.technique, 9); assert.equal(individual(getTeamTrainings(await state(), t.id)).averageScore, 9);
    return 'MySQL contém 9; nova restauração via /auth/me devolve 9. Persistência aferida sem reload de navegador.';
  });
  await check(39, 'API falha durante edição', async () => {
    const t = await team('39'); const tr = await create(t, undefined, 8);
    await request(`/trainings/${tr.id}/athletes/${a.id}`, 'PATCH', { ratings: ratings(9), expectedMetrics: { Gols: 99 }, metrics: { Gols: 2 } }, coach.token, 409);
    assert.equal(individual(await list(t)).averageScore, 8);
    return { status: 'PARCIAL', evidence: 'Falha HTTP 409 força rollback integral: nota 8 preservada. Hook só atualiza estado após operação confirmada (inspeção); queda de rede/HTTP 500 com gráfico montado não exercitada.' };
  });
  await check(40, 'Troca de conta e equipe', async () => {
    const other = await register('coach', 'other'); const own = await team('40-own'); const foreign = await team('40-foreign', [], other);
    const tr = await create(own, undefined, 8); const coachState = await state(); const foreignState = await state(other);
    assert.ok(!coachState.teams.some(x => x.id === foreign.id)); assert.ok(!foreignState.teams.some(x => x.id === own.id));
    assert.ok(!foreignState.trainings.some(x => x.id === tr.id));
    await request(`/trainings/team/${own.id}`, 'GET', undefined, other.token, 404);
    await request(`/trainings/team/${foreign.id}`, 'GET', undefined, a.token, 404);
    assert.ok(getAthleteTrainings(await state(a), foreign.id, a.id).length === 0);
    return 'Tokens distintos isolam equipes; acesso cruzado HTTP 404; seletor da equipe não mistura treinos. Troca visual de sessão não exercitada.';
  });
} finally {
  if (teams.length) await prisma.team.deleteMany({ where: { id: { in: teams } } });
  if (users.length) await prisma.user.deleteMany({ where: { id: { in: users } } });
  try { assert.deepEqual(await snapshot(), original); preserved = true; }
  finally {
    await prisma.$disconnect(); await new Promise(resolve => server.close(resolve));
    const summary = results.reduce((out, r) => ({ ...out, [r.status]: (out[r.status] || 0) + 1 }), {});
    await mkdir(new URL('../Documentação/qa-40/', import.meta.url), { recursive: true });
    await writeFile(new URL('../Documentação/qa-40/resultados.json', import.meta.url), JSON.stringify({ run, executedAt: new Date().toISOString(), method: 'HTTP real + MySQL local + funções reais; sem navegador', preserved, summary, results }, null, 2));
    console.log(JSON.stringify({ summary, preserved }));
  }
}
// Reprovações funcionais devem produzir saída não zero em CI.
if (results.some(r => r.status === 'REPROVADO')) process.exitCode = 1;
