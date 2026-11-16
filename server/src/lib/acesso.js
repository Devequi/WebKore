export const profileInclude = { evaluationProfiles: { where: { schemaVersion: 2, role: { in: ["OUTFIELD", "GOALKEEPER"] } }, include: { criteria: { where: { archived: false }, orderBy: { order: "asc" } } } } };
export const recordInclude = { evaluation: { include: { criteria: { orderBy: { order: "asc" } } } }, metrics: true, goalkeeperStats: true, measurements: { orderBy: { order: "asc" } } };
// Projeções explícitas: hashes nunca são carregados pelas consultas de sessão/equipe.
export const publicUserSelect = { id: true, name: true, email: true, role: true, photoUrl: true, birthDate: true, createdAt: true, updatedAt: true };
export const coachIdentitySelect = { id: true, name: true, role: true, photoUrl: true };
export function visibleTeams(user) {
  return user.role === "COACH" ? { coachId: user.id } : { memberships: { some: { athleteId: user.id } } };
}
export function teamRelations(user) {
  return { ...profileInclude, coach: { select: user.role === "COACH" ? publicUserSelect : coachIdentitySelect },
    memberships: { ...(user.role === "ATHLETE" ? { where: { athleteId: user.id } } : {}),
      include: { athlete: { select: publicUserSelect } } } };
}
export function visibleRecords(user) {
  return { ...(user.role === "ATHLETE" ? { where: { athleteId: user.id } } : {}),
    include: recordInclude };
}
export function visibleTrainings(user) {
  return user.role === "COACH" ? { team: { coachId: user.id } } : {
    team: { memberships: { some: { athleteId: user.id, status: "APPROVED" } } },
    records: { some: { athleteId: user.id } }
  };
}
