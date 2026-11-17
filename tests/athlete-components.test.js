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
let PositionField;
let AthletesPage;
let TrainingHistory;
let TrainingsPage;
let CoachLobby;
let AthleteLobby;
before(async () => {
  server = await createServer({ configFile: false, plugins: [react()], appType: "custom",
    server: { middlewareMode: true, hmr: false, watch: null } });
  ({ EvolutionChart } = await server.ssrLoadModule("/src/componentes/charts/GraficoEvolucao.jsx"));
  ({ PerformanceSummary } = await server.ssrLoadModule("/src/componentes/ui/ResumoDesempenho.jsx"));
  ({ TeamHome } = await server.ssrLoadModule("/src/paginas/treinador/PrincipalTreinador.jsx"));
  ({ SettingsPage } = await server.ssrLoadModule("/src/paginas/treinador/ConfigsTreinador.jsx"));
  ({ PositionField } = await server.ssrLoadModule("/src/componentes/ui/CampoPosicao.jsx"));
  ({ AthletesPage } = await server.ssrLoadModule("/src/paginas/treinador/AtletasTreinador.jsx"));
  ({ TrainingHistory } = await server.ssrLoadModule("/src/componentes/charts/HistoricoTreinos.jsx"));
  ({ TrainingsPage } = await server.ssrLoadModule("/src/paginas/treinador/treinamentosPagina.jsx"));
  ({ CoachLobby } = await server.ssrLoadModule("/src/paginas/treinador/LobbyTreinador.jsx"));
  ({ AthleteLobby } = await server.ssrLoadModule("/src/paginas/atleta/Lobby.jsx"));
});
after(async () => { await server?.close(); });

const render = (component, props) => renderToStaticMarkup(createElement(component, props));

test("lobbies compartilham estrutura ampla, separam criação/entrada e preservam ações por perfil", () => {
  const currentUser = { id: "coach", name: "Treinador" };
  const teams = [{ id: "t", name: "Equipe", coachId: "coach", code: "WK-TEST", modality: "Futsal" }];
  const state = { users: [currentUser], memberships: [{ athleteId: "a", teamId: "t", status: "approved" }] };
  const coach = render(CoachLobby, { teams, state, currentUser, actions: {} });
  assert.match(coach, /team-lobby coach-lobby/);
  assert.match(coach, /Minhas equipes/);
  assert.match(coach, /class="lobby-create-panel" hidden=""/);
  assert.match(coach, /Copiar/);
  assert.match(coach, /Gerenciar/);
  for (const label of ["Equipes", "Atletas", "Modalidades"]) assert.ok(coach.includes(`<p>${label}</p><strong>1</strong>`));
  const athlete = render(AthleteLobby, { teams, state, currentUser });
  assert.match(athlete, /team-lobby athlete-lobby/);
  assert.match(athlete, /class="lobby-join"/);
  assert.match(athlete, /Minhas equipes/);
  assert.match(athlete, /Acessar dados/);
  assert.doesNotMatch(athlete, /Gerenciar|Criar equipe|Copiar/);
  assert.match(render(AthleteLobby, { teams: [], state, currentUser }), /Nenhuma equipe aprovada/);
  assert.match(render(CoachLobby, { teams: [], state, currentUser, actions: {} }), /Nenhuma equipe criada/);
});

