import { randomUUID } from 'node:crypto';
import { test as base, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { cases } from './catalogue.mjs';

const db = new URL(process.env.DATABASE_URL || 'mysql://invalid/invalid').pathname.slice(1);
if (process.env.WEBKORE_CT20_ISOLATED !== '1' || !/^webkore_ct20_[a-f0-9]{32}$/.test(db) || db !== process.env.WEBKORE_CT20_DB_NAME) {
  throw new Error('Use npm run test:ct20: conexão de testes isolada obrigatória.');
}
const apiBase = process.env.WEBKORE_CT20_API;
if (!apiBase?.startsWith('http://127.0.0.1:')) throw new Error('API exclusiva de loopback obrigatória.');
export const password = 'FicticiaCT20!';
export { expect };

export const test = base.extend({
  rig: async ({ request }, use) => {
    const prisma = new PrismaClient();
    const users = [];
    async function req(path, method = 'GET', body, account, expected = 200) {
      const response = await request.fetch(apiBase + path, { method,
        headers: account ? { Authorization: `Bearer ${account.token}` } : {},
        ...(body === undefined ? {} : { data: body }) });
      const data = response.status() === 204 ? null : await response.json();
      expect(response.status(), `${method} ${path}: ${data?.message || 'status'}`).toBe(expected);
      return data;
    }
    const track = id => { if (!users.includes(id)) users.push(id); };
    async function register(role = 'coach', name = role === 'coach' ? 'Treinador CT20' : 'Atleta CT20') {
      const email = `ct20-${randomUUID()}@example.invalid`;
      const { documents } = await req('/legal/documents');
      const legal = { termsId: documents.find(d => d.type === 'TERMS').id, privacyId: documents.find(d => d.type === 'PRIVACY').id, acceptTerms: true, acknowledgePrivacy: true };
      const payload = await req('/auth/register', 'POST', { name, email, password, role,
        legal, ...(role === 'athlete' ? { birthDate: '2000-02-29' } : {}) }, undefined, 201);
      track(payload.user.id);
      return { ...payload, email, password };
    }
    async function team(coach, name = 'Equipe CT20') { return req('/teams', 'POST', { name, modality: 'Futsal' }, coach, 201); }
    async function join(coach, team, athlete, status = 'approved', position = 'Ala') {
      await req('/teams/join', 'POST', { code: team.code }, athlete, 201);
      await req(`/teams/${team.id}/requests/${athlete.user.id}`, 'PATCH', { status }, coach);
      if (status === 'approved') await req(`/teams/${team.id}/athletes/${athlete.user.id}`, 'PATCH', { position }, coach);
    }
    async function setup(count = 3) {
      const coach = await register();
      const selected = await team(coach);
      const athletes = [];
      for (let i = 0; i < count; i++) {
        const athlete = await register('athlete', ['Linha CT20', 'Goleiro CT20', 'Ausente CT20'][i] || `Atleta CT20 ${i}`);
        await join(coach, selected, athlete, 'approved', i === 1 ? 'Goleiro' : 'Ala');
        athletes.push(athlete);
      }
      return { coach, team: selected, athletes };
    }
    async function training(fixture, description = 'Treino CT20 A', records, date = '2026-11-18') {
      return req('/trainings', 'POST', { teamId: fixture.team.id, date, type: 'Misto', description,
        records: records || fixture.athletes.map(athlete => ({ athleteId: athlete.user.id, present: true })) }, fixture.coach, 201);
    }
    try { await use({ prisma, req, register, team, join, setup, training, track }); }
    finally {
      try {
        if (users.length) {
          await prisma.team.deleteMany({ where: { coachId: { in: users } } });
          await prisma.user.deleteMany({ where: { id: { in: users } } });
          expect(await prisma.user.count({ where: { id: { in: users } } })).toBe(0);
        }
      } finally { await prisma.$disconnect(); }
    }
  }
});

export function define(id, run) {
  const item = cases.find(item => item.id === id);
  test(`${id} — ${item.title}`, async ({ rig, page, request, context, browser }, info) => {
    info.annotations.push({ type: 'objetivo', description: item.objective });
    await run({ rig, page, request, context, browser }, info);
  });
}
export function obtained(info, description) { info.annotations.push({ type: 'obtido', description }); }

export async function login(page, account) {
  await page.goto('/#/login');
  await page.getByLabel('E-mail', { exact: true }).fill(account.email);
  await page.getByLabel('Senha', { exact: true }).fill(account.password);
  await page.getByRole('combobox', { name: 'Perfil', exact: true }).selectOption(account.user.role);
  await page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/#/${account.user.role}/teams$`));
}
export async function session(page, account, path) {
  await page.goto('/');
  await page.evaluate(token => localStorage.setItem('webkore-auth-token-v1', token), account.token);
  // A query exclusiva força um novo documento. Só mudar o hash permite que
  // a conta anterior redirecione a rota antes da restauração do novo token.
  await page.goto(`/?ct20-session=${randomUUID()}#${path}`);
  await page.reload();
}
export const teamPath = (team, suffix = '') => `/coach/teams/${team.id}${suffix}`;
export async function openTraining(page, fixture, training) {
  await session(page, fixture.coach, teamPath(fixture.team, `/trainings/${training.id}`));
  await expect(page.getByRole('heading', { name: '3. Avaliação individual', exact: true })).toBeVisible();
}
export async function selectAthlete(page, name) {
  await page.locator('.review-participant').filter({ has: page.getByText(name, { exact: true }) }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
}
