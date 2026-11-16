import { Activity, ArrowUpRight, BarChart3, CalendarDays, Crosshair, Footprints, Shield, Star, TrendingUp, Users } from "lucide-react";
import { normalizeModality, getTeamCriteria } from "../../../shared/criteria.js";
import { criteriaFor, positionRankings } from "../../../shared/evaluations.js";
import { GoalkeeperSummary } from "../../componentes/ui/AvaliacaoPosicao.jsx";
import { TeamEvolutionChart } from "../../componentes/charts/GraficoEvolucaoEquipe.jsx";
import { KpiCard } from "../../componentes/ui/CartaoKpi.jsx";
import { EmptyState } from "../../componentes/ui/EstadoVazio.jsx";
import { CollapsiblePanel } from "../../componentes/ui/PainelRetratil.jsx";
import { formatDate, percent } from "../../utils/formatters.js";
import { getApprovedAthletes, getTeamStats, getTeamTrainings } from "../../utils/selectors.js";
import { getTrainingHighlight } from "../../utils/athleteHighlights.js";
import { positionMeasurements, teamPerformance } from "../../utils/teamPerformance.js";
import { scoreLabel } from "../../utils/athletePerformance.js";
import { getLastTrainingStats } from "../../utils/lastTraining.js";
import { AverageRankings } from "./RankingMedias.jsx";
import "../../styles/paginasTreinador/PrincipalTreinador.css";

const roles = [
  { id: "OUTFIELD", label: "Linha", icon: Footprints },
  { id: "GOALKEEPER", label: "Goleiros", icon: Shield }
];

const numberLabel = (value) => value.toLocaleString("pt-BR", { maximumFractionDigits: 1 });

function ScoreRows({ athletes }) {
  return <ol className="team-home__score-list">
    {athletes.map((athlete) => <li key={athlete.id}>
      <span>{athlete.name}</span>
      {athlete.roleLabel && <small>{athlete.roleLabel}</small>}
      <strong>{scoreLabel(athlete.score)}</strong>
    </li>)}
  </ol>;
}

function LastTraining({ training, highlights, onOpenTraining }) {
  const stats = getLastTrainingStats(training);
  return <CollapsiblePanel title="Último treino" className="last-training-panel" actions={training && onOpenTraining &&
    <button className="team-home__training-link" type="button" onClick={() => onOpenTraining(training.id)}>
      Ver treino <ArrowUpRight size={17} aria-hidden="true" />
    </button>}>
    {training ? <>
      <div className="team-home__session">
        <strong>{training.title || training.type}</strong>
        <time dateTime={training.date}>{formatDate(training.date)}</time>
      </div>
      <dl className="team-home__session-stats">
        <div><dt>Presença</dt><dd>{stats.presenceAverage === null ? "—" : percent(stats.presenceAverage)}</dd></div>
        <div><dt>Participantes</dt><dd>{stats.recordCount ? `${stats.presentCount}/${stats.recordCount}` : "—"}</dd></div>
        {stats.averageScore === null
          ? <div className="team-home__missing-score"><dt>Não avaliado</dt><dd hidden>—</dd></div>
          : <div><dt>Média</dt><dd>{scoreLabel(stats.averageScore)}</dd></div>}
      </dl>
      {highlights.length > 0 && <div className="team-home__highlights">
        <h3><Star size={17} aria-hidden="true" /> Melhores do treino</h3>
        <ScoreRows athletes={highlights} />
      </div>}
      {training.description && <details className="team-home__details">
        <summary>Descrição do treino</summary>
        <p>{training.description}</p>
      </details>}
    </> : <p className="empty-content">Nenhum treino registrado.</p>}
  </CollapsiblePanel>;
}

function CriterionHighlights({ performance }) {
  const { best, improvement, hasComparableEvaluations } = performance;
  if (!best) return null;
  return <details className="team-home__details">
    <summary>Destaques dos critérios</summary>
    <dl className="team-home__criterion-list">
      <div><dt>Melhor critério</dt><dd>{best.name} <strong>{scoreLabel(best.average)}</strong></dd></div>
      <div><dt>Maior evolução</dt><dd>{improvement
        ? <>{improvement.name} <strong>+{numberLabel(improvement.change)} pts</strong></>
        : hasComparableEvaluations ? "Sem crescimento" : "Dados insuficientes"}</dd></div>
    </dl>
  </details>;
}

