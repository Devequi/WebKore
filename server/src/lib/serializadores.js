import { evaluationFromRatings, getTeamCriteria, normalizeModality, qualitativeFields } from "../../../shared/criteria.js";
import { HttpError } from "./validacao.js";

const trainingTypeToApi = {
  Fisico: "PHYSICAL",
  "Físico": "PHYSICAL",
  Coletivo: "COLLECTIVE",
  Misto: "MIXED",
  PHYSICAL: "PHYSICAL",
  COLLECTIVE: "COLLECTIVE",
  MIXED: "MIXED"
};

const trainingTypeToClient = {
  PHYSICAL: "Físico",
  COLLECTIVE: "Coletivo",
  MIXED: "Misto"
};

export function normalizeRole(role) {
  const value = typeof role === "string" ? role.trim().toUpperCase() : "";
  return ["ATHLETE", "COACH"].includes(value) ? value : null;
}

export function normalizeStatus(status) {
  const value = typeof status === "string" ? status.trim().toUpperCase() : "";
  return ["PENDING", "APPROVED", "REJECTED"].includes(value) ? value : null;
}

export function normalizeTrainingType(type) {
  return trainingTypeToApi[String(type || "").trim()] || null;
}

export function toDateOnly(value) {
  if (!value) return undefined;
  return new Date(value).toISOString().slice(0, 10);
}

export function toPublicUser(user, membership) {
  if (!user) return null;

  return {
    id: user.id,
    role: String(user.role).toLowerCase(),
    name: user.name,
    email: user.email,
    photo: user.photoUrl || user.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase(),
    number: membership?.number ?? undefined,
    position: membership?.position ?? undefined,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export function toClientTeam(team) {
  return {
    id: team.id,
    name: team.name,
    modality: normalizeModality(team.modality) || team.modality,
    code: team.code,
    coachId: team.coachId,
    objectiveCriteria: getTeamCriteria(team, "objective"),
    qualitativeCriteria: getTeamCriteria(team, "qualitative"),
    athletes: team.memberships
      ?.filter((membership) => membership.status === "APPROVED")
      .map((membership) => toPublicUser(membership.athlete, membership)),
    coach: toPublicUser(team.coach),
    createdAt: team.createdAt,
    updatedAt: team.updatedAt
  };
}

export function toClientMembership(membership) {
  return {
    id: membership.id,
    teamId: membership.teamId,
    athleteId: membership.athleteId,
    status: String(membership.status).toLowerCase(),
    number: membership.number ?? null,
    position: membership.position ?? null,
    createdAt: membership.createdAt,
    updatedAt: membership.updatedAt
  };
}

export function toClientTraining(training, team) {
  const criteria = getTeamCriteria(team, "qualitative").slice(0, 4);

  return {
    id: training.id,
    teamId: training.teamId,
    date: toDateOnly(training.date),
    type: trainingTypeToClient[training.type] || training.type,
    description: training.description || "",
    athletes: Object.fromEntries(
      (training.records || []).map((record) => [
        record.athleteId,
        {
          id: record.id,
          present: record.present,
          metrics: Object.fromEntries((record.metrics || []).map((metric) => [metric.name, metric.value])),
          ratings: Object.fromEntries(
            criteria.map((name, index) => [
              name,
              record.evaluation?.[qualitativeFields[index]] ?? 5
            ])
          )
        }
      ])
    ),
    createdAt: training.createdAt,
    updatedAt: training.updatedAt
  };
}

export function evaluationDataFromRatings(ratings = {}, team, defaults = true) {
  try { return evaluationFromRatings(ratings, team, defaults); }
  catch (error) { throw new HttpError(400, error.message); }
}
