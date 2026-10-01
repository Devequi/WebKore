import { useEffect, useMemo, useState } from "react";
import { Activity, BarChart3, ClipboardList, Home, Settings, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "./componentes/layout/AplicativoShell.jsx";
import { AthleteDashboard } from "./paginas/atleta/PainelAtleta.jsx";
import { AthleteLobby } from "./paginas/atleta/Lobby.jsx";
import { AthleteProfile } from "./paginas/atleta/PerfilAtleta.jsx";
import { TeamSearch } from "./paginas/atleta/PesquisaTime.jsx";
import { AthletesPage } from "./paginas/treinador/AtletasTreinador.jsx";
import { CoachLobby } from "./paginas/treinador/LobbyTreinador.jsx";
import { RequestsPage } from "./paginas/treinador/SolicitacoesTreinador.jsx";
import { SettingsPage } from "./paginas/treinador/ConfigsTreinador.jsx";
import { TeamHome } from "./paginas/treinador/PrincipalTreinador.jsx";
import { TrainingsPage } from "./paginas/treinador/treinamentosPagina.jsx";
import { LoginPage } from "./paginas/PaginaLogin.jsx";
import { useWebKoreData } from "./hooks/useWebKoreData.js";
import { getAthleteTeams, getCoachTeams } from "./utils/selectors.js";

const coachTabs = [
  { id: "coach-home", label: "Home", icon: Home },
  { id: "coach-athletes", label: "Atletas", icon: Users },
  { id: "coach-requests", label: "Solicitações", icon: ShieldCheck },
  { id: "coach-trainings", label: "Treinos", icon: ClipboardList },
  { id: "coach-settings", label: "Configurações", icon: Settings }
];

const athleteTabs = [
  { id: "athlete-home", label: "Dados", icon: BarChart3 },
  { id: "athlete-lobby", label: "Equipes", icon: Users },
  { id: "athlete-profile", label: "Perfil", icon: Activity }
];

export function App() {
  const [state, actions] = useWebKoreData();
  const session = state.session || { role: "", userId: "" };
  const [activeView, setActiveView] = useState("login");
  const [selectedTeamId, setSelectedTeamId] = useState("team-1");
  const [selectedAthleteId, setSelectedAthleteId] = useState("athlete-1");

  const coachTeams = useMemo(() => getCoachTeams(state, session.userId), [state, session.userId]);
  const athleteTeams = useMemo(() => getAthleteTeams(state, session.userId), [state, session.userId]);
  const availableTeams = session.role === "coach" ? coachTeams : athleteTeams;
  const activeTeam = availableTeams.find((team) => team.id === selectedTeamId) || availableTeams?.[0] || null;
  const currentUser = state.users.find((user) => user.id === session.userId);

  function withNotice(content) {
    const notice = session.source === "local"
      ? "Modo local: dados preservados neste navegador, sem sincronização com a API."
      : state.offline ? "API indisponível: exibindo a última consulta desta sessão. Alterações exigem conexão." : null;
    return <>{state.localDataNotice && <p className="form-feedback" role="status">{state.localDataNotice}</p>}{notice && <p className="form-feedback" role="status">{notice}</p>}{content}</>;
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

  if (state.loadingSession) return <main className="auth-page"><p role="status">Restaurando sessão...</p></main>;

  if (!state.session || !currentUser || activeView === "login") {
    return <LoginPage onLogin={handleLogin} onRegister={handleRegister} notice={[state.sessionMessage, state.localDataNotice].filter(Boolean).join(" ")} />;
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
        <SettingsPage actions={actions} currentUser={currentUser} onLogout={logout} state={state} team={activeTeam} />
      )}
      {session.role === "athlete" && activeView === "athlete-home" && (
        <AthleteDashboard athleteId={session.userId} state={state} team={activeTeam} />
      )}
      {session.role === "athlete" && activeView === "athlete-search" && (
        <TeamSearch actions={actions} athleteId={session.userId} state={state} />
      )}
      {session.role === "athlete" && activeView === "athlete-profile" && (
        <AthleteProfile actions={actions} athleteId={session.userId} state={state} />
      )}
    </AppShell>
  );
}
