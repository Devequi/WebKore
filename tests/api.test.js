import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import test from "node:test";
import jwt from "jsonwebtoken";
import { createApp } from "../server/src/aplicativo.js";
import { requireAuth } from "../server/src/intermediario/autenticacao.js";
import { getJwtSecret } from "../server/src/lib/environment.js";
import { prisma } from "../server/src/lib/prisma.js";

test("API preserva health, respostas 401 e restrições do perfil atleta sem acessar o banco", async () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalFindUser = prisma.user.findUnique;
  prisma.user.findUnique = async ({ where }) => where.id === "test-user" ? { id: "test-user", role: "ATHLETE" } : null;
  const secret = randomBytes(48).toString("hex");
  process.env.JWT_SECRET = secret;
  const server = createApp().listen(0, "127.0.0.1");
  try {
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}/api`;
    const health = await fetch(`${baseUrl}/health`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { status: "ok", service: "webkore-api" });

    for (const path of ["/auth/me", "/teams", "/trainings/team/test-team"]) {
      const response = await fetch(`${baseUrl}${path}`);
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { message: "Token não informado." });
    }

    const tokens = [
      "invalid-token",
      jwt.sign({ id: "test-user", role: "ATHLETE" }, secret, { expiresIn: -1 }),
      jwt.sign({ id: "test-user", role: "ATHLETE" }, randomBytes(48).toString("hex"))
    ];
    for (const token of tokens) {
      const response = await fetch(`${baseUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      assert.equal(response.status, 401);
      assert.deepEqual(await response.json(), { message: "Token inválido." });
    }

    const token = jwt.sign({ id: "test-user", role: "ATHLETE" }, secret, { expiresIn: "7d" });
    const request = { headers: { authorization: `Bearer ${token}` } };
    let authenticated = false;
    await requireAuth(request, {}, () => { authenticated = true; });
    assert.equal(authenticated, true);
    assert.equal(request.user.id, "test-user");
    assert.equal(request.user.role, "ATHLETE");

    for (const [method, path] of [
      ["POST", "/teams"],
      ["POST", "/trainings"],
      ["PATCH", "/teams/test-team"],
      ["DELETE", "/trainings/test-training"]
    ]) {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({})
      });
      assert.equal(response.status, 403);
      assert.equal(typeof (await response.json()).message, "string");
    }

    process.env.JWT_SECRET = "";
    assert.throws(getJwtSecret, /Configure JWT_SECRET/);
    assert.throws(createApp, /Configure JWT_SECRET/);
  } finally {
    prisma.user.findUnique = originalFindUser;
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("seed recusa execução sem senha configurada antes de acessar o banco", () => {
  const result = spawnSync(process.execPath, ["prisma/seed.js"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, SEED_PASSWORD: "" },
    encoding: "utf8"
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Configure SEED_PASSWORD/);
});

test("limpeza exige modo teste e fixtures são bloqueadas em produção antes de acessar o banco", () => {
  for (const [args, env, message] of [
    [["--clear"], {}, /--clear exige o modo --test/],
    [["--test", "--clear"], { NODE_ENV: "production" }, /não permitido em produção/]
  ]) {
    const result = spawnSync(process.execPath, ["prisma/seed.js", ...args], {
      cwd: new URL("..", import.meta.url), env: { ...process.env, ...env }, encoding: "utf8"
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, message);
  }
});
