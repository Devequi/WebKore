import assert from "node:assert/strict";
import test from "node:test";
import { getBestAthlete, getTrainingHighlight } from "../../src/features/performance/model/athleteHighlights.js";
import { getTeamStats, getApprovedAthletes } from "../../src/app/state/selectors.js";
import { getLastTrainingStats } from "../../src/features/performance/model/lastTraining.js";

const athletes = [{ id: "a", name: "Ana" }, { id: "b", name: "Bruno" }];
const record = (score, present = true) => ({ present, ratings: { Técnica: score } });

test("destaque recente e melhor atleta consolidado usam históricos separados e isolam equipe", () => {
  const state = { users: athletes, memberships: athletes.map((a) => ({ athleteId: a.id, teamId: "t", status: "approved", position: "Ala" })),
    trainings: [
      { id: "1", teamId: "t", date: "2026-10-01", athletes: { a: record(10), b: record(2) } },
      { id: "2", teamId: "t", date: "2026-10-02", athletes: { a: record(8), b: record(9) } },
      { id: "3", teamId: "other", date: "2026-10-03", athletes: { a: record(0), b: record(10) } }
    ] };
  const stats = getTeamStats(state, "t");
  assert.equal(stats.lastTraining.id, "2");
  assert.equal(stats.bestAthlete.id, "a");
  assert.equal(stats.bestAthlete.score, 9);
  assert.equal(stats.bestAthlete.position, "Ala");
  assert.equal(getTrainingHighlight(stats.lastTraining, getApprovedAthletes(state, "t")).id, "b");
  assert.equal(getLastTrainingStats(stats.lastTraining).averageScore, 8.5);
  assert.equal(getTrainingHighlight({ athletes: { outsider: record(10) } }, athletes), null);
});

test("empates usam quantidade de avaliações, presença e ordem estável sem mutar dados", () => {
  const history = [ { athletes: { a: record(8), b: record(8) } }, { athletes: { b: record(8) } } ];
  const original = structuredClone({ athletes, history });
  assert.equal(getBestAthlete(athletes, history).id, "b");
  assert.equal(getBestAthlete(athletes, [{ athletes: { a: record(8, false), b: record(8) } }]).id, "b");
  assert.equal(getTrainingHighlight(history[0], athletes).id, "a");
  assert.deepEqual({ athletes, history }, original);
});

test("notas parciais têm peso por treino; zero é válido, notas inválidas e ausentes não competem", () => {
  const result = getBestAthlete(athletes, [
    { athletes: { a: { ratings: { Técnica: 10, Participação: 0 } }, b: record(4) } },
    { athletes: { a: record(9), b: { ratings: { Técnica: "10", Outro: Infinity, Negativo: -1, Excesso: 11 } } } }
  ]);
  assert.equal(result.id, "a");
  assert.equal(result.score, 7);
  assert.equal(result.evaluationCount, 2);
  assert.equal(getTrainingHighlight({ athletes: { a: record(0) } }, athletes).score, 0);
});

test("estados vazios e registros inconsistentes não inventam destaque nem quebram resumo", () => {
  for (const training of [undefined, {}, { athletes: {} }, { athletes: { a: null, b: { ratings: { Técnica: "9" } } } }]) {
    assert.equal(getTrainingHighlight(training, athletes), null);
    assert.equal(getLastTrainingStats(training).averageScore, null);
  }
  assert.equal(getBestAthlete([], []), null);
  assert.equal(getBestAthlete(athletes, []), null);
});
