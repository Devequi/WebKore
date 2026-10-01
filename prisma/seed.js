import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import "../server/src/lib/environment.js";
import { defaultQualitativeCriteria, metricCatalog } from "../shared/criteria.js";

const testMode = process.argv.includes("--test");
const clearRecords = process.argv.includes("--clear");
if (clearRecords && !testMode) throw new Error("--clear exige o modo --test.");
if (testMode && process.env.NODE_ENV === "production") throw new Error("Seed de testes não permitido em produção.");
// Credencial pública exclusivamente das fixtures de desenvolvimento/teste.
const seedPassword = testMode ? "Teste123!" : process.env.SEED_PASSWORD;
if (!seedPassword?.trim()) {
  throw new Error("Configure SEED_PASSWORD antes de executar prisma:seed.");
}
const prisma = new PrismaClient();
const passwordHash = await bcrypt.hash(seedPassword, 10);

const users = [
  {
    id: "coach-1",
    role: "COACH",
    name: "Marina Duarte",
    email: "marina@webkore.com",
    passwordHash,
    photoUrl: "MD"
  },
  {
    id: "athlete-1",
    role: "ATHLETE",
    name: "Lucas Pereira",
    email: "lucas@webkore.com",
    passwordHash,
    photoUrl: "LP"
  },
  {
    id: "athlete-2",
    role: "ATHLETE",
    name: "Bianca Rocha",
    email: "bianca@webkore.com",
    passwordHash,
    photoUrl: "BR"
  },
  {
    id: "athlete-3",
    role: "ATHLETE",
    name: "Caio Martins",
    email: "caio@webkore.com",
    passwordHash,
    photoUrl: "CM"
  },
  {
    id: "athlete-4",
    role: "ATHLETE",
    name: "Ana Souza",
    email: "ana@webkore.com",
    passwordHash,
    photoUrl: "AS"
  }
];

const teams = [
  {
    id: "team-1",
    name: "ETEC Araras Sub-18",
    modality: "Futsal",
    code: "WK-TEAM-404",
    coachId: "coach-1"
  },
  {
    id: "team-2",
    name: "Projeto Quadra Viva",
    modality: "Vôlei",
    code: "WK-TEAM-218",
    coachId: "coach-1"
  }
];

const memberships = [
  { id: "membership-1", athleteId: "athlete-1", teamId: "team-1", status: "APPROVED", number: 10, position: "Ala" },
  { id: "membership-2", athleteId: "athlete-2", teamId: "team-1", status: "APPROVED", number: 7, position: "Pivo" },
  { id: "membership-3", athleteId: "athlete-3", teamId: "team-1", status: "APPROVED", number: 4, position: "Fixo" },
  { id: "membership-4", athleteId: "athlete-4", teamId: "team-1", status: "PENDING", number: 12, position: "Goleira" },
  { id: "membership-5", athleteId: "athlete-1", teamId: "team-2", status: "APPROVED" }
];

async function main() {
  if (testMode) {
    await prisma.$transaction(async (transaction) => {
      if (clearRecords) {
        // Filhos antes dos pais: somente DELETE de registros, sem DDL/migrations.
        for (const [name, model] of [["Evaluation", "evaluation"], ["SportMetric", "sportMetric"],
          ["TrainingRecord", "trainingRecord"], ["Training", "training"],
          ["Membership", "membership"], ["Team", "team"], ["User", "user"]]) {
          const { count } = await transaction[model].deleteMany();
          console.log(`Registros removidos de ${name}: ${count}`);
        }
      }
      const fixtures = [
        { id: "test-coach", name: "Treinador Teste", email: "treinador@webkore.test", role: "COACH", photoUrl: "TT" },
        { id: "test-athlete-1", name: "Atleta Teste", email: "atleta@webkore.test", role: "ATHLETE", photoUrl: "AT" },
        { id: "test-athlete-2", name: "Atleta Dois", email: "atleta2@webkore.test", role: "ATHLETE", photoUrl: "AD" }
      ];
      const createdUsers = [];
      for (const { id, ...user } of fixtures) {
        createdUsers.push(await transaction.user.upsert({ where: { email: user.email },
          create: { id, ...user, passwordHash }, update: { ...user, passwordHash } }));
      }
      const teamData = { name: "WebKore Teste", modality: "Vôlei", coachId: createdUsers[0].id,
        objectiveCriteria: metricCatalog.Vôlei, qualitativeCriteria: defaultQualitativeCriteria };
      const team = await transaction.team.upsert({ where: { code: "WK-TEAM-100" },
        create: { id: "test-team", code: "WK-TEAM-100", ...teamData }, update: teamData });
      for (const [index, status] of [[1, "APPROVED"], [2, "PENDING"]]) {
        await transaction.membership.upsert({ where: { teamId_athleteId: { teamId: team.id, athleteId: createdUsers[index].id } },
          create: { teamId: team.id, athleteId: createdUsers[index].id, status }, update: { status } });
      }
      const trainingData = { teamId: team.id, date: new Date("2026-09-30T12:00:00Z"), type: "MIXED", description: "Treino de teste de Vôlei" };
      const training = await transaction.training.upsert({ where: { id: "test-training" }, create: { id: "test-training", ...trainingData }, update: trainingData });
      const record = await transaction.trainingRecord.upsert({ where: { trainingId_athleteId: { trainingId: training.id, athleteId: createdUsers[1].id } },
        create: { trainingId: training.id, athleteId: createdUsers[1].id, present: true }, update: { present: true } });
      const evaluation = { technique: 0, physicalCondition: 6, participation: 8, teamwork: 7 };
      await transaction.evaluation.upsert({ where: { recordId: record.id }, create: { recordId: record.id, ...evaluation }, update: evaluation });
      for (const [name, value] of [["Pontos", 4], ["Aces", 1]]) {
        await transaction.sportMetric.upsert({ where: { recordId_name: { recordId: record.id, name } },
          create: { recordId: record.id, name, value }, update: { value } });
      }
    }, { timeout: 30000 });
    console.log("Seed de testes concluído: 3 contas, 1 equipe, 2 vínculos, 1 treino, 1 registro, 1 avaliação e 2 métricas.");
    return;
  }
  await prisma.user.createMany({ data: users, skipDuplicates: true });
  await prisma.team.createMany({ data: teams, skipDuplicates: true });
  await prisma.membership.createMany({ data: memberships, skipDuplicates: true });
}

main()
  .catch((error) => {
    console.error("Seed não aplicado:", error.code || error.name);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
