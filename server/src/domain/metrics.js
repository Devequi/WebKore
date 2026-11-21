// SportMetric stores nonnegative counts in a required Int column. Reserve -1 for
// an explicit clear so legacy metric rows keep their identity and routing.
const clearedMetric = -1;

export const toStoredMetric = (value) => value === null ? clearedMetric : value;
export const fromStoredMetric = (value) => value === clearedMetric ? null : (value ?? null);
