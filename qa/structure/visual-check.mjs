// Deterministic screenshots of the real app. HTTP responses below are QA fixtures only.
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { createServer, preview } from 'vite';
import { chromium } from '@playwright/test';
import { criteriaFor } from '../../shared/evaluations.js';
import { initialLegalDocuments } from '../../shared/legalDocuments.js';

const phase = process.argv[2] || 'before';
const cssSuite = process.argv.includes('--css');
const resume = process.argv.includes('--resume');
const refresh = process.argv.includes('--refresh');
const details = process.argv.includes('--details');
const allowDifferences = process.argv.includes('--allow-differences');
const widthsArgument = process.argv.find(arg => arg.startsWith('--widths='))?.slice(9);
const widths = widthsArgument ? widthsArgument.split(',').map(Number) : cssSuite ? [390, 768, 1440, 1920] : [390, 1440];
assert.ok(widths.every(width => Number.isInteger(width) && width >= 320), 'Larguras inválidas.');
const output = process.argv.find(arg => arg.startsWith('--output='))?.slice(9) || (cssSuite ? 'tmp/css-visual' : 'tmp/structure-visual');
const only = process.argv.find(arg => arg.startsWith('--only='))?.slice(7);
const dist = process.argv.find(arg => arg.startsWith('--dist='))?.slice(7) || 'dist';
const appRoot = path.resolve(process.argv.find(arg => arg.startsWith('--root='))?.slice(7) || '.');
if (!['before', 'after'].includes(phase)) throw new Error('Use before ou after.');
const team = { id: 'qa-team', name: 'Equipe WebKore', modality: 'Futsal', coachId: 'qa-coach', code: 'QA-VISUAL' };
const coach = { id: 'qa-coach', name: 'Rafael Almeida', role: 'coach', email: 'rafael@example.invalid', createdAt: '2026-11-01T15:00:00Z' };
const athlete = { id: 'qa-line', name: 'Marina Costa', role: 'athlete', email: 'marina@example.invalid', position: 'Ala', birthDate: '2000-01-01', createdAt: coach.createdAt };
const keeper = { ...athlete, id: 'qa-keeper', name: 'Pedro Santos', position: 'Goleiro' };
const record = role => ({ role, modality: 'Futsal', position: role === 'OUTFIELD' ? 'Ala' : 'Goleiro', present: true,
  evaluationSource: 'AVERAGE', finalScore: 8.5, ratings: Object.fromEntries(criteriaFor(team, role, 'QUALITATIVE').map(c => [c.name, 8.5])),
  measurementsInitialized: true, measurements: criteriaFor(team, role, 'QUANTITATIVE').map((c, index) => ({ criterionId: c.id, name: c.name, role, value: index + 2 })),
  ...(role === 'GOALKEEPER' ? { goalkeeperStats: { saves: 8, goalsConceded: 2, shotsOnTarget: 10 } } : {}) });
