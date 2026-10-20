import { Save, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "../../componentes/ui/Avatar.jsx";
import { Button } from "../../componentes/ui/Botao.jsx";
import { BirthDateField } from "../../componentes/ui/CampoNascimento.jsx";
import { getAthleteTeams, getAthleteTrainings } from "../../utils/selectors.js";
import { athletePerformance, scoreLabel } from "../../utils/athletePerformance.js";
import { formatDate, percent } from "../../utils/formatters.js";
import { formatAge, isDateOnly, validateBirthDate } from "../../../shared/birthDate.js";
import { useTodayDate } from "../../hooks/useTodayDate.js";
import "../../styles/paginasAtleta/AthleteProfile.css";
import "../../styles/paginasAtleta/AthleteExperience.css";

export function AthleteProfile({ actions, athleteId, state, team }) {
  const athlete = state.users.find((user) => user.id === athleteId);
  const teams = getAthleteTeams(state, athleteId);
  const today = useTodayDate();
  const membership = state.memberships.find((item) => item.athleteId === athleteId && item.teamId === team?.id && item.status === "approved");
  const trainings = team ? getAthleteTrainings(state, team.id, athleteId) : [];
  const performance = athletePerformance(trainings, athleteId);
  const dialogRef = useRef(null);
  const [form, setForm] = useState({ name: athlete?.name || "", email: athlete?.email || "", photo: athlete?.photo || "", birthDate: athlete?.birthDate || "" });
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
      const { birthDate, ...fields } = form;
      if (!fields.name.trim() || fields.name.length > 191) throw new Error("Informe um nome válido com até 191 caracteres.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim()) || fields.email.length > 191) throw new Error("Informe um e-mail válido com até 191 caracteres.");
      if (birthDate) validateBirthDate(birthDate, today);
      if (athlete?.birthDate && !birthDate) throw new Error("Informe a data de nascimento.");
      await actions.updateAthlete({ athleteId, patch: { ...fields, name: fields.name.trim(), email: fields.email.trim().toLowerCase(), ...(birthDate ? { birthDate } : {}) } });
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

  if (!athlete) return <p className="empty-content" role="status">Perfil indisponível. Atualize o painel para tentar novamente.</p>;

  return (
    <div className="page-stack athlete-experience">
    <section className="panel">
      <div className="athlete-profile-header">
        <Avatar name={athlete.name} photo={athlete.photo} size="lg" />
        <div>
          <span className="eyebrow">Atleta</span>
          <h2>{athlete.name}</h2>
          <p>{team?.name || "Sem equipe selecionada"} · {formatAge(athlete.birthDate, today)}</p>
        </div>
      </div>

      <dl className="athlete-facts">
        <div><dt>Nome completo</dt><dd>{athlete.name}</dd></div>
        <div><dt>Identificação</dt><dd>{athlete.id}</dd></div>
        <div><dt>Data de nascimento</dt><dd>{isDateOnly(athlete.birthDate) ? formatDate(athlete.birthDate) : "Não informada"}</dd></div>
        <div><dt>Idade</dt><dd>{formatAge(athlete.birthDate, today)}</dd></div>
        <div><dt>E-mail</dt><dd>{athlete.email}</dd></div>
        <div><dt>Função</dt><dd>Atleta</dd></div>
      </dl>
    </section>

    <section className="panel">
      <div className="section-heading"><div><span className="eyebrow">Equipe atual</span><h2>Resumo esportivo</h2></div></div>
      {team ? <dl className="athlete-facts">
        <div><dt>Equipe</dt><dd>{team.name}</dd></div>
        <div><dt>Modalidade</dt><dd>{team.modality}</dd></div>
        {membership?.createdAt && isDateOnly(String(membership.createdAt).slice(0, 10)) && <div><dt>Vínculo criado em</dt><dd>{formatDate(String(membership.createdAt).slice(0, 10))}</dd></div>}
        {membership?.number != null && <div><dt>Número</dt><dd>{membership.number}</dd></div>}
        {membership?.position && <div><dt>Posição</dt><dd>{membership.position}</dd></div>}
        <div><dt>Treinos registrados</dt><dd>{trainings.length}</dd></div>
        <div><dt>Presença</dt><dd>{performance.presenceAverage === null ? "Sem registros" : percent(performance.presenceAverage)}</dd></div>
        <div><dt>Média das avaliações</dt><dd>{scoreLabel(performance.averageScore)}</dd></div>
      </dl> : <p className="empty-content">Você ainda não tem uma equipe selecionada. Acesse Equipes para visualizar seus vínculos.</p>}
    </section>

    <section className="panel settings-panel">
      <div className="section-heading"><div><span className="eyebrow">Informações pessoais</span><h2>Editar perfil</h2></div></div>
      {feedback && <p className={`form-feedback form-feedback--${feedback.type}`} role={feedback.type === "error" ? "alert" : "status"}>{feedback.text}</p>}

      <div className="settings-grid">
        <form className="settings-form" onSubmit={salvarPerfil} aria-busy={saving}>
          <fieldset disabled={saving} className="athlete-profile-fields">
          <label>
            Nome completo
            <input
              required
              maxLength={191}
              autoComplete="name"
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
              maxLength={191}
              autoComplete="email"
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              type="email"
              value={form.email}
            />
          </label>
          <BirthDateField
            value={form.birthDate}
            onChange={(birthDate) => setForm((current) => ({ ...current, birthDate }))}
            required={Boolean(athlete.birthDate)}
          />
          <Button disabled={saving} icon={Save} type="submit">
            {saving ? "Salvando..." : "Salvar perfil"}
          </Button>
          </fieldset>
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
            {feedback?.type === "error" && <p className="form-feedback" role="alert">{feedback.text}</p>}
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
    </div>
  );
}
