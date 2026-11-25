// Operação manual. A chave identifica esta edição e permite recuperar as senhas iniciais.
import { createHmac } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { todayDateOnly } from "../shared/birthDate.js";
import { defaultQualitativeCriteria, metricCatalog } from "../shared/criteria.js";
import { criteriaFor, evaluationProfiles, PROFILE_VERSION } from "../shared/evaluations.js";
import { configuredMetrics, validGoal } from "../shared/personalGoals.js";
import { prepareEvaluation, prepareMeasurements, prepareStats, recordContext } from "../server/src/domain/evaluations.js";
import { password as validatePassword } from "../server/src/lib/validation.js";

const teamName = "WebKore Futsal Sub-18";
const names = [
  "Bento Vale", "Caio Veredas", "Davi Nobre", "Elian Prado", "Gael Fontes",
  "Hugo Lira", "Iago Montes", "Jairo Campos", "Luan Freixo", "Milo Neves",
  "Nilo Lessa", "Otávio Cedro", "Raul Vilar", "Saulo Pinho", "Téo Rosa",
  "Ubirã Serra", "Vitor Paiva", "Yuri Teles", "Alan Rios", "Breno Luz",
  "Ciro Veiga", "Dênis Caldas", "Enzo Lago", "Fabio Mota", "Gil Nunes",
  "Heitor Lima", "Ícaro Pontes", "Jonas Pires", "Kauê Alves", "Lino Ramos", "Noé Maia"
];
const coach = "treinador";
const accounts = [coach, ...names.map((_, i) => `atleta${String(i + 1).padStart(2, "0")}`)];
const email = account => `${account}@demo.webkore.invalid`;
const sessions = [
  ["MIXED", "Domínio orientado e finalização em espaço curto"],
  ["PHYSICAL", "Circuitos de aceleração e mudança de direção"],
  ["COLLECTIVE", "Saída de pressão e cobertura do fixo"],
  ["MATCH", "Jogo-treino com transição rápida e bolas paradas"]
];
const day = 86400000;
const key = process.env.WEBKORE_DEMO_KEY;
function digest(label) {
  return createHmac("sha256", Buffer.from(key, "hex")).update("webkore-demo-v1/" + label).digest("hex");
}
const id = (model, index) => digest(`row/${model}/${index}`).slice(0, 32);
const initialPassword = account => digest("password/" + account).slice(0, 32);

function observations(i, t, position) {
  const progress = t / 39;
  const drift = [2.4, 1.5, -1.6, 0.3, 1.8][i % 5];
  const wave = Math.sin(t * 0.48 + i) * (i % 5 === 3 ? 1.5 : 0.55);
  const level = 6.0 + (i % 7) * 0.32 + drift * progress + wave;
  const noise = n => Math.sin((t + 1) * (i + 3) + n * 13.7);
  const rating = n => Math.min(10, Math.max(0, Math.round(level + noise(n) + (i + n) % 3 * 0.25)));
  if (position !== "Goleiro") {
    const goals = Math.max(0, Math.round((level - 6) * 0.45 + noise(2) + (position === "Pivô" ? 0.6 : 0)));
    return { rating, values: { Gols: goals, "Assistências": Math.max(0, Math.round(1 + noise(3) + (position === "Ala" ? 0.6 : 0))),
      "Finalizações": goals + (i + t) % 5, "Passes certos": Math.round(level * 2 + 5 * noise(4)) } };
  }
  const saves = Math.round(level + 3 * noise(0));
  const goalsConceded = Math.max(0, Math.round(4 - level / 3 + 1.5 * noise(1)));
  const accurateDistributions = Math.round(level + 3 * noise(2));
  const successfulExits = (i + t) % 5;
  return { rating, values: { Defesas: saves, "Saídas do gol": successfulExits, "Reposições certas": accurateDistributions, "Gols sofridos": goalsConceded },
    stats: { saves, goalsConceded, shotsOnTarget: saves + goalsConceded, difficultSaves: Math.floor(saves / 3),
      accurateDistributions, distributionAttempts: accurateDistributions + t % 4, successfulExits, exitAttempts: successfulExits + t % 3 } };
}