test("gráficos, resumo, histórico e critérios usam clique no card sem controles antigos", () => {
  const team = { id: "t", name: "Equipe", modality: "Futsal", objectiveCriteria: [], qualitativeCriteria: [] };
  const state = { teams: [team], users: [], memberships: [], trainings: [] };
  const pages = [
    render(EvolutionChart, {}),
    render(PerformanceSummary, { performance: athletePerformance([], "a") }),
    render(TrainingHistory, { trainings: [], athleteId: "a" }),
    render(SettingsPage, { view: "evaluations", team, state, currentUser: { id: "c", name: "Treinador", email: "teste@example.invalid" }, actions: {} })
  ];
  for (const html of pages) {
    assert.match(html, /collapsible-panel__heading-toggle/);
    assert.match(html, /aria-expanded="true"/);
    assert.doesNotMatch(html, /Retrair|Expandir|Recolher critérios|criteria-toggle|collapsible-panel__toggle"/);
  }
  const training = render(TrainingsPage, { team, state, actions: {} });
  assert.doesNotMatch(training, /Retrair|Expandir/);
});
test("posição usa select de quatro opções, carrega seleção salva e preserva valor antigo no aviso", () => {
  const props = { modality: " FÚTSAL ", value: "Pivô", onChange() {} };
  const html = render(PositionField, props);
  assert.doesNotMatch(html, /<input/);
  assert.match(html, /<option value="Pivô" selected="">Pivô<\/option>/);
  assert.deepEqual([...html.matchAll(/<option value="([^"]+)"/g)].map((match) => match[1]), ["Goleiro", "Fixo", "Pivô", "Ala"]);
  const legacy = render(PositionField, { ...props, value: "Ponteiro" });
  assert.match(legacy, /Posição atual: “Ponteiro”/);
  assert.match(legacy, /preservado até salvar/);
  assert.match(legacy, /aria-invalid="true"/);
  assert.doesNotMatch(legacy, /<option value="Ponteiro"/);
  assert.match(render(PositionField, { ...props, modality: "Vôlei", value: "Ponteiro" }), /<input[^>]+value="Ponteiro"/);
});

test("perfil abre com edição recolhida e exibe a identificação e os indicadores", () => {
  const team = { id: "t", modality: "Futsal" };
  const state = { users: [{ id: "a", name: "Atleta" }], trainings: [], memberships: [
    { athleteId: "a", teamId: "t", status: "approved", position: "Ponteiro", number: 8 }
  ] };
  const html = render(AthletesPage, { team, state, actions: {}, selectedAthleteId: "a" });
  assert.ok(html.includes("Editar atleta"));
  assert.match(html, /<p>Ponteiro[^<]*Camisa 8<\/p>/);
  assert.ok(!html.includes("Número da camisa"));
  for (const label of ["Presença", "Treinos", "Desempenho"]) assert.ok(html.includes(label));
});

test("perfil de linha soma as medidas configuradas do atleta e distingue zero de ausências", () => {
  const criteria = ["Gols", "Assistências", "Finalizações"].map((name, order) =>
    ({ id: `metric-${order}`, name, kind: "QUANTITATIVE", order }));
  const team = { id: "t", modality: "Futsal", evaluationProfiles: [
    { schemaVersion: 2, modality: "Futsal", role: "OUTFIELD", criteria }
  ] };
  const record = (present, goals, role = "OUTFIELD") => ({
    role, present, measurements: [
      { criterionId: "metric-0", name: "Gols", role, value: goals },
      { criterionId: "metric-1", name: "Assistências", role, value: 0 }
    ]
  });
  const training = (id, athletes, teamId = "t") => ({ id, teamId, date: "2026-11-12", athletes });
  const state = {
    users: [{ id: "a", name: "Atleta" }, { id: "other", name: "Outro atleta" }],
    memberships: [{ athleteId: "a", teamId: "t", status: "approved", position: "Pivô" }],
    trainings: [
      training("one", { a: record(true, 2), other: record(true, 100) }),
      training("two", { a: record(true, 3) }),
      training("absent", { a: record(false, 100) }),
      training("keeper", { a: record(true, 100, "GOALKEEPER") }),
      training("other", { a: record(true, 100) }, "other")
    ]
  };
  const html = render(AthletesPage, { team, state, actions: {}, selectedAthleteId: "a" });
  assert.match(html, /aria-label="Estatísticas de linha" aria-expanded="false"/);
  assert.match(html, /<p>Gols<\/p><strong>5<\/strong>/);
  assert.match(html, /<p>Assistências<\/p><strong>0<\/strong>/);
  assert.match(html, /<p>Finalizações<\/p><strong>Sem dados<\/strong>/);
});

test("Atletas organiza evolução e estatísticas antes do histórico resumido", () => {
  const team = { id: "t", modality: "Futsal" };
  const trainings = [1, 4, 2, 3].map((day) => ({
    id: "training-" + day, teamId: team.id, date: "2026-11-0" + day, title: "Sessão " + day,
    athletes: { a: { present: true, role: "OUTFIELD" } }
  }));
  const state = {
    users: [{ id: "a", name: "Atleta" }],
    memberships: [{ athleteId: "a", teamId: "t", status: "approved", position: "Ala" }],
    trainings
  };
  const props = { team, state, actions: {}, selectedAthleteId: "a" };
  const html = render(AthletesPage, props);
  assert.match(html, /Evolução de desempenho[\s\S]*Estatísticas de linha[\s\S]*Treinos recentes/);
  const history = html.slice(html.indexOf("athlete-history-panel"));
  assert.match(history, /Sessão 4[\s\S]*Sessão 3[\s\S]*Sessão 2[\s\S]*Ver todos os treinos/);
  assert.doesNotMatch(history, /Sessão 1/);
  const shorter = render(AthletesPage, { ...props, state: { ...state, trainings: trainings.slice(0, 3) } });
  assert.doesNotMatch(shorter, /Ver todos os treinos/);
});

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
  assert.match(html, /Melhores médias do histórico/);
  assert.match(html, /Ainda não há avaliações suficientes/);
  assert.doesNotMatch(html, /Melhores do treino/);
});

