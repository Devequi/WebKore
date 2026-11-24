import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { getJwtSecret } from "../../server/src/config/environment.js";

test("chave de produção descarta espaços ao validar comprimento e exemplos", t => {
  const previous = { JWT_SECRET: process.env.JWT_SECRET, NODE_ENV: process.env.NODE_ENV };
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
  process.env.NODE_ENV = "production";
  for (const key of ["abc".padEnd(40), "  CHANGE_ME".padEnd(42, "x")]) {
    process.env.JWT_SECRET = key;
    assert.throws(getJwtSecret, /JWT_SECRET/);
  }
});

test("publicador exige documento explícito em produção antes de acessar o banco", () => {
  const result = spawnSync(process.execPath, ["prisma/publish-legal.js"], {
    encoding: "utf8", env: { ...process.env, NODE_ENV: "production", DATABASE_URL: "mysql://localhost:1/unused" }
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /documentos aprovados/);
});

test("seed convencional também bloqueia fixtures em produção", () => {
  const result = spawnSync(process.execPath, ["prisma/seed.js"], {
    encoding: "utf8", env: { ...process.env, NODE_ENV: "production", DATABASE_URL: "mysql://localhost:1/unused", SEED_PASSWORD: "fixture" }
  });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /não permitido em produção/);
});
