import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { define, expect, obtained, login, session, teamPath, openTraining, selectAthlete, password } from './harness.mjs';
import { criteriaFor, goalkeeperIndicators, aggregateGoalkeeperStats, arithmeticEvaluation, weightedEvaluation } from '../../shared/evaluations.js';
import { initialRatings } from '../../shared/evaluations.js';
import { teamPerformance, positionMeasurements } from '../../src/features/performance/model/teamPerformance.js';

const ratings = (team, role, value) => Object.fromEntries(criteriaFor(team, role, 'QUALITATIVE').map(item => [item.name, value]));
const patchPath = (training, athlete) => `/trainings/${training.id}/athletes/${athlete.user.id}`;
const summary = (page, name) => page.locator('.training-card__summary').filter({ hasText: name });

define('CT-01', async ({ rig }, info) => {
  for (const role of ['coach', 'athlete']) {
    const account = await rig.register(role);
    const user = await rig.prisma.user.findUniqueOrThrow({ where: { id: account.user.id } });
    expect(user.email).toBe(account.email);
    expect(user.role).toBe(role.toUpperCase());
    expect(await bcrypt.compare(password, user.passwordHash)).toBe(true);
    expect(user.passwordHash).not.toBe(password);
    expect(account.user).not.toHaveProperty('passwordHash');
    expect(account.state.users[0]).not.toHaveProperty('passwordHash');
    if (role === 'athlete') expect(user.birthDate.toISOString()).toBe('2000-02-29T00:00:00.000Z');
  }
  obtained(info, 'Treinador e atleta persistidos no MySQL; nascimento, perfis e hash bcrypt conferidos; resposta sem hash.');
});

define('CT-02', async ({ rig, browser }, info) => {
  for (const role of ['coach', 'athlete']) {
    const context = await browser.newContext({ baseURL: process.env.WEBKORE_CT20_ORIGIN });
    try {
      const page = await context.newPage();
      const email = `cadastro-${randomUUID()}@example.invalid`;
      await page.goto('/#/login');
      await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
      await page.getByRole('combobox', { name: 'Perfil', exact: true }).selectOption(role);
      await page.getByLabel('Nome completo', { exact: true }).fill(`Cadastro ${role} CT20`);
      await page.getByLabel('E-mail', { exact: true }).fill(email);
      await page.getByLabel('Senha', { exact: true }).fill(password);
      if (role === 'athlete') await page.getByLabel('Data de Nascimento').fill('2000-02-29');
      for (const [width, height] of [[320,568], [375,667], [430,932], [768,1024], [1024,768], [1366,768], [1920,1080]]) {
        await page.setViewportSize({ width, height });
        const layout = await page.locator('.auth-form--register').evaluate(form => {
          const bounds = form.getBoundingClientRect();
          const account = form.querySelector('.register-account').getBoundingClientRect();
          const confirmations = form.querySelector('.register-confirmations').getBoundingClientRect();
          return {
            stacked: account.bottom <= confirmations.top,
            fits: document.documentElement.scrollWidth <= innerWidth && [...form.querySelectorAll('input,select,button,a')]
              .filter(el => el.getClientRects().length).every(el => {
                const rect = el.getBoundingClientRect();
                return rect.left >= bounds.left && rect.right <= bounds.right + 1;
              }),
            height: document.documentElement.scrollHeight
          };
        });
        expect(layout.stacked && layout.fits, `${role} em ${width}px`).toBe(true);
        if (width >= 1024) expect(layout.height).toBeLessThanOrEqual(height);
        if (role === 'athlete' && [375, 1366].includes(width)) await page.screenshot({ path: info.outputPath(`cadastro-${width}.png`), fullPage: true });
      }
      await page.getByRole('button', { name: 'Privacidade e proteção de dados', exact: true }).click();
      await page.getByRole('checkbox', { name: /Tomei ciência/ }).check();
      await page.getByRole('checkbox', { name: /Aceito os Termos/ }).check();
      await page.getByRole('button', { name: 'Confirmar decisões', exact: true }).click();
      const registered = page.waitForResponse(response => response.url().endsWith('/auth/register') && response.request().method() === 'POST');
      await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
      const response = await registered;
      const payload = await response.json();
      if (payload.user?.id) rig.track(payload.user.id);
      expect(response.status()).toBe(201);
      await expect(page).toHaveURL(new RegExp(`/#/${role}/teams$`));
      await expect(page.getByRole('heading', { name: `Olá, Cadastro ${role} CT20`, exact: true, level: 1 })).toBeVisible();
      const token = await page.evaluate(() => localStorage.getItem('webkore-auth-token-v1'));
      expect(token).toBe(payload.token);
      const me = await rig.req('/auth/me', 'GET', undefined, { token });
      expect(me.user.id).toBe(payload.user.id);
      expect(jwt.verify(token, process.env.JWT_SECRET).role).toBe(role.toUpperCase());
      const returningUser = await browser.newContext({ baseURL: process.env.WEBKORE_CT20_ORIGIN });
      try {
        const loginPage = await returningUser.newPage();
        await login(loginPage, { email, password, user: payload.user });
        await expect(loginPage.getByRole('heading', { name: `Olá, Cadastro ${role} CT20`, exact: true })).toBeVisible();
      } finally { await returningUser.close(); }
    } finally { await context.close(); }
  }
  obtained(info, 'Formulário real cadastrou os dois perfis, persistiu JWT validado pela API e abriu automaticamente a área correta.');
});

