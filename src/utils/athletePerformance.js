import { average } from "./formatters.js";
import { isDateOnly } from "../../shared/birthDate.js";

export const scoreLabel = (value) => Number.isFinite(value)
  ? `${value.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/10` : "Sem avaliação";

export function ratingEntries(record) {
  return Object.entries(record?.ratings || {}).filter(([, value]) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10);
}

export function athletePerformance(trainings, athleteId) {
  const observations = trainings.filter((training) => isDateOnly(training.date) && training.athletes?.[athleteId])
    .map((training) => ({ trainingId: training.id, date: training.date, title: training.title || null, type: training.type || null,
      ratings: Object.fromEntries(ratingEntries(training.athletes[athleteId])) }))
    .sort((a, b) => a.date.localeCompare(b.date) || a.trainingId.localeCompare(b.trainingId));
  const evaluated = observations.filter((point) => Object.keys(point.ratings).length);
  const criteria = [...new Set(evaluated.flatMap((point) => Object.keys(point.ratings)))];
  const summaries = criteria.map((name) => {
    const values = evaluated.filter((point) => Number.isFinite(point.ratings[name]));
    // Duas observações na mesma data não definem uma evolução cronológica.
    const comparable = values.length > 1 && values[0].date !== values.at(-1).date;
    return { name, average: average(values.map((point) => point.ratings[name])),
      change: comparable ? values.at(-1).ratings[name] - values[0].ratings[name] : null };
  });
  const presence = trainings.map((training) => training.athletes?.[athleteId]?.present).filter((value) => typeof value === "boolean");
  return { observations, evaluated, criteria, summaries, evaluationCount: evaluated.length,
    averageScore: evaluated.length ? average(evaluated.map((point) => average(Object.values(point.ratings)))) : null,
    presenceAverage: presence.length ? average(presence.map((value) => value ? 100 : 0)) : null,
    best: [...summaries].sort((a, b) => b.average - a.average)[0],
    hasComparableEvaluations: summaries.some((item) => item.change !== null),
    improvement: summaries.filter((item) => item.change > 0).sort((a, b) => b.change - a.change)[0] };
}

// Chaves internas evitam tratar pontos nos nomes dos critérios como caminhos de objeto.
export function evolutionPlot(points, criteria) {
  const series = criteria.map((name, index) => ({ name, key: `score${index}` }));
  const data = points.filter((point) => isDateOnly(point.date))
    .slice().sort((a, b) => a.date.localeCompare(b.date) || a.trainingId.localeCompare(b.trainingId))
    .map((point) => ({ trainingId: point.trainingId, date: point.date, title: point.title, type: point.type,
      ...Object.fromEntries(series.map((item) => {
        const value = point.ratings?.[item.name];
        return [item.key, typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 10 ? value : null];
      })) }));
  return { series, data };
}

export function filterEvolution(points, period, today) {
  if (period === "all") return points;
  const cutoff = new Date(`${today}T12:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - Number(period) + 1);
  return points.filter((point) => point.date >= cutoff.toISOString().slice(0, 10) && point.date <= today);
}