function fixture() {
  const rows = {};
  function add(model, index, data) {
    const row = { ...data, id: id(model, index) };
    (rows[model] ??= []).push(row);
    return row;
  }
  const today = new Date(todayDateOnly() + "T00:00:00Z");
  const dates = Array.from({ length: 40 }, (_, t) => new Date(+today - (39 - t) * 7.5 * day))
    .map(date => new Date(date.toISOString().slice(0, 10) + "T00:00:00Z"));
  const createdAt = new Date(+dates[0] - 7 * day);
  const trainer = add("user", coach, { name: "Ari Vale", email: email(coach), role: "COACH", createdAt });
  const team = add("team", 1, { name: teamName, modality: "Futsal", code: "WK-TEAM-" + digest("invite").slice(0, 16).toUpperCase(),
    coachId: trainer.id, createdAt, objectiveCriteria: metricCatalog.Futsal, qualitativeCriteria: defaultQualitativeCriteria });
  const profiles = evaluationProfiles.map(([role]) => {
    const profile = add("evaluationProfile", role, { teamId: team.id, role, modality: team.modality, schemaVersion: PROFILE_VERSION });
    const criteria = ["QUALITATIVE", "QUANTITATIVE"].flatMap(kind => criteriaFor(team, role, kind).map(c =>
      add("profileCriterion", [role, kind, c.order], { ...c, profileId: profile.id })));
    return { ...profile, criteria };
  });
  const configured = { ...team, evaluationProfiles: profiles };
  const trainings = dates.map((date, t) => {
    const [type, description] = sessions[t % sessions.length];
    return add("training", t, { teamId: team.id, date, type, description, createdAt: date });
  });
  names.forEach((name, i) => {
    const account = accounts[i + 1];
    const approved = i < 25;
    const joined = approved ? createdAt : new Date(+today - (i - 25) * day);
    const birthDate = new Date(+today - (365.25 * (15 + i % 3) + 7 + i * 9) * day);
    const athlete = add("user", account, { name, email: email(account), role: "ATHLETE", birthDate, createdAt: joined });
    const position = i % 8 === 0 ? "Goleiro" : ["Ala", "Fixo", "Pivô"][i % 3];
    const member = add("membership", i, { athleteId: athlete.id, teamId: team.id, createdAt: joined,
      status: approved ? "APPROVED" : "PENDING", position: approved ? position : null, number: approved ? i + 1 : null });
    if (!approved) return;
    const context = recordContext(team, member);
    const role = context.roleSnapshot;
    if (i < 10) {
      const metric = configuredMetrics(configured, position).find(m => m.label === (i % 2 ? "Tomada de decisão" : position === "Goleiro" ? "Gols sofridos" : "Finalizações"));
      const direction = metric.label === "Gols sofridos" ? "atMost" : "atLeast";
      const target = metric.unit === "score" ? 8 : direction === "atMost" ? 2 : 3;
      const deadline = new Date(+today + (i % 3 === 1 ? -7 : 30) * day).toISOString().slice(0, 10);
      if (!validGoal(target, direction, deadline, metric.unit)) throw new Error("Meta de demonstração inválida.");
      add("personalGoal", i, { membershipId: member.id, metric: metric.id, label: metric.label, unit: metric.unit, profile: role,
        direction, target, deadline, createdAt: dates[28] });
    }
    trainings.forEach((training, t) => {
      const present = (t + i * 3) % (8 + i % 9) !== 4;
      const record = add("trainingRecord", [i,t], { ...context, athleteId: athlete.id, trainingId: training.id, present, measurementsInitialized: present });
      if (!present) return;
      const { rating, values, stats } = observations(i, t, position);
      const ratings = Object.fromEntries(criteriaFor(configured, role, "QUALITATIVE").map(c => [c.name, rating(c.order)]));
      const { criteria, ...evaluation } = prepareEvaluation(context, configured, ratings);
      const scored = add("evaluation", [i,t], { ...evaluation, recordId: record.id });
      for (const c of criteria.create) add("evaluationCriterion", [i,t,c.order], { ...c, evaluationId: scored.id });
      // O treino físico tem avaliação, mas as contagens com bola ficam sem observação.
      const counts = training.type === "PHYSICAL" ? {} : values;
      for (const m of prepareMeasurements(context, configured, {}, counts)) add("trainingMeasurement", [i,t,m.order], { ...m, recordId: record.id });
      if (stats && training.type !== "PHYSICAL") add("goalkeeperStats", [i,t], { ...prepareStats(context, stats), recordId: record.id });
    });
  });
  return rows;
}

// Ordem de inserção respeita as chaves estrangeiras.
const tables = ["user", "team", "evaluationProfile", "profileCriterion", "membership", "personalGoal", "training",
  "trainingRecord", "evaluation", "evaluationCriterion", "trainingMeasurement", "goalkeeperStats"];
