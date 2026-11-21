import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import "../server/src/config/environment.js";
import { createApp } from "../server/src/app.js";
import { prisma as apiPrisma } from "../server/src/db/prisma.js";
import { recordContext, prepareEvaluation, prepareMeasurements, prepareStats } from "../server/src/domain/evaluations.js";
import { defaultQualitativeCriteria, metricCatalog } from "../shared/criteria.js";
import { criteriaFor, positionRankings } from "../shared/evaluations.js";
import { isDateOnly, todayDateOnly } from "../shared/birthDate.js";
import { filterEvolution } from "../src/features/performance/model/athletePerformance.js";

const dbUrl = new URL(process.env.DATABASE_URL);
if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "[::1]"].includes(dbUrl.hostname)) {
  throw new Error("Fixture exclusiva para banco local de desenvolvimento.");
}
const today = process.argv[2] || todayDateOnly();
if (!isDateOnly(today)) throw new Error("Informe a data de referência em YYYY-MM-DD.");
const daysAgo = (days) => {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
};
const offsets = [150, 130, 110, 95, 90, 89, 75, 60, 45, 30, 29, 21, 14, 7, 0];
const positions = [...Array(5).fill("Goleiro"), ...Array(8).fill("Fixo"), ...Array(11).fill("Ala"), ...Array(6).fill("Pivô")];
const scenario = randomUUID().slice(0, 8);
const password = "Teste123!";
const email = (alias) => `${alias}.${scenario}@webkore.test`;
const prisma = new PrismaClient();
let server;

