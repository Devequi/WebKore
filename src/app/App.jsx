import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, ClipboardList, Home, Settings, ShieldCheck, Target, Users } from "lucide-react";
import { AppShell } from "../components/layout/AppShell.jsx";
import { MobileNavigation, useCompactNavigation } from "../components/layout/MobileNavigation.jsx";
import { Button } from "../components/ui/Button.jsx";
import { AthleteLobby } from "../features/teams/AthleteLobby.jsx";
import { MyProfilePage } from "../features/profile/ProfilePage.jsx";
import { TeamSearch } from "../features/teams/TeamSearch.jsx";
import { CoachLobby } from "../features/teams/CoachLobby.jsx";
import { RequestsPage } from "../features/teams/RequestsPage.jsx";
import { LoginPage } from "../features/auth/LoginPage.jsx";
import { useWebKoreData } from "./state/useWebKoreData.js";
import { parseRoute, routePath, routeError } from "./navigation.js";
import { getAuthToken } from "../services/api.js";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { getAthleteTeams, getCoachTeams } from "./state/selectors.js";
import "../styles/experience.css";
import "../styles/coach-experience.css";

const AthleteDashboard = lazy(() => import("../features/performance/AthleteDashboard.jsx").then((page) => ({ default: page.AthleteDashboard })));
const AthletesPage = lazy(() => import("../features/athletes/AthletesPage.jsx").then((page) => ({ default: page.AthletesPage })));
const TeamHome = lazy(() => import("../features/performance/CoachDashboard.jsx").then((page) => ({ default: page.TeamHome })));
const TrainingsPage = lazy(() => import("../features/training/TrainingsPage.jsx").then((page) => ({ default: page.TrainingsPage })));
const EvaluationSettingsPage = lazy(() => import("../features/teams/TeamSettings.jsx").then((page) => ({ default: page.EvaluationSettingsPage })));
const SettingsPage = lazy(() => import("../features/teams/TeamSettings.jsx").then((page) => ({ default: page.SettingsPage })));
const TrainingDetails = lazy(() => import("../features/training/TrainingHistory.jsx").then((page) => ({ default: page.TrainingDetails })));

const coachTabs = [
  { id: "coach-home", label: "Visão geral", icon: Home, group: "Principal" },
  { id: "coach-athletes", label: "Atletas", icon: Users, group: "Principal" },
  { id: "coach-requests", label: "Solicitações", icon: ShieldCheck, group: "Principal" },
  { id: "coach-trainings", label: "Treinos", icon: ClipboardList, group: "Treinamento" },
  { id: "coach-evaluations", label: "Avaliações", icon: BarChart3, group: "Treinamento" },
  { id: "coach-lobby", label: "Minhas equipes", icon: Users, group: "Gerenciamento" },
  { id: "profile", label: "Meu Perfil", icon: Activity },
  { id: "coach-settings", label: "Configurações", icon: Settings, group: "Gerenciamento" }
];

const athleteTabs = [
  { id: "athlete-home", label: "Visão geral", icon: Home, group: "Principal" },
  { id: "athlete-performance", label: "Meu desempenho", icon: BarChart3, group: "Principal" },
  { id: "athlete-trainings", label: "Meus treinos", icon: ClipboardList, group: "Principal" },
  { id: "athlete-goals", label: "Minhas metas", icon: Target, group: "Acompanhamento" },
  { id: "athlete-lobby", label: "Minhas equipes", icon: Users, group: "Acompanhamento" },
  { id: "profile", label: "Meu perfil", icon: Activity }
];

function athleteTeamContext(teams, userId) {
  const savedId = sessionStorage.getItem(`webkore-team:${userId}`);
  return teams.find(team => team.id === savedId) || (teams.length === 1 ? teams[0] : null);
}

function LoadingState({ message = "Carregando página..." }) {
  return <div className="page-stack athlete-loading" role="status" aria-busy="true">
    <p>{message}</p><div className="athlete-loading__cards" aria-hidden="true"><span /><span /><span /></div>
    <div className="athlete-loading__panel" aria-hidden="true" />
  </div>;
}

