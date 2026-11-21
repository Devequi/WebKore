import { CardGrid } from "../../components/ui/CardGrid.jsx";
import { Clipboard, Plus, UserRound, Users, Trophy } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { PublicHeader } from "../../components/layout/PublicHeader.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { KpiCard } from "../../components/ui/KpiCard.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import "./CoachLobby.css";
import "./LobbyLayout.css";

export function CoachLobby({
  header,
  actions,
  currentUser,
  onLogout,
  onOpenTeam,
  onProfile,
  state,
  teams: times
}) {
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const createPanelId = useId();
  const createInputRef = useRef(null);
  const createButtonRef = useRef(null);
  const [feedback, setFeedback] = useState(null);
  const [form, setForm] = useState({
    name: "",
    modality: "Futsal"
  });

  useEffect(() => {
    if (!showCreate) return;
    createInputRef.current?.focus();
    return () => createButtonRef.current?.focus();
  }, [showCreate]);

  function closeCreate() {
    setShowCreate(false);
  }

  async function criarTime(event) {
    event.preventDefault();

    if (creating || !form.name.trim()) return;
    setCreating(true);
    setFeedback(null);

    try {
      await actions.createTeam({
        ...form,
        coachId: currentUser.id
      });
    } catch (error) {
      setFeedback({ type: "error", text: error.message || "Não foi possível criar a equipe." });
      return;
    } finally {
      setCreating(false);
    }

    setForm({
      name: "",
      modality: "Futsal"
    });
    setFeedback({ type: "success", text: "Equipe criada." });
    closeCreate();
  }

  async function copiarCodigo(code) {
    try {
      if (!navigator.clipboard) throw new Error("Copie o código exibido no card.");
      await navigator.clipboard.writeText(code);
      setFeedback({ type: "success", text: "Código copiado." });
    } catch (error) { setFeedback({ type: "error", text: error.message || "Não foi possível copiar o código." }); }
  }

  const atletasPorTime = new Map(
    times.map((time) => [
      time.id,
      state.memberships.filter((item) => item.teamId === time.id && item.status === "approved")
    ])
  );
  const totalAtletas = new Set(
    [...atletasPorTime.values()].flat().map((item) => item.athleteId)
  ).size;

  const modalidades = new Set(
    times.map((time) => time.modality)
  ).size;

  return (
    <main className="lobby-page team-lobby coach-lobby coach-experience">
      {header || <PublicHeader onLogout={onLogout} />}

      <section className="lobby-hero">
        <div>
          <h1>Olá, {currentUser.name}</h1>

          <p>
            Gerencie equipes, acompanhe atletas e acesse
            os painéis de desempenho do WebKore.
          </p>
        </div>
        <Button icon={UserRound} onClick={onProfile} type="button" variant="ghost">Meu perfil</Button>
      </section>

      <CardGrid className="kpi-grid athlete-kpis" label="Resumo das suas equipes">
        <KpiCard icon={Users} label="Equipes" value={times.length} detail="Administradas por você" />
        <KpiCard icon={UserRound} label="Atletas" value={totalAtletas} detail="Atletas únicos aprovados" />
        <KpiCard icon={Trophy} label="Modalidades" value={modalidades} detail="Nas suas equipes" />
      </CardGrid>
      {feedback && <p className={`form-feedback form-feedback--${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p>}

      <section className="lobby-teams" aria-labelledby="coach-teams-title">
        <div className="lobby-section-heading">
          <h2 id="coach-teams-title">Minhas equipes</h2>
          <Button ref={createButtonRef} icon={Plus} type="button" disabled={creating}
            aria-expanded={showCreate} aria-controls={createPanelId} onClick={() => setShowCreate(true)}>
            Criar equipe
          </Button>
        </div>
        <div id={createPanelId} className="lobby-create-panel" hidden={!showCreate}>
        <form
          className="create-team-form"
          onSubmit={criarTime}
          aria-busy={creating}
        >
          <h2>Criar equipe</h2>

          <label>
            Nome da equipe

            <input
              ref={createInputRef}
              required
              maxLength={191}
              placeholder="Ex: ETEC Araras Sub-18"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value
                }))
              }
            />
          </label>

          <label>
            Modalidade

            <select
              value={form.modality}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  modality: event.target.value
                }))
              }
            >
              <option>Futsal</option>
              <option>Futebol</option>
              <option>Vôlei</option>
              <option>Basquete</option>
              <option>Handebol</option>
            </select>
          </label>

          <div className="lobby-form-actions"><Button
            disabled={creating}
            icon={Plus}
            type="submit"
          >
            {creating ? "Criando..." : "Criar equipe"}
          </Button>
          <Button type="button" variant="ghost" disabled={creating} onClick={closeCreate}>Cancelar</Button></div>
        </form>
        </div>

        <div className="team-card-grid">
          {!times.length && <EmptyState title="Nenhuma equipe criada" text="Clique em Criar equipe para começar a gerenciar sua primeira equipe." />}
          {times.map((time) => (
            <article
              className="team-card"
              key={time.id}
            >
              <span className="modality-badge">
                {time.modality}
              </span>

              <h2>{time.name}</h2>

              <div className="team-info">
                <div>
                  <strong>Código</strong>
                  <p>{time.code}</p>
                </div>

                <div>
                  <strong>Atletas</strong>
                  <p>{atletasPorTime.get(time.id)?.length || 0}</p>
                </div>
              </div>

              <div className="team-card__actions">
                <Button
                  icon={Clipboard}
                  onClick={() => copiarCodigo(time.code)}
                  type="button"
                  variant="secondary"
                >
                  Copiar
                </Button>

                <Button
                  className="manage-button"
                  onClick={() => onOpenTeam(time.id)}
                  type="button"
                >
                  Gerenciar
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
