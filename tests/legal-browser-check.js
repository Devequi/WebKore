import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { randomUUID } from "node:crypto";

export async function runLegalBrowserChecks(apiBase, token) {
  process.env.VITE_API_URL = apiBase;
  const vite = await createServer({ cacheDir: "node_modules/.vite-privacy-qa", optimizeDeps: { entries: ["index.html"], include: ["react", "react-dom/client", "lucide-react", "recharts"] }, server: { host: "127.0.0.1", port: Number(process.env.WEBKORE_PRIVACY_FRONTEND_PORT), strictPort: true, open: false } });
  let browser;
  const errors = [];
  try {
    await vite.listen();
    const origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
    browser = await chromium.launch({ headless: true, ...(process.env.WEBKORE_TEST_BROWSER_CHANNEL || process.platform === "win32" ? { channel: process.env.WEBKORE_TEST_BROWSER_CHANNEL || "msedge" } : {}) });
    const page = await browser.newPage();
    page.setDefaultTimeout(20000);
    page.setDefaultNavigationTimeout(60000);
    page.on("pageerror", e => errors.push(e.message));
    await mkdir("tmp/privacy-qa", { recursive: true });
    for (const width of [360, 390, 768, 1366, 1920]) {
      await page.setViewportSize({ width, height: width < 600 ? 740 : 900 });
      await page.goto(`${origin}/#/login`);
      await page.getByRole("button", { name: "Criar conta", exact: true }).click();
      const trigger = page.getByRole("button", { name: "Privacidade e proteção de dados", exact: true });
      await trigger.click();
      const dialog = page.getByRole("dialog"); await dialog.waitFor({ state: "visible" });
      assert.equal(await page.getByRole("checkbox").count(), 2);
      assert.equal(await page.getByRole("checkbox").first().isChecked(), false);
      assert.equal(await page.getByRole("checkbox").nth(1).isChecked(), false);
      // Focus stays in the native modal through sequential keyboard navigation.
      for (let n = 0; n < 12; n++) { await page.keyboard.press("Tab"); assert.ok(await page.evaluate(() => document.querySelector("dialog").contains(document.activeElement))); }
      const geometry = await dialog.evaluate(el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, viewportWidth: innerWidth, viewportHeight: innerHeight, bodyScrollable: el.querySelector(".privacy-dialog__body").scrollHeight > el.querySelector(".privacy-dialog__body").clientHeight }; });
      assert.ok(geometry.left >= 0 && geometry.right <= geometry.viewportWidth + 1 && geometry.top >= 0 && geometry.bottom <= geometry.viewportHeight + 1, JSON.stringify(geometry));
      assert.ok(geometry.bodyScrollable);
      const heading = await dialog.locator("header h2").boundingBox();
      assert.ok(heading.width > 150 && heading.height < 130, `Título ilegível: ${JSON.stringify(heading)}`);
      // Footer decisions can be made without scrolling: no forced-reading gate.
      await page.getByRole("checkbox", { name: /Tomei ciência/ }).check();
      assert.equal(await page.getByRole("checkbox", { name: /Aceito os Termos/ }).isChecked(), false);
      await dialog.locator(".privacy-dialog__body").evaluate(el => { el.scrollTop = 0; });
      await page.screenshot({ path: `tmp/privacy-qa/modal-${width}.png` });
      await page.keyboard.press("Escape");
      assert.equal(await trigger.evaluate(el => el === document.activeElement), true);
      console.log(`PASS browser: modal ${width}px, foco, Escape, ciência separada e rolagem interna`);
      await page.goto(`${origin}/privacidade`);
      await page.getByRole("heading", { name: "Política de Privacidade", exact: true }).waitFor();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `tmp/privacy-qa/policy-${width}.png`, fullPage: true });
    }
    await page.goto(`${origin}/termos`);
    await page.getByRole("heading", { name: "Termos de Uso", exact: true }).waitFor();
    await page.evaluate(value => localStorage.setItem("webkore-auth-token-v1", value), token);
    await page.goto(`${origin}/#/perfil`);
    await page.getByRole("tab", { name: "Privacidade e segurança", exact: true }).click();
    await page.getByRole("button", { name: /^Ver registros/ }).click();
    await page.getByText("Aceite dos Termos", { exact: true }).first().waitFor();
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Exportar meus dados" }).click();
    const download = await downloadEvent;
    const exported = JSON.parse(await readFile(await download.path(), "utf8"));
    assert.equal(exported.user.email, "athlete@example.invalid"); assert.equal(exported.user.passwordHash, undefined);
    console.log("PASS browser: perfil, histórico real e download dos dados autenticados");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.goto(`${origin}/#/login`);
    await page.getByRole("button", { name: "Criar conta", exact: true }).click();
    await page.getByRole("combobox").selectOption("athlete");
    await page.getByLabel("Nome completo", { exact: true }).fill("Atleta menor de teste");
    await page.getByLabel("E-mail", { exact: true }).fill(`browser-${randomUUID()}@example.invalid`);
    await page.getByLabel("Senha", { exact: true }).fill("TestPrivacy123!");
    await page.getByLabel("Data de Nascimento").fill("2020-01-01");
    await page.getByRole("button", { name: "Criar conta", exact: true }).click();
    await page.getByRole("alert").filter({ hasText: "confirme separadamente" }).waitFor();
    await page.getByRole("button", { name: "Privacidade e proteção de dados", exact: true }).click();
    await page.getByRole("checkbox", { name: /Tomei ciência/ }).check();
    await page.getByRole("checkbox", { name: /Aceito os Termos/ }).check();
    await page.getByRole("button", { name: "Confirmar decisões", exact: true }).click();
    await page.getByRole("button", { name: "Criar conta", exact: true }).click();
    await page.waitForURL("**/#/athlete/teams");
    console.log("PASS browser: cadastro real de criança, validação de decisões e login automático");
    const { runProfileBrowserChecks } = await import("./profile-browser-check.js");
    await runProfileBrowserChecks(browser, origin, apiBase);
    assert.deepEqual(errors, []);
  } finally { await browser?.close(); await vite.close(); }
}
