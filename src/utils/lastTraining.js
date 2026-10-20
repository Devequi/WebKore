import { average } from "./formatters.js";
import { getRecordAverage } from "./selectors.js";

export function getLastTrainingStats(training) {
  const records = Object.values(training?.athletes || {});
  const ratedRecords = records.filter((record) => Object.values(record.ratings || {}).some(Number.isFinite));
  const presentCount = records.filter((record) => record.present).length;
  return {
    recordCount: records.length,
    presentCount,
    presenceAverage: records.length ? presentCount / records.length * 100 : null,
    averageScore: ratedRecords.length ? average(ratedRecords.map(getRecordAverage)) : null
  };
}
