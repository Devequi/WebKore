import { arithmeticEvaluation, criteriaFor, evaluationRole, initialRatings, profileFor, weightedEvaluation } from "../../../shared/evaluations.js";
import { normalizeModality } from "../../../shared/criteria.js";

export function evaluationProfile(record, team, athlete) {
  if (record.criteriaSnapshot?.length) return record.criteriaSnapshot;
  if (!record.modality || record.evaluationSource === "LEGACY" || normalizeModality(record.modality || team.modality) !== "Futsal") {
    const names = Object.keys(record.ratings || {});
    return (names.length ? names : (team.qualitativeCriteria || []).slice(0, 4)).map((name) => ({ name }));
  }
  const position = record.position || athlete.position;
  return profileFor({ ...team, modality: record.modality || team.modality }, record.role || evaluationRole(team.modality, position), position);
}
export function measurementProfile(record, team, athlete) {
  if (record.measurementsInitialized) return record.measurements || [];
  if (normalizeModality(record.modality) !== "Futsal") return [];
  const role = record.role || evaluationRole(record.modality, record.position || athlete.position);
  return criteriaFor({ ...team, modality: record.modality }, role, "QUANTITATIVE") || [];
}
export function evaluationDraft(record, profile) {
  return { present: record.present !== false, ratings: initialRatings(profile, record.ratings), confirmed: false, dirty: false,
    measurements: {}, measurementsDirty: false };
}
export function draftScore(record, profile, ratings) {
  try { return (record.evaluationSource === "WEIGHTED" ? weightedEvaluation : arithmeticEvaluation)(profile, ratings).finalScore; }
  catch { return null; }
}
