import { Activity, CalendarDays, Users } from "lucide-react";
import { TeamEvolutionChart } from "../../componentes/charts/GraficoEvolucaoEquipe.jsx";
import { KpiCard } from "../../componentes/ui/CartaoKpi.jsx";
import { EmptyState } from "../../componentes/ui/EstadoVazio.jsx";
import { CollapsiblePanel } from "../../componentes/ui/PainelRetratil.jsx";
import { PerformanceSummary } from "../../componentes/ui/ResumoDesempenho.jsx";
import { formatDate, percent } from "../../utils/formatters.js";
import { getTeamStats } from "../../utils/selectors.js";
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
  return <div className="page-stack coach-experience team-home">
    <section className="kpi-grid athlete-kpis coach-kpis" aria-label="Resumo da equipe atual">
      <KpiCard icon={Users} label="Atletas" value={stats.athletesCount} detail="Aprovados na equipe" />
      <KpiCard icon={CalendarDays} label="Treinos" value={stats.trainingsCount} detail="Histórico registrado" />
      <KpiCard icon={Activity} label="Presença média" value={performance.presenceAverage === null ? "—" : percent(performance.presenceAverage)} detail="Por registro de presença" />
    </section>
    <div className="athlete-dashboard-grid"><div className="page-stack">
      <TeamEvolutionChart key={team.id} performance={performance} criteria={getTeamCriteria(team, "qualitative")} />
      <PerformanceSummary performance={performance} collective />
    </div><CollapsiblePanel title="Último treino" eyebrow={last ? formatDate(last.date) : "Histórico"} className="last-training-panel">
      {last ? <div className="last-training-panel__body">
        <strong className="last-training-panel__type">{last.type}</strong>
        <p className="last-training-panel__description">{last.description || "Sem descrição."}</p>
        <dl className="last-training-panel__stats">
          <div><dt>Participantes</dt><dd>{lastStats.recordCount ? `${lastStats.presentCount} de ${lastStats.recordCount}` : "Sem registros"}</dd></div>
          <div><dt>Presença</dt><dd>{lastStats.presenceAverage === null ? "—" : percent(lastStats.presenceAverage)}</dd></div>
          <div><dt>Média das avaliações</dt><dd className="last-training-panel__missing">{scoreLabel(lastStats.averageScore)}</dd></div>
        </dl>
      </div> : <p className="empty-content">Nenhuma atividade cadastrada.</p>}
      {stats.bestAthlete && <p className="athlete-note coach-highlight">Destaque da equipe: <strong>{stats.bestAthlete.name}</strong> · maior média individual.</p>}
    </CollapsiblePanel></div>
  </div>;
}
