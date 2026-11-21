import { getTeamCriteria, normalizeModality } from "./criteria.js";
import { criteriaFor, evaluationRole } from "./evaluations.js";
import { isDateOnly } from "./birthDate.js";

export function configuredMetrics(team, position) {
  const futsal = normalizeModality(team.modality) === "Futsal";
  const role = evaluationRole(team.modality, position);
  return ["qualitative", "quantitative"].flatMap(kind => {
    const score = kind === "qualitative";
    const criteria = futsal ? criteriaFor(team, role, score ? "QUALITATIVE" : "QUANTITATIVE") || []
      : getTeamCriteria(team, score ? "qualitative" : "objective").map(name => ({ name }));
    return criteria.map(({ id, name }) => ({ id: id ? `criterion:${id}` : `${kind}:${name}`,
      label: name, kind, unit: score ? "score" : "count" }));
  });
}

export function validGoal(target, direction, deadline, unit) {
  return Number.isFinite(target) && target >= 0 && (unit === "score" ? target <= 10 : target <= 2147483647)
    && ["atLeast", "atMost"].includes(direction) && (deadline === null || isDateOnly(deadline));
}

// A meta acompanha a média dos registros do perfil até o prazo (ou até hoje).
export function goalProgress(goal, rows, today) {
  const end = goal.deadline && goal.deadline < today ? goal.deadline : today;
  const values = rows.filter(row => row.date <= end).map(row => row.scores.get(goal.metric)).filter(Number.isFinite);
  if (!values.length) return { average: null, count: 0, status: "Sem dados" };
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const reached = goal.direction === "atMost" ? average <= goal.target : average >= goal.target;
  return { average, count: values.length, status: reached ? "Atingida" : goal.deadline && goal.deadline < today ? "Não atingida" : "Em andamento" };
}
