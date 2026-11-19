import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import test from "node:test";

test("API explica porta ocupada, encerra com falha e preserva o processo existente", { timeout: 15000 }, async () => {
  const listener = createServer();
  await new Promise((resolve, reject) => { listener.once("error", reject); listener.listen(0, "127.0.0.1", resolve); });
  let child;
  try {
    child = spawn(process.execPath, ["server/indice.js"], {
      cwd: new URL("..", import.meta.url), windowsHide: true,
      env: { ...process.env, NODE_ENV: "test", HOST: "127.0.0.1", PORT: String(listener.address().port),
        JWT_SECRET: randomBytes(48).toString("hex"), APP_ORIGINS: "http://127.0.0.1:5173" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout.on("data", chunk => { output += chunk; });
    child.stderr.on("data", chunk => { output += chunk; });
    const code = await new Promise((resolve, reject) => { child.once("error", reject); child.once("exit", resolve); });
    assert.equal(code, 1);
    assert.match(output, /já está em uso/);
    assert.match(output, /configure uma porta livre em PORT/);
    assert.doesNotMatch(output, /Unhandled|node:events|at Server\./);
    assert.equal(listener.listening, true);
  } finally {
    if (child && child.exitCode === null) child.kill();
    await new Promise(resolve => listener.close(resolve));
  }
});
