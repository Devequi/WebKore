import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, ClipboardList, Home, Settings, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "./componentes/layout/AplicativoShell.jsx";
import { AthleteLobby } from "./paginas/atleta/Lobby.jsx";
import { AthleteProfile } from "./paginas/atleta/PerfilAtleta.jsx";
import { TeamSearch } from "./paginas/atleta/PesquisaTime.jsx";
import { CoachLobby } from "./paginas/treinador/LobbyTreinador.jsx";
import { RequestsPage } from "./paginas/treinador/SolicitacoesTreinador.jsx";
import { LoginPage } from "./paginas/PaginaLogin.jsx";
import { useWebKoreData } from "./hooks/useWebKoreData.js";
import { getAthleteTeams, getCoachTeams } from "./utils/selectors.js";
import "./styles/experience.css";
import "./styles/paginasTreinador/CoachExperience.css";

const AthleteDashboard = lazy(() => import("./paginas/atleta/PainelAtleta.jsx").then((page) => ({ default: page.AthleteDashboard })));
const AthletesPage = lazy(() => import("./paginas/treinador/AtletasTreinador.jsx").then((page) => ({ default: page.AthletesPage })));
const TeamHome = lazy(() => import("./paginas/treinador/PrincipalTreinador.jsx").then((page) => ({ default: page.TeamHome })));
const TrainingsPage = lazy(() => import("./paginas/treinador/treinamentosPagina.jsx").then((page) => ({ default: page.TrainingsPage })));
const SettingsPage = lazy(() => import("./paginas/treinador/ConfigsTreinador.jsx").then((page) => ({ default: page.SettingsPage })));

const coachTabs = [
  { id: "coach-home", label: "Home", icon: Home },
  { id: "coach-athletes", label: "Atletas", icon: Users },
  { id: "coach-requests", label: "Solicitações", icon: ShieldCheck },
  { id: "coach-trainings", label: "Treinos", icon: ClipboardList },
  { id: "coach-profile", label: "Perfil", icon: Activity },
  { id: "coach-settings", label: "Configurações", icon: Settings }
];

const athleteTabs = [
  { id: "athlete-home", label: "Dados", icon: BarChart3 },
  { id: "athlete-lobby", label: "Equipes", icon: Users },
  { id: "athlete-profile", label: "Perfil", icon: Activity }
];

function LoadingState({ message = "Carregando página..." }) {
  return <div className="page-stack athlete-loading" role="status" aria-busy="true">
    <p>{message}</p><div className="athlete-loading__cards" aria-hidden="true"><span /><span /><span /></div>
    <div className="athlete-loading__panel" aria-hidden="true" />
  </div>;
}

export function App() {
  const [state, actions] = useWebKoreData();
  const session = state.session || { role: "", userId: "" };
  const [activeView, setActiveView] = useState("login");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedAthleteId, setSelectedAthleteId] = useState("");

  const coachTeams = useMemo(() => getCoachTeams(state, session.userId), [state, session.userId]);
  const athleteTeams = useMemo(() => getAthleteTeams(state, session.userId), [state, session.userId]);
  const availableTeams = session.role === "coach" ? coachTeams : athleteTeams;
  const activeTeam = availableTeams.find((team) => team.id === selectedTeamId) || availableTeams?.[0] || null;
  const currentUser = state.users.find((user) => user.id === session.userId);

  function withNotice(content) {
    return <>{state.sessionMessage && <p className="form-feedback" role="status">{state.sessionMessage} <button type="button" onClick={() => actions.refresh().catch(() => undefined)}>Atualizar painel</button></p>}<Suspense fallback={<LoadingState />}>{content}</Suspense></>;
  }

  useEffect(() => {
    setSelectedTeamId("");
    setSelectedAthleteId("");
    setActiveView(session.userId ? `${session.role}-lobby` : "login");
  }, [session.userId, session.role]);

  async function handleLogin(credentials) {
    try { await actions.login(credentials); return { ok: true }; }
    catch (error) { return { ok: false, message: error.message }; }
  }

  async function handleRegister(payload) {
    try { await actions.register(payload); return { ok: true }; }
    catch (error) { return { ok: false, message: error.message }; }
  }

  function openTeam(teamId) {
    setSelectedTeamId(teamId);
    setActiveView(session.role === "coach" ? "coach-home" : "athlete-home");
  }

  function logout() {
    actions.logout();
    setSelectedTeamId("");
    setSelectedAthleteId("");
    setActiveView("login");
  }

  if (state.loadingSession) return <main className="auth-page"><LoadingState message="Restaurando sessão..." /></main>;

  if (!state.session || !currentUser || activeView === "login") {
    return <LoginPage onLogin={handleLogin} onRegister={handleRegister} notice={state.sessionMessage} />;
  }

  if (session.role === "coach" && activeView === "coach-lobby") {
    return withNotice(
      <CoachLobby
        actions={actions}
        currentUser={currentUser}
        onLogout={logout}
        onOpenTeam={openTeam}
        state={state}
        teams={coachTeams}
        onProfile={() => setActiveView("coach-profile")}
      />
    );
  }

  if (session.role === "athlete" && activeView === "athlete-lobby") {
    return withNotice(
      <AthleteLobby
        currentUser={currentUser}
        onLogout={logout}
        onOpenTeam={openTeam}
        onSearch={() => {
          setSelectedTeamId("");
          setActiveView("athlete-search");
        }}
        state={state}
        teams={athleteTeams}
        onProfile={() => setActiveView("athlete-profile")}
      />
    );
  }

  const tabs = session.role === "coach" ? coachTabs : athleteTabs;

  return withNotice(
    <AppShell
      activeView={activeView}
      currentUser={currentUser}
      onLogoClick={() => setActiveView(session.role === "coach" ? "coach-lobby" : "athlete-lobby")}
      onLogout={logout}
      setActiveView={setActiveView}
      tabs={tabs}
      team={activeTeam}
    >
      {session.role === "coach" && activeView === "coach-home" && <TeamHome state={state} team={activeTeam} />}
      {session.role === "coach" && activeView === "coach-athletes" && (
        <AthletesPage
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
        <TrainingsPage actions={actions} state={state} team={activeTeam} />
      )}
      {session.role === "coach" && activeView === "coach-settings" && (
        <SettingsPage key="team" actions={actions} currentUser={currentUser} onLogout={logout} state={state} team={activeTeam} />
      )}
      {session.role === "coach" && activeView === "coach-profile" && (
        <SettingsPage key={session.userId} view="profile" actions={actions} currentUser={currentUser} onLogout={logout} state={state} team={activeTeam} />
      )}
      {session.role === "athlete" && activeView === "athlete-home" && (
        <AthleteDashboard athleteId={session.userId} state={state} team={activeTeam} />
      )}
      {session.role === "athlete" && activeView === "athlete-search" && (
        <TeamSearch actions={actions} athleteId={session.userId} state={state} />
      )}
      {session.role === "athlete" && activeView === "athlete-profile" && (
        <AthleteProfile key={session.userId} actions={actions} athleteId={session.userId} state={state} team={activeTeam} />
      )}
    </AppShell>
  );
}
