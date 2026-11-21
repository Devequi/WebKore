import { Plus, UserRound } from "lucide-react";
import { useState } from "react";
import { useConfirmation } from "../../components/ui/ConfirmDialog.jsx";
import { PublicHeader } from "../../components/layout/PublicHeader.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import "./AthleteLobby.css";
import "./LobbyLayout.css";

export function AthleteLobby({
  header, selectedId,
  actions,
  currentUser,
  onLogout,
  onOpenTeam,
  onProfile,
  onSearch,
  state,
  teams = []
}) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const { confirmAction, confirmation } = useConfirmation();

  async function leaveTeam(team) {
    if (pending || !await confirmAction({ title: "Sair da equipe?", label: "Sair da equipe",
      description: `Seu vínculo com ${team.name} será removido. Seu histórico de treinos e avaliações será preservado. As metas pessoais desta equipe serão removidas.` })) return;
    setPending(true);
    setFeedback(null);
    try {
      await actions.leaveTeam({ athleteId: currentUser.id, teamId: team.id });
      setFeedback({ type: "success", text: `Você saiu da equipe ${team.name}.` });
    } catch (error) { setFeedback({ type: "error", text: error.message || "Não foi possível sair da equipe." }); }
    finally { setPending(false); }
  }

  return (
    <main className="lobby-page team-lobby athlete-lobby">
      {confirmation}
      {header || <PublicHeader onLogout={onLogout} />}

      <section className="lobby-hero">
        <div>
          <h1>
            Olá, {currentUser?.name || "Atleta"}
          </h1>

          <p>
            Escolha uma equipe aprovada para acompanhar presença,
            desempenho e histórico.
          </p>
        </div>

        <div className="lobby-actions">
          <Button icon={UserRound} onClick={onProfile} type="button" variant="ghost">Meu perfil</Button>
        </div>
      </section>

      <section className="lobby-join" aria-labelledby="athlete-join-title">
        <div><h2 id="athlete-join-title">Entrar em uma equipe</h2><p>Use o código enviado pelo treinador para solicitar sua entrada.</p></div>
          <Button
            icon={Plus}
            onClick={onSearch}
            type="button"
          >
            Entrar em um time
          </Button>

      </section>

      <section className="lobby-teams" aria-labelledby="athlete-teams-title">
      <div className="lobby-section-heading"><h2 id="athlete-teams-title">Minhas equipes</h2></div>
      {feedback && <p className={`form-feedback form-feedback--${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p>}
      {teams.length === 0 ? (
        <EmptyState
          title="Nenhuma equipe aprovada"
          text="Entre em uma equipe usando o código enviado pelo treinador."
        />
      ) : (
        <div className="team-card-grid">
          {teams.map((team) => {
            const treinador = state.users.find(
              (user) => user.id === team.coachId
            );

            const link = state.memberships?.find(m => m.athleteId === currentUser.id && m.teamId === team.id);
            return (
              <article
                className="team-card"
                key={team.id}
              >
                <header className="athlete-team-heading">
                  <div><h3>{team.name}</h3><span>{team.modality}</span></div>
                  {selectedId === team.id && <small>Selecionada</small>}
                </header>

                <dl className="athlete-team-facts">
                  <div><dt>Treinador</dt><dd>{treinador?.name || "Não informado"}</dd></div>
                  <div><dt>Posição</dt><dd>{link?.position || "Não informada"}</dd></div>
                  <div><dt>Camisa</dt><dd>{link?.number ?? "Não informada"}</dd></div>
                  <div><dt>Código</dt><dd>{team.code}</dd></div>
                </dl>

                <footer className="team-card__actions">
                <Button
                  disabled={pending}
                  onClick={() => onOpenTeam(team.id)}
                  type="button"
                >
                  Acessar dados
                </Button>
                {actions && <Button type="button" variant="danger" disabled={pending} onClick={() => leaveTeam(team)}>Sair da equipe</Button>}
                </footer>
              </article>
            );
          })}
        </div>
      )}
      </section>
    {(state.memberships || []).filter(m => m.athleteId === currentUser.id && m.status !== "approved").map(m => <p key={m.teamId} className="panel">{state.teams.find(t => t.id === m.teamId)?.name} · {m.status === "pending" ? "Aguardando aprovação" : "Solicitação recusada"}</p>)}
    </main>
  );
}
