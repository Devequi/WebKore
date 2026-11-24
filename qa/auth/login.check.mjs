import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";

const server = await createServer({ server: { host: "127.0.0.1", port: 0 } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch(process.platform === "win32" ? { channel: "msedge" } : {});
  const page = await browser.newPage();
  await page.goto(server.resolvedUrls.local[0] + "#/login");
  const form = page.getByRole("form", { name: "Bem-vindo de volta" });
  await expect(form).toBeVisible();
  await mkdir("test-results/login", { recursive: true });
  for (const [width, height] of [[320,568], [375,667], [430,932], [768,1024], [1024,768], [1366,768], [1920,1080]]) {
    await page.setViewportSize({ width, height });
    const layout = await form.evaluate(el => {
      const box = el.getBoundingClientRect();
      const controls = [...el.querySelectorAll("input,select,button")];
      return {
        cardWidth: box.width,
        titleSize: parseFloat(getComputedStyle(el.querySelector("h2")).fontSize),
        controlHeights: controls.map(control => control.getBoundingClientRect().height),
        overflow: document.documentElement.scrollWidth > innerWidth,
        height: document.documentElement.scrollHeight,
        centerY: (box.top + box.bottom) / 2,
        controlsFit: controls.every(control => {
          const r = control.getBoundingClientRect();
          return r.width >= 44 && r.height >= 44 && r.left >= box.left && r.right <= box.right;
        })
      };
    });
    assert.ok(!layout.overflow && layout.controlsFit, JSON.stringify({ width, layout }));
    assert.equal(layout.titleSize, 24);
    assert.ok(layout.controlHeights.every(h => h >= 42 && h <= 44), JSON.stringify(layout));
    if (width >= 901) {
      assert.ok(Math.abs(layout.cardWidth - 400) < 1, JSON.stringify(layout));
      assert.ok(layout.height <= height, `Rolagem vertical em ${width}×${height}`);
      assert.ok(Math.abs(layout.centerY - height / 2) < 40, "Centralização vertical do formulário");
    }
    await expect(page.locator(".login-mark")).toBeVisible();
    await page.screenshot({ path: `test-results/login/login-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 375, height: 340 });
  const password = form.getByLabel("Senha", { exact: true });
  await password.fill("exemplo");
  await form.getByRole("button", { name: "Mostrar senha" }).click();
  await expect(password).toHaveAttribute("type", "text");
  await form.getByRole("button", { name: "Ocultar senha" }).click();
  await expect(password).toHaveAttribute("type", "password");
  await form.getByLabel("Tipo de conta").selectOption("athlete");
  await form.getByRole("button", { name: "Entrar", exact: true }).click();
  assert.equal(await form.getByLabel("E-mail").evaluate(el => el.validity.valueMissing), true);
  await form.getByRole("button", { name: "Criar conta" }).click();
  await page.getByRole("button", { name: "Voltar ao login" }).click();
  await expect(form.getByLabel("Tipo de conta")).toHaveValue("athlete");
  console.log("Login aprovado nas sete resoluções e com a altura reduzida para 340px.");
} finally {
  await browser?.close();
  await server.close();
}
