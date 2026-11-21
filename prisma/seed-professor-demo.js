// Demonstração acadêmica persistente com pessoas/equipe inteiramente fictícias.
// Cria um cenário novo em uma transação; nunca sobrescreve contas anteriores.
import bcrypt from 'bcryptjs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import '../server/src/config/environment.js';
import { createApp } from '../server/src/app.js';
import { prisma as apiPrisma } from '../server/src/db/prisma.js';
import { defaultQualitativeCriteria, qualitativeFields } from '../shared/criteria.js';
import { isDateOnly, todayDateOnly } from '../shared/birthDate.js';
import { athletePerformance } from '../src/features/performance/model/athletePerformance.js';

if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URL).hostname)) {
  throw new Error('Demonstração exclusiva de banco local de desenvolvimento/testes.');
}
const today = process.argv[2] || todayDateOnly();
if (!isDateOnly(today)) throw new Error('Data inválida.');
const prisma = new PrismaClient();
let server;
// Credencial pública destinada apenas às duas contas de demonstração locais.
const password = 'Apresenta123!';
const roster = [
  { name: 'Lucas Martins', email: 'lucas.martins', born: '2007-04-12', number: 10, position: 'Ala', level: 6.2 },
  { name: 'Gabriel Souza', email: 'gabriel.souza', born: '2007-08-23', number: 1, position: 'Goleiro', level: 6.7 },
  { name: 'Pedro Henrique', email: 'pedro.henrique', born: '2008-02-05', number: 12, position: 'Goleiro', level: 5.8 },
  { name: 'Matheus Oliveira', email: 'matheus.oliveira', born: '2007-11-18', number: 4, position: 'Fixo', level: 6.5 },
  { name: 'Rafael Costa', email: 'rafael.costa', born: '2008-06-09', number: 5, position: 'Fixo', level: 6.0 },
  { name: 'Bruno Ferreira', email: 'bruno.ferreira', born: '2007-09-30', number: 7, position: 'Ala', level: 6.4 },
  { name: 'Thiago Santos', email: 'thiago.santos', born: '2008-03-16', number: 8, position: 'Ala', level: 5.9 },
  { name: 'Felipe Rocha', email: 'felipe.rocha', born: '2009-01-21', number: 11, position: 'Ala', level: 5.6 },
  { name: 'Gustavo Lima', email: 'gustavo.lima', born: '2007-07-07', number: 9, position: 'Pivô', level: 6.6 },
  { name: 'Vinícius Almeida', email: 'vinicius.almeida', born: '2008-10-02', number: 14, position: 'Pivô', level: 6.1 }
];
const dates = [];
for (let offset = 0; dates.length < 36; offset++) {
  const date = new Date(`${today}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - offset);
  if ([2, 4, 6].includes(date.getUTCDay())) dates.push(date);
}
dates.reverse();
const joinedAt = new Date(dates[0]); joinedAt.setUTCDate(joinedAt.getUTCDate() - 7);
let seed = 20261021;
function random() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
const integer = (min, max) => min + Math.floor(random() * (max - min + 1));
const clamp = n => Math.min(10, Math.max(0, Math.round(n)));
const objectives = ['Gols', 'Assistências', 'Finalizações', 'Desarmes', 'Defesas'];
const sessionPlans = [
  ['PHYSICAL', 'Preparação física: mobilidade, aceleração e circuitos de resistência. Carga progressiva com recuperação entre séries.'],
  ['COLLECTIVE', 'Organização defensiva: marcação por zona, cobertura do fixo e transição após recuperação da bola.'],
  ['MIXED', 'Coletivo reduzido: jogos de 4 contra 4, tomada de decisão e finalização sob pressão.'],
  ['MIXED', 'Fundamentos: domínio orientado, passes em movimento e finalizações de curta distância.'],
  ['COLLECTIVE', 'Construção ofensiva: saída de bola, movimentação dos alas e apoio do pivô.'],
  ['MIXED', 'Jogo-treino interno com rodízio de posições, bolas paradas e avaliação de cooperação.']
];
try {
  const emails = ['marcelo.ribeiro', ...roster.map(a => a.email)].map(name => `${name}@webkore.test`);
  const collision = await prisma.user.count({ where: { email: { in: emails } } });
  const suffix = collision ? `-${randomUUID().slice(0, 6)}` : '';
  const coachEmail = `marcelo.ribeiro${suffix}@webkore.test`;
  const primaryHash = await bcrypt.hash(password, 10);
  const secondaryHash = await bcrypt.hash(randomUUID(), 10);
  const fixture = await prisma.$transaction(async tx => {
    const coach = await tx.user.create({ data: { name: 'Marcelo Ribeiro', email: coachEmail, role: 'COACH', passwordHash: primaryHash, photoUrl: 'MR', createdAt: joinedAt } });
    const team = await tx.team.create({ data: { name: 'Aurora Futsal Sub-20', modality: 'Futsal', code: `WK-AURORA-${randomUUID().slice(0, 8).toUpperCase()}`, coachId: coach.id, qualitativeCriteria: defaultQualitativeCriteria, objectiveCriteria: objectives, createdAt: joinedAt } });
    const athletes = [];
    for (const [index, item] of roster.entries()) {
      const athlete = await tx.user.create({ data: { name: item.name, email: `${item.email}${suffix}@webkore.test`, role: 'ATHLETE', passwordHash: index === 0 ? primaryHash : secondaryHash, photoUrl: item.name.split(' ').map(p => p[0]).slice(0, 2).join(''), birthDate: new Date(`${item.born}T00:00:00Z`), createdAt: joinedAt } });
      await tx.membership.create({ data: { teamId: team.id, athleteId: athlete.id, status: 'APPROVED', number: item.number, position: item.position, createdAt: joinedAt } });
      athletes.push(athlete);
    }
    for (const [index, date] of dates.entries()) {
      const [type, description] = sessionPlans[index % sessionPlans.length];
      const records = athletes.map((athlete, athleteIndex) => {
        const item = roster[athleteIndex];
        const present = athleteIndex === 0 ? ![4, 17, 28].includes(index) : ((index + athleteIndex * 3) % (11 + athleteIndex)) !== 0;
        const record = { athleteId: athlete.id, present };
        if (!present) return record;
        const progress = index / 35 * (athleteIndex === 0 ? 1.6 : 0.9);
        const fatigue = [10, 22, 30].includes(index) ? -0.8 : 0;
        const values = qualitativeFields.map((field, position) => [field, clamp(item.level + progress + fatigue + (position === 2 ? 0.7 : position === 3 ? 0.4 : 0) + (random() - 0.5) * 1.8)]);
        record.evaluation = { create: Object.fromEntries(values) };
        if (type !== 'PHYSICAL') {
          const goalkeeper = item.position === 'Goleiro';
          const goals = goalkeeper ? 0 : integer(0, item.position === 'Pivô' ? 3 : 2);
          const metrics = { Gols: goals, Assistências: goalkeeper ? integer(0, 1) : integer(0, 2), Finalizações: goalkeeper ? integer(0, 1) : goals + integer(1, 5), Desarmes: goalkeeper ? integer(0, 2) : integer(1, item.position === 'Fixo' ? 6 : 4), Defesas: goalkeeper ? integer(4, 13) : 0 };
          record.metrics = { create: Object.entries(metrics).map(([name, value]) => ({ name, value })) };
        }
        return record;
      });
      await tx.training.create({ data: { teamId: team.id, date, type, description, createdAt: new Date(`${date.toISOString().slice(0, 10)}T21:00:00Z`), records: { create: records } } });
    }
    assert.equal(await tx.training.count({ where: { teamId: team.id } }), 36);
    assert.equal(await tx.trainingRecord.count({ where: { athleteId: athletes[0].id, training: { teamId: team.id }, present: true } }), 33);
    assert.equal(await tx.evaluation.count({ where: { record: { athleteId: athletes[0].id, training: { teamId: team.id } } } }), 33);
    return { coach, team, athletes };
  }, { timeout: 60000 });
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  const summaries = {};
  for (const [email, role] of [[fixture.coach.email, 'coach'], [fixture.athletes[0].email, 'athlete']]) {
    const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, role }) });
    const payload = await response.json();
    assert.equal(response.status, 200, `Falha no login ${role}`);
    assert.equal(payload.state.teams.length, 1);
    assert.equal(payload.state.trainings.length, 36);
    if (role === 'coach') assert.equal(payload.state.memberships.length, 10);
    else {
      assert.ok(payload.state.trainings.every(t => Object.keys(t.athletes).length === 1));
      const stats = athletePerformance(payload.state.trainings, fixture.athletes[0].id);
      assert.equal(stats.evaluationCount, 33);
      summaries.athleteAverage = Number(stats.averageScore.toFixed(2));
      summaries.athleteAttendancePercent = Number(stats.presenceAverage.toFixed(1));
    }
  }
  console.log(JSON.stringify({ saved: true, fictional: true, coach: { name: fixture.coach.name, email: fixture.coach.email, password }, athlete: { name: fixture.athletes[0].name, email: fixture.athletes[0].email, password, number: 10, position: 'Ala' }, team: fixture.team.name, teamCode: fixture.team.code, rosterSize: 10, trainings: 36, firstDate: dates[0].toISOString().slice(0, 10), lastDate: dates.at(-1).toISOString().slice(0, 10), ...summaries, loginsVerified: true }, null, 2));
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  await Promise.all([prisma.$disconnect(), apiPrisma.$disconnect()]);
}
