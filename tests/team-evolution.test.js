import assert from "node:assert/strict";
import test from "node:test";
import { getTeamEvolution, getAthleteEvolution } from "../src/utils/selectors.js";

test("evolução da equipe preserva cálculos e escalas, zero, máximos, datas e registros vazios", () => {
  const record = (note, present = true) => ({ present, ratings: { Técnica: note }, metrics: {} });
  const state = { trainings: [
    { id: "latest", teamId: "t", date: "2026-09-30", athletes: { a: record(10), b: record(0, false) } },
    { id: "empty", teamId: "t", date: "2026-09-15", athletes: {} },
    { id: "first", teamId: "t", date: "2025-09-30", athletes: { a: record(0, false) } },
    { id: "other", teamId: "other", date: "2026-09-29", athletes: { a: record(10) } }
  ] };
  const points = getTeamEvolution(state, "t");
  assert.deepEqual(points.map(({ trainingId, date, recordCount, desempenho, presenca }) =>
    ({ trainingId, date, recordCount, desempenho, presenca })), [
    { trainingId: "first", date: "2025-09-30", recordCount: 1, desempenho: 0, presenca: 0 },
    { trainingId: "empty", date: "2026-09-15", recordCount: 0, desempenho: 0, presenca: 0 },
    { trainingId: "latest", date: "2026-09-30", recordCount: 2, desempenho: 5, presenca: 50 }
  ]);
  assert.deepEqual(getTeamEvolution({ trainings: [] }, "t"), []);
  const maximum = getTeamEvolution({ trainings: [{ id: "max", teamId: "t", date: "2026-09-30", athletes: { a: record(10) } }] }, "t")[0];
  assert.equal(maximum.desempenho, 10);
  assert.equal(maximum.presenca, 100);
  assert.equal(getAthleteEvolution(state, "t", "a").at(-1).desempenho, 100);
});
