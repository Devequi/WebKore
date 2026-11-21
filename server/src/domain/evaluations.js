import { normalizeModality } from "../../../shared/criteria.js";
import { criteriaFor, validateMeasurements, evaluationRole, profileFor, arithmeticEvaluation, weightedEvaluation, validateGoalkeeperStats } from "../../../shared/evaluations.js";
import { evaluationDataFromRatings } from "../lib/serializers.js";
import { HttpError } from "../lib/validation.js";

export function recordContext(team, membership) {
  return { modalitySnapshot: normalizeModality(team.modality) || team.modality,
    positionSnapshot: membership?.position || null, roleSnapshot: evaluationRole(team.modality, membership?.position) };
}
export function prepareEvaluation(record, team, ratings, existing) {
  try {
    if (!ratings || typeof ratings !== "object" || Array.isArray(ratings)) throw new Error("Avaliações inválidas.");
    if (["WEIGHTED", "AVERAGE"].includes(existing?.source) || (!existing && normalizeModality(record.modalitySnapshot) === "Futsal")) {
      const role = existing?.role || record.roleSnapshot;
      const position = existing?.position || record.positionSnapshot;
      if (position && evaluationRole("Futsal", position) !== role) throw new Error("O perfil não corresponde à posição registrada do atleta.");
      if (!role) throw new Error("Defina a posição do atleta antes de avaliá-lo no futsal.");
      const profile = existing?.criteria?.length ? existing.criteria : profileFor({ ...team, modality: "Futsal" }, role, record.positionSnapshot);
      const previous = Object.fromEntries((existing?.criteria || []).map((item) => [item.name, item.score]));
      const calculated = (existing?.source === "WEIGHTED" ? weightedEvaluation : arithmeticEvaluation)(profile, { ...previous, ...ratings });
      return { source: existing?.source === "WEIGHTED" ? "WEIGHTED" : "AVERAGE", modality: existing?.modality || record.modalitySnapshot,
        position: existing?.position || record.positionSnapshot, role, finalScore: calculated.finalScore,
        criteria: { create: calculated.criteria } };
    }
    return evaluationDataFromRatings(ratings, team, !existing);
  } catch (error) { throw new HttpError(400, error.message); }
}
export function prepareStats(record, stats, existing) {
  if (record.roleSnapshot !== "GOALKEEPER" && record.evaluation?.role !== "GOALKEEPER") throw new HttpError(400, "Estatísticas de goleiro exigem um registro de goleiro de futsal.");
  try {
    if (!stats || typeof stats !== "object" || Array.isArray(stats)) throw new Error("Estatísticas inválidas.");
    return validateGoalkeeperStats({ ...existing, ...stats });
  }
  catch (error) { throw new HttpError(400, error.message); }
}

export function prepareMeasurements(record, team, values = {}, legacyMetrics) {
  try {
    if (!values || typeof values !== "object" || Array.isArray(values)) throw new Error("Medidas inválidas.");
    const modality = record.evaluation?.modality || record.modalitySnapshot;
    const role = record.evaluation?.role || record.roleSnapshot;
    const position = record.evaluation?.position || record.positionSnapshot;
    if (evaluationRole(modality, position) !== role || !role) throw new Error("Defina uma posição válida para registrar medidas do perfil.");
    const criteria = record.measurementsInitialized ? record.measurements : criteriaFor({ ...team, modality }, role, "QUANTITATIVE");
    if (legacyMetrics !== undefined) {
      values = { ...values };
      for (const [name, value] of Object.entries(legacyMetrics)) {
        const item = criteria.find((criterion) => criterion.name === name);
        if (!item) throw new Error("Medida não pertence ao perfil registrado para este atleta.");
        values[item.criterionId || item.id] = value;
      }
    }
    return validateMeasurements(criteria, values).map((item) => ({ ...item, role }));
  } catch (error) { throw new HttpError(400, error.message); }
}
