// Hash URLs work on static hosts without requiring a server-side SPA rewrite.
export function parseRoute(hash = "") {
  const path = hash.replace(/^#/, "") || "/";
  if (path === "/") return { view: "root" };
  if (path === "/perfil") return { view: "profile" };
  if (path === "/login") return { view: "login" };
  const match = path.match(/^\/(coach|athlete)\/(teams|profile|search)(?:\/([A-Za-z0-9_-]{1,191})(?:\/(athletes|trainings|requests|evaluations|settings)(?:\/([A-Za-z0-9_-]{1,191}))?)?)?$/);
  if (!match) return { view: "not-found" };
  const [, role, section, teamId, detail, recordId] = match;
  if (section !== "teams" && teamId || recordId && !["athletes", "trainings"].includes(detail)) return { view: "not-found" };
  if (role === "coach" && section === "search" || role === "athlete" && detail &&
      (detail !== "trainings" || !recordId || recordId === "new")) return { view: "not-found" };
  if (section === "profile") return { view: "profile", redirect: "/perfil" };
  return { role, teamId, athleteId: detail === "athletes" ? recordId : undefined,
    trainingId: detail === "trainings" && recordId !== "new" ? recordId : undefined,
    createTraining: detail === "trainings" && recordId === "new",
    view: `${role}-${section === "teams" ? (teamId ? detail || "home" : "lobby") : section}` };
}

export function routePath(view, teamId = "", recordId = "") {
  if (view === "profile") return "/perfil";
  if (view === "login") return "/login";
  const [role, section] = view.split("-");
  const base = `/${role}`;
  if (section === "lobby") return `${base}/teams`;
  if (section === "profile") return "/perfil";
  if (section === "search") return `${base}/${section}`;
  if (!teamId) return `${base}/teams`;
  return `${base}/teams/${encodeURIComponent(teamId)}${section === "home" ? "" : `/${section}`}${recordId ? `/${encodeURIComponent(recordId)}` : ""}`;
}

export function routeError(route, state, session) {
  if (route.view === "not-found") return "Página não encontrada.";
  if (route.role && route.role !== session.role) return "Esta página não está disponível para seu perfil.";
  if (!route.teamId) return "";
  const team = state.teams.find(item => item.id === route.teamId);
  const allowed = session.role === "coach" ? team?.coachId === session.userId : state.memberships.some(item =>
    item.teamId === route.teamId && item.athleteId === session.userId && item.status === "approved");
  if (!team || !allowed) return "Equipe não encontrada ou acesso não autorizado.";
  if (route.athleteId && !state.memberships.some(item => item.teamId === team.id && item.athleteId === route.athleteId && item.status === "approved")) return "Atleta não encontrado nesta equipe.";
  if (route.trainingId && !state.trainings.some(item => item.teamId === team.id && item.id === route.trainingId &&
    (session.role === "coach" || item.athletes?.[session.userId]))) return "Treino não encontrado nesta equipe.";
  return "";
}
