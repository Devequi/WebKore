import { test, expect, session } from './harness.mjs';

test('SEC UI — troca de senha exige senha atual e conduz a novo login', async ({ rig, page }) => {
  const account = await rig.register();
  await session(page, account, '/perfil');
  await page.getByRole('tab', { name: 'Privacidade e segurança', exact: true }).click();
  await page.locator('.profile-password > summary').click();
  await page.getByLabel('Nova senha', { exact: true }).fill('NovaFicticia!2026');
  await page.getByLabel('Senha atual', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Alterar senha', exact: true }).click();
  await expect(page).toHaveURL(/#\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('webkore-auth-token-v1'))).toBeNull();
  await rig.req('/auth/me', 'GET', undefined, account, 401);
  const next = await rig.req('/auth/login', 'POST', { email: account.email, password: 'NovaFicticia!2026', role: 'coach' });
  await session(page, next, '/perfil');
  await page.reload();
  await expect(page.getByRole('heading', { name: account.user.name, exact: true })).toBeVisible();
});

test('SEC UI — falha de rede no logout permite tentar novamente sem fingir revogação', async ({ rig, page }) => {
  const account = await rig.register();
  await session(page, account, '/perfil');
  await page.route('**/api/auth/logout', route => route.abort());
  await page.locator('.sidebar').getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page.getByText('Não foi possível encerrar a sessão no servidor. Tente sair novamente.')).toBeVisible();
  await expect(page).toHaveURL(/#\/perfil$/);
  expect(await page.evaluate(() => localStorage.getItem('webkore-auth-token-v1'))).toBe(account.token);
  await rig.req('/auth/me', 'GET', undefined, account);
  await page.unroute('**/api/auth/logout');
  await page.locator('.sidebar').getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL(/#\/login$/);
  await rig.req('/auth/me', 'GET', undefined, account, 401);
});

test('SEC UI — conteúdo HTML no perfil é exibido como texto após persistência', async ({ rig, page }) => {
  const account = await rig.register();
  const name = '<img src=x onerror=alert(1)>';
  let dialog = false;
  page.on('dialog', async event => { dialog = true; await event.dismiss(); });
  await rig.req('/auth/me', 'PATCH', { name }, account);
  await session(page, account, '/perfil');
  await page.reload();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.locator('img[onerror]')).toHaveCount(0);
  expect(dialog).toBe(false);
});
