import assert from "node:assert/strict";
import { test } from "node:test";
import { individualEvolution, individualSeries } from "../src/utils/individualEvolution.js";

const team = { id: "team", modality: "Futsal" };
const athlete = { id: "athlete", position: "Ala" };
const today = "2026-11-16";
const outfield = { role: "OUTFIELD", modality: "Futsal", position: "Ala", present: true };
const keeper = { ...outfield, role: "GOALKEEPER", position: "Goleiro" };
const training = (id, date, record, teamId = team.id) => ({ id, date, teamId, athletes: { athlete: record } });
const evolution = (trainings, overrides) => individualEvolution({ trainings, athlete, team, period: "all", today, ...overrides });

test("média usa as regras salvas e compara apenas avaliações válidas dentro do período", () => {
  const trainings = [
    training("recent", "2026-11-15", { ...outfield, ratings: { Técnica: 8, Participação: 10, Inválida: 11 } }),
    training("absent", "2026-11-12", { ...outfield, present: false, ratings: { Técnica: 3 } }),
    training("gap", "2026-11-10", { ...outfield, evaluationSource: "AVERAGE", finalScore: null, ratings: { Técnica: 6 } }),
    training("zero", "2026-11-05", { ...outfield, ratings: { Técnica: 0 } }),
    training("weighted", "2026-09-03", { ...outfield, evaluationSource: "WEIGHTED", finalScore: 6.75, ratings: { Técnica: 4 } }),
    training("old", "2026-06-10", { ...outfield, ratings: { Técnica: 7 } }),
    training("other-team", "2026-11-16", outfield, "other"),
    { ...training("other-athlete", "2026-11-16", outfield), athletes: { other: outfield } }
  ];
  const period30 = evolution(trainings, { period: "30" });
  const recent = individualSeries(period30.rows, period30.modes.average[0]);
  assert.deepEqual(recent.data.map((row) => row.value), [0, null, 9]);
  assert.deepEqual(recent.table.map((row) => row.trainingId), ["zero", "gap", "absent", "recent"]);
  assert.equal(recent.change, 9);
  const period90 = evolution(trainings, { period: "90" });
  assert.equal(individualSeries(period90.rows, period90.modes.average[0]).change, 2.25);
  const all = evolution(trainings);
  assert.equal(individualSeries(all.rows, all.modes.average[0]).change, 2);
});

test("futsal mantém perfis separados e acompanha o mesmo critério após renomeação", () => {
  const criteria = [
    { id: "placement", name: "Posicionamento em quadra", kind: "QUALITATIVE", order: 0 },
    { id: "goals", name: "Gols", kind: "QUANTITATIVE", order: 0 }
  ];
  const measure = (criterionId, name, role, value) => ({ criterionId, name, role, value });
  const trainings = [
    training("old", "2026-08-01", { ...outfield, criteriaSnapshot: [{ criterionId: "placement", name: "Posicionamento", score: 7 }],
      measurements: [measure("goals", "Gols", "OUTFIELD", 15), measure("saves", "Defesas", "GOALKEEPER", 20)] }),
    training("recent", "2026-11-08", { ...outfield, position: "Fixo",
      criteriaSnapshot: [{ criterionId: "placement", name: "Posicionamento em quadra", score: 9 },
        { criterionId: "archived", name: "Posicionamento em quadra", score: 2 }],
      measurements: [measure("goals", "Gols", "OUTFIELD", 20)] }),
    training("keeper", "2026-11-09", { ...keeper, measurements: [measure("saves", "Defesas", "GOALKEEPER", 22)],
      goalkeeperIndicators: { defensiveEfficiency: 70 } }),
    training("legacy", "2026-11-11", { present: true, ratings: { Técnica: 8 } })
  ];
  const options = { team: { ...team, evaluationProfiles: [{ schemaVersion: 2, modality: "Futsal", role: "OUTFIELD", criteria }] } };
  const { rows, modes, outsideProfile } = evolution(trainings, options);
  assert.equal(outsideProfile, 2);
  assert.deepEqual(modes.qualitative.map((item) => item.id), ["criterion:placement", "criterion:archived"]);
  assert.deepEqual(individualSeries(rows, modes.qualitative[0]).data.map((row) => row.value), [7, 9]);
  assert.equal(individualSeries(rows, modes.qualitative[1]).change, null);
  assert.equal(individualSeries(rows, modes.quantitative[0]).change, 5);
  assert.deepEqual(modes.quantitative.map(({ label, unit }) => [label, unit]), [["Gols", "count"]]);

  const goalkeeper = evolution(trainings, { ...options, athlete: { ...athlete, position: "Goleiro" } });
  assert.equal(goalkeeper.isGoalkeeper, true);
  const rate = goalkeeper.modes.statistics.find((item) => item.unit === "percent");
  assert.equal(rate.label, "Eficiência defensiva");
  assert.deepEqual(individualSeries(goalkeeper.rows, rate).data.map((row) => row.value), [70]);
  assert.equal(individualSeries(goalkeeper.rows, rate).change, null);
  assert.ok(goalkeeper.modes.quantitative.every((item) => item.label !== "Gols"));
});

