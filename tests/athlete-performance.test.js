import assert from "node:assert/strict";
import test from "node:test";
import { athletePerformance, filterEvolution, ratingEntries, scoreLabel } from "../src/utils/athletePerformance.js";
import { toClientTraining } from "../server/src/lib/serializadores.js";
import { getAthleteStats, getAthleteTrainings } from "../src/utils/selectors.js";

const training = (id, date, ratings, present = true) => ({ id, teamId: "t", date, athletes: { a: { present, ratings } } });
test("serialização não inventa notas quando a avaliação ou um critério não existe", () => {
  const team = { qualitativeCriteria: ["Técnica", "Físico"] };
  const result = toClientTraining({ records: [{ athleteId: "a" }, { athleteId: "b", evaluation: { technique: 0 } }] }, team);
  assert.deepEqual(result.athletes.a.ratings, {});
  assert.deepEqual(result.athletes.b.ratings, { Técnica: 0 });
});
test("resumo preserva zeros, ignora notas ausentes e compara apenas o mesmo critério", () => {
  const trainings = [training("3", "2026-10-20", { Técnica: 8, Físico: 4 }), training("2", "2026-10-15", {}),
    training("1", "2026-09-20", { Técnica: 0, Físico: 2 }, false)];
  const result = athletePerformance(trainings, "a");
  assert.equal(result.evaluationCount, 2);
  assert.equal(result.averageScore, 3.5);
  assert.equal(Math.round(result.presenceAverage), 67);
  assert.equal(result.improvement.name, "Técnica");
  assert.equal(result.improvement.change, 8);
  assert.equal(result.best.average, 4);
  assert.deepEqual(result.observations[1].ratings, {});
  assert.equal(getAthleteStats({ trainings }, "t", "a").averageScore, 3.5);
  assert.deepEqual(ratingEntries({ ratings: { A: null, B: "2", C: -1, D: 11, E: 0, F: 10 } }), [["E", 0], ["F", 10]]);
});
test("estados vazio, único, datas iguais e critérios sem comparação não geram tendência", () => {
  const empty = athletePerformance([], "a");
  assert.equal(empty.averageScore, null);
  assert.equal(empty.presenceAverage, null);
  assert.equal(scoreLabel(null), "Sem avaliação");
  assert.equal(scoreLabel(0), "0,0/10");
  assert.equal(athletePerformance([training("1", "2026-10-20", { A: 0 })], "a").summaries[0].change, null);
  const result = athletePerformance([training("1", "2026-10-20", { A: 2 }), training("2", "2026-10-20", { A: 5, B: 7 })], "a");
  assert.equal(result.improvement, undefined);
  assert.equal(athletePerformance([training("1", "invalid", { A: 5 })], "a").evaluationCount, 0);
});
test("períodos usam datas civis, incluem o limite e isolam equipe e atleta", () => {
  const points = ["2026-07-22", "2026-09-20", "2026-09-21", "2026-10-20", "2026-10-21"].map((date) => ({ date }));
  assert.deepEqual(filterEvolution(points, "30", "2026-10-20").map((point) => point.date), ["2026-09-21", "2026-10-20"]);
  assert.equal(filterEvolution(points, "90", "2026-10-20").length, 3);
  assert.equal(filterEvolution(points, "all", "2026-10-20").length, 5);
  const state = { trainings: [training("1", "2026-10-20", { A: 5 }), { ...training("2", "2026-10-20", { A: 10 }), teamId: "other" }, { id: "3", teamId: "t" }] };
  assert.equal(getAthleteTrainings(state, "t", "a").length, 1);
});

test("transformação do gráfico preserva treinos repetidos, zeros, lacunas e nomes especiais", async () => {
  const { evolutionPlot } = await import("../src/utils/athletePerformance.js");
  const points = [
    { trainingId: "b", date: "2026-10-20", title: "Treino dois", ratings: { "Técnica.avançada": 0, all: 10 } },
    { trainingId: "missing", date: "2026-10-19", ratings: {} },
    { trainingId: "a", date: "2026-10-20", ratings: { "Técnica.avançada": 2.75 } },
    { trainingId: "invalid", date: "invalid", ratings: { "Técnica.avançada": 6 } }
  ];
  const plot = evolutionPlot(points, ["Técnica.avançada", "all", "Sem notas"]);
  assert.deepEqual(plot.data.map((point) => point.trainingId), ["missing", "a", "b"]);
  assert.deepEqual(plot.data.map((point) => point.score0), [null, 2.75, 0]);
  assert.deepEqual(plot.data.map((point) => point.score1), [null, null, 10]);
  assert.deepEqual(plot.data.map((point) => point.score2), [null, null, null]);
  assert.equal(plot.data.at(-1).title, "Treino dois");
  assert.equal(points.length, 4);
});

test("médias parciais mantêm peso por avaliação e tendências distinguem falta de dados de queda", () => {
  const result = athletePerformance([
    training("first", "2026-09-20", { A: 0, B: 10 }),
    training("second", "2026-10-20", { A: 4 }),
    training("same-date", "2026-10-20", { C: 5 }),
    { id: "other", date: "2026-10-21", athletes: { b: { ratings: { A: 10 } } } }
  ], "a");
  assert.equal(result.averageScore, 14 / 3);
  assert.equal(result.evaluationCount, 3);
  assert.equal(result.best.name, "B");
  assert.equal(result.hasComparableEvaluations, true);
  assert.equal(result.improvement.name, "A");
  assert.equal(result.improvement.change, 4);
  const falling = athletePerformance([training("1", "2026-09-20", { A: 8 }), training("2", "2026-10-20", { A: 2 })], "a");
  assert.equal(falling.hasComparableEvaluations, true);
  assert.equal(falling.improvement, undefined);
  assert.equal(athletePerformance([], "a").hasComparableEvaluations, false);
});

test("remover critério mantém treinos e remove sua série sem reaproveitar notas de outro critério", async () => {
  const { evolutionPlot } = await import("../src/utils/athletePerformance.js");
  const points = [{ trainingId: "one", date: "2026-10-20", ratings: { Removido: 10, Atual: 0 } }];
  const plot = evolutionPlot(points, ["Atual", "Ainda sem nota"]);
  assert.deepEqual(plot.series.map((item) => item.name), ["Atual", "Ainda sem nota"]);
  assert.equal(plot.data[0].score0, 0);
  assert.equal(plot.data[0].score1, null);
  assert.deepEqual(evolutionPlot(points, []).series, []);
});