const training = { id: 'qa-training', teamId: team.id, date: '2026-11-18', type: 'Misto', description: 'Treino de avaliação', athletes: { [athlete.id]: record('OUTFIELD'), [keeper.id]: record('GOALKEEPER') } };
const documents = initialLegalDocuments.map(d => ({ ...d, id: `${d.type}-${d.version}`, publishedAt: coach.createdAt, contentHash: 'qa-only' }));
const legal = { documents, pending: [], consents: [], history: documents.map((document, index) => ({ id: `qa-decision-${index}`, document, documentId: document.id, action: document.type === 'TERMS' ? 'ACCEPT' : 'ACKNOWLEDGE', occurredAt: coach.createdAt })) };
const cases = [
  ['coach-lobby', 'coach', '/coach/teams'], ['athlete-lobby', 'athlete', '/athlete/teams'],
  ['coach-home', 'coach', '/coach/teams/qa-team'], ['athlete-home', 'athlete', '/athlete/teams/qa-team'],
  ['athletes', 'coach', '/coach/teams/qa-team/athletes/qa-line'], ['trainings', 'coach', '/coach/teams/qa-team/trainings'],
  ['evaluations', 'coach', '/coach/teams/qa-team/evaluations'], ['settings', 'coach', '/coach/teams/qa-team/settings'],
  ['requests', 'coach', '/coach/teams/qa-team/requests'], ['coach-profile', 'coach', '/perfil'],
  ['athlete-profile', 'athlete', '/perfil'], ['privacy-profile', 'coach', '/perfil'], ['login', null, '/login']
];
if (cssSuite) cases.push(
  ['register', null, '/login'], ['privacy-modal', null, '/login'], ['login-error', null, '/login'],
  ['login-focus', null, '/login'], ['login-hover', null, '/login'], ['login-active', null, '/login'], ['login-disabled', null, '/login'],
  ['password-open', 'coach', '/perfil'], ['profile-history', 'coach', '/perfil'], ['delete-dialog', 'athlete', '/perfil'],
  ['menu-open', 'coach', '/coach/teams/qa-team'], ['training-expanded', 'coach', '/coach/teams/qa-team/trainings'],
  ['training-new', 'coach', '/coach/teams/qa-team/trainings/new'], ['chart-table', 'athlete', '/athlete/teams/qa-team'],
  ['athlete-history', 'athlete', '/athlete/teams/qa-team/trainings/qa-training'],
  ['long-content', 'coach', '/coach/teams/qa-team/athletes/qa-line'], ['goalkeeper', 'coach', '/coach/teams/qa-team/evaluations'],
  ['legal-policy', null, '/privacidade'], ['legal-terms', null, '/termos'],
  ['team-search', 'athlete', '/athlete/search']
);
const vite = cssSuite ? await preview({ root: appRoot, build: { outDir: dist }, preview: { host: '127.0.0.1', port: 0, open: false } }) : await createServer({ root: appRoot, cacheDir: 'node_modules/.vite-structure-qa', optimizeDeps: { entries: ['index.html'], include: ['react', 'react-dom/client', 'lucide-react', 'recharts'] }, server: { host: '127.0.0.1', port: 0, open: false } });
let browser;
try {
  if (!cssSuite) await vite.listen();
  const origin = `http://127.0.0.1:${vite.httpServer.address().port}`;
  browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
  if (refresh && !only) throw new Error('--refresh exige --only para preservar o restante do manifesto.');
  const previous = resume || refresh ? JSON.parse(await readFile(`${output}/${phase}.json`, 'utf8')) : [];
  const results = refresh ? previous.filter(result => !new RegExp(only).test(result.file.replace(/-\d+\.png$/, ''))) : previous, errors = [];
  await mkdir(`${output}/${phase}`, { recursive: true });
  for (const [name, role, path] of cases) {
    if (only && !new RegExp(only).test(name)) continue;
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(`${name}: ${error.message}`));
    if (role) await context.addInitScript(() => localStorage.setItem('webkore-auth-token-v1', 'qa-only-token'));
    await page.clock.setFixedTime(new Date('2026-11-21T15:00:00Z'));
    await page.route('**/api/**', async route => {
      const user = role === 'athlete' ? athlete : coach;
      const state = { users: role === 'athlete' ? [coach, athlete] : [coach, athlete, keeper], teams: [team],
        memberships: (role === 'athlete' ? [athlete] : [athlete, keeper]).map(a => ({ id: `m-${a.id}`, teamId: team.id, athleteId: a.id, status: 'approved', position: a.position })),
        trainings: [{ ...training, athletes: role === 'athlete' ? { [athlete.id]: training.athletes[athlete.id] } : training.athletes }], teamRankings: {} };
      const pathname = new URL(route.request().url()).pathname;
      if (name === 'team-search' && pathname.endsWith('/teams')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([team]) });
      if (name === 'login-error' && pathname.endsWith('/auth/login')) return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'E-mail ou senha incorretos.' }) });
      if (name === 'long-content') {
        state.teams = [{ ...team, name: 'Equipe de desenvolvimento e acompanhamento esportivo WebKore' }];
        state.users = [coach, ...Array.from({ length: 10 }, (_, index) => ({ ...athlete, id: index ? `qa-long-${index}` : athlete.id, name: `Atleta ${index + 1} — Nome extenso para conferir leitura e quebra de linhas` }))];
        state.memberships = state.users.slice(1).map(a => ({ id: `m-${a.id}`, teamId: team.id, athleteId: a.id, status: 'approved', position: 'Ala' }));
        state.trainings = [{ ...training, description: 'Registro detalhado do treinamento. '.repeat(12) }];
      }
      const data = pathname.endsWith('/legal/me') ? legal : pathname.endsWith('/legal/documents') ? { documents } : { user, state, legal };
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
    });
    for (const width of widths) {
      if (resume && results.some(result => result.file === `${name}-${width}.png`)) continue;
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(name.startsWith('legal-') ? `${origin}${path}${cssSuite ? `?qaViewport=${width}` : ''}` : `${origin}/${cssSuite ? `?qaViewport=${width}` : ''}#${path}`);
      await page.locator(name.startsWith('legal-') ? '.legal-page' : role ? '.profile-page, .lobby-page, .app-shell' : '.auth-form').first().waitFor();
      await page.locator('.athlete-loading').waitFor({ state: 'hidden' });
      await page.waitForLoadState('networkidle');
      if (name === 'privacy-profile') await page.getByRole('tab', { name: 'Privacidade e segurança' }).click();
      if (name === 'privacy-profile') await page.getByRole('heading', { name: 'Documentos legais' }).waitFor();
      if (['register', 'privacy-modal'].includes(name)) {
        await page.getByRole('button', { name: 'Criar conta', exact: true }).click();
        await page.getByRole('combobox').selectOption('athlete');
        if (name === 'privacy-modal') await page.getByRole('button', { name: 'Privacidade e proteção de dados', exact: true }).click();
      }
      if (name === 'login-error') {
        await page.getByLabel('E-mail', { exact: true }).fill('erro@example.invalid');
        await page.getByLabel('Senha', { exact: true }).fill('SenhaIncorreta');
        await page.getByRole('button', { name: 'Entrar', exact: true }).click();
        await page.getByRole('alert').filter({ hasText: 'E-mail ou senha incorretos.' }).waitFor();
      }
      if (name === 'login-focus') { await page.getByLabel('E-mail', { exact: true }).focus(); await page.getByLabel('E-mail', { exact: true }).evaluate(el => el.setAttribute('aria-invalid', 'true')); }
      if (['login-hover', 'login-active'].includes(name)) await page.getByRole('button', { name: 'Entrar', exact: true }).hover();
      if (name === 'login-active') await page.mouse.down();
      if (name === 'login-disabled') await page.locator('.auth-form fieldset').evaluate(el => { el.disabled = true; });
      if (['password-open', 'profile-history'].includes(name)) {
        await page.getByRole('tab', { name: 'Privacidade e segurança', exact: true }).click();
        await page.getByRole('heading', { name: 'Documentos legais', exact: true }).waitFor();
        if (name === 'password-open') { await page.locator('.profile-password > summary').click(); await page.getByLabel('Senha atual', { exact: true }).focus(); }
        if (name === 'profile-history') { await page.getByRole('button', { name: /^Ver registros/ }).click(); await page.getByText('Correção, exclusão e contato', { exact: true }).click(); }
      }
      if (name === 'delete-dialog') { await page.getByRole('button', { name: 'Excluir conta', exact: true }).click(); await page.getByRole('dialog').waitFor(); }
      if (name === 'menu-open') { if (width < 1060) await page.getByRole('button', { name: 'Abrir menu', exact: true }).click(); else await page.locator('.sidebar .nav-item').first().hover(); }
      if (name === 'training-expanded') { await page.locator('.training-card__summary').first().click(); await page.locator('.training-editor').first().waitFor(); }
      if (name === 'chart-table') await page.getByText('Consultar notas em tabela', { exact: true }).click();
      if (name === 'goalkeeper') await page.getByRole('button', { name: 'Goleiros', exact: true }).click();
      if (name === 'team-search') {
        await page.getByLabel('Código da equipe', { exact: true }).fill('QA-VISUAL');
        await page.locator('.team-result').waitFor();
      }
      if (name.startsWith('legal-')) await page.locator('.legal-text').waitFor();
      // Registration focus and native dialogs can scroll the document during
      // interaction. Compare both implementations at the same explicit origin.
      if (cssSuite && ['register', 'privacy-modal'].includes(name)) await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(cssSuite ? 200 : 400);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name} em ${width}px tem overflow horizontal.`);
      const file = `${name}-${width}.png`;
      let computed;
      if (cssSuite) computed = await page.evaluate(() => Array.from(document.body.querySelectorAll('*')).filter(el => !['SCRIPT', 'STYLE', 'LINK'].includes(el.tagName)).map(el => {
        const style = getComputedStyle(el), rect = el.getBoundingClientRect();
        const props = ['display','visibility','opacity','position','box-sizing','color','background-color','background-image','border-top','border-right','border-bottom','border-left','border-radius','font-family','font-size','font-weight','font-style','line-height','letter-spacing','text-align','white-space','overflow','overflow-wrap','text-overflow','width','height','min-width','max-width','min-height','max-height','padding','margin','gap','grid-template-columns','grid-template-rows','grid-auto-flow','align-items','align-content','justify-content','flex','flex-direction','flex-wrap','order','transform','box-shadow','outline','outline-offset','transition','animation','cursor','pointer-events','fill','stroke','stroke-width','accent-color'];
        return [el.tagName, typeof el.className === 'string' ? el.className : el.className.baseVal, [rect.x, rect.y, rect.width, rect.height], props.map(prop => [prop, style.getPropertyValue(prop)])];
      }));
      if (details && computed) await writeFile(`${output}/${phase}/${file}.computed.json`, JSON.stringify(computed));
      const png = await page.screenshot({ path: `${output}/${phase}/${file}`, fullPage: true, animations: 'disabled' });
      results.push({ file, sha256: createHash('sha256').update(png).digest('hex'), ...(computed ? { computedHash: createHash('sha256').update(JSON.stringify(computed)).digest('hex') } : {}) });
      if (name === 'login-active') await page.mouse.up();
      await writeFile(`${output}/${phase}.json`, JSON.stringify(results, null, 2));
    }
    console.log(`Visual ${phase}: ${name} (${results.length} capturas).`);
    await context.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(`${output}/${phase}.json`, JSON.stringify(results, null, 2));
  if (phase === 'after') {
    const before = JSON.parse(await readFile(`${output}/before.json`, 'utf8'));
    const differences = results.filter(result => before.find(b => b.file === result.file)?.sha256 !== result.sha256).map(r => r.file);
    const computedDifferences = results.filter(result => before.find(b => b.file === result.file)?.computedHash !== result.computedHash).map(r => r.file);
    await writeFile(`${output}/comparison.json`, JSON.stringify({ captures: results.length, differences, computedDifferences }, null, 2));
    if (!allowDifferences) {
      assert.deepEqual(differences, [], 'Capturas diferentes; inspecione antes de concluir.');
      if (cssSuite) assert.deepEqual(computedDifferences, [], 'Estilos computados diferentes; inspecione antes de concluir.');
    }
  }
  console.log(`PASS visual ${phase}: ${results.length} capturas de componentes reais, sem erros JavaScript.`);
} finally { await browser?.close(); if (cssSuite) await new Promise(resolve => vite.httpServer.close(resolve)); else await vite.close(); }
