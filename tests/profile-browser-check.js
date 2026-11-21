import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { expect } from "@playwright/test";

// Uses only the disposable database and API created by legal-integration-check.js.
export async function runProfileBrowserChecks(browser, origin, apiBase) {
  const check = expect.configure({ timeout: 15000 });
  async function request(path, method = "GET", body, token, status = 200) {
    const response = await fetch(apiBase + path, { method, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const data = response.status === 204 ? null : await response.json();
    assert.equal(response.status, status, data?.message); return data;
  }
  const { documents } = await request("/legal/documents");
  const legal = { termsId: documents.find(d => d.type === "TERMS").id, privacyId: documents.find(d => d.type === "PRIVACY").id, acceptTerms: true, acknowledgePrivacy: true };
  await mkdir("tmp/profile-redesign", { recursive: true });
  for (const role of ["coach", "athlete"]) {
    const password = "TestProfile123!", name = role === "coach" ? "Rafael Almeida" : "Marina Costa";
    const email = `perfil-${randomUUID()}@example.invalid`;
    const account = await request("/auth/register", "POST", { name, email, password, role, legal, ...(role === "athlete" ? { birthDate: "2000-01-01" } : {}) }, null, 201);
    const context = await browser.newContext(), errors = [];
    await context.addInitScript(token => localStorage.setItem("webkore-auth-token-v1", token), account.token);
    const page = await context.newPage();
    page.setDefaultTimeout(20000); page.setDefaultNavigationTimeout(60000);
    page.on("pageerror", e => errors.push(e.message));
    try {
      await page.goto(`${origin}/#/perfil`);
      const personal = page.getByRole("tab", { name: "Dados pessoais", exact: true });
      const privacy = page.getByRole("tab", { name: "Privacidade e segurança", exact: true });
      await check(personal).toHaveAttribute("aria-selected", "true");
      await check(page.locator(".profile-identity")).toContainText(name);
      await check(page.locator(".profile-created")).toContainText("Conta criada em");
      await check(page.getByText("Identificação da conta", { exact: true })).toHaveCount(0);
      await check(page.getByText("Informações da conta", { exact: true })).toHaveCount(0);
      await personal.focus(); await page.keyboard.press("ArrowRight"); await check(privacy).toBeFocused();
      await page.keyboard.press("Home"); await check(personal).toBeFocused();
      for (const width of [360, 768, 1440, 1920]) {
        await page.setViewportSize({ width, height: width < 600 ? 800 : 1000 });
        for (const [label, suffix] of [["Dados pessoais", "dados"], ["Privacidade e segurança", "privacidade"]]) {
          await page.getByRole("tab", { name: label, exact: true }).click();
          if (suffix === "privacidade") await check(page.getByRole("heading", { name: "Documentos legais", exact: true })).toBeVisible();
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${role}/${suffix}/${width}: excesso horizontal`);
          const bounds = await page.locator(".profile-page").boundingBox(); assert.ok(bounds.width <= 961);
          for (const form of await page.locator(".profile-form:visible").all()) assert.ok((await form.boundingBox()).width <= 521);
          await page.screenshot({ path: `tmp/profile-redesign/${role}-${suffix}-${width}.png`, fullPage: true });
        }
      }
      assert.equal(await page.locator(".profile-password").getAttribute("open"), null);
      const history = page.getByRole("button", { name: /^Ver registros/ });
      await check(history).toHaveAttribute("aria-expanded", "false"); await history.click();
      await check(page.getByText("Aceite dos Termos", { exact: true })).toBeVisible();
      await check(page.getByText("Ciência da Política", { exact: true })).toBeVisible();
      await check(page.locator(".legal-history")).toContainText(documents[0].version);
      await check(page.locator(".legal-history")).toContainText(/\d{2}:\d{2}:\d{2}/);
      await check(page.getByRole("heading", { name: "Consentimentos opcionais", exact: true })).toHaveCount(0);
      for (const title of ["Política de Privacidade", "Termos de Uso"]) {
        const opened = context.waitForEvent("page"); await page.getByRole("link", { name: `${title} — ler documento completo`, exact: true }).click();
        const documentPage = await opened; await check(documentPage.getByRole("heading", { name: title, exact: true })).toBeVisible(); await documentPage.close();
      }
      await page.getByText("Correção, exclusão e contato", { exact: true }).click();
      await check(page.getByText(/O canal institucional para outros direitos ainda não foi definido/)).toBeVisible();
      await personal.click(); await page.getByLabel("Nome completo", { exact: true }).fill(`${name} Silva`);
      await privacy.click(); await personal.click(); await check(page.getByLabel("Nome completo", { exact: true })).toHaveValue(`${name} Silva`);
      if (role === "athlete") { await page.getByLabel("Iniciais", { exact: true }).fill("MC"); await page.getByLabel("Data de Nascimento").fill("1999-02-28"); }
      await page.getByRole("button", { name: "Salvar alterações", exact: true }).click(); await check(page.getByText("Alterações salvas.", { exact: true })).toBeVisible();
      let me = await request("/auth/me", "GET", undefined, account.token); assert.equal(me.user.name, `${name} Silva`);
      if (role === "athlete") { assert.equal(me.user.birthDate, "1999-02-28"); assert.equal(me.user.photo, "MC"); }
      const updatedEmail = `updated-${randomUUID()}@example.invalid`;
      await page.getByLabel("E-mail", { exact: true }).fill(updatedEmail);
      const emailPassword = page.getByLabel("Senha atual para alterar o e-mail", { exact: true });
      await emailPassword.fill("Senha incorreta"); await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
      await check(page.getByRole("alert")).toContainText("senha atual"); assert.equal((await request("/auth/me", "GET", undefined, account.token)).user.email, email);
      await emailPassword.fill(password); await page.getByRole("button", { name: "Salvar alterações", exact: true }).click();
      await check(page.getByText("Alterações salvas.", { exact: true })).toBeVisible();
      await page.reload(); await check(page.getByLabel("E-mail", { exact: true })).toHaveValue(updatedEmail);
      await privacy.click();
      const downloadEvent = page.waitForEvent("download"); await page.getByRole("button", { name: "Exportar meus dados", exact: true }).click();
      const download = await downloadEvent, data = JSON.parse(await readFile(await download.path(), "utf8"));
      assert.equal(data.user.id, account.user.id); assert.equal(data.user.email, updatedEmail); assert.equal(data.user.passwordHash, undefined); assert.equal(data.legal.history.length, 2);
      await page.locator(".profile-password > summary").click();
      await page.getByLabel("Senha atual", { exact: true }).fill("Senha incorreta"); await page.getByLabel("Nova senha", { exact: true }).fill("ChangedProfile123!");
      await page.getByRole("button", { name: "Alterar senha", exact: true }).click(); await check(page.getByRole("alert")).toContainText("senha atual");
      await page.getByLabel("Senha atual", { exact: true }).fill(password); await page.getByRole("button", { name: "Alterar senha", exact: true }).click();
      await page.waitForURL("**/#/login"); assert.equal(await page.evaluate(() => localStorage.getItem("webkore-auth-token-v1")), null);
      await request("/auth/me", "GET", undefined, account.token, 401);
      const signedIn = await request("/auth/login", "POST", { email: updatedEmail, password: "ChangedProfile123!", role });
      const deletionContext = await browser.newContext();
      try {
        await deletionContext.addInitScript(token => localStorage.setItem("webkore-auth-token-v1", token), signedIn.token);
        const deletePage = await deletionContext.newPage(); await deletePage.goto(`${origin}/#/perfil`);
        await deletePage.getByRole("button", { name: "Excluir conta", exact: true }).click(); const dialog = deletePage.getByRole("dialog"); await check(dialog).toBeVisible();
        await dialog.getByRole("button", { name: "Cancelar", exact: true }).click(); await check(dialog).not.toBeVisible(); await request("/auth/me", "GET", undefined, signedIn.token);
        await deletePage.getByRole("button", { name: "Excluir conta", exact: true }).click(); await dialog.getByRole("button", { name: "Excluir conta", exact: true }).click();
        await deletePage.waitForURL("**/#/login"); await request("/auth/me", "GET", undefined, signedIn.token, 401);
        await request("/auth/login", "POST", { email: updatedEmail, password: "ChangedProfile123!", role }, null, 401);
      } finally { await deletionContext.close(); }
      assert.deepEqual(errors, []);
      console.log(`PASS novo perfil ${role}: duas abas em 4 larguras; edição, senha, exportação, documentos, histórico e exclusão reais`);
    } finally { await context.close(); }
  }
}