try {
  const result = await prisma.$transaction(async (tx) => {
    const passwordHash = await bcrypt.hash(password, 10);
    const coach = await tx.user.create({ data: { name: "Treinador Elenco Teste", email: email("treinador.elenco"), role: "COACH", photoUrl: "TE", passwordHash } });
    const team = await tx.team.create({ data: { name: "Horizonte Futsal — Teste", modality: "Futsal", code: `WK-ELENCO-${scenario.toUpperCase()}`,
      coachId: coach.id, objectiveCriteria: metricCatalog.Futsal, qualitativeCriteria: defaultQualitativeCriteria } });
    const tryouts = await tx.team.create({ data: { name: "Horizonte Seletiva — Teste", modality: "Futsal", code: `WK-SELETIVA-${scenario.toUpperCase()}`, coachId: coach.id } });
    const roster = [];
    for (const [index, position] of positions.entries()) {
      const number = index + 1;
      const label = String(number).padStart(2, "0");
      const athlete = await tx.user.create({ data: { name: `${position} Teste ${label}`, email: email(`atleta${label}`), role: "ATHLETE", passwordHash,
        photoUrl: `${position[0]}${label}`, birthDate: new Date(`${2002 + index % 6}-05-15T00:00:00Z`) } });
      const membership = await tx.membership.create({ data: { teamId: team.id, athleteId: athlete.id, number, position, status: "APPROVED", createdAt: daysAgo(160) } });
      roster.push({ athlete, membership });
    }
    await tx.membership.createMany({ data: [0, 5].map((index) => ({ teamId: tryouts.id, athleteId: roster[index].athlete.id, status: "PENDING" })) });
    for (const [index, offset] of offsets.entries()) {
      const [type, title] = [["MIXED", "Treino misto"], ["PHYSICAL", "Preparação física"], ["COLLECTIVE", "Treino coletivo"], ["MATCH", "Partida amistosa"]][index === 14 ? 3 : index % 4];
      await tx.training.create({ data: { teamId: team.id, date: daysAgo(offset), type,
        description: `${title} #${index + 1} · Cenário de teste com jogadores de linha e goleiros.`,
        records: { create: roster.map(({ athlete, membership }, athleteIndex) => {
          const context = recordContext(team, membership);
          const present = index === 14 || (index + athleteIndex * 3) % 13 !== 0;
          const base = { athleteId: athlete.id, present, ...context };
          if (!present || (index !== 14 && (athleteIndex + index) % 17 === 0)) return base;
          const qualitative = criteriaFor(team, context.roleSnapshot, "QUALITATIVE");
          const quantitative = criteriaFor(team, context.roleSnapshot, "QUANTITATIVE");
          const ratings = Object.fromEntries(qualitative.map(({ name }, j) => [name, index === 0 && athleteIndex === 1 && j === 0 ? 0 : Math.min(10, 4 + (athleteIndex + index + j) % 4 + Math.floor(index / 5))]));
          const saves = 3 + (index + athleteIndex) % 9;
          const conceded = (index + athleteIndex) % 4;
          const values = context.roleSnapshot === "GOALKEEPER" ? [saves, 2 + index % 3, 9 + athleteIndex % 4, conceded]
            : [(index + athleteIndex) % 3, athleteIndex % 3, 3 + index % 5, 10 + athleteIndex % 14];
          const measurements = Object.fromEntries(quantitative.map(({ id }, j) => [id, values[j]]));
          return { ...base, evaluation: { create: prepareEvaluation(context, team, ratings) }, measurementsInitialized: true,
            measurements: { create: prepareMeasurements(context, team, measurements) },
            ...(context.roleSnapshot === "GOALKEEPER" ? { goalkeeperStats: { create: prepareStats(context, {
              saves, goalsConceded: conceded, shotsOnTarget: saves + conceded, difficultSaves: index % 3,
              accurateDistributions: values[2], distributionAttempts: values[2] + 3, successfulExits: values[1], exitAttempts: values[1] + 1
            }) } } : {}) };
        }) }
      } });
    }
    return { coach, team, tryouts, roster };
  }, { timeout: 60000 });

  const { coach, team, tryouts, roster } = result;
  console.log(JSON.stringify({ coach: coach.email, password, sampleGoalkeeper: roster[0].athlete.email,
    sampleOutfield: roster[5].athlete.email, team: team.name, teamCode: team.code, tryouts: tryouts.name, tryoutsCode: tryouts.code }));
  server = createApp().listen(0, "127.0.0.1");
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/auth/login`, { method: "POST",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: coach.email, password, role: "coach" }) });
  assert.equal(response.status, 200, "Login do treinador de teste");
  const { state } = await response.json();
  assert.equal(state.teams.length, 2);
  const members = state.memberships.filter((item) => item.teamId === team.id && item.status === "approved");
  assert.equal(members.length, 30);
  assert.equal(members.filter((item) => item.position === "Goleiro").length, 5);
  assert.equal(state.memberships.filter((item) => item.teamId === tryouts.id && item.status === "pending").length, 2);
  const trainings = state.trainings.filter((item) => item.teamId === team.id);
  assert.deepEqual(["30", "90", "all"].map((period) => filterEvolution(trainings, period, today).length), [5, 10, 15]);
  const ranks = positionRankings(members.map(({ athleteId: id }) => ({ id })), trainings);
  assert.equal(ranks.GOALKEEPER.length, 5);
  assert.equal(ranks.OUTFIELD.length, 25);
  assert.ok(trainings.some((training) => Object.values(training.athletes).some((record) => record.goalkeeperIndicators?.defensiveEfficiency > 0)));
  const records = trainings.flatMap((training) => Object.values(training.athletes));
  console.log(JSON.stringify({ loginVerified: true, athletes: members.length, goalkeepers: ranks.GOALKEEPER.length, trainings: trainings.length,
    evaluations: records.filter((record) => record.finalScore !== null).length, absences: records.filter((record) => !record.present).length,
    pending: 2, firstDate: daysAgo(offsets[0]).toISOString().slice(0, 10), lastDate: today }));
} finally {
  if (server?.listening) await new Promise((resolve) => server.close(resolve));
  await Promise.all([prisma.$disconnect(), apiPrisma.$disconnect()]);
}
