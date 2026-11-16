import assert from "node:assert/strict";
import test from "node:test";
import { teamPerformance, coachOverview, positionMeasurements } from "../src/utils/teamPerformance.js";
import { getTeamStats } from "../src/utils/selectors.js";

const record = (ratings, present = true) => ({ ratings, present });
test("média coletiva exclui notas ausentes, preserva zero e mantém peso por registro", () => {
  const trainings = [
    { id: "1", teamId: "t", date: "2026-09-01", athletes: { a: record({ Técnica: 0, Participação: 10 }), b: record({ Técnica: 10 }), c: record({}) } },
    { id: "2", teamId: "t", date: "2026-10-01", athletes: { a: record({ Técnica: 8 }), b: record({}, false) } },
    { id: "other", teamId: "other", date: "2026-10-10", athletes: { z: record({ Técnica: 1 }) } }
  ];
  const result = teamPerformance(trainings, "t");
  assert.equal(result.averageScore, 23 / 3);
  assert.equal(result.evaluationCount, 3);
  assert.equal(result.presenceAverage, 80);
  assert.equal(result.observations.length, 2);
  assert.equal(result.observations[0].ratings.Técnica, 5);
  assert.equal(result.observations[1].ratings.Participação, undefined);
  assert.equal(result.improvement.change, 3);
  assert.equal(result.best.name, "Participação");
  const state = { trainings, users: [{ id: "a" }, { id: "c" }], memberships: [{ teamId: "t", athleteId: "a", status: "approved" }, { teamId: "t", athleteId: "c", status: "approved" }] };
  assert.equal(getTeamStats(state, "t").averageScore, 23 / 3);
  assert.equal(getTeamStats(state, "t").bestAthlete.id, "a");
});
test("treinos vazios não inventam notas nem evolução; datas repetidas continuam separadas", () => {
  const empty = teamPerformance([], "t");
  assert.equal(empty.averageScore, null);
  assert.equal(empty.presenceAverage, null);
  const result = teamPerformance([
    { id: "b", teamId: "t", date: "2026-10-01", athletes: { a: record({ A: 8 }) } },
    { id: "a", teamId: "t", date: "2026-10-01", athletes: { a: record({ A: 0 }) } },
    { id: "c", teamId: "t", date: "2026-10-02", athletes: {} }
  ], "t");
  assert.deepEqual(result.observations.map((point) => point.trainingId), ["a", "b", "c"]);
  assert.deepEqual(result.observations[2].ratings, {});
  assert.equal(result.hasComparableEvaluations, false);
});

test("gráfico por função preserva a nota final e separa critérios com o mesmo nome", () => {
  const trainings = [{ id: "a", teamId: "t", date: "2026-10-01", athletes: {
    a: { role: "OUTFIELD", evaluationSource: "WEIGHTED", finalScore: 8, ratings: { Posicionamento: 10, Pressão: 2 } },
    b: { role: "GOALKEEPER", evaluationSource: "AVERAGE", finalScore: 0, ratings: { Posicionamento: 0, Reflexos: 0 } },
    c: { ratings: { Legado: 10 } }
  } }, { id: "b", teamId: "t", date: "2026-10-02", athletes: {
    a: { role: "GOALKEEPER", evaluationSource: "AVERAGE", finalScore: 6, ratings: { Reflexos: 6 } }
  } }];
  const overall = teamPerformance(trainings, "t");
  const line = teamPerformance(trainings, "t", "OUTFIELD");
  const keepers = teamPerformance(trainings, "t", "GOALKEEPER");
  assert.deepEqual(overall.observations.map((point) => point.averageScore), [6, 6]);
  assert.deepEqual(line.observations.map((point) => point.averageScore), [8, null]);
  assert.deepEqual(keepers.observations.map((point) => point.averageScore), [0, 6]);
  assert.deepEqual(line.observations[0].ratings, { Posicionamento: 10, Pressão: 2 });
  assert.deepEqual(keepers.observations[0].ratings, { Posicionamento: 0, Reflexos: 0 });
});

test("medidas do perfil somam contagens observadas e preservam zero por função", () => {
  const measure = (criterionId, name, value, role) => ({ criterionId, name, value, role });
  const line = "OUTFIELD";
  const keeper = "GOALKEEPER";
  const records = [
    { role: line, measurements: [measure("g", "Gols", 2, line), measure("a", "Assistências", 0, line), measure("d", "Defesas", 4, keeper)] },
    { role: line, measurements: [measure("g", "Gols", 4, line), measure("p", "Passes", null, line)] },
    { role: keeper, measurements: [measure("d", "Defesas", 2, keeper)] }
  ];
  assert.deepEqual(positionMeasurements(records, line), [{ id: "g", label: "Gols", value: 6 }, { id: "a", label: "Assistências", value: 0 }]);
  assert.deepEqual(positionMeasurements(records, keeper), [{ id: "d", label: "Defesas", value: 2 }]);
});
test("perfil profissional conta atletas únicos aprovados somente nas equipes do treinador", () => {
  const state = { teams: [{ id: "1", coachId: "coach", modality: "Vôlei" }, { id: "2", coachId: "coach", modality: "Futsal" }, { id: "3", coachId: "other", modality: "Futebol" }],
    memberships: [{ teamId: "1", athleteId: "a", status: "approved" }, { teamId: "2", athleteId: "a", status: "approved" }, { teamId: "1", athleteId: "b", status: "pending" }, { teamId: "3", athleteId: "c", status: "approved" }],
    trainings: [{ teamId: "1" }, { teamId: "2" }, { teamId: "3" }] };
  const result = coachOverview(state, "coach");
  assert.equal(result.teams.length, 2);
  assert.equal(result.athletesCount, 1);
  assert.equal(result.trainingsCount, 2);
  assert.deepEqual(result.modalities, ["Vôlei", "Futsal"]);
});
