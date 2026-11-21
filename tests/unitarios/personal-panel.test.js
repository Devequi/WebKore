import assert from "node:assert/strict";
import test from "node:test";
import { configuredMetrics, goalProgress, validGoal } from "../../shared/personalGoals.js";
import { comparePeriods, personalPanel } from "../../src/features/performance/model/personalPanel.js";
import { criteriaFor } from "../../shared/evaluations.js";
import { getAthleteTeams, getAthleteTrainings } from "../../src/app/state/selectors.js";

const team = { id: "t", modality: "Futsal" };
const today = "2026-11-21";
for (const [position, role] of [["Ala", "OUTFIELD"], ["Goleiro", "GOALKEEPER"]]) {
  test(`painel pessoal de ${position}: notas parciais, zero e frequência conhecida`, () => {
    const athlete = { id: "a", position };
    const criterion = criteriaFor(team, role, "QUALITATIVE")[0];
    const trainings = [0, 8, null].map((score, i) => ({ id: "w" + i, teamId: team.id, date: "2026-11-1" + i,
      athletes: { a: { present: [true, true, false][i], role, evaluationSource: "AVERAGE", finalScore: score,
        criteriaSnapshot: [{ name: criterion.name, criterionId: criterion.id, score }] } } }));
    trainings.push({ id: "empty", teamId: "t", date: today, athletes: { a: { role, present: null } } });
    const panel = personalPanel(team, athlete, trainings, today);
    assert.equal(panel.present, 2); assert.equal(panel.absent, 1);
    assert.equal(panel.attendance, 200 / 3); assert.equal(panel.evaluated.length, 2);
    assert.equal(panel.criteria[0].average, 4); assert.equal(panel.criteria[0].change, 8);
    assert.equal(panel.highlights.length, 0);
    assert.equal(panel.criteria[1].average, null);
    assert.equal(panel.criteria.some(c => c.label === "Reflexos"), role === "GOALKEEPER");
    assert.equal(configuredMetrics(team, null).length, 0);
  });
}
test("progresso considera zeros, prazo, alvo máximo e dados insuficientes", () => {
  const rows = [[today, 9], ["2026-10-01", 0], ["2026-10-02", null]].map(([date,v]) => ({ date, scores: new Map([["x",v],["average",v]]) }));
  const goal = { metric: "x", target: 7, direction: "atLeast", deadline: null };
  assert.deepEqual(goalProgress(goal, [], today), { average: null, count: 0, status: "Sem dados" });
  assert.deepEqual(goalProgress(goal, rows, today), { average: 4.5, count: 2, status: "Em andamento" });
  assert.equal(goalProgress({ ...goal, deadline: "2026-10-31" }, rows, today).status, "Não atingida");
  assert.equal(goalProgress({ ...goal, direction: "atMost", target: 0, deadline: "2026-10-31" }, rows, today).status, "Atingida");
  assert.equal(comparePeriods(rows, today, 30).change, 9);
  assert.equal(comparePeriods([], today, 30).change, null);
  assert.equal(validGoal(10.1, "atLeast", null, "score"), false);
  assert.equal(validGoal(2.5, "atMost", "2026-02-30", "count"), false);
});
test("painel respeita seleção entre equipes e permite perfil vazio", () => {
  const state = { teams: [team, { ...team, id: "b" }], memberships: ["b","t"].map(teamId => ({ athleteId: "a", teamId, status: "approved" })),
    trainings: [{ id: "w", teamId: "b", athletes: { a: { present: true } } }] };
  assert.equal(getAthleteTeams(state,"a").length, 2);
  assert.equal(getAthleteTeams(state,"other").length, 0);
  const panel = personalPanel(team, { id: "a", position: "Ala" }, getAthleteTrainings(state, team.id,"a"), today);
  assert.equal(panel.attendance, null); assert.deepEqual(panel.evaluated, []); assert.deepEqual(panel.rows, []);
});
