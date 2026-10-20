import assert from "node:assert/strict";
import test from "node:test";
import { getLastTrainingStats } from "../src/utils/lastTraining.js";
import { getTeamTrainings } from "../src/utils/selectors.js";

test("último treino usa somente a equipe e a data mais recente, com médias próprias em /10", () => {
  const state = { trainings: [
    { id: "old", teamId: "t", date: "2026-10-01", athletes: { a: { present: true, ratings: { Técnica: 10 } } } },
    { id: "latest", teamId: "t", date: "2026-10-03", athletes: {
      a: { present: true, ratings: { Técnica: 8, Participação: 9 } },
      b: { present: false, ratings: { Técnica: 0 } }
    } },
    { id: "other", teamId: "other", date: "2026-10-04", athletes: { a: { present: true, ratings: { Técnica: 10 } } } }
  ] };
  const last = getTeamTrainings(state, "t")[0];
  assert.equal(last.id, "latest");
  assert.deepEqual(getLastTrainingStats(last), { recordCount: 2, presentCount: 1, presenceAverage: 50, averageScore: 4.25 });
});

test("último treino distingue ausência de registros e notas de valores zero", () => {
  const empty = { recordCount: 0, presentCount: 0, presenceAverage: null, averageScore: null };
  assert.deepEqual(getLastTrainingStats(), empty);
  assert.deepEqual(getLastTrainingStats({ athletes: {} }), empty);
  assert.deepEqual(getLastTrainingStats({ athletes: { a: { present: false, ratings: { Técnica: 0 } } } }),
    { recordCount: 1, presentCount: 0, presenceAverage: 0, averageScore: 0 });
  assert.deepEqual(getLastTrainingStats({ athletes: { a: { present: true, ratings: {} } } }),
    { recordCount: 1, presentCount: 1, presenceAverage: 100, averageScore: null });
});