define('CT-03', async ({ rig, page }, info) => {
  const account = await rig.register();
  await rig.req('/auth/login', 'POST', { email: account.email, password: 'SenhaIncorreta!', role: 'coach' }, undefined, 401);
  await rig.req('/auth/login', 'POST', { email: account.email, password, role: 'athlete' }, undefined, 401);
  await rig.req('/auth/login', 'POST', { email: 'inexistente@example.invalid', password, role: 'coach' }, undefined, 401);
  await page.goto('/#/login');
  await page.getByLabel('E-mail', { exact: true }).fill(account.email);
  await page.getByLabel('Senha', { exact: true }).fill('SenhaIncorreta!');
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText(/Credenciais/i);
  expect(await page.evaluate(() => localStorage.getItem('webkore-auth-token-v1'))).toBeNull();
  await rig.req('/auth/me', 'GET', undefined, undefined, 401);
  await page.goto('/#/perfil');
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta', exact: true })).toBeVisible();
  obtained(info, 'Senha errada, perfil incorreto e conta inexistente responderam 401; UI exibiu erro, sem token nem acesso protegido.');
});

define('CT-04', async ({ rig, page }, info) => {
  const account = await rig.register();
  await login(page, account);
  await page.goto('/#/perfil');
  await page.reload();
  await expect(page.getByRole('heading', { name: account.user.name, exact: true })).toBeVisible();
  const copiedToken = await page.evaluate(() => localStorage.getItem('webkore-auth-token-v1'));
  await page.locator('.sidebar').getByRole('button', { name: 'Sair', exact: true }).click();
  await expect(page).toHaveURL(/#\/login$/);
  expect(await page.evaluate(() => localStorage.getItem('webkore-auth-token-v1'))).toBeNull();
  await page.goto('/#/perfil');
  await expect(page.getByRole('heading', { name: 'Bem-vindo de volta' })).toBeVisible();
  // Logout revoga a sessão persistida; uma cópia do token também deve falhar.
  await rig.req('/auth/me', 'GET', undefined, { token: copiedToken }, 401);
  const expired = jwt.sign({ id: account.user.id, role: 'COACH' }, process.env.JWT_SECRET, { expiresIn: -1 });
  await rig.req('/auth/me', 'GET', undefined, { token: expired }, 401);
  await rig.req('/auth/me', 'DELETE', undefined, account, 204);
  await rig.req('/auth/me', 'GET', undefined, { token: copiedToken }, 401);
  obtained(info, 'Reload restaurou a sessão; logout limpou o navegador e bloqueou UI. Token copiado foi rejeitado após revogação no servidor; expiração e exclusão da conta foram rejeitadas com 401.');
});

define('CT-05', async ({ rig, browser }, info) => {
  const privateAccount = await rig.register('coach', 'Conta alheia privada CT20');
  for (const role of ['coach', 'athlete']) {
    const account = await rig.register(role);
    const context = await browser.newContext({ baseURL: process.env.WEBKORE_CT20_ORIGIN });
    try {
      const page = await context.newPage();
      await session(page, account, '/perfil');
      await expect(page.getByRole('heading', { name: account.user.name, exact: true })).toBeVisible();
      await expect(page.locator('.nav-item[aria-current="page"]')).toHaveText(role === 'athlete' ? 'Meu perfil' : 'Meu Perfil');
      await expect(page.getByText(privateAccount.email, { exact: true })).toHaveCount(0);
      await expect(page.getByText('Equipe atual', { exact: true })).toHaveCount(0);
      await page.getByLabel('Nome completo', { exact: true }).fill(`Perfil ${role} atualizado CT20`);
      await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click();
      await expect(page.getByRole('status')).toContainText('Alterações salvas.');
      await page.reload();
      await expect(page.getByRole('heading', { name: `Perfil ${role} atualizado CT20`, exact: true })).toBeVisible();
      expect(await rig.prisma.team.count({ where: { coachId: account.user.id } })).toBe(0);
      expect((await rig.prisma.user.findUniqueOrThrow({ where: { id: privateAccount.user.id } })).name).toBe('Conta alheia privada CT20');
    } finally { await context.close(); }
  }
  obtained(info, 'Treinador e atleta sem equipe abriram #/perfil, editaram só a própria conta e mantiveram dados após reload; menu ativo e conta alheia intacta.');
});

define('CT-06', async ({ rig, page }, info) => {
  const account = await rig.register();
  await login(page, account);
  await page.getByRole('button', { name: 'Criar equipe', exact: true }).click();
  const form = page.locator('form.create-team-form');
  await form.getByLabel('Nome da equipe', { exact: true }).fill('Equipe criada na interface CT20');
  await form.getByRole('combobox', { name: 'Modalidade', exact: true }).selectOption('Futsal');
  await form.getByRole('button', { name: 'Criar equipe', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Equipe criada na interface CT20', exact: true })).toBeVisible();
  const teams = await rig.prisma.team.findMany({ where: { coachId: account.user.id } });
  expect(teams).toHaveLength(1);
  expect(teams[0]).toMatchObject({ name: 'Equipe criada na interface CT20', modality: 'Futsal', coachId: account.user.id });
  expect(teams[0].code).toMatch(/^WK-TEAM-/);
  expect((await rig.req('/teams', 'GET', undefined, account))[0].id).toBe(teams[0].id);
  obtained(info, 'Equipe criada pela interface, listada pela API e vinculada ao treinador no MySQL, com código de acesso.');
});

define('CT-07', async ({ rig }, info) => {
  const coach = await rig.register(); const team = await rig.team(coach); const athlete = await rig.register('athlete');
  await rig.req('/teams/join', 'POST', { code: `  ${team.code}  ` }, athlete, 201);
  await rig.req('/teams/join', 'POST', { code: team.code }, athlete, 201);
  const rows = await rig.prisma.membership.findMany({ where: { teamId: team.id, athleteId: athlete.user.id } });
  expect(rows).toHaveLength(1); expect(rows[0].status).toBe('PENDING');
  await rig.req('/teams/join', 'POST', { code: 'WK-TEAM-INEXISTENTE' }, athlete, 404);
  expect(await rig.prisma.membership.count({ where: { athleteId: athlete.user.id } })).toBe(1);
  obtained(info, 'Código válido com espaços criou um vínculo PENDING; repetição não duplicou; código inexistente retornou 404.');
});

define('CT-08', async ({ rig }, info) => {
  const coach = await rig.register(); const team = await rig.team(coach);
  const approved = await rig.register('athlete', 'Aprovado CT20'); const rejected = await rig.register('athlete', 'Rejeitado CT20');
  await rig.join(coach, team, approved); await rig.join(coach, team, rejected, 'rejected');
  const links = await rig.prisma.membership.findMany({ where: { teamId: team.id } });
  expect(links.find(item => item.athleteId === approved.user.id).status).toBe('APPROVED');
  expect(links.find(item => item.athleteId === rejected.user.id).status).toBe('REJECTED');
  await rig.req(`/trainings/team/${team.id}`, 'GET', undefined, approved);
  await rig.req(`/trainings/team/${team.id}`, 'GET', undefined, rejected, 404);
  expect((await rig.req('/auth/me', 'GET', undefined, approved)).state.memberships[0].status).toBe('approved');
  expect((await rig.req('/auth/me', 'GET', undefined, rejected)).state.trainings).toEqual([]);
  obtained(info, 'APPROVED e REJECTED persistidos; somente vínculo aprovado autorizado a consultar treinos.');
});

define('CT-09', async ({ rig }, info) => {
  const fixture = await rig.setup(1); const training = await rig.training(fixture);
  const outsider = await rig.register(); await rig.team(outsider, 'Equipe de outro treinador');
  const before = await rig.prisma.team.findUniqueOrThrow({ where: { id: fixture.team.id } });
  await rig.req(`/teams/${fixture.team.id}`, 'PATCH', { name: 'Ataque CT20' }, outsider, 404);
  await rig.req(`/teams/${fixture.team.id}`, 'DELETE', undefined, outsider, 404);
  await rig.req(`/trainings/team/${fixture.team.id}`, 'GET', undefined, outsider, 404);
  await rig.req(patchPath(training, fixture.athletes[0]), 'PATCH', { present: false }, outsider, 404);
  await rig.req(`/trainings/${training.id}`, 'DELETE', undefined, outsider, 404);
  expect((await rig.req('/auth/me', 'GET', undefined, outsider)).state.teams.some(item => item.id === fixture.team.id)).toBe(false);
  expect(await rig.prisma.team.findUniqueOrThrow({ where: { id: fixture.team.id } })).toEqual(before);
  expect((await rig.prisma.trainingRecord.findFirstOrThrow({ where: { trainingId: training.id } })).present).toBe(true);
  obtained(info, 'Leitura, edição, avaliação e exclusões cruzadas retornaram 404; equipe e presença alheias permaneceram intactas.');
});

define('CT-10', async ({ rig }, info) => {
  const fixture = await rig.setup(1); const athlete = fixture.athletes[0];
  const training = await rig.training(fixture);
  await rig.req(patchPath(training, athlete), 'PATCH', { ratings: ratings(fixture.team, 'OUTFIELD', 8) }, fixture.coach);
  const before = await rig.prisma.trainingRecord.findFirstOrThrow({ where: { trainingId: training.id }, include: { evaluation: true } });
  await rig.req(`/teams/${fixture.team.id}/athletes/${athlete.user.id}`, 'DELETE', undefined, athlete, 204);
  expect(await rig.prisma.membership.count({ where: { teamId: fixture.team.id, athleteId: athlete.user.id } })).toBe(0);
  expect(await rig.prisma.trainingRecord.findUniqueOrThrow({ where: { id: before.id }, include: { evaluation: true } })).toEqual(before);
  await rig.req(`/trainings/team/${fixture.team.id}`, 'GET', undefined, athlete, 404);
  expect((await rig.req('/auth/me', 'GET', undefined, athlete)).state.trainings).toEqual([]);
  obtained(info, 'Vínculo excluído; presença e avaliação histórica idênticas no banco; acesso do atleta aos treinos revogado.');
});

define('CT-11', async ({ rig }, info) => {
  const fixture = await rig.setup(); const training = await rig.training(fixture);
  const row = await rig.prisma.training.findUniqueOrThrow({ where: { id: training.id }, include: { records: true } });
  expect(row.teamId).toBe(fixture.team.id); expect(row.type).toBe('MIXED');
  expect(row.date.toISOString()).toBe('2026-11-18T00:00:00.000Z');
  expect(row.records.map(item => item.athleteId).sort()).toEqual(fixture.athletes.map(item => item.user.id).sort());
  const foreign = await rig.register('athlete');
  await rig.req('/trainings', 'POST', { teamId: fixture.team.id, date: '2026-11-18', type: 'Misto', records: [{ athleteId: foreign.user.id }] }, fixture.coach, 404);
  await rig.req('/trainings', 'POST', { teamId: fixture.team.id, date: '2026-02-30', type: 'Misto' }, fixture.coach, 400);
  await rig.req('/trainings', 'POST', { teamId: fixture.team.id, date: '2026-11-18', type: 'inválido' }, fixture.coach, 400);
  expect(await rig.prisma.training.count({ where: { teamId: fixture.team.id } })).toBe(1);
  obtained(info, 'Treino e três registros associados corretamente; atleta externo, data inexistente e tipo inválido rejeitados sem criação parcial.');
});

define('CT-12', async ({ rig }, info) => {
  const fixture = await rig.setup(1); const athlete = fixture.athletes[0]; const training = await rig.training(fixture);
  await rig.req(patchPath(training, athlete), 'PATCH', { ratings: ratings(fixture.team, 'OUTFIELD', 7) }, fixture.coach);
  const before = await rig.prisma.evaluation.findFirstOrThrow({ where: { record: { trainingId: training.id } }, include: { criteria: { orderBy: { order: 'asc' } } } });
  let saved = await rig.req(patchPath(training, athlete), 'PATCH', { present: false }, fixture.coach);
  expect(saved.athletes[athlete.user.id].present).toBe(false);
  await rig.req(patchPath(training, athlete), 'PATCH', { ratings: ratings(fixture.team, 'OUTFIELD', 9) }, fixture.coach, 400);
  expect(await rig.prisma.evaluation.findUniqueOrThrow({ where: { id: before.id }, include: { criteria: { orderBy: { order: 'asc' } } } })).toEqual(before);
  saved = await rig.req(patchPath(training, athlete), 'PATCH', { present: true }, fixture.coach);
  expect(saved.athletes[athlete.user.id].present).toBe(true);
  await rig.req(patchPath(training, athlete), 'PATCH', { present: 'false' }, fixture.coach, 400);
  expect((await rig.prisma.trainingRecord.findFirstOrThrow({ where: { trainingId: training.id } })).present).toBe(true);
  obtained(info, 'Presença e ausência persistidas; nota histórica preservada; novas notas de ausente e presença não booleana rejeitadas.');
});

define('CT-13', async ({ rig, page }, info) => {
  const fixture = await rig.setup(2); const training = await rig.training(fixture);
  await openTraining(page, fixture, training);
  for (const athlete of fixture.athletes) {
    await selectAthlete(page, athlete.user.name);
    const fields = page.locator('.review-ratings input');
    await expect(fields).toHaveCount(4);
    for (const field of await fields.all()) await expect(field).toHaveValue('5');
    await expect(page.getByRole('button', { name: 'Salvar avaliação', exact: true })).toBeEnabled();
  }
  const review = page.locator('.review-individual');
  await review.locator('summary').filter({ hasText: 'Estatísticas do goleiro' }).click();
  for (const width of [320, 375, 430, 768, 1024, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => review.evaluate(root => {
      return document.documentElement.scrollWidth <= innerWidth && [...root.querySelectorAll('button,input,select,label,h4,summary,.review-number')]
        .filter(el => el.getClientRects().length).every(el => {
          const rect = el.getBoundingClientRect();
          return rect.left >= 0 && rect.right <= innerWidth + 1;
        });
    }), { message: `Layout em ${width}px` }).toBe(true);
    const targetsFit = await review.locator('.review-stepper button:visible').evaluateAll(buttons => buttons.every(button => {
      const box = button.getBoundingClientRect();
      return box.width >= 44 && box.height >= 44;
    }));
    expect(targetsFit).toBe(true);
    await review.screenshot({ path: info.outputPath(`avaliacao-${width}.png`) });
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.evaluate(() => { document.documentElement.style.zoom = '2'; });
  expect(await review.evaluate(el => el.getBoundingClientRect().right <= innerWidth && el.scrollWidth <= el.clientWidth + 1)).toBe(true);
  await review.locator('.review-number label').first().evaluate(el => { el.textContent = 'Critério'.repeat(27); });
  expect(await review.evaluate(root => root.scrollWidth <= root.clientWidth + 1)).toBe(true);
  const count = review.getByLabel('Quantidade: Defesas', { exact: true });
  await expect(count).toHaveValue('');
  await review.getByRole('button', { name: 'Aumentar Quantidade: Defesas', exact: true }).click();
  await expect(count).toHaveValue('1');
  await review.getByRole('button', { name: 'Diminuir Quantidade: Defesas', exact: true }).click();
  await expect(count).toHaveValue('0');
  await count.fill('-1');
  expect(await count.evaluate(el => el.validity.rangeUnderflow)).toBe(true);
  await count.fill('');
  const reflex = review.getByLabel('Nota: Reflexos', { exact: true });
  await reflex.fill('8.2');
  await review.getByRole('button', { name: 'Aumentar Nota: Reflexos', exact: true }).click();
  await expect(reflex).toHaveValue('8.3');
  await review.getByRole('button', { name: 'Diminuir Nota: Reflexos', exact: true }).click();
  await expect(review.locator('.review-score')).toContainText('5,8/10');
  await selectAthlete(page, fixture.athletes[0].user.name);
  await selectAthlete(page, fixture.athletes[1].user.name);
  await expect(reflex).toHaveValue('8.2');
  await page.evaluate(() => { document.documentElement.style.zoom = ''; });
  const plus = review.getByRole('button', { name: 'Aumentar Nota: Reflexos', exact: true });
  const minus = review.getByRole('button', { name: 'Diminuir Nota: Reflexos', exact: true });
  await plus.press('Space');
  await expect(reflex).toHaveValue('8.3');
  await minus.press('Enter');
  await expect(reflex).toHaveValue('8.2');
  await plus.hover();
  await page.mouse.down();
  await expect.poll(async () => Number(await reflex.inputValue())).toBeGreaterThanOrEqual(8.5);
  await page.mouse.up();
  async function expectStopped(field) {
    const stopped = await field.inputValue();
    await page.waitForTimeout(250);
    await expect(field).toHaveValue(stopped);
  }
  await expectStopped(reflex);
  await minus.hover();
  await page.mouse.down();
  await page.mouse.move(0, 0);
  await page.waitForTimeout(450);
  await expectStopped(reflex);
  await page.mouse.up();
  await plus.hover();
  await page.mouse.down();
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const beforeBlur = await reflex.inputValue();
  await page.waitForTimeout(550);
  await expect(reflex).toHaveValue(beforeBlur);
  await page.mouse.up();
  await reflex.fill('9.9');
  await plus.click();
  await expect(reflex).toHaveValue('10');
  await expect(plus).toBeDisabled();
  await reflex.fill('0.1');
  await minus.click();
  await expect(reflex).toHaveValue('0');
  await expect(minus).toBeDisabled();

  await page.setViewportSize({ width: 375, height: 850 });
  const touch = await page.context().newCDPSession(page);
  try {
    await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    const countPlus = review.getByRole('button', { name: 'Aumentar Quantidade: Defesas', exact: true });
    await countPlus.scrollIntoViewIfNeeded();
    const box = await countPlus.boundingBox();
    const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    const touchEvent = (type, touchPoints) => touch.send('Input.dispatchTouchEvent', { type, touchPoints });
    await touchEvent('touchStart', [point]);
    await expect.poll(async () => Number(await count.inputValue())).toBeGreaterThanOrEqual(3);
    await touchEvent('touchEnd', []);
    await expectStopped(count);
    expect(Number.isInteger(Number(await count.inputValue()))).toBe(true);
    await touchEvent('touchStart', [point]);
    await touchEvent('touchCancel', []);
    const cancelled = await count.inputValue();
    await page.waitForTimeout(500);
    await expect(count).toHaveValue(cancelled);
  } finally { await touch.detach(); }

  expect(await rig.prisma.evaluation.count({ where: { record: { trainingId: training.id } } })).toBe(0);
  expect(initialRatings([{ name: 'Técnica' }], { Técnica: 0 })).toEqual({ Técnica: 0 });
  obtained(info, 'Linha e goleiro exibiram quatro notas 5 como rascunho; navegar preservou o banco sem avaliação; zero salvo não foi substituído.');
});

define('CT-14', async ({ rig, page }, info) => {
  const fixture = await rig.setup(); const training = await rig.training(fixture);
  await openTraining(page, fixture, training);
  for (const [index, score, metric, quantity] of [[0, '8', 'Gols', '3'], [1, '6', 'Defesas', '2']]) {
    await selectAthlete(page, fixture.athletes[index].user.name);
    await page.getByRole('spinbutton', { name: 'Nota: Posicionamento', exact: true }).fill(score);
    await page.getByRole('spinbutton', { name: `Quantidade: ${metric}`, exact: true }).fill(quantity);
    const selector = page.getByLabel('Selecionar atleta');
    const nextId = await selector.evaluate(el => el.options[el.selectedIndex + 1]?.value);
    const save = page.getByRole('button', { name: nextId ? 'Salvar e próximo atleta' : 'Salvar avaliação', exact: true });
    if (index === 0) {
      await page.route('**/api/trainings/*/athletes/*', route => route.fulfill({ status: 503, json: { message: 'Tente novamente.' } }), { times: 1 });
      await save.click();
      await expect(page.locator('.review-individual').getByRole('alert')).toContainText('mantidas');
      await expect(selector).toHaveValue(fixture.athletes[index].user.id);
      await expect(page.getByLabel('Nota: Posicionamento', { exact: true })).toHaveValue(score);
    }
    await save.click();
    await expect(page.locator('.review-individual').getByRole('status')).toContainText('salvo.');
    if (nextId) await expect(selector).toHaveValue(nextId);
    await expect(page.getByRole('progressbar', { name: 'Atletas avaliados' })).toHaveAttribute('value', String(index + 1));
  }
  await selectAthlete(page, fixture.athletes[2].user.name);
  await page.getByRole('checkbox', { name: 'Participou do treino', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Salvar avaliação', exact: true }).click();
  await expect(page.locator('.review-individual').getByRole('status')).toContainText('salvo.');
  const rows = await rig.prisma.trainingRecord.findMany({ where: { trainingId: training.id }, include: { evaluation: { include: { criteria: true } }, measurements: true } });
  for (const [index, score, mean, metric, quantity] of [[0, 8, 5.75, 'Gols', 3], [1, 6, 5.25, 'Defesas', 2]]) {
    const row = rows.find(item => item.athleteId === fixture.athletes[index].user.id);
    expect(row.evaluation.finalScore).toBe(mean);
    expect(row.evaluation.criteria.find(item => item.name === 'Posicionamento').score).toBe(score);
    expect(row.measurements.find(item => item.name === metric).value).toBe(quantity);
  }
  const absent = rows.find(item => item.athleteId === fixture.athletes[2].user.id);
  expect(absent.present).toBe(false); expect(absent.evaluation).toBeNull();
  await page.reload();
  await expect(page.getByRole('spinbutton', { name: 'Nota: Posicionamento', exact: true })).toHaveValue('8');
  await expect(page.getByRole('spinbutton', { name: 'Quantidade: Gols', exact: true })).toHaveValue('3');
  await selectAthlete(page, fixture.athletes[1].user.name);
  await expect(page.getByRole('spinbutton', { name: 'Nota: Posicionamento', exact: true })).toHaveValue('6');
  await expect(page.getByRole('spinbutton', { name: 'Quantidade: Defesas', exact: true })).toHaveValue('2');
  obtained(info, 'Salvamento real persistiu dois atletas (médias 5,75 e 5,25), Gols=3, Defesas=2 e terceiro ausente sem avaliação; reload recuperou os valores.');
});

define('CT-15', async ({ rig, page }, info) => {
  const fixture = await rig.setup(1); await rig.training(fixture, 'Treino CT20 A'); await rig.training(fixture, 'Treino CT20 B', undefined, '2026-11-17');
  await session(page, fixture.coach, teamPath(fixture.team, '/trainings'));
  await summary(page, 'Treino CT20 A').click();
  await expect(summary(page, 'Treino CT20 A')).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('spinbutton', { name: 'Nota: Posicionamento', exact: true }).fill('8');
  await page.getByRole('heading', { name: '3. Avaliação individual', exact: true }).click();
  await expect(summary(page, 'Treino CT20 A')).toHaveAttribute('aria-expanded', 'true');
  await summary(page, 'Treino CT20 A').click();
  await expect(summary(page, 'Treino CT20 A')).toHaveAttribute('aria-expanded', 'false');
  await summary(page, 'Treino CT20 A').click();
  await expect(page.getByRole('spinbutton', { name: 'Nota: Posicionamento', exact: true })).toHaveValue('8');
  await page.getByRole('button', { name: 'Recolher treino', exact: true }).click();
  await summary(page, 'Treino CT20 B').click();
  await page.getByRole('button', { name: 'Recolher treino', exact: true }).click();
  await page.goBack();
  await expect(summary(page, 'Treino CT20 B')).toHaveAttribute('aria-expanded', 'true');
  await page.goForward();
  await expect(summary(page, 'Treino CT20 B')).toHaveAttribute('aria-expanded', 'false');
  await page.setViewportSize({ width: 390, height: 844 });
  await summary(page, 'Treino CT20 A').click();
  await page.getByRole('button', { name: 'Recolher treino', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/trainings$`));
  expect(await rig.prisma.evaluation.count({ where: { record: { training: { teamId: fixture.team.id } } } })).toBe(0);
  obtained(info, 'Dois treinos abriram/recolheram, campos não fecharam painel, rascunho 8 foi preservado sem gravação e Voltar/Avançar/mobile mantiveram URLs válidas.');
});

define('CT-16', async ({ rig, page }, info) => {
  const fixture = await rig.setup(2);
  const profiles = fixture.team.evaluationProfiles.map(profile => ({ ...profile, criteria: profile.criteria.map(item => ({ ...item, name: `${profile.role === 'OUTFIELD' ? 'Linha' : 'Goleiro'} CT20 ${item.name}` })) }));
  fixture.team = await rig.req(`/teams/${fixture.team.id}`, 'PATCH', { evaluationProfiles: profiles }, fixture.coach);
  const training = await rig.training(fixture);
  await openTraining(page, fixture, training);
  for (const [index, own, forbidden] of [[0, 'Linha', 'Goleiro'], [1, 'Goleiro', 'Linha']]) {
    await selectAthlete(page, fixture.athletes[index].user.name);
    await expect(page.getByRole('spinbutton', { name: new RegExp(`^Nota: ${own} CT20`) })).toHaveCount(4);
    await expect(page.getByRole('spinbutton', { name: new RegExp(`^Quantidade: ${own} CT20`) })).toHaveCount(4);
    await expect(page.getByRole('spinbutton', { name: new RegExp(`^Nota: ${forbidden} CT20`) })).toHaveCount(0);
  }
  const alienCriterion = criteriaFor(fixture.team, 'GOALKEEPER', 'QUALITATIVE')[0].name;
  await rig.req(patchPath(training, fixture.athletes[0]), 'PATCH', { ratings: { [alienCriterion]: 8 } }, fixture.coach, 400);
  expect(await rig.prisma.evaluation.count({ where: { record: { trainingId: training.id } } })).toBe(0);
  obtained(info, 'Critérios qualitativos e quantitativos personalizados de Linha/Goleiro ficaram separados; critério cruzado rejeitado com 400 e sem gravação.');
});

define('CT-17', async ({ rig }, info) => {
  expect(goalkeeperIndicators({})).toEqual({ defensiveEfficiency: null, distributionAccuracy: null, exitEfficiency: null });
  expect(goalkeeperIndicators({ saves: 0, goalsConceded: 0 }).defensiveEfficiency).toBeNull();
  expect(goalkeeperIndicators({ accurateDistributions: 0, distributionAttempts: 10 }).distributionAccuracy).toBe(0);
  const aggregate = aggregateGoalkeeperStats([
    { role: 'GOALKEEPER', present: true, goalkeeperStats: { saves: 8, goalsConceded: 2 } },
    { role: 'GOALKEEPER', present: true, goalkeeperStats: { saves: 100 } },
    { role: 'GOALKEEPER', present: false, goalkeeperStats: { saves: 0, goalsConceded: 90 } }
  ]);
  expect(aggregate.defensiveEfficiency).toBe(80);
  const fixture = await rig.setup(2); const training = await rig.training(fixture); const keeper = fixture.athletes[1];
  let saved = await rig.req(patchPath(training, keeper), 'PATCH', { goalkeeperStats: { saves: 0 } }, fixture.coach);
  expect(saved.athletes[keeper.user.id].goalkeeperStats.saves).toBe(0);
  expect(saved.athletes[keeper.user.id].goalkeeperIndicators.defensiveEfficiency).toBeNull();
  saved = await rig.req(patchPath(training, keeper), 'PATCH', { goalkeeperStats: { saves: 8, goalsConceded: 2, distributionAttempts: 10, accurateDistributions: 5 } }, fixture.coach);
  expect(saved.athletes[keeper.user.id].goalkeeperIndicators).toMatchObject({ defensiveEfficiency: 80, distributionAccuracy: 50, exitEfficiency: null });
  saved = await rig.req(patchPath(training, keeper), 'PATCH', { goalkeeperStats: { saves: null } }, fixture.coach);
  expect(saved.athletes[keeper.user.id].goalkeeperStats.saves).toBeNull();
  expect(saved.athletes[keeper.user.id].goalkeeperStats.goalsConceded).toBe(2);
  expect(saved.athletes[keeper.user.id].goalkeeperIndicators.defensiveEfficiency).toBeNull();
  obtained(info, 'Campos ausentes/null e denominador zero mantiveram null; zero observado permaneceu zero; percentuais válidos foram 80% e 50%, com PATCH parcial preservando outros campos.');
});

define('CT-18', async ({ rig, page }, info) => {
  const fixture = await rig.setup();
  const goalId = criteriaFor(fixture.team, 'OUTFIELD', 'QUANTITATIVE').find(item => item.name === 'Gols').id;
  const first = await rig.training(fixture, 'Médias A', [
    { athleteId: fixture.athletes[0].user.id, present: true, ratings: ratings(fixture.team, 'OUTFIELD', 6), measurements: { [goalId]: 2 } },
    { athleteId: fixture.athletes[1].user.id, present: true, ratings: ratings(fixture.team, 'GOALKEEPER', 8) },
    { athleteId: fixture.athletes[2].user.id, present: false }
  ], '2026-11-17');
  const second = await rig.training(fixture, 'Médias B', [
    { athleteId: fixture.athletes[0].user.id, present: true, ratings: ratings(fixture.team, 'OUTFIELD', 10), measurements: { [goalId]: 3 } },
    ...fixture.athletes.slice(1).map(item => ({ athleteId: item.user.id, present: false }))
  ]);
  const performance = teamPerformance([first, second], fixture.team.id);
  expect(performance.averageScore).toBe(8); expect(performance.presenceAverage).toBe(50);
  expect(performance.evaluationCount).toBe(3);
  const records = [first, second].flatMap(training => Object.values(training.athletes).map(record => ({ ...record, trainingId: training.id })));
  expect(positionMeasurements(records, 'OUTFIELD').find(item => item.id === goalId).value).toBe(5);
  const criteria = [{ name: 'A', weight: 80 }, { name: 'B', weight: 20 }];
  expect(weightedEvaluation(criteria, { A: 10, B: 0 }).finalScore).toBe(8);
  expect(arithmeticEvaluation(criteria, { A: 10, B: 0 }).finalScore).toBe(5);
  await session(page, fixture.coach, teamPath(fixture.team));
  await expect(page.locator('.team-home__kpis .kpi-card').filter({ has: page.getByText('Desempenho médio', { exact: true }) })).toContainText('8,0/10');
  await expect(page.locator('.team-home__kpis .kpi-card').filter({ has: page.getByText('Presença média', { exact: true }) })).toContainText('50%');
  obtained(info, 'Dados reais produziram média coletiva 8, três avaliações, presença 50% e Gols=5; interface exibiu 8,0/10 e 50%; fórmula ponderada histórica conferida.');
});

define('CT-19', async ({ rig, page }, info) => {
  const fixture = await rig.setup(2); const training = await rig.training(fixture); const athlete = fixture.athletes[0];
  for (const path of ['/auth/me', '/teams', `/trainings/team/${fixture.team.id}`]) await rig.req(path, 'GET', undefined, undefined, 401);
  await rig.req('/auth/me', 'GET', undefined, { token: 'token-adulterado' }, 401);
  await rig.req('/auth/me', 'PATCH', { role: 'coach' }, athlete, 403);
  await rig.req('/auth/me', 'PATCH', { id: fixture.coach.user.id }, athlete, 403);
  await rig.req(`/teams/${fixture.team.id}`, 'DELETE', undefined, athlete, 403);
  await rig.req(patchPath(training, fixture.athletes[1]), 'PATCH', { present: false }, athlete, 403);
  await rig.req('/teams/id%27OR%271', 'PATCH', { name: 'Manipulação' }, fixture.coach, 400);
  await rig.req(`/trainings/${randomUUID()}/athletes/${athlete.user.id}`, 'PATCH', { present: false }, fixture.coach, 404);
  const pending = await rig.register('athlete');
  await rig.req('/teams/join', 'POST', { code: fixture.team.code }, pending, 201);
  await rig.req(`/trainings/team/${fixture.team.id}`, 'GET', undefined, pending, 404);
  const me = await rig.req('/auth/me', 'GET', undefined, athlete);
  expect(me.state.users.find(item => item.id === fixture.coach.user.id)).not.toHaveProperty('email');
  expect(me.state.users.some(item => item.id === fixture.athletes[1].user.id)).toBe(false);
  await session(page, athlete, teamPath(fixture.team));
  await expect(page.getByText('Esta página não está disponível para seu perfil.', { exact: true })).toBeVisible();
  expect((await rig.prisma.user.findUniqueOrThrow({ where: { id: athlete.user.id } })).role).toBe('ATHLETE');
  expect(await rig.prisma.trainingRecord.count({ where: { trainingId: training.id, present: false } })).toBe(0);
  obtained(info, 'Acesso anônimo/adulterado, escalada de perfil, IDs manipulados e recursos sem vínculo foram bloqueados; API não expôs e-mails alheios e UI negou rota administrativa.');
});

define('CT-20', async ({ rig, page }, info) => {
  const fixture = await rig.setup(2); const training = await rig.training(fixture);
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  async function layout() {
    const measured = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth, width: document.documentElement.scrollWidth,
      clipped: [...document.querySelectorAll('.kpi-card p,.kpi-card strong,.kpi-card span,.athlete-performance__value')]
        .filter(el => el.getClientRects().length && el.scrollWidth > el.clientWidth + 1).map(el => el.textContent),
      smallTargets: [...document.querySelectorAll('.nav-item,.mobile-app-icon,.team-card__actions .button')]
        .filter(el => el.getClientRects().length && el.getBoundingClientRect().height < 44).map(el => el.textContent)
    }));
    expect(measured.width).toBeLessThanOrEqual(measured.viewport + 1);
    expect(measured.clipped).toEqual([]); expect(measured.smallTargets).toEqual([]);
  }
  await session(page, fixture.coach, teamPath(fixture.team));
  for (const width of [360, 768, 1366, 1920]) {
    await page.setViewportSize({ width, height: width < 700 ? 800 : 1024 });
    await page.goto(`/#${teamPath(fixture.team)}`);
    await expect(page.getByRole('heading', { name: 'Evolução média da equipe', exact: true })).toBeVisible();
    await layout();
    if (width < 1060) {
      await page.getByRole('button', { name: 'Abrir menu', exact: true }).click();
      await page.getByRole('dialog', { name: 'Menu', exact: true }).getByRole('button', { name: 'Meu Perfil', exact: true }).click();
    } else await page.locator('.sidebar').getByRole('button', { name: 'Meu Perfil', exact: true }).click();
    await expect(page).toHaveURL(/#\/perfil$/);
    await expect(page.locator('.nav-item[aria-current="page"]')).toHaveText('Meu Perfil');
    await page.reload();
    await expect(page.getByRole('heading', { name: fixture.coach.user.name, exact: true })).toBeVisible();
    await layout();
    await page.locator('.topbar__actions').getByRole('button', { name: 'Equipes', exact: true }).click();
    await page.getByRole('button', { name: 'Gerenciar', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`${fixture.team.id}$`));
    await page.goto(`/#${teamPath(fixture.team, `/trainings/${training.id}`)}`);
    await expect(page.getByRole('button', { name: 'Recolher treino', exact: true })).toBeVisible();
    await layout();
  }
  await session(page, fixture.athletes[0], `/athlete/teams/${fixture.team.id}`);
  for (const width of [360, 768, 1366, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('heading', { name: 'Evolução da média geral', exact: true })).toBeVisible();
    await layout();
  }
  expect(errors).toEqual([]);
  await page.getByRole('button', { name: 'Consultar metas' }).click();
  await page.getByRole('button', { name: 'Criar meta', exact: true }).click();
  await page.getByLabel('Valor-alvo').fill('7.5');
  await page.getByRole('button', { name: 'Salvar meta' }).click();
  await expect(page.getByText('Sem dados · 0 registros')).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByLabel('Valor-alvo').fill('8');
  await page.getByRole('button', { name: 'Salvar meta' }).click();
  await expect(page.getByText(/Alvo a partir de 8 pts/)).toBeVisible();
  await page.getByRole('button', { name: 'Arquivar', exact: true }).click();
  await page.getByText('Arquivadas (1)').click();
  await expect(page.getByText(/Alvo a partir de 8 pts/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0);
  obtained(info, 'Navegação real e reload conferidos em mobile/tablet/desktop (360, 768, 1366 e 1920 px), nos dois perfis; sem erros JavaScript, overflow, cards cortados ou alvos de menu abaixo de 44 px.');
});
