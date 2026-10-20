import { average } from "./formatters.js";
import { ratingEntries } from "./athletePerformance.js";
import { isDateOnly } from "../../shared/birthDate.js";

export function teamPerformance(trainings, teamId) {
  const scoped = trainings.filter((training) => training.teamId === teamId && isDateOnly(training.date))
    .slice().sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  const samples = [];
  const presence = [];
  const observations = scoped.map((training) => {
    const ratings = new Map();
    for (const record of Object.values(training.athletes || {})) {
      if (typeof record.present === "boolean") presence.push(record.present ? 100 : 0);
      const entries = ratingEntries(record);
      if (entries.length) samples.push(entries);
      for (const [name, value] of entries) {
        if (!ratings.has(name)) ratings.set(name, []);
        ratings.get(name).push(value);
      }
    }
    return { trainingId: training.id, date: training.date, title: training.title || null, type: training.type,
      ratings: Object.fromEntries([...ratings].map(([name, values]) => [name, average(values)])) };
  });
  const criteria = [...new Set(samples.flatMap((entries) => entries.map(([name]) => name)))];
  const summaries = criteria.map((name) => {
    const values = samples.flatMap((entries) => entries.filter(([key]) => key === name).map(([, value]) => value));
    const points = observations.filter((point) => Number.isFinite(point.ratings[name]));
    const comparable = points.length > 1 && points[0].date !== points.at(-1).date;
    return { name, average: average(values), change: comparable ? points.at(-1).ratings[name] - points[0].ratings[name] : null };
  });
  return { observations, criteria, summaries, evaluationCount: samples.length,
    averageScore: samples.length ? average(samples.map((entries) => average(entries.map(([, value]) => value)))) : null,
    presenceAverage: presence.length ? average(presence) : null,
    hasComparableEvaluations: summaries.some((item) => item.change !== null),
    best: [...summaries].sort((a, b) => b.average - a.average)[0],
    improvement: summaries.filter((item) => item.change > 0).sort((a, b) => b.change - a.change)[0] };
}

export function coachOverview(state, coachId) {
  const teams = state.teams.filter((team) => team.coachId === coachId);
  const ids = new Set(teams.map((team) => team.id));
  return { teams, athletesCount: new Set(state.memberships.filter((item) => ids.has(item.teamId) && item.status === "approved").map((item) => item.athleteId)).size,
    trainingsCount: state.trainings.filter((training) => ids.has(training.teamId)).length,
    modalities: [...new Set(teams.map((team) => team.modality).filter(Boolean))] };
}
