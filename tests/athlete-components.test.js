import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { athletePerformance } from "../src/utils/athletePerformance.js";

let server;
let EvolutionChart;
let PerformanceSummary;
let TeamHome;
let SettingsPage;
before(async () => {
  server = await createServer({ configFile: false, plugins: [react()], appType: "custom",
    server: { middlewareMode: true, hmr: false, watch: null } });
  ({ EvolutionChart } = await server.ssrLoadModule("/src/componentes/charts/GraficoEvolucao.jsx"));
  ({ PerformanceSummary } = await server.ssrLoadModule("/src/componentes/ui/ResumoDesempenho.jsx"));
  ({ TeamHome } = await server.ssrLoadModule("/src/paginas/treinador/PrincipalTreinador.jsx"));
  ({ SettingsPage } = await server.ssrLoadModule("/src/paginas/treinador/ConfigsTreinador.jsx"));
});
after(async () => { await server?.close(); });

const render = (component, props) => renderToStaticMarkup(createElement(component, props));
test("gráfico distingue nenhum treino de treinos sem notas e lista critérios configurados", () => {
  const empty = render(EvolutionChart, { data: [], criteria: ["Critério sem notas"] });
  assert.match(empty, /Nenhum treino registrado/);
  assert.match(empty, /Visão geral/);
  assert.match(empty, /Critério sem notas/);
  const unrated = render(EvolutionChart, { data: [{ trainingId: "one", date: "2026-10-20", ratings: {} }], criteria: ["Técnica"] });
  assert.match(unrated, /ainda não possuem avaliações/);
  assert.doesNotMatch(unrated, /Nenhum treino registrado/);
});
test("resumo mantém quatro indicadores mesmo sem avaliações", () => {
  const html = render(PerformanceSummary, { performance: athletePerformance([], "a") });
  assert.equal((html.match(/<dt>/g) || []).length, 4);
  assert.match(html, /Dados insuficientes/);
  assert.match(html, /Sem avaliação/);
  assert.match(html, /Avaliações recebidas/);
});
test("resumo diferencia crescimento, estabilidade e dados insuficientes", () => {
  const record = (id, date, value) => ({ id, date, athletes: { a: { ratings: { Técnica: value } } } });
  const growing = render(PerformanceSummary, { performance: athletePerformance([record("1", "2026-09-20", 0), record("2", "2026-10-20", 6)], "a") });
  assert.match(growing, /\+6 pontos/);
  assert.match(growing, /3,0\/10/);
  const stable = render(PerformanceSummary, { performance: athletePerformance([record("1", "2026-09-20", 6), record("2", "2026-10-20", 6)], "a") });
  assert.match(stable, /Sem crescimento/);
  assert.doesNotMatch(stable, /Dados insuficientes/);
});

test("uma única avaliação mostra aviso e nota zero na tabela sem inventar evolução", () => {
  const html = render(EvolutionChart, { criteria: ["Técnica"],
    data: [{ trainingId: "one", date: "2026-10-20", ratings: { Técnica: 0 } }] });
  assert.match(html, /Uma avaliação disponível/);
  assert.match(html, /0,0\/10/);
  assert.match(html, /20\/10\/2026/);
});

test("dashboard do treinador usa gráfico compartilhado e distingue equipe sem notas", () => {
  const team = { id: "t", name: "Equipe", qualitativeCriteria: ["Técnica"] };
  const html = render(TeamHome, { team, state: { trainings: [], users: [], memberships: [] } });
  assert.match(html, /Evolução média da equipe/);
  assert.match(html, /Desempenho da equipe/);
  assert.match(html, /Sem avaliação/);
  assert.doesNotMatch(html, /Destaque da equipe/);
});

test("perfil do treinador usa dados reais, não exige nascimento e separa configurações da equipe", () => {
  const currentUser = { id: "coach", name: "Treinador Teste", email: "coach@example.invalid" };
  const state = { teams: [{ id: "t", name: "Minha equipe", modality: "Vôlei", coachId: "coach" }, { id: "x", name: "Equipe privada", coachId: "other" }], memberships: [], trainings: [] };
  const profile = render(SettingsPage, { currentUser, state, actions: {}, view: "profile" });
  assert.match(profile, /Resumo profissional/);
  assert.match(profile, /Minha equipe/);
  assert.match(profile, /coach@example.invalid/);
  assert.match(profile, /Salvar conta/);
  assert.doesNotMatch(profile, /Data de [Nn]ascimento|Equipe privada/);
  const settings = render(SettingsPage, { currentUser, state, actions: {}, team: { ...state.teams[0], code: "WK-TEST", objectiveCriteria: [], qualitativeCriteria: [] } });
  assert.match(settings, /Salvar equipe/);
  assert.match(settings, /Excluir equipe/);
  assert.doesNotMatch(settings, /Salvar conta/);
});