async function create(tx, rows) {
  const team = rows.team[0];
  const existing = await tx.team.findUnique({ where: { id: team.id } });
  if (existing?.coachId === team.coachId) return "Demonstração já instalada. Nenhuma alteração.";
  if (existing || await tx.team.count({ where: { name: teamName } })) throw new Error("Já existe uma equipe com essa identidade ou nome.");
  for (const table of tables) {
    for (let p = 0; p < rows[table].length; p += 250) {
      await tx[table].createMany({ data: rows[table].slice(p, p + 250) });
    }
  }
  return "Demonstração criada: 25 aprovados, 6 pendentes, 40 treinos e 10 metas.";
}

async function remove(tx, rows) {
  const teamId = rows.team[0].id;
  const userIds = rows.user.map(u => u.id);
  const team = await tx.team.findUnique({ where: { id: teamId }, select: { coachId: true } });
  if (team && team.coachId !== rows.team[0].coachId) throw new Error("Remoção cancelada: a equipe mudou de treinador.");
  if (!team && await tx.team.count({ where: { name: teamName } })) {
    throw new Error("Esta chave não identifica a equipe encontrada. Confira WEBKORE_DEMO_KEY.");
  }
  const record = { training: { teamId } };
  const scopes = {
    team: { id: teamId }, evaluationProfile: { teamId }, profileCriterion: { profile: { teamId } },
    membership: { teamId }, personalGoal: { membership: { teamId } }, training: { teamId }, trainingRecord: record,
    evaluation: { record }, evaluationCriterion: { evaluation: { record } }, trainingMeasurement: { record }, goalkeeperStats: { record }
  };
  // Antes de qualquer cascata, confere cada descendente, inclusive itens adicionados pela interface.
  for (const [model, where] of Object.entries(scopes)) {
    const expected = new Set(rows[model].map(row => row.id));
    const found = await tx[model].findMany({ where, select: { id: true } });
    if (found.some(row => !expected.has(row.id))) throw new Error(`Remoção cancelada: a equipe contém dados adicionais (${model}).`);
  }
  if (await tx.sportMetric.count({ where: { record } })) throw new Error("Remoção cancelada: há métricas adicionais.");
  await tx.team.deleteMany({ where: { id: teamId, coachId: rows.team[0].coachId } });
  // athleteId em TrainingRecord não é FK. Preserva também contas com histórico externo ou decisões legais.
  const used = await tx.trainingRecord.findMany({ where: { athleteId: { in: userIds } }, distinct: ["athleteId"], select: { athleteId: true } });
  await tx.user.deleteMany({ where: { id: { in: userIds, notIn: used.map(r => r.athleteId) }, teams: { none: {} },
    memberships: { none: {} }, legalDecisions: { none: {} }, sessions: { none: {} } } });
  const kept = await tx.user.count({ where: { id: { in: userIds } } });
  return `Limpeza concluída. Contas da demonstração preservadas por vínculos, sessões ou histórico: ${kept}.`;
}

async function main() {
  const [action, argument, ...extra] = process.argv.slice(2);
  if (!["create", "remove", "login"].includes(action) || extra.length) throw new Error("Use create --confirm-create, remove --confirm-remove ou login <conta>.");
  if (action !== "login" && argument !== "--confirm-" + action) throw new Error("Confirmação explícita obrigatória: --confirm-" + action);
  if (!/^[a-f0-9]{64}$/i.test(key ?? "")) throw new Error("WEBKORE_DEMO_KEY deve conter 32 bytes aleatórios em hexadecimal.");
  if (action === "login") {
    if (!accounts.includes(argument) || !process.stdout.isTTY) throw new Error("Use um terminal interativo e uma conta entre treinador e atleta01–atleta31.");
    console.log(email(argument), initialPassword(argument));
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error("Configure DATABASE_URL explicitamente no ambiente.");
  const rows = fixture();
  if (action === "create") {
    for (const [i, user] of rows.user.entries()) user.passwordHash = await bcrypt.hash(validatePassword(initialPassword(accounts[i]), true), 10);
  }
  const db = new PrismaClient();
  try {
    console.log(await db.$transaction(tx => action === "create" ? create(tx, rows) : remove(tx, rows),
      { isolationLevel: "Serializable", timeout: 120000 }));
  } finally {
    await db.$disconnect();
  }
}

main().catch(error => {
  // Erros do Prisma podem conter dados de conexão ou argumentos da consulta.
  const databaseError = error.code || error.name?.startsWith("Prisma");
  console.error(databaseError ? `Operação cancelada (${error.code || error.name}).` : error.message);
  process.exitCode = 1;
});
