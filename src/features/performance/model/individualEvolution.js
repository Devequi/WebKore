import { getTeamCriteria, normalizeModality, criterionKey } from "../../../../shared/criteria.js";
import { criteriaFor, evaluationRole, goalkeeperFields, recordScore } from "../../../../shared/evaluations.js";
import { isDateOnly } from "../../../../shared/birthDate.js";
import { filterEvolution } from "./athletePerformance.js";

const keeperRates = { defensiveEfficiency: "Eficiência defensiva", distributionAccuracy: "Precisão das reposições", exitEfficiency: "Eficiência das saídas" };
const keeperNames = new Set(["Defesas", "Saídas do gol", "Reposições certas", ...Object.values(goalkeeperFields)].map(criterionKey));
const averageMetric = { id: "average", label: "Média geral", unit: "score" };
const valid = (value, unit) => Number.isFinite(value) && value >= 0 &&
  (unit === "count" ? Number.isInteger(value) : value <= (unit === "score" ? 10 : 100));
const nameId = (kind, name) => `${kind}:${name}`;
const savedId = (kind, id, name) => id ? `criterion:${id}` : nameId(kind, name);

export function individualEvolution({ trainings, athlete, team, period, today }) {
  const modality = normalizeModality(team.modality);
  const futsal = modality === "Futsal";
  const role = evaluationRole(modality, athlete.position);
  const isGoalkeeper = role === "GOALKEEPER";
  const base = { qualitative: new Map(), quantitative: new Map(), statistics: new Map() };
  for (const [kind, unit, type] of [["qualitative", "score", "QUALITATIVE"], ["quantitative", "count", "QUANTITATIVE"]]) {
    const configured = futsal
      ? (criteriaFor(team, role, type) || []).map(({ id, name }) => ({ id: savedId(kind, id, name), label: name, unit }))
      : getTeamCriteria(team, kind === "qualitative" ? "qualitative" : "objective").map((name) => ({ id: nameId(kind, name), label: name, unit }));
    for (const metric of configured) base[kind].set(metric.id, metric);
  }

  const points = filterEvolution(trainings.filter((training) => training.teamId === team.id && isDateOnly(training.date)), period, today)
    .filter((training) => training.athletes?.[athlete.id])
    .slice().sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || "").localeCompare(b.createdAt || "") || a.id.localeCompare(b.id));
  let outsideProfile = 0;
  const rows = [];
  for (const training of points) {
    const record = training.athletes[athlete.id];
    const recordedModality = normalizeModality(record.modality);
    const recordedRole = record.role ?? evaluationRole(recordedModality || modality, record.position);
    if ((recordedModality && modality && recordedModality !== modality) || (futsal && recordedRole !== role)) {
      outsideProfile++;
      continue;
    }

    const scores = new Map();
    const remember = (kind, id, label, unit, value) => {
      if (!valid(value, unit)) return;
      if (!base[kind].has(id)) base[kind].set(id, { id, label, unit });
      scores.set(id, value);
    };

    if (record.present !== false) {
      const overall = recordScore(record);
      if (valid(overall, "score")) scores.set(averageMetric.id, overall);

      if (record.criteriaSnapshot?.length) {
        for (const item of record.criteriaSnapshot) remember("qualitative", savedId("qualitative", item.criterionId, item.name), item.name, "score", item.score);
      } else if (!isGoalkeeper) {
        for (const [name, value] of Object.entries(record.ratings || {})) remember("qualitative", nameId("qualitative", name), name, "score", value);
      }

      for (const item of record.measurements || []) {
        if (!futsal || item.role === role) remember("quantitative", savedId("quantitative", item.criterionId, item.name), item.name, "count", item.value);
      }
      for (const [name, value] of Object.entries(record.metrics || {})) {
        if (futsal && (!role || isGoalkeeper !== keeperNames.has(criterionKey(name)))) continue;
        if (isGoalkeeper) remember("statistics", nameId("statistics", name), `${name} (histórico)`, "count", value);
        else remember("quantitative", nameId("quantitative", name), name, "count", value);
      }
      if (isGoalkeeper) {
        for (const [key, name] of Object.entries(goalkeeperFields)) {
          const label = key === "goalsConceded" ? `${name} (estatística)` : name;
          remember("statistics", `keeper:${key}`, label, "count", record.goalkeeperStats?.[key]);
        }
        for (const [key, label] of Object.entries(keeperRates)) remember("statistics", `rate:${key}`, label, "percent", record.goalkeeperIndicators?.[key]);
      }
    }
    rows.push({ trainingId: training.id, date: training.date, title: training.title || null, type: training.type,
      present: record.present, scores });
  }

  function options(map) {
    const labels = new Map();
    return [...map.values()].map((item) => {
      const count = labels.get(item.label) || 0;
      labels.set(item.label, count + 1);
      return count ? { ...item, label: `${item.label} (histórico ${count})` } : item;
    });
  }
  return { rows, outsideProfile, isGoalkeeper, modes: { average: [averageMetric],
    qualitative: options(base.qualitative), quantitative: options(base.quantitative), statistics: options(base.statistics) } };
}

export function individualSeries(rows, metric) {
  const table = rows.map(({ scores, ...row }) => ({ ...row, value: scores.get(metric?.id) ?? null }));
  const data = table.filter((row) => row.present !== false);
  const observed = data.filter((row) => Number.isFinite(row.value));
  return { table, data, count: observed.length,
    change: observed.length >= 2 ? observed.at(-1).value - observed[0].value : null };
}
