import { Save, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "../../componentes/ui/Avatar.jsx";
import { Button } from "../../componentes/ui/Botao.jsx";
import { getAthleteTeams } from "../../utils/selectors.js";
import "../../styles/paginasAtleta/AthleteProfile.css";

export function AthleteProfile({ actions, athleteId, state }) {
  const athlete = state.users.find((user) => user.id === athleteId);
  const teams = getAthleteTeams(state, athleteId);
  const dialogRef = useRef(null);
  const [form, setForm] = useState({ name: athlete.name, email: athlete.email, photo: athlete.photo });
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [teamToLeave, setTeamToLeave] = useState(null);

  useEffect(() => {
    if (teamToLeave && !dialogRef.current?.open) {
      dialogRef.current?.showModal();
    }
  }, [teamToLeave]);

  async function salvarPerfil(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      await actions.updateAthlete({ athleteId, patch: form });
      setFeedback({ type: "success", text: "Perfil atualizado." });
    } catch (error) {
      setFeedback({ type: "error", text: error.message || "Não foi possível salvar o perfil." });
    } finally {
      setSaving(false);
    }
  }

  function fecharConfirmacao() {
    if (leaving) return;
    dialogRef.current?.close();
    setTeamToLeave(null);
  }

  async function sairDaEquipe() {
    if (!teamToLeave) return;

    setLeaving(true);
    setFeedback(null);
    try {
      await actions.leaveTeam({ athleteId, teamId: teamToLeave.id });
      dialogRef.current?.close();
      setTeamToLeave(null);
      setFeedback({ type: "success", text: `Você saiu da equipe ${teamToLeave.name}.` });
    } catch (error) {
      setFeedback({ type: "error", text: error.message || "Não foi possível sair da equipe." });
    } finally {
      setLeaving(false);
    }
  }

  return (
    <section className="panel settings-panel">
      <div className="athlete-profile-header">
        <Avatar name={athlete.name} photo={athlete.photo} size="lg" />
        <div>
          <span className="eyebrow">Atleta</span>
          <h2>{athlete.name}</h2>
          <p>Perfil do atleta</p>
        </div>
      </div>

      <div className="settings-grid">
        <form className="settings-form" onSubmit={salvarPerfil}>
          <label>
            Nome completo
            <input
              required
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              value={form.name}
            />
          </label>
          <label>
            Foto ou iniciais
            <input
              maxLength="3"
              onChange={(event) => setForm((current) => ({ ...current, photo: event.target.value.toUpperCase() }))}
              value={form.photo}
            />
          </label>
          <label>
            E-mail
            <input
              required
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              type="email"
              value={form.email}
            />
          </label>
          <Button disabled={saving} icon={Save} type="submit">
            {saving ? "Salvando..." : "Salvar perfil"}
          </Button>
        </form>

        <div className="linked-teams">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Equipes vinculadas</span>
              <h2>Minhas equipes</h2>
            </div>
          </div>
          {teams.map((team) => (
            <article className="linked-team" key={team.id}>
              <div>
                <strong>{team.name}</strong>
                <span>{team.modality}</span>
              </div>
              <Button
                icon={Trash2}
                onClick={() => setTeamToLeave(team)}
                type="button"
                variant="danger"
              >
                Sair
              </Button>
            </article>
          ))}
          {teams.length === 0 && (
            <p className="linked-teams__empty">Você ainda não participa de uma equipe.</p>
          )}
        </div>
      </div>
      {feedback && (
        <p className={`form-feedback form-feedback--${feedback.type}`} role="status">
          {feedback.text}
        </p>
      )}

      <dialog
        aria-labelledby="leave-team-title"
        aria-describedby="leave-team-description"
        className="confirm-dialog"
        onCancel={(event) => {
          if (leaving) event.preventDefault();
          else setTeamToLeave(null);
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) fecharConfirmacao();
        }}
        onClose={() => setTeamToLeave(null)}
        ref={dialogRef}
      >
        <div className="confirm-dialog__content">
          <button
            aria-label="Fechar confirmação"
            className="confirm-dialog__close"
            disabled={leaving}
            onClick={fecharConfirmacao}
            type="button"
          >
            <X aria-hidden="true" size={18} />
          </button>

          <div className="confirm-dialog__header">
            <span className="confirm-dialog__icon">
              <Trash2 aria-hidden="true" size={22} />
            </span>
            <div>
              <h2 id="leave-team-title">Sair da equipe?</h2>
              <p id="leave-team-description">
                Você está prestes a sair de <strong>{teamToLeave?.name}</strong>. Seu vínculo com essa equipe será removido.
              </p>
            </div>
          </div>

          <div className="confirm-dialog__actions">
            <Button disabled={leaving} onClick={fecharConfirmacao} type="button" variant="ghost">
              Cancelar
            </Button>
            <Button disabled={leaving} icon={Trash2} onClick={sairDaEquipe} type="button" variant="danger">
              {leaving ? "Saindo..." : "Sair do time"}
            </Button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