function PerformancePanel({ title, icon: Icon, performance, role, records }) {
  const measurements = role ? positionMeasurements(records, role) : [];
  return <section className={`panel team-home__performance${role === "GOALKEEPER" ? " team-home__keeper" : ""}`}>
    <h2><Icon size={21} aria-hidden="true" />{title}</h2>
    <div className="team-home__metrics">
      {role && <KpiCard icon={TrendingUp} label="Média" value={Number.isFinite(performance.averageScore) ? scoreLabel(performance.averageScore) : "—"} />}
      <KpiCard icon={BarChart3} label="Avaliações" value={performance.evaluationCount} />
    </div>
    {role === "GOALKEEPER" && <GoalkeeperSummary records={records} compact />}
    {measurements.length > 0 && <details className="team-home__details" open={role === "OUTFIELD"}>
      <summary>Medidas do perfil</summary>
      <div className="team-home__metrics">{measurements.map(({ id, label, value }) =>
        <KpiCard key={id} icon={Crosshair} label={label} value={numberLabel(value)} />)}</div>
    </details>}
    <CriterionHighlights performance={performance} />
  </section>;
}

export function TeamHome({ state, team, onOpenTraining }) {
  if (!team) return <EmptyState title="Nenhuma equipe selecionada" text="Selecione uma equipe para visualizar os dados." />;

  const stats = getTeamStats(state, team.id);
  const trainings = getTeamTrainings(state, team.id);
  const performance = teamPerformance(trainings, team.id);
  const futsal = normalizeModality(team.modality) === "Futsal";
  const athletes = getApprovedAthletes(state, team.id);
  const last = stats.lastTraining;
  const records = futsal ? trainings.flatMap((training) => Object.values(training.athletes || {})) : [];
  const positionViews = futsal ? roles.map((role) => {
    const scoped = teamPerformance(trainings, team.id, role.id);
    const configured = criteriaFor(team, role.id, "QUALITATIVE").map((item) => item.name);
    return { ...role, performance: scoped, criteria: [...new Set([...configured, ...scoped.criteria])] };
  }) : [];
  const views = [{
    id: "overall",
    label: "Visão geral",
    performance,
    criteria: futsal ? [] : [...new Set([...getTeamCriteria(team, "qualitative"), ...performance.criteria])]
  }, ...positionViews];
  const sessionRankings = futsal && last ? positionRankings(athletes, [last], 1) : null;
  const highlight = futsal ? null : getTrainingHighlight(last, athletes);
  const highlights = sessionRankings ? roles.flatMap(({ id, label }) => {
    const leader = sessionRankings[id][0];
    return leader ? [{ ...leader, id, roleLabel: id === "GOALKEEPER" ? "Goleiro" : label }] : [];
  }) : highlight ? [highlight] : [];
  const rankings = futsal ? stats.rankings ?? positionRankings(athletes, trainings) : null;

  return <div className="page-stack coach-experience team-home">
    <section className="team-home__kpis" aria-label="Resumo da equipe">
      <KpiCard icon={Users} label="Atletas" value={stats.athletesCount} />
      <KpiCard icon={CalendarDays} label="Treinos" value={stats.trainingsCount} />
      <KpiCard icon={Activity} label="Presença média" value={performance.presenceAverage === null ? "—" : percent(performance.presenceAverage)} />
      <KpiCard icon={BarChart3} label="Desempenho médio" value={scoreLabel(performance.averageScore)} />
    </section>
    <div className="team-home__grid">
      <TeamEvolutionChart key={team.id} views={views} />
      <LastTraining key={team.id} training={last} highlights={highlights} onOpenTraining={onOpenTraining} />
    </div>
    {futsal ? <div className="team-home__role-grid">
      {positionViews.map(({ id, label, icon, performance: scoped }) => <PerformancePanel key={id}
        title={`Desempenho — ${label}`} icon={icon} performance={scoped} role={id} records={records} />)}
    </div> : <PerformancePanel title="Desempenho da equipe" icon={BarChart3} performance={performance} />}
    <AverageRankings key={team.id} rankings={rankings} lastRankings={sessionRankings} athletes={athletes} trainings={trainings} />
  </div>;
}
