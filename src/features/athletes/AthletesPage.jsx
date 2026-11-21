import { CardGrid } from "../../components/ui/CardGrid.jsx";
import { GoalkeeperSummary, OutfieldSummary } from "../evaluations/PositionEvaluation.jsx";
import { evaluationRole } from "../../../shared/evaluations.js";
import { Activity, CalendarDays, ChevronDown, Pencil, Save, Search, Trash2, Trophy, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTodayDate } from "../../hooks/useTodayDate.js";
import { formatAge } from "../../../shared/birthDate.js";
import { TrainingHistory } from "../training/TrainingHistory.jsx";
import { athletePerformance, scoreLabel } from "../performance/model/athletePerformance.js";
import { AthleteDashboard } from "../performance/components/IndividualDashboard.jsx";
import { Avatar } from "../../components/ui/Avatar.jsx";
import { Button } from "../../components/ui/Button.jsx";
import { useConfirmation } from "../../components/ui/ConfirmDialog.jsx";
import { PositionField } from "./PositionField.jsx";
import { positionError } from "../../../shared/positions.js";
import { KpiCard } from "../../components/ui/KpiCard.jsx";
import { EmptyState } from "../../components/ui/EmptyState.jsx";
import { formatDate, percent } from "../../utils/formatters.js";
import { runUiAction } from "../../utils/runUiAction.js";
import { filterAthletesByName } from "./athleteSearch.js";
import "./AthletesPage.css";

import {
  getApprovedAthletes,
  getAthleteStats,
  getAthleteTrainings
} from "../../app/state/selectors.js";

function AthleteProfile({ athlete, team, stats, averageScore, today, actions, headingRef, onRemoved }) {
  const [draft, setDraft] = useState(null);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const { confirmAction, confirmation } = useConfirmation();
  const editorId = useId();
  const editButton = useRef(null);
  const numberField = useRef(null);
  const editing = draft !== null;

  useEffect(() => {
    if (editing) numberField.current?.focus();
  }, [editing]);

  function closeEditor() {
    setDraft(null);
    editButton.current?.focus();
  }

  async function save(event) {
    event.preventDefault();
    if (pending || positionError(team.modality, draft.position)) return;
    setPending(true);
    setFeedback(null);
    await runUiAction(
      () => actions.updateAthlete({ athleteId: athlete.id, teamId: team.id, patch: draft }),
      (error) => setFeedback({ type: "error", text: error.message || "Não foi possível atualizar o atleta." }),
      () => {
        closeEditor();
        setFeedback({ type: "success", text: "Atleta atualizado." });
      }
    );
    setPending(false);
  }

  async function remove() {
    if (pending || !await confirmAction({ title: "Remover atleta?", label: "Remover atleta",
      description: `${athlete.name} perderá o acesso à equipe ${team.name}. O histórico de treinos e avaliações será preservado.` })) return;
    setPending(true);
    setFeedback(null);
    await runUiAction(
      () => actions.removeAthlete({ athleteId: athlete.id, teamId: team.id }),
      (error) => setFeedback({ type: "error", text: error.message || "Não foi possível remover o atleta." }),
      onRemoved
    );
    setPending(false);
  }

  return <section className="panel athlete-profile-panel">
    {confirmation}
    <div className="athlete-profile-header">
      <Avatar name={athlete.name} photo={athlete.photo} size="lg" />
      <div className="athlete-profile-identity">
        <h2 ref={headingRef} tabIndex={-1}>{athlete.name}</h2>
        <p>{[athlete.position || "Posição não informada", formatAge(athlete.birthDate, today),
          athlete.number != null && athlete.number !== "" ? `Camisa ${athlete.number}` : "Sem número"].filter(Boolean).join(" · ")}</p>
      </div>
      <Button ref={editButton} type="button" variant="ghost" icon={Pencil} className="athlete-profile-edit"
        aria-expanded={editing} aria-controls={editorId} aria-disabled={pending}
        onClick={() => {
          if (pending) return;
          setFeedback(null);
          if (editing) closeEditor();
          else setDraft({ number: athlete.number ?? "", position: athlete.position ?? "" });
        }}>Editar atleta</Button>
    </div>
    <CardGrid className="kpi-grid athlete-kpis" label="Resumo do atleta">
      <KpiCard icon={Activity} label="Presença" value={percent(stats.presenceAverage)} />
      <KpiCard icon={CalendarDays} label="Treinos" value={stats.trainingsCount} />
      <KpiCard icon={Trophy} label="Desempenho" value={scoreLabel(averageScore)} />
    </CardGrid>
    <div id={editorId} hidden={!editing}>
      {editing && <form className="athlete-editor" onSubmit={save} aria-label="Editar atleta" aria-busy={pending}>
        <fieldset className="athlete-profile-fields" disabled={pending}>
          <div className="athlete-editor__fields">
            <label>Número da camisa
              <input ref={numberField} inputMode="numeric" value={draft.number}
                onChange={(event) => setDraft({ ...draft, number: event.target.value })} />
            </label>
            <PositionField modality={team.modality} value={draft.position}
              onChange={(event) => setDraft({ ...draft, position: event.target.value })} />
          </div>
          <div className="athlete-editor__actions">
            <Button icon={Save} type="submit" disabled={Boolean(positionError(team.modality, draft.position))}>Salvar</Button>
            <Button type="button" variant="ghost" onClick={() => { setFeedback(null); closeEditor(); }}>Cancelar</Button>
            <Button icon={Trash2} type="button" variant="danger" onClick={remove}>Remover</Button>
          </div>
        </fieldset>
      </form>}
    </div>
    {feedback && <p className={`form-feedback form-feedback--${feedback.type}`} role="status">{feedback.text}</p>}
  </section>;
}

