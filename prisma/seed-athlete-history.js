import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import "../server/src/lib/environment.js";
import { isDateOnly, todayDateOnly } from "../shared/birthDate.js";
import { getTeamCriteria, qualitativeFields } from "../shared/criteria.js";
import { toClientTraining } from "../server/src/lib/serializadores.js";
import { athletePerformance, filterEvolution } from "../src/utils/athletePerformance.js";

if (process.env.NODE_ENV === "production") throw new Error("Fixture exclusiva de desenvolvimento/teste.");
const today = process.argv[2] || todayDateOnly();
if (!isDateOnly(today)) throw new Error("Informe a data de referência em YYYY-MM-DD.");
const prisma = new PrismaClient();
const email = "atleta.historico@webkore.test";
// Credencial pública exclusiva desta conta de teste.
const password = "Teste123!";
const offsets = [150, 130, 110, 95, 90, 89, 75, 60, 45, 30, 29, 21, 14, 7, 0];
const technique = [0, 2, 3, 2, 4, 4, 5, 6, 5, 6, 7, 7, 8, 9, 8];
function dateBefore(days) {
  const date = new Date(`${today}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date;
}

try {
  const hash = await bcrypt.hash(password, 10);
  const result = await prisma.$transaction(async (tx) => {
    const team = await tx.team.findUnique({ where: { code: "WK-TEAM-100" } });
    if (!team) throw new Error("Equipe WebKore Teste não encontrada; nenhum registro foi criado.");
    if (await tx.user.findUnique({ where: { email }, select: { id: true } })) {
      throw new Error("A conta de histórico já existe. Execução interrompida para não alterar nem duplicar os dados.");
    }
    const user = await tx.user.create({ data: {
      name: "Rafael Histórico Teste", email, role: "ATHLETE", passwordHash: hash,
      photoUrl: "RH", birthDate: new Date("2005-05-15T00:00:00Z")
    } });
    await tx.membership.create({ data: { teamId: team.id, athleteId: user.id,
      status: "APPROVED", number: 15, position: "Ponteiro", createdAt: dateBefore(160) } });
    const metrics = getTeamCriteria(team, "objective");
    for (const [index, days] of offsets.entries()) {
      const training = await tx.training.create({ data: {
        teamId: team.id, date: dateBefore(days), type: ["PHYSICAL", "COLLECTIVE", "MIXED"][index % 3],
        description: `Teste de histórico ${String(index + 1).padStart(2, "0")}/15 — ${user.name}. Registro para testar os filtros de 30/90 dias e todo o histórico.`,
        records: { create: { athleteId: user.id, present: true,
          evaluation: { create: Object.fromEntries(qualitativeFields.map((field, position) => [field,
            position === 0 ? technique[index] : Math.min(10, 3 + Math.floor(index / 3) + ((index + position) % 3))])) },
          metrics: { create: metrics.map((name, position) => ({ name, value: position === 0 ? 3 + index : (index + position) % 5 })) }
        } }
      } });
      if (!training.id) throw new Error("Falha ao registrar treino.");
    }
    return { userId: user.id, teamId: team.id, teamName: team.name };
  }, { timeout: 30000 });
  const saved = await prisma.training.findMany({ where: { teamId: result.teamId, records: { some: { athleteId: result.userId } } },
    include: { team: true, records: { where: { athleteId: result.userId }, include: { evaluation: true, metrics: true } } }, orderBy: { date: "asc" } });
  const trainings = saved.map((item) => toClientTraining(item, item.team));
  const performance = athletePerformance(trainings, result.userId);
  const counts = Object.fromEntries(["30", "90", "all"].map((period) => [period, filterEvolution(performance.observations, period, today).length]));
  if (saved.length !== 15 || performance.evaluationCount !== 15 || counts["30"] !== 5 || counts["90"] !== 10 || counts.all !== 15) {
    throw new Error("Os registros foram criados, mas a validação dos filtros não correspondeu ao esperado.");
  }
  console.log(JSON.stringify({ name: "Rafael Histórico Teste", email, password, team: result.teamName,
    referenceDate: today, trainings: saved.length, evaluations: performance.evaluationCount, counts,
    dates: trainings.map((item) => item.date) }, null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
