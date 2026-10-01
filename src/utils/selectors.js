import { average } from "./formatters.js";

export function getCoachTeams(state, coachId) {
  return state.teams.filter((team) => team.coachId === coachId);
}

export function getAthleteTeams(state, athleteId) {
  const approvedTeamIds = state.memberships
    .filter((membership) => membership.athleteId === athleteId && membership.status === "approved")
    .map((membership) => membership.teamId);
  return state.teams.filter((team) => approvedTeamIds.includes(team.id));
}

export function getApprovedAthletes(state, teamId) {
  const athleteIds = state.memberships
    .filter((membership) => membership.teamId === teamId && membership.status === "approved")
    .map((membership) => membership.athleteId);
  return state.users.filter((user) => athleteIds.includes(user.id)).map((user) => {
    const membership = state.memberships.find((item) => item.teamId === teamId && item.athleteId === user.id);
    return { ...user,
      number: Object.hasOwn(membership, "number") ? membership.number : user.number,
      position: Object.hasOwn(membership, "position") ? membership.position : user.position
    };
  });
}

export function getPendingAthletes(state, teamId) {
  const athleteIds = state.memberships
    .filter((membership) => membership.teamId === teamId && membership.status === "pending")
    .map((membership) => membership.athleteId);
  return state.users.filter((user) => athleteIds.includes(user.id));
}

export function getTeamTrainings(state, teamId) {
  return state.trainings
    .filter((training) => training.teamId === teamId)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

export function getAthleteTrainings(state, teamId, athleteId) {
  return getTeamTrainings(state, teamId).filter((training) => Boolean(training.athletes[athleteId]));
}

export function getRecordAverage(record) {
  return average(Object.values(record?.ratings || {}));
}

export function getTeamStats(state, teamId) {
  const athletes = getApprovedAthletes(state, teamId);
  const trainings = getTeamTrainings(state, teamId);
  const presenceValues = trainings.flatMap((training) =>
    Object.values(training.athletes).map((record) => (record.present ? 100 : 0))
  );
  const ratingValues = trainings.flatMap((training) => Object.values(training.athletes).map(getRecordAverage));
  const bestAthlete = athletes
    .map((athlete) => ({
      ...athlete,
      score: getAthleteStats(state, teamId, athlete.id).averageScore
    }))
    .sort((a, b) => b.score - a.score)[0];

  return {
    athletesCount: athletes.length,
    trainingsCount: trainings.length,
    presenceAverage: average(presenceValues),
    averageScore: average(ratingValues),
    bestAthlete,
    lastTraining: trainings[0]
  };
}

export function getAthleteStats(state, teamId, athleteId) {
  const trainings = getAthleteTrainings(state, teamId, athleteId);
  const records = trainings.map((training) => training.athletes[athleteId]);
  const presenceAverage = average(records.map((record) => (record.present ? 100 : 0)));
  const averageScore = average(records.filter((record) => record.present).map(getRecordAverage));

  return {
    trainingsCount: trainings.length,
    presenceAverage,
    averageScore
  };
}

export function getTeamEvolution(state, teamId) {
  return getTeamTrainings(state, teamId)
    .slice()
    .reverse()
    .map((training) => ({
      trainingId: training.id,
      date: training.date,
      recordCount: Object.keys(training.athletes).length,
      name: new Date(`${training.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      desempenho: Math.round(average(Object.values(training.athletes).map(getRecordAverage))),
      presenca: Math.round(average(Object.values(training.athletes).map((record) => (record.present ? 100 : 0))))
    }));
}

export function getAthleteEvolution(state, teamId, athleteId) {
  return getAthleteTrainings(state, teamId, athleteId)
    .slice()
    .reverse()
    .map((training) => ({
      name: new Date(`${training.date}T12:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      desempenho: Math.round(getRecordAverage(training.athletes[athleteId]) * 10),
      presenca: training.athletes[athleteId].present ? 100 : 0
    }));
}
