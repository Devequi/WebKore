// Explicit isolated MySQL integration suite. Never uses an existing database for fixtures.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { createServer as createSocketServer } from "node:net";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";
import "../../server/src/config/environment.js";
const demoDocuments = JSON.parse(await readFile(new URL("../../prisma/legal-demo.json", import.meta.url), "utf8")).sort((a,b) => a.type.localeCompare(b.type));
import { documentData, legalStatus, recordDecision } from "../../server/src/domain/legal.js";
const originalUrl = process.env.DATABASE_URL;
const url = new URL(originalUrl);
if (!["localhost", "127.0.0.1"].includes(url.hostname)) throw new Error("Este teste exige MySQL local.");
const database = `webkore_legal_test_${randomUUID().replaceAll("-", "")}`;
assert.match(database, /^webkore_legal_test_[a-f0-9]{32}$/);
const admin = new PrismaClient({ datasourceUrl: originalUrl });
if (process.env.NODE_ENV === "production") throw new Error("Teste recusado em produção.");
let prisma, server, passed = 0, created = false;
async function check(name, run) { await run(); passed++; console.log(`PASS ${passed}: ${name}`); }
try {
  await admin.$executeRawUnsafe(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  created = true;
  url.pathname = `/${database}`; process.env.DATABASE_URL = url.href;
  process.env.AUTH_REGISTER_LIMIT = "1000"; process.env.AUTH_LOGIN_LIMIT = "1000";
  const migration = spawnSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env: process.env, encoding: "utf8" });
  assert.equal(migration.status, 0, migration.stderr);
  ({ prisma } = await import("../../server/src/db/prisma.js"));
  const docs = demoDocuments.map(documentData);

  await check("publicação imutável e idempotente após persistência JSON no MySQL", async () => {
    for (let n = 0; n < 2; n++) {
      const result = spawnSync(process.execPath, ["prisma/publish-legal.js", "--demo"], { env: { ...process.env, NODE_ENV: "production" }, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
    }
    const path = `tmp/${database}-document.json`;
    await writeFile(path, JSON.stringify({ ...demoDocuments[0], title: "Tentativa de sobrescrever versão" }));
    try { const result = spawnSync(process.execPath, ["prisma/publish-legal.js", path], { env: process.env, encoding: "utf8" }); assert.equal(result.status, 1); assert.match(result.stderr, /imutável/); }
    finally { await unlink(path); }
    assert.equal(await prisma.legalDocument.count(), 2);
  });
  if (process.argv.includes("--browser")) {
    const socket = createSocketServer(); await new Promise(resolve => socket.listen(0, "127.0.0.1", resolve));
    process.env.WEBKORE_PRIVACY_FRONTEND_PORT = String(socket.address().port);
    process.env.APP_ORIGINS = `http://127.0.0.1:${socket.address().port}`;
    await new Promise(resolve => socket.close(resolve));
  }
  const { createApp } = await import("../../server/src/app.js");
  server = createApp().listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function request(path, method = "GET", body, token, expected = 200) {
    const res = await fetch(`${base}${path}`, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
    const data = res.status === 204 ? null : await res.json();
    assert.equal(res.status, expected, `${method} ${path}: ${JSON.stringify(data)}`); return data;
  }
  const legal = { termsId: docs[1].id, privacyId: docs[0].id, acceptTerms: true, acknowledgePrivacy: true };
  const userBody = { name: "Fixture Legal", email: "athlete@example.invalid", password: "TestPrivacy123!", role: "athlete", birthDate: "2000-01-01", legal };
  let athlete, coach;
  await check("documentos públicos e leitura sem concessão", async () => { assert.equal((await request("/legal/documents")).documents.length, 2); assert.equal(await prisma.legalDecision.count(), 0); });
  await check("cadastro sem termos não persiste usuário", async () => { await request("/auth/register", "POST", { ...userBody, legal: { ...legal, acceptTerms: false } }, null, 400); assert.equal(await prisma.user.count(), 0); });
  await check("cadastro com payload adulterado", async () => { await request("/auth/register", "POST", { ...userBody, userId: "other" }, null, 400); });
  await check("cadastro válido persiste decisões exatas", async () => { athlete = await request("/auth/register", "POST", userBody, null, 201); assert.equal(await prisma.legalDecision.count({ where: { userId: athlete.user.id } }), 2); assert.equal(athlete.legal.consents.length, 0); });
  await check("cadastro repetido não duplica decisões", async () => { await request("/auth/register", "POST", userBody, null, 409); assert.equal(await prisma.legalDecision.count(), 2); });
  await check("histórico somente do titular e autenticação", async () => {
    await request("/legal/me", "GET", undefined, null, 401);
    coach = await request("/auth/register", "POST", { ...userBody, email: "coach@example.invalid", role: "coach" }, null, 201);
    const own = await request("/legal/me", "GET", undefined, coach.token); assert.ok(own.history.every(e => e.userId === coach.user.id));
    await request(`/legal/me/${athlete.user.id}`, "GET", undefined, coach.token, 404);
  });
  await check("histórico não possui rota de edição ou exclusão", async () => {
    for (const method of ["PATCH", "DELETE"]) await request("/legal/me/decisions", method, {}, athlete.token, 404);
    await request("/legal/me/decisions", "POST", { documentId: docs[0].id, action: "ACKNOWLEDGE", requestKey: "fixture-key", userId: coach.user.id }, athlete.token, 400);
  });
  await check("reenvio concorrente é idempotente", async () => {
    const body = { documentId: docs[1].id, action: "ACCEPT", requestKey: "fixture-duplicate" };
    const results = await Promise.all(Array.from({ length: 4 }, () => request("/legal/me/decisions", "POST", body, athlete.token)));
    assert.equal(new Set(results.map(d => d.id)).size, 1); assert.equal(await prisma.legalDecision.count({ where: { userId: athlete.user.id } }), 3);
  });
  if (process.argv.includes("--browser")) {
    const { runLegalBrowserChecks } = await import("../navegadores/privacy.check.js");
    await runLegalBrowserChecks(base, athlete.token);
  }
  // Consent documents are fixtures ONLY in this disposable database. No invented purpose in the real catalog.
  const consent = await prisma.legalDocument.create({ data: documentData({ ...demoDocuments[0], type: "CONSENT", purpose: "TEST_ONLY", version: "fixture-1", requirementKey: "fixture-purpose-1" }) });
  await check("cadastro registra escolha opcional separada, sem autorização genérica", async () => {
    for (const granted of [false, true]) {
      const result = await request("/auth/register", "POST", { ...userBody, email: `choice-${granted}@example.invalid`, legal: { ...legal, consents: [{ documentId: consent.id, granted }] } }, null, 201);
      assert.equal(result.legal.consents[0].granted, granted);
      assert.equal(result.legal.history[0].action, granted ? "GRANT" : "DECLINE");
    }
  });
  await check("recusa opcional não bloqueia login", async () => {
    await request("/legal/me/decisions", "POST", { documentId: consent.id, action: "DECLINE", requestKey: "fixture-decline" }, athlete.token);
    await request("/auth/login", "POST", { email: userBody.email, password: userBody.password, role: "athlete" });
  });
  let grant;
  await check("concessão específica e repetição com mesma chave", async () => {
    const body = { documentId: consent.id, action: "GRANT", requestKey: "fixture-grant" };
    grant = await request("/legal/me/decisions", "POST", body, athlete.token);
    assert.equal((await request("/legal/me/decisions", "POST", body, athlete.token)).id, grant.id);
    assert.equal((await request("/legal/me", "GET", undefined, athlete.token)).consents[0].granted, true);
    await request("/legal/me/decisions", "POST", { ...body, action: "REVOKE" }, athlete.token, 409);
  });
  await check("revogação preserva histórico e é idempotente", async () => {
    const body = { documentId: consent.id, action: "REVOKE", requestKey: "fixture-revoke" };
    const revoked = await request("/legal/me/decisions", "POST", body, athlete.token);
    assert.equal((await request("/legal/me/decisions", "POST", body, athlete.token)).id, revoked.id);
    assert.equal((await request("/legal/me", "GET", undefined, athlete.token)).consents[0].granted, false);
    assert.ok(await prisma.legalDecision.findUnique({ where: { id: grant.id } }));
    await request("/legal/me/decisions", "POST", { documentId: consent.id, action: "GRANT", requestKey: "fixture-grant" }, athlete.token);
    assert.equal((await request("/legal/me", "GET", undefined, athlete.token)).consents[0].granted, false, "retry antigo não pode conceder novamente");
  });
  await check("nova finalidade não herda consentimento", async () => {
    await recordDecision(prisma, athlete.user.id, { documentId: consent.id, action: "GRANT", requestKey: "fixture-regrant" });
    await prisma.legalDocument.create({ data: documentData({ ...demoDocuments[0], type: "CONSENT", purpose: "TEST_ONLY", version: "fixture-2", requirementKey: "fixture-purpose-2", effectiveAt: new Date().toISOString() }) });
    assert.equal((await legalStatus(prisma, athlete.user.id)).consents[0].granted, false);
    await recordDecision(prisma, athlete.user.id, { documentId: consent.id, action: "REVOKE", requestKey: "fixture-old-revoke" });
  });
  await check("nova versão editorial dos Termos não exige aceite", async () => {
    await prisma.legalDocument.create({ data: documentData({ ...demoDocuments[1], version: "fixture-edit", effectiveAt: new Date().toISOString() }) });
    assert.equal((await legalStatus(prisma, athlete.user.id)).pending.length, 0);
    assert.equal((await request(`/legal/documents/TERMS/${docs[1].version}`)).id, docs[1].id);
  });
  await check("alteração material dos Termos exige nova decisão sem bloquear login", async () => {
    await prisma.legalDocument.create({ data: documentData({ ...demoDocuments[1], version: "fixture-material", requirementKey: "new-contract", effectiveAt: new Date(Date.now() - 1).toISOString() }) });
    // Ensure deterministic current revision even on a millisecond tie.
    const latest = await prisma.legalDocument.findUnique({ where: { id: "TERMS-fixture-edit" } });
    // Create a later effective date relative to both, but already effective.
    await new Promise(r => setTimeout(r, 5));
    await prisma.legalDocument.create({ data: documentData({ ...demoDocuments[1], version: "fixture-material-final", requirementKey: "new-contract", effectiveAt: new Date().toISOString() }) });
    assert.equal((await legalStatus(prisma, athlete.user.id)).pending[0].type, "TERMS");
    const login = await request("/auth/login", "POST", { email: userBody.email, password: userBody.password }); assert.ok(login.token); assert.ok(latest);
  });
  await check("nova Política não gera consentimento automático", async () => {
    await prisma.legalDocument.create({ data: documentData({ ...demoDocuments[0], version: "fixture-policy", requirementKey: "new-notice", effectiveAt: new Date().toISOString() }) });
    const status = await legalStatus(prisma, athlete.user.id); assert.ok(status.pending.some(d => d.type === "PRIVACY")); assert.equal(status.consents[0].granted, false);
  });
  const current = await legalStatus(prisma, athlete.user.id);
  const newLegal = { ...legal, termsId: current.documents.find(d => d.type === "TERMS").id, privacyId: current.documents.find(d => d.type === "PRIVACY").id };
  await check("correção de idade para menor revoga concessões sem reativá-las depois", async () => {
    const consentDoc = current.documents.find(d => d.type === "CONSENT");
    const account = await request("/auth/register", "POST", { ...userBody, email: "age-correction@example.invalid", legal: { ...newLegal, consents: [{ documentId: consentDoc.id, granted: true }] } }, null, 201);
    await request("/auth/me", "PATCH", { birthDate: "2020-01-01" }, account.token);
    let status = await request("/legal/me", "GET", undefined, account.token);
    assert.equal(status.consents[0].granted, false); assert.equal(status.consents[0].decision.action, "REVOKE_AGE");
    await request("/auth/me", "PATCH", { birthDate: "2000-01-01" }, account.token);
    status = await request("/legal/me", "GET", undefined, account.token); assert.equal(status.consents[0].granted, false);
  });
  await check("versões antigas são rejeitadas em novos cadastros", async () => { await request("/auth/register", "POST", { ...userBody, email: "stale@example.invalid" }, null, 409); });
  await check("crianças e adolescentes podem se cadastrar, sem consentimento parental presumido", async () => {
    for (const birthDate of ["2020-01-01", "2010-01-01"]) {
      const minor = await request("/auth/register", "POST", { ...userBody, email: `${birthDate}@example.invalid`, birthDate, legal: newLegal }, null, 201);
      assert.equal(minor.legal.consents.length, 0);
      const consentDoc = current.documents.find(d => d.type === "CONSENT");
      await request("/legal/me/decisions", "POST", { documentId: consentDoc.id, action: "GRANT", requestKey: "fixture-minor-grant" }, minor.token, 400);
      await request("/legal/me/decisions", "POST", { documentId: consentDoc.id, action: "DECLINE", requestKey: "fixture-minor-decline" }, minor.token);
    }
  });
  await check("exportação pessoal não inclui cadastro alheio", async () => {
    const exported = await request("/auth/me/data", "GET", undefined, athlete.token);
    assert.equal(exported.user.id, athlete.user.id); assert.equal(exported.user.passwordHash, undefined); assert.ok(!JSON.stringify(exported).includes("coach@example.invalid"));
  });
  await check("falha na gravação da decisão reverte criação da conta", async () => {
    const original = prisma.$transaction.bind(prisma);
    prisma.$transaction = callback => original(async tx => callback(new Proxy(tx, { get(target, key) { return key === "legalDecision" ? { createMany: async () => { throw new Error("fixture-write-failure"); } } : target[key]; } })));
    try { await request("/auth/register", "POST", { ...userBody, email: "rollback@example.invalid", legal: newLegal }, null, 500); }
    finally { prisma.$transaction = original; }
    assert.equal(await prisma.user.count({ where: { email: "rollback@example.invalid" } }), 0);
  });
  await check("falha de conexão retorna erro sem histórico ou dados parciais", async () => {
    const original = prisma.legalDocument.findMany;
    prisma.legalDocument.findMany = async () => { throw Object.assign(new Error("fixture-offline"), { code: "P1001" }); };
    try { await request("/legal/documents", "GET", undefined, null, 500); } finally { prisma.legalDocument.findMany = original; }
  });
  await check("exclusão remove registros esportivos órfãos e decisões", async () => {
    const team = await prisma.team.create({ data: { coachId: coach.user.id, name: "Fixture", modality: "Futsal", code: "FIXTURE" } });
    const training = await prisma.training.create({ data: { teamId: team.id, date: new Date(), type: "PHYSICAL" } });
    await prisma.trainingRecord.create({ data: { athleteId: athlete.user.id, trainingId: training.id, evaluation: { create: {} } } });
    await request("/auth/me", "DELETE", undefined, athlete.token, 204);
    assert.equal(await prisma.trainingRecord.count({ where: { athleteId: athlete.user.id } }), 0);
    assert.equal(await prisma.legalDecision.count({ where: { userId: athlete.user.id } }), 0);
    await request("/legal/me", "GET", undefined, athlete.token, 401);
  });
  console.log(`PASS: ${passed} cenários MySQL/HTTP; banco isolado.`);
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  if (prisma) await prisma.$disconnect();
  // Only the unique database created by this test is dropped.
  if (created) await admin.$executeRawUnsafe(`DROP DATABASE \`${database}\``);
  await admin.$disconnect(); process.env.DATABASE_URL = originalUrl;
}
