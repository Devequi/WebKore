import { recordScore } from "../../shared/evaluations.js";
import { average } from "./formatters.js";
import { ratingEntries } from "./athletePerformance.js";

export function getBestAthlete(athletes, trainings) {
  return athletes.map((athlete) => {
    const records = trainings.flatMap((training) => training?.athletes?.[athlete.id] ? [training.athletes[athlete.id]] : []);
    const scores = records.flatMap((record) => {
      const entries = ratingEntries(record);
      return entries.length ? [recordScore(record)] : [];
    });
    const presence = records.filter((record) => typeof record.present === "boolean");
    return { ...athlete, score: scores.length ? average(scores) : null, evaluationCount: scores.length,
      presenceAverage: presence.length ? average(presence.map((record) => record.present ? 100 : 0)) : null };
  }).filter((athlete) => athlete.evaluationCount > 0)
    .sort((a, b) => b.score - a.score || b.evaluationCount - a.evaluationCount ||
      (b.presenceAverage ?? -1) - (a.presenceAverage ?? -1))[0] ?? null;
}

export function getTrainingHighlight(training, athletes) {
  return getBestAthlete(athletes, training ? [training] : []);
}