test("último treino mostra destaque da sessão e melhor atleta ocupa um card independente", () => {
  const team = { id: "t", name: "Equipe" };
  const state = { users: [{ id: "a", name: "Ana" }, { id: "b", name: "Bruno" }],
    memberships: ["a", "b"].map((id) => ({ athleteId: id, teamId: "t", status: "approved", position: "Ala" })),
    trainings: [
      { id: "1", teamId: "t", date: "2026-10-01", athletes: { a: { ratings: { Técnica: 10 } }, b: { ratings: { Técnica: 2 } } } },
      { id: "2", teamId: "t", date: "2026-10-02", type: "Coletivo", description: "Treino recente", athletes: { a: { present: true, ratings: { Técnica: 8 } }, b: { present: true, ratings: { Técnica: 9 } } } }
    ] };
  const html = render(TeamHome, { team, state });
  const latest = html.split(/class="panel collapsible-panel[^\"]* last-training-panel"/)[1].split('</section>')[0];
  assert.match(latest, /02\/10\/2026/);
  assert.match(latest, /Treino recente/);
  assert.match(latest, /Melhores do treino/);
  assert.match(latest, /<span>Bruno<\/span><strong>9,0\/10<\/strong>/);
  assert.match(latest, /8,5\/10/);
  assert.doesNotMatch(latest, /Destaque da equipe|Melhor atleta|<strong>Ana<\/strong>/);
  const best = html.split('class="panel best-athlete-panel"')[1].split('</section>')[0];
  assert.match(best, /<span>Ana<\/span>/);
  assert.match(best, /Ala/);
  assert.match(best, /9,0\/10/);
  const summary = html.split('aria-label="Resumo da equipe"')[1].split("</section>")[0];
  assert.equal((summary.match(/class="kpi-card"/g) || []).length, 4);
  assert.match(html, /Desempenho médio<\/p><strong>7,3\/10/);
  assert.equal((html.match(/>Período<select/g) || []).length, 1);
  assert.match(html, /class="team-home__grid"/);
  const headingControls = [...html.matchAll(/<button[^>]*class="collapsible-panel__heading-toggle"[\s\S]*?<\/button>/g)].map((match) => match[0]);
  assert.equal(headingControls.length, 2);
  for (const control of headingControls) {
    assert.match(control, /aria-expanded="true"/);
    assert.match(control, /aria-controls="[^"]+"/);
    assert.doesNotMatch(control, /<select|<input|<a\s/);
  }
  assert.doesNotMatch(html, /Retrair|Expandir|collapsible-panel__toggle"/);
  const empty = render(TeamHome, { team, state: { ...state, trainings: [{ id: "3", date: "2026-10-03", teamId: "t", athletes: { a: null } }] } });
  assert.match(empty, /Não avaliado/);
  assert.doesNotMatch(empty, /Melhores do treino/);
  assert.match(empty, /Ainda não há avaliações suficientes/);
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
  assert.doesNotMatch(settings, /Salvar conta|Critérios por posição|Novo critério/);
});
// UI uses the existing Vite SSR harness; position editors must never mix role-specific fields.
test("formulários de futsal exibem critérios e estatísticas da função automaticamente", async () => {
  const { PositionEvaluationEditor } = await server.ssrLoadModule("/src/componentes/ui/AvaliacaoPosicao.jsx");
  const team = { modality: "Futsal", objectiveCriteria: ["Gols"] };
  const keeper = render(PositionEvaluationEditor, { team, record: { role: "GOALKEEPER", position: "Goleiro", modality: "Futsal" }, onSave: async () => {} });
  assert.match(keeper, /Reflexos/);
  assert.doesNotMatch(keeper, /35%|Peso/);
  assert.match(keeper, /value="5"/);
  assert.match(keeper, /Estatísticas do goleiro \(opcionais\)/);
  assert.doesNotMatch(keeper, /Disciplina tática|Estatísticas de linha/);
  const line = render(PositionEvaluationEditor, { team, record: { role: "OUTFIELD", position: "Ala", modality: "Futsal" }, onSave: async () => {} });
  assert.match(line, /Disciplina tática/);
  assert.match(line, /Estatísticas de linha/);
  assert.doesNotMatch(line, /Defesas realizadas|Estatísticas do goleiro/);
});
test("configuração exibe somente um dos dois perfis e separa tipos sem pesos", async () => {
  const { PositionProfileSettings } = await server.ssrLoadModule("/src/componentes/ui/AvaliacaoPosicao.jsx");
  const settings = render(PositionProfileSettings, { team: { modality: "Futsal" }, actions: {} });
  assert.match(settings, /Goleiro/);
  assert.match(settings, /Jogadores de Linha/);
  assert.match(settings, /Avaliações qualitativas/);
  assert.match(settings, /Medidas quantitativas/);
  assert.doesNotMatch(settings, /Quantidade: Defesas|value="Reflexos"/);
  assert.equal((settings.match(/<input/g) || []).length, 8);
  assert.doesNotMatch(settings, /Peso|%/);
  assert.match(settings, /Salvar perfis de avaliação/);
});

test("revisão inicia em 5, mantém pendências explícitas e oculta avaliação de ausentes", async () => {
  const { TrainingReview } = await server.ssrLoadModule("/src/componentes/ui/RevisaoTreino.jsx");
  const team = { id: "t", name: "Equipe", modality: "Futsal" };
  const props = { team, training: { id: "r", date: "2026-11-06", type: "Misto", athletes: {
    a: { present: true, modality: "Futsal", role: "GOALKEEPER", position: "Goleiro", ratings: {} },
    b: { present: false, modality: "Futsal", role: "OUTFIELD", position: "Ala", ratings: {} }
  } }, athletes: [{ id: "a", name: "Ana", position: "Goleiro" }, { id: "b", name: "Bruno", position: "Ala" }], actions: {}, drafts: {}, setDrafts() {} };
  const html = render(TrainingReview, props);
  assert.equal((html.match(/value="5"/g) || []).length, 4);
  assert.match(html, /Pendente de revisão/);
  assert.match(html, /Revisei e confirmo estas notas/);
  assert.match(html, /Estatísticas do goleiro/);
  assert.match(html, /button[^>]*disabled/);
  assert.doesNotMatch(html, /Finalização e ataque/);
  props.training.athletes.a.present = false;
  const absent = render(TrainingReview, props);
  assert.doesNotMatch(absent, /type="number"/);
  assert.match(absent, /Atleta ausente/);
});
