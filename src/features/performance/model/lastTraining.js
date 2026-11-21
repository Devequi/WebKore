import { recordScore } from "../../../../shared/evaluations.js";
import { average } from "../../../utils/formatters.js";
import { ratingEntries } from "./athletePerformance.js";

export function getLastTrainingStats(training) {
  const records = Object.values(training?.athletes || {});
  const scores = records.flatMap((record) => {
    const entries = ratingEntries(record);
    const score = entries.length ? recordScore(record) : null;
    return Number.isFinite(score) ? [score] : [];
  });
  const presentCount = records.filter((record) => record?.present === true).length;
  return {
    recordCount: records.length,
    presentCount,
    presenceAverage: records.length ? presentCount / records.length * 100 : null,
    averageScore: scores.length ? average(scores) : null
  };
}
