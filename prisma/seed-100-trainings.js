// Demonstração persistente, sem apagar/alterar contas anteriores.
import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import '../server/src/lib/environment.js';
import { createApp } from '../server/src/aplicativo.js';
import { defaultQualitativeCriteria, metricCatalog, qualitativeFields } from '../shared/criteria.js';
import { isDateOnly, todayDateOnly } from '../shared/birthDate.js';
import { toClientTraining } from '../server/src/lib/serializadores.js';
import { athletePerformance } from '../src/utils/athletePerformance.js';

if (process.env.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(process.env.DATABASE_URL).hostname)) {
  throw new Error('Esta demonstração exige banco local de desenvolvimento/teste.');
}
const referenceDate = process.argv[2] || todayDateOnly();
if (!isDateOnly(referenceDate)) throw new Error('Data inválida; use YYYY-MM-DD.');
const prisma = new PrismaClient();
let server;
// Senha pública exclusiva de contas de demonstração locais.
const password = 'Teste123!';
try {
  const preferred = ['atleta100@webkore.test', 'treinador100@webkore.test'];
  const existing = await prisma.user.count({ where: { email: { in: preferred } } });
  const suffix = existing ? `-${randomUUID().slice(0, 8)}` : '';
  const athleteEmail = `atleta100${suffix}@webkore.test`;
  const coachEmail = `treinador100${suffix}@webkore.test`;
  const passwordHash = await bcrypt.hash(password, 10);
  const fixture = await prisma.$transaction(async tx => {
    const coach = await tx.user.create({ data: { name: 'Treinador Demo 100', email: coachEmail, role: 'COACH', passwordHash, photoUrl: 'T100' } });
    const athlete = await tx.user.create({ data: { name: 'Atleta Demo 100', email: athleteEmail, role: 'ATHLETE', passwordHash, photoUrl: 'A100', birthDate: new Date('2004-05-15T00:00:00Z') } });
    const team = await tx.team.create({ data: { name: 'WebKore — Demonstração 100 treinos', code: `WK-DEMO100-${randomUUID().slice(0, 8).toUpperCase()}`, modality: 'Futsal', coachId: coach.id, objectiveCriteria: metricCatalog.Futsal, qualitativeCriteria: defaultQualitativeCriteria } });
    await tx.membership.create({ data: { teamId: team.id, athleteId: athlete.id, status: 'APPROVED', number: 10, position: 'Ala' } });
    for (let index = 0; index < 100; index++) {
      const date = new Date(`${referenceDate}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() - (99 - index));
      await tx.training.create({ data: { teamId: team.id, date, type: ['PHYSICAL', 'COLLECTIVE', 'MIXED'][index % 3],
        description: `Demonstração ${String(index + 1).padStart(3, '0')}/100 — dados fictícios para consultar a evolução.`,
        records: { create: { athleteId: athlete.id, present: true,
          evaluation: { create: Object.fromEntries(qualitativeFields.map((field, position) => [field, Math.max(0, Math.min(10, 2 + Math.floor(index / 15) + ((index + position) % 3) - 1))])) },
          metrics: { create: metricCatalog.Futsal.map((name, position) => ({ name, value: (index + position) % 7 })) }
        } }
      } });
    }
    const count = await tx.trainingRecord.count({ where: { athleteId: athlete.id, training: { teamId: team.id } } });
    if (count !== 100) throw new Error('Quantidade incorreta de treinos; transação revertida.');
    return { coach, athlete, team };
  }, { timeout: 60000 });
  const saved = await prisma.training.findMany({ where: { teamId: fixture.team.id }, include: { records: { include: { evaluation: true, metrics: true } } }, orderBy: { date: 'asc' } });
  const result = athletePerformance(saved.map(item => toClientTraining(item, fixture.team)), fixture.athlete.id);
  if (saved.length !== 100 || result.evaluationCount !== 100) throw new Error('Demonstração criada, mas conferência de avaliações falhou.');
  server = createApp().listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => { server.once('listening', resolve); server.once('error', reject); });
  const base = `http://127.0.0.1:${server.address().port}/api`;
  for (const [email, role] of [[athleteEmail, 'athlete'], [coachEmail, 'coach']]) {
    const response = await fetch(`${base}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, role }) });
    const payload = await response.json();
    if (response.status !== 200 || payload.state.trainings.filter(t => t.teamId === fixture.team.id).length !== 100) throw new Error(`Demonstração criada, mas login/leitura de ${role} não passou.`);
  }
  console.log(JSON.stringify({ persisted: true, athlete: { email: athleteEmail, password, role: 'Atleta' }, coach: { email: coachEmail, password, role: 'Treinador' }, team: fixture.team.name, code: fixture.team.code, trainings: saved.length, evaluations: result.evaluationCount, firstDate: saved[0].date.toISOString().slice(0, 10), lastDate: saved.at(-1).date.toISOString().slice(0, 10), loginsVerified: true }, null, 2));
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  await prisma.$disconnect();
}