test("goleiro distingue medidas de perfil de estatísticas com nomes iguais e mantém o histórico", () => {
  const criteria = [
    { id: "goals", name: "Gols sofridos", kind: "QUANTITATIVE", order: 0 },
    { id: "reflection", name: "Leitura de jogo", kind: "QUALITATIVE", order: 0 }
  ];
  const options = {
    athlete: { ...athlete, position: "Goleiro" },
    team: { ...team, evaluationProfiles: [{ schemaVersion: 2, modality: "Futsal", role: "GOALKEEPER", criteria }] }
  };
  const goals = (value) => ({ criterionId: "goals", name: "Gols sofridos", role: "GOALKEEPER", value });
  const trainings = [
    training("legacy", "2026-08-29", { ...keeper, metrics: { Defesas: 9 }, ratings: { Técnica: 4 } }),
    training("older", "2026-09-01", { ...keeper, measurements: [goals(0),
      { criterionId: "old", name: "Saídas", role: "GOALKEEPER", value: 5 }],
      goalkeeperStats: { goalsConceded: 2, saves: 12 }, goalkeeperIndicators: { defensiveEfficiency: 85 } }),
    training("newer", "2026-11-13", { ...keeper, measurements: [goals(3)],
      goalkeeperStats: { goalsConceded: 0, saves: null }, goalkeeperIndicators: { defensiveEfficiency: null } })
  ];
  const all = evolution(trainings, options);
  const { rows, modes } = all;
  assert.deepEqual(modes.qualitative.map((item) => item.label), ["Leitura de jogo"]);
  assert.deepEqual(modes.quantitative.map((item) => item.label), ["Gols sofridos", "Saídas"]);
  assert.deepEqual(individualSeries(rows, modes.quantitative[0]).data.map((row) => row.value), [null, 0, 3]);
  const recordedGoals = modes.statistics.find((item) => item.label === "Gols sofridos (estatística)");
  assert.deepEqual(individualSeries(rows, recordedGoals).data.map((row) => row.value), [null, 2, 0]);
  assert.equal(individualSeries(rows, modes.statistics.find((item) => item.label === "Defesas (histórico)")).count, 1);
  assert.equal(individualSeries(rows, modes.average[0]).data[0].value, 4);
  const recent = evolution(trainings, { ...options, period: "30" });
  assert.deepEqual(recent.modes.statistics, [recordedGoals]);
  assert.deepEqual(recent.modes.quantitative.map((item) => item.label), ["Gols sofridos"]);
});

test("outras modalidades preservam critérios e contagens do histórico legado", () => {
  const trainings = [
    training("old", "2026-04-03", { present: true, ratings: { Aces: 5 }, metrics: { Aces: 17 } }),
    training("blank", "2026-09-01", { present: true, ratings: { Aces: 7 }, metrics: { Aces: null } }),
    training("recent", "2026-11-03", { present: true, ratings: { Aces: 9 }, metrics: { Aces: 0 } })
  ];
  const result = evolution(trainings, { team: { ...team, modality: "Vôlei", qualitativeCriteria: ["Aces"] } });
  assert.equal(individualSeries(result.rows, result.modes.qualitative[0]).change, 4);
  const aces = individualSeries(result.rows, result.modes.quantitative.find((item) => item.label === "Aces"));
  assert.deepEqual(aces.data.map((row) => row.value), [17, null, 0]);
  assert.equal(aces.change, -17);
});