export function App() {
  const [state, actions] = useWebKoreData();
  const compact = useCompactNavigation();
  const session = state.session || { role: "", userId: "" };
  const [route, setRoute] = useState(() => parseRoute(window.location.hash));
  const [navigationMessage, setNavigationMessage] = useState("");
  const activeView = route.view;
  const selectedAthleteId = route.athleteId || "";
  const selectedTrainingId = route.trainingId || "";
  const coachTeams = useMemo(() => getCoachTeams(state, session.userId), [state, session.userId]);
  const athleteTeams = useMemo(() => getAthleteTeams(state, session.userId), [state, session.userId]);
  const availableTeams = session.role === "coach" ? coachTeams : athleteTeams;
  useEffect(() => {
    if (session.role === "athlete" && athleteTeams.some(team => team.id === route.teamId)) {
      sessionStorage.setItem(`webkore-team:${session.userId}`, route.teamId);
    }
  }, [route.teamId, athleteTeams, session.role, session.userId]);
  const contextTeamId = route.teamId || (session.role === "athlete" && athleteTeamContext(athleteTeams, session.userId)?.id);
  const activeTeam = availableTeams.find((team) => team.id === contextTeamId) || null;

  function go(path, replace = false, message = "") {
    setNavigationMessage(message);
    if (window.location.hash !== `#${path}`) window.history[replace ? "replaceState" : "pushState"](null, "", `#${path}`);
    setRoute(parseRoute(`#${path}`));
  }

  useEffect(() => {
    const sync = () => { setNavigationMessage(""); setRoute(parseRoute(window.location.hash)); };
    window.addEventListener("popstate", sync);
    window.addEventListener("hashchange", sync);
    return () => { window.removeEventListener("popstate", sync); window.removeEventListener("hashchange", sync); };
  }, []);
  const currentUser = state.users.find((user) => user.id === session.userId);

  function withNotice(content) {
    return <>{navigationMessage && <p className="form-feedback form-feedback--success" role="status">{navigationMessage}</p>}{state.sessionMessage && <div className="form-feedback session-notice" role="status">
      <span>{state.sessionMessage}</span><Button type="button" variant="ghost" onClick={() => actions.refresh().catch(() => undefined)}>Atualizar painel</Button>
    </div>}{state.legal?.pending?.length > 0 && activeView !== "profile" && <p className="form-feedback" role="status">Há documentos legais para consultar. <button type="button" onClick={() => navigate("profile")}>Ver em Meu Perfil</button></p>}{content}</>;
  }

  useEffect(() => {
    if (state.loadingSession) return;
    if (route.redirect) { go(route.redirect, true); return; }
    if (state.session && ["root", "login"].includes(route.view)) go(routePath(`${session.role}-lobby`), true);
    else if (!state.session && !getAuthToken() && route.view !== "login") go("/login", true);
  }, [state.loadingSession, session.userId, session.role, route.view, route.redirect]);

  async function handleLogin(credentials) {
    try { const payload = await actions.login(credentials); go(routePath(`${payload.session.role}-lobby`), true); return { ok: true }; }
    catch (error) { return { ok: false, message: error.message }; }
  }

  async function handleRegister(payload) {
    try { const result = await actions.register(payload); go(routePath(`${result.session.role}-lobby`), true); return { ok: true }; }
    catch (error) { return { ok: false, message: error.message }; }
  }

  function openTeam(teamId) { go(routePath(`${session.role}-home`, teamId)); }
  async function logout() {
    try { await actions.logout(); go("/login", true); }
    catch { /* O aviso de falha permanece visível; o servidor não confirmou a revogação. */ }
  }
  function navigate(view) { go(routePath(view, contextTeamId)); }
  function setSelectedAthleteId(id, message) { go(routePath("coach-athletes", route.teamId, id), false, message); }

  const tabs = (session.role === "coach" ? coachTabs : athleteTabs).filter(tab => activeTeam || [ `${session.role}-lobby`, "profile" ].includes(tab.id));

  function lobbyHeader() {
    return compact ? <MobileNavigation tabs={tabs} activeView={activeView} onNavigate={navigate}
      onLogoClick={() => navigate(`${session.role}-lobby`)} onLogout={logout} currentUser={currentUser} /> : null;
  }

  if (state.loadingSession) return <main className="auth-page"><LoadingState message="Restaurando sessão..." /></main>;

  if (!state.session && getAuthToken() && state.sessionMessage) return <main className="auth-page">
    <section className="panel page-stack"><h1>Não foi possível restaurar sua sessão</h1>
      <p role="alert">{state.sessionMessage}</p>
      <Button onClick={() => actions.refresh().catch(() => undefined)}>Tentar novamente</Button>
      <Button variant="ghost" onClick={logout}>Voltar ao login</Button>
    </section>
  </main>;

  if (!state.session || !currentUser) {
    return <LoginPage onLogin={handleLogin} onRegister={handleRegister} notice={state.sessionMessage} />;
  }

  if (session.role === "coach" && activeView === "coach-lobby") {
    return withNotice(
      <CoachLobby
        header={lobbyHeader()}
        actions={actions}
        currentUser={currentUser}
        onLogout={logout}
        onOpenTeam={openTeam}
        state={state}
        teams={coachTeams}
        onProfile={() => navigate("profile")}
      />
    );
  }

  if (session.role === "athlete" && activeView === "athlete-lobby") {
    return withNotice(<AthleteLobby header={lobbyHeader()} selectedId={activeTeam?.id}
      currentUser={currentUser} actions={actions} onOpenTeam={openTeam} onSearch={() => navigate("athlete-search")}
      onProfile={() => navigate("profile")} onLogout={logout} state={state} teams={athleteTeams} />);
  }

  const error = routeError(route, state, session);
  if (error) return withNotice(<AppShell activeView={activeView} currentUser={currentUser}
    onLogoClick={() => navigate(`${session.role}-lobby`)} onLogout={logout} setActiveView={navigate} tabs={tabs}>
    <div className="page-stack"><EmptyState title="Página indisponível" text={error} />
    <Button onClick={() => navigate(`${session.role}-lobby`)}>Minhas equipes</Button></div>
  </AppShell>);

  return withNotice(
    <AppShell
      activeView={activeView}
      currentUser={currentUser}
      onLogoClick={() => navigate(`${session.role}-lobby`)}
      onLogout={logout}
      setActiveView={navigate}
      tabs={tabs}
      team={activeTeam}
    ><Suspense fallback={<LoadingState />}>
      {session.role === "coach" && activeView === "coach-home" && <TeamHome state={state} team={activeTeam}
        onOpenTraining={(trainingId) => {
          go(routePath("coach-trainings", route.teamId, trainingId));
        }} />}
      {session.role === "coach" && activeView === "coach-athletes" && (
        <AthletesPage key={route.teamId}
          actions={actions}
          onSelectAthlete={setSelectedAthleteId}
          selectedAthleteId={selectedAthleteId}
          state={state}
          team={activeTeam}
        />
      )}
      {session.role === "coach" && activeView === "coach-requests" && (
        <RequestsPage actions={actions} state={state} team={activeTeam} />
      )}
      {session.role === "coach" && activeView === "coach-trainings" && (
        <TrainingsPage key={route.teamId} actions={actions} state={state} team={activeTeam}
          initialTrainingId={selectedTrainingId} createMode={route.createTraining}
          onNavigateTraining={(id = "", message) => go(routePath("coach-trainings", route.teamId, id), false, message)} />
      )}
      {session.role === "coach" && activeView === "coach-evaluations" && (
        <EvaluationSettingsPage actions={actions} state={state} team={activeTeam} />
      )}
      {session.role === "coach" && activeView === "coach-settings" && (
        <SettingsPage key={route.teamId} onDeleted={() => go(routePath("coach-lobby"), true, "Equipe excluída.")} actions={actions} state={state} team={activeTeam} />
      )}
      {activeView === "profile" && <MyProfilePage key={session.userId} currentUser={currentUser} actions={actions} onLogout={logout} />}
      {session.role === "athlete" && ["athlete-home", "athlete-performance", "athlete-trainings", "athlete-goals"].includes(activeView) && !route.trainingId && (
        <AthleteDashboard key={`${session.userId}-${route.teamId}`} view={activeView} navigate={navigate} actions={actions} athleteId={session.userId} state={state} team={activeTeam}
          onOpenTraining={(id) => go(routePath("athlete-trainings", route.teamId, id))} />
      )}
      {session.role === "athlete" && activeView === "athlete-trainings" && route.trainingId && <TrainingDetails inline team={activeTeam}
        selected={state.trainings.find(item => item.id === route.trainingId && item.teamId === route.teamId)}
        athleteId={session.userId} onClose={() => navigate("athlete-trainings")} />}
      {session.role === "athlete" && activeView === "athlete-search" && (
        <TeamSearch actions={actions} athleteId={session.userId} state={state} />
      )}
    </Suspense></AppShell>
  );
}
