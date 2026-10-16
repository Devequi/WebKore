import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { createApp } from "../server/src/aplicativo.js";
import { prisma } from "../server/src/lib/prisma.js";
import { getJwtSecret } from "../server/src/lib/environment.js";
import { authenticate, clearSession, restoreSession } from "../src/services/session.js";
import { api, getAuthToken, setAuthToken } from "../src/services/api.js";
import { changeCriterion } from "../shared/criteria.js";
import { calculateAge } from "../shared/birthDate.js";

// Execução explícita: cria somente fixtures com IDs capturados e as limpa no finally.
const stage = Number(process.argv[2] || 1);
const run = randomUUID();
const password = randomUUID();
const createdUsers = [];
const createdTeams = [];
const values = new Map();
globalThis.localStorage = { getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
const nativeFetch = globalThis.fetch;
const server = createApp().listen(0, "127.0.0.1");
await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
const base = `http://127.0.0.1:${server.address().port}`;
globalThis.fetch = (url, options) => { const parsed = new URL(url); return nativeFetch(`${base}${parsed.pathname}${parsed.search}`, options); };
async function request(path, method = "GET", body, token = getAuthToken(), expected = 200) {
  const response = await nativeFetch(`${base}/api${path}`, { method,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const data = response.status === 204 ? null : await response.json();
  assert.equal(response.status, expected, `${method} ${path}: ${data?.message || "status"}`);
  return data;
}
async function register(role, suffix) {
  const email = `webkore-test-${run}-${suffix}@example.invalid`;
  const result = await authenticate({ name: `Teste ${suffix}`, email, password, role,
    ...(role === "athlete" ? { birthDate: "2004-02-29" } : {}) }, true);
  createdUsers.push(result.user.id);
  return { ...result, email, token: getAuthToken() };
}
try {
  const coach = await register("coach", "coach");
  assert.equal(coach.session.source, "api");
  assert.equal(coach.user.password, undefined);
  assert.equal(coach.user.passwordHash, undefined);
  assert.equal((await restoreSession()).user.id, coach.user.id);
  const user = await prisma.user.findUnique({ where: { id: coach.user.id } });
  assert.notEqual(user.passwordHash, password);
  assert.ok(![...values.values()].some((value) => value.includes(password)));
  clearSession();
  assert.equal(getAuthToken(), null);
  await authenticate({ email: coach.email, password, role: "coach" });
  assert.equal((await api.me()).user.id, coach.user.id);
  await request("/auth/login", "POST", { email: `missing-${run}@example.invalid`, password }, null, 401);
  await request("/auth/login", "POST", { email: coach.email, password: randomUUID() }, null, 401);
  const validToken = getAuthToken();
  for (const token of ["invalid-token", jwt.sign({ id: coach.user.id, role: "COACH" }, getJwtSecret(), { expiresIn: -1 })]) {
    setAuthToken(token);
    await assert.rejects(restoreSession, (error) => error.status === 401);
    assert.equal(getAuthToken(), null);
  }
  setAuthToken(validToken);
  console.log("Etapa 1: cadastro, login, sessão/reload, logout, novo login, Bearer, senha incorreta e tokens inválidos/expirados OK.");
  if (stage >= 2) {
    let team = await api.createTeam({ name: `Equipe teste ${run}`, modality: "Futsal" });
    createdTeams.push(team.id);
    team = await api.updateTeam(team.id, { name: "Equipe alterada" });
    assert.equal((await api.me()).state.teams.find((item) => item.id === team.id).name, "Equipe alterada");
    team = await api.updateTeam(team.id, changeCriterion(team, { kind: "objective", name: "Sprints" }, "add"));
    team = await api.updateTeam(team.id, changeCriterion(team, { kind: "objective", previousName: "Sprints", nextName: "Corridas" }, "rename"));
    team = await api.updateTeam(team.id, changeCriterion(team, { kind: "objective", name: "Corridas" }, "remove"));
    team = await api.updateTeam(team.id, changeCriterion(team, { kind: "qualitative", name: "Trabalho em equipe" }, "remove"));
    team = await api.updateTeam(team.id, changeCriterion(team, { kind: "qualitative", name: "Cooperação" }, "add"));
    team = await api.updateTeam(team.id, changeCriterion(team, { kind: "qualitative", previousName: "Técnica", nextName: "Habilidade" }, "rename"));
    await request(`/teams/${team.id}`, "PATCH", { qualitativeCriteria: [...team.qualitativeCriteria, "Quinta nota"] }, validToken, 400);
    const athlete = await register("athlete", "athlete");
    assert.equal(athlete.user.birthDate, "2004-02-29");
    assert.equal((await prisma.user.findUnique({ where: { id: athlete.user.id } })).birthDate.toISOString(), "2004-02-29T00:00:00.000Z");
    assert.equal((await api.me()).user.birthDate, "2004-02-29");
    assert.equal((await request("/auth/login", "POST", { email: athlete.email, password, role: "athlete" }, null)).user.birthDate, "2004-02-29");
    await api.requestJoin(team.code);
    setAuthToken(validToken);
    await api.respondRequest(team.id, athlete.user.id, "approved");
    const athleteInDashboard = (await api.me()).state.users.find((item) => item.id === athlete.user.id);
    assert.equal(athleteInDashboard.birthDate, "2004-02-29");
    assert.equal(calculateAge(athleteInDashboard.birthDate, "2026-03-01"), 22);
    assert.equal((await request("/teams")).find((item) => item.id === team.id).athletes.find((item) => item.id === athlete.user.id).birthDate, "2004-02-29");
    for (const birthDate of [null, "", "2026-02-30", "9999-12-31", "29/02/2004"]) {
      await request("/auth/register", "POST", { name: "Data inválida", email: `invalid-birth-${run}@example.invalid`, password, role: "athlete", birthDate }, null, 400);
      await request("/auth/me", "PATCH", { birthDate }, athlete.token, 400);
    }
    // Simula apenas nesta fixture uma conta anterior à restauração do campo.
    await prisma.user.update({ where: { id: athlete.user.id }, data: { birthDate: null } });
    assert.equal((await request("/auth/login", "POST", { email: athlete.email, password }, null)).user.birthDate, null);
    assert.equal((await request("/auth/me", "PATCH", { name: "Atleta antigo" }, athlete.token)).user.birthDate, null);
    assert.equal((await request("/auth/me", "PATCH", { birthDate: "2004-02-29" }, athlete.token)).user.birthDate, "2004-02-29");
    const training = await api.createTraining({ teamId: team.id, date: "2026-09-30", type: "Misto", records: [{ athleteId: athlete.user.id,
      ratings: { Habilidade: 8 }, metrics: { Gols: 3 } }] });
    const recordId = training.athletes[athlete.user.id].id;
    team = await api.updateTeam(team.id, changeCriterion(team, { kind: "qualitative", previousName: "Habilidade", nextName: "Técnica nova" }, "rename", true));
    assert.equal((await api.me()).state.trainings.find((item) => item.id === training.id).athletes[athlete.user.id].ratings["Técnica nova"], 8);
    await request(`/teams/${team.id}`, "PATCH", { qualitativeCriteria: team.qualitativeCriteria.slice(0, 3) }, validToken, 409);
    team = await api.updateTeam(team.id, changeCriterion(team, { kind: "objective", previousName: "Gols", nextName: "Gols marcados" }, "rename", true));
    assert.equal((await api.me()).state.trainings.find((item) => item.id === training.id).athletes[athlete.user.id].metrics["Gols marcados"], 3);
    await request(`/teams/${team.id}`, "PATCH", { name: "Proibido" }, athlete.token, 403);
    await request(`/teams/${team.id}`, "DELETE", undefined, null, 401);
    const otherCoach = await register("coach", "other-coach");
    await request(`/teams/${team.id}`, "PATCH", { name: "Proibido" }, otherCoach.token, 404);
    setAuthToken(validToken);
    if (stage >= 3) {
      const invalidUser = { name: "Teste inválido", email: `invalid-${run}@example.invalid`, password };
      for (const body of [{ ...invalidUser, role: "ADMIN" }, { ...invalidUser, role: {} },
        { ...invalidUser, role: "coach", name: "   " }, { ...invalidUser, role: "coach", password: "" },
        { ...invalidUser, role: "coach", email: "sem-email" }, {}]) {
        await request("/auth/register", "POST", body, null, 400);
      }
      await request("/auth/register", "POST", { ...invalidUser, email: coach.email, role: "coach" }, null, 409);
      await request(`/teams/${team.id}/requests/${athlete.user.id}`, "PATCH", { status: "INVALID" }, validToken, 400);
      await request(`/teams/${team.id}/requests/missing-user`, "PATCH", { status: "approved" }, validToken, 404);
      await request("/teams/missing-team", "PATCH", { name: "Ausente" }, validToken, 404);
      await request("/teams/bad%20id", "PATCH", { name: "Inválido" }, validToken, 400);
      await request("/teams", "POST", { name: " ", modality: "Futsal" }, validToken, 400);
      await request(`/teams/${team.id}`, "PATCH", { name: null }, validToken, 400);
      await request(`/teams/${team.id}/athletes/missing-user`, "PATCH", { number: 7 }, validToken, 404);
      await request(`/trainings/${training.id}/athletes/${athlete.user.id}`, "PATCH", { present: "false" }, validToken, 400);
      for (const note of [-1, 11, null, "", "8", 2.5]) {
        await request(`/trainings/${training.id}/athletes/${athlete.user.id}`, "PATCH", { ratings: { "Técnica nova": note } }, validToken, 400);
      }
      await request(`/trainings/${training.id}/athletes/${athlete.user.id}`, "PATCH", { metrics: { Gols: -1 } }, validToken, 400);
      await request(`/trainings/${training.id}/athletes/missing-user`, "PATCH", { present: true }, validToken, 404);
      const validTraining = { teamId: team.id, date: "2026-09-30", type: "Misto" };
      for (const body of [{ ...validTraining, date: "2026-02-31" }, { ...validTraining, records: {} },
        { ...validTraining, records: [{ athleteId: {} }] }, { ...validTraining, teamId: 10 },
        { ...validTraining, records: [{ athleteId: "missing-user" }] }, {}]) {
        await request("/trainings", "POST", body, validToken, Object.hasOwn(body, "records") && body.records?.[0]?.athleteId === "missing-user" ? 404 : 400);
      }
      const malformed = await nativeFetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{invalid" });
      assert.equal(malformed.status, 400);
      console.log("Etapa 3: perfis/status inválidos, IDs, notas, presença, campos obrigatórios, JSON e conflitos rejeitados com 400/404/409 OK.");
    }
    if (stage >= 4) {
      await request("/teams/join", "POST", { code: ` ${team.code.toLowerCase()} ` }, athlete.token, 201);
      assert.equal((await request("/auth/me", "GET", undefined, athlete.token)).state.memberships.find((item) => item.teamId === team.id).status, "approved");
      await api.updateMembership(team.id, athlete.user.id, { number: "0", position: "Ala" });
      let membership = await api.updateMembership(team.id, athlete.user.id, { position: " Pivô " });
      assert.equal(membership.number, 0);
      assert.equal(membership.position, "Pivô");
      membership = await api.updateMembership(team.id, athlete.user.id, { number: 7 });
      assert.equal(membership.position, "Pivô");
      membership = await api.updateMembership(team.id, athlete.user.id, { number: null });
      assert.equal(membership.number, null);
      assert.equal(membership.position, "Pivô");
      membership = await api.updateMembership(team.id, athlete.user.id, { position: "" });
      assert.equal(membership.position, null);
      team = await api.updateTeam(team.id, { modality: " VOLEI " });
      assert.equal(team.modality, "Vôlei");
      assert.equal((await prisma.team.findUnique({ where: { id: team.id } })).modality, "Vôlei");
      await api.respondRequest(team.id, athlete.user.id, "rejected");
      assert.equal((await request("/teams/join", "POST", { code: team.code }, athlete.token, 201)).status, "pending");
      assert.equal((await request("/teams/join", "POST", { code: team.code }, athlete.token, 201)).status, "pending");
      await api.respondRequest(team.id, athlete.user.id, "approved");
      console.log("Etapa 4: join aprovado/pendente/rejeitado, código com espaços, PATCH parcial/null/vazio, número zero e Vôlei canônico OK.");
    }
    if (stage >= 5) {
      await api.updateTrainingAthlete(training.id, athlete.user.id, { ratings: { "Técnica nova": 0, Participacao: 10 } });
      await api.updateTrainingAthlete(training.id, athlete.user.id, { ratings: { "Técnica nova": 0 } });
      await api.updateTrainingAthlete(training.id, athlete.user.id, { present: false, metrics: { "Gols marcados": 0 } });
      const saved = (await api.me()).state.trainings.find((item) => item.id === training.id).athletes[athlete.user.id];
      assert.equal(saved.ratings["Técnica nova"], 0);
      assert.equal(saved.ratings.Participação, 10);
      const evaluation = await prisma.evaluation.findUnique({ where: { recordId } });
      assert.equal(evaluation.technique, 0);
      assert.equal(evaluation.participation, 10);
      await request(`/trainings/${training.id}/athletes/${athlete.user.id}`, "PATCH", { ratings: { Desconhecido: 5 } }, validToken, 400);
      console.log("Etapa 5: zero/dez no banco e leitura, alias antigo, PATCH de uma nota sem redefinir outras e critério inválido OK.");
    }
    if (stage >= 6) {
      const secondAthlete = await register("athlete", "second-athlete");
      await api.requestJoin(team.code);
      await request(`/trainings/team/${team.id}`, "GET", undefined, secondAthlete.token, 404);
      setAuthToken(validToken);
      await api.respondRequest(team.id, secondAthlete.user.id, "approved");
      const privateTraining = await api.createTraining({ teamId: team.id, date: "2026-09-30", type: "Coletivo", records: [
        { athleteId: athlete.user.id, ratings: { "Técnica nova": 0 }, present: true, metrics: { "Gols marcados": 2 } },
        { athleteId: secondAthlete.user.id, ratings: { "Técnica nova": 9 }, present: false, metrics: { "Gols marcados": 8 } }
      ] });
      const foreignTeam = await request("/teams", "POST", { name: "Equipe privada outro treinador", modality: "Futsal" }, otherCoach.token, 201);
      createdTeams.push(foreignTeam.id);
      const ownSession = await request("/auth/me", "GET", undefined, athlete.token);
      assert.deepEqual(ownSession.state.teams.map((item) => item.id), [team.id]);
      assert.deepEqual(ownSession.state.memberships.map((item) => item.athleteId), [athlete.user.id]);
      assert.ok(!ownSession.state.users.some((item) => item.id === secondAthlete.user.id));
      assert.equal(ownSession.state.users.find((item) => item.id === coach.user.id).email, undefined);
      const ownRecords = ownSession.state.trainings.find((item) => item.id === privateTraining.id).athletes;
      assert.deepEqual(Object.keys(ownRecords), [athlete.user.id]);
      assert.equal(ownRecords[athlete.user.id].ratings["Técnica nova"], 0);
      for (const item of await request(`/trainings/team/${team.id}`, "GET", undefined, athlete.token)) {
        assert.deepEqual(Object.keys(item.athletes), [athlete.user.id]);
      }
      const coachSession = await api.me();
      assert.deepEqual(coachSession.state.teams.map((item) => item.id), [team.id]);
      assert.deepEqual(Object.keys(coachSession.state.trainings.find((item) => item.id === privateTraining.id).athletes).sort(), [athlete.user.id, secondAthlete.user.id].sort());
      assert.ok(!coachSession.state.users.some((item) => item.id === otherCoach.user.id));
      const discovered = await request(`/teams?code=${encodeURIComponent(` ${team.code.toLowerCase()} `)}`, "GET", undefined, secondAthlete.token);
      assert.equal(discovered[0].name, team.name);
      assert.equal(discovered[0].athletes, undefined);
      assert.equal(discovered[0].coach.email, undefined);
      await request(`/trainings/team/${team.id}`, "GET", undefined, otherCoach.token, 404);
      await request(`/trainings/team/${foreignTeam.id}`, "GET", undefined, athlete.token, 404);
      await request(`/trainings/${privateTraining.id}/athletes/${athlete.user.id}`, "PATCH", { present: false }, otherCoach.token, 404);
      await request(`/trainings/${privateTraining.id}`, "DELETE", undefined, athlete.token, 403);
      await request(`/teams/${team.id}/athletes/${secondAthlete.user.id}`, "PATCH", { number: 4 }, athlete.token, 403);
      for (const claims of [{ id: "missing-user", role: "COACH" }, { id: athlete.user.id, role: "COACH" }, { id: coach.user.id, role: "ADMIN" }, { role: "COACH" }]) {
        await request("/auth/me", "GET", undefined, jwt.sign(claims, getJwtSecret(), { expiresIn: "1h" }), 401);
      }
      await request(`/teams/${team.id}/athletes/${secondAthlete.user.id}`, "DELETE", undefined, secondAthlete.token, 204);
      await request(`/trainings/team/${team.id}`, "GET", undefined, secondAthlete.token, 404);
      assert.equal((await request("/auth/me", "GET", undefined, secondAthlete.token)).state.trainings.length, 0);
      assert.ok(await prisma.trainingRecord.findUnique({ where: { trainingId_athleteId: { trainingId: privateTraining.id, athleteId: secondAthlete.user.id } } }));
      console.log("Etapa 6: dois atletas, equipes de dois treinadores, projeção, notas privadas, busca, saída sem apagar histórico e JWT/conta verificados OK.");
    }
    await api.deleteTeam(team.id);
    assert.equal(await prisma.membership.count({ where: { teamId: team.id } }), 0);
    assert.equal(await prisma.training.count({ where: { teamId: team.id } }), 0);
    assert.equal(await prisma.trainingRecord.count({ where: { id: recordId } }), 0);
    assert.equal(await prisma.evaluation.count({ where: { recordId } }), 0);
    assert.equal(await prisma.sportMetric.count({ where: { recordId } }), 0);
    assert.ok(await prisma.user.findUnique({ where: { id: athlete.user.id } }));
    console.log("Etapa 2: configurações persistidas, critérios, limite de quatro, notas históricas, permissões e cascade sem excluir atletas OK.");
  }
} finally {
  globalThis.fetch = nativeFetch;
  if (createdTeams.length) await prisma.team.deleteMany({ where: { id: { in: createdTeams } } });
  if (createdUsers.length) await prisma.user.deleteMany({ where: { id: { in: createdUsers } } });
  await prisma.$disconnect();
  await new Promise((resolve) => server.close(resolve));
  delete globalThis.localStorage;
  console.log(`Fixtures da execução ${run} removidas; dados anteriores preservados (etapa ${stage}).`);
}
