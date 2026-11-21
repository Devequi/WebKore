import { configuredMetrics } from "../../../../shared/personalGoals.js";
import { individualEvolution } from "./individualEvolution.js";
import { recordScore } from "../../../../shared/evaluations.js";

export const numberLabel = value => Number.isFinite(value) ? value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "—";
export const signed = value => Number.isFinite(value) ? `${value > 0 ? "+" : ""}${numberLabel(value)}` : "—";
export const mean = values => values.length ? values.reduce((sum, n) => sum + n, 0) / values.length : null;

export function personalPanel(team, athlete, trainings, today) {
  const { rows } = individualEvolution({ team, athlete, trainings, today, period: "all" });
  const metrics = configuredMetrics(team, athlete.position);
  const criteria = metrics.map(metric => {
    const history = rows.filter(row => Number.isFinite(row.scores.get(metric.id)));
    const values = history.map(row => row.scores.get(metric.id));
    const change = history.length >= 2 && history[0].date !== history.at(-1).date ? values.at(-1) - values[0] : null;
    return { ...metric, history, average: mean(values), change };
  });
  const highlights = criteria.filter(c => c.unit === "score" && c.history.length >= 3 && c.change !== null);
  const evaluated = trainings.filter(t => t.athletes[athlete.id]?.present !== false && recordScore(t.athletes[athlete.id]) !== null);
  const present = trainings.filter(t => t.athletes[athlete.id]?.present === true).length;
  const absent = trainings.filter(t => t.athletes[athlete.id]?.present === false).length;
  return { rows, criteria, highlights, evaluated, present, absent,
    attendance: present + absent ? present * 100 / (present + absent) : null };
}

export function comparePeriods(rows, today, days) {
  const start = new Date(today + "T12:00:00Z");
  const cutoff = offset => new Date(start.getTime() - offset * 86400000).toISOString().slice(0, 10);
  const current = cutoff(days - 1), previous = cutoff(2 * days - 1);
  const scores = subset => subset.map(row => row.scores.get("average")).filter(Number.isFinite);
  const recent = scores(rows.filter(r => r.date >= current && r.date <= today));
  const earlier = scores(rows.filter(r => r.date >= previous && r.date < current));
  return { recent, earlier, change: recent.length && earlier.length ? mean(recent) - mean(earlier) : null };
}
