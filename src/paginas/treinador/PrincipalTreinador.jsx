import { PositionRankings, GoalkeeperSummary } from "../../componentes/ui/AvaliacaoPosicao.jsx";
import { normalizeModality } from "../../../shared/criteria.js";
import { positionRankings } from "../../../shared/evaluations.js";
import { Activity, BarChart3, CalendarDays, Star, Trophy, Users } from "lucide-react";
import { Avatar } from "../../componentes/ui/Avatar.jsx";
import { TeamEvolutionChart } from "../../componentes/charts/GraficoEvolucaoEquipe.jsx";
import { KpiCard } from "../../componentes/ui/CartaoKpi.jsx";
import { EmptyState } from "../../componentes/ui/EstadoVazio.jsx";
import { CollapsiblePanel } from "../../componentes/ui/PainelRetratil.jsx";
import { PerformanceSummary } from "../../componentes/ui/ResumoDesempenho.jsx";
import { formatDate, percent } from "../../utils/formatters.js";
import { getApprovedAthletes, getTeamStats } from "../../utils/selectors.js";
import { getTrainingHighlight } from "../../utils/athleteHighlights.js";
import { teamPerformance } from "../../utils/teamPerformance.js";
import { scoreLabel } from "../../utils/athletePerformance.js";
import { getLastTrainingStats } from "../../utils/lastTraining.js";
import { getTeamCriteria } from "../../../shared/criteria.js";
import "../../styles/paginasTreinador/PrincipalTreinador.css";

export function TeamHome({ state, team }) {
  if (!team) return <EmptyState title="Nenhuma equipe selecionada" text="Selecione uma equipe para visualizar os dados." />;
  const stats = getTeamStats(state, team.id);
  const performance = teamPerformance(state.trainings, team.id);
  const last = stats.lastTraining;
  const lastStats = getLastTrainingStats(last);
  const futsal = normalizeModality(team.modality) === "Futsal";
  const highlight = futsal ? null : getTrainingHighlight(last, getApprovedAthletes(state, team.id));
  const sessionHighlights = futsal ? positionRankings(getApprovedAthletes(state, team.id), last ? [last] : [], 1) : null;
  const best = stats.bestAthlete;
  return <div className="page-stack coach-experience team-home">
    <section className="kpi-grid athlete-kpis coach-kpis" aria-label="Resumo da equipe atual">
      <KpiCard icon={Users} label="Atletas" value={stats.athletesCount} detail="Aprovados na equipe" />
      <KpiCard icon={CalendarDays} label="Treinos" value={stats.trainingsCount} detail="Histórico registrado" />
      <KpiCard icon={Activity} label="Presença média" value={performance.presenceAverage === null ? "—" : percent(performance.presenceAverage)} detail="Por registro de presença" />
      <KpiCard icon={BarChart3} label="Desempenho médio" value={scoreLabel(performance.averageScore)} detail="Média geral da equipe" />
    </section>
    <div className="team-home__grid">
      <TeamEvolutionChart key={team.id} performance={performance} criteria={performance.criteria.length ? performance.criteria : getTeamCriteria(team, "qualitative")} />
    <CollapsiblePanel title="Último treino" eyebrow={<><CalendarDays size={18} aria-hidden="true" />Último treino</>} className="last-training-panel"
      actions={last && <time className="last-training-panel__date" dateTime={last.date}>{formatDate(last.date)}</time>}>
      {last ? <div className="last-training-panel__body">
        <strong className="last-training-panel__type">{last.title || last.type}</strong>
        <p className="last-training-panel__description">{last.description || "Sem descrição."}</p>
        <dl className="last-training-panel__stats">
          <div><dt>Participantes</dt><dd>{lastStats.recordCount ? `${lastStats.presentCount} de ${lastStats.recordCount}` : "Sem registros"}</dd></div>
          <div><dt>Presença</dt><dd>{lastStats.presenceAverage === null ? "—" : percent(lastStats.presenceAverage)}</dd></div>
          <div><dt>Média das avaliações</dt><dd className="last-training-panel__missing">{scoreLabel(lastStats.averageScore)}</dd></div>
        </dl>
      </div> : <p className="empty-content">Nenhuma atividade cadastrada.</p>}
      <div className="coach-highlight">
        <Star size={28} aria-hidden="true" />
        <div>{futsal ? <><span>Destaques deste treino por função</span>{[["OUTFIELD", "Linha"], ["GOALKEEPER", "Goleiro"]].map(([role, label]) => {
          const athlete = sessionHighlights[role][0];
          return <p key={role}>{label}: {athlete ? `${athlete.name} · ${scoreLabel(athlete.score)}` : "Sem avaliação específica"}</p>;
        })}</> : highlight ? <><span>Destaque do treino</span><strong>{highlight.name} · {scoreLabel(highlight.score)}</strong><p>melhor média deste treino.</p></> : <p>Sem destaque definido para este treino.</p>}</div>
      </div>
    </CollapsiblePanel>
    <PerformanceSummary performance={performance} collective />
    {futsal ? <><PositionRankings rankings={stats.rankings} /><GoalkeeperSummary records={state.trainings.filter((training) => training.teamId === team.id).flatMap((training) => Object.values(training.athletes || {}))} /></> : <section className="panel best-athlete-panel" aria-labelledby="best-athlete-title">
      <div className="section-heading"><div><span className="eyebrow">Histórico da equipe</span><h2 id="best-athlete-title">Melhor atleta</h2></div><Trophy size={22} aria-hidden="true" /></div>
      {best ? <div className="best-athlete-panel__body">
        <div className="best-athlete-panel__identity"><Avatar name={best.name} photo={best.photo} /><div><strong>{best.name}</strong><p>{best.position || "Posição não informada"}</p></div></div>
        <dl className="last-training-panel__stats">
          <div><dt>Média geral</dt><dd>{scoreLabel(best.score)}</dd></div>
          <div><dt>Treinos avaliados</dt><dd>{best.evaluationCount}</dd></div>
        </dl>
      </div> : <p className="empty-content">Ainda não há dados suficientes para definir o melhor atleta.</p>}
    </section>}
    </div>
  </div>;
}