export function AthletesPage({
  actions,
  onSelectAthlete,
  selectedAthleteId,
  state,
  team
}) {
  const today = useTodayDate();
  const atletas = team ? getApprovedAthletes(state, team.id) : [];
  const [busca, setBusca] = useState("");
  const [rosterOpen, setRosterOpen] = useState(false);
  const [removed, setRemoved] = useState(false);
  const rosterId = useId();
  const rosterToggle = useRef(null);
  const profileHeading = useRef(null);
  const buscaRef = useRef(null);
  const mostrarBusca = atletas.length > 5;
  const atletasVisiveis = mostrarBusca ? filterAthletesByName(atletas, busca) : atletas;

  useEffect(() => {
    setBusca("");
  }, [team?.id, mostrarBusca]);
  useEffect(() => {
    setRosterOpen(false);
    setRemoved(false);
  }, [team?.id]);

  const atletaSelecionado =
    atletas.find(
      (atleta) => atleta.id === selectedAthleteId
    );

  if (!team) {
    return (
      <div className="page-stack">
        <EmptyState title="Nenhuma equipe selecionada" text="Selecione uma equipe para visualizar os atletas." />
      </div>
    );
  }

  if (!atletas.length) {
    return (
      <div className="page-stack">
        {removed && <p className="form-feedback form-feedback--success" role="status">Atleta removido da equipe.</p>}
        <EmptyState title="Nenhum atleta aprovado" text="Os atletas aprovados para esta equipe aparecerão aqui." />
      </div>
    );
  }

  const role = evaluationRole(team.modality, atletaSelecionado?.position);
  const treinos = getAthleteTrainings(state, team.id, atletaSelecionado?.id);
  const stats = getAthleteStats(state, team.id, atletaSelecionado?.id);
  const performance = athletePerformance(treinos, atletaSelecionado?.id);
  const records = treinos.map((training) => training.athletes[atletaSelecionado?.id]);
  const selectionKey = `${team.id}:${atletaSelecionado?.id}`;

  function selectAthlete(id) {
    setRemoved(false);
    onSelectAthlete(id);
    setRosterOpen(false);
    if (rosterToggle.current?.getClientRects().length) {
      requestAnimationFrame(() => profileHeading.current?.focus());
    }
  }

  return (
    <div className="dashboard-grid athletes-layout">
      <section className="panel roster-panel" data-expanded={rosterOpen}>
        <div className="section-heading">
          <div>
            <h2>Elenco</h2>
            <p className="roster-count">{atletas.length} {atletas.length === 1 ? "atleta" : "atletas"}</p>
          </div>
          <Button ref={rosterToggle} type="button" icon={ChevronDown} variant="ghost" className="roster-panel__toggle"
            aria-controls={rosterId} aria-expanded={rosterOpen} onClick={() => setRosterOpen(!rosterOpen)}>
            Selecionar atleta
          </Button>
        </div>

        <div id={rosterId} className="roster-panel__content">
          {mostrarBusca && <div className="search-input roster-search">
            <Search size={18} aria-hidden="true" />
            <input ref={buscaRef} type="search" aria-label="Buscar atleta pelo nome" placeholder="Buscar atleta pelo nome..."
              value={busca} onChange={(event) => setBusca(event.target.value)} />
            {busca && <button type="button" className="roster-search__clear" aria-label="Limpar pesquisa"
              onClick={() => { setBusca(""); buscaRef.current?.focus(); }}><X size={18} aria-hidden="true" /></button>}
          </div>}
          {atletasVisiveis.length === 0 && <div className="roster-search__empty" role="status">
            <strong>Nenhum atleta encontrado.</strong>
            <p>Tente pesquisar por outro nome.</p>
          </div>}
          <div className="athlete-list">{atletasVisiveis.map((atleta) => {
            const selected = atleta.id === atletaSelecionado?.id;
            const statsAtleta = getAthleteStats(state, team.id, atleta.id);
            const identity = [atleta.number != null ? `#${atleta.number}` : null, atleta.position,
              formatAge(atleta.birthDate, today)].filter(Boolean).join(" · ");

            return <button key={atleta.id} type="button" className={selected ? "athlete-card athlete-card--active" : "athlete-card"}
              aria-pressed={selected} onClick={() => selectAthlete(atleta.id)}>
              <Avatar name={atleta.name} photo={atleta.photo} />
              <div className="athlete-card__identity"><strong>{atleta.name}</strong><span>{identity}</span></div>
              <small>{percent(statsAtleta.presenceAverage)}</small>
            </button>;
          })}</div>
        </div>
      </section>

      {atletaSelecionado ? <section className="page-stack athlete-detail-stack">
        <Button variant="ghost" onClick={() => onSelectAthlete("")}>Voltar ao elenco</Button>
        {removed && <p className="form-feedback form-feedback--success" role="status">Atleta removido da equipe.</p>}
        <AthleteProfile key={selectionKey} athlete={atletaSelecionado} team={team} stats={stats} today={today}
          actions={actions} averageScore={performance.averageScore} headingRef={profileHeading} onRemoved={() => { setRemoved(true); onSelectAthlete("", "Atleta removido da equipe."); }} />

        <AthleteDashboard key={`evolution:${selectionKey}:${atletaSelecionado.position}`}
          trainings={treinos} athlete={atletaSelecionado} team={team} />

        {role === "GOALKEEPER" && <GoalkeeperSummary key={`statistics:${selectionKey}`} records={records} initialOpen={false} />}
        {role === "OUTFIELD" && <OutfieldSummary key={`statistics:${selectionKey}`} team={team} records={records} initialOpen={false} />}

        <TrainingHistory key={`history:${selectionKey}`} trainings={treinos} athleteId={atletaSelecionado?.id}
          recentLimit={3} showAllLabel="Ver todos os treinos" />
      </section> : <EmptyState title="Selecione um atleta" text="Abra um atleta do elenco para consultar seu perfil, avaliações e histórico." />}
    </div>
  );
}
